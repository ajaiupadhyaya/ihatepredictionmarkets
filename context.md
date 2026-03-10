Here's the expanded prompt:

---

**Prompt:**

You are a senior data visualization engineer and quantitative analyst tasked with building a comprehensive **prediction market research dashboard**, combining the editorial clarity of the New York Times graphics desk with the analytical rigor of a top-tier private equity or hedge fund research report. Think Bridgewater Associates meets NYT The Upshot. Every chart must tell a story. Every number must earn its place.

---

## Design System

Follow NYT-style data visualization principles throughout:

- **Typography:** Serif headlines (Georgia or equivalent), sans-serif axis labels and annotations (Franklin Gothic or equivalent). Tight, small labels. Zero chart junk.
- **Color palette:** Near-black (`#1a1a1a`) for primary data, slate grays for secondary series, with one or two purposeful accent colors (NYT blue `#326891` or editorial red `#c0392b`). Color should encode meaning, never decoration.
- **Grid lines:** Light gray, minimal. Negative space is intentional.
- **Annotations:** Callout labels placed directly on the chart. Avoid legends wherever inline labels can substitute.
- **Aspect ratios:** Wide and short for time series; squarish for distributions; tall for ranked bar charts; square grids for matrices.
- **Every chart** gets a dateline, source line, and methodology note in small caps at the bottom.
- **Titles** are declarative and story-first in the NYT style — never descriptive labels. Example: *"Markets Saw the Shock Coming — Two Days Too Late."*
- **Deks (subtitles):** 1–2 sentences explaining the so-what.

Frame everything through a **private equity and quantitative research lens.** Accuracy = alpha. Brier score = risk-adjusted return. Liquidity = deal flow. Mispricing = arbitrage opportunity. Use language like: market dislocation, consensus vs. contrarian positioning, resolution premium, information decay, drawdown, mean reversion, factor exposure, convexity, and tail risk.

Use synthetic but realistic, internally consistent data across all charts — same markets, same time range, same categories, same traders.

---

## Section I — Calibration & Accuracy Analysis

**1. Calibration Curve with Confidence Decomposition**
Scatterplot of predicted probability (x) vs. actual resolution frequency (y), with a perfect-calibration diagonal. Overlay a LOESS smoothing curve. Annotate zones of systematic overconfidence and underconfidence. Add a secondary panel showing calibration error by bucket as a bar chart below the main plot. Include ECE (Expected Calibration Error) as a headline stat.

**2. Reliability Diagram by Category**
Small multiples version of the calibration curve — one panel per market category (Politics, Economics, Science, Sports, Geopolitics, Finance). Show how calibration varies by domain. Annotate the worst and best-performing categories with a single callout each.

**3. Overconfidence / Underconfidence Band Chart**
Bar chart showing average predicted probability vs. actual resolution rate for bucketed probability ranges (0–10%, 10–20%, … 90–100%). Overlay the ideal line. Use a diverging color scale to show where markets are systematically biased. Decompose into resolution-weighted and count-weighted versions side by side.

**4. Sharpness vs. Calibration Frontier**
A two-axis scatter where x = sharpness (average distance of predictions from 50%) and y = calibration error. Each point is a market category or time period. Annotate the efficient frontier — the categories that are both sharp and well-calibrated. Frame it like an efficient frontier chart from portfolio theory.

---

## Section II — Probability Dynamics & Information Flow

**5. Probability Path Chart**
Multi-line time series of market probabilities over time for 8–12 key questions simultaneously. Use muted, distinct lines with direct labels at the right edge. Overlay major news event markers as vertical dashed lines with small rotated labels. Highlight the final 48 hours before resolution with a shaded band.

**6. Information Half-Life Decay Curves**
For each market category, plot how much of the final resolved probability was "known" at each point in time — measured as the correlation between time-t probability and resolution outcome. This creates a decay curve showing how quickly information is priced in. Categories that converge early are efficient; those that lurch at the end have high information decay. Overlay all categories on one chart with a highlighted median.

**7. Surprise Index Time Series**
Rolling surprise index — how often markets were shocked by outcomes relative to their confidence. Computed as a rolling average of absolute probability errors near resolution. Annotate spikes with event labels. Add a secondary panel showing surprise index vs. market volume (do high-volume periods have lower surprise?).

**8. Consensus vs. Contrarian Alpha Chart**
A time series chart showing the cumulative return to a "fade the consensus" strategy — shorting the market leader's position when a market's probability exceeds 80% or falls below 20%. Styled like a hedge fund strategy backtest. Include a drawdown panel below, Sharpe ratio, and max drawdown as headline stats.

**9. Probability Momentum Factor**
A factor analysis chart showing whether markets that have moved in one direction over the prior N days continue to move in that direction (momentum) or revert (mean reversion). Plot autocorrelation of daily probability changes at various lags (1, 3, 5, 10, 20 days). Style as a correlogram with confidence bands. Annotate the crossover from momentum to mean-reversion regime.

---

## Section III — Market Structure & Liquidity

**10. Market Liquidity vs. Accuracy Scatter**
Bubble chart: x = total trading volume, y = final Brier score, bubble size = number of unique traders, color = category. Fit a regression line. Annotate outliers — markets that were highly liquid but poorly calibrated (crowded and wrong) and illiquid but accurate (contrarian edge).

**11. Bid-Ask Spread Over Time**
For a set of major markets, plot the implied bid-ask spread (proxy for liquidity and uncertainty) over the life of each market. Show how spreads compress as resolution approaches. Overlay the spread compression curve against an idealized theoretical decay. Annotate moments of spread widening — liquidity crises or new information shocks.

