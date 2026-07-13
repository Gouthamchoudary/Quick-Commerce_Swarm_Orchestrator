# Quick Commerce Swarm Orchestrator

A small, interview-friendly quick-commerce warehouse simulation.

## What it does

The project takes a natural-language shopping instruction, turns it into SKUs, checks stock, calculates warehouse travel distance, and returns a routed picker plan with metrics and safety notes.

## Simple project story

1. The frontend collects an order instruction and picker count.
2. The backend parses the text into structured items.
3. The workflow validates stock and computes routes.
4. The response is rendered in the dashboard.

## Main folders

- `app/` - Next.js frontend and explanation pages
- `backend/app/` - FastAPI simulation, parsing, routing, and typed models
- `backend/tests/` - small tests for the workflow
- `Quick_Commerce_Interview_Learning_Notebook.ipynb` - end-to-end explanation notebook

## Core ideas

- Natural-language order parsing
- Deterministic fallback logic for reliability
- Optional LangChain and LangGraph orchestration
- Manhattan-distance route calculation
- FIFO baseline versus multi-picker optimized routing
- Typed API response for easy UI rendering

## Run locally

Backend:

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy notes

- The frontend can run on Vercel as a static simulation or against a hosted backend.
- Set `NEXT_PUBLIC_API_BASE_URL` to your backend URL if you want the dashboard to call `/api/simulate` and `/health` outside localhost.
- If that variable is not set, the UI uses its browser fallback so the site still works on Vercel.

## Tests

```bash
cd backend
python -m pytest tests -q
```

## Interview angle

If you are asked to explain the project, focus on:

- Why the parser has a deterministic fallback
- How Manhattan distance models warehouse walking
- Why FIFO is used as the baseline
- How the optimized routes split work across pickers
- Why LangGraph is helpful for clear workflow stages
