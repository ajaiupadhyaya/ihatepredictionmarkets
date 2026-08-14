import * as d3 from 'd3';
import crossfilter from 'crossfilter2';
import dc from 'dc';
import textures from 'textures';
import { getModuleData } from '../../data/dataManager.js';
import { mountExplorerReact } from '../explorerReact.js';

export default class ExplorerModule {
    constructor(container, state) {
        this.container = container;
        this.state = state;
        this.dcCharts = [];
        this.reactRoot = null;
    }

    async render() {
        const data = await getModuleData('liquidity');
        const markets = Array.isArray(data?.markets) ? data.markets : [];

        this.container.innerHTML = `
            <div class="rr-report fade-in">
                <div class="rr-header">
                    <div class="rr-kicker">Exploration</div>
                    <h1 class="rr-title">Interactive Market Explorer</h1>
                    <p class="rr-dek">
                        Filter Kalshi and Polymarket markets by category and platform, then compare aggregate behavior across
                        charting styles. Cross-filtered dashboards (dc.js) sit alongside React-based line charts (recharts and react-vis).
                    </p>
                </div>

                <section class="rr-section">
                    <h2>Cross-filtered overview</h2>
                    <div class="rr-grid two">
                        <article class="rr-card">
                            <h3>Markets by category</h3>
                            <div id="dc-category-row" class="rr-chart"></div>
                            <div class="rr-chart-footnote">DC.JS ROW CHART · FILTERABLE</div>
                        </article>
                        <article class="rr-card">
                            <h3>Volume by exchange</h3>
                            <div id="dc-exchange-bar" class="rr-chart"></div>
                            <div class="rr-chart-footnote">DC.JS BAR CHART · FILTERABLE</div>
                        </article>
                    </div>
                    <div class="rr-grid one">
                        <article class="rr-card">
                            <h3>Probability vs Liquidity</h3>
                            <div id="d3-scatter-textures" class="rr-chart"></div>
                            <div class="rr-chart-footnote">D3 + TEXTURES.JS · POLYMARKET HATCHED, KALSHI DOTTED</div>
                        </article>
                    </div>
                </section>

                <section class="rr-section">
                    <h2>React-based time series views</h2>
                    <article class="rr-card">
                        <h3>Implied probabilities and cumulative volume</h3>
                        <div id="react-explorer-root" class="rr-chart"></div>
                        <div class="rr-chart-footnote">RECHARTS + REACT-VIS · DIRECTLY DRIVEN BY LIVE MARKET SNAPSHOT</div>
                    </article>
                </section>
            </div>
        `;

        this.renderDcDashboard(markets);
        this.renderScatterWithTextures(markets);

        const reactRootEl = document.getElementById('react-explorer-root');
        this.reactRoot = mountExplorerReact(reactRootEl, markets);
    }

    renderDcDashboard(markets) {
        if (!markets.length) return;
        const ndx = crossfilter(markets);

        const categoryDim = ndx.dimension(m => m.category || 'other');
        const categoryGroup = categoryDim.group().reduceCount();

        const platformDim = ndx.dimension(m => m.platform || 'unknown');
        const platformVolumeGroup = platformDim.group().reduceSum(m => Number(m.volume || 0));

        const categoryChart = dc.rowChart('#dc-category-row');
        categoryChart
            .dimension(categoryDim)
            .group(categoryGroup)
            .elasticX(true)
            .ordinalColors(['#111827'])
            .gap(4)
            .label(d => `${d.key} (${d.value})`);

        const exchangeChart = dc.barChart('#dc-exchange-bar');
        exchangeChart
            .dimension(platformDim)
            .group(platformVolumeGroup)
            .elasticY(true)
            .x(d3.scaleBand())
            .xUnits(dc.units.ordinal)
            .gap(10)
            .brushOn(true)
            .renderHorizontalGridLines(true)
            .ordinalColors(['#2563eb']);

        this.dcCharts = [categoryChart, exchangeChart];
        dc.renderAll();
    }

    renderScatterWithTextures(markets) {
        const container = d3.select('#d3-scatter-textures');
        const node = container.node();
        if (!node || !markets.length) return;

        const width = Math.max(420, node.clientWidth || 820);
        const height = 360;
        const margin = { top: 24, right: 24, bottom: 44, left: 56 };

        const svg = container
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const filtered = markets
            .filter(
                m =>
                    (m.currentProbability != null || m.finalProbability != null) &&
                    m.liquidity != null &&
                    !Number.isNaN(Number(m.liquidity))
            )
            .slice(0, 300);
        if (!filtered.length) return;

        const x = d3
            .scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);
        const y = d3
            .scaleLinear()
            .domain([0, d3.max(filtered, d => Number(d.liquidity) || 0) * 1.1])
            .range([chartHeight, 0]);

        const gridY = g
            .append('g')
            .attr('class', 'grid-y')
            .call(
                d3
                    .axisLeft(y)
                    .ticks(6)
                    .tickSize(-chartWidth)
                    .tickFormat('')
            );
        gridY
            .selectAll('line')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-opacity', 0.8);
        gridY.select('path').remove();

        const xAxis = d3
            .axisBottom(x)
            .ticks(6)
            .tickFormat(d => `${Math.round(d * 100)}%`);
        const yAxis = d3
            .axisLeft(y)
            .ticks(6)
            .tickFormat(d => d3.format('~s')(d));

        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(xAxis)
            .selectAll('text')
            .attr('fill', '#6b7280')
            .attr('font-size', 11);

        g.append('g')
            .call(yAxis)
            .selectAll('text')
            .attr('fill', '#6b7280')
            .attr('font-size', 11);

        // textures.js patterns for platforms
        const texKalshi = textures
            .lines()
            .orientation('3/8')
            .size(6)
            .stroke('#0f172a')
            .background('#bfdbfe');
        const texPoly = textures
            .circles()
            .radius(1.2)
            .fill('#f97316')
            .background('#ffedd5');

        svg.call(texKalshi);
        svg.call(texPoly);

        const platformFill = platform => {
            if (platform === 'kalshi') return texKalshi.url();
            if (platform === 'polymarket') return texPoly.url();
            return '#9ca3af';
        };

        g.selectAll('circle')
            .data(filtered)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.currentProbability ?? d.finalProbability ?? 0.5))
            .attr('cy', d => y(Number(d.liquidity) || 0))
            .attr('r', 5)
            .attr('fill', d => platformFill(d.platform))
            .attr('stroke', '#111827')
            .attr('stroke-width', 0.6)
            .attr('opacity', 0.9);

        svg.append('text')
            .attr('x', margin.left)
            .attr('y', margin.top - 8)
            .attr('fill', '#374151')
            .attr('font-size', 12)
            .text('Probability vs liquidity, platform-encoded with textures');
    }

    destroy() {
        if (this.reactRoot) {
            this.reactRoot.unmount();
        }
        if (this.dcCharts.length) {
            this.dcCharts.forEach(chart => chart.filterAll());
            dc.redrawAll();
        }
        this.container.innerHTML = '';
    }
}

