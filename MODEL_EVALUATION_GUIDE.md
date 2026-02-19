# Model Evaluation Framework Guide

## Overview

This document describes the rigorous, reproducible model evaluation pipeline that ensures all analytical claims about prediction-market performance are grounded in formal evaluation code with transparent methodology.

**Core Principle**: Every statement about "model accuracy," "prediction quality," or "calibration" must be **computed from reproducible code**, with dataset versions, train/test splits, and saved metrics artifacts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│          EvaluationOrchestrator (Main Controller)        │
│  Coordinates: data → train/test → metrics → artifacts   │
└──────────┬──────────┬──────────────────┬────────────────┘
           │          │                  │
           ▼          ▼                  ▼
     ┌──────────┐ ┌──────────┐     ┌──────────────┐
     │ Dataset  │ │  Model   │     │  Backtest    │
     │ Builder  │ │Evaluator │     │  Engine      │
     └──────────┘ └──────────┘     └──────────────┘
        │              │                   │
        └──────────────┼───────────────────┘
                       │
            ┌──────────▼──────────┐
            │   Metrics & Report   │
            │  (JSON/Markdown)     │
            └──────────────────────┘
```

### Four Core Classes

#### 1. **DatasetBuilder** (`evaluation/datasetBuilder.js`)
Constructs deterministic, versioned datasets for model training and evaluation.

**Key Methods**:
- `buildDataset(records)` — Validates, normalizes, and versions raw market data
- `extractFeatures(datasetId)` — Extracts predictions and outcomes for model evaluation
- `computeAdvancedFeatures(datasetId)` — Adds temporal decay, extremity, consensus features
- `stratifiedSample(datasetId, fraction)` — Stratified sampling by platform/category
- `timeSeriesSplit(datasetId, trainFraction)` — Temporal split for TSCV
- `validateDataset(versionOrId)` — Integrity checks, resolution rate, age freshness
- `exportDataset(versionOrId)` — JSON export with full reproducibility metadata

**Dataset Versioning**:
```javascript
{
  datasetId: "dataset_1704067200000_a1b2c3d4",
  version: "ds_1704067200000_a1b2c3d4",
  recordCount: 847,
  timestamp: "2024-01-01T12:00:00Z",
  hash: "a1b2c3d4...",  // Deterministic content hash
  platforms: ["polymarket", "kalshi"],
  dateRange: { start: "2023-10-01T...", end: "2023-12-31T..." },
  resolutionRate: 0.89
}
```

#### 2. **ModelEvaluator** (`evaluation/modelEvaluator.js`)
Implements reproducible train/validation/test evaluation with formal metric computation.

**Key Methods**:
- `partitionDataset(data)` — Deterministic (seeded) train/validation/test split
- `evaluatePredictions(predictions, outcomes)` — Multi-metric scoring:
  - Brier Score (calibration)
  - Log Score (information quality)
  - Expected Calibration Error (reliability)
  - Spherical Score (sharpness)
  - Brier Decomposition (reliability - resolution + uncertainty)
- `calibrationAnalysis(predictions, outcomes)` — Binned accuracy vs confidence
- `kfoldCrossValidation(data, metricsFunc)` — 5-fold (configurable) CV with averaged metrics
- `generateReport(name)` — Comprehensive evaluation report with readiness assessment
- `exportRemarkdown()` — Markdown report for documentation

**Seeding**: All dataset splits use `seed=42` for perfect reproducibility. Same exact train/test split every run.

#### 3. **BacktestEngine** (`evaluation/backtestEngine.js`)
Simulates historical prediction performance over rolling time windows.

**Key Methods**:
- `runRollingWindowBacktest(records, predictor)` — 30-day windows, 7-day steps (configurable)
- `backtestSplit(trainRecords, testRecords)` — Fixed train/test backtest
- `backtestByTimeInterval(records, intervalDays)` — Monthly/quarterly aggregation
- `accuracyByConfidence(records, numBuckets)` — Prediction accuracy stratified by probability
- `sequentialBacktest(records)` — Forward-chain backtest (train on past, predict future)

**Drawdown Tracking**: Monitors when Brier score degrades beyond recent minimum (market regime changes).

#### 4. **EvaluationOrchestrator** (`evaluation/index.js`)
High-level controller for end-to-end pipeline orchestration.

**Main Method**: `runEvaluationPipeline(rawRecords, evaluationName)`

**Pipeline Steps**:
1. Build deterministic dataset (versioning, hashing)
2. Validate dataset integrity (nulls, resolution rate, age)
3. Extract features (predictions ↔ outcomes pairs)
4. Partition into train/validation/test (seeded 70/15/15 split)
5. Evaluate train metrics
6. Evaluate validation metrics
7. Evaluate test metrics
8. Calibration analysis
9. K-fold cross-validation
10. Rolling window backtest
11. Accuracy by confidence buckets
12. Generate comprehensive report
13. Bundle artifacts for export

**Output**: `finalArtifacts` bundle with all metrics, splits, and exportable formats (JSON/Markdown/Summary).

---

## Usage Examples

### Quick Evaluation (Single Call)

```javascript
import { EvaluationOrchestrator } from './evaluation/index.js';

