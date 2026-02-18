// Kalshi API Integration
// Note: Kalshi API requires authentication for most endpoints
// This is a stub that will gracefully fall back to synthetic data

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';

/**
 * Fetch markets from Kalshi
 */
export async function fetchMarkets() {
    try {
        // Public markets endpoint (limited data without auth)
        const response = await fetch(`${KALSHI_API}/markets`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform to our format
        return (data.markets || []).map(transformKalshiData);
    } catch (error) {
        console.warn('Kalshi API error:', error);
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
