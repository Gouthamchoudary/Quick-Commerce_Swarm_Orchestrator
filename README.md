# Q-Commerce Swarm Orchestrator

Single-store dark-store simulation built from `project_PRD.pdf`.

The MVP models a quick-commerce warehouse with seeded SKUs, normalized inventory,
AI-style order parsing, stock validation, anomaly detection, co-purchase placement
recommendations, and multi-picker route optimization. The frontend visualizes FIFO
versus optimized swarm routing so the pick-time reduction is easy to inspect.

## Stack

- Frontend: Next.js, React, Framer Motion
- Backend: FastAPI, Python
- Data model: PostgreSQL-compatible schema in `backend/app/schema.sql`
- Simulation: deterministic seeded inventory and routing engine

## Run

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

