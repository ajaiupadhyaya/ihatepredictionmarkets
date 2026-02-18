// Module 9: Tail Risk & Favorite-Longshot Bias
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager.js';

export default class TailRiskModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('tail-risk');
        
        if (!this.data || !this.data.markets || this.data.markets.length === 0) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Tail Risk & Favorite-Longshot Bias</h2>
                    <p class="text-slate-400">How markets price very low and very high probability events</p>
                </div>
                
                <div class="grid grid-cols-1 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Favorite-Longshot Bias</div>
                                <div class="card-subtitle">Implied Probability vs. Realized Frequency</div>
                            </div>
                        </div>
                        <div id="bias-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Beta Distribution Fit</div>
                                <div class="card-subtitle">Probability density of final prices</div>
                            </div>
                        </div>
                        <div id="beta-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Tail Event Dashboard</div>
                                <div class="card-subtitle">Extreme probability analysis</div>
                            </div>
                        </div>
                        <div id="tail-dashboard" class="p-6"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all components
        this.renderBiasChart();
        this.renderBetaChart();
        this.renderTailDashboard();
        this.renderStats();
        this.renderMethodology();
    }
    
    renderBiasChart() {
        const container = d3.select('#bias-chart');
        const width = container.node().clientWidth;
        const height = 500;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Bin markets by implied probability
        const binSize = 0.05;
        const bins = [];
        for (let i = 0; i < 1; i += binSize) {
            const marketsInBin = this.data.markets.filter(m => 
                m.finalProbability >= i && m.finalProbability < i + binSize
            );
            
            if (marketsInBin.length > 0) {
                const realizedFreq = stats.mean(marketsInBin.map(m => m.outcome));
                const impliedProb = i + binSize / 2;
                const count = marketsInBin.length;
                
                bins.push({
                    impliedProb,
                    realizedFreq,
                    count,
                    bias: realizedFreq - impliedProb
                });
            }
        }
        
        // Apply LOWESS smoother
        const x_vals = bins.map(b => b.impliedProb);
        const y_vals = bins.map(b => b.realizedFreq);
        const smoothed = stats.lowess(x_vals, y_vals, 0.3);
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);
        
        // Perfect calibration line
        g.append('line')
            .attr('x1', x(0))
            .attr('y1', y(0))
            .attr('x2', x(1))
            .attr('y2', y(1))
            .attr('stroke', '#475569')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        g.append('text')
            .attr('x', chartWidth - 80)
            .attr('y', 30)
            .attr('fill', '#64748b')
            .attr('font-size', '11px')
            .text('Perfect Calibration');
        
        // Scatter points (binned data)
        const sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(bins, d => d.count)])
            .range([3, 15]);
        
        const colorScale = d3.scaleLinear()
            .domain([-0.15, 0, 0.15])
            .range(['#ef4444', '#fbbf24', '#10b981']);
        
        const circles = g.selectAll('circle')
            .data(bins)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.impliedProb))
            .attr('cy', d => y(d.realizedFreq))
            .attr('r', 0)
            .attr('fill', d => colorScale(d.bias))
            .attr('opacity', 0.7)
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer');
        
        // Animate
        circles.transition()
            .duration(600)
            .delay((d, i) => i * 50)
            .attr('r', d => sizeScale(d.count));
        
        // LOWESS curve
        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y))
            .curve(d3.curveMonotoneX);
        
        const smoothedData = smoothed.map((y, i) => ({ x: x_vals[i], y }));
        
        const path = g.append('path')
            .datum(smoothedData)
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
            .attr('stroke-dashoffset', 0)
            .on('end', () => path.attr('stroke-dasharray', null));
        
        // Tooltips
        circles.on('mouseover', (event, d) => {
            const content = `
                <div class="tooltip-title">Bin: ${ui.formatPercent(d.impliedProb, 0)}</div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Implied Prob:</span>
                    <span class="tooltip-value">${ui.formatPercent(d.impliedProb)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Realized Freq:</span>
                    <span class="tooltip-value">${ui.formatPercent(d.realizedFreq)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Bias:</span>
                    <span class="tooltip-value ${d.bias > 0 ? 'text-green-400' : 'text-red-400'}">${ui.formatNumber(d.bias, 3)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Markets:</span>
                    <span class="tooltip-value">${d.count}</span>
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
            .call(d3.axisLeft(y).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Implied Probability (Market Price)');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Realized Frequency (Actual Outcomes)');
        
        // Bias regions
        g.append('text')
            .attr('x', x(0.15))
            .attr('y', y(0.3))
            .attr('fill', '#ef4444')
            .attr('opacity', 0.5)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text('Longshots Overpriced');
        
        g.append('text')
            .attr('x', x(0.75))
            .attr('y', y(0.6))
            .attr('fill', '#ef4444')
            .attr('opacity', 0.5)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text('Favorites Underpriced');
    }
    
    renderBetaChart() {
        const container = d3.select('#beta-chart');
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
        
        // Fit beta distribution to final probabilities
        const probabilities = this.data.markets.map(m => m.finalProbability);
        const betaParams = stats.fitBeta(probabilities);
        
        // Generate beta PDF
        const pdfData = [];
        for (let p = 0.01; p < 1; p += 0.01) {
            const pdf = betaPDF(p, betaParams.alpha, betaParams.beta);
            pdfData.push({ x: p, y: pdf });
        }
        
        // Histogram of actual data
        const histogram = d3.histogram()
            .domain([0, 1])
            .thresholds(20);
        
        const bins = histogram(probabilities);
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        
        const maxDensity = Math.max(
            d3.max(bins, d => d.length / probabilities.length / 0.05),
            d3.max(pdfData, d => d.y)
        );
        
        const y = d3.scaleLinear()
            .domain([0, maxDensity])
            .nice()
            .range([chartHeight, 0]);
        
        // Histogram bars
        const bars = g.selectAll('rect')
            .data(bins)
            .enter()
            .append('rect')
            .attr('x', d => x(d.x0))
            .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr('y', chartHeight)
            .attr('height', 0)
            .attr('fill', '#64748b')
            .attr('opacity', 0.5);
        
        // Animate bars
        bars.transition()
            .duration(600)
            .delay((d, i) => i * 30)
            .attr('y', d => y(d.length / probabilities.length / (d.x1 - d.x0)))
            .attr('height', d => chartHeight - y(d.length / probabilities.length / (d.x1 - d.x0)));
        
        // Beta PDF curve
        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y))
            .curve(d3.curveCatmullRom);
        
        g.append('path')
            .datum(pdfData)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#22d3ee')
            .attr('stroke-width', 3);
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => ui.formatNumber(d, 1)))
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
            .text('Density');
        
        // Beta parameters legend
        const legend = g.append('g')
            .attr('transform', `translate(${chartWidth - 150}, 20)`);
        
        legend.append('rect')
            .attr('width', 140)
            .attr('height', 65)
            .attr('fill', '#1e293b')
            .attr('stroke', '#334155')
            .attr('stroke-width', 1)
            .attr('rx', 4);
        
        legend.append('text')
            .attr('x', 10)
            .attr('y', 20)
            .attr('fill', '#22d3ee')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text('Beta Distribution');
        
        legend.append('text')
            .attr('x', 10)
            .attr('y', 38)
            .attr('fill', '#e2e8f0')
            .attr('font-size', '10px')
            .text(`α = ${ui.formatNumber(betaParams.alpha, 2)}`);
        
        legend.append('text')
            .attr('x', 10)
            .attr('y', 53)
            .attr('fill', '#e2e8f0')
            .attr('font-size', '10px')
            .text(`β = ${ui.formatNumber(betaParams.beta, 2)}`);
    }
    
    renderTailDashboard() {
        const container = document.getElementById('tail-dashboard');
        
        // Calculate tail statistics
        const markets = this.data.markets;
        const longshots = markets.filter(m => m.finalProbability < 0.1);
        const favorites = markets.filter(m => m.finalProbability > 0.9);
        const midrange = markets.filter(m => m.finalProbability >= 0.3 && m.finalProbability <= 0.7);
        
        const longshotWinRate = longshots.length > 0 ? stats.mean(longshots.map(m => m.outcome)) : 0;
        const favoriteWinRate = favorites.length > 0 ? stats.mean(favorites.map(m => m.outcome)) : 0;
        const midrangeWinRate = midrange.length > 0 ? stats.mean(midrange.map(m => m.outcome)) : 0;
        
        const longshotAvgProb = longshots.length > 0 ? stats.mean(longshots.map(m => m.finalProbability)) : 0;
        const favoriteAvgProb = favorites.length > 0 ? stats.mean(favorites.map(m => m.finalProbability)) : 0;
        
        // Create dashboard
        const dashboard = document.createElement('div');
        dashboard.className = 'space-y-4';
        
        // Longshots section
        const longshotCard = createTailCard(
            'Longshots (<10%)',
            longshotAvgProb,
            longshotWinRate,
            longshots.length,
            '#ef4444'
        );
        
        const favoritesCard = createTailCard(
            'Favorites (>90%)',
            favoriteAvgProb,
            favoriteWinRate,
            favorites.length,
            '#10b981'
        );
        
        const midrangeCard = createTailCard(
            'Midrange (30-70%)',
            0.5,
            midrangeWinRate,
            midrange.length,
            '#fbbf24'
        );
        
        dashboard.appendChild(longshotCard);
        dashboard.appendChild(favoritesCard);
        dashboard.appendChild(midrangeCard);
        
        container.appendChild(dashboard);
        
        function createTailCard(title, avgProb, winRate, count, color) {
            const card = document.createElement('div');
            card.className = 'bg-slate-800/30 rounded-lg p-4 border border-slate-700';
            
            const bias = winRate - avgProb;
            const biasColor = bias > 0.02 ? '#10b981' : bias < -0.02 ? '#ef4444' : '#fbbf24';
            
            card.innerHTML = `
                <div class="flex items-center justify-between mb-3">
                    <div class="text-sm font-semibold" style="color: ${color};">${title}</div>
                    <div class="text-xs text-slate-400">${count} markets</div>
                </div>
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <div class="text-xs text-slate-400 mb-1">Avg Implied</div>
                        <div class="font-mono text-lg font-bold text-slate-200">${ui.formatPercent(avgProb)}</div>
                    </div>
                    <div>
                        <div class="text-xs text-slate-400 mb-1">Realized</div>
                        <div class="font-mono text-lg font-bold text-slate-200">${ui.formatPercent(winRate)}</div>
                    </div>
                    <div>
                        <div class="text-xs text-slate-400 mb-1">Bias</div>
                        <div class="font-mono text-lg font-bold" style="color: ${biasColor};">${bias > 0 ? '+' : ''}${ui.formatNumber(bias, 3)}</div>
                    </div>
                </div>
            `;
            
            return card;
        }
    }
    
    renderStats() {
        const markets = this.data.markets;
        const probabilities = markets.map(m => m.finalProbability);
        const outcomes = markets.map(m => m.outcome);
        
        // Calculate tail statistics
        const betaParams = stats.fitBeta(probabilities);
        const gini = stats.giniCoefficient(probabilities);
        
        // Quantiles
        const q10 = d3.quantile(probabilities.sort(d3.ascending), 0.1);
        const q90 = d3.quantile(probabilities.sort(d3.ascending), 0.9);
        
        // Brier in different regions
        const tailMarkets = markets.filter(m => m.finalProbability < 0.2 || m.finalProbability > 0.8);
        const tailBrier = stats.brierScore(
            tailMarkets.map(m => m.finalProbability),
            tailMarkets.map(m => m.outcome)
        );
        
        const midMarkets = markets.filter(m => m.finalProbability >= 0.3 && m.finalProbability <= 0.7);
        const midBrier = stats.brierScore(
            midMarkets.map(m => m.finalProbability),
            midMarkets.map(m => m.outcome)
        );
        
        const statsData = {
            'Total Markets': markets.length,
            'Beta α': ui.formatNumber(betaParams.alpha, 3),
            'Beta β': ui.formatNumber(betaParams.beta, 3),
            'Gini Coefficient': ui.formatNumber(gini, 3),
            '10th Percentile': ui.formatPercent(q10),
            '90th Percentile': ui.formatPercent(q90),
            'Tail Brier Score': ui.formatNumber(tailBrier, 4),
            'Mid Brier Score': ui.formatNumber(midBrier, 4)
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Favorite-Longshot Bias',
                text: 'Markets systematically overprice longshots (low probability events) and underprice favorites. The LOWESS curve shows the relationship between implied probabilities and actual outcomes.'
            },
            {
                title: 'Beta Distribution',
                text: 'We fit a Beta(α, β) distribution to the final probabilities. This captures how the market distributes confidence across the probability spectrum.'
            },
            {
                title: 'Tail Risk Metrics',
                text: 'We compare implied probabilities vs. realized frequencies in three regions: longshots (<10%), midrange (30-70%), and favorites (>90%). Bias = Realized - Implied.'
            }
        ];
        
        const formulas = `
            <div class="mt-4 text-sm">
                <p class="text-slate-400 mb-2">Beta PDF:</p>
                <div class="bg-slate-900/50 p-3 rounded border border-slate-700">
                    <p>$$f(x; \\alpha, \\beta) = \\frac{x^{\\alpha-1}(1-x)^{\\beta-1}}{B(\\alpha, \\beta)}$$</p>
                </div>
            </div>
        `;
        
        const panel = ui.createMethodologyPanel('Understanding Tail Risk', sections);
        panel.querySelector('.methodology-content').insertAdjacentHTML('beforeend', formulas);
        
        document.getElementById('methodology-panel').appendChild(panel);
    }
    
    async update() {
        this.container.innerHTML = '';
        await this.render();
    }
    
    destroy() {
        this.container.innerHTML = '';
    }
}

// Beta PDF helper function
function betaPDF(x, alpha, beta) {
    if (x <= 0 || x >= 1) return 0;
    
    const logBeta = gammaLn(alpha) + gammaLn(beta) - gammaLn(alpha + beta);
    const logPDF = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logBeta;
    
    return Math.exp(logPDF);
}

// Log-gamma function
function gammaLn(x) {
    const cof = [
        76.18009172947146, -86.50532032941677, 24.01409824083091,
        -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
    ];
    
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    
    for (let j = 0; j < 6; j++) {
        ser += cof[j] / ++y;
    }
    
    return -tmp + Math.log(2.5066282746310005 * ser / x);
}
