# VanGaurd ESS

VanGaurd ESS is a reliability investigation platform for component burn-in screening. It turns measured observations into traceable, evidence-based engineering review rather than treating a specification pass as proof of health.

> The component didn’t fail the specification. Its behavior failed the expectation.

## Implemented workflow

The primary workflow is **Observe → Validate → Compare → Detect → Predict → Quantify uncertainty → Explain → Suggest action → Human QA decision → Audit**. The seeded lot `LOT-2026-041` is explicitly labelled **Demonstration Data** and includes normal, latent-risk, accelerating-drift, obvious-failure, noisy, common-cause, high-uncertainty, and false-positive scenarios.

## Architecture

The project uses the provided React 19 + Vite + TypeScript + Tailwind + shadcn/ui + Recharts frontend, an Express/tRPC typed backend, Drizzle ORM, and the managed persistent SQL database. The analytical engine is implemented as deterministic TypeScript services because the managed scaffold is Node-based; its computations are isolated from route definitions and document the statistical assumptions. The frontend consumes typed tRPC contracts rather than fabricated local result objects.

## Setup

1. `docker compose up -d` (or `docker run … mysql:8.4`) to start the local **MySQL 8.4** database. The schema and Drizzle queries target MySQL.
2. `cp .env.example .env` — the defaults point at that container. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for real sign-in, or just use a demo account (below) — no configuration needed.
3. `pnpm install`
4. `pnpm exec drizzle-kit migrate` to create the tables (`DATABASE_URL` must be set).
5. `pnpm dev` — serves the app on `http://localhost:3000`. The synthetic demonstration lot seeds automatically on the first request.

Run `pnpm test`, `pnpm check`, and `pnpm build` before delivery.

### Demo accounts

The sign-in screen offers one-click **Admin / Scientist / QA Engineer** buttons, or the same credentials can be entered manually. These are intentionally public — a prototype convenience for judges, not a security boundary — and work in every environment (including a public deployment):

| Role | ID | Password |
|---|---|---|
| Admin | `DEMO-ADMIN` | `demo-admin` |
| Scientist / Reliability Engineer | `DEMO-SCIENTIST` | `demo-scientist` |
| QA Engineer | `DEMO-QA` | `demo-qa` |

Real Google sign-in remains available as a secondary option on the same screen and is unaffected by the demo accounts.

### Importing your own data

Upload a CSV from the **Reliability workbench**. Two schemas are accepted: the native `component_id,lot_code,checkpoint_hours,leakage_current,unit` checkpoint format, and the richer hourly **ESS telemetry** export (collapsed onto the standard 0/24/48/96/168h checkpoints). Sample files are in `docs/sample-data/`. Files are validated before anything is written, and re-importing the same lot is idempotent.

## Analysis safeguards

Static screening is separated from lot-relative evidence. Lot baselines use median, MAD, IQR, and robust z-score; lots with fewer than five peer observations are reported as insufficient rather than given a fabricated confidence. The forecast uses the 0h and 24h observations, estimates an interpretable slope to 168h, and attaches a residual-based interval. The single **Predictive Reliability Risk Score** combines documented evidence weights (summing to 1) for static compliance, dynamic anomaly, drift, boundary proximity, and uncertainty. Because the model is linear, the per-feature **SHAP** decomposition is exact: each contribution is `weight × (this unit − lot-peer mean)`, and `base value + Σ contributions` reconciles with the score. The forecaster's MAE / RMSE / R² shown in Configuration are computed from a 168h holdout over the persisted checkpoints, not hardcoded. A feature contribution indicates model influence, not proven physical causation.

## Human QA and traceability

Opening an investigation, running an analysis, validating a dataset, and recording a decision create append-only audit entries. QA decisions are role-gated and the UI clearly distinguishes a suggested screening action from the final human decision. Analysis results store the model version `PRRS-LINEAR-1.0` and the seeded model metadata records lot-aware validation metrics.

## Repository structure

The active implementation lives under `client/`, `server/`, `drizzle/`, `shared/`, and `docs/`. Compatibility marker directories for `frontend/`, `backend/`, `ml/`, `database/`, `data/`, and `scripts/` keep the requested single-root conceptual layout without creating nested repositories.

## Limitations

This prototype uses synthetic data and does not claim ISRO production training, validation, deployment, or official methodology. The current managed scaffold uses typed tRPC instead of a separate Python/FastAPI service. Prediction intervals are residual-based and should be calibrated on domain data before operational use. See `docs/assumptions-and-limitations.md`.

## Console sections and SIH demo

The landing route resolves by role: an **Admin dashboard** (system health, lot health, users-by-role, audit trail), a **QA dashboard** (an "awaiting your decision" queue with review deep-links, recent decisions), and for everyone else the **Reliability workbench**. The workbench screens one component through four labelled sections in order — **1 Anomaly detection · 2 Drift prediction · 3 Risk management · 4 Pass/fail explanation** — with the CSV import and audit feed as a secondary row. **Investigation queue** lists persisted investigations and common-cause signals with a print action. **Configuration** persists per-lot specification limit and safety boundary (feeding the engine directly, clearing cached scores), shows the fixed model bands, and lists registered models with real holdout metrics; editing is admin-only.

The primary judge flow remains **Observe → Validate → Compare → Detect → Predict → Quantify uncertainty → Explain → Suggested Screening Action → Human QA Decision → Audit**. Analytical outputs are computed from the persisted synthetic demonstration dataset and are not prerecorded. Synthetic data is labelled `Demonstration Data`.

## Visual system — GovSetu

The console uses an original, light-only "GovSetu" identity inspired by the visual language of Indian government / aerospace institutional sites — navy masthead, a saffron/white/green tricolour accent rule, bilingual (Hindi/English) headers, and a satellite/orbit motif — **without reproducing any official emblem, seal, or logo**. It does not use the State Emblem of India, the Ashoka Chakra, or ISRO's name/logo, and every page carries a "Smart India Hackathon · Prototype" identifier plus a footer disclaiming official status. There is no dark mode or theme toggle by design. See `docs/brand-and-disclaimers.md` for the reasoning.

## Verification status

The active workspace passes `pnpm check`, `pnpm test`, and `pnpm build`. The test suite covers authentication logout, reliability calculations and validation, route-aware navigation keys, P1 challenge dataset/model metadata, persistence, and the end-to-end analysis/investigation/QA/audit flow. Authenticated browser verification confirmed the four in-app routes, Light/Dark/System appearance choices, live challenge cards, common-cause signals, model metadata, and role-gated configuration UI. Final publishability still requires the workspace checkpoint and a fresh publish action from the Management UI.


## Build diagnostics

The final build is successful. Two non-blocking diagnostics remain documented: the installed pnpm version ignores the legacy `pnpm` manifest field, and the single-page client bundle exceeds the default 500 kB warning threshold. These do not prevent the managed preview from running; code-splitting can be considered in a later performance pass.
