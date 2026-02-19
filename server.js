// Simple backend proxy server for API requests
// Runs on port 3001, frontend calls localhost:3001/api/* instead of direct APIs
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Simple in-memory cache for API responses
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
            'https://www.metaculus.com/api2/questions/?status=resolved&limit=100',
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
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
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
        
        const endpoint = 'https://api.elections.kalshi.com/trade-api/v2/markets';
        
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

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Prediction Markets API Proxy Server  ║
╠════════════════════════════════════════╣
║   Status: RUNNING                      ║
║   Port: ${PORT}                          ║
║   Endpoints:                           ║
║     /health          - Health check    ║
║     /api/metaculus   - Metaculus data  ║
║     /api/polymarket  - Polymarket data ║
║     /api/kalshi      - Kalshi data     ║
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
});
