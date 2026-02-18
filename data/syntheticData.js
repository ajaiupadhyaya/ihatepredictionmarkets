// Synthetic Data Generator
// Generates realistic prediction market data for all modules

/**
 * Generate resolved prediction markets with calibrated probabilities
 */
export function generateResolvedMarkets(count = 500) {
    const markets = [];
    const categories = ['politics', 'crypto', 'economics', 'science', 'sports', 'other'];
    const platforms = ['polymarket', 'kalshi', 'metaculus'];
    
    for (let i = 0; i < count; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        
        // Generate final probability with some calibration noise
        const baseProbability = Math.random();
        
        // Add calibration bias (favorite-longshot bias)
        let finalProbability;
        if (baseProbability < 0.2) {
            // Longshots: overpriced
            finalProbability = Math.min(1, baseProbability * 1.5);
        } else if (baseProbability > 0.8) {
            // Favorites: underpriced
            finalProbability = 0.8 + (baseProbability - 0.8) * 0.7;
        } else {
            finalProbability = baseProbability;
        }
        
        // Determine outcome based on probability (making markets reasonably calibrated)
        const outcome = Math.random() < finalProbability ? 1 : 0;
        
        // Generate market metadata
        const daysAgo = Math.floor(Math.random() * 365);
        const resolutionDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const creationDate = new Date(resolutionDate.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000);
        
        // Generate volume (log-normal distribution)
        const logVolume = 8 + Math.random() * 4; // log($3000) to log($55000)
        const volume = Math.exp(logVolume);
        
        // Generate liquidity score (inverse of spread)
        const liquidity = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
        
        // Generate number of traders (power law)
        const traders = Math.floor(Math.pow(Math.random(), 2) * 1000) + 10;
        
        markets.push({
            id: `market_${i}`,
            title: generateMarketTitle(category),
            category,
            platform,
            createdAt: creationDate.toISOString(),
            resolvedAt: resolutionDate.toISOString(),
            resolved: true,
            outcome,
            finalProbability,
            volume,
            liquidity,
            traders,
            // Price history for temporal analysis
            priceHistory: generatePriceHistory(finalProbability, creationDate, resolutionDate)
        });
    }
    
    return markets;
}

/**
 * Generate open (unresolved) markets
 */
export function generateOpenMarkets(count = 200) {
    const markets = [];
    const categories = ['politics', 'crypto', 'economics', 'science', 'sports', 'other'];
    const platforms = ['polymarket', 'kalshi', 'metaculus'];
    
    for (let i = 0; i < count; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        
        const currentProbability = Math.random();
        const daysAgo = Math.floor(Math.random() * 60);
        const creationDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        
        // Future resolution date
        const daysUntilResolution = Math.floor(Math.random() * 180) + 7;
        const resolutionDate = new Date(Date.now() + daysUntilResolution * 24 * 60 * 60 * 1000);
        
        const logVolume = 7 + Math.random() * 5;
        const volume = Math.exp(logVolume);
        const liquidity = 0.4 + Math.random() * 0.6;
        const traders = Math.floor(Math.pow(Math.random(), 2) * 800) + 5;
        
        markets.push({
            id: `market_open_${i}`,
            title: generateMarketTitle(category),
            category,
            platform,
            createdAt: creationDate.toISOString(),
            resolvedAt: null,
            resolutionDate: resolutionDate.toISOString(),
            resolved: false,
            outcome: null,
            currentProbability,
            volume,
            liquidity,
            traders,
            priceHistory: generatePriceHistory(currentProbability, creationDate, new Date())
        });
    }
    
    return markets;
}

/**
 * Generate price history for a market
 */
