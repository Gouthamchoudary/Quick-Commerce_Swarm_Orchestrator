from __future__ import annotations

from .models import Anomaly, InventoryItem, Location, Recommendation, SKU


RAW_SKUS: list[tuple[str, str, str, int, int]] = [
    ("SKU-001", "Bananas", "produce", 7, 120),
    ("SKU-002", "Avocados", "produce", 6, 180),
    ("SKU-003", "Strawberries", "produce", 9, 250),
    ("SKU-004", "Baby Spinach", "produce", 8, 150),
    ("SKU-005", "Tomatoes", "produce", 7, 300),
    ("SKU-006", "Whole Milk", "dairy", 4, 1000),
    ("SKU-007", "Greek Yogurt", "dairy", 6, 500),
    ("SKU-008", "Cheddar Block", "dairy", 3, 250),
    ("SKU-009", "Paneer", "dairy", 4, 400),
    ("SKU-010", "Eggs 12 Pack", "dairy", 10, 700),
    ("SKU-011", "Basmati Rice", "pantry", 1, 5000),
    ("SKU-012", "Wheat Flour", "pantry", 1, 5000),
    ("SKU-013", "Olive Oil", "pantry", 5, 1000),
    ("SKU-014", "Pasta", "pantry", 2, 500),
    ("SKU-015", "Tomato Sauce", "pantry", 5, 650),
    ("SKU-016", "Cereal", "pantry", 4, 450),
    ("SKU-017", "Trail Mix", "pantry", 3, 300),
    ("SKU-018", "Coffee Beans", "pantry", 2, 250),
    ("SKU-019", "Green Tea", "pantry", 2, 100),
    ("SKU-020", "Protein Bars", "pantry", 2, 360),
    ("SKU-021", "Shampoo", "personal", 5, 400),
    ("SKU-022", "Toothpaste", "personal", 3, 150),
    ("SKU-023", "Body Wash", "personal", 5, 500),
    ("SKU-024", "Hand Soap", "personal", 5, 300),
    ("SKU-025", "Face Tissue", "personal", 4, 220),
    ("SKU-026", "Dish Soap", "homecare", 4, 700),
    ("SKU-027", "Glass Cleaner", "homecare", 6, 600),
    ("SKU-028", "Laundry Pods", "homecare", 3, 900),
    ("SKU-029", "Floor Cleaner", "homecare", 4, 1000),
    ("SKU-030", "Trash Bags", "homecare", 1, 500),
    ("SKU-031", "Frozen Peas", "frozen", 4, 500),
    ("SKU-032", "Ice Cream", "frozen", 8, 750),
    ("SKU-033", "Frozen Pizza", "frozen", 5, 650),
    ("SKU-034", "Hash Browns", "frozen", 4, 450),
    ("SKU-035", "Dumplings", "frozen", 5, 550),
    ("SKU-036", "Lemons", "produce", 5, 400),
    ("SKU-037", "Apples", "produce", 4, 700),
    ("SKU-038", "Cucumber", "produce", 6, 250),
    ("SKU-039", "Butter", "dairy", 5, 200),
    ("SKU-040", "Cream Cheese", "dairy", 6, 220),
    ("SKU-041", "Granola", "pantry", 3, 400),
    ("SKU-042", "Peanut Butter", "pantry", 3, 750),
    ("SKU-043", "Honey", "pantry", 6, 500),
    ("SKU-044", "Diapers", "personal", 2, 1300),
    ("SKU-045", "Wet Wipes", "personal", 3, 600),
    ("SKU-046", "Paper Towels", "homecare", 2, 900),
    ("SKU-047", "Bleach", "homecare", 6, 1200),
    ("SKU-048", "Frozen Berries", "frozen", 8, 500),
    ("SKU-049", "Naan", "frozen", 4, 400),
    ("SKU-050", "Chicken Nuggets", "frozen", 4, 800),
]

ZONES = ["produce", "dairy", "pantry", "personal", "homecare", "frozen"]
DISPATCH = (0, 0)


def build_inventory() -> list[InventoryItem]:
    inventory: list[InventoryItem] = []
    for index, raw in enumerate(RAW_SKUS, start=1):
        sku_id, name, category, fragility, weight = raw
        aisle = (index - 1) // 5 + 1
        rack = ((index - 1) % 5) + 1
        shelf = (index % 4) + 1
        location = Location(
            id=index,
            aisle=aisle,
            rack=rack,
            shelf=shelf,
            grid_x=aisle * 2,
            grid_y=rack * 2 + (shelf % 2),
            zone=category if category in ZONES else "pantry",
        )
        sku = SKU(
            id=sku_id,
            name=name,
            category=category,
            fragility_score=fragility,
            weight_grams=weight,
        )
        inventory.append(InventoryItem(sku=sku, location=location, stock_count=18 + ((index * 7) % 23)))
    return inventory


INVENTORY = build_inventory()
SKU_INDEX = {item.sku.id: item for item in INVENTORY}

ALIASES = {
    "banana": "SKU-001",
    "bananas": "SKU-001",
    "avocado": "SKU-002",
    "strawberry": "SKU-003",
    "strawberries": "SKU-003",
    "spinach": "SKU-004",
    "tomato": "SKU-005",
    "milk": "SKU-006",
    "yogurt": "SKU-007",
    "cheese": "SKU-008",
    "paneer": "SKU-009",
    "egg": "SKU-010",
    "eggs": "SKU-010",
    "rice": "SKU-011",
    "basmati": "SKU-011",
    "flour": "SKU-012",
    "oil": "SKU-013",
    "pasta": "SKU-014",
    "sauce": "SKU-015",
    "cereal": "SKU-016",
    "coffee": "SKU-018",
    "tea": "SKU-019",
    "shampoo": "SKU-021",
    "toothpaste": "SKU-022",
    "soap": "SKU-024",
    "dish soap": "SKU-026",
    "glass cleaner": "SKU-027",
    "cleaner": "SKU-027",
    "pods": "SKU-028",
    "pizza": "SKU-033",
    "berries": "SKU-048",
    "naan": "SKU-049",
    "nuggets": "SKU-050",
}


ANOMALIES = [
    Anomaly(
        id="ANM-103",
        severity="high",
        message="Homecare chemical detected adjacent to produce staging lane.",
        location=SKU_INDEX["SKU-027"].location,
        f1_score=0.94,
    ),
    Anomaly(
        id="ANM-118",
        severity="medium",
        message="Frozen bay door open longer than target dwell window.",
        location=SKU_INDEX["SKU-032"].location,
        f1_score=0.91,
    ),
]

RECOMMENDATIONS = [
    Recommendation(
        id="REC-01",
        title="Co-locate breakfast bundle",
        lift=1.42,
        skus=["SKU-006", "SKU-016", "SKU-010"],
        rationale="Milk, cereal, and eggs co-occur in morning baskets and should move closer to dispatch.",
    ),
    Recommendation(
        id="REC-02",
        title="Separate chemical adjacency",
        lift=1.18,
        skus=["SKU-027", "SKU-047", "SKU-001"],
        rationale="Cleaning products should be moved one aisle farther from high-velocity produce.",
    ),
    Recommendation(
        id="REC-03",
        title="Stage frozen impulse items",
        lift=1.31,
        skus=["SKU-032", "SKU-048", "SKU-049"],
        rationale="Frozen dessert and bread items spike together between 7 PM and 10 PM.",
    ),
]

