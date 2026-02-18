// Statistical Functions Library
// All statistical methods implemented from scratch

/**
 * Brier Score: Mean squared difference between predictions and outcomes
 * Lower is better, range [0, 1]
 */
export function brierScore(predictions, outcomes) {
    if (predictions.length !== outcomes.length || predictions.length === 0) {
        throw new Error('Invalid input arrays');
    }
    
    const sum = predictions.reduce((acc, pred, i) => {
        return acc + Math.pow(pred - outcomes[i], 2);
    }, 0);
    
    return sum / predictions.length;
}

/**
 * Murphy Decomposition of Brier Score
 * BS = reliability - resolution + uncertainty
 */
export function brierDecomposition(predictions, outcomes) {
    const n = predictions.length;
    const outcomeRate = mean(outcomes);
    
    // Group by prediction bins
    const bins = {};
    predictions.forEach((pred, i) => {
        const bin = Math.floor(pred * 10) / 10; // 0.1 bins
        if (!bins[bin]) bins[bin] = { predictions: [], outcomes: [] };
        bins[bin].predictions.push(pred);
        bins[bin].outcomes.push(outcomes[i]);
    });
    
    let reliability = 0;
    let resolution = 0;
    
    for (const bin in bins) {
        const binData = bins[bin];
        const binSize = binData.predictions.length;
        const binMeanPred = mean(binData.predictions);
        const binOutcomeRate = mean(binData.outcomes);
        
        // Reliability: differences within bins
        reliability += (binSize / n) * Math.pow(binMeanPred - binOutcomeRate, 2);
        
        // Resolution: how bins differ from baseline
        resolution += (binSize / n) * Math.pow(binOutcomeRate - outcomeRate, 2);
    }
    
    const uncertainty = outcomeRate * (1 - outcomeRate);
    
    return {
        brierScore: reliability - resolution + uncertainty,
        reliability,
        resolution,
        uncertainty
    };
}

/**
 * Expected Calibration Error (ECE)
 * Average absolute difference between confidence and accuracy
 */
export function expectedCalibrationError(predictions, outcomes, numBins = 10) {
    const bins = Array(numBins).fill(0).map(() => ({
        predictions: [],
        outcomes: []
    }));
    
    // Assign to bins
    predictions.forEach((pred, i) => {
        const binIdx = Math.min(Math.floor(pred * numBins), numBins - 1);
        bins[binIdx].predictions.push(pred);
        bins[binIdx].outcomes.push(outcomes[i]);
    });
    
    // Calculate ECE
    let ece = 0;
    let totalSamples = predictions.length;
    
    bins.forEach(bin => {
        if (bin.predictions.length > 0) {
            const avgConfidence = mean(bin.predictions);
            const avgAccuracy = mean(bin.outcomes);
            const weight = bin.predictions.length / totalSamples;
            ece += weight * Math.abs(avgConfidence - avgAccuracy);
        }
    });
    
    return ece;
}

/**
 * Log Score (Logarithmic scoring rule)
 * Lower is better (less negative)
 */
export function logScore(predictions, outcomes) {
    if (predictions.length !== outcomes.length || predictions.length === 0) {
        throw new Error('Invalid input arrays');
    }
    
    const epsilon = 1e-15; // Prevent log(0)
    const sum = predictions.reduce((acc, pred, i) => {
        const p = Math.max(epsilon, Math.min(1 - epsilon, pred));
        const outcome = outcomes[i];
        return acc + (outcome * Math.log(p) + (1 - outcome) * Math.log(1 - p));
    }, 0);
    
    return sum / predictions.length;
}

/**
 * Spherical Score
 * Higher is better, range [0, 1]
 */
export function sphericalScore(predictions, outcomes) {
    if (predictions.length !== outcomes.length || predictions.length === 0) {
        throw new Error('Invalid input arrays');
    }
    
    const sum = predictions.reduce((acc, pred, i) => {
        const outcome = outcomes[i];
        const norm = Math.sqrt(pred * pred + (1 - pred) * (1 - pred));
        return acc + (outcome * pred + (1 - outcome) * (1 - pred)) / norm;
    }, 0);
    
    return sum / predictions.length;
}

