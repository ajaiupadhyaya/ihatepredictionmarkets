// Data Manager - Coordinates data fetching and caching
import { state } from '../state.js';
import * as syntheticData from './syntheticData.js';
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
    console.log('📡 Initializing data layer...');
    
    try {
        if (state.useLiveData) {
            await loadLiveData();
        } else {
            await loadSyntheticData();
        }
    } catch (error) {
        console.warn('Failed to load live data, falling back to synthetic:', error);
        await loadSyntheticData();
    }
    
    state.lastUpdate = new Date();
    updateMarketsLoaded();
}

/**
 * Load live data from APIs
 */
async function loadLiveData() {
    const promises = [];
    
    // Try fetching from each platform
    promises.push(
        polymarketAPI.fetchMarkets()
            .then(data => {
                state.apiStatus.polymarket = 'online';
                return data;
            })
            .catch(err => {
                state.apiStatus.polymarket = 'synthetic';
                return [];
            })
    );
    
    promises.push(
        kalshiAPI.fetchMarkets()
            .then(data => {
                state.apiStatus.kalshi = 'online';
                return data;
            })
            .catch(err => {
                state.apiStatus.kalshi = 'synthetic';
                return [];
            })
    );
    
    promises.push(
        metaculusAPI.fetchMarkets()
            .then(data => {
                state.apiStatus.metaculus = 'online';
                return data;
            })
            .catch(err => {
                state.apiStatus.metaculus = 'synthetic';
                return [];
            })
    );
    
    const results = await Promise.all(promises);
    const allMarkets = results.flat();
    
    // If we got very few markets, supplement with synthetic
    if (allMarkets.length < 50) {
        console.log('Insufficient live data, supplementing with synthetic');
        const synthetic = syntheticData.generateResolvedMarkets(300);
        state.markets = [...allMarkets, ...synthetic];
    } else {
        state.markets = allMarkets;
    }
}

/**
 * Load synthetic data
 */
async function loadSyntheticData() {
    console.log('🎲 Generating synthetic data...');
    
    const resolvedMarkets = syntheticData.generateResolvedMarkets(500);
    const openMarkets = syntheticData.generateOpenMarkets(200);
    
    state.markets = [...resolvedMarkets, ...openMarkets];
    state.forecasters = syntheticData.generateForecasters(100, state.markets);
    
    // Mark all as synthetic
    state.apiStatus.polymarket = 'synthetic';
    state.apiStatus.kalshi = 'synthetic';
    state.apiStatus.metaculus = 'synthetic';
    
    console.log(`✅ Generated ${state.markets.length} markets, ${state.forecasters.length} forecasters`);
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
    const correlatedMarkets = syntheticData.generateCorrelatedMarkets(state.markets.slice(0, 50));
    const opportunities = syntheticData.generateArbitrageOpportunities(correlatedMarkets);
    
    return {
        markets: correlatedMarkets,
        opportunities
    };
}

async function getSentimentData() {
    const markets = state.markets.filter(m => m.priceHistory).slice(0, 10);
    
    const marketsWithSentiment = markets.map(market => ({
        ...market,
        sentiment: syntheticData.generateSentimentData(market)
    }));
    
    return { markets: marketsWithSentiment };
}

async function getLiquidityData() {
    return {
        markets: state.markets,
        categories: [...new Set(state.markets.map(m => m.category))]
    };
}

async function getLeaderboardData() {
    return {
        forecasters: state.forecasters || [],
        markets: state.markets.filter(m => m.resolved)
    };
}

async function getWhalesData() {
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
    
    return { markets };
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
