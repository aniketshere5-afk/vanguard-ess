# VanGaurd ESS

VanGaurd ESS is a reliability investigation platform for component burn-in screening. It turns measured observations into traceable, evidence-based engineering review rather than treating a specification pass as proof of health.

> The component didn’t fail the specification. Its behavior failed the expectation.

## Implemented workflow

The primary workflow is **Observe → Validate → Compare → Detect → Predict → Quantify uncertainty → Explain → Suggest action → Human QA decision → Audit**. The seeded lot `LOT-2026-041` is explicitly labelled **Synthetic / Demonstration Data** and includes normal, latent-risk, accelerating-drift, obvious-failure, noisy, common-cause, high-uncertainty, and false-positive scenarios.

## Architecture

The project uses the provided React 19 + Vite + TypeScript + Tailwind + shadcn/ui + Recharts frontend, an Express/tRPC typed backend, Drizzle ORM, and the managed persistent SQL database. The analytical engine is implemented as deterministic TypeScript services because the managed scaffold is Node-based; its computations are isolated from route definitions and document the statistical assumptions. The frontend consumes typed tRPC contracts rather than fabricated local result objects.

## Setup

Run `pnpm install`, then `pnpm dev`. The managed environment supplies the database and authentication variables. Run `pnpm test`, `pnpm check`, and `pnpm build` before delivery. `docker-compose.yml` contains an optional local PostgreSQL service for development reference; the managed scaffold’s database connection remains the source of truth for this project.

## Analysis safeguards

Static screening is separated from lot-relative evidence. Lot baselines use median, MAD, IQR, and robust z-score; lots with fewer than five peer observations are reported as insufficient rather than given a fabricated confidence. The forecast uses the 0h and 24h observations, estimates an interpretable slope to 168h, and attaches a residual-based interval. The single **Predictive Reliability Risk Score** combines documented evidence weights for static compliance, dynamic anomaly, drift, boundary proximity, and uncertainty. A feature contribution indicates model influence, not proven physical causation.

## Human QA and traceability

Opening an investigation, running an analysis, validating a dataset, and recording a decision create append-only audit entries. QA decisions are role-gated and the UI clearly distinguishes a suggested screening action from the final human decision. Analysis results store the model version `PRRS-LINEAR-1.0` and the seeded model metadata records lot-aware validation metrics.

## Repository structure

The active implementation lives under `client/`, `server/`, `drizzle/`, `shared/`, and `docs/`. Compatibility marker directories for `frontend/`, `backend/`, `ml/`, `database/`, `data/`, and `scripts/` keep the requested single-root conceptual layout without creating nested repositories.

## Limitations

This prototype uses synthetic data and does not claim ISRO production training, validation, deployment, or official methodology. The current managed scaffold uses typed tRPC instead of a separate Python/FastAPI service. Prediction intervals are residual-based and should be calibrated on domain data before operational use. See `docs/assumptions-and-limitations.md`.

## Console sections and SIH demo

The authenticated console now exposes four functional sections: **Reliability control**, **Investigation queue**, **Analysis pipeline**, and **Configuration**. Reliability control retains the deterministic P0 investigation workflow. Investigation queue presents persisted investigations, common-cause/noisy scenario signals, audit-aware status, and a print action. Analysis pipeline provides five live challenge scenarios backed by seeded measurement data, computed forecast uncertainty, safety-boundary evidence, and registered model metadata. Configuration presents the exact product roles and admin-gated safety-boundary changes.

The primary judge flow remains **Observe → Validate → Compare → Detect → Predict → Quantify uncertainty → Explain → Suggested Screening Action → Human QA Decision → Audit**. Analytical outputs are computed from the persisted synthetic demonstration dataset and are not prerecorded. Synthetic data is labelled `Synthetic / Demonstration Data`.

## Visual system

The console defaults to a dark reliability palette using `#0F172A` for the application background, `#1E293B` for primary surfaces, indigo interaction and focus accents, and high-contrast text. Users can persist **Light**, **Dark**, or **System default** preferences from the sidebar Appearance control. Print styling is included for investigation reports.

## Verification status

The active workspace passes `pnpm check`, `pnpm test`, and `pnpm build`. The test suite covers authentication logout, reliability calculations and validation, route-aware navigation keys, P1 challenge dataset/model metadata, persistence, and the end-to-end analysis/investigation/QA/audit flow. Authenticated browser verification confirmed the four in-app routes, Light/Dark/System appearance choices, live challenge cards, common-cause signals, model metadata, and role-gated configuration UI. Final publishability still requires the workspace checkpoint and a fresh publish action from the Management UI.


## Build diagnostics

The final build is successful. Two non-blocking diagnostics remain documented: the installed pnpm version ignores the legacy `pnpm` manifest field, and the single-page client bundle exceeds the default 500 kB warning threshold. These do not prevent the managed preview from running; code-splitting can be considered in a later performance pass.
