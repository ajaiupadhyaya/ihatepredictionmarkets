// Module 3: Price Discovery
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager.js';
import p5 from 'p5';

export default class PriceDiscoveryModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
        this.p5Instance = null;
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('price-discovery');
        
        if (!this.data || !this.data.market || !this.data.market.priceHistory) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Information Cascade & Price Discovery</h2>
                    <p class="text-slate-400">Visualizing how markets reprice after information shocks</p>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Price Timeline</div>
                                <div class="card-subtitle">With volume bars</div>
                            </div>
                        </div>
                        <div id="price-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Trade Flow Simulation</div>
                                <div class="card-subtitle">P5.js particle visualization</div>
                            </div>
                        </div>
                        <div id="particle-sim" style="height: 400px;"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Autocorrelation Function</div>
                                <div class="card-subtitle">Price return persistence</div>
                            </div>
                        </div>
                        <div id="acf-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Trade Size Distribution</div>
                                <div class="card-subtitle">Power-law analysis</div>
                            </div>
                        </div>
                        <div id="tradesize-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all components
        this.renderPriceChart();
        this.renderParticleSimulation();
        this.renderACFChart();
        this.renderTradeSizeChart();
        this.renderStats();
        this.renderMethodology();
    }
    
    renderPriceChart() {
        const container = d3.select('#price-chart');
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
        
        // Parse data
        const data = this.data.market.priceHistory.map(d => ({
            ...d,
            timestamp: new Date(d.timestamp)
        }));
        
        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.timestamp))
            .range([0, chartWidth]);
        
        const yPrice = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight * 0.7, 0]);
        
        const yVolume = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.volume)])
            .nice()
            .range([chartHeight, chartHeight * 0.75]);
        
        // Volume bars
        g.selectAll('rect.volume')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'volume')
            .attr('x', d => x(d.timestamp))
            .attr('width', Math.max(1, chartWidth / data.length - 1))
            .attr('y', d => yVolume(d.volume))
            .attr('height', d => chartHeight - yVolume(d.volume))
            .attr('fill', '#64748b')
            .attr('opacity', 0.3);
        
        // Price line
        const line = d3.line()
            .x(d => x(d.timestamp))
            .y(d => yPrice(d.price))
            .curve(d3.curveMonotoneX);
        
        const path = g.append('path')
            .datum(data)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#22d3ee')
            .attr('stroke-width', 2.5);
        
        // Animate path
        const pathLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
            .attr('stroke-dashoffset', pathLength)
            .transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0)
            .on('end', () => path.attr('stroke-dasharray', null));
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b %d')))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(yPrice).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Probability');
    }
    
    renderParticleSimulation() {
        const containerEl = document.getElementById('particle-sim');
        const width = containerEl.clientWidth;
        const height = 400;
        
        const trades = this.data.trades || [];
        
        const sketch = (p) => {
            let particles = [];
            let tradeIndex = 0;
            let frameCounter = 0;
            
            class Particle {
                constructor(isBuy, size) {
                    this.x = p.random(width);
                    this.y = height;
                    this.targetY = height / 2 + p.random(-50, 50);
                    this.size = p.map(size, 0, 10000, 3, 12);
                    this.isBuy = isBuy;
                    this.speed = p.random(2, 4);
                    this.alpha = 255;
                }
                
                update() {
                    this.y -= this.speed;
                    if (this.y < this.targetY) {
                        this.alpha -= 5;
                    }
                }
                
                display() {
                    p.noStroke();
                    if (this.isBuy) {
                        p.fill(16, 185, 129, this.alpha); // Green
                    } else {
                        p.fill(239, 68, 68, this.alpha); // Red
                    }
                    p.ellipse(this.x, this.y, this.size);
                }
                
                isDead() {
                    return this.alpha <= 0;
                }
            }
            
            p.setup = () => {
                p.createCanvas(width, height);
                p.background(15, 23, 42); // slate-900
            };
            
            p.draw = () => {
                p.background(15, 23, 42, 25); // Fade effect
                
                // Add new particles periodically
                frameCounter++;
                if (frameCounter % 10 === 0 && tradeIndex < trades.length) {
                    const trade = trades[tradeIndex];
                    particles.push(new Particle(trade.isBuy, trade.size));
                    tradeIndex++;
                    if (tradeIndex >= trades.length) tradeIndex = 0;
                }
                
                // Update and display particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    particles[i].update();
                    particles[i].display();
                    
                    if (particles[i].isDead()) {
                        particles.splice(i, 1);
                    }
                }
                
                // Price line visualization
                p.stroke(34, 211, 238, 100);
                p.strokeWeight(2);
                p.line(0, height / 2, width, height / 2);
                
                // Labels
                p.noStroke();
                p.fill(148, 163, 184);
                p.textSize(11);
                p.textAlign(p.LEFT);
                p.text('BUY', 10, 30);
                p.fill(16, 185, 129);
                p.ellipse(40, 25, 8);
                
                p.fill(148, 163, 184);
                p.text('SELL', 60, 30);
                p.fill(239, 68, 68);
                p.ellipse(95, 25, 8);
            };
        };
        
        this.p5Instance = new p5(sketch, containerEl);
    }
    
    renderACFChart() {
        const container = d3.select('#acf-chart');
        const width = container.node().clientWidth;
        const height = 350;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Calculate returns
        const prices = this.data.market.priceHistory.map(d => d.price);
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push(prices[i] - prices[i - 1]);
        }
        
        // Calculate autocorrelation
        const maxLag = 20;
        const acf = [];
        for (let lag = 0; lag <= maxLag; lag++) {
            const correlation = lag === 0 ? 1 : stats.pearsonCorrelation(
                returns.slice(0, -lag || undefined),
                returns.slice(lag)
            );
            acf.push({ lag, correlation });
        }
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, maxLag])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([-1, 1])
            .nice()
            .range([chartHeight, 0]);
        
        // Zero line
        g.append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', y(0))
            .attr('y2', y(0))
            .attr('stroke', '#475569')
            .attr('stroke-width', 1.5);
        
        // Confidence bands (±1.96/√n)
        const confidenceBound = 1.96 / Math.sqrt(returns.length);
        
        g.append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', y(confidenceBound))
            .attr('y2', y(confidenceBound))
            .attr('stroke', '#fbbf24')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .attr('opacity', 0.5);
        
        g.append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', y(-confidenceBound))
            .attr('y2', y(-confidenceBound))
            .attr('stroke', '#fbbf24')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .attr('opacity', 0.5);
        
        // Bars
        const barWidth = chartWidth / (maxLag + 1) * 0.6;
        
        const bars = g.selectAll('rect')
            .data(acf)
            .enter()
            .append('rect')
            .attr('x', d => x(d.lag) - barWidth / 2)
            .attr('width', barWidth)
            .attr('y', d => d.correlation > 0 ? y(d.correlation) : y(0))
            .attr('height', 0)
            .attr('fill', d => d.correlation > 0 ? '#10b981' : '#ef4444')
            .attr('opacity', 0.8);
        
        // Animate
        bars.transition()
            .duration(600)
            .delay((d, i) => i * 30)
            .attr('height', d => Math.abs(y(d.correlation) - y(0)));
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(10))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Lag (periods)');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Autocorrelation');
    }
    
    renderTradeSizeChart() {
        const container = d3.select('#tradesize-chart');
        const width = container.node().clientWidth;
        const height = 350;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        const trades = this.data.trades || [];
        const sizes = trades.map(t => t.size).sort((a, b) => b - a);
        
        // Log-log histogram
        const logBins = d3.range(1, 5, 0.2).map(x => Math.pow(10, x));
        const histogram = d3.histogram()
            .domain([d3.min(logBins), d3.max(logBins)])
            .thresholds(logBins);
        
        const bins = histogram(sizes);
        
        // Fit power law
        const logSizes = sizes.filter(s => s > 0).map(s => Math.log(s));
        const powerLaw = stats.fitPowerLaw(sizes.filter(s => s > 0));
        
        // Scales (log-log)
        const x = d3.scaleLog()
            .domain([d3.min(sizes), d3.max(sizes)])
            .range([0, chartWidth]);
        
        const y = d3.scaleLog()
            .domain([1, d3.max(bins, d => d.length) || 1])
            .nice()
            .range([chartHeight, 0]);
        
        // Bars
        const bars = g.selectAll('rect')
            .data(bins.filter(d => d.length > 0))
            .enter()
            .append('rect')
            .attr('x', d => x(d.x0))
            .attr('width', d => Math.max(1, x(d.x1) - x(d.x0) - 1))
            .attr('y', chartHeight)
            .attr('height', 0)
            .attr('fill', '#22d3ee')
            .attr('opacity', 0.7);
        
        // Animate
        bars.transition()
            .duration(600)
            .delay((d, i) => i * 30)
            .attr('y', d => y(d.length))
            .attr('height', d => chartHeight - y(d.length));
        
        // Power law line
        const powerLawLine = d3.range(d3.min(sizes), d3.max(sizes), (d3.max(sizes) - d3.min(sizes)) / 100)
            .map(size => ({
                x: size,
                y: powerLaw.amplitude * Math.pow(size, -powerLaw.exponent)
            }));
        
        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y * sizes.length / 10));
        
        g.append('path')
            .datum(powerLawLine)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(5, '.0s'))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y).ticks(5, '.0s'))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Trade Size (log scale)');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Frequency (log scale)');
        
        // Power law annotation
        g.append('text')
            .attr('x', chartWidth - 10)
            .attr('y', 30)
            .attr('text-anchor', 'end')
            .attr('fill', '#ef4444')
            .attr('font-size', '11px')
            .text(`α = ${ui.formatNumber(powerLaw.exponent, 2)}`);
    }
    
    renderStats() {
        const prices = this.data.market.priceHistory.map(d => d.price);
        const volumes = this.data.market.priceHistory.map(d => d.volume);
        const trades = this.data.trades || [];
        
        // Calculate price discovery metrics
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push(prices[i] - prices[i - 1]);
        }
        
        const varianceRatio = stats.varianceRatioTest(prices, 5);
        
        // Half-life of mean reversion
        const acf1 = stats.pearsonCorrelation(returns.slice(0, -1), returns.slice(1));
        const halfLife = acf1 !== 0 ? -Math.log(2) / Math.log(Math.abs(acf1)) : Infinity;
        
        const avgVolume = stats.mean(volumes);
        const totalTrades = trades.length;
        const avgTradeSize = totalTrades > 0 ? stats.mean(trades.map(t => t.size)) : 0;
        
        const powerLaw = stats.fitPowerLaw(trades.map(t => t.size).filter(s => s > 0));
        
        const statsData = {
            'Price Points': prices.length,
            'Total Trades': totalTrades,
            'Avg Volume': ui.formatDollar(avgVolume),
            'Avg Trade Size': ui.formatDollar(avgTradeSize),
            'Variance Ratio': ui.formatNumber(varianceRatio, 3),
            'Half-Life (periods)': halfLife < 100 ? ui.formatNumber(halfLife, 1) : '∞',
            'ACF(1)': ui.formatNumber(acf1, 3),
            'Power Law α': ui.formatNumber(powerLaw.exponent, 3)
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Autocorrelation Function',
                text: 'Measures how price returns correlate with their own lagged values. Positive ACF suggests momentum; negative suggests mean reversion. Values outside confidence bands are statistically significant.'
            },
            {
                title: 'Variance Ratio Test',
                text: 'Tests random walk hypothesis. VR = 1 suggests efficient price discovery. VR > 1 indicates positive autocorrelation (trends); VR < 1 indicates mean reversion.'
            },
            {
                title: 'Trade Size Distribution',
                text: 'Follows power law: P(size) ∝ size^(-α). Exponent α ≈ 1.5-2.5 is typical in financial markets. Smaller α means heavier tails (more large trades).'
            }
        ];
        
        const panel = ui.createMethodologyPanel('Understanding Price Discovery', sections);
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
