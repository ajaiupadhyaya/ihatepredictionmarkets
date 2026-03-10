import * as d3 from 'd3';

const CATEGORIES = ['Politics', 'Economics', 'Science', 'Sports', 'Geopolitics', 'Finance'];
const START_DATE = new Date('2025-01-01T00:00:00Z');
const END_DATE = new Date('2025-12-31T00:00:00Z');

function mulberry32(seed) {
    return function random() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function clamp(v, min = 0.01, max = 0.99) {
    return Math.max(min, Math.min(max, v));
}

function dateRange(start, end) {
    const dates = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

function computeDrawdown(series) {
    let peak = -Infinity;
    return series.map(point => {
        peak = Math.max(peak, point.value);
        const drawdown = peak === 0 ? 0 : (point.value - peak) / peak;
        return { ...point, drawdown };
    });
}

function rollingMean(values, window) {
    return values.map((_, idx) => {
        const start = Math.max(0, idx - window + 1);
        const chunk = values.slice(start, idx + 1);
        return d3.mean(chunk);
    });
}

function categoryBias(category) {
    const bias = {
        Politics: 0.03,
        Economics: 0.01,
        Science: -0.02,
        Sports: 0.04,
        Geopolitics: 0.05,
        Finance: -0.01
    };
    return bias[category] ?? 0;
}

function createMarketPath({ random, category, title, id, eventSchedule }) {
    const dates = dateRange(START_DATE, END_DATE);
    const categoryDrift = {
        Politics: 0.0003,
        Economics: 0.0002,
        Science: 0.00015,
        Sports: 0.00025,
        Geopolitics: 0.00035,
        Finance: 0.0002
    }[category];

    const noiseScale = {
        Politics: 0.022,
        Economics: 0.017,
        Science: 0.015,
        Sports: 0.026,
        Geopolitics: 0.021,
        Finance: 0.019
    }[category];

    let value = 0.22 + random() * 0.56;
    const path = [];

    dates.forEach((date, idx) => {
        const trend = (idx / dates.length - 0.5) * categoryDrift * 10;
        const noise = (random() - 0.5) * noiseScale;
        const eventShock = eventSchedule.reduce((acc, event) => {
            const dayDistance = Math.abs((date - event.date) / (24 * 60 * 60 * 1000));
            if (dayDistance > 4) return acc;
            const sign = event.polarity[id] ?? 0;
            return acc + sign * event.strength * Math.exp(-dayDistance / 2.4);
        }, 0);

        value = clamp(value + trend + noise + eventShock * 0.03);
        path.push({ date, probability: value });
    });

    const finalProbability = path[path.length - 1].probability;
    const noisyTruth = clamp(finalProbability - categoryBias(category) + (random() - 0.5) * 0.08);
    const outcome = random() < noisyTruth ? 1 : 0;

    const volumeBase = 220000 + random() * 880000;
    const uniqueTraders = Math.round(85 + random() * 980);

    const spreads = path.map((point, idx) => {
        const progress = idx / (path.length - 1);
        const baseline = 0.17 * (1 - progress) + 0.025;
        const shockBoost = eventSchedule.reduce((acc, event) => {
            const distance = Math.abs((point.date - event.date) / (24 * 60 * 60 * 1000));
            if (distance > 2) return acc;
            return acc + event.strength * 0.06;
        }, 0);
        return {
            date: point.date,
            spread: clamp(baseline + (random() - 0.5) * 0.015 + shockBoost, 0.01, 0.35)
        };
    });

    return {
        id,
        title,
        category,
        outcome,
        finalProbability,
        volume: volumeBase,
        uniqueTraders,
        path,
        spreads
    };
}

function buildEventSchedule() {
    const spec = [
        { label: 'CPI Surprise', date: '2025-02-12', strength: 0.9 },
        { label: 'Election Debate', date: '2025-06-03', strength: 1.1 },
        { label: 'Fed Hold', date: '2025-09-19', strength: 1.0 },
        { label: 'Geopolitical Shock', date: '2025-10-08', strength: 1.2 }
    ];

    const ids = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'];

    return spec.map((row, idx) => {
        const polarity = {};
        ids.forEach((id, idIdx) => {
            const sign = ((idIdx + idx) % 3 === 0 ? -1 : 1) * (idIdx % 2 === 0 ? 1 : 0.7);
            polarity[id] = sign;
        });
        return {
            ...row,
            date: new Date(`${row.date}T00:00:00Z`),
            polarity
        };
    });
}

function movingAverageSmooth(points, window = 5) {
    const sorted = [...points].sort((a, b) => a.prediction - b.prediction);
    return sorted.map((point, idx) => {
        const start = Math.max(0, idx - Math.floor(window / 2));
        const end = Math.min(sorted.length, idx + Math.floor(window / 2) + 1);
        const neighborhood = sorted.slice(start, end);
        return {
            prediction: point.prediction,
            observed: d3.mean(neighborhood, d => d.outcome)
        };
    });
}

function expectedCalibrationError(records, buckets = 10) {
    const step = 1 / buckets;
    let ece = 0;
    for (let i = 0; i < buckets; i++) {
        const min = i * step;
        const max = (i + 1) * step;
        const bucket = records.filter(d => d.prediction >= min && d.prediction < max);
        if (!bucket.length) continue;
        const predMean = d3.mean(bucket, d => d.prediction);
        const obsMean = d3.mean(bucket, d => d.outcome);
        ece += (bucket.length / records.length) * Math.abs(predMean - obsMean);
    }
    return ece;
}

function generateResolvedUniverse(random, keyMarkets) {
    const records = [];
    let idCounter = 1;

    CATEGORIES.forEach(category => {
        const categoryCount = 55;
        for (let i = 0; i < categoryCount; i++) {
            const anchor = keyMarkets[(i + idCounter) % keyMarkets.length];
            const anchorProb = anchor.finalProbability;
            const prediction = clamp(anchorProb + (random() - 0.5) * 0.35);
            const truthProb = clamp(prediction - categoryBias(category) + (random() - 0.5) * 0.12);
            const outcome = random() < truthProb ? 1 : 0;
            const volume = 80000 + random() * 1200000;
            const traders = 30 + Math.round(random() * 1400);
            const concentration = clamp(0.08 + (1 / Math.sqrt(traders)) + random() * 0.22, 0.05, 0.78);

            records.push({
                id: `r${idCounter++}`,
                category,
                prediction,
                outcome,
                volume,
                traders,
                hhi: concentration,
                brier: (prediction - outcome) ** 2
            });
        }
    });

    return records;
}

function makeHalfLifeCurves(random) {
    const steps = d3.range(0, 1.01, 0.05);
    const speed = {
        Politics: 1.3,
        Economics: 1.6,
        Science: 1.9,
        Sports: 1.1,
        Geopolitics: 1.0,
        Finance: 1.7
    };

    const curves = CATEGORIES.map(category => {
        return {
            category,
            values: steps.map(progress => {
                const corr = clamp(1 - Math.exp(-progress * speed[category] * 3) + (random() - 0.5) * 0.04, 0, 1);
                return { progress, correlation: corr };
            })
        };
    });

    const median = steps.map(progress => {
        const values = curves.map(curve => curve.values.find(v => v.progress === progress)?.correlation ?? 0);
        return { progress, correlation: d3.median(values) ?? 0 };
    });

    return { curves, median };
}

function makeSurpriseSeries(random) {
    const dates = dateRange(START_DATE, END_DATE);
    const values = dates.map((date, idx) => {
        const seasonality = 0.09 + 0.06 * Math.sin(idx / 24);
        const shocks = [50, 154, 262, 281].reduce((acc, key) => {
            const dist = Math.abs(idx - key);
            return acc + (dist < 5 ? Math.exp(-dist / 2) * 0.1 : 0);
        }, 0);
        const surprise = clamp(seasonality + shocks + (random() - 0.5) * 0.03, 0.01, 0.42);
        const volume = Math.max(100000, 420000 + shocks * 1800000 + (random() - 0.5) * 250000);
        return { date, surprise, volume };
    });

    const rolling = rollingMean(values.map(d => d.surprise), 21);
    return values.map((row, idx) => ({ ...row, rollingSurprise: rolling[idx] }));
}

function makeContrarianBacktest(random) {
    const dates = dateRange(START_DATE, END_DATE);
    let equity = 100;
    const series = dates.map((date, idx) => {
        const drift = 0.00045;
        const seasonal = 0.0015 * Math.sin(idx / 17);
        const shock = [65, 161, 268].includes(idx) ? -0.028 : 0;
        const ret = drift + seasonal + shock + (random() - 0.5) * 0.007;
        equity *= (1 + ret);
        return { date, value: equity, ret };
    });

    const withDrawdown = computeDrawdown(series);
    const returns = withDrawdown.map(d => d.ret);
    const avg = d3.mean(returns) ?? 0;
    const vol = d3.deviation(returns) ?? 1;
    const sharpe = (avg / vol) * Math.sqrt(252);
    const maxDrawdown = Math.min(...withDrawdown.map(d => d.drawdown));

    return {
        series: withDrawdown,
        sharpe,
        maxDrawdown
    };
}

function makeMomentumFactor(random) {
    const lags = [1, 3, 5, 10, 20];
    return lags.map(lag => {
        const base = lag <= 5 ? 0.17 - lag * 0.018 : -0.01 - (lag - 5) * 0.01;
        const value = base + (random() - 0.5) * 0.02;
        const ci = 0.045;
        return {
            lag,
            autocorr: value,
            lower: value - ci,
            upper: value + ci
        };
    });
}

function makeLiquidityAccuracy(random, resolvedUniverse) {
    return resolvedUniverse.map((row, idx) => {
        const brier = row.brier;
        const liquidityBonus = (1 - Math.min(1, row.hhi)) * 0.03;
        const noisyBrier = clamp(brier - liquidityBonus + (random() - 0.5) * 0.03, 0.01, 0.5);
        return {
            id: row.id,
            category: row.category,
            volume: row.volume,
            brier: noisyBrier,
            traders: row.traders,
            hhi: row.hhi,
            crowdedWrong: row.volume > 900000 && noisyBrier > 0.3,
            illiquidAccurate: row.volume < 220000 && noisyBrier < 0.16,
            index: idx
        };
    });
}

function makeSpreadCompression(keyMarkets) {
    const averageCurve = keyMarkets[0].spreads.map((point, idx) => {
        const spreads = keyMarkets.map(market => market.spreads[idx]?.spread ?? 0);
        const progress = idx / (keyMarkets[0].spreads.length - 1);
        return {
            date: point.date,
            spread: d3.mean(spreads) ?? 0,
            ideal: 0.17 * (1 - progress) + 0.02
        };
    });

    const topMarkets = keyMarkets.slice(0, 5).map(market => ({
        id: market.id,
        title: market.title,
        series: market.spreads
    }));

    return {
        topMarkets,
        averageCurve
    };
}

function makeVolumeSpikes(random, keyMarkets, events) {
    const dates = dateRange(START_DATE, END_DATE);
    const volumeSeries = dates.map((date, idx) => {
        const base = 460000 + 110000 * Math.sin(idx / 15);
        const marketPulse = keyMarkets.reduce((acc, market) => {
            const point = market.path[idx];
            if (!point) return acc;
            return acc + Math.abs(point.probability - 0.5) * 40000;
        }, 0);

        const eventBoost = events.reduce((acc, event) => {
            const dist = Math.abs((date - event.date) / (24 * 60 * 60 * 1000));
            return acc + (dist <= 2 ? event.strength * Math.exp(-dist / 1.2) * 360000 : 0);
        }, 0);

        const total = Math.max(100000, base + marketPulse + eventBoost + (random() - 0.5) * 90000);
        return { date, volume: total };
    });

    const rollingMean21 = rollingMean(volumeSeries.map(d => d.volume), 21);
    const rollingSd21 = volumeSeries.map((_, idx) => {
        const start = Math.max(0, idx - 20);
        const subset = volumeSeries.slice(start, idx + 1).map(d => d.volume);
        return d3.deviation(subset) ?? 1;
    });

    const spikes = volumeSeries
        .map((row, idx) => {
            const z = (row.volume - rollingMean21[idx]) / rollingSd21[idx];
            return { ...row, z, mean: rollingMean21[idx] };
        })
        .filter(row => row.z > 2)
        .map(row => {
            const nearestEvent = events
                .map(event => ({
                    label: event.label,
                    daysAway: Math.round(Math.abs((row.date - event.date) / (24 * 60 * 60 * 1000)))
                }))
                .sort((a, b) => a.daysAway - b.daysAway)[0];

            return {
                ...row,
                eventLabel: nearestEvent?.label || 'Macro flow burst'
            };
        });

    return {
        series: volumeSeries.map((row, idx) => ({ ...row, mean: rollingMean21[idx] })),
        spikes
    };
}

function makeReturnsWaterfall(random, liquidityAccuracy) {
    const records = liquidityAccuracy.slice(0, 40).map(row => {
        const edge = (1 - row.brier) - 0.5;
        const position = 6000 + row.volume * 0.006;
        const pnl = edge * position + (random() - 0.5) * 180;
        return {
            id: row.id,
            category: row.category,
            pnl,
            edge,
            win: pnl > 0
        };
    });

    const sorted = [...records].sort((a, b) => b.pnl - a.pnl);
    let running = 0;
    const waterfall = sorted.map(row => {
        const start = running;
        running += row.pnl;
        return { ...row, start, end: running };
    });

    return {
        records: waterfall,
        totalReturn: running,
        winRate: (records.filter(r => r.win).length / records.length) || 0,
        avgEdge: d3.mean(records, r => r.edge) ?? 0
    };
}

function makeJCurveAndRisk(random) {
    const dates = dateRange(START_DATE, END_DATE);
    let portfolio = -8;
    let benchmark = -8;

    const jCurve = dates.map((date, idx) => {
        const deployment = idx < 100 ? -0.17 - random() * 0.1 : 0;
        const realization = idx > 80 ? 0.11 + 0.06 * Math.sin(idx / 21) + (random() - 0.5) * 0.07 : 0;
        const benchmarkLeg = idx < 100 ? -0.15 : 0.08 + (random() - 0.5) * 0.03;

        portfolio += deployment + realization;
        benchmark += benchmarkLeg;

        return { date, portfolio, benchmark };
    });

    let crossedAt = null;
    for (const point of jCurve) {
        if (point.portfolio > point.benchmark) {
            crossedAt = point.date;
            break;
        }
    }

    const dailyReturns = jCurve.map((point, idx) => {
        if (idx === 0) return { date: point.date, alpha: 0, portfolioRet: 0, benchmarkRet: 0 };
        const prev = jCurve[idx - 1];
        const portfolioRet = point.portfolio - prev.portfolio;
        const benchmarkRet = point.benchmark - prev.benchmark;
        return { date: point.date, alpha: portfolioRet - benchmarkRet, portfolioRet, benchmarkRet };
    });

    const rollingSharpe = dailyReturns.map((row, idx) => {
        const start = Math.max(0, idx - 29);
        const subset = dailyReturns.slice(start, idx + 1);
        const mean = d3.mean(subset, d => d.portfolioRet) ?? 0;
        const stdev = d3.deviation(subset, d => d.portfolioRet) ?? 1;
        const sharpe = (mean / stdev) * Math.sqrt(252);

        const alphaMean = d3.mean(subset, d => d.alpha) ?? 0;
        const alphaSd = d3.deviation(subset, d => d.alpha) ?? 1;
        const ir = (alphaMean / alphaSd) * Math.sqrt(252);

        return { date: row.date, sharpe, ir };
    });

    const drawdownSeries = computeDrawdown(
        jCurve.map(point => ({ date: point.date, value: point.portfolio + 100 }))
    );

    const deepest = [...drawdownSeries]
        .sort((a, b) => a.drawdown - b.drawdown)
        .slice(0, 3)
        .map(point => ({
            date: point.date,
            depth: point.drawdown,
            durationDays: 12 + Math.round(Math.abs(point.drawdown) * 140),
            recoveryDays: 18 + Math.round(Math.abs(point.drawdown) * 160)
        }));

    return {
        jCurve,
        crossedAt,
        rollingRisk: rollingSharpe,
        drawdownSeries,
        deepestDrawdowns: deepest
    };
}

function makeFactorAttribution(random, waterfallTotal) {
    const categoryMix = waterfallTotal * (0.24 + (random() - 0.5) * 0.05);
    const timing = waterfallTotal * (0.29 + (random() - 0.5) * 0.05);
    const selection = waterfallTotal * (0.33 + (random() - 0.5) * 0.05);
    const liquidityPremium = waterfallTotal - categoryMix - timing - selection;

    return [
        { factor: 'Category Mix', value: categoryMix },
        { factor: 'Market Timing', value: timing },
        { factor: 'Selection', value: selection },
        { factor: 'Liquidity Premium', value: liquidityPremium }
    ];
}

function makeCrossSection(random, resolvedUniverse, keyMarkets) {
    const quarterOf = idx => ['Q1', 'Q2', 'Q3', 'Q4'][idx % 4];

    const categoryQuarter = [];
    CATEGORIES.forEach((category, categoryIdx) => {
        const categorySample = resolvedUniverse.filter(row => row.category === category);
        for (let q = 0; q < 4; q++) {
            const subset = categorySample.filter((_, idx) => quarterOf(idx + categoryIdx) === `Q${q + 1}`);
            const avgBrier = subset.length > 0 ? d3.mean(subset, d => d.brier) : 0.25;
            categoryQuarter.push({
                category,
                quarter: `Q${q + 1}`,
                brier: clamp(avgBrier + (random() - 0.5) * 0.03, 0.08, 0.45),
                count: subset.length
            });
        }
    });

    const categoryMarginal = CATEGORIES.map(category => {
        const subset = categoryQuarter.filter(row => row.category === category);
        return { category, brier: d3.mean(subset, d => d.brier) ?? 0.25, count: d3.sum(subset, d => d.count) };
    });

    const periodMarginal = ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => {
        const subset = categoryQuarter.filter(row => row.quarter === quarter);
        return { quarter, brier: d3.mean(subset, d => d.brier) ?? 0.25, count: d3.sum(subset, d => d.count) };
    });

    const outcomeBuckets = CATEGORIES.map(category => {
        const subset = resolvedUniverse.filter(row => row.category === category);
        const yes = subset.filter(row => row.outcome === 1).length;
        const no = subset.filter(row => row.outcome === 0).length;
        const ambiguous = Math.round(subset.length * (0.03 + random() * 0.02));
        const cancelled = Math.round(subset.length * (0.02 + random() * 0.02));
        return { category, yes, no, ambiguous, cancelled, total: subset.length + ambiguous + cancelled };
    });

    const flow = {
        open: 410,
        active: 355,
        resolved: d3.sum(outcomeBuckets, d => d.total),
        categories: outcomeBuckets
    };

    const corrSeries = keyMarkets.map(market => ({
        id: market.id,
        title: market.title,
        values: market.path.map(point => point.probability)
    }));

    const corrMatrix = [];
    for (let i = 0; i < corrSeries.length; i++) {
        for (let j = 0; j < corrSeries.length; j++) {
            const left = corrSeries[i].values;
            const right = corrSeries[j].values;
            const meanL = d3.mean(left) ?? 0;
            const meanR = d3.mean(right) ?? 0;
            const cov = d3.mean(left.map((v, k) => (v - meanL) * ((right[k] ?? meanR) - meanR))) ?? 0;
            const sdL = d3.deviation(left) ?? 1;
            const sdR = d3.deviation(right) ?? 1;
            const corr = cov / (sdL * sdR);
            corrMatrix.push({
                i,
                j,
                left: corrSeries[i].title,
                right: corrSeries[j].title,
                value: clamp(corr, -1, 1)
            });
        }
    }

    const tailRisk = resolvedUniverse
        .map(row => ({
            ...row,
            confidence: Math.max(row.prediction, 1 - row.prediction),
            wrong: (row.prediction >= 0.5 ? 1 : 0) !== row.outcome,
            missSize: Math.abs(row.prediction - row.outcome)
        }))
        .filter(row => row.confidence > 0.85 && row.wrong)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 40);

    return {
        categoryQuarter,
        categoryMarginal,
        periodMarginal,
        flow,
        corrSeries,
        corrMatrix,
        tailRisk
    };
}