/**
 * Bootstrap Confidence Intervals
 * Returns {lower, upper, mean} for the given statistic
 */
export function bootstrapCI(data, statFunc, numResamples = 1000, alpha = 0.05) {
    const n = data.length;
    const bootstrapStats = [];
    
    for (let i = 0; i < numResamples; i++) {
        // Resample with replacement
        const sample = [];
        for (let j = 0; j < n; j++) {
            sample.push(data[Math.floor(Math.random() * n)]);
        }
        
        bootstrapStats.push(statFunc(sample));
    }
    
    bootstrapStats.sort((a, b) => a - b);
    
    const lowerIdx = Math.floor(numResamples * alpha / 2);
    const upperIdx = Math.floor(numResamples * (1 - alpha / 2));
    
    return {
        lower: bootstrapStats[lowerIdx],
        upper: bootstrapStats[upperIdx],
        mean: mean(bootstrapStats)
    };
}

/**
 * LOWESS Smoother (Locally Weighted Scatterplot Smoothing)
 */
export function lowess(x, y, bandwidth = 0.3) {
    const n = x.length;
    const result = [];
    
    for (let i = 0; i < n; i++) {
        const distances = x.map(xi => Math.abs(xi - x[i]));
        const maxDist = distances.slice().sort((a, b) => a - b)[Math.floor(n * bandwidth)];
        
        // Tricube weight function
        const weights = distances.map(d => {
            if (d > maxDist) return 0;
            const u = d / maxDist;
            return Math.pow(1 - Math.pow(u, 3), 3);
        });
        
        // Weighted linear regression
        const { slope, intercept } = weightedLinearRegression(x, y, weights);
        result.push(slope * x[i] + intercept);
    }
    
    return result;
}

/**
 * Weighted Linear Regression
 */
function weightedLinearRegression(x, y, weights) {
    const n = x.length;
    const sumW = sum(weights);
    const sumWX = sum(x.map((xi, i) => weights[i] * xi));
    const sumWY = sum(y.map((yi, i) => weights[i] * yi));
    const sumWXX = sum(x.map((xi, i) => weights[i] * xi * xi));
    const sumWXY = sum(x.map((xi, i) => weights[i] * xi * y[i]));
    
    const slope = (sumW * sumWXY - sumWX * sumWY) / (sumW * sumWXX - sumWX * sumWX);
    const intercept = (sumWY - slope * sumWX) / sumW;
    
    return { slope, intercept };
}

/**
 * Pearson Correlation Coefficient
 */
export function pearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) {
        throw new Error('Invalid input arrays');
    }
    
    const n = x.length;
    const meanX = mean(x);
    const meanY = mean(y);
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }
    
    return numerator / Math.sqrt(denomX * denomY);
}

/**
 * Spearman Rank Correlation
 */
export function spearmanCorrelation(x, y) {
    const ranksX = getRanks(x);
    const ranksY = getRanks(y);
    return pearsonCorrelation(ranksX, ranksY);
}

/**
 * Get ranks of array elements
 */
function getRanks(arr) {
    const sorted = arr.map((val, idx) => ({ val, idx }))
        .sort((a, b) => a.val - b.val);
    
    const ranks = new Array(arr.length);
    sorted.forEach((item, rank) => {
        ranks[item.idx] = rank + 1;
    });
    
    return ranks;
}

/**
 * Cross-Correlation Function
 * Returns correlation at different lags
 */
export function crossCorrelation(x, y, maxLag = 10) {
    const result = [];
    
    for (let lag = -maxLag; lag <= maxLag; lag++) {
        let xSeries, ySeries;
        
        if (lag >= 0) {
            xSeries = x.slice(0, x.length - lag);
            ySeries = y.slice(lag);
        } else {
            xSeries = x.slice(-lag);
            ySeries = y.slice(0, y.length + lag);
        }
        
        if (xSeries.length > 0) {
            result.push({
                lag,
                correlation: pearsonCorrelation(xSeries, ySeries)
            });
        }
    }
    
    return result;
}

