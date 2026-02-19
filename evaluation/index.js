/**
 * Evaluation Orchestrator
 * High-level controller for end-to-end model evaluation:
 * datasets → train/test split → evaluation → metrics → artifacts
 */

import { ModelEvaluator, createEvaluator } from './modelEvaluator.js';
import { DatasetBuilder, createDatasetBuilder } from './datasetBuilder.js';
import { BacktestEngine, createBacktestEngine } from './backtestEngine.js';

export class EvaluationOrchestrator {
    constructor(config = {}) {
        this.config = {
            evaluationScenario: config.evaluationScenario || 'default',
            datasetScenario: config.datasetScenario || 'default',
            backtestScenario: config.backtestScenario || 'default',
            ...config
        };
        
        this.evaluator = createEvaluator(this.config.evaluationScenario);
        this.datasetBuilder = createDatasetBuilder(this.config.datasetScenario);
        this.backtestEngine = createBacktestEngine(this.config.backtestScenario);
        
        this.executionLog = [];
        this.finalArtifacts = null;
    }
    
    /**
     * Run complete evaluation pipeline
     */
    async runEvaluationPipeline(rawRecords, evaluationName = 'Full Pipeline') {
        try {
            this._log(`Starting evaluation pipeline: ${evaluationName}`);
            
            // Step 1: Build deterministic dataset
            this._log('Step 1: Building deterministic dataset');
            const datasetResult = this.datasetBuilder.buildDataset(rawRecords);
            if (!datasetResult.success) {
                throw new Error(`Dataset build failed: ${datasetResult.error}`);
            }
            this._log(`✓ Dataset built (v${datasetResult.version}, ${datasetResult.recordCount} records)`);
            
            // Step 2: Validate dataset
            this._log('Step 2: Validating dataset integrity');
            const validation = this.datasetBuilder.validateDataset(datasetResult.version);
            if (!validation.valid) {
                this._log(`⚠ Validation issues: ${validation.errors.join('; ')}`);
            }
            validation.warnings.forEach(w => this._log(`⚠ ${w}`));
            this._log(`✓ Dataset validation complete`);
            
            // Step 3: Extract features
            this._log('Step 3: Extracting features');
            const featuresResult = this.datasetBuilder.extractFeatures(datasetResult.datasetId);
            if (!featuresResult.success) {
                throw new Error(`Feature extraction failed: ${featuresResult.error}`);
            }
            const { predictions, outcomes } = featuresResult;
            this._log(`✓ Features extracted (${predictions.length} prediction-outcome pairs)`);
            
            // Step 4: Train/validation/test split
            this._log('Step 4: Partitioning into train/validation/test sets');
            const dataset = this.datasetBuilder.getDataset(datasetResult.version);
            const { train, validation: valSet, test } = this.evaluator.partitionDataset(dataset.records);
            this._log(`✓ Split complete: train=${train.length}, val=${valSet.length}, test=${test.length}`);
            
            // Step 5: Evaluate on train set
            this._log('Step 5: Evaluating on train set');
            const trainPreds = train.map(r => r.probability).filter(p => !isNaN(p));
            const trainOutcomes = train.map(r => r.outcome ? 1 : 0);
            const trainMetrics = this.evaluator.evaluatePredictions(trainPreds, trainOutcomes);
            this.evaluator.metrics.train = trainMetrics;
            this._log(`✓ Train metrics: Brier=${trainMetrics.brierScore?.toFixed(4)}, LogScore=${trainMetrics.logScore?.toFixed(4)}`);
            
            // Step 6: Evaluate on validation set
            this._log('Step 6: Evaluating on validation set');
            const valPreds = valSet.map(r => r.probability).filter(p => !isNaN(p));
            const valOutcomes = valSet.map(r => r.outcome ? 1 : 0);
            const valMetrics = this.evaluator.evaluatePredictions(valPreds, valOutcomes);
            this.evaluator.metrics.validation = valMetrics;
            this._log(`✓ Validation metrics: Brier=${valMetrics.brierScore?.toFixed(4)}, LogScore=${valMetrics.logScore?.toFixed(4)}`);
            
            // Step 7: Evaluate on test set
            this._log('Step 7: Evaluating on test set');
            const testPreds = test.map(r => r.probability).filter(p => !isNaN(p));
            const testOutcomes = test.map(r => r.outcome ? 1 : 0);
            const testMetrics = this.evaluator.evaluatePredictions(testPreds, testOutcomes);
            this.evaluator.metrics.test = testMetrics;
            this._log(`✓ Test metrics: Brier=${testMetrics.brierScore?.toFixed(4)}, LogScore=${testMetrics.logScore?.toFixed(4)}`);
            
            // Step 8: Calibration analysis
            this._log('Step 8: Computing calibration analysis');
            const calibration = this.evaluator.calibrationAnalysis(testPreds, testOutcomes);
            this._log(`✓ Calibration ECE: ${calibration.ece?.toFixed(4)}`);
            
            // Step 9: K-fold cross-validation
            this._log('Step 9: Performing k-fold cross-validation');
            const kfoldResult = this.evaluator.kfoldCrossValidation(dataset.records, (train, val) => {
                const trainP = train.map(r => r.probability).filter(p => !isNaN(p));
                const trainO = train.map(r => r.outcome ? 1 : 0);
                const valP = val.map(r => r.probability).filter(p => !isNaN(p));
                const valO = val.map(r => r.outcome ? 1 : 0);
                return {
                    train: this.evaluator.evaluatePredictions(trainP, trainO),
                    validation: this.evaluator.evaluatePredictions(valP, valO)
                };
            });
            this._log(`✓ K-fold complete: ${kfoldResult.folds.length} folds, avg test Brier=${kfoldResult.avgMetrics.validation?.brierScore?.toFixed(4) || 'N/A'}`);
            
            // Step 10: Backtest on historical windows
            this._log('Step 10: Running rolling window backtest');
            const backtestResult = this.backtestEngine.runRollingWindowBacktest(dataset.records, null);
            if (backtestResult.success) {
                this._log(`✓ Backtest complete: ${backtestResult.windowCount} windows`);
            } else {
                this._log(`⚠ Backtest skipped: ${backtestResult.error}`);
            }
            
            // Step 11: Accuracy by confidence
            this._log('Step 11: Computing accuracy by confidence bucket');
            const accuracyResult = this.backtestEngine.accuracyByConfidence(dataset.records);
            if (accuracyResult.success) {
                this._log(`✓ Accuracy analysis: ${accuracyResult.buckets.length} confidence buckets`);
            }
            
            // Step 12: Generate evaluation report
            this._log('Step 12: Generating comprehensive evaluation report');
            const report = this.evaluator.generateReport(evaluationName);
            this._log(`✓ Report generated: ${report.reportId}`);
            
            // Step 13: Compile final artifacts
            this._log('Step 13: Compiling artifacts bundle');
            this.finalArtifacts = {
                reportId: report.reportId,
                timestamp: new Date().toISOString(),
                datasetVersion: datasetResult.version,
                pipeline: {
                    report,
                    dataset: datasetResult,
                    validationMetrics: valMetrics,
                    kfoldResult,
                    backtestResult,
                    accuracyByConfidence: accuracyResult
                },
                exportFormats: {
                    json: () => report,
                    markdown: () => this.evaluator.exportRemarkdown(),
                    summary: () => this._generateSummary(report)
                }
            };
            
            this._log('✓ Evaluation pipeline complete');
            
            return {
                success: true,
                artifacts: this.finalArtifacts,
                executionLog: this.executionLog,
                duration: `${this.executionLog.length} steps`
            };
        } catch (error) {
            this._log(`✗ Pipeline failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                executionLog: this.executionLog
            };
        }
    }
    
    /**
     * Lightweight evaluation for quick feedback
     */
    quickEvaluate(records) {
        try {
            this._log('Quickstart evaluation');
            
            const resolved = records.filter(r => r.resolved);
            if (resolved.length < 10) {
                throw new Error('Insufficient resolved records');
            }
            
            const predictions = resolved.map(r => r.probability || 0.5);
            const outcomes = resolved.map(r => r.outcome ? 1 : 0);
            
            const metrics = this.evaluator.evaluatePredictions(predictions, outcomes);
            const calibration = this.evaluator.calibrationAnalysis(predictions, outcomes);
            
            return {
                success: true,
                metrics,
                calibration,
                sampleSize: resolved.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get execution log as formatted text
     */
    getExecutionLog() {
        return this.executionLog.join('\n');
    }
    
    /**
     * Export final artifacts
     */
    exportArtifacts(format = 'json') {
        if (!this.finalArtifacts) {
            throw new Error('No artifacts generated yet');
        }
        
        switch (format) {
            case 'json':
                return JSON.stringify(this.finalArtifacts.exportFormats.json(), null, 2);
            case 'markdown':
                return this.finalArtifacts.exportFormats.markdown();
            case 'summary':
                return this.finalArtifacts.exportFormats.summary();
            default:
                throw new Error(`Unknown export format: ${format}`);
        }
    }
    
    // ===== Utility Functions =====
    
    _log(message) {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${message}`;
        this.executionLog.push(entry);
        console.log(entry); // Also log to console for real-time feedback
    }
    
    _generateSummary(report) {
        const summary = {
            name: report.name,
            timestamp: report.timestamp,
            dataset: {
                version: report.dataset.datasetVersion,
                records: report.dataset.totalRecords,
                splits: report.dataset.splits
            },
            keyMetrics: {
                testBrier: report.testMetrics.brierScore?.toFixed(4),
                testLogScore: report.testMetrics.logScore?.toFixed(4),
                testCalibrationError: report.testMetrics.ece?.toFixed(4),
                testSharpness: report.testMetrics.sphericalScore?.toFixed(4)
            },
            readiness: report.summary.modelReadiness,
            notes: `Evaluation used ${this.config.evaluationScenario} scenario with ${this.evaluator.kfolds}-fold cross-validation. ` +
                   `All metrics are computed on deterministic dataset splits with seed=${this.evaluator.seed} for perfect reproducibility.`
        };
        
        return summary;
    }
}

/**
 * Convenience function for running full evaluation
 */
export async function runFullEvaluation(records, configOverrides = {}) {
    const orchestrator = new EvaluationOrchestrator(configOverrides);
    return orchestrator.runEvaluationPipeline(records, configOverrides.name || 'Prediction Market Evaluation');
}
