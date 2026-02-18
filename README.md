---

# Prediction Markets Analysis Platform — Full Build Prompt

## Overview

Build a fully self-contained, single-page web application (HTML + CSS + JS, no backend required unless you use a build tool) that serves as a **comprehensive prediction market analysis platform**. The app should feel like a Bloomberg Terminal meets a research dashboard — dark themed, data-dense, highly interactive, and visually stunning. Use **D3.js** as the primary visualization library, with **P5.js** available for particle/generative visualizations. All data should be either fetched live via public APIs (Polymarket, Kalshi, Metaculus) or generated as realistic synthetic data if APIs are rate-limited or require auth. The app must degrade gracefully to synthetic/cached data so that every panel always renders something meaningful.

---

## Tech Stack

- **HTML5 / CSS3 / Vanilla JS (ES6 modules)** or a lightweight bundler like Vite
- **D3.js v7** for all primary charts
- **P5.js** for the particle/microstructure simulation panel
- **Arquero or danfojs** for in-browser dataframe operations
- **TailwindCSS** (via CDN) for layout
- No React, no heavy frameworks — keep it lean and fast
- All chart code should be modular: one JS file per panel/analysis section

---

## App Architecture

### Layout
- **Fixed left sidebar** — navigation between the 10 analysis modules
- **Top bar** — global controls: date range picker, platform selector (Kalshi / Polymarket / Metaculus / All), market category filter (Politics, Crypto, Economics, Science, Sports, Other), and a live data toggle
- **Main content area** — renders the active module
- **Bottom status bar** — data freshness timestamp, total markets loaded, API status indicators per platform

### Navigation Modules (all 10 must be implemented)

---

## Module 1: Market Calibration & Efficiency

**Goal:** Test whether prediction markets are well-calibrated.

**Implementation:**
- Bin all resolved markets by their final probability before resolution (0–10%, 10–20%, … 90–100%)
- For each bin, compute the actual resolution rate
- **Chart 1:** D3 reliability diagram (calibration curve) — plot predicted probability vs. observed frequency, with a diagonal "perfect calibration" reference line, confidence interval bands (bootstrapped), and dot size = number of markets in bin
- **Chart 2:** Sharpness histogram — distribution of market probabilities at resolution time, showing how "decisive" the market was
- **Chart 3:** Brier score decomposition bar chart — split into reliability, resolution, and uncertainty components, with animated transitions when filters change
- **Chart 4:** Calibration comparison small multiples — one calibration curve per topic category side-by-side
- **Stats panel:** Overall Brier score, log score, mean calibration error, excess uncertainty, ECE (Expected Calibration Error)
- **Math:** Display the Brier score formula, ECE formula, and decomposition equations in a collapsible "methodology" panel using KaTeX rendering

---

## Module 2: Crowd Wisdom vs. Expert Forecasters

**Goal:** Compare market probabilities against expert/model forecasts over time.

**Implementation:**
- For a set of canonical events (elections, Fed decisions, macro indicators), show probability timelines from: (a) Polymarket/Kalshi, (b) Metaculus community median, (c) reference "expert" model probability (synthetic if unavailable)
- **Chart 1:** Multi-line D3 time series with event markers (news events as vertical lines with tooltip labels). Lines are color-coded by source. Include a shaded divergence region between market and crowd
- **Chart 2:** Scatter plot — market probability vs. expert probability at event resolution T-30 days, colored by outcome. Quadrant labels: "Both right", "Both wrong", "Market right", "Expert right"
- **Chart 3:** Animated divergence tracker — as you scrub a time slider, watch the divergence between sources animate in real time
- **Stats panel:** Correlation coefficient between sources, RMSE of each source vs. outcome, average lead time before convergence, number of events where market "led" vs. "followed" expert consensus
- Render a sortable table of all events with their probability at T-30, T-7, T-1, and outcome

---

## Module 3: Information Cascade & Price Discovery

**Goal:** Visualize *when* and *how fast* markets reprice after information shocks.

**Implementation:**
- Model tick-level trade data (synthetic if necessary) for major market-moving events
- Detect "price shocks" — moments where price moves >5% in a short window
- **Chart 1:** D3 candlestick/OHLC chart of market probability over time with volume bars below, click to zoom into shock events
- **Chart 2:** Event study chart — align all detected shocks at T=0, plot average price path from T-60min to T+60min with confidence bands. This is the classic economics event study methodology
- **Chart 3 (P5.js):** Animated "information wave" particle simulation — particles represent traders, they glow and move toward new equilibrium price after a shock event is triggered. Speed of convergence is parameterized. User can trigger a shock manually with a button
- **Stats panel:** Average half-life of price discovery (time to reach 50% of full price adjustment), autocorrelation of returns (test for market efficiency), variance ratio test results

---

## Module 4: Cross-Market Arbitrage & Correlation Network

**Goal:** Map relationships and arbitrage gaps between related markets.

