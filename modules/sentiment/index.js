// Module 5: Sentiment Analysis
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager.js';

export default class SentimentModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('sentiment');
        
        if (!this.data || !this.data.timeseries || this.data.timeseries.length === 0) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Sentiment vs. Market Probability</h2>
                    <p class="text-slate-400">Comparing NLP sentiment signals against market price movements</p>
                </div>
                
                <div class="grid grid-cols-1 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Dual-Axis Time Series</div>
                                <div class="card-subtitle">Sentiment Score vs. Market Probability</div>
                            </div>
                        </div>
                        <div id="timeseries-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Sentiment-Price Relationship</div>
                                <div class="card-subtitle">Scatter plot with trend line</div>
                            </div>
                        </div>
                        <div id="scatter-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Cross-Correlation Function</div>
                                <div class="card-subtitle">Does sentiment lead or lag price?</div>
                            </div>
                        </div>
                        <div id="correlation-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all components
        this.renderTimeseriesChart();
        this.renderScatterChart();
        this.renderCorrelationChart();
        this.renderStats();
        this.renderMethodology();
    }
    
    renderTimeseriesChart() {
        const container = d3.select('#timeseries-chart');
        const width = container.node().clientWidth();
        const height = 450;
        const margin = { top: 20, right: 60, bottom: 50, left: 60 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Parse timestamps
        const data = this.data.timeseries.map(d => ({
            ...d,
            timestamp: new Date(d.timestamp)
        }));
        
        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.timestamp))
            .range([0, chartWidth]);
        
        const yPrice = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);
        
        const ySentiment = d3.scaleLinear()
            .domain([-1, 1])
            .range([chartHeight, 0]);
        
        // Price line
        const priceLine = d3.line()
            .x(d => x(d.timestamp))
            .y(d => yPrice(d.probability))
            .curve(d3.curveMonotoneX);
        
        const pricePath = g.append('path')
            .datum(data)
            .attr('d', priceLine)
            .attr('fill', 'none')
            .attr('stroke', '#22d3ee')
            .attr('stroke-width', 2.5);
        
        // Sentiment line
        const sentimentLine = d3.line()
            .x(d => x(d.timestamp))
            .y(d => ySentiment(d.sentiment))
            .curve(d3.curveMonotoneX);
        
        const sentimentPath = g.append('path')
            .datum(data)
            .attr('d', sentimentLine)
            .attr('fill', 'none')
            .attr('stroke', '#fbbf24')
            .attr('stroke-width', 2.5)
            .attr('opacity', 0.8);
        
        // Animate paths
        const priceLength = pricePath.node().getTotalLength();
        pricePath
            .attr('stroke-dasharray', `${priceLength} ${priceLength}`)
            .attr('stroke-dashoffset', priceLength)
            .transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0)
            .on('end', () => pricePath.attr('stroke-dasharray', null));
        
        // Zero line for sentiment
        g.append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', ySentiment(0))
            .attr('y2', ySentiment(0))
            .attr('stroke', '#475569')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .attr('opacity', 0.5);
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b %d')))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(yPrice).tickFormat(d => ui.formatPercent(d, 0)))
            .attr('color', '#22d3ee');
        
        g.append('g')
            .attr('transform', `translate(${chartWidth},0)`)
            .call(d3.axisRight(ySentiment).ticks(5))
            .attr('color', '#fbbf24');
        
        // Labels
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#22d3ee')
            .attr('font-size', '12px')
            .text('Market Probability');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', chartWidth + 45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fbbf24')
            .attr('font-size', '12px')
            .text('Sentiment Score');
        
        // Legend
        const legend = svg.append('g')
            .attr('transform', `translate(${margin.left + 20}, ${margin.top})`);
        
        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 30)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', '#22d3ee')
            .attr('stroke-width', 2.5);
        
        legend.append('text')
            .attr('x', 35)
            .attr('y', 4)
            .attr('fill', '#e2e8f0')
            .attr('font-size', '11px')
            .text('Market Probability');
        
        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 30)
            .attr('y1', 18)
            .attr('y2', 18)
            .attr('stroke', '#fbbf24')
            .attr('stroke-width', 2.5);
        
        legend.append('text')
            .attr('x', 35)
            .attr('y', 22)
            .attr('fill', '#e2e8f0')
            .attr('font-size', '11px')
            .text('Sentiment Score');
    }
    
    renderScatterChart() {
        const container = d3.select('#scatter-chart');
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
        
        const data = this.data.timeseries;
        
        // Scales
        const x = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);
        
        // Calculate price changes
        const scatterData = data.slice(1).map((d, i) => ({
            sentiment: data[i].sentiment,
            priceChange: d.probability - data[i].probability,
            probability: d.probability
        }));
        
        // Linear regression
        const sentimentVals = scatterData.map(d => d.sentiment);
        const changeVals = scatterData.map(d => d.priceChange);
        const regression = stats.linearRegression(sentimentVals, changeVals);
        
        // Regression line
        const regressionLine = [
            { x: -1, y: regression.intercept + regression.slope * (-1) },
            { x: 1, y: regression.intercept + regression.slope * 1 }
        ];
        
        g.append('line')
            .attr('x1', x(regressionLine[0].x))
            .attr('y1', y(regressionLine[0].y))
            .attr('x2', x(regressionLine[1].x))
            .attr('y2', y(regressionLine[1].y))
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // Zero lines
        g.append('line')
            .attr('x1', x(0))
            .attr('x2', x(0))
            .attr('y1', 0)
            .attr('y2', chartHeight)
            .attr('stroke', '#475569')
            .attr('stroke-width', 1)
            .attr('opacity', 0.3);
        
        g.append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', y(0))
            .attr('y2', y(0))
            .attr('stroke', '#475569')
            .attr('stroke-width', 1)
            .attr('opacity', 0.3);
        
        // Points
        const circles = g.selectAll('circle')
            .data(scatterData)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.sentiment))
            .attr('cy', d => y(d.priceChange))
            .attr('r', 0)
            .attr('fill', '#22d3ee')
            .attr('opacity', 0.6)
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 1);
        
        // Animate
        circles.transition()
            .duration(600)
            .delay((d, i) => i * 10)
            .attr('r', 4);
        
        // Axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x))
            .attr('color', '#94a3b8');
        
        g.append('g')
            .call(d3.axisLeft(y).tickFormat(d => ui.formatNumber(d, 2)))
            .attr('color', '#94a3b8');
        
        // Labels
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Sentiment Score');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Price Change (Next Period)');
        
        // R² annotation
        g.append('text')
            .attr('x', chartWidth - 10)
            .attr('y', 20)
            .attr('text-anchor', 'end')
            .attr('fill', '#ef4444')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text(`R² = ${ui.formatNumber(regression.r2, 3)}`);
    }
    
    renderCorrelationChart() {
        const container = d3.select('#correlation-chart');
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
        
        // Calculate cross-correlation
        const sentiments = this.data.timeseries.map(d => d.sentiment);
        const probabilities = this.data.timeseries.map(d => d.probability);
        
        const maxLag = 20;
        const correlations = [];
        
        for (let lag = -maxLag; lag <= maxLag; lag++) {
            const corr = stats.crossCorrelation(sentiments, probabilities, lag);
            correlations.push({ lag, correlation: corr });
        }
        
        // Scales
        const x = d3.scaleLinear()
            .domain([-maxLag, maxLag])
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
        
        // Bars
        const barWidth = chartWidth / (maxLag * 2 + 1) * 0.8;
        
        const bars = g.selectAll('rect')
            .data(correlations)
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
            .delay((d, i) => i * 20)
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
            .text('Correlation Coefficient');
        
        // Annotations
        g.append('text')
            .attr('x', x(-maxLag / 2))
            .attr('y', 15)
            .attr('text-anchor', 'middle')
            .attr('fill', '#10b981')
            .attr('opacity', 0.7)
            .attr('font-size', '10px')
            .text('Sentiment LEADS');
        
        g.append('text')
            .attr('x', x(maxLag / 2))
            .attr('y', 15)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ef4444')
            .attr('opacity', 0.7)
            .attr('font-size', '10px')
            .text('Sentiment LAGS');
    }
    
    renderStats() {
        const sentiments = this.data.timeseries.map(d => d.sentiment);
        const probabilities = this.data.timeseries.map(d => d.probability);
        
        // Compute statistics
        const correlation = stats.pearsonCorrelation(sentiments, probabilities);
        const avgSentiment = stats.mean(sentiments);
        const stdSentiment = sentiments.length > 0 ? stats.standardDeviation(sentiments) : 0;
        
        // Price changes
        const priceChanges = probabilities.slice(1).map((p, i) => p - probabilities[i]);
        const sentimentAtT = sentiments.slice(0, -1);
        const predictiveCorr = stats.pearsonCorrelation(sentimentAtT, priceChanges);
        
        // Granger causality
        const grangerResult = stats.grangerCausality(sentiments, probabilities, 3);
        
        const statsData = {
            'Observations': this.data.timeseries.length,
            'Correlation': ui.formatNumber(correlation, 3),
            'Predictive Corr': ui.formatNumber(predictiveCorr, 3),
            'Avg Sentiment': ui.formatNumber(avgSentiment, 3),
            'Sentiment Std Dev': ui.formatNumber(stdSentiment, 3),
            'Granger p-value': ui.formatNumber(grangerResult.pValue, 4),
            'Sentiment → Price': grangerResult.pValue < 0.05 ? 'Yes' : 'No',
            'Max Cross-Corr': ui.formatNumber(Math.max(...this.data.timeseries.map((_, i) => 
                Math.abs(stats.crossCorrelation(sentiments, probabilities, i))
            )), 3)
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Sentiment Extraction',
                text: 'We compute sentiment scores from market comments and news using NLP. Scores range from -1 (very negative) to +1 (very positive). Neutral sentiment is 0.'
            },
            {
                title: 'Cross-Correlation',
                text: 'We test whether sentiment leads or lags price changes by computing correlations at different time lags. Negative lags mean sentiment leads; positive lags mean sentiment lags.'
            },
            {
                title: 'Granger Causality',
                text: 'A statistical test to determine if past sentiment values help predict future price changes beyond what prices alone can predict. p < 0.05 suggests predictive power.'
            }
        ];
        
        const panel = ui.createMethodologyPanel('Understanding Sentiment Analysis', sections);
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
