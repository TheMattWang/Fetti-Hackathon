# Cursor Project Rules

These rules steer Cursor when generating/edits. They’re scoped per folder via `globs`.

**Stack**
- Agent: LangGraph (Node/TS or Py) — SQL tool + shaping nodes
- DB: SQLite (MVP), later Postgres
- Frontend: React + TypeScript + Tailwind
- Viz: Recharts (charts), react-leaflet (map)

**Repo layout (expected)**
- `agent/**` : graph, tools (sql, forecast, cluster), UI patch emitter
- `server/**`: HTTP/SSE or LangGraph Server adapter
- `app/**`   : React UI (component registry + RenderSpec + stream hook)
- `analytics/**` : optional Python/TS helpers for forecasting/clustering

> Open Cursor → Settings → Rules to toggle/inspect these.
