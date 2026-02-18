// Module 4: Arbitrage Network
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager.js';

export default class ArbitrageModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
        this.simulation = null;
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('arbitrage');
        
        if (!this.data || !this.data.markets || this.data.markets.length === 0) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Cross-Market Arbitrage & Correlations</h2>
                    <p class="text-slate-400">Mapping relationships and arbitrage gaps between related markets</p>
                </div>
                
                <div class="grid grid-cols-1 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Market Correlation Network</div>
                                <div class="card-subtitle">Force-directed graph (drag nodes to explore)</div>
                            </div>
                        </div>
                        <div id="network-chart" class="chart-container" style="height: 500px;"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Correlation Matrix</div>
                                <div class="card-subtitle">Heatmap of pairwise correlations</div>
                            </div>
                        </div>
                        <div id="matrix-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Arbitrage Opportunities</div>
                                <div class="card-subtitle">Top price discrepancies</div>
                            </div>
                        </div>
                        <div id="arbitrage-list" class="p-6" style="max-height: 400px; overflow-y: auto;"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all components
        this.renderNetworkGraph();
        this.renderCorrelationMatrix();
        this.renderArbitrageList();
        this.renderStats();
        this.renderMethodology();
    }
    
    renderNetworkGraph() {
        const container = d3.select('#network-chart');
        const width = container.node().clientWidth;
        const height = 500;
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g');
        
        // Build network from correlated markets
        const markets = this.data.markets.slice(0, 20); // Limit for readability
        
        // Calculate correlations
        const nodes = markets.map((m, i) => ({
            id: m.id,
            title: m.title,
            category: m.category,
            index: i
        }));
        
        const links = [];
        const threshold = 0.5; // Only show correlations > 0.5
        
        for (let i = 0; i < markets.length; i++) {
            for (let j = i + 1; j < markets.length; j++) {
                const prices1 = markets[i].priceHistory?.map(p => p.price) || [];
                const prices2 = markets[j].priceHistory?.map(p => p.price) || [];
                
                if (prices1.length > 10 && prices2.length > 10) {
                    const minLength = Math.min(prices1.length, prices2.length);
                    const corr = stats.pearsonCorrelation(
                        prices1.slice(0, minLength),
                        prices2.slice(0, minLength)
                    );
                    
                    if (Math.abs(corr) > threshold) {
                        links.push({
                            source: i,
                            target: j,
                            correlation: corr,
                            value: Math.abs(corr)
                        });
                    }
                }
            }
        }
        
        // Color scale categories
        const categories = Array.from(new Set(markets.map(m => m.category)));
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(categories);
        
        // Create force simulation
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.index).distance(d => 100 * (1 - d.value)))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(20));
        
        // Links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke', d => d.correlation > 0 ? '#10b981' : '#ef4444')
            .attr('stroke-width', d => 1 + 3 * d.value)
            .attr('opacity', 0.6);
        
        // Nodes
        const node = g.append('g')
            .selectAll('circle')
            .data(nodes)
            .enter()
            .append('circle')
            .attr('r', 8)
            .attr('fill', d => colorScale(d.category))
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 2)
            .style('cursor', 'grab')
            .call(this.drag(this.simulation));
        
        // Labels
        const labels = g.append('g')
            .selectAll('text')
            .data(nodes)
            .enter()
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', -12)
            .attr('fill', '#e2e8f0')
            .attr('font-size', '9px')
            .attr('pointer-events', 'none')
            .text((d, i) => i + 1);
        
        // Tooltips
        node.on('mouseover', (event, d) => {
            const content = `
                <div class="tooltip-title">${d.title.substring(0, 50)}...</div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Category:</span>
                    <span class="tooltip-value">${d.category}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Connections:</span>
                    <span class="tooltip-value">${links.filter(l => l.source.index === d.index || l.target.index === d.index).length}</span>
                </div>
            `;
            ui.showTooltip(event.pageX, event.pageY, content);
        })
        .on('mouseout', () => {
            ui.hideTooltip();
        });
        
        // Update positions on tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            
            labels
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });
        
        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        svg.call(zoom);
        
        // Legend
        const legend = svg.append('g')
            .attr('transform', 'translate(20, 20)');
        
        categories.forEach((category, i) => {
            const lg = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);
            
            lg.append('circle')
                .attr('r', 6)
                .attr('fill', colorScale(category))
                .attr('stroke', '#0f172a')
                .attr('stroke-width', 1);
            
            lg.append('text')
                .attr('x', 12)
                .attr('y', 4)
                .attr('fill', '#e2e8f0')
                .attr('font-size', '10px')
                .text(category);
        });
    }
    
    drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
    
    renderCorrelationMatrix() {
        const container = d3.select('#matrix-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 100, left: 100 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Use subset of markets
        const markets = this.data.markets.slice(0, 10);
        
        // Calculate correlation matrix
        const corrMatrix = [];
        for (let i = 0; i < markets.length; i++) {
            for (let j = 0; j < markets.length; j++) {
                const prices1 = markets[i].priceHistory?.map(p => p.price) || [];
                const prices2 = markets[j].priceHistory?.map(p => p.price) || [];
                
                let corr = 0;
                if (i === j) {
                    corr = 1;
                } else if (prices1.length > 10 && prices2.length > 10) {
                    const minLength = Math.min(prices1.length, prices2.length);
                    corr = stats.pearsonCorrelation(
                        prices1.slice(0, minLength),
                        prices2.slice(0, minLength)
                    );
                }
                
                corrMatrix.push({
                    row: i,
                    col: j,
                    correlation: corr
                });
            }
        }
        
        // Scales
        const cellSize = Math.min(chartWidth, chartHeight) / markets.length;
        
        const x = d3.scaleBand()
            .domain(d3.range(markets.length))
            .range([0, markets.length * cellSize])
            .padding(0.05);
        
        const y = d3.scaleBand()
            .domain(d3.range(markets.length))
            .range([0, markets.length * cellSize])
            .padding(0.05);
        
        const colorScale = d3.scaleSequential(d3.interpolateRdBu)
            .domain([1, -1]); // Positive = blue, negative = red
        
        // Cells
        const cells = g.selectAll('rect')
            .data(corrMatrix)
            .enter()
            .append('rect')
            .attr('x', d => x(d.col))
            .attr('y', d => y(d.row))
            .attr('width', x.bandwidth())
            .attr('height', y.bandwidth())
            .attr('fill', d => colorScale(d.correlation))
            .attr('opacity', 0)
            .style('cursor', 'pointer');
        
        // Animate
        cells.transition()
            .duration(600)
            .delay((d, i) => i * 5)
            .attr('opacity', d => 0.3 + 0.7 * Math.abs(d.correlation));
        
        // Tooltips
        cells.on('mouseover', (event, d) => {
            const content = `
                <div class="tooltip-title">Correlation</div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Market 1:</span>
                    <span class="tooltip-value">${d.row + 1}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Market 2:</span>
                    <span class="tooltip-value">${d.col + 1}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Correlation:</span>
                    <span class="tooltip-value">${ui.formatNumber(d.correlation, 3)}</span>
                </div>
            `;
            ui.showTooltip(event.pageX, event.pageY, content);
        })
        .on('mouseout', () => {
            ui.hideTooltip();
        });
        
        // Axes (market indices)
        g.append('g')
            .attr('transform', `translate(0,${markets.length * cellSize})`)
            .call(d3.axisBottom(x).tickFormat(d => d + 1))
            .attr('color', '#94a3b8')
            .selectAll('text')
            .attr('font-size', '9px');
        
        g.append('g')
            .call(d3.axisLeft(y).tickFormat(d => d + 1))
            .attr('color', '#94a3b8')
            .selectAll('text')
            .attr('font-size', '9px');
    }
    
    renderArbitrageList() {
        const container = document.getElementById('arbitrage-list');
        
        // Find arbitrage opportunities
        const opportunities = this.data.arbitrageOpps || [];
        
        if (opportunities.length === 0) {
            container.innerHTML = '<div class="text-slate-400 text-sm">No current arbitrage opportunities detected</div>';
            return;
        }
        
        // Sort by profit potential
        const sorted = opportunities.sort((a, b) => b.profitPotential - a.profitPotential).slice(0, 10);
        
        const list = document.createElement('div');
        list.className = 'space-y-3';
        
        sorted.forEach((opp, idx) => {
            const card = document.createElement('div');
            card.className = 'bg-slate-800/30 rounded-lg p-3 border border-slate-700';
            
            const profitColor = opp.profitPotential > 0.05 ? '#10b981' : opp.profitPotential > 0.02 ? '#fbbf24' : '#64748b';
            
            card.innerHTML = `
                <div class="flex items-start justify-between mb-2">
                    <div class="text-xs font-semibold text-cyan-400">#${idx + 1}</div>
                    <div class="text-sm font-mono font-bold" style="color: ${profitColor};">
                        +${ui.formatPercent(opp.profitPotential)}
                    </div>
                </div>
                <div class="text-xs text-slate-300 mb-2">${opp.description}</div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <div class="text-slate-400">Market A:</div>
                        <div class="font-mono text-slate-200">${ui.formatPercent(opp.priceA)}</div>
                    </div>
                    <div>
                        <div class="text-slate-400">Market B:</div>
                        <div class="font-mono text-slate-200">${ui.formatPercent(opp.priceB)}</div>
                    </div>
                </div>
            `;
            
            list.appendChild(card);
        });
        
        container.appendChild(list);
    }
    
    renderStats() {
        const markets = this.data.markets;
        
        // Calculate network statistics
        let totalCorrelations = 0;
        let positiveCorrs = 0;
        let strongCorrs = 0;
        let count = 0;
        
        for (let i = 0; i < Math.min(markets.length, 20); i++) {
            for (let j = i + 1; j < Math.min(markets.length, 20); j++) {
                const prices1 = markets[i].priceHistory?.map(p => p.price) || [];
                const prices2 = markets[j].priceHistory?.map(p => p.price) || [];
                
                if (prices1.length > 10 && prices2.length > 10) {
                    const minLength = Math.min(prices1.length, prices2.length);
                    const corr = stats.pearsonCorrelation(
                        prices1.slice(0, minLength),
                        prices2.slice(0, minLength)
                    );
                    
                    totalCorrelations += corr;
                    if (corr > 0) positiveCorrs++;
                    if (Math.abs(corr) > 0.5) strongCorrs++;
                    count++;
                }
            }
        }
        
        const avgCorrelation = count > 0 ? totalCorrelations / count : 0;
        
        const statsData = {
            'Markets Analyzed': Math.min(markets.length, 20),
            'Market Pairs': count,
            'Avg Correlation': ui.formatNumber(avgCorrelation, 3),
            'Positive Correlations': positiveCorrs,
            'Strong Correlations (|r|>0.5)': strongCorrs,
            'Arbitrage Opportunities': this.data.arbitrageOpps?.length || 0,
            'Network Density': count > 0 ? ui.formatPercent(strongCorrs / count) : '0%',
            'Avg Profit Potential': this.data.arbitrageOpps?.length > 0 ? 
                ui.formatPercent(stats.mean(this.data.arbitrageOpps.map(o => o.profitPotential))) : '0%'
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Network Construction',
                text: 'Markets are connected if their price correlations exceed 0.5. Green edges = positive correlation, red edges = negative. Node size indicates number of connections.'
            },
            {
                title: 'Arbitrage Detection',
                text: 'We identify price discrepancies between related markets that violate basic probability rules (e.g., mutually exclusive events summing > 100%). Profit potential = theoretical risk-free gain.'
            },
            {
                title: 'Correlation Analysis',
                text: 'Pearson correlation computed from aligned price histories. High correlation suggests markets respond to similar information or have overlapping participant bases.'
            }
        ];
        
        const panel = ui.createMethodologyPanel('Understanding Arbitrage Analysis', sections);
        document.getElementById('methodology-panel').appendChild(panel);
    }
    
    async update() {
        // Stop old simulation
        if (this.simulation) {
            this.simulation.stop();
        }
        this.container.innerHTML = '';
        await this.render();
    }
    
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        this.container.innerHTML = '';
    }
}
