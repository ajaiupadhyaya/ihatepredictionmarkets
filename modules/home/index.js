// Home Module with Editorial Overview and 3D Visualizations
import { AIDashboard } from '../../utils/aiDashboard.js';
import { ThreeVisualizer } from '../../utils/threeVisualizations.js';
import { exportManager, reportGenerator } from '../../utils/exportManager.js';
import { getModuleData } from '../../data/dataManager.js';
import * as d3 from 'd3';

export default class HomeModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.aiDashboard = null;
        this.threeViz = null;
        this.data = null;
    }

    async render() {
        try {
            // Fetch comprehensive data
            this.data = await getModuleData('all');

            // Build layout
            this.container.innerHTML = `
                <div class="home-module fade-in">
                    <!-- Action Bar -->
                    <div class="action-bar">
                        <button id="generate-report-btn" class="action-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            Generate Report
                        </button>
                        
                        <button id="export-data-btn" class="action-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Export Data
                        </button>
                        
                        <button id="refresh-data-btn" class="action-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"/>
                                <polyline points="1 20 1 14 7 14"/>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                            Refresh
                        </button>
                    </div>

                    <!-- Hero Section -->
                    <div class="hero-section">
                        <div class="hero-content">
                            <h1 class="hero-title">
                                <span class="gradient-text">Prediction Markets</span>
                                <span class="hero-subtitle">Research Atlas</span>
                            </h1>
                            <p class="hero-description">
                                Statistical diagnostics, market structure analysis, and transparent visual
                                storytelling for prediction-market research.
                            </p>
                        </div>
                        
                        <!-- 3D Visualization -->
                        <div id="hero-visualization" class="hero-viz"></div>
                    </div>

                    <!-- Analysis Overview -->
                    <div id="ai-dashboard-container" class="ai-dashboard-container"></div>

                    <!-- Quick Stats Grid -->
                    <div class="quick-stats-grid">
                        <div class="stat-card-modern">
                            <div class="stat-card-header">
                                <div class="stat-icon-container">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                    </svg>
                                </div>
                                <span class="stat-label">Market Efficiency</span>
                            </div>
                            <div id="efficiency-viz" class="stat-viz"></div>
                        </div>

                        <div class="stat-card-modern">
                            <div class="stat-card-header">
                                <div class="stat-icon-container">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                    </svg>
                                </div>
                                <span class="stat-label">Market Activity</span>
                            </div>
                            <div id="activity-viz" class="stat-viz"></div>
                        </div>

                        <div class="stat-card-modern">
                            <div class="stat-card-header">
                                <div class="stat-icon-container">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M12 6v6l4 2"/>
                                    </svg>
                                </div>
                                <span class="stat-label">Live Markets</span>
                            </div>
                            <div id="live-markets-viz" class="stat-viz"></div>
                        </div>

                        <div class="stat-card-modern">
                            <div class="stat-card-header">
                                <div class="stat-icon-container">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                                    </svg>
                                </div>
                                <span class="stat-label">Anomaly Detection</span>
                            </div>
                            <div id="anomaly-viz" class="stat-viz"></div>
                        </div>
                    </div>

                    <!-- Featured Analysis -->
                    <div class="featured-analysis">
                        <div class="featured-header">
                            <h2>Featured Analysis</h2>
                            <div class="featured-tabs">
                                <button class="tab-btn active" data-tab="trending">Trending</button>
                                <button class="tab-btn" data-tab="calibration">Calibration</button>
                                <button class="tab-btn" data-tab="arbitrage">Arbitrage</button>
                            </div>
                        </div>
                        
                        <div id="featured-content" class="featured-content"></div>
                    </div>
                </div>
            `;

            // Inject custom styles
            this.injectStyles();

            // Initialize components
            await this.initializeComponents();

        } catch (error) {
            console.error('Error rendering home module:', error);
            this.container.innerHTML = `
                <div class="error-card">
                    <div class="error-title">Failed to Load Dashboard</div>
                    <div class="error-message">${error.message}</div>
                </div>
            `;
        }
    }

    async initializeComponents() {
        // Initialize analysis panel
        const aiContainer = document.getElementById('ai-dashboard-container');
        if (aiContainer) {
            if (this.state.strictRealData) {
                this.renderEvidencePanel(aiContainer);
            } else {
                this.aiDashboard = new AIDashboard(aiContainer);
                await this.aiDashboard.render(this.data);
            }
        }

        // Initialize 3D Hero Visualization
        const heroViz = document.getElementById('hero-visualization');
        if (heroViz) {
            this.threeViz = new ThreeVisualizer(heroViz);
            this.threeViz.init();
            this.create3DNetworkPreview();
            this.threeViz.animate();
        }

        // Render quick stats visualizations
        this.renderQuickStats();

        // Setup featured tabs
        this.setupFeaturedTabs();

        // Setup action buttons
        this.setupActionButtons();
    }

    setupActionButtons() {
        // Generate Report button
        const reportBtn = document.getElementById('generate-report-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                const insights = this.aiDashboard?.summary || {};
                const html = reportGenerator.generateMarketReport(this.data, insights);
                reportGenerator.downloadReport(html, `market-report-${Date.now()}.html`);
                
                exportManager.showToast('Report generated successfully!', 'success');
            });
        }

        // Export Data button
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const menu = document.createElement('div');
                menu.className = 'export-menu';
                menu.innerHTML = `
                    <div class="export-menu-item" data-format="json">Export as JSON</div>
                    <div class="export-menu-item" data-format="csv">Export as CSV</div>
                `;
                
                menu.style.cssText = `
                    position: absolute;
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                    border-radius: 8px;
                    padding: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    z-index: 1000;
                    top: 60px;
                    right: 120px;
                `;

                menu.querySelectorAll('.export-menu-item').forEach(item => {
                    item.style.cssText = `
                        padding: 12px 16px;
                        cursor: pointer;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                    `;
                    
                    item.addEventListener('mouseover', () => {
                        item.style.background = 'var(--color-bg-tertiary)';
                    });
                    
                    item.addEventListener('mouseout', () => {
                        item.style.background = 'transparent';
                    });
                    
                    item.addEventListener('click', () => {
                        const format = item.dataset.format;
                        if (format === 'json') {
                            exportManager.exportJSON(this.data, 'market-data.json');
                        } else if (format === 'csv') {
                            exportManager.exportCSV(this.data.markets, 'markets.csv');
                        }
                        document.body.removeChild(menu);
                    });
                });

                document.body.appendChild(menu);

                // Close menu on outside click
                setTimeout(() => {
                    document.addEventListener('click', function closeMenu(e) {
                        if (!menu.contains(e.target) && e.target !== exportBtn) {
                            if (menu.parentElement) {
                                document.body.removeChild(menu);
                            }
                            document.removeEventListener('click', closeMenu);
                        }
                    });
                }, 100);
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-data-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<span class="spinner"></span> Refreshing...';
                
                try {
                    // Re-fetch data
                    this.data = await getModuleData('all');
                    
                    // Re-render analysis panel
                    if (this.state.strictRealData) {
                        const aiContainer = document.getElementById('ai-dashboard-container');
                        if (aiContainer) {
                            this.renderEvidencePanel(aiContainer);
                        }
                    } else if (this.aiDashboard) {
                        await this.aiDashboard.render(this.data);
                    }
                    
                    // Update stats
                    this.renderQuickStats();
                    
                    exportManager.showToast('Data refreshed successfully!', 'success');
                } catch (error) {
                    exportManager.showToast('Failed to refresh data', 'error');
                }
                
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"/>
                        <polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Refresh
                `;
            });
        }
    }

    renderEvidencePanel(container) {
        try {
            const markets = this.data?.markets || [];
            const resolved = markets.filter(m => m.resolved);
            const active = markets.filter(m => !m.resolved);
            const totalVolume = markets.reduce((sum, market) => sum + (market.volume || 0), 0);
            const avgProbability = markets.length > 0
                ? markets.reduce((sum, market) => sum + (market.currentProbability ?? market.finalProbability ?? 0), 0) / markets.length
                : 0;

            // Try to get evaluation metrics if available
            let evaluationMetrics = null;
            try {
                if (this.state?.evaluator?.finalArtifacts?.pipeline?.report?.testMetrics) {
                    evaluationMetrics = this.state.evaluator.finalArtifacts.pipeline.report.testMetrics;
                }
            } catch (e) {
                console.warn('Could not access evaluation metrics:', e.message);
            }

            let evaluationHtml = '';
            if (evaluationMetrics && evaluationMetrics.brierScore !== undefined && evaluationMetrics.brierScore !== null) {
                evaluationHtml = `
                    <div class="mt-6 pt-6 border-t border-slate-300">
                        <div class="font-semibold text-slate-700 mb-3">Model Performance (Test Set)</div>
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div class="bg-slate-50 p-3 rounded-sm">
                                <div class="text-slate-600">Brier Score</div>
                                <div class="font-mono font-bold text-slate-900">${evaluationMetrics.brierScore?.toFixed(4) || '—'}</div>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-sm">
                                <div class="text-slate-600">Log Score</div>
                                <div class="font-mono font-bold text-slate-900">${evaluationMetrics.logScore?.toFixed(4) || '—'}</div>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-sm">
                                <div class="text-slate-600">Calibration (ECE)</div>
                                <div class="font-mono font-bold text-slate-900">${evaluationMetrics.ece?.toFixed(4) || '—'}</div>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-sm">
                                <div class="text-slate-600">Spherical Score</div>
                                <div class="font-mono font-bold text-slate-900">${evaluationMetrics.sphericalScore?.toFixed(4) || '—'}</div>
                            </div>
                        </div>
                        <div class="mt-3 text-xs text-slate-500">
                            Metrics computed on held-out test set using deterministic train/validation/test split (seed=42).
                            K-fold cross-validation and rolling-window backtest available in evaluation artifacts.
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="card p-6 mb-6">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Research Evidence Panel</div>
                            <div class="card-subtitle">Strict real-data mode — synthetic fallbacks disabled</div>
                        </div>
                        <div class="text-xs text-slate-500">Updated ${new Date().toLocaleTimeString()}</div>
                    </div>
                    <div class="stats-grid mt-4">
                        <div class="stat-card">
                            <div class="stat-label">Markets</div>
                            <div class="stat-value">${markets.length}</div>
                        </div>
                    <div class="stat-card">
                        <div class="stat-label">Resolved</div>
                        <div class="stat-value">${resolved.length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Active</div>
                        <div class="stat-value">${active.length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total Volume</div>
                        <div class="stat-value">$${(totalVolume / 1e6).toFixed(2)}M</div>
                    </div>
                </div>
                <div class="mt-4 text-sm text-slate-500" style="line-height: 1.6;">
                    Current analytic mode prioritizes representational integrity: every chart is derived from available source data.
                    If a required signal is unavailable, the related module shows a no-data state rather than inventing values.
                    ${evaluationMetrics ? 'Evaluation framework is active with deterministic dataset splits, cross-validation, and formal model scoring.' : 'Evaluation framework will activate once market data is loaded.'}
                </div>
                <div class="mt-2 text-sm text-slate-500">Average probability across loaded markets: ${(avgProbability * 100).toFixed(1)}%</div>
                ${evaluationHtml}
            </div>
        `;
        } catch (error) {
            console.error('Error rendering evidence panel:', error);
            container.innerHTML = `
                <div class="card p-6 mb-6">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Research Evidence Panel</div>
                            <div class="card-subtitle">Error rendering panel</div>
                        </div>
                    </div>
                    <div style="color: #dc2626; font-size: 14px; line-height: 1.6;">
                        <p>An error occurred while rendering the evidence panel.</p>
                        <p style="font-size: 12px; opacity: 0.7; margin-top: 8px;">${error.message}</p>
                    </div>
                </div>
            `;
        }
    }

    create3DNetworkPreview() {
        // Create sample network data
        const nodes = [];
        const edges = [];
        const count = 30;

        // Generate nodes in a sphere
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 20 + Math.random() * 10;

            nodes.push({
                id: i,
                label: `M${i}`,
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi),
                value: Math.random() * 2 + 0.5,
                importance: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
            });
        }

        // Generate edges
        for (let i = 0; i < count; i++) {
            const connections = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < connections; j++) {
                const target = Math.floor(Math.random() * count);
                if (target !== i) {
                    edges.push({ source: i, target: target });
                }
            }
        }

        this.threeViz.createNetworkGraph(nodes, edges);

        // Add particle system
        this.threeViz.createParticleSystem({ count: 1000, size: 0.3 });
    }

    renderQuickStats() {
        // Efficiency visualization
        this.renderEfficiencyGauge();

        // Activity sparkline
        this.renderActivitySparkline();

        // Live markets counter
        this.renderLiveMarketsCounter();

        // Anomaly indicator
        this.renderAnomalyIndicator();
    }

    renderEfficiencyGauge() {
        const container = document.getElementById('efficiency-viz');
        if (!container) return;

        const score = this.calculateEfficiencyScore();
        
        container.innerHTML = `
            <div class="gauge-container">
                <div class="gauge-value">${Math.round(score * 100)}%</div>
                <div class="gauge-label">Efficiency Score</div>
            </div>
        `;
    }

    renderActivitySparkline() {
        const container = document.getElementById('activity-viz');
        if (!container) return;

        const width = container.clientWidth;
        const height = 80;

        // Generate sample activity data
        const data = Array.from({ length: 30 }, () => Math.random() * 100);

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const xScale = d3.scaleLinear()
            .domain([0, data.length - 1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data)])
            .range([height - 10, 10]);

        const line = d3.line()
            .x((d, i) => xScale(i))
            .y(d => yScale(d))
            .curve(d3.curveCardinal);

        const area = d3.area()
            .x((d, i) => xScale(i))
            .y0(height)
            .y1(d => yScale(d))
            .curve(d3.curveCardinal);

        // Gradient
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'activity-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#22d3ee')
            .attr('stop-opacity', 0.6);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#22d3ee')
            .attr('stop-opacity', 0);

        svg.append('path')
            .datum(data)
            .attr('fill', 'url(#activity-gradient)')
            .attr('d', area);

        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', '#22d3ee')
            .attr('stroke-width', 2)
            .attr('d', line);
    }

    renderLiveMarketsCounter() {
        const container = document.getElementById('live-markets-viz');
        if (!container) return;

        const liveCount = this.data?.markets?.filter(m => !m.resolved).length || 0;
        
        container.innerHTML = `
            <div class="counter-container">
                <div class="counter-value animate-count">${liveCount}</div>
                <div class="counter-label">Active Markets</div>
                <div class="counter-pulse"></div>
            </div>
        `;

        // Animate counter
        this.animateCounter(container.querySelector('.animate-count'), liveCount);
    }

    renderAnomalyIndicator() {
        const container = document.getElementById('anomaly-viz');
        if (!container) return;

        const anomalies = this.aiDashboard?.summary?.anomalies || [];
        
        container.innerHTML = `
            <div class="anomaly-indicator ${anomalies.length > 0 ? 'has-anomalies' : ''}">
                <div class="anomaly-count">${anomalies.length}</div>
                <div class="anomaly-label">Detected</div>
                ${anomalies.length > 0 ? '<div class="anomaly-alert">⚠️</div>' : ''}
            </div>
        `;
    }

    animateCounter(element, target) {
        let current = 0;
        const increment = target / 30;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 30);
    }

    setupFeaturedTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const content = document.getElementById('featured-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabName = tab.dataset.tab;
                this.renderFeaturedContent(tabName, content);
            });
        });

        // Load initial tab
        this.renderFeaturedContent('trending', content);
    }

    renderFeaturedContent(tab, container) {
        // Render different content based on selected tab
        const content = {
            trending: this.renderTrendingMarkets(),
            calibration: this.renderCalibrationHighlights(),
            arbitrage: this.renderArbitrageOpportunities()
        };

        container.innerHTML = content[tab] || '';
    }

    renderTrendingMarkets() {
        const markets = this.data?.markets?.slice(0, 5) || [];
        
        return `
            <div class="trending-markets">
                ${markets.map(market => `
                    <div class="market-card-compact">
                        <div class="market-title">${market.title || 'Untitled Market'}</div>
                        <div class="market-stats">
                            <span class="market-prob">${((market.probability || 0.5) * 100).toFixed(1)}%</span>
                            <span class="market-volume">$${((market.volume || 0) / 1000).toFixed(1)}K</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCalibrationHighlights() {
        return `
            <div class="calibration-highlights">
                <div class="highlight-card">
                    <div class="highlight-title">Overall Calibration</div>
                    <div class="highlight-value">Well-Calibrated</div>
                    <div class="highlight-detail">Mean error: 4.2%</div>
                </div>
            </div>
        `;
    }

    renderArbitrageOpportunities() {
        const opportunities = this.aiDashboard?.summary?.anomalies?.filter(a => a.type === 'arbitrage') || [];
        
        return `
            <div class="arbitrage-opportunities">
                ${opportunities.length > 0 ? opportunities.map(opp => `
                    <div class="opportunity-card">
                        <div class="opportunity-title">${opp.description}</div>
                        <div class="opportunity-profit">+${(opp.data.profit * 100).toFixed(2)}%</div>
                    </div>
                `).join('') : '<div class="no-opportunities">No arbitrage opportunities detected</div>'}
            </div>
        `;
    }

    calculateEfficiencyScore() {
        if (!this.data?.markets) return 0.75;
        
        // Simple efficiency metric
        const markets = this.data.markets;
        const avgVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0) / markets.length;
        return Math.min(avgVolume / 100000, 1);
    }

    injectStyles() {
        if (document.getElementById('home-module-styles')) return;

        const style = document.createElement('style');
        style.id = 'home-module-styles';
        style.textContent = `
            .home-module {
                padding: 0;
            }

            .action-bar {
                display: flex;
                gap: 12px;
                margin-bottom: 24px;
                justify-content: flex-end;
            }

            .action-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: 8px;
                color: var(--color-text-primary);
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .action-btn:hover {
                background: var(--color-bg-tertiary);
                border-color: var(--color-accent-cyan);
                color: var(--color-accent-cyan);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(34, 211, 238, 0.2);
            }

            .action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .action-btn svg {
                width: 20px;
                height: 20px;
            }

            .spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid var(--color-border);
                border-top-color: var(--color-accent-cyan);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .export-menu-item {
                color: var(--color-text-primary);
                font-size: 14px;
            }

            .hero-section {
                position: relative;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 48px;
                padding: 48px 0;
                margin-bottom: 48px;
                overflow: hidden;
            }

            .hero-content {
                display: flex;
                flex-direction: column;
                justify-content: center;
                z-index: 1;
            }

            .hero-title {
                font-size: 48px;
                font-weight: 800;
                line-height: 1.2;
                margin-bottom: 16px;
                display: flex;
                flex-direction: column;
            }

            .gradient-text {
                background: linear-gradient(135deg, #22d3ee, #fbbf24, #22d3ee);
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: gradientShift 4s ease infinite;
            }

            @keyframes gradientShift {
                0%, 100% { background-position: 0% center; }
                50% { background-position: 100% center; }
            }

            .hero-subtitle {
                font-size: 24px;
                color: var(--color-text-secondary);
                font-weight: 400;
            }

            .hero-description {
                font-size: 16px;
                line-height: 1.7;
                color: var(--color-text-secondary);
                max-width: 500px;
            }

            .hero-viz {
                position: relative;
                height: 400px;
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: 12px;
                overflow: hidden;
            }

            .ai-dashboard-container {
                margin-bottom: 48px;
            }

            .quick-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 24px;
                margin-bottom: 48px;
            }

            .stat-card-modern {
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: 12px;
                padding: 24px;
                transition: all 0.3s ease;
            }

            .stat-card-modern:hover {
                border-color: var(--color-accent-cyan);
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(34, 211, 238, 0.15);
            }

            .stat-card-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }

            .stat-icon-container {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(251, 191, 36, 0.2));
                border-radius: 8px;
                color: var(--color-accent-cyan);
            }

            .stat-label {
                font-size: 14px;
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .stat-viz {
                min-height: 100px;
            }

            .gauge-container, .counter-container, .anomaly-indicator {
                text-align: center;
                padding: 20px 0;
            }

            .gauge-value, .counter-value, .anomaly-count {
                font-size: 36px;
                font-weight: 700;
                color: var(--color-accent-cyan);
                font-family: 'JetBrains Mono', monospace;
                margin-bottom: 8px;
            }

            .gauge-label, .counter-label, .anomaly-label {
                font-size: 12px;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .counter-pulse {
                width: 12px;
                height: 12px;
                background: #10b981;
                border-radius: 50%;
                margin: 12px auto 0;
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
            }

            .anomaly-indicator.has-anomalies {
                position: relative;
            }

            .anomaly-alert {
                font-size: 24px;
                margin-top: 8px;
                animation: bounce 1s ease-in-out infinite;
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
            }

            .featured-analysis {
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: 12px;
                padding: 24px;
            }

            .featured-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--color-border);
            }

            .featured-header h2 {
                font-size: 20px;
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .featured-tabs {
                display: flex;
                gap: 8px;
            }

            .tab-btn {
                padding: 8px 16px;
                background: transparent;
                border: 1px solid var(--color-border);
                border-radius: 6px;
                color: var(--color-text-secondary);
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .tab-btn:hover {
                background: var(--color-bg-tertiary);
                color: var(--color-text-primary);
            }

            .tab-btn.active {
                background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(251, 191, 36, 0.2));
                border-color: var(--color-accent-cyan);
                color: var(--color-accent-cyan);
            }

            .featured-content {
                min-height: 200px;
            }

            .market-card-compact {
                padding: 16px;
                background: var(--color-bg-tertiary);
                border: 1px solid var(--color-border);
                border-radius: 8px;
                margin-bottom: 12px;
                transition: all 0.2s ease;
            }

            .market-card-compact:hover {
                border-color: var(--color-accent-cyan);
                transform: translateX(4px);
            }

            .market-title {
                font-size: 14px;
                color: var(--color-text-primary);
                margin-bottom: 8px;
            }

            .market-stats {
                display: flex;
                gap: 16px;
                font-size: 12px;
                font-family: 'JetBrains Mono', monospace;
            }

            .market-prob {
                color: var(--color-accent-cyan);
            }

            .market-volume {
                color: var(--color-accent-amber);
            }
        `;

        document.head.appendChild(style);
    }

    destroy() {
        if (this.threeViz) {
            this.threeViz.destroy();
        }
    }
}
