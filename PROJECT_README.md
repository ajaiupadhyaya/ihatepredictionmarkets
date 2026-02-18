# Prediction Markets Analysis Platform

A comprehensive, Bloomberg Terminal-style web application for analyzing prediction markets. Features 10 interactive analysis modules with advanced statistical visualizations, real-time data integration, and a dark, data-dense UI.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### ✅ Implemented Modules

1. **Market Calibration & Efficiency** - Fully functional with 4 D3.js charts:
   - Calibration curve with bootstrapped confidence intervals
   - Sharpness distribution histogram
   - Brier score decomposition
   - Category comparison small multiples
   - Complete statistics panel (Brier, Log, Spherical scores, ECE)

### 🚧 Upcoming Modules (Stubs Created)

2. **Crowd Wisdom vs. Expert Forecasters** - Compare markets vs. expert predictions
3. **Information Cascade & Price Discovery** - Analyze price shocks and information flow
4. **Cross-Market Arbitrage Network** - Detect arbitrage and market correlations
5. **Sentiment Analysis** - NLP sentiment vs. market movements
6. **Liquidity Heatmap** - Volume distribution and participation analysis
7. **Forecaster Leaderboard** - Rank forecasters with proper scoring rules
8. **Whale Detection** - Identify large traders and measure price impact
9. **Tail Risk Analysis** - Study favorite-longshot bias
10. **Temporal Decay** - Model probability evolution over time

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5, CSS3
- **Visualizations**: D3.js v7, P5.js (for particle simulations)
- **Styling**: TailwindCSS (CDN), Custom CSS with dark theme
- **Data**: Live API integration (Polymarket, Kalshi, Metaculus) with synthetic fallback
- **Build Tool**: Vite
- **Math Rendering**: KaTeX

## Project Structure

```
ihatepredictionmarkets/
├── index.html                 # Main HTML entry point
├── main.js                    # App initialization and routing
├── state.js                   # Global state management
├── package.json               # Dependencies
│
├── styles/
│   └── main.css              # All CSS styles (dark theme)
│
├── stats/
│   └── index.js              # Statistical functions library
│                             # (Brier, calibration, correlation, etc.)
│
├── data/
│   ├── dataManager.js        # Data orchestration and caching
│   ├── syntheticData.js      # Realistic synthetic data generator
│   ├── polymarketAPI.js      # Polymarket API integration
│   ├── kalshiAPI.js          # Kalshi API integration
│   └── metaculusAPI.js       # Metaculus API integration
│
├── modules/
│   ├── calibration/          # Module 1 (fully implemented)
│   ├── crowd-wisdom/         # Module 2 (stub)
│   ├── price-discovery/      # Module 3 (stub)
│   ├── arbitrage/            # Module 4 (stub)
│   ├── sentiment/            # Module 5 (stub)
│   ├── liquidity/            # Module 6 (stub)
│   ├── leaderboard/          # Module 7 (stub)
│   ├── whales/               # Module 8 (stub)
│   ├── tail-risk/            # Module 9 (stub)
│   └── temporal/             # Module 10 (stub)
│
└── utils/
    └── ui.js                 # UI helper functions
```

## Installation & Setup

### Prerequisites

- Node.js 16+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Quick Start

```bash
# 1. Clone or navigate to the repository
cd ihatepredictionmarkets

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# Visit http://localhost:5173 (Vite will show the exact URL)
```

### Alternative: No Build Step

You can also open `index.html` directly in a browser, but you'll need to:

1. Replace the ES6 module imports with CDN versions of D3.js and P5.js
2. Or use a simple HTTP server:

```bash
# Python 3
python3 -m http.server 8000

# Or Node.js
npx serve
```

## Usage

### Global Controls

- **Date Range**: Filter markets by creation date
- **Platform**: Filter by Polymarket, Kalshi, Metaculus, or All
- **Category**: Politics, Crypto, Economics, Science, Sports, Other
- **Live Data**: Toggle between live API data and synthetic data

### Navigation