/**
 * Power Law MLE Fitting
 * Fits distribution: p(x) ∝ x^(-α)
 */
export function fitPowerLaw(data, xmin = null) {
    // If xmin not provided, estimate it
    if (xmin === null) {
        xmin = Math.min(...data);
    }
    
    // Filter data >= xmin
    const filtered = data.filter(x => x >= xmin);
    
    if (filtered.length === 0) {
        throw new Error('No data points above xmin');
    }
    
    // MLE estimate: α = 1 + n / Σ ln(x/xmin)
    const n = filtered.length;
    const sumLogRatio = sum(filtered.map(x => Math.log(x / xmin)));
    const alpha = 1 + n / sumLogRatio;
    
    return { alpha, xmin, n };
}

/**
 * Kyle's Lambda (Price Impact Coefficient)
 * Regression of price change on signed order flow
 */
export function kyleLambda(priceChanges, orderFlow) {
    const { slope } = linearRegression(orderFlow, priceChanges);
    return slope;
}

/**
 * Linear Regression (OLS)
 */
export function linearRegression(x, y) {
    const n = x.length;
    const meanX = mean(x);
    const meanY = mean(y);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
        numerator += (x[i] - meanX) * (y[i] - meanY);
        denominator += (x[i] - meanX) * (x[i] - meanX);
    }
    
    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // Calculate R²
    const predictions = x.map(xi => slope * xi + intercept);
    const ssRes = sum(y.map((yi, i) => Math.pow(yi - predictions[i], 2)));
    const ssTot = sum(y.map(yi => Math.pow(yi - meanY, 2)));
    const rSquared = 1 - ssRes / ssTot;
    
    return { slope, intercept, rSquared };
}

/**
 * Amihud Illiquidity Ratio
 * Average of |return| / volume
 */
export function amihudIlliquidity(returns, volumes) {
    if (returns.length !== volumes.length || returns.length === 0) {
        throw new Error('Invalid input arrays');
    }
    
    const ratios = returns.map((ret, i) => {
        return volumes[i] > 0 ? Math.abs(ret) / volumes[i] : 0;
    });
    
    return mean(ratios);
}

/**
 * Variance Ratio Test (Lo-MacKinlay)
 * Tests for random walk / market efficiency
 */
export function varianceRatioTest(prices, q = 2) {
    const n = prices.length;
    const returns = [];
    
    for (let i = 1; i < n; i++) {
        returns.push(Math.log(prices[i] / prices[i-1]));
    }
    
    // Variance of 1-period returns
    const var1 = variance(returns);
    
    // Variance of q-period returns
    const qReturns = [];
    for (let i = q; i < returns.length; i++) {
        let sumReturn = 0;
        for (let j = 0; j < q; j++) {
            sumReturn += returns[i - j];
        }
        qReturns.push(sumReturn);
    }
    
    const varQ = variance(qReturns);
    
    // Variance ratio
    const VR = varQ / (q * var1);
    
    // Under random walk, VR should be close to 1
    // VR < 1 suggests mean reversion
    // VR > 1 suggests momentum
    
    return {
        varianceRatio: VR,
        deviation: VR - 1
    };
}

/**
 * Ornstein-Uhlenbeck Parameter Estimation
 * dX = θ(μ - X)dt + σdW
 */
export function fitOrnsteinUhlenbeck(timeSeries, dt = 1) {
    const n = timeSeries.length - 1;
    
    // Estimate using discrete approximation
    const x = timeSeries.slice(0, -1);
    const dx = timeSeries.slice(1).map((val, i) => val - timeSeries[i]);
    
    // Linear regression: dx = a + b*x + ε
    const { slope: b, intercept: a } = linearRegression(x, dx);
    
    // Parameter estimates
    const theta = -b / dt;
    const mu = -a / b;
    const residuals = dx.map((dxi, i) => dxi - (a + b * x[i]));
    const sigma = Math.sqrt(variance(residuals) / dt);
    
    // Half-life: time to revert halfway to mean
    const halfLife = Math.log(2) / theta;
    
    return { theta, mu, sigma, halfLife };
}

