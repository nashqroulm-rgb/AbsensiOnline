# AbsensiOnline — agent guide

React + Vite + Tailwind attendance app: **admin dashboard** (`src/components/admin/`) and **worker PWA** (`src/components/pwa/`). Auth in `src/context/AuthContext.tsx`, mock data in `src/data/mockData.ts`.

## Graphify (codebase map)

Knowledge graph lives in `graphify-out/`. Use it before broad greps or reading many source files.

Graphify pipeline scripts (`run_*.py`) live in `.graphify/scripts/` (gitignored) — not application code. If they reappear under `graphify-out/`, delete or ignore them; they are listed in `.gitignore`.

1. **Start:** `graphify-out/wiki/index.md` (community articles) or `graphify-out/GRAPH_REPORT.md` (god nodes, surprising connections).
2. **Scoped questions:** `graphify query "<question>"` (from repo root).
3. **After you change `.ts`/`.tsx`:** `graphify update .` (AST-only, no LLM cost).

Regenerate full graph (LLM semantic pass): `/graphify .` in the assistant.

## Caveman (token efficiency)

Default: **lite** — tight prose, no filler; keep full sentences when order matters.

- Stronger: `/caveman full` or `/caveman ultra`
- Off for this session: `normal mode` or `stop caveman`
- Commits: use **caveman-commit** skill when user asks for commit messages

Code blocks, diffs, and commit messages stay normal (readable), not caveman.

## Stack

`npm run dev` | `npm run build` | `npm run preview`
