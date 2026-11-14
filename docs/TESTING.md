# Verification record — 2026-11-14

## Public release

- Demo: **https://flowteam-ten.vercel.app**
- Source: **https://github.com/cristoferdiazalvarez/flowteam**
- CI: [workflow results](https://github.com/cristoferdiazalvarez/flowteam/actions/workflows/ci.yml), [completed successful run](https://github.com/cristoferdiazalvarez/flowteam/actions/runs/43588765288).

| Check                                       | Actual result                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Lint                                        | PASS, no warnings/errors                                                                                |
| Strict TypeScript                           | PASS                                                                                                    |
| Unit tests                                  | 6/6 PASS                                                                                                |
| PostgreSQL/HTTP integration                 | 12/12 PASS                                                                                              |
| Optimized production build                  | PASS                                                                                                    |
| npm audit                                   | 0 vulnerabilities                                                                                       |
| Full local browser suite, production build  | 11/11 PASS, no skips (2.7 min)                                                                          |
| Public HTTPS browser suite                  | 11/11 PASS, no skips (3.5 min)                                                                          |
| GitHub Actions, Linux/Node 24/PostgreSQL 18 | SUCCESS: install, migrations, check, audit, build, integration and browser checks                       |
| Public HTTPS without auth/bypass            | 200                                                                                                     |
| Vercel production runtime error/fatal query | 0 returned records during tested window                                                                 |
| Publication audit                           | PASS: no runtime paths/local env secrets/private keys/GitHub tokens/private Git email addresses tracked |
| Migration and seed on new Neon Free project | PASS; direct migration connection confirmed, runtime TLS verify-full                                    |

Local host: macOS, Node 26.5.0, npm 11.17.0, PostgreSQL 18. Vercel runtime: Node 26.x; new Neon PostgreSQL 18 in Frankfurt. Browsers: Chromium 159, desktop 1440×1000, tablet 820×1180 and iPhone 13 viewport/touch emulation. This is not physical-device or Safari evidence.

## Complete browser coverage

| Viewport         | Scenario                                                                                                                                                        | Result                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Tablet           | Overview, board, theme and contained horizontal scrolling                                                                                                       | PASS locally and HTTPS    |
| Desktop + mobile | Private demo, task create/edit/comment/checklist, search/filter, board/list/calendar, project create/edit/reload, theme, focus-trapped dialog/Escape and logout | PASS in both environments |
| Desktop + mobile | Registration, onboarding, logout and login                                                                                                                      | PASS in both environments |
| Desktop          | Real mouse drag between columns, then reload to prove persistence                                                                                               | PASS in both environments |
| Mobile           | Actual Chromium touchStart/touchMove/touchEnd drag, then reload                                                                                                 | PASS in both environments |
| Desktop + mobile | Task/comment collaboration across independent contexts and unrelated demo isolation                                                                             | PASS in both environments |
| Desktop + mobile | Invitation, MEMBER denied project creation, OWNER promotes ADMIN, private attachment upload/download and access denial                                          | PASS in both environments |

**The three earlier mobile omissions are resolved. No mobile scenarios are skipped.** The published HTTPS collaboration tests additionally create **two different users with two different server session cookies**, join the second user through a secure invite, observe task/comment updates through polling and check an unrelated demo gets HTTP 404 for the first workspace. Cookie values are never logged; HttpOnly and Secure are asserted on HTTPS. Private-file tests check valid-member download, anonymous 401 and a separate authenticated nonmember's 404.

The core flows record uncaught page errors and assert none. They assert no document-width overflow. The tablet board's horizontal scrolling stays inside its own container. Desktop/mobile/tablet screenshots under `docs/screenshots/production` were captured against the actual public origin.

## PostgreSQL integration coverage

Real Better Auth accounts and real route handlers verify anonymous/origin rejection, cross-workspace reads/writes, foreign project columns/nonmember assignees, concurrent edits with exactly one 409, persisted task order and stale moves, idempotent comment replay, invitation acceptance/expiry/revocation/reuse, MEMBER/ADMIN/OWNER boundaries, checklist/archive persistence, real private file content/type/size checks, snapshot exclusion of bytes, and concurrent database file reservations at the quota. Fixtures are isolated and only their own rows are deleted.

Unit tests cover validation, permissions, task ordering and file signatures. The database adapter uses a PostgreSQL advisory transaction lock to serialize file quota reservations across function instances. Its locking return type was corrected after a real test failure, then all 12 integration cases passed.

## Reproduce

```bash
npm run local
# separate terminal; use a production build/server for equivalent release verification
npm run check
npm run test:integration
npm run test:e2e
npm audit --audit-level=moderate
npm run audit:publication
```

To exercise the public application (creates only fictional, isolated test accounts/workspaces):

```bash
E2E_BASE_URL=https://flowteam-ten.vercel.app \
E2E_SCREENSHOT_DIR=docs/screenshots/production \
npm run test:e2e
```

Account-heavy cases respect the enabled authentication throttle; do not run integration signups and browser signups concurrently against the same origin/IP bucket. Reports/traces are ignored, can contain temporary test-session data and are regenerated by test runs. They are not published in Git.

## Honest limits

Collaboration is approximately 3-second foreground HTTP polling plus network latency, not instant push. Presence and rich-text coediting are not implemented. Tests verify real internet HTTPS requests from local Chromium contexts, not separate physical devices or cross-region load. No independent WCAG/security certification, malware scanning, Safari/Firefox test, sustained load test or proof of perpetual free availability is claimed. Free quotas can pause service; no paid upgrade or billing action was enabled.
