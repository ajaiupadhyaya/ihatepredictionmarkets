// Module 7: Forecaster Leaderboard
import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import * as ui from '../../utils/ui.js';
import { getModuleData } from '../../data/dataManager.js';

export default class LeaderboardModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.data = null;
        this.sortBy = 'brierScore';
        this.sortOrder = 'asc';
    }
    
    async render() {
        // Fetch data
        this.data = await getModuleData('leaderboard');
        
        if (!this.data || !this.data.forecasters || this.data.forecasters.length === 0) {
            this.container.innerHTML = '<div class="error-card"><div class="error-title">No Data Available</div></div>';
            return;
        }
        
        // Build UI
        this.container.innerHTML = `
            <div class="fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">Forecaster Leaderboard</h2>
                    <p class="text-slate-400">Rankings and performance analytics for all forecasters</p>
                </div>
                
                <div class="grid grid-cols-1 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Top Forecasters</div>
                                <div class="card-subtitle">Ranked by Brier Score (lower is better)</div>
                            </div>
                        </div>
                        <div id="leaderboard-table" class="p-6"></div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Score Distribution</div>
                                <div class="card-subtitle">Violin plots by metric</div>
                            </div>
                        </div>
                        <div id="distribution-chart" class="chart-container"></div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Skill vs. Luck Analysis</div>
                                <div class="card-subtitle">True ability detection</div>
                            </div>
                        </div>
                        <div id="skill-luck-chart" class="chart-container"></div>
                    </div>
                </div>
                
                <!-- Stats Panel -->
                <div id="stats-panel" class="mb-6"></div>
                
                <!-- Methodology -->
                <div id="methodology-panel"></div>
            </div>
        `;
        
        // Render all components
        this.renderLeaderboardTable();
        this.renderDistributionChart();
        this.renderSkillLuckChart();
        this.renderStats();
        this.renderMethodology();
    }
    
    renderLeaderboardTable() {
        const container = document.getElementById('leaderboard-table');
        
        // Sort forecasters
        const sorted = [...this.data.forecasters].sort((a, b) => {
            const mult = this.sortOrder === 'asc' ? 1 : -1;
            return mult * (a[this.sortBy] - b[this.sortBy]);
        });
        
        // Create table
        const table = document.createElement('table');
        table.className = 'w-full text-sm';
        table.style.borderCollapse = 'collapse';
        
        // Header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="border-bottom: 2px solid #334155;">
                <th class="text-left py-3 px-4 text-slate-400 font-semibold cursor-pointer hover:text-cyan-400" data-sort="rank">#</th>
                <th class="text-left py-3 px-4 text-slate-400 font-semibold cursor-pointer hover:text-cyan-400" data-sort="name">Forecaster</th>
                <th class="text-center py-3 px-4 text-slate-400 font-semibold cursor-pointer hover:text-cyan-400" data-sort="predictions">Predictions</th>
                <th class="text-center py-3 px-4 text-slate-400 font-semibold cursor-pointer hover:text-cyan-400" data-sort="brierScore">Brier ↕</th>
                <th class="text-center py-3 px-4 text-slate-400 font-semibold cursor-pointer hover:text-cyan-400" data-sort="logScore">Log Score ↕</th>
                <th class="text-center py-3 px-4 text-slate-400 font-semibold cursor-pointer hover:text-cyan-400" data-sort="sphericalScore">Spherical ↕</th>
                <th class="text-center py-3 px-4 text-slate-400 font-semibold cursor-pointer hover:text-cyan-400" data-sort="calibration">Calibration ↕</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        sorted.slice(0, 20).forEach((forecaster, idx) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #1e293b';
            row.className = 'hover:bg-slate-800/50 transition-colors';
            
            // Rank badge
            let rankBadge = idx + 1;
            let rankColor = '#64748b';
            if (idx === 0) {
                rankBadge = '🥇';
                rankColor = '#fbbf24';
            } else if (idx === 1) {
                rankBadge = '🥈';
                rankColor = '#94a3b8';
            } else if (idx === 2) {
                rankBadge = '🥉';
                rankColor = '#d97706';
            }
            
            row.innerHTML = `
                <td class="py-3 px-4 font-mono font-bold" style="color: ${rankColor};">${rankBadge}</td>
                <td class="py-3 px-4 text-cyan-400 font-semibold">${forecaster.name}</td>
                <td class="py-3 px-4 text-center font-mono text-slate-300">${forecaster.predictions}</td>
                <td class="py-3 px-4 text-center font-mono ${forecaster.brierScore < 0.2 ? 'text-green-400' : forecaster.brierScore > 0.3 ? 'text-red-400' : 'text-slate-300'}">${ui.formatNumber(forecaster.brierScore, 4)}</td>
                <td class="py-3 px-4 text-center font-mono ${forecaster.logScore > -0.5 ? 'text-green-400' : forecaster.logScore < -1.5 ? 'text-red-400' : 'text-slate-300'}">${ui.formatNumber(forecaster.logScore, 3)}</td>
                <td class="py-3 px-4 text-center font-mono ${forecaster.sphericalScore > 0.8 ? 'text-green-400' : forecaster.sphericalScore < 0.6 ? 'text-red-400' : 'text-slate-300'}">${ui.formatNumber(forecaster.sphericalScore, 3)}</td>
                <td class="py-3 px-4 text-center font-mono ${forecaster.calibration < 0.05 ? 'text-green-400' : forecaster.calibration > 0.15 ? 'text-red-400' : 'text-slate-300'}">${ui.formatNumber(forecaster.calibration, 3)}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        container.appendChild(table);
        
        // Add click handlers for sorting
        thead.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const sortField = th.getAttribute('data-sort');
                if (sortField === 'rank' || sortField === 'name') return;
                
                if (this.sortBy === sortField) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortBy = sortField;
                    this.sortOrder = sortField === 'logScore' || sortField === 'sphericalScore' ? 'desc' : 'asc';
                }
                
                container.innerHTML = '';
                this.renderLeaderboardTable();
            });
        });
    }
    
    renderDistributionChart() {
        const container = d3.select('#distribution-chart');
        const width = container.node().clientWidth;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 70, left: 60 };
        
        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        if (!this.data.forecasters || this.data.forecasters.length === 0) {
            container.html('<div class="text-slate-400 p-4">Insufficient data to render distribution chart</div>');
            return;
        }
        
        // Metrics to show
        const metrics = [
            { key: 'brierScore', label: 'Brier', color: '#22d3ee' },
            { key: 'logScore', label: 'Log Score', color: '#10b981' },
            { key: 'sphericalScore', label: 'Spherical', color: '#fbbf24' }
        ];
        
        // Scales
        const x = d3.scaleBand()
            .domain(metrics.map(m => m.label))
            .range([0, chartWidth])
            .padding(0.3);
        
        // For each metric, create a violin plot
        metrics.forEach((metric, idx) => {
            const values = this.data.forecasters.map(f => f[metric.key]).sort(d3.ascending);
            const metricG = g.append('g')
                .attr('transform', `translate(${x(metric.label)}, 0)`);
            
            // Auto scale based on data range
            const extent = d3.extent(values);
            const y = d3.scaleLinear()
                .domain(extent)
                .range([chartHeight, 0])
                .nice();
            
            // Box plot elements
            const q1 = d3.quantile(values, 0.25);
            const median = d3.quantile(values, 0.5);
            const q3 = d3.quantile(values, 0.75);
            const iqr = q3 - q1;
            const whiskerLow = Math.max(extent[0], q1 - 1.5 * iqr);
            const whiskerHigh = Math.min(extent[1], q3 + 1.5 * iqr);
            
            const boxWidth = x.bandwidth() * 0.6;
            
            // Whiskers
            metricG.append('line')
                .attr('x1', boxWidth / 2)
                .attr('x2', boxWidth / 2)
                .attr('y1', y(whiskerLow))
                .attr('y2', y(whiskerHigh))
                .attr('stroke', metric.color)
                .attr('stroke-width', 1.5);
            
            // Box
            metricG.append('rect')
                .attr('x', 0)
                .attr('y', y(q3))
                .attr('width', boxWidth)
                .attr('height', y(q1) - y(q3))
                .attr('fill', metric.color)
                .attr('opacity', 0.3)
                .attr('stroke', metric.color)
                .attr('stroke-width', 2);
            
            // Median line
            metricG.append('line')
                .attr('x1', 0)
                .attr('x2', boxWidth)
                .attr('y1', y(median))
                .attr('y2', y(median))
                .attr('stroke', metric.color)
                .attr('stroke-width', 3);
            
            // Show axis only for first
            if (idx === 0) {
                metricG.append('g')
                    .call(d3.axisLeft(y).ticks(5).tickFormat(d => ui.formatNumber(d, 2)))
                    .attr('color', '#94a3b8')
                    .selectAll('text')
                    .attr('font-size', '10px');
            }
        });
        
        // X axis
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x))
            .attr('color', '#94a3b8')
            .selectAll('text')
            .attr('font-size', '11px')
            .attr('font-weight', '600');
    }
    
    renderSkillLuckChart() {
        const container = d3.select('#skill-luck-chart');
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

        if (!this.data.forecasters || this.data.forecasters.length === 0) {
            container.html('<div class="text-slate-400 p-4">Insufficient data to render skill-luck chart</div>');
            return;
        }
        
        // Calculate skill vs luck
        // Skill = average score, Luck = variance in scores
        const scatterData = this.data.forecasters.map(f => {
            // Estimate skill as inverse of Brier score
            const skill = 1 - f.brierScore;
            
            // Estimate luck as inverse of predictions (more predictions = less luck)
            // Also factor in calibration (well-calibrated = less luck)
            const luck = Math.max(0, 1 - f.predictions / 100) + f.calibration;
            
            return {
                name: f.name,
                skill,
                luck,
                predictions: f.predictions,
                brierScore: f.brierScore
            };
        });
        
        // Scales
        const xExtent = d3.extent(scatterData, d => d.skill);
        const yExtent = d3.extent(scatterData, d => d.luck);
        
        const x = d3.scaleLinear()
            .domain([xExtent[0] - 0.05, xExtent[1] + 0.05])
            .range([0, chartWidth]);
        
        const y = d3.scaleLinear()
            .domain([yExtent[0] - 0.05, yExtent[1] + 0.05])
            .range([chartHeight, 0]);
        
        // Quadrant lines (median split)
        const medianSkill = d3.median(scatterData, d => d.skill);
        const medianLuck = d3.median(scatterData, d => d.luck);
        
        g.append('line')
            .attr('x1', x(medianSkill))
            .attr('x2', x(medianSkill))
            .attr('y1', 0)
            .attr('y2', chartHeight)
            .attr('stroke', '#475569')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.5);
        
        g.append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', y(medianLuck))
            .attr('y2', y(medianLuck))
            .attr('stroke', '#475569')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.5);
        
        // Quadrant labels
        const quadrants = [
            { x: chartWidth * 0.75, y: chartHeight * 0.25, label: 'High Skill\nLow Luck', color: '#10b981' },
            { x: chartWidth * 0.75, y: chartHeight * 0.75, label: 'High Skill\nHigh Luck', color: '#fbbf24' },
            { x: chartWidth * 0.25, y: chartHeight * 0.25, label: 'Low Skill\nLow Luck', color: '#64748b' },
            { x: chartWidth * 0.25, y: chartHeight * 0.75, label: 'Low Skill\nHigh Luck', color: '#ef4444' }
        ];
        
        quadrants.forEach(q => {
            g.append('text')
                .attr('x', q.x)
                .attr('y', q.y)
                .attr('text-anchor', 'middle')
                .attr('fill', q.color)
                .attr('opacity', 0.3)
                .attr('font-size', '11px')
                .attr('font-weight', 'bold')
                .selectAll('tspan')
                .data(q.label.split('\n'))
                .enter()
                .append('tspan')
                .attr('x', q.x)
                .attr('dy', (d, i) => i * 14)
                .text(d => d);
        });
        
        // Color scale based on predictions
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain(d3.extent(scatterData, d => d.predictions));
        
        // Points
        const circles = g.selectAll('circle')
            .data(scatterData)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.skill))
            .attr('cy', d => y(d.luck))
            .attr('r', 0)
            .attr('fill', d => colorScale(d.predictions))
            .attr('opacity', 0.8)
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer');
        
        // Animate
        circles.transition()
            .duration(600)
            .delay((d, i) => i * 20)
            .attr('r', 6);
        
        // Tooltips
        circles.on('mouseover', (event, d) => {
            const content = `
                <div class="tooltip-title">${d.name}</div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Skill Index:</span>
                    <span class="tooltip-value">${ui.formatNumber(d.skill, 3)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Luck Factor:</span>
                    <span class="tooltip-value">${ui.formatNumber(d.luck, 3)}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Total Predictions:</span>
                    <span class="tooltip-value">${d.predictions}</span>
                </div>
                <div class="tooltip-item">
                    <span class="tooltip-label">Brier Score:</span>
                    <span class="tooltip-value">${ui.formatNumber(d.brierScore, 4)}</span>
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
            .call(d3.axisBottom(x).tickFormat(d => ui.formatNumber(d, 2)))
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
            .text('Skill Index (1 - Brier Score)');
        
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -chartHeight / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Luck Factor (Sample Size + Calibration)');
    }
    
    renderStats() {
        const forecasters = this.data.forecasters;

        if (!forecasters || forecasters.length === 0) {
            const statsPanel = document.getElementById('stats-panel');
            statsPanel.appendChild(ui.createStatsGrid({
                'Total Forecasters': 0,
                'Avg Brier Score': 'N/A',
                'Median Brier': 'N/A',
                'Best Brier': 'N/A',
                'Avg Log Score': 'N/A',
                'Total Predictions': 0,
                'Avg Predictions per User': 'N/A',
                'Top 10% Brier': 'N/A'
            }));
            return;
        }
        
        // Calculate aggregate statistics
        const brierScores = forecasters.map(f => f.brierScore);
        const logScores = forecasters.map(f => f.logScore);
        const predictions = forecasters.map(f => f.predictions);
        
        const statsData = {
            'Total Forecasters': forecasters.length,
            'Avg Brier Score': ui.formatNumber(stats.mean(brierScores), 4),
            'Median Brier': ui.formatNumber(d3.median(brierScores), 4),
            'Best Brier': ui.formatNumber(d3.min(brierScores), 4),
            'Avg Log Score': ui.formatNumber(stats.mean(logScores), 3),
            'Total Predictions': d3.sum(predictions),
            'Avg Predictions per User': ui.formatNumber(stats.mean(predictions), 1),
            'Top 10% Brier': ui.formatNumber(d3.quantile(brierScores.sort(d3.ascending), 0.1), 4)
        };
        
        const statsPanel = document.getElementById('stats-panel');
        statsPanel.appendChild(ui.createStatsGrid(statsData));
    }
    
    renderMethodology() {
        const sections = [
            {
                title: 'Scoring Metrics',
                text: 'Brier Score measures calibration (0 = perfect). Log Score penalizes confident wrong predictions. Spherical Score rewards both accuracy and decisiveness (1 = perfect).'
            },
            {
                title: 'Skill vs. Luck',
                text: 'We estimate skill from scores and luck from sample size and calibration variance. Top-right quadrant (high skill, low luck) indicates reliably strong forecasters.'
            },
            {
                title: 'Sample Size Matters',
                text: 'Forecasters with fewer predictions have higher uncertainty. Color intensity shows prediction volume. Require ≥50 predictions for statistical significance.'
            }
        ];
        
        const formulas = `
            <div class="mt-4 text-sm">
                <p class="text-slate-400 mb-2">Key formulas:</p>
                <div class="bg-slate-900/50 p-3 rounded border border-slate-700">
                    <p class="mb-2">Brier Score: $$BS = \\frac{1}{N}\\sum_{i=1}^{N}(p_i - o_i)^2$$</p>
                    <p class="mb-2">Log Score: $$LS = -\\frac{1}{N}\\sum_{i=1}^{N}[o_i\\log(p_i) + (1-o_i)\\log(1-p_i)]$$</p>
                    <p>Spherical: $$SS = \\frac{1}{N}\\sum_{i=1}^{N}\\frac{p_i \\cdot o_i}{\\sqrt{p_i^2 + (1-p_i)^2}}$$</p>
                </div>
            </div>
        `;
        
        const panel = ui.createMethodologyPanel('How Scoring Works', sections);
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