**Implementation:**
- Define a set of ~50 synthetic/real markets with known logical relationships (e.g., P(A and B) ≤ min(P(A), P(B)), Dutch book violations)
- Compute pairwise correlation matrix across market probability time series
- Detect arbitrage: markets where implied joint probability violates logical bounds
- **Chart 1:** D3 force-directed graph — nodes are markets, edge thickness = correlation magnitude, edge color = positive (blue) vs. negative (red) correlation. Node size = market liquidity. Draggable, zoomable, hoverable
- **Chart 2:** Heatmap correlation matrix with hierarchical clustering dendrogram on the side (like a clustermap). Click a cell to open a scatter plot of the two market time series
- **Chart 3:** Arbitrage opportunity tracker — a live-updating table showing detected Dutch book violations, their magnitude (in cents), and estimated profit from correcting them
- **Stats panel:** Number of active arbitrage opportunities, average spread, largest detected violation, network clustering coefficient, modularity score of the market graph

---

## Module 5: Sentiment vs. Market Probability

**Goal:** Compare NLP sentiment signals against market price movements.

**Implementation:**
- Use pre-computed or synthetic sentiment scores (or integrate a free sentiment API) for major market topics
- **Chart 1:** Dual-axis D3 time series — left axis is sentiment score (smoothed with a rolling 7-day average), right axis is market probability. Overlay both lines with a shaded area for sentiment polarity
- **Chart 2:** Cross-correlation function (CCF) plot — show correlation between sentiment and price at lags from -14 days to +14 days. Highlight the lag with maximum correlation (does sentiment lead or lag price?)
- **Chart 3:** Scatter plot matrix (SPLOM) — sentiment score, price change, volume, and days-to-resolution as dimensions. D3 brushable linked scatter plots
- **Chart 4:** Topic heatmap calendar — GitHub-style contribution graph where each cell is a day, colored by sentiment intensity, with price change overlaid as dot size
- **Stats panel:** Granger causality test result (does sentiment Granger-cause price or vice versa?), peak cross-correlation lag, R² of sentiment → price regression

---

## Module 6: Market Liquidity & Participation Heatmap

**Goal:** Analyze which topics/geographies/demographics get liquid markets vs. thin markets.

**Implementation:**
- **Chart 1:** D3 treemap — root splits by category (Politics, Economics, Crypto, etc.), then sub-splits by sub-topic. Cell size = total volume traded, cell color = liquidity score (bid-ask spread proxy)
- **Chart 2:** Choropleth world map (D3 + TopoJSON) — color countries by volume of prediction market activity related to that country's events. Click a country to drill down into its active markets
- **Chart 3:** Bubble chart — x=market age, y=volume, size=number of traders, color=category. Animated by time using a slider
- **Chart 4:** Lorenz curve of market liquidity — show concentration of volume across markets (Gini coefficient). How unequal is market participation?
- **Stats panel:** Gini coefficient of volume distribution, top 10 most liquid markets, category breakdown table, median market depth

---

## Module 7: Forecasting Tournament Leaderboard

**Goal:** Score and rank forecasters using proper scoring rules.

