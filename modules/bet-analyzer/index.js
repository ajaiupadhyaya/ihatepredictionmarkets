// Advanced Bet Analyzer Module - Comprehensive individual market analysis
// Uses sophisticated mathematical models from statistics, finance, and economics

import * as d3 from 'd3';
import * as stats from '../../stats/index.js';
import { getModuleData } from '../../data/dataManager.js';

export default class BetAnalyzerModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.selectedMarket = null;
        this.data = null;
    }

    async render() {
        this.data = await getModuleData('all');

        this.container.innerHTML = `
            <div class="bet-analyzer-module fade-in">
                <div class="module-header">
                    <h2 class="text-3xl font-bold text-cyan-400 mb-2">🎯 Advanced Bet Analyzer</h2>
                    <p class="text-slate-400">Deep dive mathematical analysis of individual markets with Bayesian updating, Kelly Criterion, and Monte Carlo simulations</p>
                </div>

                <!-- Market Selector -->
                <div class="card mb-6">
                    <div class="card-header">
                        <div class="card-title">Select Market to Analyze</div>
                    </div>
                    <div class="p-6">
                        <div class="market-search mb-4">
                            <input type="text" id="market-search" placeholder="Search markets..." 
                                   class="search-input" />
                        </div>
                        <div id="market-list" class="market-list"></div>
                    </div>
                </div>

                <!-- Analysis Dashboard (Hidden until market selected) -->
                <div id="analysis-dashboard" class="analysis-dashboard" style="display: none;">
                    <div class="card mb-6">
                        <div class="card-header">
                            <div class="card-title" id="selected-market-title">Market Details</div>
                        </div>
                        <div id="market-info" class="p-6"></div>
                    </div>

                    <div class="grid grid-cols-2 gap-6 mb-6">
                        <div class="card">
                            <div class="card-header">
                                <div>
                                    <div class="card-title">Bayesian Probability Update</div>
                                    <div class="card-subtitle">Interactive prior → evidence → posterior calculator</div>
                                </div>
                            </div>
                            <div id="bayesian-chart" class="chart-container"></div>
                            <div id="bayesian-controls" class="p-6"></div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <div>
                                    <div class="card-title">Kelly Criterion Optimization</div>
                                    <div class="card-subtitle">Optimal bet sizing for maximum log wealth growth</div>
                                </div>
                            </div>
                            <div id="kelly-chart" class="chart-container"></div>
                            <div id="kelly-stats" class="p-6"></div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6 mb-6">
                        <div class="card">
                            <div class="card-header">
                                <div>
                                    <div class="card-title">Monte Carlo Simulation</div>
                                    <div class="card-subtitle">10,000 simulated outcomes with full distribution</div>
                                </div>
                            </div>
                            <div id="monte-carlo-chart" class="chart-container"></div>
                            <div id="monte-carlo-stats" class="p-6"></div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <div>
                                    <div class="card-title">Expected Value Analysis</div>
                                    <div class="card-subtitle">Comprehensive profit/loss scenarios</div>
                                </div>
                            </div>
                            <div id="ev-analysis-chart" class="chart-container"></div>
                        </div>
                    </div>

                    <div class="card mb-6">
                        <div class="card-header">
                            <div class="card-title">Interactive Scenario Analysis</div>
                        </div>
                        <div id="scenario-analysis" class="p-6"></div>
                    </div>
                </div>
            </div>
        `;

        this.renderMarketList();
        this.setupSearch();
        this.injectStyles();
    }

    renderMarketList() {
        const container = document.getElementById('market-list');
        const markets = this.data.markets.slice(0, 50);

        container.innerHTML = markets.map((market, i) => `
            <div class="market-item" data-market-id="${i}">
                <div class="market-item-title">${market.title || 'Untitled Market'}</div>
                <div class="market-item-meta">
                    <span class="prob">${((market.probability || 0.5) * 100).toFixed(1)}%</span>
                    <span class="volume">$${((market.volume || 0) / 1000).toFixed(1)}K</span>
                    <span class="status ${market.resolved ? 'resolved' : 'active'}">${market.resolved ? 'Resolved' : 'Active'}</span>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.market-item').forEach(item => {
            item.addEventListener('click', () => {
                const marketId = parseInt(item.dataset.marketId);
                this.selectMarket(markets[marketId]);
            });
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('market-search');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.market-item');
            items.forEach(item => {
                const title = item.querySelector('.market-item-title').textContent.toLowerCase();
                item.style.display = title.includes(query) ? 'block' : 'none';
            });
        });
    }

    async selectMarket(market) {
        this.selectedMarket = market;
        
        const dashboard = document.getElementById('analysis-dashboard');
        dashboard.style.display = 'block';
        dashboard.scrollIntoView({ behavior: 'smooth' });

        document.getElementById('selected-market-title').textContent = market.title || 'Market Analysis';

        this.renderMarketInfo();
        this.renderBayesianAnalysis();
        this.renderKellyCriterion();
        this.renderMonteCarloSimulation();
        this.renderEVAnalysis();
        this.renderScenarioAnalysis();
    }

    renderMarketInfo() {
        const market = this.selectedMarket;
        const container = document.getElementById('market-info');

        container.innerHTML = `
            <div class="grid grid-cols-4 gap-4">
                <div class="stat-box">
                    <div class="stat-label">Current Probability</div>
                    <div class="stat-value">${((market.probability || 0.5) * 100).toFixed(2)}%</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Total Volume</div>
                    <div class="stat-value">$${((market.volume || 0) / 1000).toFixed(1)}K</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Status</div>
                    <div class="stat-value">${market.resolved ? 'Resolved' : 'Active'}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Category</div>
                    <div class="stat-value">${market.category || 'Other'}</div>
                </div>
            </div>
        `;
    }

    renderBayesianAnalysis() {
        const container = document.getElementById('bayesian-chart');
        const controlsContainer = document.getElementById('bayesian-controls');

        const prior = this.selectedMarket.probability || 0.5;
        const width = container.clientWidth;
        const height = 300;

        const svg = d3.select(container).append('svg')
            .attr('width', width)
            .attr('height', height);

        const likelihoods = [0.1, 0.3, 0.5, 0.7, 0.9];
        const posteriors = likelihoods.map(likelihood => {
            const posterior = (likelihood * prior) / ((likelihood * prior) + ((1 - likelihood) * (1 - prior)));
            return { likelihood, posterior };
        });

        const xScale = d3.scaleLinear().domain([0, 1]).range([50, width - 50]);
        const yScale = d3.scaleLinear().domain([0, 1]).range([height - 50, 50]);

        svg.append('g').attr('transform', `translate(0, ${height - 50})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${(d * 100).toFixed(0)}%`))
            .attr('color', '#94a3b8');

        svg.append('g').attr('transform', `translate(50, 0)`)
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${(d * 100).toFixed(0)}%`))
            .attr('color', '#94a3b8');

        svg.append('line')
            .attr('x1', xScale(0)).attr('y1', yScale(0))
            .attr('x2', xScale(1)).attr('y2', yScale(1))
            .attr('stroke', '#64748b').attr('stroke-dasharray', '5,5');

        const line = d3.line().x(d => xScale(d.likelihood)).y(d => yScale(d.posterior))
            .curve(d3.curveMonotoneX);

        svg.append('path').datum(posteriors).attr('fill', 'none')
            .attr('stroke', '#22d3ee').attr('stroke-width', 3).attr('d', line);

        svg.selectAll('.posterior-point').data(posteriors).enter().append('circle')
            .attr('cx', d => xScale(d.likelihood)).attr('cy', d => yScale(d.posterior))
            .attr('r', 4).attr('fill', '#22d3ee');

        controlsContainer.innerHTML = `
            <div class="bayesian-controls">
                <div class="control-group">
                    <label>Prior Probability: <span id="prior-value">${(prior * 100).toFixed(0)}%</span></label>
                    <input type="range" id="prior-slider" min="1" max="99" value="${prior * 100}" class="slider" />
                </div>
                <div class="control-group">
                    <label>Evidence Strength: <span id="evidence-value">50%</span></label>
                    <input type="range" id="evidence-slider" min="1" max="99" value="50" class="slider" />
                </div>
                <div class="bayesian-result">
                    <div class="result-label">Posterior Probability:</div>
                    <div class="result-value" id="posterior-result">50.0%</div>
                </div>
            </div>
        `;

        const updateBayesian = () => {
            const p = parseFloat(document.getElementById('prior-slider').value) / 100;
            const e = parseFloat(document.getElementById('evidence-slider').value) / 100;
            const posterior = (e * p) / ((e * p) + ((1 - e) * (1 - p)));
            document.getElementById('prior-value').textContent = `${(p * 100).toFixed(0)}%`;
            document.getElementById('evidence-value').textContent = `${(e * 100).toFixed(0)}%`;
            document.getElementById('posterior-result').textContent = `${(posterior * 100).toFixed(1)}%`;
        };

        document.getElementById('prior-slider').addEventListener('input', updateBayesian);
        document.getElementById('evidence-slider').addEventListener('input', updateBayesian);
    }

    renderKellyCriterion() {
        const container = document.getElementById('kelly-chart');
        const statsContainer = document.getElementById('kelly-stats');

        const p = this.selectedMarket.probability || 0.5;
        const marketPrice = p;

        const calculateKelly = (trueProb, odds) => {
            const q = 1 - trueProb;
            const b = (1 / odds) - 1;
            return Math.max(0, (b * trueProb - q) / b);
        };

        const probabilities = d3.range(0, 1.01, 0.01);
        const kellyData = probabilities.map(truePr => ({
            trueProb: truePr,
            kelly: calculateKelly(truePr, marketPrice)
        }));

        const width = container.clientWidth;
        const height = 300;

        const svg = d3.select(container).append('svg')
            .attr('width', width).attr('height', height);

        const xScale = d3.scaleLinear().domain([0, 1]).range([50, width - 50]);
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(kellyData, d => d.kelly)])
            .range([height - 50, 50]);

        svg.append('g').attr('transform', `translate(0, ${height - 50})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${(d * 100).toFixed(0)}%`))
            .attr('color', '#94a3b8');

        svg.append('g').attr('transform', `translate(50, 0)`)
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${(d * 100).toFixed(0)}%`))
            .attr('color', '#94a3b8');

        const area = d3.area()
            .x(d => xScale(d.trueProb))
            .y0(height - 50)
            .y1(d => yScale(d.kelly))
            .curve(d3.curveMonotoneX);

        const gradient = svg.append('defs').append('linearGradient')
            .attr('id', 'kelly-gradient').attr('x1', '0%').attr('y1', '0%')
            .attr('x2', '0%').attr('y2', '100%');

        gradient.append('stop').attr('offset', '0%')
            .attr('stop-color', '#22d3ee').attr('stop-opacity', 0.6);
        gradient.append('stop').attr('offset', '100%')
            .attr('stop-color', '#22d3ee').attr('stop-opacity', 0);

        svg.append('path').datum(kellyData)
            .attr('fill', 'url(#kelly-gradient)').attr('d', area);

        const line = d3.line()
            .x(d => xScale(d.trueProb)).y(d => yScale(d.kelly))
            .curve(d3.curveMonotoneX);

        svg.append('path').datum(kellyData).attr('fill', 'none')
            .attr('stroke', '#22d3ee').attr('stroke-width', 2).attr('d', line);

        const optimalKelly = calculateKelly(p, marketPrice);
        statsContainer.innerHTML = `
            <div class="stats-grid-2">
                <div class="stat-item">
                    <div class="stat-label">Full Kelly</div>
                    <div class="stat-value">${(optimalKelly * 100).toFixed(2)}%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Half Kelly</div>
                    <div class="stat-value">${(optimalKelly * 0.5 * 100).toFixed(2)}%</div>
                </div>
            </div>
        `;
    }

    renderMonteCarloSimulation() {
        const container = document.getElementById('monte-carlo-chart');
        const statsContainer = document.getElementById('monte-carlo-stats');

        const numSimulations = 10000;
        const currentProb = this.selectedMarket.probability || 0.5;
        const betSize = 100;

        const simulations = [];
        let wins = 0;
        let totalPnL = 0;

        for (let i = 0; i < numSimulations; i++) {
            const outcome = Math.random() < currentProb ? 1 : 0;
            const pnl = outcome * (betSize / currentProb - betSize) - (!outcome) * betSize;
            simulations.push(pnl);
            totalPnL += pnl;
            if (outcome) wins++;
        }

        const bins = d3.bin().thresholds(50)(simulations);
        const width = container.clientWidth;
        const height = 300;

        const svg = d3.select(container).append('svg')
            .attr('width', width).attr('height', height);

        const xScale = d3.scaleLinear()
            .domain([d3.min(simulations), d3.max(simulations)])
            .range([50, width - 50]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .range([height - 50, 50]);

        svg.selectAll('rect').data(bins).enter().append('rect')
            .attr('x', d => xScale(d.x0))
            .attr('y', d => yScale(d.length))
            .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
            .attr('height', d => height - 50 - yScale(d.length))
            .attr('fill', d => d.x0 >= 0 ? '#10b981' : '#ef4444')
            .attr('opacity', 0.7);

        svg.append('g').attr('transform', `translate(0, ${height - 50})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `$${d.toFixed(0)}`))
            .attr('color', '#94a3b8');

        svg.append('g').attr('transform', `translate(50, 0)`)
            .call(d3.axisLeft(yScale).ticks(5)).attr('color', '#94a3b8');

        const mean = totalPnL / numSimulations;
        const sorted = simulations.sort((a, b) => a - b);
        const percentile5 = sorted[Math.floor(numSimulations * 0.05)];
        const percentile95 = sorted[Math.floor(numSimulations * 0.95)];
        const stdDev = Math.sqrt(simulations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numSimulations);

        statsContainer.innerHTML = `
            <div class="stats-grid-3">
                <div class="stat-item">
                    <div class="stat-label">Expected Value</div>
                    <div class="stat-value ${mean >= 0 ? 'positive' : 'negative'}">$${mean.toFixed(2)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Win Rate</div>
                    <div class="stat-value">${((wins / numSimulations) * 100).toFixed(2)}%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Std Deviation</div>
                    <div class="stat-value">$${stdDev.toFixed(2)}</div>
                </div>
            </div>
        `;
    }

    renderEVAnalysis() {
        const container = document.getElementById('ev-analysis-chart');

        const trueProbs = [0.3, 0.4, 0.5, 0.6, 0.7];
        const marketProb = this.selectedMarket.probability || 0.5;
        const betSizes = d3.range(0, 1001, 50);

        const width = container.clientWidth;
        const height = 400;

        const svg = d3.select(container).append('svg')
            .attr('width', width).attr('height', height);

        const xScale = d3.scaleLinear().domain([0, 1000]).range([80, width - 50]);
        const yScale = d3.scaleLinear().domain([-500, 500]).range([height - 50, 50]);

        svg.append('g').attr('transform', `translate(0, ${height - 50})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `$${d}`))
            .attr('color', '#94a3b8');

        svg.append('g').attr('transform', `translate(80, 0)`)
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `$${d}`))
            .attr('color', '#94a3b8');

        svg.append('line').attr('x1', 80).attr('y1', yScale(0))
            .attr('x2', width - 50).attr('y2', yScale(0))
            .attr('stroke', '#64748b');

        const colorScale = d3.scaleSequential(d3.interpolatePlasma)
            .domain([0, trueProbs.length - 1]);

        trueProbs.forEach((trueProb, i) => {
            const evData = betSizes.map(bet => ({
                bet,
                ev: bet * ((1 / marketProb - 1) * trueProb - (1 - trueProb))
            }));

            const line = d3.line().x(d => xScale(d.bet)).y(d => yScale(d.ev));
            svg.append('path').datum(evData).attr('fill', 'none')
                .attr('stroke', colorScale(i)).attr('stroke-width', 2).attr('d', line);
        });
    }

    renderScenarioAnalysis() {
        const container = document.getElementById('scenario-analysis');

        container.innerHTML = `
            <div class="scenario-builder">
                <h4 class="mb-4 text-lg font-semibold text-cyan-400">Build Your Scenario</h4>
                
                <div class="scenario-inputs">
                    <div class="input-group">
                        <label>Your Probability Estimate</label>
                        <input type="number" id="user-prob" min="0" max="100" value="50" class="number-input" />
                    </div>

                    <div class="input-group">
                        <label>Bet Amount ($)</label>
                        <input type="number" id="bet-amount" min="0" max="10000" value="100" class="number-input" />
                    </div>

                    <button id="calculate-scenario" class="btn-calculate">Calculate</button>
                </div>

                <div id="scenario-results" class="scenario-results mt-6"></div>
            </div>
        `;

        document.getElementById('calculate-scenario').addEventListener('click', () => {
            this.calculateScenario();
        });
    }

    calculateScenario() {
        const userProb = parseFloat(document.getElementById('user-prob').value) / 100;
        const betAmount = parseFloat(document.getElementById('bet-amount').value);
        const marketProb = this.selectedMarket.probability || 0.5;

        const ev = betAmount * ((1 / marketProb - 1) * userProb - (1 - userProb));
        const kelly = Math.max(0, userProb - (1 - userProb) / ((1 / marketProb) - 1));
        const winAmount = betAmount * (1 / marketProb - 1);
        const loseAmount = -betAmount;

        const resultsContainer = document.getElementById('scenario-results');
        resultsContainer.innerHTML = `
            <div class="scenario-output">
                <div class="output-section">
                    <h5 class="output-title">Expected Outcome</h5>
                    <div class="output-value ${ev >= 0 ? 'positive' : 'negative'} text-3xl font-bold">
                        ${ev >= 0 ? '+' : ''}$${ev.toFixed(2)}
                    </div>
                </div>

                <div class="output-grid">
                    <div class="output-item">
                        <div class="output-label">If Win</div>
                        <div class="output-value positive">+$${winAmount.toFixed(2)}</div>
                        <div class="output-prob">${(userProb * 100).toFixed(1)}% chance</div>
                    </div>

                    <div class="output-item">
                        <div class="output-label">If Lose</div>
                        <div class="output-value negative">-$${Math.abs(loseAmount).toFixed(2)}</div>
                        <div class="output-prob">${((1 - userProb) * 100).toFixed(1)}% chance</div>
                    </div>
                </div>

                <div class="kelly-recommendation">
                    <div class="recommendation-title">💡 Kelly Recommendation</div>
                    <div class="recommendation-text">
                        ${kelly > 0 
                            ? `Optimal: $${(kelly * 1000).toFixed(2)} (${(kelly * 100).toFixed(2)}% of bankroll)`
                            : 'No bet recommended - negative edge'}
                    </div>
                </div>
            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('bet-analyzer-styles')) return;

        const style = document.createElement('style');
        style.id = 'bet-analyzer-styles';
        style.textContent = `
            .bet-analyzer-module { max-width: 1400px; margin: 0 auto; }
            .module-header { margin-bottom: 32px; }
            .search-input { width: 100%; padding: 12px 16px; background: var(--color-bg-tertiary);
                border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-primary); }
            .market-list { max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
            .market-item { padding: 16px; background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
                border-radius: 8px; cursor: pointer; transition: all 0.2s ease; }
            .market-item:hover { border-color: var(--color-accent-cyan); transform: translateX(4px); }
            .market-item-title { font-size: 14px; color: var(--color-text-primary); margin-bottom: 8px; }
            .market-item-meta { display: flex; gap: 16px; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
            .market-item-meta .prob { color: var(--color-accent-cyan); }
            .market-item-meta .volume { color: var(--color-accent-amber); }
            .stat-box { background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; text-align: center; }
            .stat-label { font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 8px; }
            .stat-value { font-size: 24px; font-weight: 700; color: var(--color-accent-cyan);
                font-family: 'JetBrains Mono', monospace; }
            .stat-value.positive { color: #10b981; }
            .stat-value.negative { color: #ef4444; }
            .bayesian-controls, .option-controls { display: flex; flex-direction: column; gap: 16px; }
            .control-group { display: flex; flex-direction: column; gap: 8px; }
            .slider { width: 100%; height: 6px; border-radius: 3px; background: var(--color-bg-primary); }
            .bayesian-result { background: var(--color-bg-primary); padding: 16px; border-radius: 8px; margin-top: 8px; }
            .result-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; }
            .result-value { font-size: 32px; font-weight: 700; color: var(--color-accent-cyan);
                font-family: 'JetBrains Mono', monospace; }
            .stats-grid-2, .stats-grid-3 { display: grid; gap: 16px; }
            .stats-grid-2 { grid-template-columns: repeat(2, 1fr); }
            .stats-grid-3 { grid-template-columns: repeat(3, 1fr); }
            .stat-item { background: var(--color-bg-primary); padding: 16px; border-radius: 8px; text-align: center; }
            .scenario-builder { background: var(--color-bg-tertiary); padding: 24px; border-radius: 8px; }
            .scenario-inputs { display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: end; }
            .input-group { display: flex; flex-direction: column; gap: 8px; }
            .number-input { padding: 10px 12px; background: var(--color-bg-primary); border: 1px solid var(--color-border);
                border-radius: 6px; color: var(--color-text-primary); }
            .btn-calculate { padding: 10px 24px; background: var(--color-accent-cyan); color: var(--color-bg-primary);
                border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
            .scenario-output { background: var(--color-bg-primary); padding: 24px; border-radius: 8px; }
            .output-section { text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--color-border); }
            .output-title { font-size: 14px; color: var(--color-text-secondary); margin-bottom: 12px; }
            .output-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
            .output-item { background: var(--color-bg-tertiary); padding: 16px; border-radius: 8px; text-align: center; }
            .output-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; }
            .output-value { font-size: 24px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
            .output-prob { font-size: 11px; color: var(--color-text-secondary); }
            .kelly-recommendation { background: rgba(251, 191, 36, 0.1); padding: 16px; border-radius: 8px; }
            .recommendation-title { font-size: 14px; font-weight: 600; color: var(--color-accent-amber); margin-bottom: 8px; }
            .status.active { background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
            .status.resolved { background: rgba(148, 163, 184, 0.2); color: #94a3b8; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
        `;

        document.head.appendChild(style);
    }

    destroy() {}
}
