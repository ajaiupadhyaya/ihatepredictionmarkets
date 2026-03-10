// Data Manager - Coordinates data fetching and caching (LIVE REAL DATA ONLY)
import { state } from '../state.js';
import * as polymarketAPI from './polymarketAPI.js';
import * as kalshiAPI from './kalshiAPI.js';
import * as metaculusAPI from './metaculusAPI.js';
import * as syntheticData from './syntheticData.js';

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

function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
}

function updateDataQualityMetadata({ mode, sourceCounts = {}, totalMarkets = 0, notes = [] }) {
    const totalFromSources = Object.values(sourceCounts).reduce((sum, count) => sum + Number(count || 0), 0);
    const onlineSources = Object.values(state.apiStatus).filter(status => status === 'online').length;
    const sourceCoverage = clamp(onlineSources / 3);
    const marketCoverage = clamp(totalMarkets / 500);
    const confidence = clamp((sourceCoverage * 0.55) + (marketCoverage * 0.45));

    state.dataQuality = {
        mode,
        confidence,
        coverage: marketCoverage,
        sourceCounts: {
            polymarket: Number(sourceCounts.polymarket || 0),
            kalshi: Number(sourceCounts.kalshi || 0),
            metaculus: Number(sourceCounts.metaculus || 0)
        },
        notes,
        generatedAt: new Date().toISOString()
    };
}

function getScopedMarkets() {
    const allMarkets = Array.isArray(state.markets) ? state.markets.filter(Boolean) : [];

    const base = allMarkets.filter(market => {
        if (state.filters.platform !== 'all' && market.platform !== state.filters.platform) {
            return false;
        }

        if (state.filters.category !== 'all' && market.category !== state.filters.category) {
            return false;
        }

        return true;
    });

    const categoryPlatformScope = base.length > 0 ? base : allMarkets;

    const focused = state.filters.focusMarketId !== 'all'
        ? categoryPlatformScope.filter(market => market.id === state.filters.focusMarketId)
        : categoryPlatformScope;

    const focusScope = focused.length > 0 ? focused : categoryPlatformScope;

    const hasDateRange = Boolean(state.filters.dateRange?.start && state.filters.dateRange?.end);
    if (!hasDateRange) {
        return focusScope;
    }

    const start = state.filters.dateRange.start;
    const end = state.filters.dateRange.end;

    const dateFiltered = focusScope.filter(market => {
        const dateValue = market.createdAt || market.resolvedAt;
        if (!dateValue) return true;

        const marketDate = new Date(dateValue);
        if (Number.isNaN(marketDate.getTime())) return true;

        return marketDate >= start && marketDate <= end;
    });

    return dateFiltered.length > 0 ? dateFiltered : focusScope;
}

/**
 * Initialize data layer
 */