function generatePriceHistory(finalPrice, startDate, endDate) {
    const history = [];
    
    // Ensure dates are valid Date objects
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid dates in generatePriceHistory:', startDate, endDate);
        return [];
    }
    
    const totalDays = Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
    const pointsPerDay = 4; // 6-hour intervals
    const totalPoints = totalDays * pointsPerDay;
    
    // Use Ornstein-Uhlenbeck process for mean-reverting random walk
    const theta = 0.5; // mean reversion speed
    const sigma = 0.15; // volatility
    const dt = 1 / pointsPerDay;
    
    let currentPrice = 0.3 + Math.random() * 0.4; // Start near 0.5
    
    for (let i = 0; i <= totalPoints; i++) {
        const t = i / totalPoints;
        const timestamp = new Date(start.getTime() + t * (end - start));
        
        // Drift towards final price as we approach resolution
        const mu = currentPrice + t * (finalPrice - currentPrice);
        
        // OU process update
        const dW = (Math.random() - 0.5) * Math.sqrt(dt);
        const dX = theta * (mu - currentPrice) * dt + sigma * dW;
        currentPrice = Math.max(0.01, Math.min(0.99, currentPrice + dX));
        
        // Add volume (higher near start and end)
        const volumeMultiplier = 1 + Math.sin(t * Math.PI) * 0.5;
        const volumePoint = Math.exp(6 + Math.random() * 2) * volumeMultiplier;
        
        history.push({
            timestamp: timestamp.toISOString(),
            price: currentPrice,
            volume: volumePoint
        });
    }
    
    return history;
}

/**
 * Generate forecasters with varying skill levels
 */
export function generateForecasters(count = 100, markets = []) {
    const forecasters = [];
    
    for (let i = 0; i < count; i++) {
        // Skill level (0 = random, 1 = perfect)
        const skill = Math.pow(Math.random(), 2); // Skewed towards lower skill
        
        const forecaster = {
            id: `forecaster_${i}`,
            name: generateForecasterName(),
            skill,
            predictions: []
        };
        
        // Generate predictions for resolved markets
        const resolvedMarkets = markets.filter(m => m.resolved);
        const numPredictions = Math.floor(20 + Math.random() * (resolvedMarkets.length - 20));
        
        const selectedMarkets = shuffleArray(resolvedMarkets).slice(0, numPredictions);
        
        selectedMarkets.forEach(market => {
            // Skilled forecasters predict closer to true probability
            const noise = (1 - skill) * (Math.random() - 0.5) * 0.6;
            const prediction = Math.max(0.01, Math.min(0.99, market.finalProbability + noise));
            
            forecaster.predictions.push({
                marketId: market.id,
                prediction,
                outcome: market.outcome,
                timestamp: new Date(market.createdAt).toISOString()
            });
        });
        
        forecasters.push(forecaster);
    }
    
    return forecasters;
}

/**
 * Generate trade data with power-law distributed sizes
 */