**Implementation:**
- Simulate a set of forecasters with varying skill levels submitting predictions on a shared set of markets
- **Chart 1:** Live leaderboard table — sortable by Brier score, log score, spherical score, number of predictions, accuracy. Highlight the top 3 forecasters
- **Chart 2:** Score distribution violin plot — one violin per scoring rule, showing distribution of scores across all forecasters
- **Chart 3:** Skill vs. luck decomposition — D3 scatter plot of forecaster's raw score vs. their bootstrapped "luck-adjusted" score. Points above diagonal = skilled, below = lucky. Confidence ellipses around each forecaster
- **Chart 4:** Score over time animated line chart — watch forecaster rankings evolve as markets resolve. Play/pause button with speed control
- **Stats panel:** Proper scoring rule formulas rendered via KaTeX, p-value of skill test for top forecaster vs. random baseline, inter-rater reliability (Krippendorff's alpha)

---

## Module 8: Whale Detection & Market Microstructure

**Goal:** Identify large traders and study their price impact.

**Implementation:**
- Use Polymarket's public on-chain trade data (or realistic synthetic data with power-law distributed trade sizes)
- **Chart 1:** Trade size distribution on a log-log scale — fit a power law and display the exponent. D3 scatter with fitted line
- **Chart 2:** Price impact curve — bin trades by size, plot average absolute price change per size bucket. Fit a square-root market impact model (standard in market microstructure)
- **Chart 3 (P5.js):** Particle simulation — trades arrive as particles with mass proportional to size. Particles collide with a "price needle" in the center, deflecting it proportionally to their mass. Whale trades cause dramatic needle swings. Real-time animated, toggleable between historical playback and live simulation mode
- **Chart 4:** Whale tracker table — identified large wallets/accounts, their historical trades, estimated PnL, win rate, and whether their trades predict market direction (alpha signal test)
- **Stats panel:** Amihud illiquidity ratio, Kyle's lambda (price impact coefficient), Herfindahl index of trader concentration, % of volume from top 10 traders

---

## Module 9: Tail Risk & Favorite-Longshot Bias

**Goal:** Study how markets price very low and very high probability events.

**Implementation:**
- **Chart 1:** Favorite-longshot bias curve — plot implied probability vs. actual win rate, fitted with a LOWESS smoother. Compare to the 45-degree line. Expected shape: longshots (low prob) are overpriced, favorites (high prob) are underpriced
- **Chart 2:** Beta distribution fitter — for any selected market category, fit a Beta(α, β) distribution to the distribution of market prices. Display the fitted PDF, the MLE estimates of α and β, and the implied mean/variance. Interactive sliders to manually adjust α and β
- **Chart 3:** Probability distribution evolution — for a selected market, animate how the market's implied Beta distribution evolves over its lifetime from open to resolution
- **Chart 4:** Tail risk dashboard — for markets with final probability <5% that resolved YES, compute the realized tail frequency and compare to market-implied probability. Bar chart of realized vs. implied tail frequencies by decile
- **Stats panel:** Longshot bias coefficient (regression of actual on implied), kurtosis of market probability distribution, tail calibration error for <10% and >90% bins

---

## Module 10: Temporal Decay & Resolution Curves

**Goal:** Model how market probability evolves as time-to-resolution decreases.

**Implementation:**
- **Chart 1:** Spaghetti plot of probability paths — plot ~200 simulated/real market probability paths from open to resolution (time normalized to 0–1). Color by outcome (YES=blue, NO=red). Animate them drawing in progressively
- **Chart 2:** Average path with confidence bands — compute E[P(t)] and ±1σ bands across all paths, stratified by outcome. Test whether this follows a martingale (it should if markets are efficient)
- **Chart 3:** Volatility term structure — plot realized volatility of probability changes as a function of time-to-resolution. Does volatility increase near resolution (like options near expiry)?
- **Chart 4:** SDE path simulator (P5.js) — user inputs drift μ and volatility σ, and the panel generates live geometric Brownian motion paths constrained to [0,1] (logit-normal SDE). User can overlay these on the empirical paths from Chart 1. Real-time re-simulation on parameter change
- **Stats panel:** Variance ratio test statistic (test for martingale property), mean reversion coefficient (fit an Ornstein-Uhlenbeck process), average absolute price change in last 7 days before resolution, half-life of autocorrelation

---

## Global UX Requirements

- **Dark theme** — deep navy/charcoal background, cyan/amber accent colors, monospaced fonts for numbers (JetBrains Mono or similar via Google Fonts)
- **Smooth animated transitions** — all D3 charts should use `.transition().duration(600)` when data updates or filters change
- **Linked brushing** — where multiple charts share the same data in a module, brushing/selecting on one chart should highlight corresponding data in others
- **Tooltips** — every chart element should have a rich, styled tooltip showing all relevant metadata
- **Responsive layout** — charts should resize on window resize using a ResizeObserver
- **Export buttons** — each chart should have a small "Export SVG" and "Export PNG" button
- **Methodology panels** — each module has a collapsible "How this works" drawer that explains the math with KaTeX-rendered formulas and a plain-English explanation
- **Loading states** — skeleton loaders while data fetches, with a spinner and status message
- **Error boundaries** — if a data fetch fails, show a styled error card with retry button, fall back to synthetic data automatically
- **Keyboard navigation** — arrow keys cycle through modules, Escape closes modals

---

## Data Layer

Create a `data/` module with the following:

- `kalshiAPI.js` — fetch live markets, prices, and history from Kalshi's public REST API
- `polymarketAPI.js` — fetch from Polymarket's subgraph (The Graph, public, no auth) and CLOB API
- `metaculusAPI.js` — fetch from Metaculus public API (questions, community predictions, resolutions)
- `syntheticData.js` — generate realistic synthetic data for all 10 modules using statistical models (calibrated distributions, realistic price paths, power-law trade sizes, etc.). This is the fallback for every module
- `dataCache.js` — in-memory LRU cache with configurable TTL so API calls aren't repeated on module switch

---

## Math & Statistics Requirements

Implement the following from scratch in a `stats/` module (no stats libraries — write the math):

- Brier score and its Murphy decomposition
- Log score and spherical score
- Expected Calibration Error (ECE)
- Bootstrap confidence intervals (1000 resamples)
- LOWESS smoother
- Pearson and Spearman correlation
- Cross-correlation function at arbitrary lags
- Power law fitting via MLE (for trade size distributions)
- Kyle's lambda estimation via OLS regression on signed trade flow
- Amihud illiquidity ratio
- Variance ratio test (Lo-MacKinlay)
- Ornstein-Uhlenbeck parameter estimation (MLE)
- Beta distribution MLE parameter fitting
- Gini coefficient
- Granger causality (simplified F-test version)

---

## Deliverables

- `index.html` — entry point
- `main.js` — app shell, router, global state
- `modules/` — one folder per analysis module, each with its own `index.js` and chart files
- `stats/` — all statistical implementations
- `data/` — API and synthetic data layer
- `styles/` — CSS variables and theme
- `assets/` — any static TopoJSON files for the world map
- A `README.md` explaining how to run (`npx vite` or just open in browser), data sources, and methodology

---

Build this as if it will be presented at a quant finance conference and also featured on the front page of a data visualization gallery. Every detail matters — label axes, annotate significant data points, make the empty states beautiful, and ensure the math is correct.

---