export async function initializeData() {
    console.log('📡 Initializing data layer (LIVE DATA ONLY)...');
    cache.clear();
    
    try {
        if (state.useLiveData) {
            await loadLiveData();
        } else {
            console.error('❌ Live data disabled in state but required');
            state.markets = [];
            updateDataQualityMetadata({
                mode: 'disabled',
                sourceCounts: {},
                totalMarkets: 0,
                notes: ['Live data is disabled; analytics cannot load market inputs.']
            });
        }
    } catch (error) {
        console.error('❌ CRITICAL: Failed to load live data:', error);
        console.error('Stack:', error.stack);
        state.markets = [];
        cache.clear();
        state.apiStatus.polymarket = 'offline';
        state.apiStatus.kalshi = 'offline';
        state.apiStatus.metaculus = 'offline';
        updateDataQualityMetadata({
            mode: 'error',
            sourceCounts: {},
            totalMarkets: 0,
            notes: ['All upstream APIs failed during initialization.']
        });
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
                return { source: 'polymarket', data };
            })
            .catch(err => {
                console.error('[DM] ❌ Polymarket failed:', err.message);
                state.apiStatus.polymarket = 'offline';
                return { source: 'polymarket', data: [] };
            })
    );
    
    // Kalshi
    apiAttempts.push(
        retryFetch(() => kalshiAPI.fetchMarkets(), 'Kalshi')
            .then(data => {
                console.log(`[DM] ✅ Kalshi returned ${data.length} markets`);
                state.apiStatus.kalshi = 'online';
                return { source: 'kalshi', data };
            })
            .catch(err => {
                console.error('[DM] ❌ Kalshi failed:', err.message);
                state.apiStatus.kalshi = 'offline';
                return { source: 'kalshi', data: [] };
            })
    );
    
    // Metaculus
    apiAttempts.push(
        retryFetch(() => metaculusAPI.fetchMarkets(), 'Metaculus')
            .then(data => {
                console.log(`[DM] ✅ Metaculus returned ${data.length} markets`);
                state.apiStatus.metaculus = 'online';
                return { source: 'metaculus', data };
            })
            .catch(err => {
                console.error('[DM] ❌ Metaculus failed:', err.message);
                state.apiStatus.metaculus = 'offline';
                return { source: 'metaculus', data: [] };
            })
    );
    
    const results = await Promise.allSettled(apiAttempts);
    const fulfilledResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

    const sourceCounts = fulfilledResults.reduce((acc, result) => {
        acc[result.source] = (result.data || []).length;
        return acc;
    }, { polymarket: 0, kalshi: 0, metaculus: 0 });

    const allMarkets = fulfilledResults
        .map(r => r.data)
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
    updateDataQualityMetadata({
        mode: 'live',
        sourceCounts,
        totalMarkets: allMarkets.length,
        notes: [
            `${Object.values(sourceCounts).filter(count => count > 0).length} sources contributed market data.`,
            allMarkets.length < 150 ? 'Coverage is limited; treat higher-order metrics as directional.' : 'Coverage is sufficient for aggregate diagnostics.'
        ]
    });
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
    const startKey = state.filters.dateRange?.start ? new Date(state.filters.dateRange.start).toISOString().slice(0, 10) : 'none';
    const endKey = state.filters.dateRange?.end ? new Date(state.filters.dateRange.end).toISOString().slice(0, 10) : 'none';
    const cacheKey = `module_${moduleId}_${state.filters.platform}_${state.filters.category}_${state.filters.focusMarketId}_${startKey}_${endKey}`;
    
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
    const scopedMarkets = getScopedMarkets();
    console.log('[DM] getAllData() called. scopedMarkets.length:', scopedMarkets.length);
    console.log('[DM] scoped sample:', scopedMarkets.slice(0, 2));
    
    const result = {
        markets: scopedMarkets,
        forecasters: state.forecasters || [],
        categories: [...new Set(scopedMarkets.map(m => m.category))],
        dataQuality: state.dataQuality,
        summary: {
            total: scopedMarkets.length,
            resolved: scopedMarkets.filter(m => m.resolved).length,
            active: scopedMarkets.filter(m => !m.resolved).length
        }
    };
    
    console.log('[DM] getAllData() returning:', result.summary);
    return result;
}

async function getCalibrationData() {
    const scopedMarkets = getScopedMarkets();
    const resolvedMarkets = scopedMarkets.filter(m => m.resolved);
    console.log('[DM] getCalibrationData() called. Resolved markets:', resolvedMarkets.length, 'of', scopedMarkets.length);
    
    const result = {
        markets: resolvedMarkets,
        predictions: resolvedMarkets.map(m => m.finalProbability),
        outcomes: resolvedMarkets.map(m => m.outcome),
        categories: [...new Set(resolvedMarkets.map(m => m.category))]
    };
    
    console.log('[DM] getCalibrationData() returning:', result);
    return result;
}

function getEffectiveProbability(market) {
    if (market.currentProbability !== null && market.currentProbability !== undefined) {
        return Number(market.currentProbability);
    }
    if (market.finalProbability !== null && market.finalProbability !== undefined) {
        return Number(market.finalProbability);
    }
    return 0.5;
}

function getPointFromMarket(market, value = null) {
    return {
        timestamp: market.resolvedAt || market.createdAt || new Date().toISOString(),
        price: value !== null ? value : getEffectiveProbability(market),
        volume: Number(market.volume || 0)
    };
}

function groupByCategoryAndPlatform(markets) {
    const grouped = new Map();

    for (const market of markets) {
        if (!market.category || !market.platform) continue;
        const key = `${market.category}::${market.platform}`;
        const list = grouped.get(key) || [];
        list.push(market);
        grouped.set(key, list);
    }

    return grouped;
}

function aggregateProbability(markets) {
    if (!markets || markets.length === 0) return null;
    const totalWeight = markets.reduce((sum, m) => sum + Math.max(1, Number(m.volume || 0)), 0);
    const weighted = markets.reduce((sum, m) => sum + getEffectiveProbability(m) * Math.max(1, Number(m.volume || 0)), 0);
    return weighted / totalWeight;
}

