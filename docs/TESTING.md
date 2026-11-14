# Executed verification

Date: **2026-11-14**, local Mac, Node **26.5.0**, npm **11.17.0**, real embedded PostgreSQL **18**, Next.js **16.4.6**, Prisma **7.10.1**. Browser tests use downloaded Chromium **159** with desktop, tablet and mobile viewport/touch emulation. This is not a claim of physical iPhone/iPad or Safari testing.

## Results

| Check                                  | Executed result                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run lint`                         | PASS, no errors or warnings                                                                       |
| `npm run typecheck`                    | PASS, strict TypeScript                                                                           |
| `npm test`                             | PASS, 6 unit tests                                                                                |
| `npm run build`                        | PASS, optimized production build and route generation                                             |
| `npm audit --json`                     | 0 vulnerabilities: 0 critical/high/moderate/low/info                                              |
| `npm run db:migrate`                   | PASS, initial SQL migration applied, subsequent deploy reports no pending migrations              |
| `npm run db:seed` repeated             | PASS, initial showcase created, repeated run preserves it                                         |
| `npm run test:integration`             | PASS, 12 real HTTP/PostgreSQL integration tests                                                   |
| `npm run test:e2e`                     | PASS, 8 scenarios; 3 mobile duplicates intentionally skipped; full suite completed in 1.7 minutes |
| `npm run local`                        | PASS, startup generation/migration/seed, HTTP 200, own-process shutdown                           |
| `npm run test:e2e -- --project=tablet` | PASS, 1 additional targeted smoke check after light-label contrast adjustment                     |
| `npm run maintenance`                  | PASS, dry run only; no data removed                                                               |

## Unit coverage

Task validation rejects blank titles, invalid priorities/dates and excessive descriptions. Defaults normalize valid input. Project validation rejects invalid colors. Management permission checks cover every role and unknown values. Ordering utilities cover prepend/append/between positions. File validation rejects active SVG/HTML and invalid image signatures, while allowing normal text.

## Real PostgreSQL/API integration coverage

The integration suite starts real authenticated accounts through Better Auth, writes through HTTP handlers, and checks persisted rows with Prisma. It covers:

1. Anonymous requests and cross-origin mutations are rejected.
2. Cross-workspace reads and task/project/comment mutations are rejected without modifying the target task.
3. Columns from another project and assignees from another workspace are rejected.
4. Simultaneous same-version task edits result in exactly one success and one conflict.
5. Cross-column ordering persists as deterministic spaced positions; stale moves fail.
6. Completed comment requests replay safely without duplicate rows.
7. Single-use invitation acceptance creates membership; MEMBER cannot administer projects, invitations, settings or teams, but can comment.
8. Expired/revoked invitation links fail.
9. OWNER cannot be demoted through the role endpoint; owner promotion to ADMIN enables management.
10. Checklist completion and project archive state persist in PostgreSQL.

The suite removes only the users/workspaces it creates. It was rerun after implementation changes and passed 10/10.

## Browser scenarios

The final complete E2E run used the **production build** on loopback HTTP:

| Viewport                      | Scenario                                                                                                                                                                        | Result      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Tablet 820×1180               | Overview, board, theme and horizontal board containment                                                                                                                         | PASS        |
| Desktop 1440×1000             | Private demo, create/edit task, comment, checklist, search/filter, list/calendar, create/edit project, reload, theme, keyboard dialog trap/Escape, logout                       | PASS        |
| Desktop                       | Register, onboarding, logout and login                                                                                                                                          | PASS        |
| Desktop                       | Actual mouse sensor drag between columns; persistence verified after reload                                                                                                     | PASS        |
| Desktop, independent contexts | Task created in session A appears in B through polling; comment from A appears in B; unrelated guest demo cannot see the task                                                   | PASS        |
| Desktop, distinct users       | Invitation acceptance, MEMBER denied project creation, OWNER changes role to ADMIN, permission updates through polling; private attachment upload/download and anonymous denial | PASS        |
| Mobile, iPhone 13 emulation   | Same core product flow, persistence, theme and page overflow assertion                                                                                                          | PASS        |
| Mobile                        | Register, onboarding, logout and login                                                                                                                                          | PASS        |
| Mobile                        | Pointer drag, extra two-context and role/file scenarios duplicated from desktop                                                                                                 | SKIPPED (3) |

The desktop-specific cases are not counted as mobile passes. Touch dragging itself is not verified; a task's status selector provides an alternative. Two-session synchronization has been executed, but the transport is **3-second polling**, not instant push. Presence is not implemented or tested.

The core browser flow records uncaught page exceptions and asserts an empty error list, checks that the document does not exceed the viewport width, and confirms saved project data after a page reload. The tablet test confirms that the wide board scrolls inside its own container.

## Issues found and corrected

- Initial dependency audit: upgraded Prisma and patched the lint parser's transitive minimatch dependency. Rechecked generation, schema compatibility, lint, types, build and audit.
- Labels including helper text/select option content: corrected accessible field names and scoped browser selectors to their dialogs.
- Checklist completion: implemented immediate local checkbox feedback, persistence and error rollback.
- Mobile sidebar: bounded scrolling within the viewport so bottom controls remain reachable.
- DnD collision handling: pointer-aware detection with keyboard-compatible fallback; actual pointer movement and reload proof pass.
- Browser navigation after reload: wait for the mobile toggle to mount before opening the sidebar.
- Rapid automated guest signup hit the enabled auth throttle. Tests now pause between account-heavy scenarios; do not run the API signup suite concurrently with E2E on the same origin/IP bucket.
- Light theme task-label text uses the foreground token so pastel user-selected colors do not reduce text contrast.

## Limits of verification

Remote GitHub Actions, Linux/Node 24, a hosted Neon database, Vercel HTTPS/session behavior and durable cloud attachments have not been executed. There is no claim of a WCAG audit, malware scanning, broad load testing, cross-region latency testing, Safari/Firefox support verification, or instant push transport.

The 14 screenshots under `docs/screenshots` are real local Playwright captures. The separate final tablet smoke check runs against `npm run local`, verifies the full launcher and captures the light board after the contrast adjustment. Browser reports/traces are ignored and regenerated by tests; a targeted follow-up run can replace the most recent local report. These documents distinguish the full suite result from that targeted run.

## Publication revalidation (2026-11-14)

The owner authorized the public GitHub repo and independent free hosting/database resources. Re-ran lint, strict TypeScript, unit tests (6/6), optimized build and npm audit (0 vulnerabilities). The expanded PostgreSQL suite passes **12/12** against the database attachment adapter, including real private file bytes, cross-tenant denial, content/size rejection and concurrent quota reservations.

The three previous mobile omissions have been removed. The full browser run now passes **11/11 with no skips**, in 2.7 minutes, against a production build on port 3001. Mobile dragging uses Chromium's actual touch input dispatch (touchStart/touchMove/touchEnd), not a task-status API substitution. The independent collaboration and distinct-user role/attachment tests now also use mobile-sized touch-enabled contexts. Tests accept `E2E_BASE_URL` for the eventual public HTTPS host and `E2E_SCREENSHOT_DIR` for authentic production captures. Physical-device/Safari verification remains outside this evidence.

The earlier results above are retained as historical local evidence; this section supersedes the earlier mobile omissions. Hosted HTTPS and CI results will be appended only after execution.