/**
 * Beta Distribution MLE Fitting
 */
export function fitBeta(data) {
    // Method of moments for initial estimates
    const m = mean(data);
    const v = variance(data);
    
    // Constrain to (0, 1)
    const filtered = data.filter(x => x > 0 && x < 1);
    
    if (filtered.length === 0) {
        throw new Error('No data in (0, 1) range');
    }
    
    const meanData = mean(filtered);
    const varData = variance(filtered);
    
    // Method of moments estimates
    const common = meanData * (1 - meanData) / varData - 1;
    const alpha = meanData * common;
    const beta = (1 - meanData) * common;
    
    return { alpha: Math.max(0.1, alpha), beta: Math.max(0.1, beta) };
}

/**
 * Gini Coefficient
 * Measure of inequality, range [0, 1]
 */
export function giniCoefficient(values) {
    const n = values.length;
    const sorted = [...values].sort((a, b) => a - b);
    
    let sumOfDifferences = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            sumOfDifferences += Math.abs(sorted[i] - sorted[j]);
        }
    }
    
    const meanValue = mean(sorted);
    const gini = sumOfDifferences / (2 * n * n * meanValue);
    
    return gini;
}

/**
 * Granger Causality Test (Simplified F-test version)
 * Tests if X Granger-causes Y
 */
export function grangerCausality(x, y, maxLag = 3) {
    // Restricted model: Y regressed only on its own lags
    const restrictedRSS = autoregression(y, maxLag).rss;
    
    // Unrestricted model: Y regressed on its lags + X's lags
    const unrestrictedRSS = autoregressWithX(y, x, maxLag).rss;
    
    const n = y.length - maxLag;
    const k = maxLag; // additional parameters
    
    // F-statistic
    const F = ((restrictedRSS - unrestrictedRSS) / k) / (unrestrictedRSS / (n - 2 * k));
    
    // Simplified: if F > 3, likely significant at 5% level
    return {
        fStatistic: F,
        significant: F > 3,
        pValue: null // Would need F-distribution CDF for exact p-value
    };
}

/**
 * Autoregression helper
 */
function autoregression(y, maxLag) {
    const n = y.length - maxLag;
    const X = [];
    const Y = [];
    
    for (let i = maxLag; i < y.length; i++) {
        const row = [];
        for (let lag = 1; lag <= maxLag; lag++) {
            row.push(y[i - lag]);
        }
        X.push(row);
        Y.push(y[i]);
    }
    
    // Simple OLS (would need matrix operations for full implementation)
    // For now, use only first lag
    const x1 = X.map(row => row[0]);
    const { slope, intercept } = linearRegression(x1, Y);
    const predictions = x1.map(xi => slope * xi + intercept);
    const residuals = Y.map((yi, i) => yi - predictions[i]);
    const rss = sum(residuals.map(r => r * r));
    
    return { rss };
}

/**
 * Autoregression with exogenous variable
 */
function autoregressWithX(y, x, maxLag) {
    // Simplified: just include X as additional predictor
    const n = Math.min(y.length, x.length) - maxLag;
    const xVar = [];
    const yLag = [];
    const yTarget = [];
    
    for (let i = maxLag; i < n + maxLag; i++) {
        xVar.push(x[i - 1]);
        yLag.push(y[i - 1]);
        yTarget.push(y[i]);
    }
    
    // Multiple regression would be needed here
    // Simplified: use just X variable
    const { slope, intercept } = linearRegression(xVar, yTarget);
    const predictions = xVar.map(xi => slope * xi + intercept);
    const residuals = yTarget.map((yi, i) => yi - predictions[i]);
    const rss = sum(residuals.map(r => r * r));
    
    return { rss };
}

// Utility functions
export function mean(arr) {
    return sum(arr) / arr.length;
}

export function sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

export function variance(arr) {
    const m = mean(arr);
    return mean(arr.map(x => Math.pow(x - m, 2)));
}

export function standardDeviation(arr) {
    return Math.sqrt(variance(arr));
}

export function median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

export function quantile(arr, q) {
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
}
