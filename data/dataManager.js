// Data Manager - Coordinates data fetching and caching (LIVE REAL DATA ONLY)
import { state } from '../state.js';
import * as polymarketAPI from './polymarketAPI.js';
import * as kalshiAPI from './kalshiAPI.js';
import * as metaculusAPI from './metaculusAPI.js';

class DataCache {
    constructor(ttl = 300000) { // 5 min default TTL
        this.cache = new Map();
        this.ttl = ttl;
    }
    
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.data;
    }
    
    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    clear() {
        this.cache.clear();
    }
}

const cache = new DataCache();

/**
 * Initialize data layer
 */
export async function initializeData() {
    console.log('📡 Initializing data layer (LIVE DATA ONLY)...');
    
    try {
        if (state.useLiveData) {
            await loadLiveData();
        } else {
            console.error('❌ Live data disabled in state but required');
            state.markets = [];
        }
    } catch (error) {
        console.error('❌ CRITICAL: Failed to load live data:', error);
        console.error('Stack:', error.stack);
        state.markets = [];
        state.apiStatus.polymarket = 'offline';
        state.apiStatus.kalshi = 'offline';
        state.apiStatus.metaculus = 'offline';
    }
    
    state.lastUpdate = new Date();
    updateMarketsLoaded();
}

/**
 * Load live data from APIs with retries
 */
async function loadLiveData() {
    console.log('🌐 Fetching from live APIs...');
    
    // Try each API with retry logic
    const apiAttempts = [];
    
    // Polymarket
    apiAttempts.push(
        retryFetch(() => polymarketAPI.fetchMarkets(), 'Polymarket')
            .then(data => {
                console.log(`[DM] ✅ Polymarket returned ${data.length} markets`);
                state.apiStatus.polymarket = 'online';
                return data;
            })
            .catch(err => {
                console.error('[DM] ❌ Polymarket failed:', err.message);
                state.apiStatus.polymarket = 'offline';
                return [];
            })
    );
    
    // Kalshi
    apiAttempts.push(
        retryFetch(() => kalshiAPI.fetchMarkets(), 'Kalshi')
            .then(data => {
                console.log(`[DM] ✅ Kalshi returned ${data.length} markets`);
                state.apiStatus.kalshi = 'online';
                return data;
            })
            .catch(err => {
                console.error('[DM] ❌ Kalshi failed:', err.message);
                state.apiStatus.kalshi = 'offline';
                return [];
            })
    );
    
    // Metaculus
    apiAttempts.push(
        retryFetch(() => metaculusAPI.fetchMarkets(), 'Metaculus')
            .then(data => {
                console.log(`[DM] ✅ Metaculus returned ${data.length} markets`);
                state.apiStatus.metaculus = 'online';
                return data;
            })
            .catch(err => {
                console.error('[DM] ❌ Metaculus failed:', err.message);
                state.apiStatus.metaculus = 'offline';
                return [];
            })
    );
    
    const results = await Promise.allSettled(apiAttempts);
    const allMarkets = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .flat();
    
    console.log('[DM] All results settled, total markets collected:', allMarkets.length);
    
    if (allMarkets.length === 0) {
        console.error('[DM] 🚨 NO DATA AVAILABLE FROM ANY API');
        console.error('[DM] API Status:', state.apiStatus);
        throw new Error('All APIs failed - no data available');
    }
    
    console.log(`[DM] 📊 Total markets loaded: ${allMarkets.length}`);
    state.markets = allMarkets;
    state.forecasters = [];
}

/**
 * Retry a fetch operation with exponential backoff
 */