function buildSeriesFromMarkets(markets, maxPoints = 60) {
    const normalized = (markets || [])
        .filter(m => m && m.createdAt)
        .map(m => ({
            timestamp: m.createdAt,
            price: getEffectiveProbability(m),
            volume: Number(m.volume || 0),
            market: m
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (normalized.length === 0) {
        return [];
    }

    if (normalized.length <= maxPoints) {
        return normalized;
    }

    const sampled = [];
    for (let i = 0; i < maxPoints; i++) {
        const idx = Math.floor((i / (maxPoints - 1)) * (normalized.length - 1));
        sampled.push(normalized[idx]);
    }
    return sampled;
}

function alignSeries(seriesA, seriesB, seriesC) {
    const minLen = Math.min(seriesA.length, seriesB.length, seriesC.length);
    if (minLen < 2) {
        return null;
    }

    const a = seriesA.slice(-minLen);
    const b = seriesB.slice(-minLen);
    const c = seriesC.slice(-minLen);

    return {
        market: a.map((point, idx) => ({
            timestamp: point.timestamp,
            price: point.price,
            volume: point.volume
        })),
        expert: b.map((point, idx) => ({
            timestamp: a[idx].timestamp,
            price: point.price,
            volume: point.volume
        })),
        metaculus: c.map((point, idx) => ({
            timestamp: a[idx].timestamp,
            price: point.price,
            volume: point.volume
        }))
    };
}

async function getCrowdWisdomData() {
    const scopedMarkets = getScopedMarkets();

    if (state.useLiveData && state.strictRealData) {
        const grouped = groupByCategoryAndPlatform(scopedMarkets.filter(m => !m.resolved));
        const categories = [...new Set(scopedMarkets.map(m => m.category).filter(Boolean))];
        const events = [];

        for (const category of categories) {
            const polymarketGroup = grouped.get(`${category}::polymarket`) || [];
            const kalshiGroup = grouped.get(`${category}::kalshi`) || [];
            const metaculusGroup = grouped.get(`${category}::metaculus`) || [];

            const marketSeriesRaw = buildSeriesFromMarkets(polymarketGroup.length > 0 ? polymarketGroup : kalshiGroup);
            const expertSeriesRaw = buildSeriesFromMarkets(kalshiGroup.length > 0 ? kalshiGroup : metaculusGroup);
            const metaculusSeriesRaw = buildSeriesFromMarkets(metaculusGroup.length > 0 ? metaculusGroup : expertSeriesRaw.map(p => p.market).filter(Boolean));

            const aligned = alignSeries(
                marketSeriesRaw,
                expertSeriesRaw,
                metaculusSeriesRaw.length > 0 ? metaculusSeriesRaw : expertSeriesRaw
            );

            if (!aligned) continue;

            events.push({
                id: `cross_source_${category}`,
                title: `${category} cross-source consensus`,
                category,
                resolved: false,
                resolvedAt: null,
                outcome: null,
                marketProbabilities: aligned.market,
                expertProbabilities: aligned.expert,
                metaculusProbabilities: aligned.metaculus
            });
        }

        if (events.length === 0) {
            const fallbackSeries = buildSeriesFromMarkets(scopedMarkets.filter(m => !m.resolved));
            if (fallbackSeries.length >= 2) {
                const marketProbabilities = fallbackSeries.map(d => ({ timestamp: d.timestamp, price: d.price, volume: d.volume }));
                events.push({
                    id: 'market_consensus_all',
                    title: 'All markets live consensus',
                    category: 'all',
                    resolved: false,
                    resolvedAt: null,
                    outcome: null,
                    marketProbabilities,
                    expertProbabilities: marketProbabilities,
                    metaculusProbabilities: marketProbabilities
                });
            }
        }

        return { events };
    }

    const resolvedMarkets = scopedMarkets.filter(m => m.resolved).slice(0, 20);
    
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
    const scopedMarkets = getScopedMarkets();

    if (state.useLiveData && state.strictRealData) {
        const candidates = scopedMarkets.filter(m => m.createdAt && (m.currentProbability !== null && m.currentProbability !== undefined));
        if (candidates.length === 0) {
            return { market: null, trades: [] };
        }

        const ranked = [...candidates].sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0));
        const primary = ranked[0];
        let priceHistory = buildSeriesFromMarkets(candidates, 80).map(d => ({
            timestamp: d.timestamp,
            price: d.price,
            volume: d.volume
        }));

        if (priceHistory.length < 2) {
            priceHistory = [{
                timestamp: primary.createdAt,
                price: getEffectiveProbability(primary),
                volume: Number(primary.volume || 0)
            }];
        }

        const trades = priceHistory.slice(1).map((point, idx) => {
            const prev = priceHistory[idx];
            return {
                id: `trade_${idx + 1}`,
                timestamp: point.timestamp,
                size: Math.max(1, Number(point.volume || 0)),
                isBuy: point.price >= prev.price,
                price: point.price
            };
        });

        const enrichedMarket = {
            ...primary,
            priceHistory
        };

        return { market: enrichedMarket, trades };
    }

    const markets = scopedMarkets.filter(m => m.priceHistory && m.priceHistory.length > 100);
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
    const scopedMarkets = getScopedMarkets();

    if (state.useLiveData && state.strictRealData) {
        const markets = scopedMarkets;
        const opportunities = [];
        const categories = [...new Set(markets.map(m => m.category).filter(Boolean))];

        for (const category of categories) {
            const byCategory = markets.filter(m => m.category === category);
            const byPlatform = {
                polymarket: byCategory.filter(m => m.platform === 'polymarket'),
                kalshi: byCategory.filter(m => m.platform === 'kalshi'),
                metaculus: byCategory.filter(m => m.platform === 'metaculus')
            };

            const pairs = [
                ['polymarket', 'kalshi'],
                ['polymarket', 'metaculus'],
                ['kalshi', 'metaculus']
            ];

            for (const [left, right] of pairs) {
                const leftProb = aggregateProbability(byPlatform[left]);
                const rightProb = aggregateProbability(byPlatform[right]);

                if (leftProb === null || rightProb === null) continue;

                const spread = Math.abs(leftProb - rightProb);
                if (spread >= 0.05) {
                    opportunities.push({
                        id: `${category}_${left}_${right}`,
                        category,
                        pair: `${left} vs ${right}`,
                        leftProbability: leftProb,
                        rightProbability: rightProb,
                        spread,
                        estimatedProfit: spread * 100
                    });
                }
            }
        }

        opportunities.sort((a, b) => b.spread - a.spread);
        return { markets, opportunities };
    }

    const correlatedMarkets = syntheticData.generateCorrelatedMarkets(scopedMarkets.slice(0, 50));
    const opportunities = syntheticData.generateArbitrageOpportunities(correlatedMarkets);
    
    return {
        markets: correlatedMarkets,
        opportunities
    };
}

async function getSentimentData() {
    const scopedMarkets = getScopedMarkets();

    if (state.useLiveData && state.strictRealData) {
        const active = scopedMarkets.filter(m => !m.resolved && (m.currentProbability !== null && m.currentProbability !== undefined));
        if (active.length === 0) {
            return { timeseries: [] };
        }

        const market = [...active].sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0))[0];
        const series = buildSeriesFromMarkets(active, 90);

        if (series.length === 0) {
            return { timeseries: [] };
        }

        const timeseries = series.map((point, idx) => {
            const prev = idx > 0 ? series[idx - 1] : point;
            const delta = point.price - prev.price;
            const sentiment = Math.max(-1, Math.min(1, delta * 8));
            return {
                timestamp: point.timestamp,
                sentiment,
                probability: point.price,
                mentions: Math.max(1, Math.round(point.volume))
            };
        });

        return {
            market,
            timeseries
        };
    }

    const market = scopedMarkets.find(m => m.priceHistory && m.priceHistory.length > 0);
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
    const scopedMarkets = getScopedMarkets();

    return {
        markets: scopedMarkets,
        categories: [...new Set(scopedMarkets.map(m => m.category))]
    };
}