export function generateTrades(market, count = 500) {
    const trades = [];
    const priceHistory = market.priceHistory || [];
    
    for (let i = 0; i < count; i++) {
        // Power law distribution for trade size (alpha ≈ 2.5)
        const u = Math.random();
        const size = 10 * Math.pow(1 - u, -1/1.5); // Pareto distribution
        const clampedSize = Math.min(size, 10000); // Cap at $10k
        
        // Pick a random time point
        const historyIdx = Math.floor(Math.random() * priceHistory.length);
        const pricePoint = priceHistory[historyIdx];
        
        // Direction (buy YES vs NO)
        const direction = Math.random() > 0.5 ? 'YES' : 'NO';
        
        // Price impact proportional to sqrt(size)
        const impact = Math.sqrt(clampedSize / 1000) * 0.01 * (direction === 'YES' ? 1 : -1);
        const priceAfter = Math.max(0.01, Math.min(0.99, pricePoint.price + impact));
        
        trades.push({
            timestamp: pricePoint.timestamp,
            size: clampedSize,
            direction,
            isBuy: direction === 'YES', // Added for compatibility
            priceBefore: pricePoint.price,
            priceAfter,
            priceImpact: Math.abs(priceAfter - pricePoint.price)
        });
    }
    
    return trades.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/**
 * Generate whale traders from trade data
 */
export function generateWhales(trades) {
    // Group trades by simulated trader address
    const numWhales = 50;
    const whales = [];
    
    // Assign trades to traders (power law distribution)
    const tradesByTrader = {};
    
    trades.forEach(trade => {
        // Simulate trader address (power law: few traders make many trades)
        const u = Math.random();
        const traderIdx = Math.min(numWhales - 1, Math.floor(numWhales * Math.pow(u, 0.3)));
        const address = `0x${traderIdx.toString(16).padStart(40, '0')}`;
        
        if (!tradesByTrader[address]) {
            tradesByTrader[address] = [];
        }
        tradesByTrader[address].push(trade);
    });
    
    // Calculate stats for each whale
    for (const [address, traderTrades] of Object.entries(tradesByTrader)) {
        const totalVolume = traderTrades.reduce((sum, t) => sum + t.size, 0);
        const avgTradeSize = totalVolume / traderTrades.length;
        
        // Simulate win rate (slightly better than random)
        const winRate = 0.5 + (Math.random() - 0.5) * 0.2; // 0.4 to 0.6
        
        // Simulate PnL (correlated with skill)
        const pnl = (winRate - 0.5) * totalVolume * 0.5 + (Math.random() - 0.5) * 1000;
        
        whales.push({
            address,
            totalVolume,
            tradeCount: traderTrades.length,
            avgTradeSize,
            winRate,
            pnl
        });
    }
    
    return whales.sort((a, b) => b.totalVolume - a.totalVolume);
}

/**
 * Generate sentiment data correlated with price
 */
export function generateSentimentData(market) {
    const sentimentHistory = [];
    const priceHistory = market.priceHistory || [];
    
    // Sentiment leads price by 0-3 days on average
    const leadDays = Math.random() * 3;
    
    priceHistory.forEach((point, idx) => {
        // Sentiment is correlated with price but with noise
        const correlation = 0.7;
        const sentimentFromPrice = (point.price - 0.5) * 2; // Scale to [-1, 1]
        const noise = (Math.random() - 0.5) * 0.6;
        const rawSentiment = correlation * sentimentFromPrice + (1 - correlation) * noise;
        
        // Bounded to [-1, 1]
        const sentiment = Math.max(-1, Math.min(1, rawSentiment));
        
        sentimentHistory.push({
            timestamp: point.timestamp,
            sentiment,
            volume: Math.floor(50 + Math.random() * 200) // Number of mentions
        });
    });
    
    return sentimentHistory;
}

/**
 * Generate correlated markets for arbitrage analysis
 */
export function generateCorrelatedMarkets(baseMarkets, numClusters = 5) {
    const clusters = [];
    
    for (let c = 0; c < numClusters; c++) {
        const clusterSize = 3 + Math.floor(Math.random() * 7);
        const cluster = [];
        
        // Base correlation within cluster
        const baseCorrelation = 0.6 + Math.random() * 0.3;
        
        // Pick random base markets
        const bases = shuffleArray([...baseMarkets]).slice(0, clusterSize);
        
        bases.forEach(market => {
            cluster.push({
                ...market,
                clusterId: c,
                correlation: baseCorrelation + (Math.random() - 0.5) * 0.2
            });
        });
        
        clusters.push(cluster);
    }
    
    return clusters.flat();
}

/**
 * Detect arbitrage opportunities
 */
export function generateArbitrageOpportunities(markets) {
    const opportunities = [];
    
    // Find markets with logical relationships
    for (let i = 0; i < markets.length - 1; i++) {
        for (let j = i + 1; j < Math.min(i + 10, markets.length); j++) {
            const m1 = markets[i];
            const m2 = markets[j];
            
            // Simulate related markets (e.g., "A wins" and "B wins" should sum to ~1)
            if (Math.random() < 0.1) { // 10% are related
                const p1 = m1.currentProbability || m1.finalProbability;
                const p2 = m2.currentProbability || m2.finalProbability;
                const sum = p1 + p2;
                
                // Dutch book if sum != 1
                if (Math.abs(sum - 1) > 0.05) {
                    opportunities.push({
                        markets: [m1.id, m2.id],
                        type: sum > 1 ? 'overround' : 'underround',
                        profit: Math.abs(sum - 1),
                        markets: [
                            { id: m1.id, title: m1.title, prob: p1 },
                            { id: m2.id, title: m2.title, prob: p2 }
                        ]
                    });
                }
            }
        }
    }
    
    return opportunities;
}

// Helper functions

function generateMarketTitle(category) {
    const templates = {
        politics: [
            'Will {candidate} win the {year} election?',
            'Will {party} control {chamber} after {year}?',
            'Will {policy} be enacted by {date}?'
        ],
        crypto: [
            'Will {coin} reach ${price} by {date}?',
            'Will {exchange} be operational in {year}?',
            'Will {blockchain} have more than {number} transactions by {date}?'
        ],
        economics: [
            'Will US GDP growth exceed {percent}% in {quarter}?',
            'Will the Fed raise rates by {date}?',
            'Will unemployment fall below {percent}% by {date}?'
        ],
        science: [
            'Will {discovery} be announced by {year}?',
            'Will {mission} successfully {action} by {date}?',
            'Will {technology} be commercially available by {year}?'
        ],
        sports: [
            'Will {team} win the {championship}?',
            'Will {player} win {award} in {year}?',
            'Will {team} make the playoffs in {year}?'
        ],
        other: [
            'Will {event} happen by {date}?',
            'Will {metric} exceed {number} by {year}?',
            'Will {person} {action} in {year}?'
        ]
    };
    
    const categoryTemplates = templates[category] || templates.other;
    const template = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
    
    // Fill in placeholders with random values
    return template
        .replace('{candidate}', pickRandom(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones']))
        .replace('{party}', pickRandom(['Democrats', 'Republicans', 'Coalition']))
        .replace('{chamber}', pickRandom(['Senate', 'House', 'Parliament']))
        .replace('{year}', pickRandom(['2026', '2027', '2028']))
        .replace('{date}', pickRandom(['June 2026', 'December 2026', 'March 2027']))
        .replace('{quarter}', pickRandom(['Q1', 'Q2', 'Q3', 'Q4']))
        .replace('{policy}', pickRandom(['climate bill', 'tax reform', 'infrastructure plan']))
        .replace('{coin}', pickRandom(['Bitcoin', 'Ethereum', 'Solana']))
        .replace('{price}', pickRandom(['100k', '10k', '500']))
        .replace('{exchange}', pickRandom(['Coinbase', 'Binance', 'Kraken']))
        .replace('{blockchain}', pickRandom(['Ethereum', 'Bitcoin', 'Polygon']))
        .replace('{number}', pickRandom(['1M', '10M', '100M']))
        .replace('{percent}', pickRandom(['2.5', '3.0', '4.0', '5.0']))
        .replace('{discovery}', pickRandom(['fusion breakthrough', 'cancer cure', 'AGI']))
        .replace('{mission}', pickRandom(['Mars mission', 'Moon base', 'asteroid mining']))
        .replace('{action}', pickRandom(['land', 'launch', 'return']))
        .replace('{technology}', pickRandom(['flying cars', 'quantum computers', 'brain interfaces']))
        .replace('{team}', pickRandom(['Lakers', 'Warriors', 'Celtics', 'Heat']))
        .replace('{championship}', pickRandom(['NBA Finals', 'Super Bowl', 'World Series']))
        .replace('{player}', pickRandom(['LeBron', 'Curry', 'Durant', 'Giannis']))
        .replace('{award}', pickRandom(['MVP', 'DPOY', 'ROY']))
        .replace('{event}', pickRandom(['recession', 'market crash', 'peace treaty']))
        .replace('{metric}', pickRandom(['population', 'revenue', 'users']))
        .replace('{person}', pickRandom(['CEO', 'president', 'leader']))
        .replace('{action}', pickRandom(['resign', 'announce', 'launch']));
}

function generateForecasterName() {
    const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery'];
    const lastNames = ['Predictor', 'Forecast', 'Oracle', 'Seer', 'Prophet', 'Sage'];
    return `${pickRandom(firstNames)} ${pickRandom(lastNames)}${Math.floor(Math.random() * 100)}`;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
