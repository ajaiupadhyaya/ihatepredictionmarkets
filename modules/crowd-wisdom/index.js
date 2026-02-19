// Module 2: Crowd Wisdom vs Expert Forecasters
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager.js';

export default class CrowdWisdomModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('crowd-wisdom');
        
        if (!this.data || !this.data.events || this.data.events.length === 0) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Crowd Wisdom vs. Expert Forecasters</h2>
                    <p class="text-slate-400">Comparing market probabilities against expert/model forecasts over time</p>
                </div>
                
                <div class="grid grid-cols-1 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Probability Timeline Comparison</div>
                                <div class="card-subtitle">Market vs. Metaculus vs. Expert Model</div>
                            </div>
                        </div>
                        <div id="timeline-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Prediction Accuracy at T-30 Days</div>
                                <div class="card-subtitle">Market vs. Expert Before Resolution</div>
                            </div>
                        </div>
                        <div id="scatter-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Performance Comparison</div>
                                <div class="card-subtitle">Who got it right?</div>
                            </div>
                        </div>
                        <div id="quadrant-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all charts
        this.renderTimelineChart();
        this.renderScatterChart();
        this.renderQuadrantChart();
        this.renderStats();
        this.renderMethodology();
    }
    
    renderTimelineChart() {
        const container = d3.select('#timeline-chart');
        const width = container.node().clientWidth;
        const height = 500;
        const margin = { top: 20, right: 120, bottom: 50, left: 60 };
        
        // Select first few events for clarity
        const selectedEvents = this.data.events.slice(0, 3);
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Prepare data - combine all time series
        const allData = [];
        selectedEvents.forEach((event, idx) => {
            const yOffset = idx * (chartHeight / selectedEvents.length);
            const subHeight = chartHeight / selectedEvents.length - 20;
            
            // Create mini chart for each event
            const eventG = g.append('g')
                .attr('transform', `translate(0,${yOffset})`);
            
            // Scales for this event
            const timeExtent = d3.extent(event.marketProbabilities, d => new Date(d.timestamp));
            const x = d3.scaleTime()
                .domain(timeExtent)
                .range([0, chartWidth]);
            
            const y = d3.scaleLinear()
                .domain([0, 1])
                .range([subHeight, 0]);
            
            // Divergence area (shaded region between market and expert)
            const marketLine = d3.line()
                .x(d => x(new Date(d.timestamp)))
                .y(d => y(d.price))
                .curve(d3.curveMonotoneX);
            
            const expertLine = d3.line()
                .x((d, i) => x(new Date(event.expertProbabilities[i].timestamp)))
                .y((d, i) => y(event.expertProbabilities[i].price))
                .curve(d3.curveMonotoneX);
            
            // Area between lines
            const area = d3.area()
                .x(d => x(new Date(d.timestamp)))
                .y0(d => y(d.price))
                .y1((d, i) => y(event.expertProbabilities[i].price))
                .curve(d3.curveMonotoneX);
            
            eventG.append('path')
                .datum(event.marketProbabilities)
                .attr('d', area)
                .attr('fill', '#fbbf24')
                .attr('opacity', 0.2);
            
            // Market line
            const marketPath = eventG.append('path')
                .datum(event.marketProbabilities)
                .attr('d', marketLine)
                .attr('fill', 'none')
                .attr('stroke', '#22d3ee')
                .attr('stroke-width', 2.5);
            
            // Expert line
            const expertPath = eventG.append('path')
                .datum(event.expertProbabilities)
                .attr('d', expertLine)
                .attr('fill', 'none')
                .attr('stroke', '#ef4444')
                .attr('stroke-width', 2.5)
                .attr('stroke-dasharray', '5,5');
            
            // Metaculus line
            const metaculusPath = eventG.append('path')
                .datum(event.metaculusProbabilities)
                .attr('d', marketLine)
                .attr('fill', 'none')
                .attr('stroke', '#10b981')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '3,3');
            
            // Animate paths
            const pathLength = marketPath.node().getTotalLength();
            marketPath
                .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
                .attr('stroke-dashoffset', pathLength)
                .transition()
                .duration(1500)
                .ease(d3.easeLinear)
                .attr('stroke-dashoffset', 0)
                .on('end', () => marketPath.attr('stroke-dasharray', null));
            
            // Event outcome marker
            if (event.outcome !== null) {
                const resolutionDate = new Date(event.resolvedAt);
                const finalProb = event.outcome === 1 ? 1 : 0;
                
                eventG.append('line')
                    .attr('x1', x(resolutionDate))
                    .attr('x2', x(resolutionDate))
                    .attr('y1', 0)
                    .attr('y2', subHeight)
                    .attr('stroke', event.outcome === 1 ? '#10b981' : '#ef4444')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '2,2')
                    .attr('opacity', 0.5);
                
                eventG.append('text')
                    .attr('x', x(resolutionDate))
                    .attr('y', -5)
                    .attr('text-anchor', 'middle')
                    .attr('fill', event.outcome === 1 ? '#10b981' : '#ef4444')
                    .attr('font-size', '10px')
                    .attr('font-weight', 'bold')
                    .text(event.outcome === 1 ? 'YES' : 'NO');
            }
            
            // Axes
            eventG.append('g')
                .attr('transform', `translate(0,${subHeight})`)
                .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%b %d')))
                .attr('color', '#94a3b8')
                .selectAll('text')
                .attr('font-size', '9px');
            
            eventG.append('g')
                .call(d3.axisLeft(y).ticks(3).tickFormat(d => ui.formatPercent(d, 0)))
                .attr('color', '#94a3b8')
                .selectAll('text')
                .attr('font-size', '9px');
            
            // Event title
            eventG.append('text')
                .attr('x', chartWidth / 2)
                .attr('y', -5)
                .attr('text-anchor', 'middle')
                .attr('fill', '#e2e8f0')
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .text(event.title.substring(0, 60) + (event.title.length > 60 ? '...' : ''));
        });
        
        // Legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width - margin.right + 10}, ${margin.top})`);
        
        const legendData = [
            { label: 'Market', color: '#22d3ee', dash: null },
            { label: 'Expert', color: '#ef4444', dash: '5,5' },
            { label: 'Metaculus', color: '#10b981', dash: '3,3' }
        ];
        
        legendData.forEach((item, i) => {
            const lg = legend.append('g')
                .attr('transform', `translate(0,${i * 25})`);
            
            lg.append('line')
                .attr('x1', 0)
                .attr('x2', 30)
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('stroke', item.color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', item.dash);
            
            lg.append('text')
                .attr('x', 35)
                .attr('y', 4)
                .attr('fill', '#e2e8f0')
                .attr('font-size', '12px')
                .text(item.label);
        });
    }
    
    renderScatterChart() {
        const container = d3.select('#scatter-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Get T-30 predictions
        const scatterData = this.data.events.map(event => {
            const marketHist = event.marketProbabilities;
            const expertHist = event.expertProbabilities;
            
            // Get value 30 days before resolution (or closest)
            const resolutionDate = new Date(event.resolvedAt);
            const t30Date = new Date(resolutionDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            // Find closest timestamps
            const marketAtT30 = marketHist.reduce((prev, curr) => {
                const prevDiff = Math.abs(new Date(prev.timestamp) - t30Date);
                const currDiff = Math.abs(new Date(curr.timestamp) - t30Date);
                return currDiff < prevDiff ? curr : prev;
            }).price;
            
            const expertAtT30 = expertHist.reduce((prev, curr) => {
                const prevDiff = Math.abs(new Date(prev.timestamp) - t30Date);
                const currDiff = Math.abs(new Date(curr.timestamp) - t30Date);
                return currDiff < prevDiff ? curr : prev;
            }).price;
            
            return {
                marketProb: marketAtT30,
                expertProb: expertAtT30,
                outcome: event.outcome,
                title: event.title
            };
        }).filter(d => d.outcome !== null);
        
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
        
        // Perfect agreement line
        g.append('line')
            .attr('x1', x(0))
            .attr('y1', y(0))
            .attr('x2', x(1))
            .attr('y2', y(1))
            .attr('stroke', '#475569')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // Color scale
        const colorScale = d => d.outcome === 1 ? '#10b981' : '#ef4444';
        
        // Points
        const circles = g.selectAll('circle')
            .data(scatterData)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.marketProb))
            .attr('cy', d => y(d.expertProb))
            .attr('r', 0)
            .attr('fill', colorScale)
            .attr('opacity', 0.7)
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer');
        
        // Animate
        circles.transition()
            .duration(600)
            .delay((d, i) => i * 30)
            .attr('r', 6);
        
        // Tooltips
        circles.on('mouseover', (event, d) => {
            const content = `
                <div class="tooltip-title">${d.title.substring(0, 50)}...</div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Market (T-30):</span>
                    <span class="tooltip-value">${ui.formatPercent(d.marketProb)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Expert (T-30):</span>
                    <span class="tooltip-value">${ui.formatPercent(d.expertProb)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Outcome:</span>
                    <span class="tooltip-value">${d.outcome === 1 ? 'YES' : 'NO'}</span>
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
            .text('Market Probability at T-30');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Expert Probability at T-30');
    }
    
    renderQuadrantChart() {
        const container = d3.select('#quadrant-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        
        // Quadrant analysis
        const scatterData = this.data.events.map(event => {
            const marketFinal = event.marketProbabilities[event.marketProbabilities.length - 1].price;
            const expertFinal = event.expertProbabilities[event.expertProbabilities.length - 1].price;
            const outcome = event.outcome;
            
            // Determine who was "right" (closer to outcome)
            const marketRight = Math.abs(marketFinal - outcome) < 0.3;
            const expertRight = Math.abs(expertFinal - outcome) < 0.3;
            
            let quadrant;
            if (marketRight && expertRight) quadrant = 'Both Right';
            else if (!marketRight && !expertRight) quadrant = 'Both Wrong';
            else if (marketRight) quadrant = 'Market Right';
            else quadrant = 'Expert Right';
            
            return { quadrant, outcome };
        }).filter(d => d.outcome !== null);
        
        // Count by quadrant
        const quadrantCounts = d3.rollup(
            scatterData,
            v => v.length,
            d => d.quadrant
        );
        
        const data = Array.from(quadrantCounts, ([quadrant, count]) => ({ quadrant, count }));
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Scales
        const x = d3.scaleBand()
            .domain(data.map(d => d.quadrant))
            .range([0, chartWidth])
            .padding(0.3);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .nice()
            .range([chartHeight, 0]);
        
        // Color scale
        const colorScale = d3.scaleOrdinal()
            .domain(['Both Right', 'Market Right', 'Expert Right', 'Both Wrong'])
            .range(['#10b981', '#22d3ee', '#fbbf24', '#ef4444']);
        
        // Bars
        const bars = g.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr('x', d => x(d.quadrant))
            .attr('width', x.bandwidth())
            .attr('y', chartHeight)
            .attr('height', 0)
            .attr('fill', d => colorScale(d.quadrant))
            .attr('opacity', 0.9);
        
        // Animate
        bars.transition()
            .duration(600)
            .delay((d, i) => i * 100)
            .attr('y', d => y(d.count))
            .attr('height', d => chartHeight - y(d.count));
        
        // Value labels
        g.selectAll('text.value')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'value')
            .attr('x', d => x(d.quadrant) + x.bandwidth() / 2)
            .attr('y', d => y(d.count) - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e2e8f0')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'JetBrains Mono')
            .text(d => d.count);
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x))
            .attr('color', '#94a3b8')
            .selectAll('text')
            .attr('font-size', '11px');
        
        g.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .attr('color', '#94a3b8');
        
        // Label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Number of Events');
    }
    
    renderStats() {
        // Calculate statistics
        const allEvents = this.data.events.filter(e => e.outcome !== null);

        if (allEvents.length < 2) {
            const statsPanel = document.getElementById('stats-panel');
            statsPanel.appendChild(ui.createStatsGrid({
                'Market-Expert Correlation': 'N/A',
                'Market RMSE': 'N/A',
                'Expert RMSE': 'N/A',
                'Market Brier Score': 'N/A',
                'Expert Brier Score': 'N/A',
                'Winner': 'N/A',
                'Events Analyzed': allEvents.length,
                'Avg Divergence': 'N/A'
            }));
            return;
        }
        
        // Correlation between market and expert
        const marketFinals = allEvents.map(e => e.marketProbabilities[e.marketProbabilities.length - 1].price);
        const expertFinals = allEvents.map(e => e.expertProbabilities[e.expertProbabilities.length - 1].price);
        const outcomes = allEvents.map(e => e.outcome);
        
        const correlation = stats.pearsonCorrelation(marketFinals, expertFinals);
        
        // RMSE for market
        const marketRMSE = Math.sqrt(stats.mean(marketFinals.map((p, i) => Math.pow(p - outcomes[i], 2))));
        
        // RMSE for expert
        const expertRMSE = Math.sqrt(stats.mean(expertFinals.map((p, i) => Math.pow(p - outcomes[i], 2))));
        
        // Brier scores
        const marketBrier = stats.brierScore(marketFinals, outcomes);
        const expertBrier = stats.brierScore(expertFinals, outcomes);
        
        const statsData = {
            'Market-Expert Correlation': ui.formatNumber(correlation, 3),
            'Market RMSE': ui.formatNumber(marketRMSE, 3),
            'Expert RMSE': ui.formatNumber(expertRMSE, 3),
            'Market Brier Score': ui.formatNumber(marketBrier, 4),
            'Expert Brier Score': ui.formatNumber(expertBrier, 4),
            'Winner': marketBrier < expertBrier ? 'Market' : 'Expert',
            'Events Analyzed': allEvents.length,
            'Avg Divergence': ui.formatPercent(stats.mean(marketFinals.map((m, i) => Math.abs(m - expertFinals[i]))))
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Comparison Metrics',
                text: 'We compare prediction sources using Root Mean Square Error (RMSE) and Brier scores. Lower values indicate better calibration to actual outcomes.'
            },
            {
                title: 'T-30 Analysis',
                text: 'We evaluate predictions 30 days before event resolution to measure how well sources anticipated outcomes with meaningful lead time.'
            },
            {
                title: 'Divergence Tracking',
                text: 'The shaded area between lines shows disagreement between sources. Wider divergence suggests epistemic uncertainty or differential information access.'
            }
        ];
        
        const panel = ui.createMethodologyPanel('How This Works', sections);
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
