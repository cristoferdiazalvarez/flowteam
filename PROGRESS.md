# Progress

- 2026-11-14: Read brief. Existing FlowTeam directory empty. Node 26 available; Docker and PostgreSQL absent. Preparing isolated embedded PostgreSQL and npm dependencies.
- PostgreSQL 18 isolated in .data/postgres, listening only on 127.0.0.1:55437. Initial migration applied; idempotent showcase seed executed.
- Built auth/onboarding, isolated demo, workspace/team settings, roles and expiring single-use invitations; project CRUD/archive; board/list/calendar; task editing, assignments, labels, comments, checklists, uploads, activity, inbox and real metrics.
- Production build, lint and TypeScript passed. Unit tests 6/6; PostgreSQL/API integration tests 10/10 passed.
- Updated Prisma to 7.10.1 after audit found a vulnerable transitive tool dependency. Current npm install audit: 0 vulnerabilities. Scoped minimatch override addresses the lint tool dependency advisory.
- Browser QA underway against production build; initial screenshots captured. No resources deployed or remote Git configured.
- Final full production E2E run: 8 passed, 3 intentionally skipped duplicate mobile scenarios (1.7 minutes). Verified real pointer drag + reload, two browser contexts seeing task/comment updates, unrelated demo isolation, two-user roles and private files. Desktop, mobile and tablet core flows passed.
- Fixed controlled checklist feedback, mobile sidebar scrolling, pointer collision detection and accessible field/test selectors. Auth throttling remains enabled; tests respect its signup window.
- Documentation completed: README, architecture/data model/API/security/deployment, testing record, interview case study and portfolio/LinkedIn drafts. Official free-plan limits researched; no services provisioned.
- One-command launcher verified: generates Prisma client, applies migrations, preserves existing seed, starts PostgreSQL + Next and serves HTTP 200. Added ordered shutdown of its own process groups (app before database).
- Final light-board contrast follow-up: targeted tablet browser check 1/1 passed; 14 authentic PNG screenshots now available. Final optimized build, lint, strict TypeScript and 6 unit tests pass after the visual adjustment.
- Final full integration run 10/10; final full browser suite 8 passed / 3 intentionally skipped. Audit 0 vulnerabilities. Runtime, .env and traces confirmed ignored by Git. Prior portfolio projects untouched.
- Launcher teardown verified: HTTP 200, Ctrl+C exits successfully, and both ports 3000/55437 refuse connections afterward. Corrected embedded-postgres's existing-database bootstrap connection leak by explicitly closing a dedicated pg client. Data remains on disk.

## Authorized publication — 2026-11-14

- Owner authorized a public `cristoferdiazalvarez/flowteam` repo and independent Vercel Hobby/Neon Free resources; no paid plans or billing changes permitted.
- Verified existing provider sessions: Vercel team is Hobby, Neon organization/account Free. Existing BusinessOS/Atelier databases are excluded from all writes.
- Rechecked lint, TypeScript, build, unit tests and audit (0 vulnerabilities).
- Implemented bounded private PostgreSQL attachment storage for serverless without an additional provider; applied new local migration. Real integration suite now 12/12 including bytes, tenant access, invalid/oversized files and concurrent quota reservations.
- Removed all mobile skips. Full browser suite: 11/11 passed, including real touch-event drag, collaboration in independent mobile contexts and member/admin/private-file tests. Completed in 2.7 minutes against production build on isolated port 3001; preserved the user's dev server on 3000.
- Sanitized the original local Git commit's author/committer email to GitHub noreply before publication.

- Published public GitHub repo and first main push; GitHub Actions run 43588765288 succeeded (Linux/Node 24/PostgreSQL 18, all pipeline stages).
- Created only FlowTeam’s independent Neon Free database and Vercel Hobby project, verified plans before provisioning. Encrypted production variables configured with fresh auth secret and strict TLS; migrations/fictional seed applied. No plans, cards, trials, paid builds or billing settings changed.
- Deployed production HTTPS at https://flowteam-ten.vercel.app. No Vercel authentication/bypass needed. Production suite: 11/11 passed, no skips, in 3.5 minutes. Stronger collaboration proof uses distinct users/session cookies with Secure/HttpOnly checks; outsider reads and downloads denied.
- Queried production runtime error/fatal logs: 0 records returned. Replaced README evidence with authentic public screenshots and prepared live-link portfolio/LinkedIn copy.
