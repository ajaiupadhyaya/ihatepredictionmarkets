from __future__ import annotations

import os
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .calibration import compute_calibration, compute_calibration_by_exchange, generate_calibration_figure
from .behavior import liquidity_summary, volatility_event_window

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FIGURE_DIR = os.path.join(ROOT_DIR, "public", "figures")

app = FastAPI(title="Prediction Markets Analysis Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok"}


@app.get("/calibration/overall")
def calibration_overall() -> Dict[str, Any]:
    try:
        return compute_calibration()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/calibration/by_exchange")
def calibration_by_exchange() -> Dict[str, Any]:
    try:
        return compute_calibration_by_exchange()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/behavior/liquidity")
def behavior_liquidity() -> Dict[str, Any]:
    try:
        return liquidity_summary()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/behavior/event_window")
def behavior_event_window(window_size: int = 24) -> Dict[str, Any]:
    try:
        return volatility_event_window(window_size=window_size)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/figures/calibration-overall")
def regenerate_calibration_figure() -> Dict[str, Any]:
    try:
        output_path = os.path.join(FIGURE_DIR, "calibration_overall.png")
        generate_calibration_figure(output_path)
        rel_path = os.path.relpath(output_path, ROOT_DIR)
        return {"success": True, "path": rel_path}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("ANALYSIS_PORT", "8002"))
    uvicorn.run("analysis_service.app:app", host="0.0.0.0", port=port, reload=False)

