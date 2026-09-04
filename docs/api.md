# API Contract

The typed contract is exposed through tRPC under `/api/trpc`. The main procedures are `dashboard.summary`, `lots.list`, `lots.get`, `components.list`, `components.get`, `ingestion.validate`, `analysis.run`, `analysis.get`, `predictions.get`, `explanations.get`, `investigations.list`, `investigations.create`, `investigations.decide`, `audit.list`, and `models.list`. Authentication uses the scaffold’s OAuth session and protected procedures require a session.

Validation and analysis return honest states. Small lots report insufficient peer data; missing checkpoints report insufficient temporal data; and high residual spread is surfaced as high uncertainty. QA decisions are schema-validated and cannot be written to a closed investigation.
