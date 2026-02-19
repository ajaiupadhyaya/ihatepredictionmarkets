// Kalshi API Integration
// Public API endpoints for fetching market data

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const FETCH_TIMEOUT = 10000; // 10 second timeout

/**
 * Fetch markets from Kalshi
 */
export async function fetchMarkets() {
    try {
        console.log('Kalshi: Fetching from', KALSHI_API);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        
        const response = await fetch(`${KALSHI_API}/markets`, {
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
        console.log(`Kalshi: Got ${data.markets?.length || 0} markets`);
        
        // Transform to our format
        return (data.markets || []).map(transformKalshiData);
    } catch (error) {
        console.error('Kalshi API error:', error.message);
        throw error;
    }
}

/**
 * Transform Kalshi data to our internal format
 */
function transformKalshiData(market) {
    return {
        id: `kalshi_${market.ticker}`,
        title: market.title || market.subtitle,
        category: market.category || 'other',
        platform: 'kalshi',
        createdAt: market.open_time || new Date().toISOString(),
        resolvedAt: market.close_time && market.status === 'closed' ? market.close_time : null,
        resolved: market.status === 'closed',
        outcome: market.result ? (market.result === 'yes' ? 1 : 0) : null,
        currentProbability: market.last_price ? market.last_price / 100 : 0.5,
        finalProbability: market.status === 'closed' && market.last_price ? market.last_price / 100 : null,
        volume: market.volume || 0,
        liquidity: market.open_interest || 0,
        traders: 0, // Not available in public data
        priceHistory: []
    };
}