async function retryFetch(fetchFn, apiName, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`  [${apiName}] Attempt ${attempt}/${maxAttempts}...`);
            const result = await fetchFn();
            console.log(`  [${apiName}] ✅ Attempt ${attempt} succeeded with ${result.length} items`);
            return result;
        } catch (error) {
            console.warn(`  [${apiName}] Attempt ${attempt} failed:`, error.message);
            if (attempt < maxAttempts) {
                const backoffMs = Math.pow(2, attempt - 1) * 1000;
                console.log(`  [${apiName}] Retrying in ${backoffMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }
        }
    }
    throw new Error(`${apiName} failed after ${maxAttempts} attempts`);
}

/**
 * Get data for specific module
 */
export async function getModuleData(moduleId) {
    const cacheKey = `module_${moduleId}_${state.filters.platform}_${state.filters.category}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }
    
    let data;
    
    switch (moduleId) {
        case 'all':
        case 'home':
            data = await getAllData();
            break;
        case 'calibration':
            data = await getCalibrationData();
            break;
        case 'crowd-wisdom':
            data = await getCrowdWisdomData();
            break;
        case 'price-discovery':
            data = await getPriceDiscoveryData();
            break;
        case 'arbitrage':
            data = await getArbitrageData();
            break;
        case 'sentiment':
            data = await getSentimentData();
            break;
        case 'liquidity':
            data = await getLiquidityData();
            break;
        case 'leaderboard':
            data = await getLeaderboardData();
            break;
        case 'whales':
            data = await getWhalesData();
            break;
        case 'tail-risk':
            data = await getTailRiskData();
            break;
        case 'temporal':
            data = await getTemporalData();
            break;
        default:
            data = {};
    }
    
    cache.set(cacheKey, data);
    return data;
}

// Module-specific data getters

async function getAllData() {
    return {
        markets: state.markets,
        forecasters: state.forecasters || [],
        categories: [...new Set(state.markets.map(m => m.category))],
        summary: {
            total: state.markets.length,
            resolved: state.markets.filter(m => m.resolved).length,
            active: state.markets.filter(m => !m.resolved).length
        }
    };
}

async function getCalibrationData() {
    const resolvedMarkets = state.markets.filter(m => m.resolved);
    
    return {
        markets: resolvedMarkets,
        predictions: resolvedMarkets.map(m => m.finalProbability),
        outcomes: resolvedMarkets.map(m => m.outcome),
        categories: [...new Set(resolvedMarkets.map(m => m.category))]
    };
}

async function getCrowdWisdomData() {
    if (state.useLiveData && state.strictRealData) {
        return { events: [] };
    }

    const resolvedMarkets = state.markets.filter(m => m.resolved).slice(0, 20);
    
    // Generate expert forecasts (synthetic)
    const eventsWithForecasts = resolvedMarkets.map(market => ({
        ...market,
        marketProbabilities: market.priceHistory,
        expertProbabilities: market.priceHistory.map(p => ({
            ...p,
            price: Math.max(0.01, Math.min(0.99, p.price + (Math.random() - 0.5) * 0.1))
        })),
        metaculusProbabilities: market.priceHistory.map(p => ({
            ...p,
            price: Math.max(0.01, Math.min(0.99, p.price + (Math.random() - 0.5) * 0.15))
        }))
    }));
    
    return { events: eventsWithForecasts };
}

async function getPriceDiscoveryData() {
    if (state.useLiveData && state.strictRealData) {
        return { market: null, trades: [] };
    }

    const markets = state.markets.filter(m => m.priceHistory && m.priceHistory.length > 100);
    const selectedMarket = markets[Math.floor(Math.random () * markets.length)];
    
    if (!selectedMarket) {
        return { market: null, trades: [] };
    }
    
    const trades = syntheticData.generateTrades(selectedMarket, 500);
    
    return {
        market: selectedMarket,
        trades,
        priceHistory: selectedMarket.priceHistory
    };
}

async function getArbitrageData() {
    if (state.useLiveData && state.strictRealData) {
        return { markets: [], opportunities: [] };
    }

    const correlatedMarkets = syntheticData.generateCorrelatedMarkets(state.markets.slice(0, 50));
    const opportunities = syntheticData.generateArbitrageOpportunities(correlatedMarkets);
    
    return {
        markets: correlatedMarkets,
        opportunities
    };
}

async function getSentimentData() {
    if (state.useLiveData && state.strictRealData) {
        return { timeseries: [] };
    }

    const market = state.markets.find(m => m.priceHistory && m.priceHistory.length > 0);
    if (!market) {
        return { timeseries: [] };
    }

    const sentimentHistory = syntheticData.generateSentimentData(market);
    const timeseries = sentimentHistory.map((point, idx) => ({
        timestamp: point.timestamp,
        sentiment: point.sentiment,
        probability: market.priceHistory[idx]?.price ?? null,
        mentions: point.volume
    })).filter(point => point.probability !== null);

    return { timeseries, market };
}

async function getLiquidityData() {
    return {
        markets: state.markets,
        categories: [...new Set(state.markets.map(m => m.category))]
    };
}

async function getLeaderboardData() {
    if (state.useLiveData && state.strictRealData) {
        return {
            forecasters: [],
            markets: state.markets.filter(m => m.resolved)
        };
    }

    return {
        forecasters: state.forecasters || [],
        markets: state.markets.filter(m => m.resolved)
    };
}

async function getWhalesData() {
    if (state.useLiveData && state.strictRealData) {
        return { trades: null, whales: [], market: null };
    }

    const market = state.markets.find(m => m.priceHistory && m.priceHistory.length > 100);
    
    if (!market) {
        return { trades: [], whales: [] };
    }
    
    const trades = syntheticData.generateTrades(market, 1000);
    const whales = syntheticData.generateWhales(trades);
    
    return { trades, whales, market };
}

async function getTailRiskData() {
    const resolvedMarkets = state.markets.filter(m => m.resolved);
    
    return {
        markets: resolvedMarkets,
        predictions: resolvedMarkets.map(m => m.finalProbability),
        outcomes: resolvedMarkets.map(m => m.outcome)
    };
}

async function getTemporalData() {
    const markets = state.markets.filter(m => m.priceHistory && m.priceHistory.length > 50);

    return { markets: markets.length > 0 ? markets : null };
}

function updateMarketsLoaded() {
    const element = document.getElementById('markets-loaded');
    if (element) {
        element.textContent = state.markets.length;
    }
}

// Refresh data periodically
export function startDataRefresh(intervalMs = 60000) {
    setInterval(async () => {
        if (state.useLiveData) {
            await initializeData();
        }
    }, intervalMs);
}
