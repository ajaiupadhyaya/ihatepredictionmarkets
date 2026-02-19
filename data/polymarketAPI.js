// Polymarket API Integration
// Public API endpoints for fetching market data

const POLYMARKET_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';
const FETCH_TIMEOUT = 10000; // 10 second timeout

/**
 * Fetch markets from Polymarket
 */
export async function fetchMarkets() {
    try {
        console.log('Polymarket: Fetching from', CLOB_API);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        
        const response = await fetch(`${CLOB_API}/markets`, {
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
        console.log(`Polymarket: Got ${data.length} markets`);
        
        // Transform to our format
        return data.map(transformPolymarketData);
    } catch (error) {
        console.error('Polymarket API error:', error.message);
        throw error;
    }
}

/**
 * Transform Polymarket data to our internal format
 */
function transformPolymarketData(market) {
    return {
        id: `polymarket_${market.condition_id}`,
        title: market.question ||market.description,
        category: categorizeMarket(market.question),
        platform: 'polymarket',
        createdAt: market.created_at || new Date().toISOString(),
        resolvedAt: market.closed ? market.end_date : null,
        resolved: market.closed || false,
        outcome: market.outcome ? (market.outcome === 'Yes' ? 1 : 0) : null,
        currentProbability: parseFloat(market.last_price) || 0.5,
        finalProbability: market.closed ? parseFloat(market.last_price) : null,
        volume: parseFloat(market.volume) || 0,
        liquidity: parseFloat(market.liquidity) || 0,
        traders: market.participants || 0,
        priceHistory: [] // Would need separate API call
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
