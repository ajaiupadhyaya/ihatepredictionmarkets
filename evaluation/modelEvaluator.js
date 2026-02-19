/**
 * Model Evaluation Framework
 * Rigorous train/validation pipeline with reproducible metrics, dataset versioning,
 * and artifact generation for transparent analytical claims.
 *
 * Purpose: Ensure all "models are trained properly" claims are grounded in actual
 * model evaluation code with real dataset splits, cross-validation, and saved artifacts.
 */

import * as stats from '../stats/index.js';

export class ModelEvaluator {
    constructor(config = {}) {
        // Deterministic seeding for reproducible splits
        this.seed = config.seed || 42;
        this.random = this._seededRandom(this.seed);
        
        // Dataset configuration
        this.testSplitRatio = config.testSplitRatio || 0.2;
        this.valSplitRatio = config.valSplitRatio || 0.15;
        this.kfolds = config.kfolds || 5;
        
        // Dataset versioning
        this.datasetVersion = null;
        this.datasetHash = null;
        this.recordsProcessed = 0;
        
        // Metrics storage
        this.metrics = {
            train: {},
            validation: {},
            test: {}
        };
        
        this.artifacts = {
            splits: null,
            foldMetrics: [],
            calibrationCurve: null,
            performanceReport: null
        };
    }
    
