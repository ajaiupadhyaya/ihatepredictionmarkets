// Kalshi API Integration
// Public API endpoints for fetching market data
// Now proxied through backend server (server.js)

const FETCH_TIMEOUT = 15000; // 15 second timeout

/**
 * Fetch markets from Kalshi (via backend proxy)
 */
export async function fetchMarkets() {
    try {
        console.log('[KL] Kalshi: Fetching from backend proxy...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        
        const response = await fetch('http://localhost:3001/api/kalshi', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('[KL] Response status:', response.status, 'OK:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('[KL] Response JSON received, success:', result.success);
        
        if (!result.success) {
            throw new Error(result.error || 'Proxy request failed');
        }
        
        const data = result.data;
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
    
    return {
        id: `kalshi_${market.ticker}`,
        title: title,
        category: market.category || 'other',
        platform: 'kalshi',
        createdAt: market.open_time || new Date().toISOString(),
        resolvedAt: market.close_time && market.status === 'closed' ? market.close_time : null,
        resolved: market.status === 'closed',
        outcome: market.result ? (market.result === 'yes' ? 1 : 0) : null,
        currentProbability: market.last_price ? parseFloat(market.last_price) / 100 : 0.5,
        finalProbability: market.status === 'closed' && market.last_price ? parseFloat(market.last_price) / 100 : null,
        volume: market.volume ? parseFloat(market.volume) : 0,
        liquidity: market.open_interest ? parseFloat(market.open_interest) : 0,
        traders: 0,
        priceHistory: []
    };
}
