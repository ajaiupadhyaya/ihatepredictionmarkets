# Testing Guide: Prediction Markets Analysis Platform

This guide helps you verify that all 10 modules are working correctly.

---

## Quick Start

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser**: Navigate to `http://localhost:5173` (or the port shown in terminal)

3. **Wait for load**: The app should show Module 1 (Market Calibration) by default

---

## Module-by-Module Test Checklist

### ✅ Module 1: Market Calibration

**What to Look For**:
- [ ] 4 charts render correctly
- [ ] Calibration curve shows binned scatter + LOWESS smoother + 45° reference line
- [ ] Brier decomposition shows 3 stacked bars
- [ ] Distribution histogram shows probability bins
- [ ] Stats panel shows: Total Markets, Brier Score, Log Score, etc.
- [ ] Methodology panel at bottom explains calibration

**Expected Behavior**:
- Charts animate on load (paths draw from left to right)
- Hover over points to see tooltips
- No console errors

---

### ✅ Module 2: Crowd Wisdom vs Expert Forecasters

**Navigation**: Click "Crowd Wisdom" in left sidebar

**What to Look For**:
- [ ] Timeline chart with 3 colored lines (market=cyan, Metaculus=yellow, expert=purple)
- [ ] Event markers (vertical dashed lines) appear on timeline
- [ ] T-30 scatter plot shows predictions vs outcomes
- [ ] Quadrant chart shows 4 colored segments
- [ ] Stats show correlation, RMSE, Brier scores for each source

**Expected Behavior**:
- Lines animate smoothly
- Scatter points fade in
- Colors match legend

---

### ✅ Module 3: Price Discovery

**Navigation**: Click "Price Discovery" in left sidebar

**What to Look For**:
- [ ] Price chart with cyan line + gray volume bars at bottom
- [ ] **P5.js particle simulation** shows moving colored particles
  - Green particles = buy trades
  - Red particles = sell trades
  - Particles rise from bottom and fade out
- [ ] ACF chart shows autocorrelation bars with yellow confidence bands
- [ ] Trade size distribution on log-log scale with red power law line
- [ ] Stats show: Price Points, Total Trades, Variance Ratio, Half-Life, Power Law α

**Expected Behavior**:
- Particle simulation runs smoothly at 60 FPS
- Particles continuously spawn and fade
- Charts animate on first load

**Common Issues**:
- If P5 canvas is black: Refresh page
- If no particles: Check browser console for errors

---

### ✅ Module 4: Arbitrage Network

**Navigation**: Click "Arbitrage Network" in left sidebar

**What to Look For**:
- [ ] **Force-directed graph** with nodes and edges
  - Nodes = markets (circles with labels)
  - Edges = correlations (green=positive, red=negative)
- [ ] Nodes are draggable (click and drag)
- [ ] Zoom works (scroll wheel)
- [ ] Correlation matrix heatmap (blue-white-red color scale)
- [ ] Arbitrage opportunities list (scrollable cards)
- [ ] Stats show: Total Markets, Avg Correlation, Arbitrage Opportunities

**Expected Behavior**:
- Graph stabilizes after ~2 seconds of simulation
- Dragging a node moves it and connected edges
- Zooming scales the entire graph

**Common Issues**:
- If graph doesn't stabilize: Refresh page
- If drag doesn't work: Make sure you're clicking on a node, not empty space

---

### ✅ Module 5: Sentiment Analysis

**Navigation**: Click "Sentiment Analysis" in left sidebar

**What to Look For**:
- [ ] Dual-axis time series (left axis=probability, right axis=sentiment)
- [ ] Two colored lines (cyan for market, purple for sentiment)
- [ ] Scatter plot with regression line and R² annotation
- [ ] Cross-correlation bar chart (lags -20 to +20)
- [ ] Annotations: "Sentiment leads" and "Sentiment lags"
- [ ] Stats show: Correlation, R², Granger Causality p-value

**Expected Behavior**:
- Lines draw smoothly
- Regression line fits through scatter points
- Bars animate from bottom to top

---

### ✅ Module 6: Liquidity Heatmap

**Navigation**: Click "Liquidity Heatmap" in left sidebar

**What to Look For**:
- [ ] Category × Platform heatmap with Viridis color scale (purple-blue-green-yellow)
- [ ] Lorenz curve (cyan line below diagonal with shaded area)
- [ ] Gini coefficient annotation on Lorenz chart
- [ ] Kyle's Lambda bars sorted ascending with gradient color
- [ ] Stats show: Total Markets, Top 10 Volume %, Gini, HHI, Avg Spread, Avg Depth

**Expected Behavior**:
- Heatmap cells animate (opacity fade-in)
- Lorenz curve draws from origin to top-right
- Bars grow upward

---

### ✅ Module 7: Forecaster Leaderboard

**Navigation**: Click "Forecaster Leaderboard" in left sidebar

**What to Look For**:
- [ ] Sortable table with columns: Rank, Forecaster, Predictions, Brier, Log, Spherical, Calibration
- [ ] Top 3 have emoji medals: 🥇 🥈 🥉
- [ ] **Table is sortable**: Click column headers to re-sort
- [ ] Box plot chart shows distribution of 3 scoring metrics
- [ ] Skill vs Luck scatter plot with 4 quadrants
- [ ] Stats show: Total Forecasters, Avg Brier, Best/Worst Brier

**Expected Behavior**:
- Clicking header sorts table ascending/descending
- Box plots show median line and quartile boxes
- Scatter points colored by prediction count

**Test Sorting**:
- Click "Brier" header → Forecasters sort by Brier score
- Click "Predictions" header → Sort by number of predictions

