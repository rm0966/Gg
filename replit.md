# مساري | Masari Discovery

An Arabic-first self-discovery and career exploration app with bilingual assessments, anonymous saved reports, practical recommendations, and free PDF downloads.

## Run & Operate

- On Replit, start `artifacts/masari-discovery: web` and `artifacts/api-server: API Server`. These managed workflows provide the service ports and proxy paths.
- `pnpm install` — install workspace dependencies.
- `pnpm run typecheck` — typecheck shared libraries and workspace apps.
- `pnpm run build` — typecheck and build workspace packages.
- Required secret for report generation: `GROQ_API_KEY`.
- Optional environment variable: `GROQ_MODEL` (defaults to `openai/gpt-oss-120b`).
- The API stores anonymous reports as local JSON under `artifacts/api-server/data/masari`; these files may not survive some restarts or redeployments.

## Stack

- pnpm workspaces, Node.js 24, TypeScript
- Web: React + Vite
- API: Express 5
- AI reports: Groq chat completions API
- API contracts: OpenAPI, Orval, Zod
- Current report storage: owner-scoped local JSON files

## Where things live

- `artifacts/masari-discovery` — Arabic-first React/Vite app.
- `artifacts/api-server` — Express API, assessment catalog, Groq report generation, and local report storage.
- `lib/api-spec/openapi.yaml` — API contract source of truth.
- `lib/api-zod` and `lib/api-client-react` — generated validation schemas and React API hooks.

## Architecture decisions

- Reports are for self-discovery, not medical or psychological diagnosis.
- The first version does not require an account or phone number.
- Saved reports are scoped to a private browser token; local JSON storage may not survive every restart or redeployment.

## Pointers

- See `.local/skills/pnpm-workspace/SKILL.md` for workspace structure and package conventions.