function makeBehavioral(random) {
    const traderCount = 300;
    const traders = d3.range(traderCount).map(idx => {
        const latentSkill = Math.max(0, Math.min(1, 0.52 + (random() - 0.5) * 0.5));
        const period1 = clamp(0.34 - latentSkill * 0.2 + (random() - 0.5) * 0.08, 0.05, 0.48);
        const period2 = clamp(period1 + (random() - 0.5) * 0.06 - (latentSkill - 0.5) * 0.03, 0.05, 0.5);
        const overall = (period1 + period2) / 2;
        return {
            id: `trader_${idx + 1}`,
            brier: overall,
            period1,
            period2,
            topDecile1: period1 <= d3.quantile([period1], 0.1)
        };
    });

    const anchorSamples = d3.range(5500).map(() => {
        const anchors = [0.1, 0.25, 0.5, 0.75, 0.9];
        const chooseAnchor = random() < 0.34;
        if (chooseAnchor) {
            const anchor = anchors[Math.floor(random() * anchors.length)];
            return clamp(anchor + (random() - 0.5) * 0.025, 0.01, 0.99);
        }
        return clamp(random(), 0.01, 0.99);
    });

    const lateMover = CATEGORIES.map((category, idx) => {
        const early = clamp(0.26 + idx * 0.008 + (random() - 0.5) * 0.03, 0.14, 0.42);
        const late = clamp(early - 0.03 + (random() - 0.5) * 0.03, 0.1, 0.39);
        return { category, early, late };
    });

    const herdingSeries = dateRange(START_DATE, END_DATE).map((date, idx) => {
        const base = 0.22 + 0.06 * Math.sin(idx / 18);
        const spikes = [52, 154, 263, 280].reduce((acc, key) => {
            const dist = Math.abs(idx - key);
            return acc + (dist < 4 ? Math.exp(-dist / 1.2) * 0.32 : 0);
        }, 0);
        return {
            date,
            herding: clamp(base + spikes + (random() - 0.5) * 0.04, 0.02, 0.95)
        };
    });

    return {
        traders,
        anchorSamples,
        lateMover,
        herdingSeries
    };
}

