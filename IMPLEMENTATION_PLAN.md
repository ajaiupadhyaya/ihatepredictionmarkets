# Implementation Plan: Modules 2-10

## Strategy Overview

**Goal**: Complete all 10 analysis modules with production-quality D3.js visualizations and P5.js simulations.

**Approach**: Build in order of increasing complexity, showcasing different visualization techniques.

---

## Phase 1: Time Series & Tables (Est. 4-6 hours)

### Module 2: Crowd Wisdom vs Expert Forecasters ⭐ PRIORITY 1
**Complexity**: Medium  
**Time Estimate**: 2 hours  
**Key Features**:
- Multi-line time series (D3) - market, Metaculus, expert forecasts
- Scatter plot - predictions at T-30 vs outcomes
- Event markers on timeline (vertical lines with tooltips)
- Correlation and RMSE statistics
- Divergence region shading

**D3 Techniques**:
- `d3.line()` with multiple series
- `d3.scaleTime()` for date axis
- Color-coded lines per source
- Brush interaction (optional)

**Data Source**: `getCrowdWisdomData()` already provides mock expert forecasts

---

### Module 7: Forecasting Tournament Leaderboard ⭐ PRIORITY 2
**Complexity**: Low-Medium  
**Time Estimate**: 2 hours  
**Key Features**:
- Sortable table with multiple scoring rules
- Violin plots (or box plots) of score distributions
- Skill vs luck scatter plot with confidence ellipses
- Animated score evolution over time (optional advanced feature)

**D3 Techniques**:
- HTML table with D3 data binding for sorting
- `d3.violinPlot()` or custom violin using area
- Scatter plot with `d3.symbol()`
- Color coding by rank/skill

**Data Source**: `state.forecasters` with predictions already generated

---

## Phase 2: Distribution Analysis (Est. 3-4 hours)

### Module 9: Tail Risk & Favorite-Longshot Bias ⭐ PRIORITY 3
**Complexity**: Medium  
**Time Estimate**: 2 hours  
**Key Features**:
- Favorite-longshot bias curve (scatter + LOWESS fit)
- Beta distribution fitter with interactive sliders (range inputs)
- Tail risk table (realized vs implied for <5% events)
- Probability distribution evolution animation (advanced)

**D3 Techniques**:
- Scatter plot with LOWESS overlay
- `d3.line()` for Beta PDF
- Range sliders bound to D3 re-render
- Color gradients for probability density

**Data Source**: Uses resolved markets from calibration data
**Stats**: `stats.lowess()`, `stats.fitBeta()` already implemented

---

### Module 5: Sentiment vs Market Probability ⭐ PRIORITY 4
**Complexity**: Medium  
**Time Estimate**: 2 hours  
**Key Features**:
- Dual-axis time series (sentiment + probability)
- Cross-correlation function plot
- Scatter plot matrix (SPLOM) - 3x3 or 4x4 grid
- Granger causality test result display

**D3 Techniques**:
- Two y-axes on single chart
- Bar chart for CCF at different lags
- Small multiples scatter plots with brushing/linking
- Correlation heatmap overlay

**Data Source**: `getSentimentData()` provides sentiment time series
**Stats**: `stats.crossCorrelation()`, `stats.grangerCausality()` ready

---

## Phase 3: Spatial & Network Viz (Est. 4-5 hours)

### Module 6: Market Liquidity & Participation Heatmap ⭐ PRIORITY 5
**Complexity**: High  
**Time Estimate**: 2.5 hours  
**Key Features**:
- D3 treemap by category → sub-topic
- Choropleth world map (requires TopoJSON data)
- Bubble chart (age vs volume)
- Lorenz curve with Gini coefficient annotation

**D3 Techniques**:
- `d3.treemap()` with hierarchical data
- `d3.geoPath()` and `d3.geoMercator()` for map
- Bubble chart with `d3.scaleSqrt()` for radius
- Area chart for Lorenz curve vs diagonal

**Data Source**: All markets with volume/liquidity data
**External Data**: TopoJSON world map (can use CDN: https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json)

---

### Module 4: Cross-Market Arbitrage & Correlation Network ⭐ PRIORITY 6
**Complexity**: Very High  
**Time Estimate**: 3 hours  
**Key Features**:
- Force-directed graph (nodes = markets, edges = correlations)
- Correlation matrix heatmap with dendrogram
- Arbitrage opportunities table
- Network statistics panel

**D3 Techniques**:
- `d3.forceSimulation()` with link, charge, center forces
- Draggable nodes
- Bidirectional color scale for correlation
- Hierarchical clustering for dendrogram

**Data Source**: `getArbitrageData()` provides correlated markets
**Stats**: Correlation matrix calculation

---

## Phase 4: P5.js Simulations (Est. 6-8 hours)

### Module 3: Information Cascade & Price Discovery ⭐ PRIORITY 7
**Complexity**: Very High  
**Time Estimate**: 3 hours  
**Key Features**:
- Candlestick chart with volume bars
- Event study chart (aligned price shocks)
- **P5.js**: Information wave particle simulation
- Price discovery metrics (half-life, autocorrelation)

**P5.js Simulation**:
- Particles represent traders
- Glow effect when information shock hits
- Particles move toward new equilibrium
- Speed = information propagation rate
- Manual shock trigger button

