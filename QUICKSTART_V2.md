# Prediction Markets Quantitative Analysis Terminal

A professional-grade, Bloomberg Terminal-style web application for analyzing prediction markets with AI-powered insights, advanced 3D visualizations, and comprehensive data export tools.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**Live Screenshots:**
- [AI Dashboard Overview](https://github.com/user-attachments/assets/e8928007-af1f-42c1-a922-c1d1fc338e74)
- [Enhanced Dashboard with Export Tools](https://github.com/user-attachments/assets/75659a6d-3426-4398-b999-5ee73cfb7e49)

## 🎯 Overview

Professional quantitative analysis platform designed for prediction market traders, researchers, and data scientists. Features cutting-edge visualizations, AI-powered analytics, and tools worthy of a quant trader at Jane Street or Citadel.

## ✨ Key Features

### 🤖 AI-Powered Analysis
- **Automated Insights** - Natural language market summaries
- **Anomaly Detection** - Real-time detection of price shocks, volume spikes, arbitrage
- **Risk Assessment** - Comprehensive scoring with component breakdown
- **Smart Recommendations** - Actionable insights from market inefficiencies

### 🎨 Advanced Visualizations
- **Three.js 3D Networks** - Interactive particle systems and network graphs  
- **D3.js Professional Charts** - Statistical visualizations with smooth animations
- **Custom WebGL Shaders** - Artistic effects and fluid transitions
- **Real-time Updates** - Live data with professional transitions

### 📊 Analysis Modules (11 Total)

1. **🏠 AI Dashboard** - Intelligent overview with insights and recommendations
2. **Market Calibration** - Test prediction accuracy
3. **Crowd vs Experts** - Compare predictions
4. **Price Discovery** - Analyze information flow
5. **Arbitrage Network** - Detect opportunities
6. **Sentiment Analysis** - NLP vs. markets
7. **Liquidity Heatmap** - Volume distribution
8. **Forecaster Leaderboard** - Ranking system
9. **Whale Detection** - Large trader analysis
10. **Tail Risk** - Favorite-longshot bias
11. **Temporal Decay** - Time-based patterns

### 🛠️ Professional Tools

**Export & Reporting**
- Multiple formats: SVG, PNG, CSV, JSON
- Automated HTML report generation
- One-click data extraction

**Alert System**
- Custom monitoring rules
- Browser notifications
- Predefined templates (price shocks, volume spikes, arbitrage)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open http://localhost:5173 in your browser.

## 📁 Architecture

```
ihatepredictionmarkets/
├── modules/
│   ├── home/              # AI Dashboard (NEW)
│   ├── calibration/       # Market analysis
│   └── [9 other modules]
├── utils/
│   ├── aiAnalyzer.js      # AI analysis engine (NEW)
│   ├── aiDashboard.js     # Dashboard component (NEW)
│   ├── threeVisualizations.js  # 3D graphics (NEW)
│   ├── exportManager.js   # Export tools (NEW)
│   └── alertSystem.js     # Alerts (NEW)
├── data/                  # API integrations
├── stats/                 # Statistical library
└── styles/                # Dark theme CSS
```

## 💡 Usage

### AI Dashboard
Provides intelligent market overview with:
- Market metrics and summary
- Key insights from pattern detection
- Anomaly alerts
- Risk assessment with visual gauge
- Actionable recommendations

### Exporting Data
1. Click "Export Data" button
2. Choose format: JSON, CSV, SVG, or PNG
3. Data downloads automatically

### Generating Reports
1. Click "Generate Report" button
2. Comprehensive HTML report with all insights
3. Ready to share or archive

### Setting Alerts
- Use predefined templates or create custom rules
- Get browser notifications for market events
- Monitor price shocks, volume spikes, arbitrage

## 🎨 Design Philosophy

**"Quant Trader Aesthetic"**
- Dark theme for extended sessions
- Maximum data density without clutter
- Professional typography (JetBrains Mono, Inter)
- Fluid animations and transitions
- Bloomberg Terminal inspired interface

## 🔧 Tech Stack

**Frontend:** Vanilla JS (ES6), HTML5, CSS3, Vite  
**Viz:** D3.js v7, Three.js, P5.js, Chart.js  
**Data:** Arquero, Custom stats library  
**Style:** TailwindCSS, Custom CSS, KaTeX

## 📈 Statistical Methods

All implemented from scratch:
- Calibration: Brier score, Murphy decomposition, ECE
- Scoring: Log score, spherical score
- Inference: Bootstrap CIs (1000 resamples)
- Time Series: Variance ratio, autocorrelation
- Market Microstructure: Kyle's lambda, Amihud ratio

## 🌐 Data Sources

**Live APIs:** Polymarket, Kalshi, Metaculus  
**Synthetic:** Realistic simulations with calibrated distributions

Graceful degradation ensures all features work with or without live data.

## 🚀 Version 2.0 Highlights

1. **AI Integration** - Automated analysis, anomaly detection, risk assessment
2. **3D Visualizations** - Three.js networks, particles, custom shaders
3. **Export Tools** - Multi-format export, automated reports
4. **Alert System** - Custom rules, real-time notifications
5. **Enhanced UX** - Gradient animations, action bar, modern styling

## 📄 License

MIT License

---

**Built for quants, by quants** 📊✨
