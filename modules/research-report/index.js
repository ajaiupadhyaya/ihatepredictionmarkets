import * as d3 from 'd3';
import { getResearchReportDataset } from '../../data/researchReportData.js';

const COLORS = {
    ink: '#1a1a1a',
    slate: '#6b7280',
    lightSlate: '#9ca3af',
    grid: '#e5e7eb',
    blue: '#326891',
    red: '#c0392b',
    green: '#2f855a',
    bg: '#f8f6f1'
};

function chartFooter(dateline) {
    return `<div class="rr-chart-footnote">DATELINE: ${dateline} · SOURCE: SYNTHETIC PREDICTION MARKET PANEL · METHODOLOGY: INTERNALLY CONSISTENT, CATEGORY-AWARE SIMULATION</div>`;
}

function setupSvg(containerId, height, margin = { top: 28, right: 24, bottom: 44, left: 52 }) {
    const container = d3.select(containerId);
    const width = Math.max(420, container.node()?.clientWidth || 820);
    const svg = container.append('svg').attr('width', width).attr('height', height);
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    return { svg, g, width, height, chartWidth, chartHeight, margin };
}

function styleAxis(axisG) {
    axisG.selectAll('text').attr('fill', COLORS.slate).attr('font-size', 11).attr('font-family', 'Inter, sans-serif');
    axisG.selectAll('path,line').attr('stroke', COLORS.grid);
}

function drawGrid(g, xScale, yScale, chartWidth, chartHeight, xTicks = 6, yTicks = 6) {
    g.append('g')
        .attr('class', 'grid-y')
        .call(d3.axisLeft(yScale).ticks(yTicks).tickSize(-chartWidth).tickFormat(''))
        .call(sel => sel.selectAll('line').attr('stroke', COLORS.grid).attr('stroke-opacity', 0.8))
        .call(sel => sel.select('path').remove());

    g.append('g')
        .attr('class', 'grid-x')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).ticks(xTicks).tickSize(-chartHeight).tickFormat(''))
        .call(sel => sel.selectAll('line').attr('stroke', COLORS.grid).attr('stroke-opacity', 0.25))
        .call(sel => sel.select('path').remove());
}

export default class ResearchReportModule {
    constructor(container) {
        this.container = container;
        this.dataset = null;
    }

    async render() {
        this.dataset = getResearchReportDataset();

        const { calibration, informationFlow, keyMarkets, meta } = this.dataset;

        const avgBrier = d3.mean(this.dataset.resolvedUniverse, d => d.brier) ?? 0;
        const avgCalErr = d3.mean(this.dataset.resolvedUniverse, d => Math.abs(d.prediction - d.outcome)) ?? 0;
        const avgVolume = d3.mean(this.dataset.resolvedUniverse, d => d.volume) ?? 0;
        const medianHalfLife = d3.max(informationFlow.halfLife.median, d => d.correlation >= 0.5 ? d.progress : 0) ?? 0;

        this.container.innerHTML = `
            <div class="rr-report fade-in">
                <div class="rr-header">
                    <div class="rr-kicker">Prediction Market Research Report</div>
                    <h1 class="rr-title">Market Accuracy Improved with Scale, but Information Still Arrived Too Late</h1>
                    <p class="rr-dek">Across calibration, information flow, and strategy simulations, the panel shows a repeatable pattern: consensus prices were directionally informative, yet persistent overconfidence and late-stage repricing created exploitable dislocations.</p>
                </div>

                <section class="rr-exec-summary">
                    <h2>Executive Summary</h2>
                    <p>Over the 2025 synthetic panel, markets were directionally useful but not fully efficient. Expected Calibration Error settled at <strong>${(calibration.ece * 100).toFixed(2)}%</strong>, with the largest distortions concentrated in high-conviction tails. Information efficiency was uneven: Science and Finance converged earlier, while Geopolitics and Sports priced critical information late, elevating resolution-week volatility and surprise. A contrarian fade-consensus strategy generated positive simulated alpha, with a Sharpe of <strong>${informationFlow.contrarian.sharpe.toFixed(2)}</strong> and a max drawdown of <strong>${(informationFlow.contrarian.maxDrawdown * 100).toFixed(1)}%</strong>, implying that crowd conviction frequently overshot fundamentals. Category-level sharpness did not automatically translate to accuracy, reinforcing that confidence quality—not confidence magnitude—is the real edge. Overall, market structure looked robust enough for signal extraction, but behavioral crowding and information decay left recurring pockets of mispricing.</p>
                    <div class="rr-headline-stats">
                        <div class="rr-stat"><span>ECE</span><strong>${(calibration.ece * 100).toFixed(2)}%</strong></div>
                        <div class="rr-stat"><span>Avg Brier</span><strong>${avgBrier.toFixed(3)}</strong></div>
                        <div class="rr-stat"><span>Abs Error</span><strong>${(avgCalErr * 100).toFixed(1)}%</strong></div>
                        <div class="rr-stat"><span>Median 50% Info Point</span><strong>${Math.round(medianHalfLife * 100)}% of lifecycle</strong></div>
                        <div class="rr-stat"><span>Avg Market Volume</span><strong>$${(avgVolume / 1000).toFixed(0)}k</strong></div>
                    </div>
                </section>

                <section class="rr-section">
                    <h2>Section I — Calibration & Accuracy Analysis</h2>
                    <div class="rr-grid two">
                        ${this.chartCard('Markets Priced Outcomes, But Overconfidence Persisted in the Tails', 'Calibration curve with LOESS-like smoothing and bucket-level error decomposition. ECE quantifies aggregate distance between stated and realized probabilities.', 'rr-calibration-curve', chartFooter(meta.dateline), 'rr-calibration-note')}
                        ${this.chartCard('Calibration Quality Diverged Materially by Domain', 'Reliability diagrams by category show where consensus was disciplined versus noisy. Best and worst segments are annotated to isolate factor exposure in forecast quality.', 'rr-reliability-category', chartFooter(meta.dateline), 'rr-reliability-note')}
                    </div>
                    <div class="rr-grid two">
                        ${this.chartCard('Confidence Bands Revealed a Favorite-Longshot Distortion', 'Bucketed over/underconfidence shown in count-weighted and resolution-weighted views. Positive bars indicate overpricing relative to realized frequency.', 'rr-bias-band', chartFooter(meta.dateline), 'rr-bias-note')}
                        ${this.chartCard('Only a Few Segments Sat on the Efficient Frontier', 'Sharpness vs calibration error, framed as a forecasting efficient frontier. Frontier points combine decisiveness with low miscalibration.', 'rr-frontier', chartFooter(meta.dateline), 'rr-frontier-note')}
                    </div>
                </section>

                <section class="rr-section">
                    <h2>Section II — Probability Dynamics & Information Flow</h2>
                    <div class="rr-grid one">
                        ${this.chartCard('Markets Saw the Shock Coming — Two Days Too Late', 'Probability paths for ten flagship questions with event markers and a final 48-hour resolution band to show terminal repricing pressure.', 'rr-paths', chartFooter(meta.dateline), 'rr-paths-note')}
                    </div>
                    <div class="rr-grid two">
                        ${this.chartCard('Information Was Priced Early in Science, Late in Geopolitics', 'Half-life curves measure how quickly interim prices aligned with final outcomes. Faster-converging categories carry lower information decay.', 'rr-halflife', chartFooter(meta.dateline), 'rr-halflife-note')}
                        ${this.chartCard('Surprise Spiked During High-Volume Regimes', 'Rolling surprise index with concurrent market volume. Peaks identify moments where confidence and reality diverged despite liquidity.', 'rr-surprise', chartFooter(meta.dateline), 'rr-surprise-note')}
                    </div>
                    <div class="rr-grid two">
                        ${this.chartCard('Fading Consensus Produced Positive Simulated Alpha', 'Cumulative strategy returns from fading extreme consensus positions, with drawdown panel and risk-adjusted headline stats.', 'rr-contrarian', chartFooter(meta.dateline), 'rr-contrarian-note')}
                        ${this.chartCard('Momentum Dominated Short Horizons Before Mean Reversion', 'Autocorrelation of daily probability changes across lags with confidence bands, showing regime crossover from continuation to reversion.', 'rr-momentum', chartFooter(meta.dateline), 'rr-momentum-note')}
                    </div>
                </section>

                <section class="rr-section">
                    <h2>Section III — Market Structure & Liquidity</h2>
                    <div class="rr-grid two">
                        ${this.chartCard('Liquidity Helped Accuracy—Until Crowding Took Over', 'Bubble scatter of volume vs Brier score with trader count and category segmentation. Outliers isolate crowded mistakes and contrarian edge pockets.', 'rr-liquidity-accuracy', chartFooter(meta.dateline), 'rr-liquidity-accuracy-note')}
                        ${this.chartCard('Spreads Compressed, Then Reopened on Information Shocks', 'Bid-ask spread trajectories by flagship markets with idealized decay benchmark and crisis widening annotations.', 'rr-spread-time', chartFooter(meta.dateline), 'rr-spread-time-note')}
                    </div>
                    <div class="rr-grid two">
                        ${this.chartCard('Belief Diversity Improved Signal Quality', 'Trader concentration (HHI) versus Brier score, testing whether concentrated books outperform diffuse participation.', 'rr-hhi-accuracy', chartFooter(meta.dateline), 'rr-hhi-accuracy-note')}
                        ${this.chartCard('Volume Spikes Tracked News, Not Always Foresight', 'Aggregate volume with 2σ anomaly detection and event attribution to assess whether flow leads or lags repricing.', 'rr-volume-spike', chartFooter(meta.dateline), 'rr-volume-spike-note')}
                    </div>
                </section>

                <section class="rr-section">
                    <h2>Section IV — Portfolio & Returns Analysis</h2>
                    <div class="rr-grid two">
                        ${this.chartCard('A Few Markets Drove Most P&L Contribution', 'Private-equity style attribution waterfall for hypothetical YES-at-open strategy across resolved markets.', 'rr-returns-waterfall', chartFooter(meta.dateline), 'rr-returns-waterfall-note')}
                        ${this.chartCard('The Strategy Crossed the J and Stayed Above Benchmark', 'Cumulative J-curve against naive public-market equivalent benchmark to show timing of persistent outperformance.', 'rr-jcurve', chartFooter(meta.dateline), 'rr-jcurve-note')}
                    </div>
                    <div class="rr-grid two">
                        ${this.chartCard('Drawdowns Were Deep but Recoverable in Defined Windows', 'Portfolio path with drawdown diagnostics and labeled trough episodes by depth, duration, and recovery.', 'rr-drawdown', chartFooter(meta.dateline), 'rr-drawdown-note')}
                        ${this.chartCard('Alpha Regimes Were Cyclical, Not Monotonic', 'Rolling Sharpe and information ratio panel to detect persistence vs decay in risk-adjusted returns.', 'rr-rolling-risk', chartFooter(meta.dateline), 'rr-rolling-risk-note')}
                    </div>
                    <div class="rr-grid one">
                        ${this.chartCard('Selection and Timing Explained Most of the Return Stack', 'Institutional factor attribution waterfall decomposing category mix, timing, selection, and liquidity premium.', 'rr-factor-attribution', chartFooter(meta.dateline), 'rr-factor-attribution-note')}
                    </div>
                </section>

                <section class="rr-section">
                    <h2>Section V — Cross-Sectional & Comparative Analysis</h2>
                    <div class="rr-grid two">
                        ${this.chartCard('Dispersion in Forecast Quality Was Category-Specific', 'Category violin distributions of Brier scores with box overlays and sample-size encoding.', 'rr-brier-distribution', chartFooter(meta.dateline), 'rr-brier-distribution-note')}
                        ${this.chartCard('Performance Rotated by Quarter, Not Just by Theme', 'Category-quarter heatmap with baseline anchor at random-guess performance and marginal diagnostics.', 'rr-category-heatmap', chartFooter(meta.dateline), 'rr-category-heatmap-note')}
                    </div>
                    <div class="rr-grid two">
                        ${this.chartCard('Resolution Flow Revealed Operational Friction at the Margin', 'Open-to-resolved flow decomposition by outcome and category to assess throughput and cancellation drag.', 'rr-resolution-flow', chartFooter(meta.dateline), 'rr-resolution-flow-note')}
                        ${this.chartCard('Correlation Clusters Exposed Hidden Factor Concentration', 'Cross-market correlation matrix of probability paths, organized to reveal latent macro/election clusters.', 'rr-correlation-matrix', chartFooter(meta.dateline), 'rr-correlation-matrix-note')}
                    </div>
                    <div class="rr-grid one">
                        ${this.chartCard('High-Conviction Misses Defined the Tail-Risk Budget', 'Black-swan map of ex-ante confidence versus realized miss magnitude, sized by capital at risk.', 'rr-tail-risk', chartFooter(meta.dateline), 'rr-tail-risk-note')}
                    </div>
                </section>

                <section class="rr-section">
                    <h2>Section VI — Trader & Behavioral Analysis</h2>
                    <div class="rr-grid two">
                        ${this.chartCard('Skill Existed, But Persistence Was Incomplete', 'Trader Brier distribution with top-decile persistence panel testing signal durability across periods.', 'rr-trader-distribution', chartFooter(meta.dateline), 'rr-trader-distribution-note')}
                        ${this.chartCard('Traders Anchored to Round Numbers More Than Chance', 'Submitted-probability histogram versus uniform benchmark, highlighting anchoring spikes.', 'rr-anchoring', chartFooter(meta.dateline), 'rr-anchoring-note')}
                    </div>
                    <div class="rr-grid two">
                        ${this.chartCard('Patience Produced Better Calibration in Most Segments', 'Early-vs-late mover calibration comparison by category to test timing edge in execution.', 'rr-late-mover', chartFooter(meta.dateline), 'rr-late-mover-note')}
                        ${this.chartCard('Herding Surged During Macro Event Windows', 'Herding index over time as a lockstep-behavior proxy, with annotated event-driven spikes.', 'rr-herding', chartFooter(meta.dateline), 'rr-herding-note')}
                    </div>
                </section>

                <section class="rr-close">
                    <h2>Synthesis</h2>
                    <p>Taken together, the evidence implies a market ecosystem that is useful but structurally imperfect. Prices generally aggregated directional signal, yet the strongest convictions were often least reliable, creating recurring tail-risk failures. Information integration behaved like a cross-sectional factor: domains with deeper analyst participation converged earlier, while narrative-driven domains repriced late and violently. The alpha profile therefore looked less like pure forecasting genius and more like disciplined positioning against consensus overshoot, with risk management defined by drawdown tolerance and regime awareness. In portfolio terms, prediction markets offered real informational edge, but only to operators treating calibration quality, liquidity context, and behavioral crowding as first-class risk factors.</p>
                </section>
            </div>
        `;

        this.renderCalibrationCurve();
        this.renderReliabilityByCategory();
        this.renderBiasBand();
        this.renderFrontier();
        this.renderProbabilityPaths();
        this.renderHalfLife();
        this.renderSurprise();
        this.renderContrarian();
        this.renderMomentum();
        this.renderLiquidityAccuracy();
        this.renderSpreadCompression();
        this.renderTraderConcentration();
        this.renderVolumeSpikes();
        this.renderReturnsWaterfall();
        this.renderJCurve();
        this.renderDrawdownAnalysis();
        this.renderRollingRisk();
        this.renderFactorAttribution();
        this.renderBrierDistribution();
        this.renderCategoryHeatmap();
        this.renderResolutionFlow();
        this.renderCorrelationMatrix();
        this.renderTailRisk();
        this.renderTraderDistribution();
        this.renderAnchoring();
        this.renderLateMover();
        this.renderHerding();
    }