**D3 Techniques**:
- Candlestick using `rect` elements
- Event study with multiple overlaid lines
- Volume bars below price chart

**Data Source**: `getPriceDiscoveryData()` provides tick data

---

### Module 8: Whale Detection & Market Microstructure ⭐ PRIORITY 8
**Complexity**: Very High  
**Time Estimate**: 3 hours  
**Key Features**:
- Log-log scatter of trade sizes with power law fit
- Price impact curve (size vs Δprice)
- **P5.js**: Particle collision simulation (trades hit price needle)
- Whale tracker table

**P5.js Simulation**:
- Trades = particles with mass ∝ size
- Price needle in center
- Particles collide and deflect needle
- Whale trades create dramatic swings
- Toggle historical playback vs live mode

**D3 Techniques**:
- Log-scale scatter plot
- Fitted line overlay
- Size-encoded scatter points

**Data Source**: `getWhalesData()` provides trade sizes
**Stats**: `stats.fitPowerLaw()`, `stats.kyleLambda()`

---

### Module 10: Temporal Decay & Resolution Curves ⭐ PRIORITY 9
**Complexity**: Very High  
**Time Estimate**: 3 hours  
**Key Features**:
- Spaghetti plot (200 probability paths)
- Average path with confidence bands
- Volatility term structure
- **P5.js**: SDE path simulator (Geometric Brownian Motion in [0,1])

**P5.js Simulation**:
- Real-time path generation
- Input sliders for drift μ and volatility σ
- Logit-normal process to stay in [0,1]
- Overlay on empirical data
- Re-simulate on parameter change

**D3 Techniques**:
- Many overlaid line charts (opacity ~0.1)
- Color by outcome (blue=YES, red=NO)
- Animated path drawing
- Confidence band area chart

**Data Source**: `getTemporalData()` provides price histories

---

## Phase 5: Polish & Global Features (Est. 2-3 hours)

### Export Functionality ⭐ PRIORITY 10
**Features**:
- Export SVG button on each chart
- Export PNG button (SVG → Canvas → PNG)
- Export data as CSV
- Copy chart as image to clipboard

**Implementation**:
- Add buttons to chart-actions div
- `ui.exportSVG()` already stubbed
- Implement `ui.exportPNG()` using canvas
- Add CSV export using `d3.csvFormat()`

### Additional Polish:
- [ ] Keyboard shortcuts (e.g., 'E' to export)
- [ ] Print-friendly CSS
- [ ] Loading skeletons for slow charts
- [ ] Error boundaries with retry logic
- [ ] Mobile responsiveness improvements
- [ ] Performance optimization (virtualization for large datasets)

---

## Implementation Order & Timeline

**Week 1** (8-10 hours):
1. ✅ Module 2: Crowd Wisdom (2h)
2. ✅ Module 7: Leaderboard (2h)
3. ✅ Module 9: Tail Risk (2h)
4. ✅ Module 5: Sentiment (2h)

**Week 2** (8-10 hours):
5. ✅ Module 6: Liquidity (2.5h)
6. ✅ Module 4: Arbitrage Network (3h)
7. ✅ Module 3: Price Discovery (3h)

**Week 3** (8-10 hours):
8. ✅ Module 8: Whale Detection (3h)
9. ✅ Module 10: Temporal Decay (3h)
10. ✅ Export functionality & polish (2-3h)

**Total Estimate**: 26-32 hours

---

## Technical Decisions

### Libraries:
- **D3.js v7**: All standard charts
- **P5.js**: Particle simulations (Modules 3, 8, 10)
- **KaTeX**: Math rendering (already integrated)
- **No external map library**: Use D3 geo with TopoJSON

### Data Strategy:
- Continue using synthetic data as primary
- API calls as enhancement (not dependency)
- Cache all computed statistics

### Code Quality:
- Follow Module 1 patterns
- Consistent 600ms transitions
- Tooltips on all interactive elements
- Methodology panels for each module
- Responsive chart sizing with ResizeObserver

### Performance:
- Lazy render (only when module active)
- Debounce resize events
- Use `.interrupt()` to cancel ongoing transitions
- Limit particles in P5.js to ~500 max

---

## Testing Checklist (Per Module)

- [ ] Renders without errors
- [ ] Charts resize on window resize
- [ ] Tooltips work on all data points
- [ ] Transitions smooth (600ms)
- [ ] Stats panel shows correct values
- [ ] Methodology section expands/collapses
- [ ] Works with filtered data (platform/category)
- [ ] No console errors
- [ ] Performant (no lag/jank)

---

## Success Criteria

**MVP (All Modules Working)**:
- ✅ All 10 modules render
- ✅ All specified charts implemented
- ✅ Tooltips and interactions functional
- ✅ Stats panels complete
- ✅ Methodology sections present

**Polish (Production Ready)**:
- ✅ Export functionality works
- ✅ Responsive on tablet/mobile
- ✅ No errors in console
- ✅ Fast load times (<2s)
- ✅ Comprehensive documentation

**Stretch Goals**:
- Real API integration and live updates
- User authentication and saved dashboards
- Custom market creation
- Downloadable reports (PDF)
- Social sharing of charts

---

## Next Action

**Starting with Module 2: Crowd Wisdom**

This module will demonstrate:
- Multi-line time series
- Scatter plots
- Statistical comparisons
- And establish patterns for other time-series modules

Let's build! 🚀
