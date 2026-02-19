// Module 1: Market Calibration & Efficiency
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager.js';

export default class CalibrationModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('calibration');
        
        if (!this.data || this.data.markets.length === 0) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Market Calibration & Efficiency</h2>
                    <p class="text-slate-400">Testing whether prediction markets are well-calibrated and efficient</p>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Calibration Curve</div>
                                <div class="card-subtitle">Predicted vs. Observed Probabilities</div>
                            </div>
                        </div>
                        <div id="calibration-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Sharpness Distribution</div>
                                <div class="card-subtitle">How decisive were markets at resolution?</div>
                            </div>
                        </div>
                        <div id="sharpness-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Brier Score Decomposition</div>
                                <div class="card-subtitle">Reliability, Resolution, Uncertainty</div>
                            </div>
                        </div>
                        <div id="brier-decomp-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Calibration by Category</div>
                                <div class="card-subtitle">Small multiples comparison</div>
                            </div>
                        </div>
                        <div id="category-charts" class="chart-container"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all charts with error handling
        try { this.renderCalibrationChart(); } catch (e) { console.warn('Calibration chart error:', e.message); }
        try { this.renderSharpnessChart(); } catch (e) { console.warn('Sharpness chart error:', e.message); }
        try { this.renderBrierDecomposition(); } catch (e) { console.warn('Brier decomp error:', e.message); }
        try { this.renderCategoryComparison(); } catch (e) { console.warn('Category comparison error:', e.message); }
        try { this.renderStats(); } catch (e) { console.warn('Stats error:', e.message); }
        try { this.renderMethodology(); } catch (e) { console.warn('Methodology error:', e.message); }
    }
    
    renderCalibrationChart() {
        const container = d3.select('#calibration-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Defensive check
        if (!this.data || !this.data.predictions || this.data.predictions.length === 0) {
            container.html('<div class="text-center text-slate-400">Insufficient data for calibration analysis</div>');
            return;
        }
        
        // Bin predictions
        const numBins = 10;
        const bins = Array(numBins).fill(0).map(() => ({
            predictions: [],
            outcomes: []
        }));
        
        this.data.predictions.forEach((pred, i) => {
            if (pred !== undefined && pred !== null && i < this.data.outcomes.length) {
                const binIdx = Math.min(Math.floor(pred * numBins), numBins - 1);
                if (bins[binIdx]) {
                    bins[binIdx].predictions.push(pred);
                    bins[binIdx].outcomes.push(this.data.outcomes[i]);
                }
            }
        });
        
        // Calculate bin statistics (filter out empty bins)
        const binData = bins.map((bin, i) => {
            if (!bin || bin.predictions.length === 0) return null;
            
            const avgPred = stats.mean(bin.predictions);
            const observedFreq = stats.mean(bin.outcomes);
            const count = bin.predictions.length;
            
            // Bootstrap CI
            const ci = stats.bootstrapCI(bin.outcomes, stats.mean, 1000);
            
            return {
                binIndex: i,
                avgPrediction: avgPred,
                observedFrequency: observedFreq,
                count,
                ciLower: ci.lower,
                ciUpper: ci.upper
            };
        }).filter(d => d !== null);
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);
        
        const sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(binData, d => d.count)])
            .range([4, 20]);
        
        // Perfect calibration line
        g.append('line')
            .attr('x1', x(0))
            .attr('y1', y(0))
            .attr('x2', x(1))
            .attr('y2', y(1))
            .attr('stroke', '#475569')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // Confidence bands
        const area = d3.area()
            .x(d => x(d.avgPrediction))
            .y0(d => y(d.ciLower))
            .y1(d => y(d.ciUpper))
            .curve(d3.curveMonotoneX);
        
        g.append('path')
            .datum(binData)
            .attr('d', area)
            .attr('fill', '#22d3ee')
            .attr('opacity', 0.2);
        
        // Calibration curve
        const line = d3.line()
            .x(d => x(d.avgPrediction))
            .y(d => y(d.observedFrequency))
            .curve(d3.curveMonotoneX);
        
        g.append('path')
            .datum(binData)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#22d3ee')
            .attr('stroke-width', 3);
        
        // Data points
        const circles = g.selectAll('circle')
            .data(binData)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.avgPrediction))
            .attr('cy', d => y(d.observedFrequency))
            .attr('r', 0)
            .attr('fill', '#fbbf24')
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer');
        
        // Animate circles
        circles.transition()
            .duration(600)
            .delay((d, i) => i * 50)
            .attr('r', d => sizeScale(d.count));
        
        // Tooltips
        circles.on('mouseover', (event, d) => {
            const content = `
                <div class="tooltip-title">Bin ${d.binIndex + 1}</div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Avg Prediction:</span>
                    <span class="tooltip-value">${ui.formatPercent(d.avgPrediction)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Observed:</span>
                    <span class="tooltip-value">${ui.formatPercent(d.observedFrequency)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Markets:</span>
                    <span class="tooltip-value">${d.count}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">95% CI:</span>
                    <span class="tooltip-value">${ui.formatPercent(d.ciLower)} - ${ui.formatPercent(d.ciUpper)}</span>
                </div>
            `;
            ui.showTooltip(event.pageX, event.pageY, content);
        })
        .on('mouseout', () => {
            ui.hideTooltip();
        });
        
        // Axes
        const xAxis = d3.axisBottom(x)
            .ticks(10)
            .tickFormat(d => ui.formatPercent(d, 0));
        
        const yAxis = d3.axisLeft(y)
            .ticks(10)
            .tickFormat(d => ui.formatPercent(d, 0));
        
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(xAxis)
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(yAxis)
            .attr('color', '#94a3b8');
        
        // Axis labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Predicted Probability');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Observed Frequency');
    }
    
    renderSharpnessChart() {
        const container = d3.select('#sharpness-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Create histogram of final probabilities
        const histogram = d3.histogram()
            .domain([0, 1])
            .thresholds(20);
        
        const bins = histogram(this.data.predictions);
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .range([chartHeight, 0]);
        
        // Bars
        const bars = g.selectAll('rect')
            .data(bins)
            .enter()
            .append('rect')
            .attr('x', d => x(d.x0))
            .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr('y', chartHeight)
            .attr('height', 0)
            .attr('fill', '#22d3ee')
            .attr('opacity', 0.8);
        
        // Animate bars
        bars.transition()
            .duration(600)
            .delay((d, i) => i * 30)
            .attr('y', d => y(d.length))
            .attr('height', d => chartHeight - y(d.length));
        
        // Tooltips
        bars.on('mouseover', (event, d) => {
            const content = `
                <div class="tooltip-title">Probability Range</div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Range:</span>
                    <span class="tooltip-value">${ui.formatPercent(d.x0)} - ${ui.formatPercent(d.x1)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Count:</span>
                    <span class="tooltip-value">${d.length}</span>
                </div>
            `;
            ui.showTooltip(event.pageX, event.pageY, content);
        })
        .on('mouseout', () => {
            ui.hideTooltip();
        });
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Final Probability');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Number of Markets');
    }
    
    renderBrierDecomposition() {
        const container = d3.select('#brier-decomp-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 50, left: 100 };
        
        // Calculate decomposition
        const decomp = stats.brierDecomposition(this.data.predictions, this.data.outcomes);
        
        const data = [
            { component: 'Reliability', value: decomp.reliability, color: '#ef4444' },
            { component: 'Resolution', value: -decomp.resolution, color: '#10b981' },
            { component: 'Uncertainty', value: decomp.uncertainty, color: '#94a3b8' }
        ];
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Scales
        const y = d3.scaleBand()
            .domain(data.map(d => d.component))
            .range([0, chartHeight])
            .padding(0.3);
        
        const x = d3.scaleLinear()
            .domain([d3.min(data, d => Math.min(0, d.value)), d3.max(data, d => d.value)])
            .range([0, chartWidth]);
        
        // Bars
        const bars = g.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr('y', d => y(d.component))
            .attr('height', y.bandwidth())
            .attr('x', d => d.value >= 0 ? x(0) : x(d.value))
            .attr('width', 0)
            .attr('fill', d => d.color)
            .attr('opacity', 0.9);
        
        // Animate bars
        bars.transition()
            .duration(600)
            .delay((d, i) => i * 100)
            .attr('width', d => Math.abs(x(d.value) - x(0)));
        
        // Value labels
        g.selectAll('text.value')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'value')
            .attr('x', d => d.value >= 0 ? x(d.value) + 5 : x(d.value) - 5)
            .attr('y', d => y(d.component) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.value >= 0 ? 'start' : 'end')
            .attr('fill', '#e2e8f0')
            .attr('font-size', '12px')
            .attr('font-family', 'JetBrains Mono')
            .text(d => ui.formatNumber(Math.abs(d.value), 4));
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(5))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y))
            .attr('color', '#94a3b8')
            .selectAll('text')
            .attr('font-size', '13px');
        
        // Zero line
        g.append('line')
            .attr('x1', x(0))
            .attr('x2', x(0))
            .attr('y1', 0)
            .attr('y2', chartHeight)
            .attr('stroke', '#475569')
            .attr('stroke-width', 2);
    }
    
    renderCategoryComparison() {
        // Small multiples of calibration curves by category
        const container = d3.select('#category-charts');
        
        // Defensive check
        if (!this.data || !this.data.categories || this.data.categories.length === 0) {
            container.html('<div class="text-slate-400 p-4">No category data available</div>');
            return;
        }
        
        const width = container.node().clientWidth;
        const height = 400;
        
        // Group by category
        const categories = this.data.categories.filter(c => c); // Filter out null/undefined
        const cols = Math.ceil(Math.sqrt(categories.length));
        const rows = Math.ceil(categories.length / cols);
        
        const smallWidth = width / cols;
        const smallHeight = height / rows;
        const margin = { top: 25, right: 10, bottom: 20, left: 30 };
        
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        categories.forEach((category, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            
            const g = svg.append('g')
                .attr('transform', `translate(${col * smallWidth},${row * smallHeight})`);
            
            // Filter data for this category (with defensive checks)
            const categoryMarkets = (this.data.markets || [])
                .filter(m => m && m.category === category && m.finalProbability !== undefined && m.outcome !== undefined);
            
            if (categoryMarkets.length === 0) return;
            
            const predictions = categoryMarkets.map(m => m.finalProbability).filter(p => p !== null && p !== undefined && !isNaN(p));
            const outcomes = categoryMarkets.map(m => m.outcome).filter(o => o !== null && o !== undefined);
            
            if (predictions.length === 0 || outcomes.length === 0) return;
            
            // Bin with defensive access
            const bins = Array(5).fill(0).map(() => ({ predictions: [], outcomes: [] }));
            predictions.forEach((pred, i) => {
                const binIdx = Math.min(Math.floor(pred * 5), 4);
                if (bins[binIdx] && outcomes[i] !== null && outcomes[i] !== undefined) {
                    bins[binIdx].predictions.push(pred);
                    bins[binIdx].outcomes.push(outcomes[i]);
                }
            });
            
            const binData = bins.map(bin => {
                if (!bin || bin.predictions.length === 0) return null;
                return {
                    avgPred: stats.mean(bin.predictions),
                    obsFreq: stats.mean(bin.outcomes)
                };
            }).filter(d => d !== null);
            
            // Scales
            const chartWidth = smallWidth - margin.left - margin.right;
            const chartHeight = smallHeight - margin.top - margin.bottom;
            
            const x = d3.scaleLinear().domain([0, 1]).range([0, chartWidth]);
            const y = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);
            
            const chart = g.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);
            
            // Perfect line
            chart.append('line')
                .attr('x1', x(0))
                .attr('y1', y(0))
                .attr('x2', x(1))
                .attr('y2', y(1))
                .attr('stroke', '#475569')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '2,2');
            
            // Calibration line
            const line = d3.line()
                .x(d => x(d.avgPred))
                .y(d => y(d.obsFreq))
                .curve(d3.curveMonotoneX);
            
            chart.append('path')
                .datum(binData)
                .attr('d', line)
                .attr('fill', 'none')
                .attr('stroke', '#22d3ee')
                .attr('stroke-width', 2);
            
            // Points
            chart.selectAll('circle')
                .data(binData)
                .enter()
                .append('circle')
                .attr('cx', d => x(d.avgPred))
                .attr('cy', d => y(d.obsFreq))
                .attr('r', 3)
                .attr('fill', '#fbbf24');
            
            // Title
            g.append('text')
                .attr('x', margin.left + chartWidth / 2)
                .attr('y', 15)
                .attr('text-anchor', 'middle')
                .attr('fill', '#e2e8f0')
                .attr('font-size', '11px')
                .attr('font-weight', '600')
                .text(category.charAt(0).toUpperCase() + category.slice(1));
            
            // Axes (minimal)
            chart.append('g')
                .attr('transform', `translate(0,${chartHeight})`)
                .call(d3.axisBottom(x).ticks(2).tickFormat(d => d))
                .attr('color', '#475569')
                .selectAll('text')
                .attr('font-size', '8px');
            
            chart.append('g')
                .call(d3.axisLeft(y).ticks(2).tickFormat(d => d))
                .attr('color', '#475569')
                .selectAll('text')
                .attr('font-size', '8px');
        });
    }
    
    renderStats() {
        const brierScore = stats.brierScore(this.data.predictions, this.data.outcomes);
        const logScore = stats.logScore(this.data.predictions, this.data.outcomes);
        const sphericalScore = stats.sphericalScore(this.data.predictions, this.data.outcomes);
        const ece = stats.expectedCalibrationError(this.data.predictions, this.data.outcomes);
        const decomp = stats.brierDecomposition(this.data.predictions, this.data.outcomes);
        
        const statsData = {
            'Brier Score': ui.formatNumber(brierScore, 4),
            'Log Score': ui.formatNumber(logScore, 3),
            'Spherical Score': ui.formatNumber(sphericalScore, 4),
            'ECE': ui.formatNumber(ece, 4),
            'Reliability': ui.formatNumber(decomp.reliability, 4),
            'Resolution': ui.formatNumber(decomp.resolution, 4),
            'Uncertainty': ui.formatNumber(decomp.uncertainty, 4),
            'Markets Analyzed': this.data.markets.length
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Brier Score',
                text: 'The Brier score measures the mean squared difference between predictions and outcomes. Lower is better.',
                formula: 'BS = \\frac{1}{N}\\sum_{i=1}^{N}(p_i - o_i)^2'
            },
            {
                title: 'Expected Calibration Error (ECE)',
                text: 'ECE measures the average absolute miscalibration across probability bins.',
                formula: 'ECE = \\sum_{b=1}^{B}\\frac{n_b}{N}|\\text{conf}(b) - \\text{acc}(b)|'
            },
            {
                title: 'Murphy Decomposition',
                text: 'Brier score can be decomposed into reliability (calibration), resolution (sharpness), and uncertainty.',
                formula: 'BS = \\text{Reliability} - \\text{Resolution} + \\text{Uncertainty}'
            }
        ];
        
        const panel = ui.createMethodologyPanel('How This Works', sections);
        document.getElementById('methodology-panel').appendChild(panel);
    }
    
    async update() {
        // Re-fetch data and re-render
        this.container.innerHTML = '';
        await this.render();
    }
    
    destroy() {
        // Cleanup
        this.container.innerHTML = '';
    }
}