// Get live market data
const records = await fetchMarketData();

// Run full evaluation pipeline
const orchestrator = new EvaluationOrchestrator({
    evaluationScenario: 'strict',
    datasetScenario: 'strict'
});

const result = await orchestrator.runEvaluationPipeline(records, 'Q1 2024 Markets');

// Access results
console.log(result.artifacts.pipeline.report.summary);
```

### Individual Component Usage

```javascript
import { DatasetBuilder } from './evaluation/datasetBuilder.js';
import { ModelEvaluator } from './evaluation/modelEvaluator.js';

// Build dataset
const builder = new DatasetBuilder({ minSampleSize: 100 });
const buildResult = builder.buildDataset(records);
const datasetId = buildResult.datasetId;

// Evaluate predictions
const evaluator = new ModelEvaluator({ seed: 42 });
const { train, validation, test } = evaluator.partitionDataset(
    builder.getDataset(datasetId).records
);

const metrics = evaluator.evaluatePredictions(
    test.map(r => r.probability),
    test.map(r => r.outcome ? 1 : 0)
);

console.log(`Test Brier: ${metrics.brierScore.toFixed(4)}`);
console.log(`ECE: ${metrics.ece.toFixed(4)}`);
```

### Time-Series Cross-Validation

```javascript
const backtest = new BacktestEngine({
    windowSize: 30,  // 30-day windows
    stepSize: 7,     // 7-day steps
    minEventsPerWindow: 20
});

const result = backtest.runRollingWindowBacktest(records);
console.log(`${result.windowCount} evaluation windows`);
console.log(`Avg Brier: ${result.summary.brierScore.avg.toFixed(4)}`);
```

---

## Metrics Explained

### Brier Score
- **Range**: [0, 1] (lower is better)
- **Formula**: Mean of squared differences between predicted probability and outcome
- **Interpretation**: Average "distance" of predictions from ground truth
- **Example**: 0.25 = typical quadratic miss

### Log Score (Log Loss)
- **Range**: (-∞, 0] (higher is better)
- **Formula**: Average log likelihood of observed outcomes under predicted probabilities
- **Interpretation**: Information loss; penalizes extreme wrong confidences heavily
- **Example**: -0.5 = roughly 60% average confidence in correct outcomes

### Expected Calibration Error (ECE)
- **Range**: [0, 1] (lower is better)
- **Formula**: Weighted average of |average confidence - accuracy| across probability bins
- **Interpretation**: Miscalibration; how much model confidence deviates from actual accuracy
- **Example**: 0.08 = model typically overconfident by ~8%

### Spherical Score
- **Range**: [0, 1] (higher is better)
- **Formula**: Average normalized likelihood
- **Interpretation**: Balanced metric favoring extremity (unlike Brier)

### Brier Decomposition
- **Reliability**: Miscalibration within probability bins
- **Resolution**: How well model separates yes/no outcomes
- **Uncertainty**: Baseline difficulty (outcome prevalence)
- **Equation**: Brier = Reliability - Resolution + Uncertainty

---

## Integration with UI

### Home Module Evidence Panel

When evaluation is active, the home module displays live metrics:

```
Research Evidence Panel
├─ Markets: 1,247
├─ Resolved: 988 (79%)
├─ Active: 259 (21%)
├─ Total Volume: $4.2M
│
└─ Model Performance (Test Set)
   ├─ Brier Score: 0.2134
   ├─ Log Score: -0.4821
   ├─ Calibration (ECE): 0.0891
   └─ Spherical Score: 0.7823