    /**
     * Seeded random number generator for reproducible splits
     */
    _seededRandom(seed) {
        return function() {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
    }
    
    /**
     * Hash dataset to track versions and ensure reproducibility
     */
    _hashDataset(data) {
        let hash = 0;
        const json = JSON.stringify(data);
        for (let i = 0; i < json.length; i++) {
            const char = json.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    
    /**
     * Partition dataset into train/validation/test sets
     * Returns: { train, validation, test, indices }
     */
    partitionDataset(data, stratifyBy = null) {
        if (!data || data.length === 0) {
            throw new Error('Dataset is empty');
        }
        
        // Record dataset metadata
        this.recordsProcessed = data.length;
        this.datasetHash = this._hashDataset(data);
        this.datasetVersion = `v${Date.now()}_${this.datasetHash.slice(0, 8)}`;
        
        const n = data.length;
        const testSize = Math.floor(n * this.testSplitRatio);
        const valSize = Math.floor(n * this.valSplitRatio);
        const trainSize = n - testSize - valSize;
        
        // Shuffle indices with seeded randomness
        const indices = Array.from({ length: n }, (_, i) => i);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        // Split indices
        const trainIndices = indices.slice(0, trainSize);
        const valIndices = indices.slice(trainSize, trainSize + valSize);
        const testIndices = indices.slice(trainSize + valSize);
        
        // Create partitions
        const train = trainIndices.map(i => data[i]);
        const validation = valIndices.map(i => data[i]);
        const test = testIndices.map(i => data[i]);
        
        // Store split metadata
        this.artifacts.splits = {
            seed: this.seed,
            datasetVersion: this.datasetVersion,
            datasetHash: this.datasetHash,
            totalRecords: n,
            splits: {
                train: { size: trainSize, fraction: trainSize / n },
                validation: { size: valSize, fraction: valSize / n },
                test: { size: testSize, fraction: testSize / n }
            },
            indices: { trainIndices, valIndices, testIndices }
        };
        
        return { train, validation, test, indices: this.artifacts.splits.indices };
    }
    
    /**
     * K-fold cross-validation
     * Returns: { folds: [{ trainIndices, valIndices, metrics }], avgMetrics, stdMetrics }
     */
    kfoldCrossValidation(data, metricsFunction) {
        if (!data || data.length < this.kfolds) {
            throw new Error(`Dataset too small for ${this.kfolds}-fold CV`);
        }
        
        const n = data.length;
        const foldSize = Math.floor(n / this.kfolds);
        const folds = [];
        
        // Shuffle indices with seeded randomness
        const indices = Array.from({ length: n }, (_, i) => i);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        // Create k folds
        for (let k = 0; k < this.kfolds; k++) {
            const valStart = k * foldSize;
            const valEnd = (k === this.kfolds - 1) ? n : (k + 1) * foldSize;
            
            const valIndices = indices.slice(valStart, valEnd);
            const trainIndices = [
                ...indices.slice(0, valStart),
                ...indices.slice(valEnd)
            ];
            
            const trainData = trainIndices.map(i => data[i]);
            const valData = valIndices.map(i => data[i]);
            
            // Calculate metrics for this fold
            const foldMetrics = metricsFunction(trainData, valData);
            
            folds.push({
                fold: k + 1,
                trainSize: trainData.length,
                valSize: valData.length,
                trainIndices,
                valIndices,
                metrics: foldMetrics
            });
        }
        
        // Aggregate metrics across folds
        const metricKeys = Object.keys(folds[0].metrics || {});
        const avgMetrics = {};
        const stdMetrics = {};
        
        metricKeys.forEach(key => {
            const values = folds.map(f => f.metrics[key] || 0).filter(v => typeof v === 'number');
            if (values.length > 0) {
                avgMetrics[key] = stats.mean(values);
                stdMetrics[key] = stats.standardDeviation(values);
            }
        });
        
        this.artifacts.foldMetrics = folds;
        
        return { folds, avgMetrics, stdMetrics };
    }
    
    /**
     * Evaluate predictions using multi-metric suite
     * Returns: { brierScore, logScore, calibration, reliability, sharpness }
     */
    evaluatePredictions(predictions, outcomes) {
        if (predictions.length !== outcomes.length || predictions.length === 0) {
            return {
                brierScore: null,
                logScore: null,
                ece: null,
                sphericalScore: null,
                note: 'Insufficient data for evaluation'
            };
        }
        
        // Guard against invalid values
        const validPreds = predictions.filter(p => !isNaN(p) && p >= 0 && p <= 1);
        const validOutcomes = outcomes.slice(0, validPreds.length);
        
        if (validPreds.length < 2) {
            return {
                brierScore: null,
                logScore: null,
                ece: null,
                sphericalScore: null,
                note: 'Insufficient valid predictions'
            };
        }
        
        try {
            const brierScore = stats.brierScore(validPreds, validOutcomes);
            const logScore = stats.logScore(validPreds, validOutcomes);
            const ece = stats.expectedCalibrationError(validPreds, validOutcomes, 10);
            const sphericalScore = stats.sphericalScore(validPreds, validOutcomes);
            
            // Brier decomposition for deeper analysis
            const decomp = stats.brierDecomposition(validPreds, validOutcomes);
            
            return {
                brierScore,
                logScore,
                ece,
                sphericalScore,
                reliability: decomp.reliability,
                resolution: decomp.resolution,
                uncertainty: decomp.uncertainty,
                sampleSize: validPreds.length
            };
        } catch (e) {
            return {
                brierScore: null,
                logScore: null,
                ece: null,
                error: e.message
            };
        }
    }
    
    /**
     * Calibration analysis with binned accuracy
     * Returns: { bins, ece, overconfidence, underconfidence }
     */
    calibrationAnalysis(predictions, outcomes, numBins = 10) {
        if (predictions.length !== outcomes.length) {
            return { bins: [], ece: null, error: 'Mismatched arrays' };
        }
        
        const bins = Array(numBins).fill(0).map(() => ({
            lowerBound: 0,
            upperBound: 0,
            predictions: [],
            outcomes: [],
            confMean: 0,
            accMean: 0,
            size: 0
        }));
        
        // Assign predictions to bins
        predictions.forEach((pred, i) => {
            if (!isNaN(pred) && pred >= 0 && pred <= 1) {
                const binIdx = Math.min(Math.floor(pred * numBins), numBins - 1);
                bins[binIdx].predictions.push(pred);
                bins[binIdx].outcomes.push(outcomes[i]);
            }
        });
        
        // Calculate statistics per bin
        bins.forEach((bin, idx) => {
            bin.lowerBound = idx / numBins;
            bin.upperBound = (idx + 1) / numBins;
            
            if (bin.predictions.length > 0) {
                bin.confMean = stats.mean(bin.predictions);
                bin.accMean = stats.mean(bin.outcomes);
                bin.size = bin.predictions.length;
            }
        });
        
        // Calculate metrics
        const ece = stats.expectedCalibrationError(predictions, outcomes, numBins);
        const overconfident = bins.filter(b => b.confMean > b.accMean).length;
        const underconfident = bins.filter(b => b.confMean < b.accMean).length;
        
        this.artifacts.calibrationCurve = {
            bins: bins.filter(b => b.size > 0),
            ece,
            overconfidenceCount: overconfident,
            underconfidenceCount: underconfident,
            binCount: numBins
        };
        
        return this.artifacts.calibrationCurve;
    }
    
    /**
     * Generate comprehensive performance report
     * Returns: { reportId, timestamp, summary, detailed }
     */
    generateReport(name = 'Model Evaluation') {
        const timestamp = new Date().toISOString();
        const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        const report = {
            reportId,
            name,
            timestamp,
            dataset: this.artifacts.splits || {},
            trainMetrics: this.metrics.train,
            valMetrics: this.metrics.validation,
            testMetrics: this.metrics.test,
            calibration: this.artifacts.calibrationCurve,
            foldMetrics: this.artifacts.foldMetrics,
            version: '1.0',
            notes: 'All metrics computed on deterministic dataset splits with seeded randomness (seed=42) for reproducibility'
        };
        
        // Summary statistics
        report.summary = {
            testBrierScore: this.metrics.test.brierScore,
            testLogScore: this.metrics.test.logScore,
            testCalibrationError: this.metrics.test.ece,
            modelReadiness: this._assessModelReadiness(report)
        };
        
        this.artifacts.performanceReport = report;
        return report;
    }
    
    /**
     * Assess whether model is ready for deployment
     * Returns: { ready: boolean, issues: [], warnings: [] }
     */
    _assessModelReadiness(report) {
        const issues = [];
        const warnings = [];
        
        if (!report.testMetrics || !report.testMetrics.brierScore) {
            issues.push('No test metrics available');
        }
        
        if (report.testMetrics.brierScore > 0.5) {
            warnings.push('Brier score > 0.5 indicates poor calibration');
        }
        
        if (report.calibration && report.calibration.ece > 0.15) {
            warnings.push('ECE > 0.15 suggests model needs recalibration');
        }
        
        if (report.dataset && report.dataset.splits && report.dataset.splits.test.size < 100) {
            warnings.push('Test set < 100 samples; increase data for stability');
        }
        
        return {
            ready: issues.length === 0,
            issues,
            warnings
        };
    }
    
    /**
     * Export report as JSON artifact
     */
    exportReportJSON() {
        if (!this.artifacts.performanceReport) {
            throw new Error('No performance report generated yet');
        }
        return JSON.stringify(this.artifacts.performanceReport, null, 2);
    }
    
    /**
     * Export report as markdown for documentation
     */
    exportRemarkdown() {
        const report = this.artifacts.performanceReport;
        if (!report) throw new Error('No performance report generated yet');
        
        let md = `# Model Evaluation Report: ${report.name}\n\n`;
        md += `**Report ID:** \`${report.reportId}\`\n`;
        md += `**Generated:** ${report.timestamp}\n`;
        md += `**Version:** ${report.version}\n\n`;
        
        md += `## Dataset\n`;
        md += `- **Version:** ${report.dataset.datasetVersion || 'N/A'}\n`;
        md += `- **Total Records:** ${report.dataset.totalRecords || 'N/A'}\n`;
        md += `- **Train/Val/Test Split:** ${report.dataset.splits ? `${Math.round(report.dataset.splits.train.fraction*100)}% / ${Math.round(report.dataset.splits.validation.fraction*100)}% / ${Math.round(report.dataset.splits.test.fraction*100)}%` : 'N/A'}\n\n`;
        
        md += `## Performance Summary\n`;
        md += `| Metric | Train | Validation | Test |\n`;
        md += `|--------|-------|------------|------|\n`;
        md += `| **Brier Score** | ${report.trainMetrics.brierScore?.toFixed(4) || 'N/A'} | ${report.valMetrics.brierScore?.toFixed(4) || 'N/A'} | ${report.testMetrics.brierScore?.toFixed(4) || 'N/A'} |\n`;
        md += `| **Log Score** | ${report.trainMetrics.logScore?.toFixed(4) || 'N/A'} | ${report.valMetrics.logScore?.toFixed(4) || 'N/A'} | ${report.testMetrics.logScore?.toFixed(4) || 'N/A'} |\n`;
        md += `| **ECE** | ${report.trainMetrics.ece?.toFixed(4) || 'N/A'} | ${report.valMetrics.ece?.toFixed(4) || 'N/A'} | ${report.testMetrics.ece?.toFixed(4) || 'N/A'} |\n\n`;
        
        if (report.calibration) {
            md += `## Calibration Analysis\n`;
            md += `- **Expected Calibration Error:** ${report.calibration.ece?.toFixed(4) || 'N/A'}\n`;
            md += `- **Overconfident Bins:** ${report.calibration.overconfidenceCount}\n`;
            md += `- **Underconfident Bins:** ${report.calibration.underconfidenceCount}\n\n`;
        }
        
        md += `## Model Readiness\n`;
        md += `- **Ready for Deployment:** ${report.summary.modelReadiness.ready ? '✓ Yes' : '✗ No'}\n`;
        if (report.summary.modelReadiness.issues.length > 0) {
            md += `- **Issues:** ${report.summary.modelReadiness.issues.join('; ')}\n`;
        }
        if (report.summary.modelReadiness.warnings.length > 0) {
            md += `- **Warnings:** ${report.summary.modelReadiness.warnings.join('; ')}\n`;
        }
        
        md += `\n---\n*${report.notes}*\n`;
        
        return md;
    }
    
    /**
     * Get all artifacts as a bundle
     */
    getArtifactBundle() {
        return {
            splits: this.artifacts.splits,
            foldMetrics: this.artifacts.foldMetrics,
            calibration: this.artifacts.calibrationCurve,
            report: this.artifacts.performanceReport,
            timestamp: new Date().toISOString(),
            seed: this.seed
        };
    }
}

/**
 * Factory function for common evaluation scenarios
 */
export function createEvaluator(scenario = 'default') {
    const configs = {
        default: { seed: 42, kfolds: 5 },
        strict: { seed: 42, kfolds: 10, testSplitRatio: 0.25 },
        quick: { seed: 42, kfolds: 3, testSplitRatio: 0.15 }
    };
    
    const config = configs[scenario] || configs.default;
    return new ModelEvaluator(config);
}
