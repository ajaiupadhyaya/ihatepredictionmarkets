// Kalshi API Integration
// Public API endpoints for fetching market data
// Now proxied through backend server (server.js)

const FETCH_TIMEOUT = 15000; // 15 second timeout

function getEndpointCandidates() {
    if (typeof window === 'undefined') {
        return ['http://localhost:3001/api/kalshi'];
    }

    return ['/api/kalshi', 'http://localhost:3001/api/kalshi'];
}

function normalizeProxyResult(result) {
    if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'success')) {
        if (!result.success) {
            throw new Error(result.error || 'Proxy request failed');
        }
        return result.data;
    }

    return result;
}

/**
 * Fetch markets from Kalshi (via backend proxy)
 */
export async function fetchMarkets() {
    try {
        console.log('[KL] Kalshi: Fetching live data...');

        let payload = null;
        let lastError = null;
        const endpoints = getEndpointCandidates();

        const fetchPayload = async (endpoint, status) => {
            const separator = endpoint.includes('?') ? '&' : '?';
            const requestUrl = `${endpoint}${separator}status=${encodeURIComponent(status)}&limit=100`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

            try {
                const response = await fetch(requestUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                return normalizeProxyResult(result);
            } finally {
                clearTimeout(timeoutId);
            }
        };

        for (const endpoint of endpoints) {
            try {
                const [activePayload, closedPayload] = await Promise.all([
                    fetchPayload(endpoint, 'open'),
                    fetchPayload(endpoint, 'closed')
                ]);

                const activeMarkets = activePayload?.markets || [];
                const closedMarkets = closedPayload?.markets || [];
                const merged = [...activeMarkets, ...closedMarkets];
                const deduped = Array.from(new Map(merged.map(market => [market.ticker, market])).values());

                payload = { markets: deduped };
                console.log('[KL] Data source:', endpoint);
                break;
            } catch (error) {
                lastError = error;
                console.warn(`[KL] Endpoint failed (${endpoint}):`, error.message);
            }
        }

        if (!payload) {
            throw lastError || new Error('No Kalshi endpoint responded');
        }

        const data = payload;
        const markets = data.markets || [];
        console.log(`[KL] Got ${markets.length} markets`);
        
        if (!Array.isArray(markets) || markets.length === 0) {
            throw new Error('No markets in Kalshi response');
        }
        
        // Transform to our format with error handling
        const transformed = [];
        for (let i = 0; i < markets.length; i++) {
            try {
                const market = transformKalshiData(markets[i]);
                transformed.push(market);
            } catch (err) {
                if (i < 5) console.warn(`[KL] Failed to transform market ${i}:`, err.message);
            }
        }
        
        console.log(`[KL] ✅ Successfully transformed ${transformed.length}/${markets.length} markets`);
        if (transformed.length === 0) {
            throw new Error('Failed to transform any Kalshi markets');
        }
        return transformed;
    } catch (error) {
        console.error('[KL] ❌ Kalshi API error:', error.message);
        console.error('[KL] Stack:', error.stack);
        throw error;
    }
}

/**
 * Transform Kalshi data to our internal format
 */
function transformKalshiData(market) {
    if (!market || typeof market !== 'object') {
        throw new Error('Invalid market object');
    }
    
    if (!market.ticker) {
        throw new Error('Market missing ticker');
    }
    
    const title = market.title || market.subtitle || 'Unknown Market';
    const status = String(market.status || '').toLowerCase();
    const resolvedStatuses = new Set(['determined', 'closed', 'settled', 'finalized']);
    const resolved = resolvedStatuses.has(status);

    let currentProbability = 0.5;
    if (market.last_price !== undefined && market.last_price !== null) {
        currentProbability = Number(market.last_price) / 100;
    } else if (market.yes_bid !== undefined && market.yes_bid !== null && market.yes_ask !== undefined && market.yes_ask !== null) {
        currentProbability = (Number(market.yes_bid) + Number(market.yes_ask)) / 200;
    } else if (market.yes_bid !== undefined && market.yes_bid !== null) {
        currentProbability = Number(market.yes_bid) / 100;
    }

    currentProbability = Math.max(0.01, Math.min(0.99, currentProbability));
    const result = String(market.result || '').toLowerCase();
    const outcome = result === 'yes' ? 1 : (result === 'no' ? 0 : null);
    
    return {
        id: `kalshi_${market.ticker}`,
        title: title,
        category: market.category || 'other',
        platform: 'kalshi',
        createdAt: market.open_time || new Date().toISOString(),
        resolvedAt: resolved ? (market.close_time || market.expiration_time || null) : null,
        resolved,
        outcome,
        currentProbability,
        finalProbability: resolved ? currentProbability : null,
        volume: market.volume ? parseFloat(market.volume) : 0,
        liquidity: market.open_interest ? parseFloat(market.open_interest) : 0,
        traders: 0,
        priceHistory: []
    };
}