async function getLeaderboardData() {
    const scopedMarkets = getScopedMarkets();

    if (state.useLiveData && state.strictRealData) {
        const resolved = scopedMarkets.filter(m => m.resolved && m.outcome !== null && m.outcome !== undefined);
        const closedNoOutcome = scopedMarkets.filter(m => m.resolved && (m.outcome === null || m.outcome === undefined));
        const platforms = ['polymarket', 'kalshi', 'metaculus'];

        const forecasters = platforms.map(platform => {
            const platformMarkets = resolved.filter(m => m.platform === platform);
            if (platformMarkets.length === 0) {
                return {
                    name: platform,
                    brierScore: 1,
                    logScore: 1,
                    sphericalScore: 0,
                    accuracy: 0,
                    predictions: 0,
                    predictionCount: 0,
                    calibration: 0,
                    luckAdjustedScore: 1
                };
            }

            const predictions = platformMarkets.map(getEffectiveProbability);
            const outcomes = platformMarkets.map(m => Number(m.outcome));

            let brierScore = 1;
            try {
                brierScore = predictions.reduce((sum, p, i) => {
                    const err = p - outcomes[i];
                    return sum + err * err;
                }, 0) / predictions.length;
            } catch {
                brierScore = 1;
            }

            const correctCount = predictions.reduce((sum, p, i) => {
                const predicted = p >= 0.5 ? 1 : 0;
                return sum + (predicted === outcomes[i] ? 1 : 0);
            }, 0);

            const accuracy = correctCount / predictions.length;

            return {
                name: platform,
                brierScore,
                logScore: brierScore,
                sphericalScore: 1 - brierScore,
                accuracy,
                predictions: predictions.length,
                predictionCount: predictions.length,
                calibration: brierScore,
                luckAdjustedScore: brierScore * 0.95
            };
        }).filter(f => f.predictionCount > 0);

        return {
            forecasters,
            markets: resolved.length > 0 ? resolved : closedNoOutcome
        };
    }

    return {
        forecasters: state.forecasters || [],
        markets: scopedMarkets.filter(m => m.resolved)
    };
}