---

### ✅ Module 8: Whale Detection

**Navigation**: Click "Whale Detection" in left sidebar

**What to Look For**:
- [ ] **P5.js particle simulation** with ripple effects
  - Particles move from left to right
  - Large trades have bigger circles
  - Particles oscillate vertically (showing price impact)
  - Ripples emanate from large trades
- [ ] Price impact scatter (log-log scale) with red fitted line
- [ ] Exponent annotation (should be ~0.5 for square-root model)
- [ ] Lorenz curve showing trade concentration
- [ ] Top 20 whales table with PnL column (green=profit, red=loss)
- [ ] Stats show: Total Whales, Top 10 Volume %, Gini, Impact Exponent

**Expected Behavior**:
- Particles spawn at left edge, move right with sine wave motion
- Large particles (whales) create visible ripples
- Simulation runs continuously at 60 FPS

---

### ✅ Module 9: Tail Risk

**Navigation**: Click "Tail Risk" in left sidebar

**What to Look For**:
- [ ] Favorite-longshot bias curve (scatter + smooth LOWESS line)
- [ ] 45-degree reference line (should show overpricing on left, underpricing on right)
- [ ] Annotations: "Longshots overpriced" and "Favorites underpriced"
- [ ] Beta distribution chart (histogram + red PDF overlay)
- [ ] α and β parameter annotations
- [ ] Tail event dashboard (3 cards: Longshots, Favorites, Midrange)
- [ ] Stats show: Total Events, Longshots %, Favorites %, Avg Bias, Beta α, Beta β

**Expected Behavior**:
- LOWESS curve smoothly fits through scatter
- Beta PDF overlays histogram accurately
- Cards show bias percentages with color coding

---

### ✅ Module 10: Temporal Decay

**Navigation**: Click "Temporal Decay" in left sidebar

**What to Look For**:
- [ ] **P5.js SDE simulation** showing ~20 Brownian paths
  - Paths evolve from left (start) to right (resolution)
  - Probabilities stay between 0% and 100%
  - Each path is a different color
  - Y-axis shows probability, X-axis shows time to resolution
- [ ] Spaghetti plot with many overlapping colored lines
- [ ] Mean path chart with cyan line and shaded confidence band
- [ ] Yellow dashed line = martingale reference (should be horizontal)
- [ ] Volatility term structure (purple area chart)
- [ ] Stats show: Markets Analyzed, Annualized Volatility, Drift, ACF(1), Martingale Test

**Expected Behavior**:
- P5 simulation redraws continuously
- Paths are smooth (not jagged)
- Spaghetti plot animates sequentially
- Martingale test should show "✓ Pass" if drift ≈ 0

---

## Performance Checks

### FPS (Frames Per Second)
- **P5.js modules should run at ~60 FPS**
- Check browser DevTools → Performance monitor
- If FPS < 30, reduce number of particles in simulation

### Load Time
- Initial page load: < 2 seconds
- Module switching: < 500ms
- Chart animations: 600-1500ms

### Memory
- Should not exceed 200 MB on initial load
- Check DevTools → Memory

---

## Common Issues & Fixes

### Issue: Blank charts
**Fix**: Wait 2-3 seconds for data to load, or refresh page

### Issue: P5.js canvas is black
**Fix**: Refresh page. If persists, check browser console for errors

### Issue: Force graph nodes fly off screen
**Fix**: Refresh page. Graph should stabilize within 2 seconds

### Issue: Table not sorting
**Fix**: Make sure you're clicking on the header row, not the first data row

### Issue: Slow animations
**Fix**: Close other tabs/applications. Try a different browser (Chrome/Firefox recommended)

### Issue: No data showing
**Fix**: Check that `syntheticData.js` is generating data correctly. Open DevTools console for errors.

---

## Browser Compatibility

✅ **Recommended**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

⚠️ **Not Supported**:
- Internet Explorer (any version)
- Browsers with JavaScript disabled

---

## Console Output

### Expected (No Errors)
```
[Vite] connected
Loading module: calibration
Data loaded successfully
```

### Warnings (Safe to Ignore)
```
Devon-Warning: ... (these are framework warnings, not app errors)
```

### Errors (Require Attention)
```
TypeError: Cannot read property 'x' of undefined
→ Check that data is loading correctly
```

---

## Automated Testing (Future)

To add automated tests:

```bash
# Install testing dependencies
npm install -D vitest @testing-library/react

# Run tests
npm run test
```

**Test Coverage Goals**:
- [ ] Stats library: 100% coverage
- [ ] Data manager: 90% coverage
- [ ] UI utilities: 80% coverage
- [ ] Module rendering: Smoke tests

---

## Final Checklist

Before deploying:
- [ ] All 10 modules load without errors
- [ ] All P5.js simulations run smoothly
- [ ] All D3.js charts animate correctly
- [ ] Tables are sortable and filterable
- [ ] Tooltips work on hover
- [ ] No console errors
- [ ] Performance is acceptable (>30 FPS)
- [ ] Stats panels show correct values
- [ ] Methodology panels render

---

## Reporting Issues

If you find bugs, note:
1. **Module affected** (e.g., "Module 3: Price Discovery")
2. **What you expected** (e.g., "Particles should be green")
3. **What happened** (e.g., "All particles are black")
4. **Browser & version** (e.g., "Chrome 120")
5. **Console errors** (copy from DevTools)

---

**Happy Testing! 🚀**

For questions, refer to:
- `BUILD_SUMMARY.md` - Implementation details
- `IMPLEMENTATION_PLAN.md` - Original development plan
- `README.md` - Original requirements