**12. Trader Concentration (HHI) vs. Market Accuracy**
Compute the Herfindahl-Hirschman Index of trading volume concentration for each market (are a few traders dominating?). Plot HHI vs. Brier score. Show whether concentrated markets (few big players) outperform or underperform diffuse ones. Frame as a market structure question: does diversity of belief improve accuracy?

**13. Volume Spike Detection & Event Attribution**
A time series of aggregate daily trading volume across all markets with anomaly detection overlaid — highlight days where volume exceeded 2 standard deviations from the rolling mean. For each spike, annotate the triggering event. Show whether volume spikes precede or follow probability shifts (are traders leading or lagging the news?).

---

## Section IV — Portfolio & Returns Analysis

**14. Returns Waterfall (PE-Style)**
A waterfall chart showing hypothetical portfolio P&L if you had bought YES at market open for each resolved market, sorted by contribution. Show cumulative gains and losses as a bridge chart with green/red bars and gray connectors. Style like a private equity attribution waterfall. Headline stat: total return, win rate, average edge.

**15. J-Curve & PME Analysis**
Model the prediction market portfolio like a PE fund. Plot a J-curve of cumulative cash flows over time (money deployed into markets, money returned from resolutions). Overlay a Public Market Equivalent (PME) benchmark — in this case, a naive 50/50 random guesser. Show when the portfolio "crosses the J" and begins outperforming.

**16. Drawdown Analysis**
A time series of rolling portfolio value with a drawdown panel below — showing peak-to-trough declines in cumulative accuracy-weighted return. Annotate the three largest drawdown periods with duration, depth, and recovery time. Style like a hedge fund risk report.

**17. Rolling Sharpe & Information Ratio**
A dual-panel time series: top panel shows rolling 30-day Sharpe ratio of the prediction market portfolio (treating each market as a bet with an expected return vs. resolution outcome). Bottom panel shows the Information Ratio vs. the naive benchmark. Annotate regime shifts — periods of sustained alpha vs. periods of decay.

**18. Factor Attribution Waterfall**
Decompose portfolio returns into factor contributions: category mix, market timing, individual selection, and liquidity premium. Style as a stacked bar or waterfall showing how much of total return came from each source. Frame like a Brinson-Hood-Beebower attribution model from institutional asset management.

---

## Section V — Cross-Sectional & Comparative Analysis

**19. Brier Score Distribution by Category**
Violin plot with embedded box plot — one violin per category, sorted by median Brier score. Overlay individual market dots with slight jitter. Annotate mean and standard deviation. Use color saturation to encode sample size (lighter = fewer markets).

**20. Category Performance Heatmap**
Matrix heatmap: categories on the y-axis, time periods (quarters) on the x-axis. Cell color = average Brier score for that segment on a diverging scale anchored at 0.25 (the baseline for a random guesser). Annotate cells with sample size. Include marginal bar charts on both axes showing overall category and period performance.

**21. Resolution Outcome Sankey**
A Sankey or alluvial diagram showing how markets flow from open → active → resolved, then broken out by outcome type (Yes / No / Ambiguous / Cancelled) and then by category. Shows operational scope and resolution health of the market ecosystem.

**22. Cross-Market Correlation Matrix**
A clustered correlation heatmap of probability time series across markets — which markets move together? Use hierarchical clustering to group correlated markets. Annotate clusters with interpretive labels (e.g., "Macro / Fed cluster", "Election cluster"). Frame as a factor exposure map — if many markets are correlated, the portfolio has hidden concentration risk.

**23. Tail Risk & Black Swan Map**
A scatter plot of markets by their ex-ante probability vs. their resolution outcome, with special attention to high-conviction failures — markets where the crowd was above 85% confident and was wrong. Plot these as large red dots. Size by trading volume (bigger = more money was wrong). Annotate the top 5 largest misses. Frame as a tail risk / VAR analysis.

---

## Section VI — Trader & Behavioral Analysis

**24. Trader Performance Distribution**
A histogram of individual trader Brier scores across the full dataset, overlaid with a normal distribution curve. Annotate the top decile, the median, and the bottom decile. Add a secondary panel showing whether top-decile performance in one time period predicts top-decile performance in the next (persistence of skill vs. luck). Frame like a mutual fund manager persistence study.

**25. Anchoring Bias Detection**
A chart showing whether traders anchor to round-number probabilities (50%, 75%, 25%, 90%, 10%). Plot a distribution of all submitted probabilities and overlay a uniform distribution. Spikes at round numbers indicate behavioral anchoring. Annotate the most significant anchoring points.

**26. Late-Mover Advantage Analysis**
Compare the accuracy of trades made in the first 10% of a market's lifetime vs. the last 10%. Do early movers or late movers have better calibration? Plot as a paired bar chart by category. Annotate with a single takeaway: does patience pay?

**27. Herding Index Over Time**
A time series measuring the degree of herding behavior — how much daily probability changes are correlated across all markets simultaneously (a proxy for whether traders are moving in lockstep vs. independently). High herding = macro sentiment driving all markets. Annotate spikes in herding with external events (earnings seasons, elections, macro shocks).

---

## Output Format

For each chart, produce:
- The fully rendered, publication-quality visualization
- A declarative NYT-style title and 1–2 sentence dek
- 2–3 sentence analytical annotation embedded in or below the chart interpreting the key finding
- Headline summary statistics where applicable (e.g., ECE, Sharpe ratio, max drawdown)
- A source / methodology note in small caps

Deliver all charts as a unified, sequenced analytical research report — the kind of document that would be distributed at a Bridgewater all-hands or published as an NYT interactive feature. Open with a 150-word executive summary framing the key findings across all six sections. Close with a 100-word synthesis on what the data collectively implies about the efficiency, structure, and behavioral dynamics of prediction markets.

---