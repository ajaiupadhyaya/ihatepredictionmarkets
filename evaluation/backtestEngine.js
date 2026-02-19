/**
 * Backtesting Engine
 * Simulates historical prediction performance against resolved events,
 * measuring model accuracy and stability over different time windows.
 */

import * as stats from '../stats/index.js';

export class BacktestEngine {
    constructor(config = {}) {
        this.config = {
            windowSize: config.windowSize || 30, // days
            stepSize: config.stepSize || 7,      // days
            minEventsPerWindow: config.minEventsPerWindow || 10,
            ...config
        };
        
        this.backtests = [];
        this.performanceByWindow = [];
        this.drawdown = [];
    }
    
    /**
     * Run backtest over historical data with rolling windows
     */
    runRollingWindowBacktest(records, predictor) {
        if (!Array.isArray(records) || records.length === 0) {
            return { success: false, error: 'No records provided' };
        }
        
        // Sort by creation date
        const sorted = [...records].sort((a, b) => {
            return new Date(a.created).getTime() - new Date(b.created).getTime();
        });
        
        // Filter to resolved events only
        const resolved = sorted.filter(r => r.resolved);
        if (resolved.length < this.config.minEventsPerWindow) {
            return {
                success: false,
                error: `Insufficient resolved events (${resolved.length})`
            };
        }
        
        const windowMs = this.config.windowSize * 24 * 60 * 60 * 1000;
        const stepMs = this.config.stepSize * 24 * 60 * 60 * 1000;
        
        const startDate = new Date(resolved[0].created).getTime();
        const endDate = new Date(resolved[resolved.length - 1].created).getTime();
        
        const results = [];
        let currentDate = startDate;
        let windowNum = 0;
        
        while (currentDate + windowMs <= endDate) {
            const windowStart = currentDate;
            const windowEnd = currentDate + windowMs;
            
            // Get events in this window
            const windowEvents = resolved.filter(r => {
                const t = new Date(r.created).getTime();
                return t >= windowStart && t < windowEnd;
            });
            
            if (windowEvents.length >= this.config.minEventsPerWindow) {
                // Extract predictions and outcomes
                const predictions = windowEvents.map(r => r.probability || 0.5);
                const outcomes = windowEvents.map(r => r.outcome ? 1 : 0);
                
                // Calculate metrics
                const metrics = this._calculateWindowMetrics(predictions, outcomes);
                
                results.push({
                    windowNum: windowNum++,
                    windowStart: new Date(windowStart).toISOString(),
                    windowEnd: new Date(windowEnd).toISOString(),
                    eventCount: windowEvents.length,
                    metrics,
                    events: windowEvents
                });
            }
            
            currentDate += stepMs;
        }
        
        this.backtests = results;
        this.performanceByWindow = results.map(r => r.metrics);
        this._calculateDrawdown();
        
        return {
            success: true,
            windowCount: results.length,
            totalEvents: resolved.length,
            results,
            summary: this._summarizeBacktest(results)
        };
    }
    
