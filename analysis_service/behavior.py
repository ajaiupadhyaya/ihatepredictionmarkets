from __future__ import annotations

from typing import Any, Dict

import numpy as np
import pandas as pd

from .data_access import load_markets, load_prices_for_markets


def liquidity_summary() -> Dict[str, Any]:
    df = load_markets(resolved_only=None)
    if df.empty:
        return {"by_exchange": {}, "by_category": {}}

    def agg(group: pd.DataFrame) -> Dict[str, float]:
        return {
            "markets": int(len(group)),
            "avg_volume": float(group["volume"].fillna(0.0).mean()),
            "median_volume": float(group["volume"].fillna(0.0).median()),
            "avg_liquidity": float(group["liquidity"].fillna(0.0).mean()),
            "median_liquidity": float(group["liquidity"].fillna(0.0).median()),
        }

    by_exch = {name: agg(g) for name, g in df.groupby("exchange", observed=True)}
    by_cat = {name: agg(g) for name, g in df.groupby("category", observed=True)}

    return {"by_exchange": by_exch, "by_category": by_cat}


def volatility_event_window(window_size: int = 24) -> Dict[str, Any]:
    """
    Construct a synthetic 'event window' by aligning price series around resolution
    times where available. This approximates how markets move into events.
    """
    df = load_markets(resolved_only=True)
    if df.empty or "id" not in df.columns:
        return {"series": []}

    # Take a sample of markets with prices
    market_ids = df["id"].astype(int).tolist()
    prices = load_prices_for_markets(market_ids)
    if prices.empty:
        return {"series": []}

    # Use resolution_time as t=0 when available, otherwise last timestamp
    prices["timestamp"] = pd.to_datetime(prices["timestamp"])
    prices = prices.sort_values(["market_id", "timestamp"])

    aligned_records = []
    for market_id, group in prices.groupby("market_id", observed=True):
        group = group.copy()
        res_time = df.loc[df["id"] == market_id, "resolution_time"].dropna()
        if not res_time.empty:
            t0 = pd.to_datetime(res_time.iloc[0])
        else:
            t0 = group["timestamp"].iloc[-1]

        group["hours_from_event"] = (group["timestamp"] - t0).dt.total_seconds() / 3600.0
        # Keep only a window around the event
        mask = group["hours_from_event"].between(-window_size, window_size)
        group = group[mask]
        if group.empty:
            continue

        group["norm_price"] = group["last_price"].astype(float)
        aligned_records.append(group[["hours_from_event", "norm_price"]])

    if not aligned_records:
        return {"series": []}

    aligned = pd.concat(aligned_records, ignore_index=True)
    # Bin into hourly buckets and average
    aligned["hour_bin"] = aligned["hours_from_event"].round().astype(int)
    agg = (
        aligned.groupby("hour_bin", observed=True)["norm_price"]
        .agg(["mean", "std", "count"])
        .reset_index()
        .sort_values("hour_bin")
    )

    series = [
        {
            "hours_from_event": int(row["hour_bin"]),
            "avg_price": float(row["mean"]),
            "std_price": float(row["std"]) if not np.isnan(row["std"]) else None,
            "count": int(row["count"]),
        }
        for _, row in agg.iterrows()
        if row["count"] > 0
    ]

    return {"series": series}