```

This panel updates automatically when:
1. New market data loads
2. Evaluation pipeline completes
3. Dataset is refreshed

### Artifact Access from State

```javascript
// In any module
if (this.state.evaluator && this.state.evaluator.finalArtifacts) {
    const metrics = this.state.evaluator.finalArtifacts.pipeline.report.testMetrics;
    const calibration = this.state.evaluator.finalArtifacts.pipeline.report.calibration;
}
```

---

## Dataset Scenarios

### **strict**  (Default)
- Min 200 samples
- RequireResolved: true (only resolved events)
- Max age: 30 days
- Use case: Rigorous model evaluation, publication quality

### **default**
- Min 50 samples
- RequireResolved: true
- Max age: 90 days
- Use case: Routine analysis, rapid feedback

### **research**
- Min 100 samples
- RequireResolved: false (can include unresolved)
- No age limit
- Use case: Exploratory analysis, historical deep-dives

---

## Reproducibility & Versioning

### Deterministic Splits
```javascript
// Same results every run with same seed
const evaluator = new ModelEvaluator({ seed: 42 });
const split1 = evaluator.partitionDataset(records);  // [A, B, C | D, E, F]
const split2 = evaluator.partitionDataset(records);  // [A, B, C | D, E, F] ✓
```

### Dataset Hashing
```javascript
// Each dataset gets unique version identifier
{
  datasetVersion: "v1704067200000_a1b2c3d4",
  datasetHash: "a1b2c3d4...",
  recordCount: 847
}
// If data changes → different hash → different version
```

### Artifact Preservation
```javascript
const artifacts = orchestrator.getArtifactBundle();
// {
//   splits: { seed, datasetVersion, indices },
//   foldMetrics: [ { fold, metrics } ],
//   calibration: { bins, ece, overconfidence },
//   report: { reportId, metrics, readiness }
// }
```

---

## Export Formats

### JSON Export
```javascript
const json = orchestrator.exportArtifacts('json');
// Full evaluation object including all splits, metrics, cross-validation results
```

### Markdown Report
```javascript
const md = orchestrator.exportArtifacts('markdown');
// Publication-ready report with tables, metrics, interpretation
```

### Summary
```javascript
const summary = orchestrator.exportArtifacts('summary');
// {
//   testBrier: "0.2134",
//   testCalibrationError: "0.0891",
//   modelReadiness: { ready: true, issues: [], warnings: [] }
// }
```

---

## Model Readiness Assessment

### Checks

| Issue | Threshold | Severity |
|-------|-----------|----------|
| No test metrics | Always | 🔴 Fail |
| Brier > 0.50 | Probability-dependent | ⚠️ Warn |
| ECE > 0.15 | Calibration poor | ⚠️ Warn |
| Test set < 100 | Stability concern | ⚠️ Warn |

### Readiness Output

```javascript
{
  ready: true,
  issues: [],
  warnings: [
    "ECE > 0.15 suggests model needs recalibration",
    "Test set < 100 samples; increase data for stability"
  ]
}
```

---

## Performance Tips

1. **Use strategist sampling** for large datasets:
   ```javascript
   const sample = builder.stratifiedSample(datasetId, 0.2);
   ```

2. **Cache datasets** to avoid recomputation:
   ```javascript
   builder.datasets.get(datasetId);  // Retrieve cached
   ```

3. **Lazy-load backtests** for expensive operations:
   ```javascript
   // Backtest only on explicit request, not on every evaluation
   ```

4. **Batch multiple evaluations**:
   ```javascript
   // Create single evaluator instance, reuse for multiple runs
   const evaluator = createEvaluator('strict');
   ```

---

## Troubleshooting

### "Insufficient valid records"
- **Cause**: Dataset has fewer records than minimum threshold
- **Fix**: Lower `minSampleSize` in config or provide more data

### "High calibration error (ECE > 0.20)"
- **Cause**: Predictions are consistently overconfident or underconfident
- **Fix**: Apply Platt scaling or isotonic regression post-hoc

### "Dataset validation warnings"
- **Cause**: Low resolution rate or old data
- **Fix**: Filter to more recent resolved events before training

### Reproducibility issues
- **Ensure**: Same `seed` value in ModelEvaluator
- **Check**: Dataset version hasn't changed (different hash = different data)

---

## Next Steps

1. **Train custom models** using dataset splits as inputs
2. **Calibrate predictions** post-hoc with calibration curves
3. **Monitor live performance** with rolling-window backtest
4. **Export reports** for stakeholder communication
5. **Version control** evaluation artifacts for audit trail

---

## References

- **Calibration**: Guo et al., "On Calibration of Modern Neural Networks" (2017)
- **Scoring Rules**: Gneiting & Raftery, "Strictly Proper Scoring Rules, Prediction, and Estimation" (2007)
- **Cross-Validation**: Hastie, Tibshirani, & Friedman, "Elements of Statistical Learning" (Ch. 7)

