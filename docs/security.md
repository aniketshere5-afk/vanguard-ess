# Security

The scaffold’s Manus OAuth session provides authenticated context. Protected tRPC procedures require a session, Zod validates request inputs, and ORM queries avoid string-built SQL. QA decision writes are role-gated and investigation closure is one-way. Audit records are append-only through the application surface; no update or delete procedure is exposed.

Secrets remain in managed environment configuration. The repository does not contain passwords, API keys, or JWT secrets. Before production use, configure CORS, database TLS, stronger role claims for Scientist/Reliability Engineer and QA Engineer, and an operational retention policy.
