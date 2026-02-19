// Module 6: Liquidity Heatmap
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager';

export default class LiquidityModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('liquidity');
        
        if (!this.data || !this.data.markets || this.data.markets.length === 0) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Market Liquidity & Participation</h2>
                    <p class="text-slate-400">Analyzing volume, spreads, and market depth across categories</p>
                </div>
                
                <div class="grid grid-cols-1 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Category Liquidity Heatmap</div>
                                <div class="card-subtitle">Volume and market depth by category</div>
                            </div>
                        </div>
                        <div id="heatmap-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Liquidity Distribution</div>
                                <div class="card-subtitle">Lorenz curve and Gini coefficient</div>
                            </div>
                        </div>
                        <div id="lorenz-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Price Impact Analysis</div>
                                <div class="card-subtitle">Kyle's Lambda by category</div>
                            </div>
                        </div>
                        <div id="impact-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all components
        this.renderHeatmap();
        this.renderLorenzCurve();
        this.renderImpactChart();
        this.renderStats();
        this.renderMethodology();
    }
    
    renderHeatmap() {
        const container = d3.select('#heatmap-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 120, bottom: 80, left: 120 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Aggregate by category and platform
        const categories = Array.from(new Set(this.data.markets.map(m => m.category)));
        const platforms = Array.from(new Set(this.data.markets.map(m => m.platform)));
        
        const heatmapData = [];
        categories.forEach(category => {
            platforms.forEach(platform => {
                const markets = this.data.markets.filter(m => 
                    m.category === category && m.platform === platform
                );
                
                if (markets.length > 0) {
                    const totalVolume = d3.sum(markets, m => m.volume || 0);
                    const avgLiquidity = stats.mean(markets.map(m => m.liquidity || 0.5));
                    const avgKyleLambda = stats.mean(markets.map(m => 
                        stats.kyleLambda(m.priceHistory?.map(p => p.price) || [0.5], 
                                        m.priceHistory?.map(p => p.volume) || [1000])
                    ));
                    
                    heatmapData.push({
                        category,
                        platform,
                        volume: totalVolume,
                        liquidity: avgLiquidity,
                        kyleLambda: avgKyleLambda,
                        count: markets.length
                    });
                }
            });
        });

        if (heatmapData.length === 0) {
            container.html('<div class="text-slate-400 p-4">Insufficient data to render heatmap</div>');
            return;
        }
        
        // Scales
        const x = d3.scaleBand()
            .domain(platforms)
            .range([0, chartWidth])
            .padding(0.05);
        
        const y = d3.scaleBand()
            .domain(categories)
            .range([0, chartHeight])
            .padding(0.05);
        
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, d3.max(heatmapData, d => Math.log(d.volume + 1))]);
        
        // Cells
        const cells = g.selectAll('rect')
            .data(heatmapData)
            .enter()
            .append('rect')
            .attr('x', d => x(d.platform))
            .attr('y', d => y(d.category))
            .attr('width', x.bandwidth())
            .attr('height', y.bandwidth())
            .attr('fill', d => colorScale(Math.log(d.volume + 1)))
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 1)
            .attr('opacity', 0)
            .style('cursor', 'pointer');
        
        // Animate
        cells.transition()
            .duration(600)
            .delay((d, i) => i * 30)
            .attr('opacity', 1);
        
        // Tooltips
        cells.on('mouseover', (event, d) => {
            const content = `
                <div class="tooltip-title">${d.category} • ${d.platform}</div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Total Volume:</span>
                    <span class="tooltip-value">${ui.formatDollar(d.volume)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Avg Liquidity:</span>
                    <span class="tooltip-value">${ui.formatNumber(d.liquidity, 3)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Kyle's Lambda:</span>
                    <span class="tooltip-value">${ui.formatNumber(d.kyleLambda, 5)}</span>
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
            .call(d3.axisBottom(x))
            .attr('color', '#94a3b8')
            .selectAll('text')
            .attr('font-size', '10px')
            .attr('transform', 'rotate(-45)')
            .attr('text-anchor', 'end');
        
        g.append('g')
            .call(d3.axisLeft(y))
            .attr('color', '#94a3b8')
            .selectAll('text')
            .attr('font-size', '10px');
        
        // Color legend
        const legendWidth = 20;
        const legendHeight = chartHeight;
        
        const legendScale = d3.scaleLinear()
            .domain(colorScale.domain())
            .range([legendHeight, 0]);
        
        const legend = svg.append('g')
            .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`);
        
        // Gradient
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'liquidity-gradient')
            .attr('x1', '0%')
            .attr('y1', '100%')
            .attr('x2', '0%')
            .attr('y2', '0%');
        
        const numStops = 10;
        for (let i = 0; i <= numStops; i++) {
            const t = i / numStops;
            const value = colorScale.domain()[0] + t * (colorScale.domain()[1] - colorScale.domain()[0]);
            gradient.append('stop')
                .attr('offset', `${t * 100}%`)
                .attr('stop-color', colorScale(value));
        }
        
        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('fill', 'url(#liquidity-gradient)');
        
        legend.append('g')
            .attr('transform', `translate(${legendWidth}, 0)`)
            .call(d3.axisRight(legendScale).ticks(5).tickFormat(d => ui.formatDollar(Math.exp(d))))
            .attr('color', '#94a3b8')
            .selectAll('text')
            .attr('font-size', '9px');
        
        legend.append('text')
            .attr('x', legendWidth / 2)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '10px')
            .text('Volume');
    }
    
    renderLorenzCurve() {
        const container = d3.select('#lorenz-chart');
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
        
        // Calculate Lorenz curve
        const volumes = this.data.markets.map(m => m.volume || 0).sort(d3.ascending);
        const totalVolume = d3.sum(volumes);
        
        const lorenzData = [{ x: 0, y: 0 }];
        let cumVolume = 0;
        volumes.forEach((v, i) => {
            cumVolume += v;
            lorenzData.push({
                x: (i + 1) / volumes.length,
                y: cumVolume / totalVolume
            });
        });
        
        // Calculate Gini
        const gini = stats.giniCoefficient(volumes);
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);
        
        // Perfect equality line
        g.append('line')
            .attr('x1', x(0))
            .attr('y1', y(0))
            .attr('x2', x(1))
            .attr('y2', y(1))
            .attr('stroke', '#475569')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        g.append('text')
            .attr('x', chartWidth - 100)
            .attr('y', 30)
            .attr('fill', '#64748b')
            .attr('font-size', '11px')
            .text('Perfect Equality');
        
        // Lorenz curve
        const line = d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y))
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
            .attr('stroke-dashoffset', 0)
            .on('end', () => path.attr('stroke-dasharray', null));
        
        // Fill area between curves (inequality)
        const area = d3.area()
            .x(d => x(d.x))
            .y0(d => y(d.x)) // Perfect equality
            .y1(d => y(d.y)) // Actual
            .curve(d3.curveMonotoneX);
        
        g.append('path')
            .datum(lorenzData)
            .attr('d', area)
            .attr('fill', '#fbbf24')
            .attr('opacity', 0.2);
        
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
            .text('Cumulative % of Markets');
        
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
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight /  2)
            .attr('text-anchor', 'middle')
            .attr('fill', '#22d3ee')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .text(`Gini = ${ui.formatNumber(gini, 3)}`);
    }
    
    renderImpactChart() {
        const container = d3.select('#impact-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 80, left: 60 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Calculate Kyle's Lambda by category
        const categories = Array.from(new Set(this.data.markets.map(m => m.category)));
        
        const impactData = categories.map(category => {
            const markets = this.data.markets.filter(m => m.category === category);
            const lambdas = markets.map(m => {
                const prices = m.priceHistory?.map(p => p.price) || [0.5];
                const volumes = m.priceHistory?.map(p => p.volume) || [1000];
                return stats.kyleLambda(prices, volumes);
            });
            
            return {
                category,
                avgKyleLambda: stats.mean(lambdas),
                count: markets.length
            };
        }).sort((a, b) => a.avgKyleLambda - b.avgKyleLambda);

        if (impactData.length === 0) {
            container.html('<div class="text-slate-400 p-4">Insufficient data to render impact chart</div>');
            return;
        }
        
        // Scales
        const x = d3.scaleBand()
            .domain(impactData.map(d => d.category))
            .range([0, chartWidth])
            .padding(0.3);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(impactData, d => d.avgKyleLambda)])
            .nice()
            .range([chartHeight, 0]);
        
        // Color scale
        const colorScale = d3.scaleSequential(d3.interpolateCool)
            .domain([d3.max(impactData, d => d.avgKyleLambda), 0]);
        
        // Bars
        const bars = g.selectAll('rect')
            .data(impactData)
            .enter()
            .append('rect')
            .attr('x', d => x(d.category))
            .attr('width', x.bandwidth())
            .attr('y', chartHeight)
            .attr('height', 0)
            .attr('fill', d => colorScale(d.avgKyleLambda))
            .attr('opacity', 0.9)
            .style('cursor', 'pointer');
        
        // Animate
        bars.transition()
            .duration(600)
            .delay((d, i) => i * 100)
            .attr('y', d => y(d.avgKyleLambda))
            .attr('height', d => chartHeight - y(d.avgKyleLambda));
        
        // Value labels
        g.selectAll('text.value')
            .data(impactData)
            .enter()
            .append('text')
            .attr('class', 'value')
            .attr('x', d => x(d.category) + x.bandwidth() / 2)
            .attr('y', d => y(d.avgKyleLambda) - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e2e8f0')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'JetBrains Mono')
            .text(d => ui.formatNumber(d.avgKyleLambda, 5));
        
        // Tooltips
        bars.on('mouseover', (event, d) => {
            const content = `
                <div class="tooltip-title">${d.category}</div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Kyle's Lambda:</span>
                    <span class="tooltip-value">${ui.formatNumber(d.avgKyleLambda, 6)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Markets:</span>
                    <span class="tooltip-value">${d.count}</span>
                </div>
                <div class="tooltip-note">Lower is more liquid</div>
            `;
            ui.showTooltip(event.pageX, event.pageY, content);
        })
        .on('mouseout', () => {
            ui.hideTooltip();
        });
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x))
            .attr('color', '#94a3b8')
            .selectAll('text')
            .attr('font-size', '10px')
            .attr('transform', 'rotate(-45)')
            .attr('text-anchor', 'end');
        
        g.append('g')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => ui.formatNumber(d, 5)))
            .attr('color', '#94a3b8');
        
        // Label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text("Kyle's Lambda (Price Impact)");
    }
    
    renderStats() {
        const markets = this.data.markets;

        if (!markets || markets.length === 0) {
            const statsPanel = document.getElementById('stats-panel');
            statsPanel.appendChild(ui.createStatsGrid({
                'Total Markets': 0,
                'Total Volume': 'N/A',
                'Avg Volume': 'N/A',
                'Median Volume': 'N/A',
                'Gini Coefficient': 'N/A',
                'Top 10% Share': 'N/A',
                'Avg Liquidity Score': 'N/A',
                'Liquid Markets (>0.7)': 0
            }));
            return;
        }
        const volumes = markets.map(m => m.volume || 0);
        const liquidities = markets.map(m => m.liquidity || 0.5);
        
        // Calculate aggregate stats
        const totalVolume = d3.sum(volumes);
        const avgVolume = stats.mean(volumes);
        const medianVolume = d3.median(volumes);
        const gini = stats.giniCoefficient(volumes);
        
        const avgLiquidity = stats.mean(liquidities);
        const top10Volume = d3.sum(volumes.sort((a, b) => b - a).slice(0, Math.floor(markets.length * 0.1)));
        const top10Share = totalVolume > 0 ? top10Volume / totalVolume : 0;
        
        const statsData = {
            'Total Markets': markets.length,
            'Total Volume': ui.formatDollar(totalVolume),
            'Avg Volume': ui.formatDollar(avgVolume),
            'Median Volume': ui.formatDollar(medianVolume),
            'Gini Coefficient': ui.formatNumber(gini, 3),
            'Top 10% Share': ui.formatPercent(top10Share),
            'Avg Liquidity Score': ui.formatNumber(avgLiquidity, 3),
            'Liquid Markets (>0.7)': markets.filter(m => (m.liquidity || 0) > 0.7).length
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Kyle\'s Lambda',
                text: 'Measures price impact per unit of trading volume. Lower values indicate more liquid markets where trades don\'t move prices as much. Calculated from regression of price changes on signed volume.'
            },
            {
                title: 'Lorenz Curve & Gini',
                text: 'The Lorenz curve shows cumulative volume distribution. The Gini coefficient (0-1) measures inequality: 0 = perfect equality, 1 = maximum inequality. Higher Gini means volume is concentrated in fewer markets.'
            },
            {
                title: 'Liquidity Score',
                text: 'Composite metric combining trading volume, bid-ask spread, and market depth. Scores range from 0 (illiquid) to 1 (highly liquid). Values above 0.7 indicate good liquidity.'
            }
        ];
        
        const formulas = `
            <div class="mt-4 text-sm">
                <p class="text-slate-400 mb-2">Kyle's Lambda:</p>
                <div class="bg-slate-900/50 p-3 rounded border border-slate-700">
                    <p>$$\\lambda = \\frac{\\text{Cov}(\\Delta P, Q)}{\\text{Var}(Q)}$$</p>
                    <p class="text-xs text-slate-400 mt-2">where ΔP = price change, Q = signed volume</p>
                </div>
            </div>
        `;
        
        const panel = ui.createMethodologyPanel('Understanding Liquidity Metrics', sections);
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
