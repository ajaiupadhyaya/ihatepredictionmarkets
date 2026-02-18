// AI-Powered Analysis and Summary Generation
// Provides automated insights, anomaly detection, and natural language summaries

export class AIAnalyzer {
    constructor() {
        this.insights = [];
        this.anomalies = [];
    }

    /**
     * Generate AI-powered market summary
     * @param {Object} data - Market data
     * @returns {Object} - Summary with insights
     */
    generateMarketSummary(data) {
        const summary = {
            overview: this._generateOverview(data),
            keyInsights: this._extractKeyInsights(data),
            anomalies: this._detectAnomalies(data),
            recommendations: this._generateRecommendations(data),
            riskAssessment: this._assessRisk(data)
        };

        return summary;
    }

    /**
     * Generate natural language overview
     */
    _generateOverview(data) {
        const markets = data.markets || [];
        const resolved = markets.filter(m => m.resolved);
        const active = markets.filter(m => !m.resolved);
        
        const avgProb = markets.reduce((sum, m) => sum + (m.probability || 0), 0) / markets.length;
        const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);

        return {
            text: `Analysis of ${markets.length} prediction markets reveals ${active.length} active markets and ${resolved.length} resolved outcomes. ` +
                  `Average market probability stands at ${(avgProb * 100).toFixed(1)}% with total volume of $${(totalVolume / 1e6).toFixed(2)}M. ` +
                  `Market activity shows ${this._getTrendDescription(data)} trends across all categories.`,
            metrics: {
                totalMarkets: markets.length,
                activeMarkets: active.length,
                resolvedMarkets: resolved.length,
                avgProbability: avgProb,
                totalVolume: totalVolume
            }
        };
    }

    /**
     * Extract key insights using statistical analysis
     */
    _extractKeyInsights(data) {
        const insights = [];
        const markets = data.markets || [];

        // Calibration insight
        const calibrationError = this._calculateCalibrationError(markets);
        if (calibrationError < 0.05) {
            insights.push({
                type: 'positive',
                category: 'Calibration',
                message: `Markets demonstrate excellent calibration with ${(calibrationError * 100).toFixed(2)}% mean error`,
                confidence: 0.9
            });
        } else if (calibrationError > 0.15) {
            insights.push({
                type: 'warning',
                category: 'Calibration',
                message: `Significant calibration issues detected (${(calibrationError * 100).toFixed(2)}% error). Markets may be systematically biased.`,
                confidence: 0.85
            });
        }

        // Liquidity insight
        const liquidityGini = this._calculateGini(markets.map(m => m.volume || 0));
        if (liquidityGini > 0.8) {
            insights.push({
                type: 'warning',
                category: 'Liquidity',
                message: `High concentration of liquidity (Gini: ${liquidityGini.toFixed(3)}). Top markets dominate trading volume.`,
                confidence: 0.95
            });
        }

        // Efficiency insight
        const efficiencyScore = this._calculateEfficiencyScore(markets);
        insights.push({
            type: efficiencyScore > 0.7 ? 'positive' : 'neutral',
            category: 'Efficiency',
            message: `Market efficiency score: ${(efficiencyScore * 100).toFixed(1)}%. ${efficiencyScore > 0.7 ? 'Strong' : 'Moderate'} price discovery mechanisms.`,
            confidence: 0.8
        });

        // Volume trend
        const volumeTrend = this._analyzeVolumeTrend(markets);
        if (Math.abs(volumeTrend) > 0.1) {
            insights.push({
                type: volumeTrend > 0 ? 'positive' : 'warning',
                category: 'Activity',
                message: `Trading volume ${volumeTrend > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(volumeTrend * 100).toFixed(1)}% over recent period.`,
                confidence: 0.75
            });
        }

        return insights;
    }

    /**
     * Detect statistical anomalies in market data
     */
    _detectAnomalies(data) {
        const anomalies = [];
        const markets = data.markets || [];

        // Detect price shocks (>20% movement in short period)
        markets.forEach(market => {
            if (market.priceHistory && market.priceHistory.length > 1) {
                const recentChanges = this._calculatePriceChanges(market.priceHistory);
                const shocks = recentChanges.filter(change => Math.abs(change) > 0.2);
                
                if (shocks.length > 0) {
                    anomalies.push({
                        type: 'price_shock',
                        market: market.title,
                        severity: 'high',
                        description: `Detected ${shocks.length} price shock(s) exceeding 20% movement`,
                        data: { maxShock: Math.max(...shocks.map(Math.abs)) }
                    });
                }
            }
        });

        // Detect arbitrage opportunities
        const arbitrageOpps = this._detectArbitrageOpportunities(markets);
        arbitrageOpps.forEach(opp => {
            anomalies.push({
                type: 'arbitrage',
                markets: opp.markets,
                severity: 'medium',
                description: `Potential arbitrage: ${opp.description}`,
                data: { profit: opp.expectedProfit }
            });
        });

        // Detect unusual volume patterns
        markets.forEach(market => {
            const zScore = this._calculateVolumeZScore(market, markets);
            if (Math.abs(zScore) > 3) {
                anomalies.push({
                    type: 'volume_anomaly',
                    market: market.title,
                    severity: 'medium',
                    description: `Unusual ${zScore > 0 ? 'high' : 'low'} trading volume (${Math.abs(zScore).toFixed(1)}σ from mean)`,
                    data: { zScore }
                });
            }
        });

        return anomalies;
    }

    /**
     * Generate trading/analysis recommendations
     */
    _generateRecommendations(data) {
        const recommendations = [];
        const markets = data.markets || [];

        // Identify mispriced markets
        const mispriced = markets.filter(m => {
            if (!m.resolved || !m.finalProbability) return false;
            const error = Math.abs(m.finalProbability - (m.outcome ? 1 : 0));
            return error > 0.3;
        });

        if (mispriced.length > 0) {
            recommendations.push({
                priority: 'high',
                category: 'Research',
                action: `Investigate ${mispriced.length} markets with significant calibration errors`,
                rationale: 'These markets show systematic mispricing and may reveal market inefficiencies'
            });
        }

        // Identify high-conviction opportunities
        const highConviction = markets.filter(m => 
            !m.resolved && (m.probability < 0.1 || m.probability > 0.9) && m.volume > 10000
        );

        if (highConviction.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'Monitoring',
                action: `Monitor ${highConviction.length} high-conviction markets`,
                rationale: 'Extreme probabilities with high volume indicate strong market consensus'
            });
        }

        // Identify emerging trends
        const emergingCategories = this._identifyEmergingCategories(markets);
        if (emergingCategories.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'Opportunity',
                action: `Explore emerging categories: ${emergingCategories.join(', ')}`,
                rationale: 'These categories show increasing activity and may offer early positioning advantages'
            });
        }

        return recommendations;
    }

    /**
     * Assess overall market risk
     */
    _assessRisk(data) {
        const markets = data.markets || [];
        
        // Calculate various risk metrics
        const volatility = this._calculateAverageVolatility(markets);
        const concentration = this._calculateGini(markets.map(m => m.volume || 0));
        const calibrationError = this._calculateCalibrationError(markets);
        
        // Composite risk score (0-1, higher is riskier)
        const riskScore = (volatility * 0.4 + concentration * 0.3 + calibrationError * 0.3);
        
        let level, description;
        if (riskScore < 0.3) {
            level = 'low';
            description = 'Markets show stable, well-calibrated behavior with balanced participation';
        } else if (riskScore < 0.6) {
            level = 'moderate';
            description = 'Some volatility and concentration observed. Normal market conditions';
        } else {
            level = 'high';
            description = 'Elevated risk from high volatility, concentration, or calibration issues';
        }

        return {
            level,
            score: riskScore,
            description,
            components: {
                volatility: { value: volatility, weight: 0.4 },
                concentration: { value: concentration, weight: 0.3 },
                calibration: { value: calibrationError, weight: 0.3 }
            }
        };
    }

    // Helper methods for calculations

    _getTrendDescription(data) {
        const markets = data.markets || [];
        const recentActivity = markets.filter(m => {
            const age = Date.now() - new Date(m.createdAt || Date.now()).getTime();
            return age < 7 * 24 * 60 * 60 * 1000; // Last 7 days
        }).length;
        
        const activityRate = recentActivity / markets.length;
        if (activityRate > 0.3) return 'bullish';
        if (activityRate < 0.1) return 'bearish';
        return 'stable';
    }

    _calculateCalibrationError(markets) {
        const resolved = markets.filter(m => m.resolved && m.finalProbability !== undefined);
        if (resolved.length === 0) return 0;

        const errors = resolved.map(m => 
            Math.abs(m.finalProbability - (m.outcome ? 1 : 0))
        );
        return errors.reduce((sum, e) => sum + e, 0) / errors.length;
    }

    _calculateGini(values) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const n = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);
        
        if (sum === 0) return 0;
        
        let gini = 0;
        for (let i = 0; i < n; i++) {
            gini += (2 * (i + 1) - n - 1) * sorted[i];
        }
        
        return gini / (n * sum);
    }

    _calculateEfficiencyScore(markets) {
        // Simple efficiency metric based on volume and price stability
        const scored = markets.filter(m => m.volume && m.priceHistory);
        if (scored.length === 0) return 0.5;

        const scores = scored.map(m => {
            const volumeScore = Math.min(m.volume / 100000, 1);
            const stabilityScore = 1 - this._calculateVolatility(m.priceHistory);
            return (volumeScore + stabilityScore) / 2;
        });

        return scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }

    _analyzeVolumeTrend(markets) {
        // Compare recent vs older volume
        const now = Date.now();
        const recentCutoff = now - 7 * 24 * 60 * 60 * 1000;
        
        const recent = markets.filter(m => new Date(m.createdAt || now).getTime() > recentCutoff);
        const older = markets.filter(m => new Date(m.createdAt || now).getTime() <= recentCutoff);
        
        if (older.length === 0) return 0;
        
        const recentAvg = recent.reduce((sum, m) => sum + (m.volume || 0), 0) / Math.max(recent.length, 1);
        const olderAvg = older.reduce((sum, m) => sum + (m.volume || 0), 0) / older.length;
        
        return (recentAvg - olderAvg) / olderAvg;
    }

    _calculatePriceChanges(priceHistory) {
        const changes = [];
        for (let i = 1; i < priceHistory.length; i++) {
            const change = priceHistory[i].price - priceHistory[i - 1].price;
            changes.push(change);
        }
        return changes;
    }

    _detectArbitrageOpportunities(markets) {
        const opportunities = [];
        
        // Look for complementary markets (A + notA should = 1)
        for (let i = 0; i < markets.length; i++) {
            for (let j = i + 1; j < markets.length; j++) {
                const m1 = markets[i];
                const m2 = markets[j];
                
                // Check if they're complementary based on title similarity
                if (this._areComplementary(m1, m2)) {
                    const sum = (m1.probability || 0.5) + (m2.probability || 0.5);
                    if (Math.abs(sum - 1) > 0.05) { // More than 5% deviation
                        opportunities.push({
                            markets: [m1.title, m2.title],
                            description: `Probability sum is ${sum.toFixed(3)} (should be 1.0)`,
                            expectedProfit: Math.abs(sum - 1)
                        });
                    }
                }
            }
        }
        
        return opportunities;
    }

    _areComplementary(m1, m2) {
        // Simple heuristic: check if titles are very similar
        const title1 = m1.title.toLowerCase();
        const title2 = m2.title.toLowerCase();
        
        // Look for yes/no pairs
        if ((title1.includes('yes') && title2.includes('no')) ||
            (title1.includes('will') && title2.includes('will not'))) {
            return true;
        }
        
        return false;
    }

    _calculateVolumeZScore(market, allMarkets) {
        const volumes = allMarkets.map(m => m.volume || 0);
        const mean = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        const variance = volumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / volumes.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev === 0) return 0;
        return ((market.volume || 0) - mean) / stdDev;
    }

    _identifyEmergingCategories(markets) {
        const categoryCounts = {};
        const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // Last 30 days
        
        markets.forEach(m => {
            if (new Date(m.createdAt || Date.now()).getTime() > recentCutoff) {
                const cat = m.category || 'other';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            }
        });
        
        // Find categories with >10 new markets
        return Object.entries(categoryCounts)
            .filter(([_, count]) => count > 10)
            .map(([cat, _]) => cat);
    }

    _calculateAverageVolatility(markets) {
        const withHistory = markets.filter(m => m.priceHistory && m.priceHistory.length > 1);
        if (withHistory.length === 0) return 0;
        
        const volatilities = withHistory.map(m => this._calculateVolatility(m.priceHistory));
        return volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
    }

    _calculateVolatility(priceHistory) {
        if (priceHistory.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < priceHistory.length; i++) {
            const ret = Math.log(priceHistory[i].price / priceHistory[i - 1].price);
            returns.push(ret);
        }
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }
}

export const aiAnalyzer = new AIAnalyzer();