export function getResearchReportDataset() {
    const random = mulberry32(90210);
    const eventSchedule = buildEventSchedule();

    const keySpecs = [
        ['m1', 'Will inflation end 2025 above 3%?', 'Economics'],
        ['m2', 'Will the U.S. avoid recession in 2025?', 'Economics'],
        ['m3', 'Will incumbent party win election?', 'Politics'],
        ['m4', 'Will AI regulation pass in 2025?', 'Politics'],
        ['m5', 'Will S&P 500 end year above 5600?', 'Finance'],
        ['m6', 'Will BTC break $100k by year-end?', 'Finance'],
        ['m7', 'Will major fusion milestone be reached?', 'Science'],
        ['m8', 'Will WHO declare new global emergency?', 'Geopolitics'],
        ['m9', 'Will host nation win major final?', 'Sports'],
        ['m10', 'Will peace accord be signed this year?', 'Geopolitics']
    ];

    const keyMarkets = keySpecs.map(([id, title, category]) =>
        createMarketPath({ random, category, title, id, eventSchedule })
    );

    const resolvedUniverse = generateResolvedUniverse(random, keyMarkets);
    const calibrationSmoother = movingAverageSmooth(resolvedUniverse, 11);
    const ece = expectedCalibrationError(resolvedUniverse, 10);

    const buckets = d3.range(10).map(i => {
        const min = i / 10;
        const max = (i + 1) / 10;
        const sample = resolvedUniverse.filter(d => d.prediction >= min && d.prediction < max);
        const avgPred = sample.length ? d3.mean(sample, d => d.prediction) : (min + max) / 2;
        const avgObs = sample.length ? d3.mean(sample, d => d.outcome) : null;
        const avgAbsErr = sample.length ? d3.mean(sample, d => Math.abs(d.prediction - d.outcome)) : null;
        const weight = sample.length;
        return {
            label: `${Math.round(min * 100)}-${Math.round(max * 100)}%`,
            center: (min + max) / 2,
            avgPred,
            avgObs,
            error: avgObs === null ? null : avgPred - avgObs,
            avgAbsErr,
            count: sample.length,
            weight
        };
    });

    const reliabilityByCategory = CATEGORIES.map(category => {
        const sample = resolvedUniverse.filter(d => d.category === category);
        const categoryBuckets = d3.range(10).map(i => {
            const min = i / 10;
            const max = (i + 1) / 10;
            const subset = sample.filter(d => d.prediction >= min && d.prediction < max);
            return {
                center: (min + max) / 2,
                pred: subset.length ? d3.mean(subset, d => d.prediction) : (min + max) / 2,
                obs: subset.length ? d3.mean(subset, d => d.outcome) : null,
                count: subset.length
            };
        });

        const calErr = d3.mean(sample, d => Math.abs(d.prediction - d.outcome)) ?? 0;
        const sharpness = d3.mean(sample, d => Math.abs(d.prediction - 0.5)) ?? 0;

        return {
            category,
            sample,
            buckets: categoryBuckets,
            calibrationError: calErr,
            sharpness
        };
    });

    const sharpnessFrontier = reliabilityByCategory
        .map(row => ({
            category: row.category,
            sharpness: row.sharpness,
            calibrationError: row.calibrationError
        }))
        .sort((a, b) => b.sharpness - a.sharpness);

    const frontier = [];
    let bestCal = Infinity;
    sharpnessFrontier.forEach(point => {
        if (point.calibrationError < bestCal) {
            frontier.push(point);
            bestCal = point.calibrationError;
        }
    });

    const halfLife = makeHalfLifeCurves(random);
    const surpriseSeries = makeSurpriseSeries(random);
    const contrarian = makeContrarianBacktest(random);
    const momentum = makeMomentumFactor(random);
    const liquidityAccuracy = makeLiquidityAccuracy(random, resolvedUniverse);
    const spreadCompression = makeSpreadCompression(keyMarkets);
    const volumeSpikes = makeVolumeSpikes(random, keyMarkets, eventSchedule);

    const waterfall = makeReturnsWaterfall(random, liquidityAccuracy);
    const jCurveRisk = makeJCurveAndRisk(random);
    const factorAttribution = makeFactorAttribution(random, waterfall.totalReturn);
    const crossSection = makeCrossSection(random, resolvedUniverse, keyMarkets);
    const behavioral = makeBehavioral(random);

    return {
        meta: {
            dateline: 'Jan 2025 – Dec 2025',
            categories: CATEGORIES,
            generatedAt: new Date().toISOString()
        },
        events: eventSchedule,
        keyMarkets,
        resolvedUniverse,
        calibration: {
            ece,
            smoother: calibrationSmoother,
            buckets,
            reliabilityByCategory,
            sharpnessFrontier,
            frontier
        },
        informationFlow: {
            halfLife,
            surpriseSeries,
            contrarian,
            momentum
        },
        marketStructure: {
            liquidityAccuracy,
            spreadCompression,
            volumeSpikes
        },
        portfolio: {
            waterfall,
            jCurve: jCurveRisk.jCurve,
            crossedAt: jCurveRisk.crossedAt,
            rollingRisk: jCurveRisk.rollingRisk,
            drawdownSeries: jCurveRisk.drawdownSeries,
            deepestDrawdowns: jCurveRisk.deepestDrawdowns,
            factorAttribution
        },
        crossSection,
        behavioral
    };
}
