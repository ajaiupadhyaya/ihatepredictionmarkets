// Module 10: Temporal Decay
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager.js';
import p5 from 'p5';

export default class TemporalModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
        this.p5Instance = null;
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('temporal');
        
        if (!this.data || !this.data.markets) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Temporal Decay & Resolution Curves</h2>
                    <p class="text-slate-400">Modeling how probability evolves as time-to-resolution decreases</p>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Probability Path Simulation</div>
                                <div class="card-subtitle">P5.js SDE visualization</div>
                            </div>
                        </div>
                        <div id="path-sim" style="height: 400px;"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Probability Spaghetti Plot</div>
                                <div class="card-subtitle">Historical paths to resolution</div>
                            </div>
                        </div>
                        <div id="spaghetti-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Mean Path & Confidence Bands</div>
                                <div class="card-subtitle">Martingale property test</div>
                            </div>
                        </div>
                        <div id="meanpath-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Volatility Term Structure</div>
                                <div class="card-subtitle">Std dev vs time-to-resolution</div>
                            </div>
                        </div>
                        <div id="volatility-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all components
        this.renderPathSimulation();
        this.renderSpaghettiChart();
        this.renderMeanPathChart();
        this.renderVolatilityChart();
        this.renderStats();
        this.renderMethodology();
    }
    
    renderPathSimulation() {
        const containerEl = document.getElementById('path-sim');
        const width = containerEl.clientWidth;
        const height = 400;
        
        const sketch = (p) => {
            let paths = [];
            const nPaths = 20;
            const nSteps = 200;
            const dt = 1.0;
            const sigma = 0.015; // Volatility
            
            class Path {
                constructor(startProb, color) {
                    this.points = [];
                    this.color = color;
                    this.alpha = 200;
                    
                    // Initialize with logit transform
                    let logit = Math.log(startProb / (1 - startProb));
                    
                    // Generate path using Brownian motion in logit space
                    for (let i = 0; i < nSteps; i++) {
                        // Add noise
                        logit += p.randomGaussian(0, sigma * Math.sqrt(dt));
                        
                        // Transform back to probability
                        const prob = 1 / (1 + Math.exp(-logit));
                        
                        this.points.push({
                            x: p.map(i, 0, nSteps - 1, 50, width - 50),
                            y: p.map(prob, 0, 1, height - 50, 50),
                            prob: prob
                        });
                    }
                }
                
                display() {
                    p.noFill();
                    p.stroke(this.color.r, this.color.g, this.color.b, this.alpha);
                    p.strokeWeight(1.5);
                    
                    p.beginShape();
                    for (let pt of this.points) {
                        p.vertex(pt.x, pt.y);
                    }
                    p.endShape();
                    
                    // Draw end point
                    const last = this.points[this.points.length - 1];
                    p.noStroke();
                    p.fill(this.color.r, this.color.g, this.color.b, this.alpha);
                    p.ellipse(last.x, last.y, 4);
                }
            }
            
            p.setup = () => {
                p.createCanvas(width, height);
                p.background(15, 23, 42);
                
                // Generate paths with different starting points
                for (let i = 0; i < nPaths; i++) {
                    const startProb = p.random(0.3, 0.7);
                    const hue = p.map(startProb, 0.3, 0.7, 220, 180);
                    paths.push(new Path(startProb, {
                        r: 34,
                        g: 211,
                        b: 238
                    }));
                }
            };
            
            p.draw = () => {
                p.background(15, 23, 42);
                
                // Draw grid lines
                p.stroke(60, 60, 80, 50);
                p.strokeWeight(1);
                for (let i = 0; i <= 4; i++) {
                    const y = p.map(i / 4, 0, 1, height - 50, 50);
                    p.line(50, y, width - 50, y);
                    
                    // Labels
                    p.noStroke();
                    p.fill(148, 163, 184);
                    p.textAlign(p.RIGHT, p.CENTER);
                    p.textSize(10);
                    p.text((i * 25) + '%', 45, y);
                }
                
                // Draw paths
                for (let path of paths) {
                    path.display();
                }
                
                // Axes
                p.stroke(100, 100, 100);
                p.strokeWeight(2);
                p.line(50, height - 50, width - 50, height - 50); // x-axis
                p.line(50, 50, 50, height - 50); // y-axis
                
                // Labels
                p.noStroke();
                p.fill(148, 163, 184);
                p.textAlign(p.CENTER);
                p.textSize(12);
                p.text('Time to Resolution →', width / 2, height - 20);
                
                p.push();
                p.translate(20, height / 2);
                p.rotate(-p.HALF_PI);
                p.text('Probability', 0, 0);
                p.pop();
                
                // Title
                p.fill(148, 163, 184);
                p.textAlign(p.LEFT);
                p.textSize(11);
                p.text('Simulated Brownian paths (logit-normal)', 60, 30);
            };
        };
        
        this.p5Instance = new p5(sketch, containerEl);
    }
    
    renderSpaghettiChart() {
        const container = d3.select('#spaghetti-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        const markets = this.data.markets || [];
        
        // Normalize time for each market
        const normalizedPaths = markets.map(market => {
            const history = market.priceHistory || [];
            if (history.length === 0) return null;
            
            return history.map((d, i) => ({
                pctComplete: i / (history.length - 1),
                price: d.price,
                marketId: market.id
            }));
        }).filter(d => d !== null);
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);
        
        // Color scale
        const colorScale = d3.scaleSequential(d3.interpolateTurbo)
            .domain([0, normalizedPaths.length]);
        
        // Line generator
        const line = d3.line()
            .x(d => x(d.pctComplete))
            .y(d => y(d.price))
            .curve(d3.curveMonotoneX);
        
        // Draw paths
        normalizedPaths.forEach((path, i) => {
            const pathEl = g.append('path')
                .datum(path)
                .attr('d', line)
                .attr('fill', 'none')
                .attr('stroke', colorScale(i))
                .attr('stroke-width', 1.5)
                .attr('opacity', 0.4);
            
            // Animate path
            const pathLength = pathEl.node().getTotalLength();
            pathEl
                .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
                .attr('stroke-dashoffset', pathLength)
                .transition()
                .duration(1000)
                .delay(i * 20)
                .ease(d3.easeLinear)
                .attr('stroke-dashoffset', 0)
                .on('end', () => pathEl.attr('stroke-dasharray', null));
        });
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('% of Time to Resolution');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Probability');
    }
    
    renderMeanPathChart() {
        const container = d3.select('#meanpath-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        const markets = this.data.markets || [];
        
        // Normalize and bin
        const nBins = 50;
        const bins = Array(nBins).fill(0).map(() => []);
        
        markets.forEach(market => {
            const history = market.priceHistory || [];
            history.forEach((d, i) => {
                const pctComplete = i / (history.length - 1);
                const binIndex = Math.min(Math.floor(pctComplete * nBins), nBins - 1);
                bins[binIndex].push(d.price);
            });
        });
        
        // Calculate mean and std dev
        const pathData = bins.map((bin, i) => {
            if (bin.length === 0) return null;
            return {
                pctComplete: i / nBins,
                mean: stats.mean(bin),
                std: stats.standardDeviation(bin),
                n: bin.length
            };
        }).filter(d => d !== null);
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);
        
        // Confidence bands
        const area = d3.area()
            .x(d => x(d.pctComplete))
            .y0(d => y(Math.max(0, d.mean - 1.96 * d.std / Math.sqrt(d.n))))
            .y1(d => y(Math.min(1, d.mean + 1.96 * d.std / Math.sqrt(d.n))))
            .curve(d3.curveMonotoneX);
        
        g.append('path')
            .datum(pathData)
            .attr('d', area)
            .attr('fill', '#22d3ee')
            .attr('opacity', 0.2);
        
        // Mean line
        const line = d3.line()
            .x(d => x(d.pctComplete))
            .y(d => y(d.mean))
            .curve(d3.curveMonotoneX);
        
        const path = g.append('path')
            .datum(pathData)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#22d3ee')
            .attr('stroke-width', 3);
        
        // Animate
        const pathLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
            .attr('stroke-dashoffset', pathLength)
            .transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);
        
        // Martingale reference (horizontal line at initial price)
        const initialMean = pathData[0] ? pathData[0].mean : 0.5;
        g.append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', y(initialMean))
            .attr('y2', y(initialMean))
            .attr('stroke', '#fbbf24')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.6);
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('% of Time to Resolution');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Mean Probability');
        
        // Legend
        g.append('text')
            .attr('x', chartWidth - 10)
            .attr('y', 25)
            .attr('text-anchor', 'end')
            .attr('fill', '#fbbf24')
            .attr('font-size', '11px')
            .text('Martingale (no drift)');
    }
    
    renderVolatilityChart() {
        const container = d3.select('#volatility-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        const markets = this.data.markets || [];
        
        // Calculate volatility in bins
        const nBins = 20;
        const bins = Array(nBins).fill(0).map(() => []);
        
        markets.forEach(market => {
            const history = market.priceHistory || [];
            for (let i = 1; i < history.length; i++) {
                const pctComplete = i / (history.length - 1);
                const binIndex = Math.min(Math.floor(pctComplete * nBins), nBins - 1);
                const logReturn = Math.log(history[i].price / history[i - 1].price);
                if (isFinite(logReturn)) {
                    bins[binIndex].push(logReturn);
                }
            }
        });
        
        // Calculate volatility (annualized std dev)
        const volData = bins.map((bin, i) => {
            if (bin.length < 2) return null;
            return {
                pctComplete: i / nBins,
                volatility: stats.standardDeviation(bin) * Math.sqrt(252) // Annualize
            };
        }).filter(d => d !== null);
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(volData, d => d.volatility) || 1])
            .nice()
            .range([chartHeight, 0]);
        
        // Area chart
        const area = d3.area()
            .x(d => x(d.pctComplete))
            .y0(chartHeight)
            .y1(d => y(d.volatility))
            .curve(d3.curveMonotoneX);
        
        g.append('path')
            .datum(volData)
            .attr('d', area)
            .attr('fill', '#a855f7')
            .attr('opacity', 0.3);
        
        // Line
        const line = d3.line()
            .x(d => x(d.pctComplete))
            .y(d => y(d.volatility))
            .curve(d3.curveMonotoneX);
        
        const path = g.append('path')
            .datum(volData)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#a855f7')
            .attr('stroke-width', 3);
        
        // Animate
        const pathLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
            .attr('stroke-dashoffset', pathLength)
            .transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => ui.formatPercent(d, 1)))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('% of Time to Resolution');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Annualized Volatility');
    }
    
    renderStats() {
        const markets = this.data.markets || [];
        
        // Calculate overall statistics
        const allPrices = [];
        const allReturns = [];
        
        markets.forEach(market => {
            const history = market.priceHistory || [];
            allPrices.push(...history.map(d => d.price));
            
            for (let i = 1; i < history.length; i++) {
                const ret = history[i].price - history[i - 1].price;
                allReturns.push(ret);
            }
        });
        
        const avgPrice = stats.mean(allPrices);
        const avgReturn = stats.mean(allReturns);
        const volatility = allReturns.length > 0 ? stats.standardDeviation(allReturns) * Math.sqrt(252) : 0;
        
        // Mean reversion test
        const acf1 = allReturns.length > 1 ? 
            stats.pearsonCorrelation(allReturns.slice(0, -1), allReturns.slice(1)) : 0;
        
        const halfLife = acf1 !== 0 ? -Math.log(2) / Math.log(Math.abs(acf1)) : Infinity;
        
        // Drift (should be near 0 for martingale)
        const drift = avgReturn * 252; // Annualized
        
        const statsData = {
            'Markets Analyzed': markets.length,
            'Total Observations': allPrices.length,
            'Mean Probability': ui.formatPercent(avgPrice, 1),
            'Annualized Volatility': ui.formatPercent(volatility, 2),
            'Drift (annualized)': ui.formatPercent(drift, 3),
            'ACF(1)': ui.formatNumber(acf1, 3),
            'Half-Life (periods)': halfLife < 100 ? ui.formatNumber(halfLife, 1) : '∞',
            'Martingale Test': Math.abs(drift) < 0.01 ? '✓ Pass' : '✗ Fail'
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Martingale Property',
                text: 'Efficient markets should be martingales: E[P(t+1)|P(t)] = P(t). The mean path should be flat (no drift). We test this by checking if annualized drift ≈ 0.'
            },
            {
                title: 'Logit-Normal Model',
                text: 'Probabilities evolve as Brownian motion in logit space: d(logit(p)) = σ·dW. This ensures p stays in (0,1). Transformed back via p = 1/(1 + exp(-logit)).'
            },
            {
                title: 'Volatility Term Structure',
                text: 'Measures std dev of returns as function of time-to-resolution. Typically increases near resolution as information arrives. High volatility = high uncertainty.'
            }
        ];
        
        const panel = ui.createMethodologyPanel('Understanding Temporal Dynamics', sections);
        document.getElementById('methodology-panel').appendChild(panel);
    }
    
    async update() {
        // Clean up P5 instance
        if (this.p5Instance) {
            this.p5Instance.remove();
            this.p5Instance = null;
        }
        this.container.innerHTML = '';
        await this.render();
    }
    
    destroy() {
        if (this.p5Instance) {
            this.p5Instance.remove();
            this.p5Instance = null;
        }
        this.container.innerHTML = '';
    }
}
