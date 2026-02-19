// Module 8: Whale Detection
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager.js';
import p5 from 'p5';

export default class WhalesModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
        this.p5Instance = null;
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('whales');
        
        if (!this.data || !this.data.trades) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Whale Detection & Market Microstructure</h2>
                    <p class="text-slate-400">Identifying large traders and analyzing their price impact</p>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Trade Impact Simulation</div>
                                <div class="card-subtitle">P5.js visualization</div>
                            </div>
                        </div>
                        <div id="impact-sim" style="height: 400px;"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Price Impact Function</div>
                                <div class="card-subtitle">Square-root model fit</div>
                            </div>
                        </div>
                        <div id="impact-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Trade Concentration</div>
                                <div class="card-subtitle">Cumulative volume distribution</div>
                            </div>
                        </div>
                        <div id="concentration-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Top Whales</div>
                                <div class="card-subtitle">Largest traders by volume</div>
                            </div>
                        </div>
                        <div id="whale-table" class="overflow-auto" style="max-height: 400px;"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all components
        this.renderImpactSimulation();
        this.renderImpactChart();
        this.renderConcentrationChart();
        this.renderWhaleTable();
        this.renderStats();
        this.renderMethodology();
    }
    
    renderImpactSimulation() {
        const containerEl = document.getElementById('impact-sim');
        const width = containerEl.clientWidth;
        const height = 400;
        
        const trades = this.data.trades || [];
        const maxSize = d3.max(trades, d => d.size) || 10000;
        
        const sketch = (p) => {
            let particles = [];
            let ripples = [];
            let tradeIndex = 0;
            let frameCounter = 0;
            const centerY = height / 2;
            
            class Particle {
                constructor(trade) {
                    this.x = 50;
                    this.y = centerY;
                    this.targetX = width - 50;
                    this.size = p.map(trade.size, 0, maxSize, 5, 25);
                    this.isBuy = trade.isBuy;
                    this.impact = p.map(trade.priceImpact, 0, 0.1, 0, 50);
                    this.speed = p.map(this.size, 5, 25, 4, 1.5);
                    this.alpha = 255;
                    this.trail = [];
                }
                
                update() {
                    // Store trail
                    this.trail.push({ x: this.x, y: this.y });
                    if (this.trail.length > 10) this.trail.shift();
                    
                    // Move right
                    this.x += this.speed;
                    
                    // Oscillate based on impact
                    this.y = centerY + this.impact * p.sin(this.x * 0.05);
                    
                    // Fade when reaching target
                    if (this.x > this.targetX) {
                        this.alpha -= 5;
                    }
                }
                
                display() {
                    // Draw trail
                    p.stroke(this.isBuy ? 16 : 239, this.isBuy ? 185 : 68, this.isBuy ? 129 : 68, this.alpha * 0.3);
                    p.strokeWeight(2);
                    p.noFill();
                    p.beginShape();
                    for (let pt of this.trail) {
                        p.vertex(pt.x, pt.y);
                    }
                    p.endShape();
                    
                    // Draw particle
                    p.noStroke();
                    if (this.isBuy) {
                        p.fill(16, 185, 129, this.alpha); // Green
                    } else {
                        p.fill(239, 68, 68, this.alpha); // Red
                    }
                    p.ellipse(this.x, this.y, this.size);
                    
                    // Draw glow for large trades
                    if (this.size > 15) {
                        p.fill(this.isBuy ? 16 : 239, this.isBuy ? 185 : 68, this.isBuy ? 129 : 68, this.alpha * 0.2);
                        p.ellipse(this.x, this.y, this.size * 1.5);
                    }
                }
                
                isDead() {
                    return this.alpha <= 0;
                }
            }
            
            class Ripple {
                constructor(x, y, maxRadius) {
                    this.x = x;
                    this.y = y;
                    this.radius = 0;
                    this.maxRadius = maxRadius;
                    this.alpha = 255;
                }
                
                update() {
                    this.radius += 2;
                    this.alpha -= 5;
                }
                
                display() {
                    p.noFill();
                    p.stroke(34, 211, 238, this.alpha);
                    p.strokeWeight(2);
                    p.ellipse(this.x, this.y, this.radius);
                }
                
                isDead() {
                    return this.radius >= this.maxRadius || this.alpha <= 0;
                }
            }
            
            p.setup = () => {
                p.createCanvas(width, height);
                p.background(15, 23, 42);
            };
            
            p.draw = () => {
                p.background(15, 23, 42, 50); // Fade effect
                
                // Baseline
                p.stroke(100, 100, 100, 100);
                p.strokeWeight(1);
                p.line(0, centerY, width, centerY);
                
                // Add new particles
                frameCounter++;
                if (frameCounter % 20 === 0 && tradeIndex < trades.length) {
                    const trade = trades[tradeIndex];
                    particles.push(new Particle(trade));
                    
                    // Create ripple for large trades
                    if (trade.size > maxSize * 0.3) {
                        ripples.push(new Ripple(50, centerY, p.map(trade.size, 0, maxSize, 30, 100)));
                    }
                    
                    tradeIndex++;
                    if (tradeIndex >= trades.length) tradeIndex = 0;
                }
                
                // Update and display ripples
                for (let i = ripples.length - 1; i >= 0; i--) {
                    ripples[i].update();
                    ripples[i].display();
                    if (ripples[i].isDead()) {
                        ripples.splice(i, 1);
                    }
                }
                
                // Update and display particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    particles[i].update();
                    particles[i].display();
                    if (particles[i].isDead()) {
                        particles.splice(i, 1);
                    }
                }
                
                // Labels
                p.noStroke();
                p.fill(148, 163, 184);
                p.textSize(11);
                p.textAlign(p.LEFT);
                p.text('Large trades create bigger ripples', 10, 25);
                p.text('Vertical displacement = price impact', 10, 40);
            };
        };
        
        this.p5Instance = new p5(sketch, containerEl);
    }
    
    renderImpactChart() {
        const container = d3.select('#impact-chart');
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
        
        // Aggregate trade data
        const trades = this.data.trades || [];
        const impactData = trades.map(t => ({
            size: t.size,
            impact: Math.abs(t.priceImpact)
        })).filter(d => d.impact > 0 && d.size > 0);
        
        if (impactData.length < 2) {
            container.innerHTML = '<div class="text-slate-400 p-4">Insufficient data to render price impact chart</div>';
            return;
        }
        
        // Fit square-root model: impact = k * sqrt(size)
        const logSizes = impactData.map(d => Math.log(d.size)).filter(x => isFinite(x));
        const logImpacts = impactData.map(d => Math.log(d.impact)).filter(x => isFinite(x));
        
        if (logSizes.length < 2 || logImpacts.length < 2 || logSizes.length !== logImpacts.length) {
            container.innerHTML = '<div class="text-slate-400 p-4">Insufficient valid data for regression</div>';
            return;
        }
        
        const correlation = stats.pearsonCorrelation(logSizes, logImpacts);
        
        const meanLogSize = stats.mean(logSizes);
        const meanLogImpact = stats.mean(logImpacts);
        const slope = correlation * stats.standardDeviation(logImpacts) / stats.standardDeviation(logSizes);
        const intercept = meanLogImpact - slope * meanLogSize;
        
        // Scales
        const x = d3.scaleLog()
            .domain(d3.extent(impactData, d => d.size))
            .range([0, chartWidth]);
        
        const y = d3.scaleLog()
            .domain(d3.extent(impactData, d => d.impact))
            .nice()
            .range([chartHeight, 0]);
        
        // Scatter points
        const points = g.selectAll('circle')
            .data(impactData)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.size))
            .attr('cy', d => y(d.impact))
            .attr('r', 0)
            .attr('fill', '#22d3ee')
            .attr('opacity', 0.6);
        
        // Animate
        points.transition()
            .duration(600)
            .delay((d, i) => i * 2)
            .attr('r', 4);
        
        // Fitted line
        const fitLine = d3.range(d3.min(impactData, d => d.size), d3.max(impactData, d => d.size), 
            (d3.max(impactData, d => d.size) - d3.min(impactData, d => d.size)) / 100)
            .map(size => ({
                x: size,
                y: Math.exp(intercept + slope * Math.log(size))
            }));
        
        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y));
        
        g.append('path')
            .datum(fitLine)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 2.5);
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(5, '.0s'))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y).ticks(5, '.2%'))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Trade Size ($, log scale)');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Price Impact (%, log scale)');
        
        // Model annotation
        g.append('text')
            .attr('x', chartWidth - 10)
            .attr('y', 30)
            .attr('text-anchor', 'end')
            .attr('fill', '#ef4444')
            .attr('font-size', '11px')
            .text(`Exponent: ${ui.formatNumber(slope, 2)}`);
        
        g.append('text')
            .attr('x', chartWidth - 10)
            .attr('y', 45)
            .attr('text-anchor', 'end')
            .attr('fill', '#94a3b8')
            .attr('font-size', '11px')
            .text(`R² = ${ui.formatNumber(correlation * correlation, 3)}`);
    }
    
    renderConcentrationChart() {
        const container = d3.select('#concentration-chart');
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
        
        // Calculate cumulative distribution
        const whales = this.data.whales || [];
        const sortedWhales = [...whales].sort((a, b) => b.totalVolume - a.totalVolume);
        
        const totalVolume = d3.sum(sortedWhales, d => d.totalVolume);
        let cumulative = 0;
        const lorenzData = sortedWhales.map((d, i) => {
            cumulative += d.totalVolume;
            return {
                index: i + 1,
                cumulative: cumulative,
                pctTraders: (i + 1) / sortedWhales.length,
                pctVolume: cumulative / totalVolume
            };
        });
        
        // Add origin
        lorenzData.unshift({ index: 0, cumulative: 0, pctTraders: 0, pctVolume: 0 });
        
        // Calculate Gini coefficient
        const gini = stats.giniCoefficient(whales.map(d => d.totalVolume));
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);
        
        // Equality line (diagonal)
        g.append('line')
            .attr('x1', 0)
            .attr('y1', chartHeight)
            .attr('x2', chartWidth)
            .attr('y2', 0)
            .attr('stroke', '#475569')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '5,5');
        
        // Lorenz curve
        const line = d3.line()
            .x(d => x(d.pctTraders))
            .y(d => y(d.pctVolume))
            .curve(d3.curveMonotoneX);
        
        const path = g.append('path')
            .datum(lorenzData)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#22d3ee')
            .attr('stroke-width', 3);
        
        // Animate path
        const pathLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
            .attr('stroke-dashoffset', pathLength)
            .transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);
        
        // Fill area
        const area = d3.area()
            .x(d => x(d.pctTraders))
            .y0(d => y(d.pctTraders))
            .y1(d => y(d.pctVolume))
            .curve(d3.curveMonotoneX);
        
        g.append('path')
            .datum(lorenzData)
            .attr('d', area)
            .attr('fill', '#22d3ee')
            .attr('opacity', 0.1);
        
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
            .text('Cumulative % of Traders');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Cumulative % of Volume');
        
        // Gini annotation
        g.append('text')
            .attr('x', chartWidth - 10)
            .attr('y', chartHeight - 10)
            .attr('text-anchor', 'end')
            .attr('fill', '#fbbf24')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(`Gini = ${ui.formatNumber(gini, 3)}`);
    }
    
    renderWhaleTable() {
        const container = document.getElementById('whale-table');
        const whales = this.data.whales || [];
        
        // Sort by total volume
        const sortedWhales = [...whales].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 20);
        
        const table = document.createElement('table');
        table.className = 'w-full text-sm';
        
        // Header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr class="border-b border-slate-700">
                <th class="text-left py-2 px-3 text-slate-400 font-medium">Rank</th>
                <th class="text-left py-2 px-3 text-slate-400 font-medium">Trader ID</th>
                <th class="text-right py-2 px-3 text-slate-400 font-medium">Volume</th>
                <th class="text-right py-2 px-3 text-slate-400 font-medium">Trades</th>
                <th class="text-right py-2 px-3 text-slate-400 font-medium">Avg Size</th>
                <th class="text-right py-2 px-3 text-slate-400 font-medium">Win Rate</th>
                <th class="text-right py-2 px-3 text-slate-400 font-medium">PnL</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        sortedWhales.forEach((whale, i) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-800 hover:bg-slate-800 transition-colors';
            
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            const pnlColor = whale.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400';
            
            row.innerHTML = `
                <td class="py-2 px-3 text-slate-300">${medal} ${i + 1}</td>
                <td class="py-2 px-3 text-cyan-400 font-mono text-xs">${whale.address.slice(0, 8)}...</td>
                <td class="py-2 px-3 text-right text-slate-300">${ui.formatDollar(whale.totalVolume)}</td>
                <td class="py-2 px-3 text-right text-slate-300">${whale.tradeCount}</td>
                <td class="py-2 px-3 text-right text-slate-300">${ui.formatDollar(whale.avgTradeSize)}</td>
                <td class="py-2 px-3 text-right text-slate-300">${ui.formatPercent(whale.winRate, 1)}</td>
                <td class="py-2 px-3 text-right ${pnlColor} font-medium">${whale.pnl >= 0 ? '+' : ''}${ui.formatDollar(whale.pnl)}</td>
            `;
            
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        container.appendChild(table);
    }
    
    renderStats() {
        const whales = this.data.whales || [];
        const trades = this.data.trades || [];
        
        const totalVolume = d3.sum(whales, d => d.totalVolume);
        const top10Volume = d3.sum(whales.sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 10), d => d.totalVolume);
        const top10Pct = totalVolume > 0 ? top10Volume / totalVolume : 0;
        
        const whaleSizes = whales.map(d => d.totalVolume);
        const gini = stats.giniCoefficient(whaleSizes);
        const herfindahl = d3.sum(whaleSizes.map(v => Math.pow(v / totalVolume, 2)));
        
        const avgImpact = stats.mean(trades.map(t => Math.abs(t.priceImpact)));
        const maxImpact = d3.max(trades, t => Math.abs(t.priceImpact));
        
        const logSizes = trades.map(t => Math.log(t.size)).filter(x => isFinite(x));
        const logImpacts = trades.map(t => Math.log(Math.abs(t.priceImpact))).filter(x => isFinite(x));
        const sizeStd = logSizes.length > 1 ? stats.standardDeviation(logSizes) : 0;
        const impactStd = logImpacts.length > 1 ? stats.standardDeviation(logImpacts) : 0;
        const impactExponent = logSizes.length > 1 && logImpacts.length > 1 && logSizes.length === logImpacts.length && sizeStd > 0 ?
            stats.pearsonCorrelation(logSizes, logImpacts) * impactStd / sizeStd : 0;
        
        const statsData = {
            'Total Whales': whales.length,
            'Top 10 Volume %': ui.formatPercent(top10Pct, 1),
            'Gini Coefficient': ui.formatNumber(gini, 3),
            'Herfindahl Index': ui.formatNumber(herfindahl, 4),
            'Avg Impact': ui.formatPercent(avgImpact, 3),
            'Max Impact': ui.formatPercent(maxImpact, 2),
            'Impact Exponent': ui.formatNumber(impactExponent, 3),
            'Total Trades': trades.length
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Price Impact Model',
                text: 'Square-root model: impact ∝ size^α where α ≈ 0.5 is typical. Smaller α means more liquid markets. Fitted using log-log regression.'
            },
            {
                title: 'Trade Concentration',
                text: 'Gini coefficient measures inequality. 0 = perfect equality, 1 = one trader has all volume. Typical markets: 0.6-0.8. Lorenz curve shows cumulative distribution.'
            },
            {
                title: 'Whale Detection',
                text: 'Identifies traders with outsized volume. Tracks win rate and PnL to distinguish informed whales from noise traders. Herfindahl index measures market concentration.'
            }
        ];
        
        const panel = ui.createMethodologyPanel('Understanding Market Microstructure', sections);
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