- Click module names in left sidebar
- Use ↑↓←→ arrow keys to cycle through modules
- Press `Esc` to close modals

### Chart Interactions

- **Hover** over data points for detailed tooltips
- **Export** charts as SVG or PNG using buttons (when implemented)
- **Methodology** panels explain the math behind each analysis

## Data Sources

### Live APIs (with graceful fallback)

1. **Polymarket**: Public CLOB API and TheGraph subgraph
2. **Kalshi**: Public markets endpoint (limited without auth)
3. **Metaculus**: Public questions API

### Synthetic Data

The platform automatically generates realistic synthetic data when:
- APIs are unavailable or rate-limited
- Live data toggle is off
- Insufficient data returned from APIs

Synthetic data includes:
- 500 resolved markets with calibrated probabilities
- 200 open markets
- 100 forecasters with varying skill levels
- Power-law distributed trade sizes
- Correlated market networks
- Time-series price histories

## Statistics Library

All statistical methods implemented from scratch (no external stats libraries):

- **Scoring Rules**: Brier score, Log score, Spherical score
- **Calibration**: Expected Calibration Error (ECE), Murphy decomposition
- **Regression**: OLS, weighted linear regression, LOWESS smoother
- **Correlation**: Pearson, Spearman, cross-correlation function
- **Distribution Fitting**: Power law (MLE), Beta distribution (MLE), Ornstein-Uhlenbeck
- **Market Microstructure**: Kyle's lambda, Amihud illiquidity, variance ratio test
- **Inequality**: Gini coefficient, Lorenz curves
- **Causality**: Granger causality (simplified F-test)
- **Resampling**: Bootstrap confidence intervals

## Customization

### Theme Colors

Edit CSS variables in `styles/main.css`:

```css
:root {
    --color-bg-primary: #020617;
    --color-accent-cyan: #22d3ee;
    --color-accent-amber: #fbbf24;
    /* ... more colors ... */
}
```

### Adding New Modules

1. Create module folder in `modules/`
2. Implement class with `render()`, `update()`, `destroy()` methods
3. Add to module registry in `main.js`
4. Add navigation item in `index.html`

## Development Roadmap

- [x] Project setup and architecture
- [x] Complete statistics library
- [x] Data layer with API integration
- [x] Module 1: Market Calibration (fully functional)
- [ ] Module 2-10 implementations
- [ ] P5.js particle simulations (Modules 3, 8, 10)
- [ ] D3 force-directed graphs (Module 4)
- [ ] World map choropleth (Module 6)
- [ ] Export functionality (SVG/PNG)
- [ ] Responsive mobile layout
- [ ] Performance optimization for large datasets
- [ ] Unit tests for statistics functions

## Performance Notes

- **Caching**: 5-minute TTL on module data
- **Animations**: All D3 transitions use 600ms duration
- **Lazy Loading**: Modules only render when accessed
- **Synthetic Data**: Generated once on initialization

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires ES6 modules, CSS Grid, and modern JavaScript features.

## Troubleshooting

**Problem**: Module shows loading forever  
**Solution**: Check browser console for errors. API might be blocked by CORS - synthetic data will auto-activate.

**Problem**: Charts not appearing  
**Solution**: Ensure D3.js loaded correctly. Check network tab for CDN failures.

**Problem**: Navigation not working  
**Solution**: Clear browser cache and hard reload (Cmd+Shift+R / Ctrl+Shift+F5).

## Contributing

This is a demonstration project. To extend:

1. Implement remaining modules using Module 1 as a template
2. Add more sophisticated API integrations
3. Enhance synthetic data realism
4. Add more chart types and interactions

## License

MIT License - feel free to use and modify.

## Credits

Built as a comprehensive prediction markets analysis platform demonstrating:
- Advanced D3.js visualizations
- Statistical computing in JavaScript
- Modern web architecture
- Data-driven UI design

---

**Author**: Prediction Markets Terminal Project  
**Date**: February 2026  
**Version**: 1.0.0
