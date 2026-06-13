from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .data import ANOMALIES, INVENTORY, RECOMMENDATIONS
from .models import SimulationRequest, SimulationResponse
from .services import simulate

app = FastAPI(
    title="Q-Commerce Swarm Orchestrator",
    version="0.1.0",
    description="Single-store swarm sandbox for dark-store picking optimization.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):30\d{2}",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/snapshot")
def snapshot() -> dict[str, object]:
    return {
        "inventory": INVENTORY,
        "anomalies": ANOMALIES,
        "recommendations": RECOMMENDATIONS,
    }


@app.post("/api/simulate", response_model=SimulationResponse)
def run_simulation(payload: SimulationRequest) -> SimulationResponse:
    return simulate(payload.instruction, payload.picker_count)
