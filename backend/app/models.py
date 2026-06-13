from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class OrderState(str, Enum):
    pending = "pending"
    routing = "routing"
    picking = "picking"
    dispatched = "dispatched"


class Location(BaseModel):
    id: int
    aisle: int
    rack: int
    shelf: int
    grid_x: int
    grid_y: int
    zone: Literal["produce", "dairy", "pantry", "personal", "homecare", "frozen"]


class SKU(BaseModel):
    id: str
    name: str
    category: str
    fragility_score: int = Field(ge=1, le=10)
    weight_grams: int = Field(gt=0)


class InventoryItem(BaseModel):
    sku: SKU
    location: Location
    stock_count: int = Field(ge=0)


class ParsedOrderItem(BaseModel):
    sku_id: str
    quantity: int
    fragility_score: int
    confidence: float = Field(ge=0, le=1)


class Anomaly(BaseModel):
    id: str
    severity: Literal["low", "medium", "high"]
    message: str
    location: Location
    f1_score: float


class Recommendation(BaseModel):
    id: str
    title: str
    lift: float
    skus: list[str]
    rationale: str


class RouteStop(BaseModel):
    sku_id: str
    name: str
    quantity: int
    grid_x: int
    grid_y: int
    fragility_score: int
    picker_id: int
    step: int


class PickerRoute(BaseModel):
    picker_id: int
    distance: int
    stops: list[RouteStop]


class SimulationMetrics(BaseModel):
    fifo_distance: int
    optimized_distance: int
    reduction_percent: float
    nlp_bleu_score: float
    cv_f1_score: float
    dispatch_seconds: int


class SimulationRequest(BaseModel):
    instruction: str = Field(
        default="2 bananas, 1 milk, 1 basmati rice, 1 glass cleaner, and eggs carefully",
        min_length=3,
    )
    picker_count: int = Field(default=3, ge=1, le=5)


class SimulationResponse(BaseModel):
    state: OrderState
    parsed_items: list[ParsedOrderItem]
    missing_items: list[str]
    fifo_route: PickerRoute
    optimized_routes: list[PickerRoute]
    metrics: SimulationMetrics
    anomalies: list[Anomaly]
    recommendations: list[Recommendation]
    inventory: list[InventoryItem]

