# Project TODO

- [x] Import the reviewed VanGaurd ESS React/tRPC/Drizzle implementation into the active workspace
- [x] Preserve deterministic reliability-analysis services and synthetic demonstration data
- [x] Verify CSV validation and data-quality reporting for malformed, incomplete, duplicate, inconsistent, and unexpected data
- [x] Verify static specification screening as a separate analytical layer
- [x] Verify lot-relative anomaly detection with robust baseline and insufficient-peer handling
- [x] Verify early-drift analysis and leakage-safe 168h forecasting
- [x] Verify prediction uncertainty and safety-boundary comparison
- [x] Verify one transparent Predictive Reliability Risk Score with documented contributors
- [x] Verify evidence-based explanations and suggested screening action labeling
- [x] Verify immutable audit history for analysis, investigation, recommendation, and QA decisions
- [x] Implement role-aware Reliability Engineer, QA Engineer, and Admin behavior
- [x] Gate QA decisions and configuration actions by role
- [x] Make Reliability Control navigation section functional
- [x] Make Investigation Queue navigation section functional
- [x] Make Analysis Pipeline navigation section functional
- [x] Make Configuration navigation section functional
- [x] Add live Challenge Mode scenarios based on computed scenario data
- [x] Add common-cause investigation signals
- [x] Add lot-level intelligence view
- [x] Add printable investigation report
- [x] Add basic model-evaluation view using actual computed data
- [x] Apply dark reliability-console palette with #0F172A background, #1E293B surfaces, indigo accents, and high-contrast text
- [x] Preserve persistent Light, Dark, and System appearance choices
- [x] Verify accessible desktop, tablet, and mobile layouts
- [x] Verify dense charts, tables, filters, investigation controls, and mobile navigation
- [x] Verify loading, empty, error, and authenticated states in the browser
- [x] Add/strengthen Vitest coverage for P0/P1 logic and navigation behavior
- [x] Remove nonessential build warnings where feasible
- [x] Update README and documentation with final workflow, roles, P1 features, and verification status
- [x] Run type check, tests, production build, and responsive browser checks
- [x] Save final checkpoint and provide the fresh live preview link


## Verification follow-ups identified during authenticated review

- [x] Exercise CSV validation with malformed, incomplete, duplicate, inconsistent, and unexpected files and capture passing evidence
- [x] Verify QA Engineer and Admin accounts end-to-end, including successful QA closure and successful admin configuration change
- [x] Fix and re-verify hard navigation for `/reliability` and other direct section URLs during session/loading transitions
- [x] Review mobile and tablet captures and resolve chart/container zero-dimension warnings
- [x] Add explicit browser verification for failed queries/actions and rerun final responsive checks
- [x] Reduce or document remaining pnpm and bundle-size warnings


## Final evidence pass

- [x] Verify desktop, tablet, and mobile layouts with documented pass/fail findings for every console section
- [x] Provide the fresh live preview URL after the final checkpoint
- [x] Verify QA Engineer and Admin actions in an authenticated browser session or record the exact environment limitation
- [x] Hard-navigate to `/investigations`, `/analysis`, and `/configuration` and confirm explicit authenticated/loading/unauthenticated behavior
- [x] Review post-fix mobile and tablet captures and confirm no zero-dimension chart warnings remain
- [x] Exercise at least one failed query/action path in-browser and record the resulting error state


## Last evidence pass before handoff

- [x] Verify each console section at desktop, tablet, and mobile sizes and document pass/fail findings
- [x] Send the fresh live preview URL to the user after the final checkpoint
- [x] Hard-navigate to `/investigations`, `/analysis`, and `/configuration` after the auth fallback and confirm explicit states
- [x] Capture and review post-fix mobile and tablet screenshots and confirm zero-dimension chart warnings are gone
- [x] Exercise a real blocked action in-browser and record the visible error state


## Sign-in fix and entry experience

- [x] Diagnose and fix the `authorize params not found` OAuth handoff error
- [x] Add explicit OAuth-loading, callback-error, and retry states
- [x] Redesign the unauthenticated navy sign-in screen with interactive console-style affordances
- [x] Verify sign-in URL generation and unauthenticated fallback behavior
- [x] Run type check, tests, build, and preview verification for the sign-in changes
