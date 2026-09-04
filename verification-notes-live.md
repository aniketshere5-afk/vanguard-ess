# Live Verification Notes

- Authenticated preview loaded successfully at the active managed preview URL.
- Reliability Control renders the seeded synthetic dataset with 30 components, 1 active lot, 4 high-risk flags, 0 critical flags, and 23% anomaly rate.
- Appearance selector is visible with Dark active.
- Sidebar shows distinct labels for Reliability control, Investigation queue, Analysis pipeline, and Configuration.
- Primary dashboard displays lot/component selection, CSV quality gate, static result, dynamic result, 168h forecast, prediction interval, safety boundary, risk decomposition, computed evidence, suggested action, QA decision controls, persisted outcomes, and audit history.
- Browser screenshot indicates the dashboard content is visually compressed into a narrow left column in the sandbox preview capture; responsive/layout investigation is required before delivery.
- Historical audit data includes analysis and QA events, confirming persistence is active.
- Browser preview chrome indicates the page is in preview mode and is not yet publicly shareable until published.

- Direct navigation to `/investigations` produced a blank dark page with no visible elements or console output; this is a blocking route-render issue to diagnose before delivery.

- In-app navigation to `/investigations` works and renders the distinct queue section with persisted investigation counts, common-cause/noisy scenario signals, and a print action.
- In-app navigation to `/analysis` works and renders five live challenge scenario cards, computed static/dynamic/risk/168h output, prediction interval, safety boundary, and a model-evaluation area.
- In-app navigation to `/configuration` works and renders the role-aware configuration page. Current signed-in role is `user`, and the UI correctly blocks admin-only safety-boundary changes while showing model metadata.
- Appearance selector exposes System default, Light, and Dark. Switching to Light updates the console surface and text contrast successfully.

- Hard navigation to `/reliability` after the responsive capture showed a blank light surface in the browser, while in-app sidebar navigation had rendered correctly. This suggests a session or direct-navigation loading-state issue rather than a route component absence and needs one final verification after session re-establishment.

- After adding the bounded auth-loading fallback, hard navigation to `/reliability` now resolves to an explicit “Sign in to continue” state when the preview session is unavailable; it no longer remains blank indefinitely.

- The final browser session remained on the explicit sign-in screen after the user reported signing in; the preview browser session did not receive the authenticated cookie. Code-level role guards, end-to-end automated QA/audit flow, route checks from the prior authenticated session, and responsive CSS/chart hardening remain the available evidence for the handoff.

- Direct `/investigations` navigation was rechecked after the auth fallback; it resolves to the explicit sign-in state when unauthenticated.
- The managed preview chrome indicates this URL is a preview-only link and must be published separately for a public share link.

- Direct `/analysis` navigation was rechecked after the auth fallback; it resolves to the explicit sign-in state when unauthenticated rather than remaining blank.

- Direct `/configuration` navigation was rechecked after the auth fallback; it resolves to the explicit sign-in state when unauthenticated.

## Final viewport and route findings

| Section | Desktop 1280x720 | Tablet 768x1024 | Mobile 390x844 | Result |
|---|---|---|---|---|
| Reliability Control | Captured; route shell and dark surface render path available | Captured; responsive shell path available | Captured; mobile shell path available | Pass for responsive implementation; authenticated content requires session |
| Investigation Queue | Captured; direct unauthenticated state is explicit | Captured; responsive shell path available | Captured; responsive shell path available | Pass for route/fallback behavior |
| Analysis Pipeline | Captured; chart container has explicit minimum dimensions | Captured after chart hardening | Captured after chart hardening | Pass for layout safeguards; authenticated chart data requires session |
| Configuration | Captured; direct unauthenticated state is explicit | Captured; responsive shell path available | Captured; responsive shell path available | Pass for route/fallback behavior |

The preview harness showed no post-fix chart zero-dimension runtime error during the final capture batch. The authenticated session was not available to the sandbox browser after the user’s sign-in message, so the final visual captures exercised the explicit sign-in/blocked-access state rather than live authenticated data.

The blocked-action verification is the protected-route access path: direct navigation to each console section without a valid session produces the visible `Sign in to continue` state and never exposes QA or Admin controls. Role-specific allow/deny behavior is additionally covered by `role-guards.test.ts` and the end-to-end demo flow test.

- The refreshed preview now shows the interactive navy entry experience with VanGuard ESS branding, evidence-first/role-aware/audit-ready signals, a secure access card, a primary `Sign in securely` button, and a `Check session again` action.
