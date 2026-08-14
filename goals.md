# Project Specification: Prediction Market Audit & Analytics Suite (2026)

## 1. Project Overview
**Objective:** To build an interactive research platform that "audits" the efficiency, fairness, and structural integrity of modern prediction markets (e.g., Polymarket, Kalshi, PredictIt).
**Target Output:** A suite of interactive visualizations (D3.js, Plotly, or Streamlit) paired with quantitative "Op-Ed" style reports.

---

## 2. Core Audit Modules & Technical Tasks

### Module A: The "Whale" & Concentration Audit
* **Goal:** Determine if markets are driven by the "Wisdom of the Crowd" or the "Will of the Whale."
* **Agent Task:** * Query the API for order book depth and top holder addresses.
    * Calculate the **Gini Coefficient** for specific high-volume contracts.
    * **Visualization:** Create a **Lorenz Curve** overlaying different contract types (e.g., Politics vs. Sports) to show wealth concentration.
    * **Research Question:** Do markets with higher concentration (whales) converge to the "true" outcome faster or slower than fragmented markets?

### Module B: The "Insider Trading" Signal Detection
* **Goal:** Identify "Pre-News Spikes" that suggest information leakage.
* **Agent Task:**
    * Identify "Black Swan" events (e.g., a sudden court ruling or CEO resignation).
    * Scrape/API-call the price history for the 24 hours leading up to the event.
    * Calculate the **Cross-Correlation** between trade volume spikes and the official timestamp of the news.
    * **Visualization:** A "Lead-Lag" chart showing the "Time to Discovery"—how many minutes before the news did the market "know"?

### Module C: Calibration & Bias Audit (The Brier Score)
* **Goal:** Measure the statistical reliability of the market's "Probability" claims.
* **Agent Task:**
    * Collect historical "Resolved" contracts.
    * Bucket them by predicted probability (e.g., all contracts at 70%).
    * Calculate the **Brier Score** for the platform:
      $$BS = \frac{1}{N} \sum_{t=1}^{N} (f_t - o_t)^2$$
      *(Where $f$ is forecast and $o$ is actual outcome 0 or 1).*
    * **Visualization:** A **Calibration Plot**. If the line dips below the 45-degree diagonal, the market is "Overconfident."

### Module D: Liquidity & "Balkanization" Mapping
* **Goal:** Analyze how regional bans (US State-level or International) affect market thickness.
* **Agent Task:**
    * Compare Bid-Ask spreads between "US-Legal" markets (Kalshi) and "International/Crypto" markets (Polymarket) for the same event.
    * **Visualization:** A "Spread-Heatmap" showing how liquidity dries up or shifts as regulatory news breaks.

---

## 3. Data Sources & Integration
The agent should prioritize the following endpoints:
1.  **Polymarket (Gamma API):** For high-volume, crypto-native "Whale" data.
2.  **Kalshi API:** For regulated, US-centric institutional data.
3.  **News API / Twitter (X) API:** To timestamp "Ground Truth" events for the Lead-Lag analysis.

---

## 4. Analytical Tools & Libraries
* **Backend:** Python (Pandas, NumPy, SciPy for the Brier/Gini calculations).
* **Frontend:** Plotly (for interactivity) or D3.js (for custom Lorenz curves).
* **Database:** SQLite or PostgreSQL to store historical "Resolved" contract data.

---

## 5. First Deliverable for Agent
"Initialize a Python environment and fetch the last 100 resolved 'Political' contracts from Polymarket. Calculate the average Brier Score and generate a calibration plot to determine if the market tended to over-price longshots (>90% or <10%)."