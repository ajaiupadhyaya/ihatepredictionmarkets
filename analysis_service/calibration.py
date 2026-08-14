from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

from .data_access import load_markets


@dataclass
class CalibrationBucket:
    bucket: str
    prob_lower: float
    prob_upper: float
    mean_pred: float
    empirical_freq: float
    count: int


def compute_calibration(n_bins: int = 10) -> Dict[str, Any]:
    df = load_markets(resolved_only=True)
    if df.empty:
        return {"buckets": [], "summary": {"resolved_markets": 0}}

    # Ensure required columns exist
    if "final_probability" in df.columns and df["final_probability"].notna().any():
        probs = df["final_probability"].astype(float)
    elif "current_probability" in df.columns:
        probs = df["current_probability"].astype(float)
    else:
        return {"buckets": [], "summary": {"resolved_markets": 0}}

    outcomes = df["resolved_outcome"].astype(float)

    mask = probs.notna() & outcomes.notna()
    probs = probs[mask].clip(0.01, 0.99)
    outcomes = outcomes[mask]

    if probs.empty:
        return {"buckets": [], "summary": {"resolved_markets": 0}}

    bins = np.linspace(0.0, 1.0, n_bins + 1)
    df_cal = pd.DataFrame({"p": probs, "y": outcomes})
    df_cal["bin"] = pd.cut(df_cal["p"], bins=bins, include_lowest=True, right=True)

    groups = df_cal.groupby("bin", observed=True)

    buckets: List[CalibrationBucket] = []
    for interval, group in groups:
        if group.empty:
            continue
        bounds = (float(interval.left), float(interval.right))
        bucket = CalibrationBucket(
            bucket=f"{bounds[0]:.2f}-{bounds[1]:.2f}",
            prob_lower=bounds[0],
            prob_upper=bounds[1],
            mean_pred=float(group["p"].mean()),
            empirical_freq=float(group["y"].mean()),
            count=int(len(group)),
        )
        buckets.append(bucket)

    brier = float(((probs - outcomes) ** 2).mean())

    return {
        "buckets": [asdict(b) for b in buckets],
        "summary": {
            "resolved_markets": int(len(df_cal)),
            "brier_score": brier,
            "exchanges": sorted(df["exchange"].dropna().unique().tolist()),
        },
    }


def compute_calibration_by_exchange(n_bins: int = 10) -> Dict[str, Any]:
    df = load_markets(resolved_only=True)
    if df.empty:
        return {"by_exchange": {}}

    results: Dict[str, Any] = {}
    for exch, group in df.groupby("exchange", observed=True):
        tmp = group.copy()
        if "final_probability" in tmp.columns and tmp["final_probability"].notna().any():
            probs = tmp["final_probability"].astype(float)
        elif "current_probability" in tmp.columns:
            probs = tmp["current_probability"].astype(float)
        else:
            continue

        outcomes = tmp["resolved_outcome"].astype(float)
        mask = probs.notna() & outcomes.notna()
        probs = probs[mask].clip(0.01, 0.99)
        outcomes = outcomes[mask]
        if probs.empty:
            continue

        bins = np.linspace(0.0, 1.0, n_bins + 1)
        df_cal = pd.DataFrame({"p": probs, "y": outcomes})
        df_cal["bin"] = pd.cut(df_cal["p"], bins=bins, include_lowest=True, right=True)

        groups = df_cal.groupby("bin", observed=True)
        buckets: List[CalibrationBucket] = []
        for interval, g in groups:
            if g.empty:
                continue
            bounds = (float(interval.left), float(interval.right))
            buckets.append(
                CalibrationBucket(
                    bucket=f"{bounds[0]:.2f}-{bounds[1]:.2f}",
                    prob_lower=bounds[0],
                    prob_upper=bounds[1],
                    mean_pred=float(g["p"].mean()),
                    empirical_freq=float(g["y"].mean()),
                    count=int(len(g)),
                )
            )

        brier = float(((probs - outcomes) ** 2).mean())

        results[exch] = {
            "buckets": [asdict(b) for b in buckets],
            "summary": {
                "resolved_markets": int(len(df_cal)),
                "brier_score": brier,
            },
        }

    return {"by_exchange": results}


def generate_calibration_figure(output_path: str) -> None:
    """Generate an overall calibration figure using seaborn and save to PNG."""
    sns.set_theme(style="whitegrid")

    df = load_markets(resolved_only=True)
    if df.empty:
        return

    if "final_probability" in df.columns and df["final_probability"].notna().any():
        probs = df["final_probability"].astype(float)
    elif "current_probability" in df.columns:
        probs = df["current_probability"].astype(float)
    else:
        return

    outcomes = df["resolved_outcome"].astype(float)
    mask = probs.notna() & outcomes.notna()
    probs = probs[mask].clip(0.01, 0.99)
    outcomes = outcomes[mask]
    if probs.empty:
        return

    plt.figure(figsize=(6, 6))
    # Reliability-style scatter with diagonal
    bins = np.linspace(0.0, 1.0, 11)
    df_cal = pd.DataFrame({"p": probs, "y": outcomes})
    df_cal["bin"] = pd.cut(df_cal["p"], bins=bins, include_lowest=True, right=True)
    grouped = df_cal.groupby("bin", observed=True).agg(p_mean=("p", "mean"), y_mean=("y", "mean"), n=("y", "size"))

    sns.scatterplot(
        x="p_mean",
        y="y_mean",
        size="n",
        sizes=(20, 200),
        data=grouped.reset_index(drop=True),
        legend=False,
        color="#111827",
    )
    plt.plot([0, 1], [0, 1], "--", color="#9ca3af", linewidth=1)
    plt.xlabel("Implied probability")
    plt.ylabel("Empirical frequency")
    plt.title("Prediction Market Calibration")
    plt.tight_layout()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    plt.savefig(output_path, dpi=150)
    plt.close()

