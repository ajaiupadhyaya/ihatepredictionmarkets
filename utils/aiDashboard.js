// Analysis Dashboard Component
// Provides market overview with automated insights and recommendations

import { aiAnalyzer } from './aiAnalyzer.js';
import * as d3 from 'd3';

export class AIDashboard {
    constructor(container) {
        this.container = container;
        this.summary = null;
    }

    /**
    * Render automated analysis dashboard
     * @param {Object} data - Market data
     */
    async render(data) {
        // Generate analysis summary
        this.summary = aiAnalyzer.generateMarketSummary(data);

        // Build dashboard HTML
        this.container.innerHTML = `
            <div class="ai-dashboard fade-in">
                <!-- Overview Section -->
                <div class="dashboard-section overview-section">
                    <div class="section-header">
                        <div class="flex items-center gap-3">
                            <div class="ai-badge">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                                </svg>
                                <span>Quant Analysis</span>
                            </div>
                            <h3>Market Overview</h3>
                        </div>
                        <div class="timestamp">Generated ${new Date().toLocaleTimeString()}</div>
                    </div>
                    
                    <div class="overview-content">
                        <p class="overview-text">${this.summary.overview.text}</p>
                        
                        <div class="metrics-row">
                            <div class="metric-card">
                                <div class="metric-icon">📊</div>
                                <div class="metric-content">
                                    <div class="metric-value">${this.summary.overview.metrics.totalMarkets}</div>
                                    <div class="metric-label">Total Markets</div>
                                </div>
                            </div>
                            
                            <div class="metric-card">
                                <div class="metric-icon">🎯</div>
                                <div class="metric-content">
                                    <div class="metric-value">${this.summary.overview.metrics.activeMarkets}</div>
                                    <div class="metric-label">Active</div>
                                </div>
                            </div>
                            
                            <div class="metric-card">
                                <div class="metric-icon">✅</div>
                                <div class="metric-content">
                                    <div class="metric-value">${this.summary.overview.metrics.resolvedMarkets}</div>
                                    <div class="metric-label">Resolved</div>
                                </div>
                            </div>
                            
                            <div class="metric-card">
                                <div class="metric-icon">💰</div>
                                <div class="metric-content">
                                    <div class="metric-value">$${(this.summary.overview.metrics.totalVolume / 1e6).toFixed(2)}M</div>
                                    <div class="metric-label">Total Volume</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Key Insights Section -->
                <div class="dashboard-section insights-section">
                    <div class="section-header">
                        <h3>🔍 Key Insights</h3>
                    </div>
                    
                    <div class="insights-grid">
                        ${this.renderInsights()}
                    </div>
                </div>

                <!-- Anomalies Section -->
                ${this.summary.anomalies.length > 0 ? `
                    <div class="dashboard-section anomalies-section">
                        <div class="section-header">
                            <h3>⚠️ Detected Anomalies</h3>
                            <span class="badge">${this.summary.anomalies.length}</span>
                        </div>
                        
                        <div class="anomalies-list">
                            ${this.renderAnomalies()}
                        </div>
                    </div>
                ` : ''}

                <!-- Recommendations Section -->
                <div class="dashboard-section recommendations-section">
                    <div class="section-header">
                        <h3>💡 Recommendations</h3>
                    </div>
                    
                    <div class="recommendations-list">
                        ${this.renderRecommendations()}
                    </div>
                </div>

                <!-- Risk Assessment Section -->
                <div class="dashboard-section risk-section">
                    <div class="section-header">
                        <h3>⚡ Risk Assessment</h3>
                    </div>
                    
                    <div class="risk-content">
                        ${this.renderRiskAssessment()}
                    </div>
                </div>
            </div>
        `;

        // Add custom styles
        this.injectStyles();

        // Render risk gauge visualization
        this.renderRiskGauge();
    }