    chartCard(title, dek, chartId, footnote, noteId) {
        return `
            <article class="rr-card">
                <h3>${title}</h3>
                <p class="rr-card-dek">${dek}</p>
                <div id="${chartId}" class="rr-chart"></div>
                <p id="${noteId}" class="rr-analysis-note"></p>
                ${footnote}
            </article>
        `;
    }

    renderCalibrationCurve() {
        const data = this.dataset.resolvedUniverse;
        const smooth = this.dataset.calibration.smoother;
        const buckets = this.dataset.calibration.buckets.filter(d => d.avgObs !== null);
        const ece = this.dataset.calibration.ece;

        const { svg, g, chartWidth, chartHeight } = setupSvg('#rr-calibration-curve', 460, { top: 18, right: 22, bottom: 44, left: 56 });
        const topHeight = chartHeight * 0.67;
        const bottomTop = topHeight + 42;
        const bottomHeight = chartHeight - topHeight - 42;

        const x = d3.scaleLinear().domain([0, 1]).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, 1]).range([topHeight, 0]);

        drawGrid(g, x, y, chartWidth, topHeight, 10, 6);

        g.append('line')
            .attr('x1', x(0)).attr('y1', y(0)).attr('x2', x(1)).attr('y2', y(1))
            .attr('stroke', COLORS.lightSlate)
            .attr('stroke-dasharray', '5 4')
            .attr('stroke-width', 1.5);

        g.append('g').selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.prediction))
            .attr('cy', d => y(d.outcome))
            .attr('r', 2.1)
            .attr('fill', COLORS.slate)
            .attr('opacity', 0.15);

        const line = d3.line()
            .x(d => x(d.prediction))
            .y(d => y(d.observed))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(smooth)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', COLORS.blue)
            .attr('stroke-width', 3);

        g.append('text')
            .attr('x', x(0.81)).attr('y', y(0.93))
            .attr('fill', COLORS.red)
            .attr('font-size', 11)
            .text('Overconfidence zone');

        g.append('text')
            .attr('x', x(0.13)).attr('y', y(0.33))
            .attr('fill', COLORS.blue)
            .attr('font-size', 11)
            .text('Underconfidence zone');

        const xAxis = d3.axisBottom(x).ticks(10).tickFormat(d => `${Math.round(d * 100)}%`);
        const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => `${Math.round(d * 100)}%`);
        styleAxis(g.append('g').attr('transform', `translate(0,${topHeight})`).call(xAxis));
        styleAxis(g.append('g').call(yAxis));

        const bx = d3.scaleBand().domain(buckets.map(d => d.label)).range([0, chartWidth]).padding(0.2);
        const by = d3.scaleLinear().domain([-0.22, 0.22]).range([bottomTop + bottomHeight, bottomTop]);

        g.append('line').attr('x1', 0).attr('x2', chartWidth).attr('y1', by(0)).attr('y2', by(0)).attr('stroke', COLORS.lightSlate);

        g.selectAll('.cal-bar')
            .data(buckets)
            .enter()
            .append('rect')
            .attr('x', d => bx(d.label))
            .attr('width', bx.bandwidth())
            .attr('y', d => d.error >= 0 ? by(d.error) : by(0))
            .attr('height', d => Math.abs(by(d.error) - by(0)))
            .attr('fill', d => d.error >= 0 ? '#d97a6f' : '#6b93b4')
            .attr('opacity', 0.9);

        const barAxis = d3.axisLeft(by).ticks(4).tickFormat(d => `${(d * 100).toFixed(0)}pp`);
        styleAxis(g.append('g').call(barAxis));

        g.append('text').attr('x', 0).attr('y', bottomTop - 12).attr('fill', COLORS.slate).attr('font-size', 11).text('Calibration error by bucket (prediction − realized)');

        svg.append('text')
            .attr('x', 14)
            .attr('y', 17)
            .attr('font-family', 'Inter, sans-serif')
            .attr('font-size', 12)
            .attr('fill', COLORS.ink)
            .text(`Headline: ECE ${(ece * 100).toFixed(2)}%`);

        const note = document.getElementById('rr-calibration-note');
        note.textContent = `The curve tracks close to parity in the middle range but drifts above and below the diagonal at the extremes, signaling a classic confidence distortion. High-conviction calls above 80% overstate true hit rates, while longshot probabilities are systematically overpriced. At ${(ece * 100).toFixed(2)}% ECE, calibration is investable but far from frictionless.`;
    }

    renderReliabilityByCategory() {
        const data = this.dataset.calibration.reliabilityByCategory;
        const best = [...data].sort((a, b) => a.calibrationError - b.calibrationError)[0];
        const worst = [...data].sort((a, b) => b.calibrationError - a.calibrationError)[0];

        const { g, chartWidth, chartHeight } = setupSvg('#rr-reliability-category', 460, { top: 20, right: 20, bottom: 18, left: 12 });

        const cols = 3;
        const rows = 2;
        const panelW = chartWidth / cols;
        const panelH = chartHeight / rows;

        data.forEach((row, i) => {
            const px = (i % cols) * panelW;
            const py = Math.floor(i / cols) * panelH;
            const panel = g.append('g').attr('transform', `translate(${px + 28},${py + 20})`);
            const w = panelW - 40;
            const h = panelH - 36;
            const x = d3.scaleLinear().domain([0, 1]).range([0, w]);
            const y = d3.scaleLinear().domain([0, 1]).range([h, 0]);

            panel.append('rect').attr('width', w).attr('height', h).attr('fill', 'none').attr('stroke', COLORS.grid);
            panel.append('line').attr('x1', x(0)).attr('y1', y(0)).attr('x2', x(1)).attr('y2', y(1)).attr('stroke', COLORS.lightSlate).attr('stroke-dasharray', '4 3');

            const filtered = row.buckets.filter(d => d.obs !== null);
            panel.append('path')
                .datum(filtered)
                .attr('d', d3.line().x(d => x(d.pred)).y(d => y(d.obs)).curve(d3.curveMonotoneX))
                .attr('stroke', COLORS.blue)
                .attr('stroke-width', 2)
                .attr('fill', 'none');

            panel.append('text').attr('x', 2).attr('y', -6).attr('fill', COLORS.ink).attr('font-size', 11).text(row.category);
            panel.append('text').attr('x', w - 2).attr('y', -6).attr('text-anchor', 'end').attr('fill', COLORS.slate).attr('font-size', 10)
                .text(`Err ${(row.calibrationError * 100).toFixed(1)}%`);
        });

        g.append('text').attr('x', 10).attr('y', chartHeight - 2).attr('fill', COLORS.blue).attr('font-size', 11)
            .text(`Best calibrated: ${best.category}`);
        g.append('text').attr('x', chartWidth - 10).attr('y', chartHeight - 2).attr('text-anchor', 'end').attr('fill', COLORS.red).attr('font-size', 11)
            .text(`Weakest calibrated: ${worst.category}`);

        const note = document.getElementById('rr-reliability-note');
        note.textContent = `${best.category} delivered the tightest reliability profile, with little divergence between implied and realized frequencies. ${worst.category} was the least stable, where conviction rose faster than true outcome frequency. Category selection therefore acts like factor timing: edge quality is domain dependent, not market-wide.`;
    }

    renderBiasBand() {
        const buckets = this.dataset.calibration.buckets.filter(d => d.avgObs !== null);
        const weightTotal = d3.sum(buckets, d => d.weight) || 1;

        const left = buckets.map(d => ({ ...d, weightedError: d.error }));
        const right = buckets.map(d => ({ ...d, weightedError: d.error * (d.weight / weightTotal) * 10 }));

        const { g, chartWidth, chartHeight } = setupSvg('#rr-bias-band', 420, { top: 24, right: 26, bottom: 48, left: 56 });
        const mid = chartWidth / 2;
        const paneGap = 24;
        const paneW = (chartWidth - paneGap) / 2;

        const renderPane = (paneData, x0, title) => {
            const x = d3.scaleBand().domain(paneData.map(d => d.label)).range([x0, x0 + paneW]).padding(0.18);
            const y = d3.scaleLinear().domain([-0.23, 0.23]).range([chartHeight, 0]);

            g.append('line').attr('x1', x0).attr('x2', x0 + paneW).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', COLORS.lightSlate);
            g.selectAll(`.band-${title}`)
                .data(paneData)
                .enter()
                .append('rect')
                .attr('x', d => x(d.label))
                .attr('width', x.bandwidth())
                .attr('y', d => d.weightedError >= 0 ? y(d.weightedError) : y(0))
                .attr('height', d => Math.abs(y(d.weightedError) - y(0)))
                .attr('fill', d => d.weightedError > 0 ? COLORS.red : COLORS.blue)
                .attr('opacity', 0.8);

            g.append('text').attr('x', x0).attr('y', -8).attr('fill', COLORS.ink).attr('font-size', 11).text(title);
            return { x, y };
        };

        const first = renderPane(left, 0, 'Count-weighted bias');
        renderPane(right, mid + paneGap / 2, 'Resolution-weighted bias');

        styleAxis(g.append('g').call(d3.axisLeft(first.y).ticks(5).tickFormat(d => `${(d * 100).toFixed(0)}pp`)));

        g.append('text').attr('x', 0).attr('y', chartHeight + 34).attr('fill', COLORS.slate).attr('font-size', 11)
            .text('Positive bars = overconfidence; negative bars = underconfidence');

        const note = document.getElementById('rr-bias-note');
        note.textContent = 'Both weighting schemes show the same directional distortion: extremes are too aggressive versus realized frequencies. Resolution-weighting amplifies this effect, indicating that high-impact markets also carry larger calibration gaps. The bias is therefore economically relevant, not just statistically visible.';
    }

    renderFrontier() {
        const points = this.dataset.calibration.sharpnessFrontier;
        const frontier = this.dataset.calibration.frontier;

        const { g, chartWidth, chartHeight } = setupSvg('#rr-frontier', 420);
        const x = d3.scaleLinear().domain([0.05, d3.max(points, d => d.sharpness) + 0.03]).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0.1, d3.max(points, d => d.calibrationError) + 0.03]).range([chartHeight, 0]);

        drawGrid(g, x, y, chartWidth, chartHeight, 6, 6);

        g.selectAll('circle')
            .data(points)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.sharpness))
            .attr('cy', d => y(d.calibrationError))
            .attr('r', 6)
            .attr('fill', d => frontier.includes(d) ? COLORS.blue : COLORS.lightSlate)
            .attr('opacity', 0.9);

        g.selectAll('.label')
            .data(points)
            .enter()
            .append('text')
            .attr('x', d => x(d.sharpness) + 8)
            .attr('y', d => y(d.calibrationError) + 4)
            .attr('font-size', 11)
            .attr('fill', COLORS.ink)
            .text(d => d.category);

        g.append('path')
            .datum(frontier)
            .attr('d', d3.line().x(d => x(d.sharpness)).y(d => y(d.calibrationError)).curve(d3.curveMonotoneX))
            .attr('stroke', COLORS.blue)
            .attr('stroke-width', 2)
            .attr('fill', 'none');

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickFormat(d => `${(d * 100).toFixed(0)}%`)));
        styleAxis(g.append('g').call(d3.axisLeft(y).tickFormat(d => `${(d * 100).toFixed(0)}%`)));

        g.append('text').attr('x', chartWidth / 2).attr('y', chartHeight + 34).attr('text-anchor', 'middle').attr('fill', COLORS.slate).attr('font-size', 11)
            .text('Sharpness (|p − 50%|)');
        g.append('text').attr('transform', 'rotate(-90)').attr('x', -chartHeight / 2).attr('y', -38).attr('text-anchor', 'middle').attr('fill', COLORS.slate).attr('font-size', 11)
            .text('Calibration error');

        const note = document.getElementById('rr-frontier-note');
        note.textContent = 'Only a subset of categories is both decisive and accurate enough to define the efficient frontier. Others buy sharpness by accepting larger calibration error, which behaves like uncompensated risk. Portfolio construction should prioritize frontier segments for cleaner information-adjusted exposure.';
    }

    renderProbabilityPaths() {
        const { keyMarkets, events } = this.dataset;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-paths', 430, { top: 20, right: 120, bottom: 44, left: 56 });

        const allDates = keyMarkets[0].path.map(d => d.date);
        const x = d3.scaleTime().domain(d3.extent(allDates)).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);

        drawGrid(g, x, y, chartWidth, chartHeight, 8, 6);

        const line = d3.line().x(d => x(d.date)).y(d => y(d.probability)).curve(d3.curveMonotoneX);
        const color = d3.scaleOrdinal().domain(keyMarkets.map(d => d.id)).range(d3.schemeTableau10);

        const bandEnd = d3.max(allDates);
        const bandStart = new Date(bandEnd.getTime() - 2 * 24 * 60 * 60 * 1000);
        g.append('rect')
            .attr('x', x(bandStart))
            .attr('y', 0)
            .attr('width', x(bandEnd) - x(bandStart))
            .attr('height', chartHeight)
            .attr('fill', '#f3f4f6');

        keyMarkets.forEach(market => {
            g.append('path')
                .datum(market.path)
                .attr('d', line)
                .attr('fill', 'none')
                .attr('stroke', color(market.id))
                .attr('stroke-width', 1.8)
                .attr('opacity', 0.9);

            const last = market.path[market.path.length - 1];
            g.append('text')
                .attr('x', chartWidth + 6)
                .attr('y', y(last.probability) + 3)
                .attr('font-size', 10)
                .attr('fill', color(market.id))
                .text(market.title.slice(0, 22));
        });

        events.forEach(event => {
            g.append('line')
                .attr('x1', x(event.date)).attr('x2', x(event.date))
                .attr('y1', 0).attr('y2', chartHeight)
                .attr('stroke', COLORS.lightSlate)
                .attr('stroke-dasharray', '3 3');

            g.append('text')
                .attr('x', x(event.date) + 2)
                .attr('y', 14)
                .attr('font-size', 9)
                .attr('fill', COLORS.slate)
                .attr('transform', `rotate(-90, ${x(event.date) + 2}, 14)`)
                .text(event.label);
        });

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b'))));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6).tickFormat(d => `${Math.round(d * 100)}%`)));

        const note = document.getElementById('rr-paths-note');
        note.textContent = 'Cross-market paths show synchronized repricing around macro event clusters, but most sharp moves concentrate near terminal resolution windows. That pattern implies partial anticipation with delayed conviction transfer. Information was not absent; it was incorporated with lag.';
    }

    renderHalfLife() {
        const { curves, median } = this.dataset.informationFlow.halfLife;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-halflife', 420);

        const x = d3.scaleLinear().domain([0, 1]).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);

        drawGrid(g, x, y, chartWidth, chartHeight);

        const color = d3.scaleOrdinal().domain(curves.map(c => c.category)).range(['#6b93b4', '#7ba17f', '#b5866f', '#7e8fa1', '#9b6a78', '#5b7e9b']);

        curves.forEach(curve => {
            g.append('path')
                .datum(curve.values)
                .attr('d', d3.line().x(d => x(d.progress)).y(d => y(d.correlation)).curve(d3.curveMonotoneX))
                .attr('fill', 'none')
                .attr('stroke', color(curve.category))
                .attr('stroke-width', 2)
                .attr('opacity', 0.85);
        });

        g.append('path')
            .datum(median)
            .attr('d', d3.line().x(d => x(d.progress)).y(d => y(d.correlation)).curve(d3.curveMonotoneX))
            .attr('fill', 'none')
            .attr('stroke', COLORS.ink)
            .attr('stroke-width', 2.8);

        const endLabels = curves.map(c => ({ category: c.category, value: c.values[c.values.length - 1].correlation }));
        endLabels.forEach((row, i) => {
            g.append('text').attr('x', chartWidth + 4).attr('y', 12 + i * 12).attr('font-size', 10).attr('fill', color(row.category)).text(row.category);
        });

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => `${Math.round(d * 100)}%`)));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6).tickFormat(d => `${Math.round(d * 100)}%`)));

        const note = document.getElementById('rr-halflife-note');
        note.textContent = 'Science and Finance curves rise earlier, meaning those markets embedded terminal information sooner in their lifecycle. Geopolitics and Sports lag, with correlation climbing late and steeply. Faster-converging categories should command higher confidence weights in a systematic strategy.';
    }

    renderSurprise() {
        const data = this.dataset.informationFlow.surpriseSeries;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-surprise', 430, { top: 20, right: 18, bottom: 44, left: 56 });

        const topHeight = chartHeight * 0.62;
        const bottomTop = topHeight + 40;
        const bottomHeight = chartHeight - topHeight - 40;

        const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, chartWidth]);
        const yTop = d3.scaleLinear().domain([0, d3.max(data, d => d.rollingSurprise) * 1.2]).range([topHeight, 0]);
        const yBottom = d3.scaleLinear().domain([0, d3.max(data, d => d.volume) * 1.15]).range([bottomTop + bottomHeight, bottomTop]);

        drawGrid(g, x, yTop, chartWidth, topHeight, 8, 5);

        g.append('path')
            .datum(data)
            .attr('d', d3.line().x(d => x(d.date)).y(d => yTop(d.rollingSurprise)).curve(d3.curveMonotoneX))
            .attr('fill', 'none')
            .attr('stroke', COLORS.red)
            .attr('stroke-width', 2.2);

        g.append('line').attr('x1', 0).attr('x2', chartWidth).attr('y1', yTop(0.2)).attr('y2', yTop(0.2)).attr('stroke', COLORS.lightSlate).attr('stroke-dasharray', '4 3');

        g.selectAll('.volbar')
            .data(data.filter((_, i) => i % 5 === 0))
            .enter()
            .append('rect')
            .attr('x', d => x(d.date) - 1.5)
            .attr('width', 3)
            .attr('y', d => yBottom(d.volume))
            .attr('height', d => yBottom(0) - yBottom(d.volume))
            .attr('fill', COLORS.blue)
            .attr('opacity', 0.45);

        styleAxis(g.append('g').attr('transform', `translate(0,${topHeight})`).call(d3.axisBottom(x).ticks(0)));
        styleAxis(g.append('g').call(d3.axisLeft(yTop).ticks(5).tickFormat(d => d.toFixed(2))));
        styleAxis(g.append('g').attr('transform', `translate(0,${bottomTop + bottomHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b'))));

        const note = document.getElementById('rr-surprise-note');
        note.textContent = 'Surprise spikes cluster around macro shocks and coincide with elevated turnover rather than low-liquidity droughts. High activity did not immunize markets from misspecification; it amplified repricing once errors were acknowledged. Volume was reactive, not always anticipatory.';
    }

    renderContrarian() {
        const series = this.dataset.informationFlow.contrarian.series;
        const sharpe = this.dataset.informationFlow.contrarian.sharpe;
        const maxDd = this.dataset.informationFlow.contrarian.maxDrawdown;

        const { svg, g, chartWidth, chartHeight } = setupSvg('#rr-contrarian', 430, { top: 20, right: 20, bottom: 44, left: 56 });
        const topHeight = chartHeight * 0.64;
        const bottomTop = topHeight + 36;
        const bottomHeight = chartHeight - topHeight - 36;

        const x = d3.scaleTime().domain(d3.extent(series, d => d.date)).range([0, chartWidth]);
        const yEquity = d3.scaleLinear().domain([d3.min(series, d => d.value) * 0.97, d3.max(series, d => d.value) * 1.03]).range([topHeight, 0]);
        const yDd = d3.scaleLinear().domain([Math.min(-0.35, d3.min(series, d => d.drawdown) * 1.1), 0]).range([bottomTop + bottomHeight, bottomTop]);

        drawGrid(g, x, yEquity, chartWidth, topHeight, 8, 5);

        g.append('path')
            .datum(series)
            .attr('d', d3.line().x(d => x(d.date)).y(d => yEquity(d.value)).curve(d3.curveMonotoneX))
            .attr('fill', 'none')
            .attr('stroke', COLORS.green)
            .attr('stroke-width', 2.3);

        g.append('path')
            .datum(series)
            .attr('d', d3.area().x(d => x(d.date)).y0(yDd(0)).y1(d => yDd(d.drawdown)).curve(d3.curveMonotoneX))
            .attr('fill', '#cc6b5a')
            .attr('opacity', 0.35);

        styleAxis(g.append('g').call(d3.axisLeft(yEquity).ticks(5)));
        styleAxis(g.append('g').attr('transform', `translate(0,${bottomTop + bottomHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b'))));

        svg.append('text').attr('x', 12).attr('y', 16).attr('fill', COLORS.ink).attr('font-size', 12)
            .text(`Sharpe ${sharpe.toFixed(2)} · Max Drawdown ${(maxDd * 100).toFixed(1)}%`);

        const note = document.getElementById('rr-contrarian-note');
        note.textContent = `A disciplined fade-consensus rule generated a positive risk-adjusted profile, finishing with a Sharpe of ${sharpe.toFixed(2)} despite intermittent drawdowns. The deepest drawdown reached ${(maxDd * 100).toFixed(1)}%, highlighting that anti-crowd positioning is convex but path-dependent. Alpha appears to come from correcting consensus overshoot, not from constant directional beta.`;
    }

    renderMomentum() {
        const rows = this.dataset.informationFlow.momentum;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-momentum', 420);

        const x = d3.scaleBand().domain(rows.map(d => d.lag)).range([0, chartWidth]).padding(0.25);
        const y = d3.scaleLinear().domain([-0.2, 0.22]).range([chartHeight, 0]);

        drawGrid(g, x, y, chartWidth, chartHeight, rows.length, 6);

        g.append('line').attr('x1', 0).attr('x2', chartWidth).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', COLORS.lightSlate);

        g.selectAll('rect')
            .data(rows)
            .enter()
            .append('rect')
            .attr('x', d => x(d.lag))
            .attr('width', x.bandwidth())
            .attr('y', d => d.autocorr >= 0 ? y(d.autocorr) : y(0))
            .attr('height', d => Math.abs(y(d.autocorr) - y(0)))
            .attr('fill', d => d.autocorr >= 0 ? COLORS.blue : COLORS.red)
            .attr('opacity', 0.86);

        g.selectAll('.ci')
            .data(rows)
            .enter()
            .append('line')
            .attr('x1', d => x(d.lag) + x.bandwidth() / 2)
            .attr('x2', d => x(d.lag) + x.bandwidth() / 2)
            .attr('y1', d => y(d.lower))
            .attr('y2', d => y(d.upper))
            .attr('stroke', COLORS.ink)
            .attr('stroke-width', 1.2);

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x)));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        const crossover = rows.find(row => row.autocorr < 0)?.lag ?? 10;
        g.append('text').attr('x', chartWidth - 8).attr('y', 14).attr('text-anchor', 'end').attr('fill', COLORS.red).attr('font-size', 11)
            .text(`Momentum → mean reversion crossover near ${crossover}d`);

        const note = document.getElementById('rr-momentum-note');
        note.textContent = `Short-lag autocorrelation is positive, supporting tactical momentum over 1–5 day horizons. Beyond roughly ${crossover} days, signal flips negative and mean reversion dominates. Strategy design should therefore separate short-term continuation from medium-horizon reversion regimes.`;
    }

    renderLiquidityAccuracy() {
        const rows = this.dataset.marketStructure.liquidityAccuracy;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-liquidity-accuracy', 430, { top: 20, right: 22, bottom: 44, left: 58 });

        const x = d3.scaleLog().domain([50000, d3.max(rows, d => d.volume) * 1.15]).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, d3.max(rows, d => d.brier) * 1.12]).range([chartHeight, 0]);
        const r = d3.scaleSqrt().domain([d3.min(rows, d => d.traders), d3.max(rows, d => d.traders)]).range([2.5, 12]);
        const color = d3.scaleOrdinal().domain(this.dataset.meta.categories).range(['#6a8cad', '#739f78', '#b69171', '#7897a8', '#9b7082', '#5f84a3']);

        drawGrid(g, x, y, chartWidth, chartHeight, 8, 6);

        g.selectAll('circle')
            .data(rows)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.volume))
            .attr('cy', d => y(d.brier))
            .attr('r', d => r(d.traders))
            .attr('fill', d => color(d.category))
            .attr('opacity', 0.58)
            .attr('stroke', d => d.crowdedWrong || d.illiquidAccurate ? COLORS.ink : 'none')
            .attr('stroke-width', 1.1);

        const xMean = d3.mean(rows, d => Math.log(d.volume));
        const yMean = d3.mean(rows, d => d.brier);
        const cov = d3.mean(rows, d => (Math.log(d.volume) - xMean) * (d.brier - yMean)) || 0;
        const variance = d3.mean(rows, d => (Math.log(d.volume) - xMean) ** 2) || 1;
        const slope = cov / variance;
        const intercept = yMean - slope * xMean;
        const xDomain = x.domain();
        const trendLine = xDomain.map(v => ({ volume: v, brier: intercept + slope * Math.log(v) }));

        g.append('path')
            .datum(trendLine)
            .attr('d', d3.line().x(d => x(d.volume)).y(d => y(d.brier)))
            .attr('stroke', COLORS.red)
            .attr('stroke-width', 2)
            .attr('fill', 'none');

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(6, '~s')));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        const outlierA = rows.find(d => d.crowdedWrong);
        const outlierB = rows.find(d => d.illiquidAccurate);
        if (outlierA) {
            g.append('text').attr('x', x(outlierA.volume) + 8).attr('y', y(outlierA.brier) - 6).attr('font-size', 10).attr('fill', COLORS.red)
                .text('Crowded + wrong');
        }
        if (outlierB) {
            g.append('text').attr('x', x(outlierB.volume) + 8).attr('y', y(outlierB.brier) - 6).attr('font-size', 10).attr('fill', COLORS.blue)
                .text('Illiquid + accurate');
        }

        const note = document.getElementById('rr-liquidity-accuracy-note');
        note.textContent = 'Higher turnover generally lowers error, but crowding introduces its own fragility. The outlier set reveals that liquidity is necessary but not sufficient for accuracy; participation quality matters as much as notional depth.';
    }

    renderSpreadCompression() {
        const { topMarkets, averageCurve } = this.dataset.marketStructure.spreadCompression;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-spread-time', 430, { top: 20, right: 28, bottom: 44, left: 58 });
        const x = d3.scaleTime().domain(d3.extent(averageCurve, d => d.date)).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, d3.max(averageCurve, d => Math.max(d.spread, d.ideal)) * 1.2]).range([chartHeight, 0]);

        drawGrid(g, x, y, chartWidth, chartHeight, 8, 6);
        const palette = d3.schemeTableau10;

        topMarkets.forEach((market, idx) => {
            g.append('path')
                .datum(market.series)
                .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.spread)).curve(d3.curveMonotoneX))
                .attr('fill', 'none')
                .attr('stroke', palette[idx])
                .attr('stroke-width', 1.5)
                .attr('opacity', 0.65);
        });

        g.append('path')
            .datum(averageCurve)
            .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.spread)).curve(d3.curveMonotoneX))
            .attr('fill', 'none').attr('stroke', COLORS.ink).attr('stroke-width', 2.8);

        g.append('path')
            .datum(averageCurve)
            .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.ideal)).curve(d3.curveMonotoneX))
            .attr('fill', 'none').attr('stroke', COLORS.blue).attr('stroke-width', 1.8).attr('stroke-dasharray', '5 3');

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b'))));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6).tickFormat(d => `${(d * 100).toFixed(1)}%`)));

        const shock = averageCurve.reduce((best, row) => row.spread - row.ideal > best.spread - best.ideal ? row : best, averageCurve[0]);
        g.append('text').attr('x', x(shock.date) + 6).attr('y', y(shock.spread) - 8).attr('fill', COLORS.red).attr('font-size', 10)
            .text('Liquidity shock widening');

        const note = document.getElementById('rr-spread-time-note');
        note.textContent = 'Spreads decay toward resolution in normal conditions, but event shocks reverse that compression on impact. The gap versus the ideal curve quantifies temporary liquidity stress and uncertainty repricing.';
    }

    renderTraderConcentration() {
        const rows = this.dataset.marketStructure.liquidityAccuracy;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-hhi-accuracy', 420);
        const x = d3.scaleLinear().domain([0, d3.max(rows, d => d.hhi) * 1.05]).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, d3.max(rows, d => d.brier) * 1.1]).range([chartHeight, 0]);
        drawGrid(g, x, y, chartWidth, chartHeight, 6, 6);

        g.selectAll('circle').data(rows).enter().append('circle')
            .attr('cx', d => x(d.hhi)).attr('cy', d => y(d.brier)).attr('r', 4)
            .attr('fill', COLORS.blue).attr('opacity', 0.55);

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(6)));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        g.append('text').attr('x', chartWidth / 2).attr('y', chartHeight + 34).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', COLORS.slate)
            .text('HHI (trader concentration)');

        const note = document.getElementById('rr-hhi-accuracy-note');
        note.textContent = 'Markets with diffuse participation tend to post lower Brier errors than highly concentrated books, supporting the view that diversity of belief improves probabilistic price discovery. Concentration can add speed, but not always truth quality.';
    }

    renderVolumeSpikes() {
        const { series, spikes } = this.dataset.marketStructure.volumeSpikes;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-volume-spike', 430, { top: 20, right: 20, bottom: 44, left: 58 });
        const x = d3.scaleTime().domain(d3.extent(series, d => d.date)).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, d3.max(series, d => d.volume) * 1.15]).range([chartHeight, 0]);
        drawGrid(g, x, y, chartWidth, chartHeight, 8, 6);

        g.append('path').datum(series)
            .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.volume)).curve(d3.curveMonotoneX))
            .attr('fill', 'none').attr('stroke', COLORS.ink).attr('stroke-width', 2.1);

        g.append('path').datum(series)
            .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.mean + 2 * 90000)).curve(d3.curveMonotoneX))
            .attr('fill', 'none').attr('stroke', COLORS.lightSlate).attr('stroke-dasharray', '4 3').attr('stroke-width', 1.4);

        g.selectAll('.spike-dot').data(spikes.slice(0, 8)).enter().append('circle')
            .attr('cx', d => x(d.date)).attr('cy', d => y(d.volume)).attr('r', 4.2)
            .attr('fill', COLORS.red);

        spikes.slice(0, 3).forEach((spike, idx) => {
            g.append('text').attr('x', x(spike.date) + 4).attr('y', y(spike.volume) - 8 - idx * 2).attr('font-size', 9).attr('fill', COLORS.red)
                .text(spike.eventLabel);
        });

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b'))));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6).tickFormat(d => d3.format('~s')(d))));

        const note = document.getElementById('rr-volume-spike-note');
        note.textContent = 'Anomalous flow clusters around known macro events, indicating volume is tightly coupled to information shocks. The sequencing suggests traders frequently react to breaking narratives rather than steadily front-running them.';
    }

    renderReturnsWaterfall() {
        const rows = this.dataset.portfolio.waterfall.records.slice(0, 16);
        const total = this.dataset.portfolio.waterfall.totalReturn;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-returns-waterfall', 430, { top: 24, right: 20, bottom: 54, left: 64 });
        const x = d3.scaleBand().domain(rows.map((_, i) => i)).range([0, chartWidth]).padding(0.15);
        const y = d3.scaleLinear()
            .domain([d3.min(rows, d => Math.min(d.start, d.end)) * 1.08, d3.max(rows, d => Math.max(d.start, d.end)) * 1.08])
            .range([chartHeight, 0]);

        drawGrid(g, x, y, chartWidth, chartHeight, rows.length, 6);
        g.selectAll('rect').data(rows).enter().append('rect')
            .attr('x', (_, i) => x(i))
            .attr('width', x.bandwidth())
            .attr('y', d => y(Math.max(d.start, d.end)))
            .attr('height', d => Math.abs(y(d.start) - y(d.end)))
            .attr('fill', d => d.pnl >= 0 ? COLORS.green : COLORS.red)
            .attr('opacity', 0.85);

        g.selectAll('.connector').data(rows.slice(0, -1)).enter().append('line')
            .attr('x1', (_, i) => x(i) + x.bandwidth())
            .attr('x2', (_, i) => x(i + 1))
            .attr('y1', d => y(d.end)).attr('y2', d => y(d.end))
            .attr('stroke', COLORS.lightSlate).attr('stroke-width', 1);

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % 2 === 0)).tickFormat(i => `M${Number(i) + 1}`)));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        g.append('text').attr('x', chartWidth - 4).attr('y', 14).attr('text-anchor', 'end').attr('fill', COLORS.ink).attr('font-size', 11)
            .text(`Total return ${total.toFixed(0)} units`);

        const note = document.getElementById('rr-returns-waterfall-note');
        note.textContent = 'Return contribution is highly skewed: a minority of markets explain most cumulative P&L. The bridge profile is classic private-equity attribution—selection concentration drives outcomes more than broad exposure breadth.';
    }

    renderJCurve() {
        const rows = this.dataset.portfolio.jCurve;
        const crossedAt = this.dataset.portfolio.crossedAt;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-jcurve', 430, { top: 22, right: 20, bottom: 44, left: 58 });
        const x = d3.scaleTime().domain(d3.extent(rows, d => d.date)).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([d3.min(rows, d => Math.min(d.portfolio, d.benchmark)) * 1.15, d3.max(rows, d => Math.max(d.portfolio, d.benchmark)) * 1.15]).range([chartHeight, 0]);

        drawGrid(g, x, y, chartWidth, chartHeight, 8, 6);
        g.append('path').datum(rows).attr('d', d3.line().x(d => x(d.date)).y(d => y(d.portfolio)).curve(d3.curveMonotoneX)).attr('fill', 'none').attr('stroke', COLORS.ink).attr('stroke-width', 2.6);
        g.append('path').datum(rows).attr('d', d3.line().x(d => x(d.date)).y(d => y(d.benchmark)).curve(d3.curveMonotoneX)).attr('fill', 'none').attr('stroke', COLORS.blue).attr('stroke-width', 1.9).attr('stroke-dasharray', '4 3');

        if (crossedAt) {
            g.append('line').attr('x1', x(crossedAt)).attr('x2', x(crossedAt)).attr('y1', 0).attr('y2', chartHeight).attr('stroke', COLORS.red).attr('stroke-dasharray', '4 3');
            g.append('text').attr('x', x(crossedAt) + 5).attr('y', 12).attr('fill', COLORS.red).attr('font-size', 10).text('Crossed the J');
        }

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b'))));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        const note = document.getElementById('rr-jcurve-note');
        note.textContent = 'The strategy exhibits the expected J-curve profile: early capital deployment drags performance before resolution cash flows accelerate returns. Once the curve crosses benchmark, outperformance remains persistent through the back half of the period.';
    }

    renderDrawdownAnalysis() {
        const equity = this.dataset.portfolio.jCurve.map(d => ({ date: d.date, value: d.portfolio + 100 }));
        const dd = this.dataset.portfolio.drawdownSeries;
        const deepest = this.dataset.portfolio.deepestDrawdowns;

        const { g, chartWidth, chartHeight } = setupSvg('#rr-drawdown', 430, { top: 20, right: 20, bottom: 44, left: 58 });
        const topHeight = chartHeight * 0.58;
        const bottomTop = topHeight + 40;
        const bottomHeight = chartHeight - topHeight - 40;

        const x = d3.scaleTime().domain(d3.extent(equity, d => d.date)).range([0, chartWidth]);
        const yTop = d3.scaleLinear().domain([d3.min(equity, d => d.value) * 0.97, d3.max(equity, d => d.value) * 1.03]).range([topHeight, 0]);
        const yBottom = d3.scaleLinear().domain([d3.min(dd, d => d.drawdown) * 1.15, 0]).range([bottomTop + bottomHeight, bottomTop]);

        drawGrid(g, x, yTop, chartWidth, topHeight, 8, 5);
        g.append('path').datum(equity).attr('d', d3.line().x(d => x(d.date)).y(d => yTop(d.value)).curve(d3.curveMonotoneX)).attr('fill', 'none').attr('stroke', COLORS.ink).attr('stroke-width', 2.2);
        g.append('path').datum(dd).attr('d', d3.area().x(d => x(d.date)).y0(yBottom(0)).y1(d => yBottom(d.drawdown)).curve(d3.curveMonotoneX)).attr('fill', '#cf7a69').attr('opacity', 0.35);

        deepest.forEach((row, idx) => {
            g.append('text').attr('x', x(row.date) + 4).attr('y', yBottom(row.depth) - 6 - idx * 2).attr('font-size', 9).attr('fill', COLORS.red)
                .text(`${Math.abs(row.depth * 100).toFixed(1)}% / ${row.durationDays}d`);
        });

        styleAxis(g.append('g').call(d3.axisLeft(yTop).ticks(5)));
        styleAxis(g.append('g').attr('transform', `translate(0,${bottomTop + bottomHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b'))));

        const note = document.getElementById('rr-drawdown-note');
        note.textContent = 'Three major drawdown regimes account for most realized pain, but each eventually recovers on a finite horizon. This profile supports a strategy that is alpha-positive but requires institutional tolerance for interim convexity shocks.';
    }

    renderRollingRisk() {
        const rows = this.dataset.portfolio.rollingRisk;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-rolling-risk', 430, { top: 20, right: 20, bottom: 44, left: 58 });
        const topHeight = chartHeight * 0.58;
        const bottomTop = topHeight + 40;
        const bottomHeight = chartHeight - topHeight - 40;

        const x = d3.scaleTime().domain(d3.extent(rows, d => d.date)).range([0, chartWidth]);
        const yS = d3.scaleLinear().domain([d3.min(rows, d => d.sharpe) * 1.1, d3.max(rows, d => d.sharpe) * 1.1]).range([topHeight, 0]);
        const yI = d3.scaleLinear().domain([d3.min(rows, d => d.ir) * 1.1, d3.max(rows, d => d.ir) * 1.1]).range([bottomTop + bottomHeight, bottomTop]);

        drawGrid(g, x, yS, chartWidth, topHeight, 8, 5);
        g.append('path').datum(rows).attr('d', d3.line().x(d => x(d.date)).y(d => yS(d.sharpe)).curve(d3.curveMonotoneX)).attr('fill', 'none').attr('stroke', COLORS.ink).attr('stroke-width', 2.1);
        g.append('path').datum(rows).attr('d', d3.line().x(d => x(d.date)).y(d => yI(d.ir)).curve(d3.curveMonotoneX)).attr('fill', 'none').attr('stroke', COLORS.blue).attr('stroke-width', 2);

        styleAxis(g.append('g').call(d3.axisLeft(yS).ticks(5)));
        styleAxis(g.append('g').attr('transform', `translate(0,${bottomTop + bottomHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b'))));
        g.append('text').attr('x', 6).attr('y', 12).attr('font-size', 10).attr('fill', COLORS.ink).text('Rolling Sharpe (30d)');
        g.append('text').attr('x', 6).attr('y', bottomTop + 12).attr('font-size', 10).attr('fill', COLORS.blue).text('Rolling Information Ratio');

        const note = document.getElementById('rr-rolling-risk-note');
        note.textContent = 'Risk-adjusted performance cycles between sustained alpha windows and decay regimes. Both Sharpe and information ratio confirm that return quality is state-dependent, requiring regime-sensitive position sizing.';
    }

    renderFactorAttribution() {
        const rows = this.dataset.portfolio.factorAttribution;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-factor-attribution', 360, { top: 20, right: 16, bottom: 42, left: 56 });
        const x = d3.scaleBand().domain(rows.map(d => d.factor)).range([0, chartWidth]).padding(0.2);
        const y = d3.scaleLinear().domain([0, d3.max(rows, d => d.value) * 1.15]).range([chartHeight, 0]);
        drawGrid(g, x, y, chartWidth, chartHeight, rows.length, 6);

        g.selectAll('rect').data(rows).enter().append('rect')
            .attr('x', d => x(d.factor)).attr('width', x.bandwidth())
            .attr('y', d => y(d.value)).attr('height', d => chartHeight - y(d.value))
            .attr('fill', (_, i) => [COLORS.blue, '#6d8eac', '#5f86a6', '#7e9db8'][i])
            .attr('opacity', 0.9);

        g.selectAll('.v').data(rows).enter().append('text')
            .attr('x', d => x(d.factor) + x.bandwidth() / 2).attr('y', d => y(d.value) - 6)
            .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', COLORS.ink)
            .text(d => d.value.toFixed(0));

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x)));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        const note = document.getElementById('rr-factor-attribution-note');
        note.textContent = 'Selection and timing account for the majority of simulated return contribution, with category mix and liquidity premium acting as supporting factors. The stack is consistent with discretionary alpha layered on top of structural market exposure.';
    }

    renderBrierDistribution() {
        const rows = this.dataset.resolvedUniverse;
        const categories = this.dataset.meta.categories;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-brier-distribution', 420, { top: 20, right: 20, bottom: 44, left: 56 });
        const x = d3.scaleBand().domain(categories).range([0, chartWidth]).padding(0.22);
        const y = d3.scaleLinear().domain([0, 0.5]).range([chartHeight, 0]);
        drawGrid(g, x, y, chartWidth, chartHeight, categories.length, 6);

        const bins = d3.bin().domain([0, 0.5]).thresholds(22);
        categories.forEach(category => {
            const values = rows.filter(r => r.category === category).map(r => r.brier);
            const sampled = bins(values);
            const maxBin = d3.max(sampled, d => d.length) || 1;
            const widthScale = d3.scaleLinear().domain([0, maxBin]).range([1, x.bandwidth() / 2]);

            const area = d3.area()
                .x0(d => x(category) + x.bandwidth() / 2 - widthScale(d.length))
                .x1(d => x(category) + x.bandwidth() / 2 + widthScale(d.length))
                .y(d => y((d.x0 + d.x1) / 2))
                .curve(d3.curveCatmullRom);

            g.append('path').datum(sampled).attr('d', area).attr('fill', COLORS.blue).attr('opacity', Math.min(0.75, 0.35 + values.length / 220));

            const q1 = d3.quantile(values, 0.25) ?? 0;
            const q2 = d3.quantile(values, 0.5) ?? 0;
            const q3 = d3.quantile(values, 0.75) ?? 0;
            g.append('line').attr('x1', x(category) + x.bandwidth() / 2).attr('x2', x(category) + x.bandwidth() / 2).attr('y1', y(q1)).attr('y2', y(q3)).attr('stroke', COLORS.ink);
            g.append('circle').attr('cx', x(category) + x.bandwidth() / 2).attr('cy', y(q2)).attr('r', 3.2).attr('fill', COLORS.ink);
        });

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x)));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        const note = document.getElementById('rr-brier-distribution-note');
        note.textContent = 'Forecast quality dispersion is materially different across categories, not just levels. Wider violins indicate unstable accuracy regimes, while tighter profiles suggest more reliable edge capture.';
    }

    renderCategoryHeatmap() {
        const rows = this.dataset.crossSection.categoryQuarter;
        const categories = this.dataset.meta.categories;
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const { g, chartWidth, chartHeight } = setupSvg('#rr-category-heatmap', 420, { top: 20, right: 84, bottom: 44, left: 84 });
        const x = d3.scaleBand().domain(quarters).range([0, chartWidth]).padding(0.06);
        const y = d3.scaleBand().domain(categories).range([0, chartHeight]).padding(0.06);
        const color = d3.scaleDiverging([0.1, 0.25, 0.4], d3.interpolateRdBu);

        g.selectAll('rect').data(rows).enter().append('rect')
            .attr('x', d => x(d.quarter)).attr('y', d => y(d.category))
            .attr('width', x.bandwidth()).attr('height', y.bandwidth())
            .attr('fill', d => color(d.brier));

        g.selectAll('.n').data(rows).enter().append('text')
            .attr('x', d => x(d.quarter) + x.bandwidth() / 2).attr('y', d => y(d.category) + y.bandwidth() / 2 + 3)
            .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', COLORS.ink)
            .text(d => d.count > 0 ? d.count : '');

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x)));
        styleAxis(g.append('g').call(d3.axisLeft(y)));

        const marg = this.dataset.crossSection.categoryMarginal;
        g.selectAll('.marg').data(marg).enter().append('rect')
            .attr('x', chartWidth + 6)
            .attr('y', d => y(d.category) + y.bandwidth() * 0.15)
            .attr('width', d => Math.max(2, (d.count / d3.max(marg, m => m.count)) * 58))
            .attr('height', y.bandwidth() * 0.7)
            .attr('fill', COLORS.lightSlate);

        const note = document.getElementById('rr-category-heatmap-note');
        note.textContent = 'Quarterly performance rotates within categories, so static theme-based allocation misses temporal regime shifts. Cells above random-guess baseline signal tactical dislocation rather than structural category weakness.';
    }

    renderResolutionFlow() {
        const flow = this.dataset.crossSection.flow;
        const categories = flow.categories;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-resolution-flow', 430, { top: 18, right: 24, bottom: 22, left: 24 });

        const nodes = {
            open: { x: 20, y: 60, value: flow.open, label: 'Open' },
            active: { x: chartWidth * 0.28, y: 72, value: flow.active, label: 'Active' },
            resolved: { x: chartWidth * 0.54, y: 42, value: flow.resolved, label: 'Resolved' }
        };

        const outcomes = ['yes', 'no', 'ambiguous', 'cancelled'];
        const outcomeTotals = outcomes.map(key => ({ key, value: d3.sum(categories, d => d[key]) }));
        outcomeTotals.forEach((row, idx) => {
            nodes[row.key] = { x: chartWidth * 0.78, y: 30 + idx * 70, value: row.value, label: row.key.toUpperCase() };
        });

        const nodeScale = d3.scaleLinear().domain([0, flow.open]).range([18, 52]);
        const link = (a, b, width) => {
            const p = d3.path();
            p.moveTo(a.x + 12, a.y);
            p.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x - 12, b.y);
            g.append('path').attr('d', p.toString()).attr('fill', 'none').attr('stroke', COLORS.lightSlate).attr('stroke-opacity', 0.5).attr('stroke-width', Math.max(1.2, width));
        };

        link(nodes.open, nodes.active, 9);
        link(nodes.active, nodes.resolved, 8);
        outcomeTotals.forEach(row => link(nodes.resolved, nodes[row.key], (row.value / flow.resolved) * 12));

        Object.values(nodes).forEach(node => {
            const r = nodeScale(node.value);
            g.append('rect').attr('x', node.x - r / 2).attr('y', node.y - 13).attr('width', r).attr('height', 26).attr('fill', '#e8e4da').attr('stroke', '#cbc5b9');
            g.append('text').attr('x', node.x).attr('y', node.y - 16).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', COLORS.ink).text(node.label);
            g.append('text').attr('x', node.x).attr('y', node.y + 4).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', COLORS.slate).text(node.value);
        });

        const note = document.getElementById('rr-resolution-flow-note');
        note.textContent = 'The funnel remains efficient through active-to-resolved conversion, but ambiguity and cancellation still consume measurable throughput. Operationally, that drag behaves like a hidden transaction cost on forecast portfolios.';
    }

    renderCorrelationMatrix() {
        const matrix = this.dataset.crossSection.corrMatrix;
        const names = this.dataset.crossSection.corrSeries.map(d => d.title.slice(0, 18));
        const { g, chartWidth, chartHeight } = setupSvg('#rr-correlation-matrix', 430, { top: 24, right: 24, bottom: 82, left: 120 });
        const x = d3.scaleBand().domain(d3.range(names.length)).range([0, chartWidth]).padding(0.03);
        const y = d3.scaleBand().domain(d3.range(names.length)).range([0, chartHeight]).padding(0.03);
        const color = d3.scaleDiverging([-1, 0, 1], d3.interpolateRdBu);

        g.selectAll('rect').data(matrix).enter().append('rect')
            .attr('x', d => x(d.j)).attr('y', d => y(d.i)).attr('width', x.bandwidth()).attr('height', y.bandwidth())
            .attr('fill', d => color(d.value));

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickValues(x.domain().filter(i => i % 2 === 0)).tickFormat(i => names[i]).tickSize(0)));
        styleAxis(g.append('g').call(d3.axisLeft(y).tickValues(y.domain().filter(i => i % 2 === 0)).tickFormat(i => names[i]).tickSize(0)));
        g.selectAll('.tick text').attr('font-size', 9);

        const note = document.getElementById('rr-correlation-matrix-note');
        note.textContent = 'The matrix reveals concentrated co-movement blocks, implying hidden factor overlap across ostensibly distinct markets. Portfolio diversification therefore depends on correlation structure, not market count.';
    }

    renderTailRisk() {
        const rows = this.dataset.crossSection.tailRisk;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-tail-risk', 390, { top: 20, right: 20, bottom: 44, left: 56 });
        const x = d3.scaleLinear().domain([0.85, 1]).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);
        const r = d3.scaleSqrt().domain([d3.min(rows, d => d.volume) || 1, d3.max(rows, d => d.volume) || 1]).range([4, 14]);
        drawGrid(g, x, y, chartWidth, chartHeight, 6, 6);

        g.selectAll('circle').data(rows).enter().append('circle')
            .attr('cx', d => x(d.confidence))
            .attr('cy', d => y(d.missSize))
            .attr('r', d => r(d.volume))
            .attr('fill', COLORS.red)
            .attr('opacity', 0.62);

        rows.slice(0, 5).forEach((row, idx) => {
            g.append('text').attr('x', x(row.confidence) + 6).attr('y', y(row.missSize) - 6 - idx).attr('font-size', 9).attr('fill', COLORS.red)
                .text(row.category);
        });

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(6).tickFormat(d => `${Math.round(d * 100)}%`)));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        const note = document.getElementById('rr-tail-risk-note');
        note.textContent = 'Largest failures come from high-conviction consensus errors, not from random low-confidence noise. Tail risk is therefore a confidence management problem as much as an outcome uncertainty problem.';
    }

    renderTraderDistribution() {
        const traders = this.dataset.behavioral.traders;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-trader-distribution', 430, { top: 20, right: 24, bottom: 44, left: 56 });
        const topHeight = chartHeight * 0.62;
        const bottomTop = topHeight + 40;
        const bottomHeight = chartHeight - topHeight - 40;

        const bins = d3.bin().domain([0, 0.5]).thresholds(24)(traders.map(t => t.brier));
        const x = d3.scaleLinear().domain([0, 0.5]).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).range([topHeight, 0]);
        drawGrid(g, x, y, chartWidth, topHeight, 8, 5);

        g.selectAll('rect').data(bins).enter().append('rect')
            .attr('x', d => x(d.x0) + 1).attr('y', d => y(d.length))
            .attr('width', d => Math.max(1, x(d.x1) - x(d.x0) - 2)).attr('height', d => topHeight - y(d.length))
            .attr('fill', COLORS.blue).attr('opacity', 0.75);

        const xP = d3.scaleLinear().domain([0, 0.5]).range([0, chartWidth]);
        const yP = d3.scaleLinear().domain([0, 0.5]).range([bottomTop + bottomHeight, bottomTop]);
        g.selectAll('.p').data(traders.slice(0, 220)).enter().append('circle')
            .attr('cx', d => xP(d.period1)).attr('cy', d => yP(d.period2)).attr('r', 2.2)
            .attr('fill', COLORS.slate).attr('opacity', 0.4);
        g.append('line').attr('x1', xP(0)).attr('x2', xP(0.5)).attr('y1', yP(0)).attr('y2', yP(0.5)).attr('stroke', COLORS.lightSlate).attr('stroke-dasharray', '4 3');

        styleAxis(g.append('g').attr('transform', `translate(0,${topHeight})`).call(d3.axisBottom(x).ticks(8)));

        const note = document.getElementById('rr-trader-distribution-note');
        note.textContent = 'A skill spread exists, but period-to-period persistence is noisy rather than absolute. The top decile repeats above chance, yet luck and regime effects still explain a meaningful share of rank turnover.';
    }

    renderAnchoring() {
        const samples = this.dataset.behavioral.anchorSamples;
        const uniform = samples.length / 20;
        const bins = d3.bin().domain([0, 1]).thresholds(20)(samples);
        const { g, chartWidth, chartHeight } = setupSvg('#rr-anchoring', 400, { top: 20, right: 20, bottom: 44, left: 56 });
        const x = d3.scaleLinear().domain([0, 1]).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length) * 1.1]).range([chartHeight, 0]);
        drawGrid(g, x, y, chartWidth, chartHeight, 10, 6);

        g.selectAll('rect').data(bins).enter().append('rect')
            .attr('x', d => x(d.x0) + 1).attr('y', d => y(d.length))
            .attr('width', d => Math.max(1, x(d.x1) - x(d.x0) - 2)).attr('height', d => chartHeight - y(d.length))
            .attr('fill', d => [0.1, 0.25, 0.5, 0.75, 0.9].some(a => Math.abs(((d.x0 + d.x1) / 2) - a) < 0.03) ? COLORS.red : COLORS.blue)
            .attr('opacity', 0.75);

        g.append('line').attr('x1', 0).attr('x2', chartWidth).attr('y1', y(uniform)).attr('y2', y(uniform)).attr('stroke', COLORS.lightSlate).attr('stroke-dasharray', '4 3');

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(10).tickFormat(d => `${Math.round(d * 100)}%`)));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        const note = document.getElementById('rr-anchoring-note');
        note.textContent = 'Round-number probabilities appear at frequencies well above a uniform baseline, indicating clear anchoring behavior. Behavioral clustering likely dampens precision exactly where fine-grained calibration matters most.';
    }

    renderLateMover() {
        const rows = this.dataset.behavioral.lateMover;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-late-mover', 400, { top: 20, right: 20, bottom: 44, left: 64 });
        const x = d3.scaleBand().domain(rows.map(d => d.category)).range([0, chartWidth]).padding(0.18);
        const y = d3.scaleLinear().domain([0, 0.45]).range([chartHeight, 0]);
        drawGrid(g, x, y, chartWidth, chartHeight, rows.length, 6);

        g.selectAll('.early').data(rows).enter().append('rect')
            .attr('x', d => x(d.category))
            .attr('width', x.bandwidth() / 2)
            .attr('y', d => y(d.early)).attr('height', d => chartHeight - y(d.early))
            .attr('fill', COLORS.lightSlate);

        g.selectAll('.late').data(rows).enter().append('rect')
            .attr('x', d => x(d.category) + x.bandwidth() / 2)
            .attr('width', x.bandwidth() / 2)
            .attr('y', d => y(d.late)).attr('height', d => chartHeight - y(d.late))
            .attr('fill', COLORS.blue);

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x)));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));
        g.append('text').attr('x', 8).attr('y', 12).attr('font-size', 10).attr('fill', COLORS.slate).text('Gray = early · Blue = late');

        const note = document.getElementById('rr-late-mover-note');
        note.textContent = 'Late-entry trades generally show lower error than early positioning, indicating that patience improves calibration once information uncertainty collapses. Timing discipline appears to be a repeatable edge.';
    }

    renderHerding() {
        const rows = this.dataset.behavioral.herdingSeries;
        const { g, chartWidth, chartHeight } = setupSvg('#rr-herding', 400, { top: 20, right: 20, bottom: 44, left: 56 });
        const x = d3.scaleTime().domain(d3.extent(rows, d => d.date)).range([0, chartWidth]);
        const y = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);
        drawGrid(g, x, y, chartWidth, chartHeight, 8, 6);

        g.append('path').datum(rows)
            .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.herding)).curve(d3.curveMonotoneX))
            .attr('fill', 'none').attr('stroke', COLORS.red).attr('stroke-width', 2.2);

        const spikes = rows.filter(r => r.herding > 0.55).slice(0, 5);
        spikes.forEach((row, idx) => {
            g.append('circle').attr('cx', x(row.date)).attr('cy', y(row.herding)).attr('r', 3.8).attr('fill', COLORS.red);
            g.append('text').attr('x', x(row.date) + 4).attr('y', y(row.herding) - 6 - idx).attr('font-size', 9).attr('fill', COLORS.red).text('Macro shock');
        });

        styleAxis(g.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b'))));
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(6)));

        const note = document.getElementById('rr-herding-note');
        note.textContent = 'Herding intensity rises sharply during macro event windows, when cross-market moves become synchronized. In those regimes, idiosyncratic edge compresses and factor risk dominates positioning outcomes.';
    }

    update() {
        this.container.querySelectorAll('svg').forEach(node => node.remove());
        this.render();
    }

    destroy() {
        this.container.innerHTML = '';
    }
}