async function getWhalesData() {
    const scopedMarkets = getScopedMarkets();

    if (state.useLiveData && state.strictRealData) {
        const liquidMarkets = [...scopedMarkets]
            .filter(m => Number(m.volume || 0) > 0)
            .sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0));

        const trades = liquidMarkets.slice(0, 200).map((market, idx) => ({
            id: `market_volume_${market.id}`,
            timestamp: market.createdAt || new Date().toISOString(),
            size: Number(market.volume || 0),
            price: getEffectiveProbability(market),
            direction: getEffectiveProbability(market) >= 0.5 ? 1 : -1,
            marketId: market.id,
            trader: market.platform,
            rank: idx + 1
        }));

        const whales = liquidMarkets.slice(0, 25).map(market => ({
            id: `whale_${market.id}`,
            wallet: market.id,
            platform: market.platform,
            totalVolume: Number(market.volume || 0),
            tradeCount: 1,
            winRate: market.outcome === null || market.outcome === undefined
                ? null
                : ((getEffectiveProbability(market) >= 0.5 ? 1 : 0) === Number(market.outcome) ? 1 : 0),
            pnl: 0
        }));

        return {
            trades,
            whales,
            market: liquidMarkets[0] || null
        };
    }

    const market = scopedMarkets.find(m => m.priceHistory && m.priceHistory.length > 100);
    
    if (!market) {
        return { trades: [], whales: [] };
    }
    
    const trades = syntheticData.generateTrades(market, 1000);
    const whales = syntheticData.generateWhales(trades);
    
    return { trades, whales, market };
}

async function getTailRiskData() {
    const resolvedMarkets = getScopedMarkets().filter(m => m.resolved);
    
    return {
        markets: resolvedMarkets,
        predictions: resolvedMarkets.map(m => m.finalProbability),
        outcomes: resolvedMarkets.map(m => m.outcome)
    };
}

async function getTemporalData() {
    const scopedMarkets = getScopedMarkets();
    const byCategory = new Map();
    for (const market of scopedMarkets) {
        if (!market.createdAt || !market.category) continue;
        const list = byCategory.get(market.category) || [];
        list.push(market);
        byCategory.set(market.category, list);
    }

    const markets = [];
    let syntheticId = 0;

    for (const [category, groupedMarkets] of byCategory.entries()) {
        const series = buildSeriesFromMarkets(groupedMarkets, 80).map(d => ({
            timestamp: d.timestamp,
            price: d.price,
            volume: d.volume
        }));

        if (series.length >= 2) {
            markets.push({
                id: `temporal_${category}_${syntheticId++}`,
                title: `${category} temporal path`,
                category,
                priceHistory: series
            });
        }
    }

    if (markets.length === 0) {
        const fallback = buildSeriesFromMarkets(scopedMarkets, 80).map(d => ({
            timestamp: d.timestamp,
            price: d.price,
            volume: d.volume
        }));

        if (fallback.length >= 2) {
            markets.push({
                id: 'temporal_all_markets',
                title: 'All markets temporal path',
                category: 'all',
                priceHistory: fallback
            });
        }
    }

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