    renderInsights() {
        return this.summary.keyInsights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-header">
                    <span class="insight-icon">${this.getInsightIcon(insight.type)}</span>
                    <span class="insight-category">${insight.category}</span>
                    <span class="confidence-badge">${Math.round(insight.confidence * 100)}% confidence</span>
                </div>
                <p class="insight-message">${insight.message}</p>
            </div>
        `).join('');
    }

    renderAnomalies() {
        return this.summary.anomalies.slice(0, 5).map(anomaly => `
            <div class="anomaly-item severity-${anomaly.severity}">
                <div class="anomaly-header">
                    <span class="anomaly-type">${this.formatAnomalyType(anomaly.type)}</span>
                    <span class="severity-badge ${anomaly.severity}">${anomaly.severity}</span>
                </div>
                <p class="anomaly-description">${anomaly.description}</p>
                ${anomaly.market ? `<div class="anomaly-market">${anomaly.market}</div>` : ''}
            </div>
        `).join('');
    }

    renderRecommendations() {
        return this.summary.recommendations.map(rec => `
            <div class="recommendation-item priority-${rec.priority}">
                <div class="recommendation-header">
                    <span class="priority-indicator ${rec.priority}"></span>
                    <span class="recommendation-category">${rec.category}</span>
                    <span class="priority-label">${rec.priority} priority</span>
                </div>
                <div class="recommendation-action">${rec.action}</div>
                <div class="recommendation-rationale">${rec.rationale}</div>
            </div>
        `).join('');
    }

    renderRiskAssessment() {
        const risk = this.summary.riskAssessment;
        
        return `
            <div class="risk-overview">
                <div class="risk-level-container">
                    <div class="risk-level ${risk.level}">
                        <div class="risk-icon">${this.getRiskIcon(risk.level)}</div>
                        <div class="risk-label">${risk.level.toUpperCase()} RISK</div>
                    </div>
                    <div class="risk-description">${risk.description}</div>
                </div>
                
                <div id="risk-gauge" class="risk-gauge"></div>
                
                <div class="risk-components">
                    <div class="component-item">
                        <div class="component-label">Volatility</div>
                        <div class="component-bar">
                            <div class="component-fill" style="width: ${risk.components.volatility.value * 100}%"></div>
                        </div>
                        <div class="component-value">${(risk.components.volatility.value * 100).toFixed(1)}%</div>
                    </div>
                    
                    <div class="component-item">
                        <div class="component-label">Concentration</div>
                        <div class="component-bar">
                            <div class="component-fill" style="width: ${risk.components.concentration.value * 100}%"></div>
                        </div>
                        <div class="component-value">${(risk.components.concentration.value * 100).toFixed(1)}%</div>
                    </div>
                    
                    <div class="component-item">
                        <div class="component-label">Calibration Error</div>
                        <div class="component-bar">
                            <div class="component-fill" style="width: ${risk.components.calibration.value * 100}%"></div>
                        </div>
                        <div class="component-value">${(risk.components.calibration.value * 100).toFixed(1)}%</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRiskGauge() {
        const risk = this.summary.riskAssessment;
        const container = document.getElementById('risk-gauge');
        if (!container) return;

        const width = 300;
        const height = 200;
        const radius = Math.min(width, height) / 2 - 20;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height - 20})`);

        // Background arc
        const arc = d3.arc()
            .innerRadius(radius - 20)
            .outerRadius(radius)
            .startAngle(-Math.PI / 2)
            .endAngle(Math.PI / 2);

        g.append('path')
            .attr('d', arc)
            .attr('fill', '#1e293b');

        // Risk level arc
        const riskArc = d3.arc()
            .innerRadius(radius - 20)
            .outerRadius(radius)
            .startAngle(-Math.PI / 2)
            .endAngle(-Math.PI / 2 + Math.PI * risk.score);

        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'risk-gradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', width)
            .attr('y2', 0);

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#10b981');

        gradient.append('stop')
            .attr('offset', '50%')
            .attr('stop-color', '#fbbf24');

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#ef4444');

        g.append('path')
            .attr('d', riskArc)
            .attr('fill', 'url(#risk-gradient)')
            .style('filter', 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.5))');

        // Needle
        const needleAngle = -Math.PI / 2 + Math.PI * risk.score;
        const needleLength = radius - 30;

        g.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', needleLength * Math.cos(needleAngle))
            .attr('y2', needleLength * Math.sin(needleAngle))
            .attr('stroke', '#22d3ee')
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round');

        g.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 5)
            .attr('fill', '#22d3ee');

        // Labels
        g.append('text')
            .attr('x', -radius + 10)
            .attr('y', 10)
            .attr('text-anchor', 'start')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('Low');

        g.append('text')
            .attr('x', radius - 10)
            .attr('y', 10)
            .attr('text-anchor', 'end')
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .text('High');

        // Score text
        g.append('text')
            .attr('x', 0)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .attr('fill', '#22d3ee')
            .attr('font-size', '24px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'JetBrains Mono, monospace')
            .text((risk.score * 100).toFixed(1));
    }

    getInsightIcon(type) {
        const icons = {
            positive: '✅',
            warning: '⚠️',
            neutral: 'ℹ️',
            negative: '❌'
        };
        return icons[type] || 'ℹ️';
    }

    getRiskIcon(level) {
        const icons = {
            low: '🟢',
            moderate: '🟡',
            high: '🔴'
        };
        return icons[level] || '⚪';
    }

    formatAnomalyType(type) {
        return type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    injectStyles() {
        if (document.getElementById('ai-dashboard-styles')) return;

        const style = document.createElement('style');
        style.id = 'ai-dashboard-styles';
        style.textContent = `
            .ai-dashboard {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }

            .dashboard-section {
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: 12px;
                padding: 24px;
            }

            .section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--color-border);
            }

            .section-header h3 {
                font-size: 18px;
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .ai-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(251, 191, 36, 0.2));
                border: 1px solid var(--color-accent-cyan);
                border-radius: 6px;
                color: var(--color-accent-cyan);
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .timestamp {
                font-size: 11px;
                color: var(--color-text-secondary);
                font-family: 'JetBrains Mono', monospace;
            }

            .overview-text {
                font-size: 14px;
                line-height: 1.7;
                color: var(--color-text-secondary);
                margin-bottom: 20px;
            }

            .metrics-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
            }

            .metric-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                background: var(--color-bg-tertiary);
                border: 1px solid var(--color-border);
                border-radius: 8px;
                transition: all 0.3s ease;
            }

            .metric-card:hover {
                border-color: var(--color-accent-cyan);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(34, 211, 238, 0.1);
            }

            .metric-icon {
                font-size: 32px;
            }

            .metric-value {
                font-size: 24px;
                font-weight: 700;
                color: var(--color-accent-cyan);
                font-family: 'JetBrains Mono', monospace;
            }

            .metric-label {
                font-size: 12px;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .insights-grid {
                display: grid;
                gap: 16px;
            }

            .insight-card {
                padding: 16px;
                background: var(--color-bg-tertiary);
                border-left: 4px solid;
                border-radius: 8px;
            }

            .insight-card.positive { border-color: #10b981; }
            .insight-card.warning { border-color: #fbbf24; }
            .insight-card.neutral { border-color: #94a3b8; }
            .insight-card.negative { border-color: #ef4444; }

            .insight-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .insight-icon {
                font-size: 16px;
            }

            .insight-category {
                font-size: 13px;
                font-weight: 600;
                color: var(--color-accent-cyan);
            }

            .confidence-badge {
                margin-left: auto;
                font-size: 11px;
                padding: 2px 8px;
                background: rgba(34, 211, 238, 0.2);
                border-radius: 4px;
                color: var(--color-accent-cyan);
                font-family: 'JetBrains Mono', monospace;
            }

            .insight-message {
                font-size: 13px;
                line-height: 1.6;
                color: var(--color-text-secondary);
            }

            .anomalies-list, .recommendations-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .anomaly-item, .recommendation-item {
                padding: 16px;
                background: var(--color-bg-tertiary);
                border: 1px solid var(--color-border);
                border-radius: 8px;
            }

            .anomaly-header, .recommendation-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }

            .severity-badge {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .severity-badge.high { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
            .severity-badge.medium { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
            .severity-badge.low { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }

            .risk-overview {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                gap: 32px;
                align-items: center;
            }

            .risk-level-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .risk-level {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                border-radius: 8px;
            }

            .risk-level.low { background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981; }
            .risk-level.moderate { background: rgba(251, 191, 36, 0.1); border: 2px solid #fbbf24; }
            .risk-level.high { background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; }

            .risk-icon { font-size: 24px; }

            .risk-label {
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 1px;
            }

            .risk-components {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .component-item {
                display: grid;
                grid-template-columns: 120px 1fr 60px;
                gap: 12px;
                align-items: center;
            }

            .component-label {
                font-size: 12px;
                color: var(--color-text-secondary);
            }

            .component-bar {
                height: 8px;
                background: var(--color-bg-primary);
                border-radius: 4px;
                overflow: hidden;
            }

            .component-fill {
                height: 100%;
                background: linear-gradient(90deg, #22d3ee, #fbbf24);
                transition: width 0.6s ease;
            }

            .component-value {
                font-size: 12px;
                font-family: 'JetBrains Mono', monospace;
                color: var(--color-accent-cyan);
                text-align: right;
            }

            .priority-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }

            .priority-indicator.high { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
            .priority-indicator.medium { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; }
            .priority-indicator.low { background: #94a3b8; }

            .recommendation-action {
                font-size: 14px;
                font-weight: 600;
                color: var(--color-text-primary);
                margin-bottom: 6px;
            }

            .recommendation-rationale {
                font-size: 12px;
                color: var(--color-text-secondary);
                line-height: 1.5;
            }

            .badge {
                padding: 4px 8px;
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                font-family: 'JetBrains Mono', monospace;
            }
        `;
        
        document.head.appendChild(style);
    }
}
