# Quick Start Guide

## Getting the App Running

### Option 1: Using Vite (Recommended)

```bash
# Navigate to project directory
cd /Users/ajaiupadhyaya/Documents/ihatepredictionmarkets

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Open browser to: http://localhost:5173
```

The app should now be running! You'll see the Market Calibration module by default.

### Option 2: Direct Browser (Alternative)

If you want to open without a build tool, you'll need to serve it via HTTP:

```bash
# Using Python
python3 -m http.server 8000

# Or using Node
npx serve

# Then open: http://localhost:8000
```

## What to Expect

1. **Top Bar**: Control date range, platform, category, and live data toggle
2. **Left Sidebar**: Navigate between 10 analysis modules
3. **Main Area**: Interactive charts and visualizations
4. **Bottom Status Bar**: Shows data freshness and API status

## Current Features

### ✅ Working Now

- **Module 1: Market Calibration** - Fully functional with 4 interactive D3.js charts:
  - Calibration curve with confidence intervals
  - Sharpness distribution
  - Brier score decomposition
  - Category comparison

- **Synthetic Data**: Automatically generates 700 realistic markets
- **Statistics Engine**: 20+ statistical functions working
- **Dark Theme UI**: Bloomberg Terminal aesthetic

### 🚧 To Be Implemented (Stubs Ready)

- Modules 2-10 show placeholder screens
- Click any module to see what's planned

## Interacting with Charts

- **Hover** over data points for detailed tooltips
- **Charts auto-resize** when you resize the browser
- **Smooth animations** on data updates (600ms transitions)
- **Methodology panels** explain the math (click "How This Works")

## Troubleshooting

**Charts not showing?**
- Check browser console (F12) for errors
- Ensure you're using a modern browser (Chrome/Firefox/Safari/Edge)
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)

**No data?**
- The app uses synthetic data by default
- Toggle "Live Data" in top bar to attempt API fetches
- Synthetic data is highly realistic and sufficient for testing

**Module won't load?**
- Some modules are stubs (2-10) and show "under construction" messages
- Module 1 is fully functional

## Development Tips

### Adding features to Module 1

Edit `/modules/calibration/index.js` to modify charts or add new ones.

### Implementing other modules

1. Copy the structure from `/modules/calibration/index.js`
2. Create your charts using D3.js
3. Add stats calculations from `/stats/index.js`
4. Update the stub file for your module

### Testing statistics

All stats functions are in `/stats/index.js`. You can test them in browser console:

```javascript
import * as stats from './stats/index.js';
stats.brierScore([0.7, 0.3, 0.9], [1, 0, 1]); // Returns Brier score
```

## Next Steps

1. **Explore Module 1** - See the calibration charts in action
2. **Switch categories** - Filter by Politics, Crypto, Economics, etc.
3. **Check stats panel** - See Brier score, ECE, and more
4. **Read methodology** - Click "How This Works" at bottom of Module 1

## Resources

- `/PROJECT_README.md` - Full project documentation
- `/stats/index.js` - All statistical formulas
- `/data/syntheticData.js` - How data is generated
- Original spec: `/README.md` (your requirements document)

## Building for Production

```bash
npm run build
```

This creates a `/dist` folder with optimized, minified files ready to deploy to any static host (Netlify, Vercel, GitHub Pages, etc.).

---

**Enjoy exploring the Prediction Markets Terminal!** 🚀📊
