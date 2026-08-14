// Simple backend proxy server for API requests
// Runs on port 3001, frontend calls localhost:3001/api/* instead of direct APIs
import express from 'express';
import cors from 'cors';
import { getDb, closeDb } from './db/index.js';
import { startIngestionScheduler } from './db/ingest.js';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Simple in-memory cache for API responses
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Health check
app.get('/health', (req, res) => {
    try {
        // Ensure DB is at least reachable
        const db = getDb();
        const row = db.prepare('SELECT 1 AS ok').get();
        res.json({ status: 'ok', db: row.ok === 1, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('[Health] DB check failed:', error.message);
        res.status(500).json({ status: 'error', error: error.message, timestamp: new Date().toISOString() });
    }
});

/**
 * Normalized markets API backed by SQLite snapshots
 * GET /api/markets
 *   ?exchange=kalshi|polymarket|all
 *   ?resolved=true|false
 *   ?limit=number
 */
app.get('/api/markets', (req, res) => {
    try {
        const db = getDb();
        const { exchange = 'all', resolved, limit } = req.query;

        const params = [];
        const whereClauses = [];

        if (exchange && exchange !== 'all') {
            whereClauses.push('e.name = ?');
            params.push(String(exchange));
        }

        if (resolved === 'true') {
            whereClauses.push('m.resolved_outcome IS NOT NULL');
        } else if (resolved === 'false') {
            whereClauses.push('m.resolved_outcome IS NULL');
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const limitSql = limit ? `LIMIT ${Number(limit) || 500}` : 'LIMIT 500';

        const sql = `
            SELECT
                m.id,
                e.name AS exchange,
                m.external_id,
                m.ticker,
                m.title,
                m.description,
                m.category,
                m.open_time,
                m.close_time,
                m.resolution_time,
                m.status,
                m.resolved_outcome,
                m.current_probability,
                m.final_probability,
                m.volume,
                m.liquidity
            FROM markets m
            JOIN exchanges e ON m.exchange_id = e.id
            ${whereSql}
            ORDER BY m.updated_at DESC
            ${limitSql}
        `;

        const rows = getDb().prepare(sql).all(...params);

        res.json({
            success: true,
            data: rows.map(row => ({
                id: `${row.exchange}_${row.external_id}`,
                platform: row.exchange,
                title: row.title,
                category: row.category,
                createdAt: row.open_time,
                resolvedAt: row.resolution_time,
                resolved: row.resolved_outcome === 0 || row.resolved_outcome === 1,
                outcome: row.resolved_outcome,
                currentProbability: row.current_probability,
                finalProbability: row.final_probability,
                volume: row.volume,
                liquidity: row.liquidity
            }))
        });
    } catch (error) {
        console.error('[API] /api/markets error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * OpenAI-powered text analysis endpoint (server-side key usage only)
 * POST /api/text-analysis
 * body: { text: string, context?: string }
 */
app.post('/api/text-analysis', async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            res.status(400).json({
                success: false,
                error: 'OPENAI_API_KEY is not configured on the server environment.'
            });
            return;
        }

        const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
        const context = typeof req.body?.context === 'string' ? req.body.context.trim() : '';

        if (!text) {
            res.status(400).json({ success: false, error: 'Request body must include non-empty `text`.' });
            return;
        }

        const input = [
            {
                role: 'system',
                content: [
                    {
                        type: 'text',
                        text: 'You are a quantitative markets analyst. Return concise JSON with keys: summary, keyClaims, caveats, and suggestedFollowups.'
                    }
                ]
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `Context: ${context || 'Prediction market research'}\n\nText to analyze:\n${text}`
                    }
                ]
            }
        ];

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-5-mini',
                input,
                text: {
                    format: {
                        type: 'json_object'
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        const outputText = result?.output_text || '{}';
        let parsed;
        try {
            parsed = JSON.parse(outputText);
        } catch {
            parsed = { summary: outputText, keyClaims: [], caveats: [], suggestedFollowups: [] };
        }

        res.json({ success: true, analysis: parsed });
    } catch (error) {
        console.error('[Proxy] text-analysis error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Proxy endpoint for Metaculus
 * Frontend calls: http://localhost:3001/api/metaculus
 * Backend calls: https://www.metaculus.com/api2/questions/...
 */
app.get('/api/metaculus', async (req, res) => {
    try {
        console.log('[Proxy] Fetching Metaculus API...');
        
        // Try different Metaculus endpoints
        const endpoints = [
            'https://www.metaculus.com/api2/questions/?status=open&limit=100',
            'https://www.metaculus.com/api/v0/questions/?status=resolved&limit=100',
            'https://www.metaculus.com/api/questions/?status=resolved&limit=100'
        ];
        
        let lastError = null;
        for (const endpoint of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    console.warn(`[Proxy] Endpoint HTTP ${response.status}: ${endpoint}`);
                    lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    continue;
                }
                
                const data = await response.json();
                console.log('[Proxy] Successfully fetched Metaculus data');
                res.json({ success: true, data });
                return;
                
            } catch (error) {
                console.warn(`[Proxy] Endpoint error: ${error.message}`);
                lastError = error;
                continue;
            }
        }
        
        throw lastError || new Error('All endpoints failed');
        
    } catch (error) {
        console.error('[Proxy] Metaculus error:', error.message);
        console.log('[Proxy] Returning empty Metaculus result to allow other APIs to work');
        // Return empty result instead of 500 error - allows other APIs to work
        res.json({ 
            success: true,
            data: {
                results: [],
                count: 0
            }
        });
    }
});

/**
 * Proxy endpoint for Polymarket
 */
app.get('/api/polymarket', async (req, res) => {
    try {
        console.log('[Proxy] Fetching Polymarket API...');
        
        const endpoint = 'https://clob.polymarket.com/markets';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[Proxy] Successfully fetched Polymarket data');
        
        res.json({ success: true, data });
        
    } catch (error) {
        console.error('[Proxy] Polymarket error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Proxy endpoint for Kalshi
 */
app.get('/api/kalshi', async (req, res) => {
    try {
        console.log('[Proxy] Fetching Kalshi API...');

        const status = req.query.status;
        const limit = req.query.limit;
        const params = new URLSearchParams();
        if (status) params.set('status', String(status));
        if (limit) params.set('limit', String(limit));

        const endpoint = `https://api.elections.kalshi.com/trade-api/v2/markets${params.toString() ? `?${params.toString()}` : ''}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[Proxy] Successfully fetched Kalshi data');
        
        res.json({ success: true, data });
        
    } catch (error) {
        console.error('[Proxy] Kalshi error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Summary endpoints that proxy the Python analysis service.
 */
const ANALYSIS_BASE_URL = process.env.ANALYSIS_BASE_URL || 'http://localhost:8002';

async function proxyAnalysisPath(path, res) {
    try {
        const endpoint = `${ANALYSIS_BASE_URL}${path}`;
        const response = await fetch(endpoint, { method: 'GET' });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Analysis service error ${response.status}: ${text}`);
        }
        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('[Proxy] Analysis service error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

app.get('/api/summary/calibration', async (req, res) => {
    await proxyAnalysisPath('/calibration/overall', res);
});

app.get('/api/summary/calibration/by-exchange', async (req, res) => {
    await proxyAnalysisPath('/calibration/by_exchange', res);
});

app.get('/api/summary/behavior/liquidity', async (req, res) => {
    await proxyAnalysisPath('/behavior/liquidity', res);
});

app.get('/api/summary/behavior/event-window', async (req, res) => {
    const windowSize = Number(req.query.windowSize) || 24;
    await proxyAnalysisPath(`/behavior/event_window?window_size=${encodeURIComponent(windowSize)}`, res);
});

// Start server
app.listen(PORT, () => {
    // Initialize DB and ingestion scheduler when server starts
    getDb();
    startIngestionScheduler();

    console.log(`
╔════════════════════════════════════════╗
║   Prediction Markets API Proxy Server  ║
╠════════════════════════════════════════╣
║   Status: RUNNING                      ║
║   Port: ${PORT}                          ║
║   Endpoints:                           ║
║     /health          - Health & DB     ║
║     /api/markets     - Normalized DB   ║
║     /api/metaculus   - Metaculus data  ║
║     /api/polymarket  - Polymarket data ║
║     /api/kalshi      - Kalshi data     ║
║     /api/text-analysis - OpenAI text   ║
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    closeDb();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    closeDb();
    process.exit(0);
});