    /**
     * Backtest against fixed train/test split
     */
    backtestSplit(trainRecords, testRecords, predictor) {
        if (!Array.isArray(testRecords) || testRecords.length === 0) {
            return { success: false, error: 'No test records' };
        }
        
        // Filter to resolved events
        const resolvedTest = testRecords.filter(r => r.resolved);
        if (resolvedTest.length === 0) {
            return { success: false, error: 'No resolved test events' };
        }
        
        // Extract predictions and outcomes
        const predictions = resolvedTest.map(r => r.probability || 0.5);
        const outcomes = resolvedTest.map(r => r.outcome ? 1 : 0);
        
        const metrics = this._calculateWindowMetrics(predictions, outcomes);
        
        return {
            success: true,
            testSetSize: resolvedTest.length,
            metrics,
            events: resolvedTest,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Calculate performance over time buckets
     */
    backtestByTimeInterval(records, intervalDays = 30) {
        const sorted = [...records].sort((a, b) => {
            return new Date(a.created).getTime() - new Date(b.created).getTime();
        });
        
        const resolved = sorted.filter(r => r.resolved);
        if (resolved.length === 0) {
            return { success: false, error: 'No resolved events' };
        }
        
        const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
        const startDate = new Date(resolved[0].created).getTime();
        const endDate = new Date(resolved[resolved.length - 1].created).getTime();
        
        const buckets = new Map();
        let bucketIndex = 0;
        let currentStart = startDate;
        
        while (currentStart < endDate) {
            const currentEnd = currentStart + intervalMs;
            const key = bucketIndex++;
            
            const bucketEvents = resolved.filter(r => {
                const t = new Date(r.created).getTime();
                return t >= currentStart && t < currentEnd;
            });
            
            if (bucketEvents.length > 0) {
                const predictions = bucketEvents.map(r => r.probability || 0.5);
                const outcomes = bucketEvents.map(r => r.outcome ? 1 : 0);
                
                buckets.set(key, {
                    interval: `${new Date(currentStart).toISOString().split('T')[0]} to ${new Date(currentEnd).toISOString().split('T')[0]}`,
                    eventCount: bucketEvents.length,
                    metrics: this._calculateWindowMetrics(predictions, outcomes)
                });
            }
            
            currentStart = currentEnd;
        }
        
        return {
            success: true,
            bucketCount: buckets.size,
            buckets: Array.from(buckets.values()),
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Calculate prediction accuracy by probability bucket
     */
    accuracyByConfidence(records, numBuckets = 10) {
        const resolved = records.filter(r => r.resolved);
        if (resolved.length === 0) {
            return { success: false, error: 'No resolved events' };
        }
        
        const buckets = Array(numBuckets).fill(0).map(() => ({
            predictions: [],
            outcomes: [],
            lowerBound: 0,
            upperBound: 0
        }));
        
        // Assign to buckets
        resolved.forEach(event => {
            const prob = event.probability || 0.5;
            const bucketIdx = Math.min(Math.floor(prob * numBuckets), numBuckets - 1);
            buckets[bucketIdx].predictions.push(prob);
            buckets[bucketIdx].outcomes.push(event.outcome ? 1 : 0);
        });
        
        // Calculate metrics per bucket
        const results = buckets
            .map((bucket, idx) => {
                if (bucket.predictions.length === 0) return null;
                
                const accuracy = stats.mean(bucket.outcomes);
                const predictions = stats.mean(bucket.predictions);
                const calibrationError = Math.abs(predictions - accuracy);
                
                return {
                    bucket: idx,
                    lowerBound: idx / numBuckets,
                    upperBound: (idx + 1) / numBuckets,
                    sampleCount: bucket.predictions.length,
                    predictedProbability: predictions,
                    actualAccuracy: accuracy,
                    calibrationError,
                    brier: stats.brierScore(bucket.predictions, bucket.outcomes)
                };
            })
            .filter(b => b !== null);
        
        return {
            success: true,
            buckets: results,
            totalEvents: resolved.length,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Simulate sequential prediction scenario
     */
    sequentialBacktest(records, predictor) {
        const resolved = [...records]
            .filter(r => r.resolved)
            .sort((a, b) => 
                new Date(a.created).getTime() - new Date(b.created).getTime()
            );
        
        if (resolved.length < 10) {
            return { success: false, error: 'Insufficient resolved events' };
        }
        
        const sequence = [];
        let cumulativeBrier = 0;
        let cumulativeLog = 0;
        
        for (let i = 10; i < resolved.length; i++) {
            const trainSet = resolved.slice(0, i);
            const testEvent = resolved[i];
            
            // In real scenario, would re-fit predictor here
            const prediction = testEvent.probability || 0.5;
            const outcome = testEvent.outcome ? 1 : 0;
            
            const brierScore = Math.pow(prediction - outcome, 2);
            const logScore = outcome * Math.log(prediction) + (1 - outcome) * Math.log(1 - prediction);
            
            cumulativeBrier += brierScore;
            cumulativeLog += logScore;
            
            sequence.push({
                step: i,
                eventId: testEvent.eventId,
                prediction,
                outcome,
                brierScore,
                logScore,
                cumulativeAvgBrier: cumulativeBrier / (i - 9),
                cumulativeAvgLog: cumulativeLog / (i - 9)
            });
        }
        
        return {
            success: true,
            stepCount: sequence.length,
            sequence,
            finalMetrics: {
                brierScore: cumulativeBrier / sequence.length,
                logScore: cumulativeLog / sequence.length
            },
            timestamp: new Date().toISOString()
        };
    }
    
    // ===== Utility Functions =====
    
    _calculateWindowMetrics(predictions, outcomes) {
        if (predictions.length !== outcomes.length || predictions.length === 0) {
            return {};
        }
        
        try {
            return {
                brierScore: stats.brierScore(predictions, outcomes),
                logScore: stats.logScore(predictions, outcomes),
                ece: stats.expectedCalibrationError(predictions, outcomes),
                sphericalScore: stats.sphericalScore(predictions, outcomes),
                accuracy: stats.mean(outcomes),
                sampleSize: predictions.length
            };
        } catch (e) {
            return { error: e.message };
        }
    }
    
    _calculateDrawdown() {
        // Calculate Brier score drawdown (when performance degrades)
        if (this.performanceByWindow.length === 0) return;
        
        const brierScores = this.performanceByWindow
            .map(m => m.brierScore)
            .filter(b => !isNaN(b));
        
        let runningMin = brierScores[0];
        const drawdowns = [];
        
        brierScores.forEach((score, i) => {
            if (score < runningMin) {
                runningMin = score;
            }
            drawdowns.push({
                window: i,
                score,
                peakScore: runningMin,
                drawdown: score - runningMin // Lower is better, so positive drawdown is degradation
            });
        });
        
        this.drawdown = drawdowns;
    }
    
    _summarizeBacktest(results) {
        if (results.length === 0) {
            return { windows: 0 };
        }
        
        const metrics = results.map(r => r.metrics);
        const brierScores = metrics.map(m => m.brierScore).filter(b => !isNaN(b));
        const logScores = metrics.map(m => m.logScore).filter(l => !isNaN(l));
        const eces = metrics.map(m => m.ece).filter(e => !isNaN(e));
        
        return {
            windows: results.length,
            totalEvents: results.reduce((sum, r) => sum + r.eventCount, 0),
            eventsPerWindow: {
                min: Math.min(...results.map(r => r.eventCount)),
                max: Math.max(...results.map(r => r.eventCount)),
                avg: results.reduce((sum, r) => sum + r.eventCount, 0) / results.length
            },
            brierScore: {
                min: Math.min(...brierScores),
                max: Math.max(...brierScores),
                avg: brierScores.reduce((a, b) => a + b, 0) / brierScores.length
            },
            logScore: {
                min: Math.min(...logScores),
                max: Math.max(...logScores),
                avg: logScores.reduce((a, b) => a + b, 0) / logScores.length
            },
            ece: {
                min: Math.min(...eces),
                max: Math.max(...eces),
                avg: eces.reduce((a, b) => a + b, 0) / eces.length
            },
            timeRange: {
                start: results[0]?.windowStart,
                end: results[results.length - 1]?.windowEnd
            }
        };
    }
}

/**
 * Factory for common backtest scenarios
 */
export function createBacktestEngine(scenario = 'default') {
    const configs = {
        default: { windowSize: 30, stepSize: 7, minEventsPerWindow: 10 },
        shortTerm: { windowSize: 7, stepSize: 1, minEventsPerWindow: 5 },
        longTerm: { windowSize: 90, stepSize: 30, minEventsPerWindow: 50 }
    };
    
    const config = configs[scenario] || configs.default;
    return new BacktestEngine(config);
}
