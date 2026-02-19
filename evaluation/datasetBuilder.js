/**
 * Deterministic Dataset Builder
 * Constructs reproducible datasets for model evaluation from live market data,
 * with versioning, snapshots, and artifact tracking.
 */

export class DatasetBuilder {
    constructor(config = {}) {
        this.datasets = new Map(); // datasetId -> { records, metadata }
        this.snapshots = [];         // Historical snapshots
        this.versionMap = new Map(); // version -> datasetId
        
        this.config = {
            minSampleSize: config.minSampleSize || 50,
            maxAge: config.maxAge || 90 * 24 * 60 * 60 * 1000, // 90 days ms
            requireResolved: config.requireResolved !== false,
            timeSeriesWindow: config.timeSeriesWindow || 7, // days
            ...config
        };
    }
    
    /**
     * Construct dataset from raw market records
     */
    buildDataset(records, datasetId = null) {
        if (!Array.isArray(records) || records.length === 0) {
            return {
                success: false,
                error: 'No records provided',
                version: null
            };
        }
        
        // Filter to valid records
        const validRecords = records
            .filter(r => r && typeof r === 'object')
            .filter(r => r.probability !== undefined && r.resolved !== undefined)
            .map(r => this._normalizeRecord(r));
        
        if (validRecords.length < this.config.minSampleSize) {
            return {
                success: false,
                error: `Insufficient valid records (${validRecords.length} < ${this.config.minSampleSize})`,
                version: null
            };
        }
        
        // Optionally filter to resolved events only
        const filteredRecords = this.config.requireResolved
            ? validRecords.filter(r => r.resolved)
            : validRecords;
        
        if (filteredRecords.length < this.config.minSampleSize) {
            return {
                success: false,
                error: `Insufficient resolved records (${filteredRecords.length})`,
                version: null
            };
        }
        
        // Create dataset metadata
        datasetId = datasetId || `dataset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const version = this._generateVersion(datasetId, filteredRecords);
        
        const metadata = {
            datasetId,
            version,
            timestamp: new Date().toISOString(),
            recordCount: filteredRecords.length,
            platforms: this._extractPlatforms(filteredRecords),
            dateRange: this._extractDateRange(filteredRecords),
            probabilityStats: this._computeProbabilityStats(filteredRecords),
            resolutionRate: filteredRecords.filter(r => r.resolved).length / filteredRecords.length,
            hash: this._hashRecords(filteredRecords)
        };
        
        // Store dataset
        this.datasets.set(datasetId, {
            records: filteredRecords,
            metadata
        });
        
        this.versionMap.set(version, datasetId);
        
        // Record snapshot
        this.snapshots.push({
            version,
            timestamp: new Date().toISOString(),
            recordCount: filteredRecords.length,
            datasetId
        });
        
        return {
            success: true,
            version,
            datasetId,
            recordCount: filteredRecords.length,
            metadata
        };
    }
    
    /**
     * Extract features for model training/evaluation
     * Returns: { predictions, outcomes, metadata }
     */
    extractFeatures(datasetId) {
        const dataset = this.datasets.get(datasetId);
        if (!dataset) {
            return { success: false, error: 'Dataset not found' };
        }
        
        const records = dataset.records;
        const predictions = [];
        const outcomes = [];
        const metadata = [];
        
        records.forEach(record => {
            if (record.probability >= 0 && record.probability <= 1) {
                predictions.push(record.probability);
                outcomes.push(record.resolved ? (record.outcome ? 1 : 0) : null);
                
                metadata.push({
                    eventId: record.eventId,
                    platform: record.platform,
                    category: record.category,
                    created: record.created,
                    resolved: record.resolved
                });
            }
        });
        
        // Filter out records without resolution
        const validIndices = outcomes.map((o, i) => o !== null ? i : null).filter(i => i !== null);
        
        const cleanPredictions = validIndices.map(i => predictions[i]);
        const cleanOutcomes = validIndices.map(i => outcomes[i]);
        const cleanMetadata = validIndices.map(i => metadata[i]);
        
        return {
            success: true,
            predictions: cleanPredictions,
            outcomes: cleanOutcomes,
            metadata: cleanMetadata,
            sampleSize: cleanPredictions.length,
            datasetVersion: dataset.metadata.version
        };
    }
    
    /**
     * Feature engineering: temporal decay, market velocity, concentration
     */
    computeAdvancedFeatures(datasetId) {
        const dataset = this.datasets.get(datasetId);
        if (!dataset) {
            return { success: false, error: 'Dataset not found' };
        }
        
        const records = dataset.records;
        const now = new Date().getTime();
        
        const features = records.map(record => {
            // Age decay: newer predictions should be weighted higher
            const ageMs = now - new Date(record.created).getTime();
            const ageDays = ageMs / (24 * 60 * 60 * 1000);
            const decayFactor = Math.exp(-0.01 * ageDays); // Exponential decay
            
            // Probability extremity: how far from 0.5
            const extremity = Math.abs(record.probability - 0.5) * 2;
            
            // Market consensus approximation (if multiple snapshots available)
            const consensus = record.probability; // Use current as baseline
            
            return {
                eventId: record.eventId,
                baseProbability: record.probability,
                ageDecay: decayFactor,
                extremity,
                consensus,
                platform: record.platform,
                volume: record.volume || 1,
                outcome: record.resolved ? (record.outcome ? 1 : 0) : undefined
            };
        });
        
        return {
            success: true,
            features,
            featureCount: features[0] ? Object.keys(features[0]).length : 0,
            datasetVersion: dataset.metadata.version
        };
    }
    
    /**
     * Stratified sampling for better train/test splits
     */
    stratifiedSample(datasetId, fraction = 0.2, stratifyBy = 'platform') {
        const dataset = this.datasets.get(datasetId);
        if (!dataset) {
            return { success: false, error: 'Dataset not found' };
        }
        
        const records = dataset.records;
        
        // Group by stratification key
        const groups = {};
        records.forEach(record => {
            const key = record[stratifyBy] || 'unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push(record);
        });
        
        // Sample from each group proportionally
        const sampledRecords = [];
        Object.values(groups).forEach(group => {
            const sampleSize = Math.max(1, Math.ceil(group.length * fraction));
            const shuffled = [...group].sort(() => Math.random() - 0.5);
            sampledRecords.push(...shuffled.slice(0, sampleSize));
        });
        
        return {
            success: true,
            samples: sampledRecords,
            sampleCount: sampledRecords.length,
            samplingFraction: sampledRecords.length / records.length,
            stratificationKey: stratifyBy,
            groupDistribution: Object.entries(groups).map(([key, group]) => ({
                [stratifyBy]: key,
                total: group.length,
                sampled: sampledRecords.filter(r => r[stratifyBy] === key).length
            }))
        };
    }
    
    /**
     * Time-series aware split for temporal patterns
     */
    timeSeriesSplit(datasetId, trainFraction = 0.7) {
        const dataset = this.datasets.get(datasetId);
        if (!dataset) {
            return { success: false, error: 'Dataset not found' };
        }
        
        const records = dataset.records;
        
        // Sort by creation date
        const sorted = [...records].sort((a, b) => {
            return new Date(a.created).getTime() - new Date(b.created).getTime();
        });
        
        const splitIdx = Math.floor(sorted.length * trainFraction);
        
        return {
            success: true,
            train: sorted.slice(0, splitIdx),
            test: sorted.slice(splitIdx),
            trainCount: splitIdx,
            testCount: sorted.length - splitIdx,
            splitPoint: sorted[splitIdx]?.created || null
        };
    }
    
    /**
     * Get dataset by version
     */
    getDataset(versionOrId) {
        const datasetId = this.versionMap.get(versionOrId) || versionOrId;
        return this.datasets.get(datasetId) || null;
    }
    
    /**
     * List all available datasets
     */
    listDatasets() {
        return Array.from(this.datasets.entries()).map(([id, data]) => ({
            datasetId: id,
            version: data.metadata.version,
            recordCount: data.metadata.recordCount,
            timestamp: data.metadata.timestamp,
            platforms: data.metadata.platforms,
            dateRange: data.metadata.dateRange
        }));
    }
    
    /**
     * Export dataset as JSON
     */
    exportDataset(versionOrId) {
        const dataset = this.getDataset(versionOrId);
        if (!dataset) return null;
        
        return {
            metadata: dataset.metadata,
            records: dataset.records,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Validate dataset integrity
     */
    validateDataset(versionOrId) {
        const dataset = this.getDataset(versionOrId);
        if (!dataset) return { valid: false, errors: ['Dataset not found'] };
        
        const errors = [];
        const warnings = [];
        const records = dataset.records;
        
        // Check for nulls/undefined
        records.forEach((r, i) => {
            if (r.probability === undefined || r.probability === null) {
                errors.push(`Record ${i}: missing probability`);
            }
            if (r.resolved === undefined) {
                errors.push(`Record ${i}: missing resolved status`);
            }
            if (r.probability < 0 || r.probability > 1) {
                errors.push(`Record ${i}: probability out of range [0,1]`);
            }
        });
        
        // Check for data freshness
        const now = new Date().getTime();
        const oldest = records.reduce((min, r) => {
            const t = new Date(r.created).getTime();
            return Math.min(min, t);
        }, now);
        const ageMs = now - oldest;
        
        if (ageMs > this.config.maxAge) {
            warnings.push(`Dataset is ${(ageMs / (24 * 60 * 60 * 1000)).toFixed(0)} days old`);
        }
        
        // Check resolution rate
        const resolvedCount = records.filter(r => r.resolved).length;
        const resolutionRate = resolvedCount / records.length;
        
        if (resolutionRate < 0.5) {
            warnings.push(`Low resolution rate: ${(resolutionRate * 100).toFixed(1)}%`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            stats: {
                totalRecords: records.length,
                resolvedRecords: resolvedCount,
                resolutionRate: resolutionRate,
                ageMs: ageMs,
                ageDays: (ageMs / (24 * 60 * 60 * 1000)).toFixed(1)
            }
        };
    }
    
    // ===== Utility Functions =====
    
    _normalizeRecord(record) {
        return {
            eventId: record.eventId || record.id || `event_${Math.random()}`,
            probability: Math.max(0, Math.min(1, parseFloat(record.probability) || 0.5)),
            resolved: Boolean(record.resolved || record.outcome !== undefined),
            outcome: Boolean(record.outcome || record.resolved === true),
            platform: record.platform || 'unknown',
            category: record.category || 'general',
            created: record.created || new Date().toISOString(),
            volume: parseFloat(record.volume) || 1,
            liquidity: parseFloat(record.liquidity) || 0
        };
    }
    
    _generateVersion(datasetId, records) {
        const hash = this._hashRecords(records);
        const timestamp = Date.now();
        return `ds_${timestamp}_${hash.slice(0, 8)}`;
    }
    
    _hashRecords(records) {
        let hash = 0;
        const json = JSON.stringify(records.map(r => [r.eventId, r.probability, r.outcome]));
        for (let i = 0; i < json.length; i++) {
            const char = json.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
    
    _extractPlatforms(records) {
        const platforms = new Set(records.map(r => r.platform));
        return Array.from(platforms);
    }
    
    _extractDateRange(records) {
        if (records.length === 0) return { start: null, end: null };
        
        const dates = records.map(r => new Date(r.created).getTime());
        return {
            start: new Date(Math.min(...dates)).toISOString(),
            end: new Date(Math.max(...dates)).toISOString()
        };
    }
    
    _computeProbabilityStats(records) {
        const probs = records.map(r => r.probability);
        if (probs.length === 0) return null;
        
        const sorted = [...probs].sort((a, b) => a - b);
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            mean: probs.reduce((a, b) => a + b, 0) / probs.length,
            count: probs.length
        };
    }
}

/**
 * Factory for common dataset scenarios
 */
export function createDatasetBuilder(scenario = 'default') {
    const configs = {
        default: { minSampleSize: 50, requireResolved: true },
        strict: { minSampleSize: 200, requireResolved: true, maxAge: 30 * 24 * 60 * 60 * 1000 },
        research: { minSampleSize: 100, requireResolved: false }
    };
    
    const config = configs[scenario] || configs.default;
    return new DatasetBuilder(config);
}
