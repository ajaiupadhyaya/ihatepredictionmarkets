// Polymarket API Integration
// Public API endpoints for fetching market data
// Now proxied through backend server (server.js)

const FETCH_TIMEOUT = 15000; // 15 second timeout

/**
 * Fetch markets from Polymarket (via backend proxy)
 */
export async function fetchMarkets() {
    try {
        console.log('Polymarket: Fetching from backend proxy...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        
        const response = await fetch('http://localhost:3001/api/polymarket', {
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
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Proxy request failed');
        }
        
        // Handle both array and object responses
        const data = result.data;
        const markets = Array.isArray(data) ? data : (data.markets || data.data || []);
        console.log(`Polymarket: Got ${markets.length} markets`);
        
        if (!Array.isArray(markets) || markets.length === 0) {
            throw new Error('No markets in Polymarket response');
        }
        
        // Transform to our format with error handling
        const transformed = [];
        for (let i = 0; i < markets.length; i++) {
            try {
                const market = transformPolymarketData(markets[i]);
                transformed.push(market);
            } catch (err) {
                console.warn(`Polymarket: Failed to transform market ${i}:`, err.message);
            }
        }
        
        console.log(`Polymarket: Successfully transformed ${transformed.length}/${markets.length} markets`);
        if (transformed.length === 0) {
            throw new Error('Failed to transform any Polymarket markets');
        }
        return transformed;
    } catch (error) {
        console.error('Polymarket API error:', error.message);
        throw error;
    }
}

/**
 * Transform Polymarket data to our internal format
 */
function transformPolymarketData(market) {
    if (!market || typeof market !== 'object') {
        throw new Error('Invalid market object');
    }
    
    if (!market.condition_id) {
        throw new Error('Market missing condition_id');
    }
    
    const question = market.question || market.description || 'Unknown Market';
    
    return {
        id: `polymarket_${market.condition_id}`,
        title: question,
        category: categorizeMarket(question),
        platform: 'polymarket',
        createdAt: market.created_at || market.open_time || new Date().toISOString(),
        resolvedAt: market.closed && market.end_date_iso ? market.end_date_iso : null,
        resolved: market.closed === true,
        outcome: market.outcome ? (market.outcome === 'Yes' ? 1 : 0) : null,
        currentProbability: market.last_price ? parseFloat(market.last_price) : 0.5,
        finalProbability: market.closed && market.last_price ? parseFloat(market.last_price) : null,
        volume: market.volume ? parseFloat(market.volume) : 0,
        liquidity: market.liquidity ? parseFloat(market.liquidity) : 0,
        traders: market.participants || 0,
        priceHistory: []
    };
}

/**
 * Categorize market based on title
 */
function categorizeMarket(title) {
    if (!title) return 'other';
    
    const lower = title.toLowerCase();
    
    if (lower.includes('election') || lower.includes('president') || lower.includes('senate')) {
        return 'politics';
    }
    if (lower.includes('bitcoin') || lower.includes('ethereum') || lower.includes('crypto')) {
        return 'crypto';
    }
    if (lower.includes('gdp') || lower.includes('inflation') || lower.includes('fed') || lower.includes('economy')) {
        return 'economics';
    }
    if (lower.includes('nba') || lower.includes('nfl') || lower.includes('sports')) {
        return 'sports';
    }
    if (lower.includes('science') || lower.includes('discovery') || lower.includes('research')) {
        return 'science';
    }
    
    return 'other';
}

/**
 * Fetch price history for a specific market
 */
export async function fetchPriceHistory(marketId) {
    try {
        const response = await fetch(`${GAMMA_API}/prices/${marketId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        return data.map(point => ({
            timestamp: point.timestamp,
            price: parseFloat(point.price),
            volume: parseFloat(point.volume) || 0
        }));
    } catch (error) {
        console.warn('Error fetching price history:', error);
        return [];
    }
}
