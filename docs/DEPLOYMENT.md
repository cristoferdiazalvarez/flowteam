# FlowTeam release

Publication was explicitly authorized on 2026-11-14 for **cristoferdiazalvarez/flowteam**, Vercel Hobby and a new independent Neon Free database. No paid plan, trial, card, paid build machine or separate storage/realtime service is used.

- Repository: https://github.com/cristoferdiazalvarez/flowteam
- Assigned production origin: https://flowteam-ten.vercel.app (public HTTPS verified; all 11 production browser scenarios passed)
- Vercel project: `flowteam`, verified Hobby team; Node 26.x, Frankfurt function region.
- Neon project: `flowteam`, verified Free organization, PostgreSQL 18 in AWS Frankfurt. Separate from `businessos-demo` and `atelier-commerce`; neither was modified.
- Runtime uses a pooled connection. Checked-in migrations use a direct connection supplied only through a child process environment. Local secrets/database files were not uploaded.

## Free limits checked before provisioning

Official sources checked on 2026-11-14:

- [Vercel Hobby](https://vercel.com/docs/plans/hobby): 1 million function invocations/month, 4 active CPU-hours, 360 GB-hours provisioned memory and 100 GB fast transfer. Exceeding free allowances can pause functionality. Project creation does not upgrade the team.
- [Neon pricing](https://neon.com/pricing): Free lists 100 CU-hours/month/project, 1 GB PostgreSQL storage/project and 5 GB network transfer/month. It suspends compute or disallows growth when limits are reached; no card is required. The provider enforces the Free suspension interval, which was left unchanged. Its API reports `suspend_timeout_seconds: 0`, meaning the default 300 seconds—not disabled suspension—as defined in the [official API schema](https://github.com/neondatabase/neon-api-python/blob/main/v2.json). Compute is bounded at 0.25 CU for this demo.
- [Vercel request limits](https://vercel.com/docs/functions/limitations): binary uploads are capped by this app at 1 MiB, comfortably below function body limits.

The account/organization plans were verified through authenticated provider APIs immediately before creating resources. No billing APIs, payment-card actions, upgrades, add-ons, paid build options or plan changes were invoked. Free quotas are finite: temporary unavailability on exhaustion is acceptable; automatic paid upgrading is not.

## Polling and storage budget

One foreground tab polling every 3 seconds sends approximately **1,200 workspace snapshot requests/hour**, plus authentication and user actions. Two continuously active tabs approximately double that. Actual cadence also includes request latency. Polling pauses in hidden tabs; it can keep Neon compute awake and consume transfer even when no task changes. At 0.25 CU, 100 CU-hours correspond to about 400 active compute hours/month, shared with all queries in this project. These are capacity calculations, not a guarantee of uninterrupted free operation.

The app uses short authenticated HTTP requests, PostgreSQL transactions and version checks. No persistent WebSocket server or third-party realtime provider is needed. Presence and instant collaborative text merging are not implemented. Wider promotion should add incremental snapshots, pagination, idle backoff and a scheduled retention policy.

Private attachments use PostgreSQL bytea storage on Vercel, behind authenticated download routes. Quotas are **1 MiB/file, 5 MiB/workspace and 100 MiB of binary content globally**, enforced by transactionally serialized reservations. This uses the already authorized Free database rather than another storage service. It is appropriate for a small demo, not large-file storage. Database overhead, task data and egress also consume free quotas. Workspace deletion cascades its blobs; maintenance can reclaim old orphans. Raw file bytes and storage keys are excluded from snapshots.

## Secure release process

1. Run lint, TypeScript, unit tests, integration tests, audit and the full browser suite. All mobile cases run; no prior mobile omissions remain.
2. Audit tracked files and actual local secret values with `npm run audit:publication`; use GitHub noreply author/committer email. `.env`, runtime databases, `.storage`, provider metadata and browser traces stay ignored.
3. Push only this independent repo's `main`; standard GitHub-hosted public-repo CI uses the checked-in ephemeral PostgreSQL service and dummy CI-only secrets.
4. Apply `prisma migrate deploy` and idempotent fictional showcase seed only to the new FlowTeam database. Visitor demos create their own private fictional workspace at runtime; no shared demo password exists.
5. Set encrypted production `DATABASE_URL`, fresh `BETTER_AUTH_SECRET`, exact HTTPS `BETTER_AUTH_URL` and `STORAGE_BACKEND=database`. Connection strings/tokens stay outside Git, shell arguments and documentation.
6. Deploy only project `flowteam` using its explicit project/team identifiers. `.vercelignore` excludes local data, secrets and test artifacts. Region is Frankfurt; no paid Turbo build flag is used.
7. Test the public HTTPS origin with `E2E_BASE_URL` and save authentic captures under `docs/screenshots/production`. Check session cookie flags, anonymous demo entry, workspace isolation, roles, persistence, touch drag, uploads and two independent sessions.
8. Inspect CI and deployment terminal results; record actual outcomes and remaining limitations in TESTING.md. Update README and portfolio copy only with real public URLs.

## Local operation

`npm run local` still starts the isolated loopback PostgreSQL and Next development server. Existing local data is preserved. `STORAGE_BACKEND=database` also exercises the hosted attachment adapter locally. A production-build test server can use port 3001 and `BETTER_AUTH_URL=http://127.0.0.1:3001` while leaving an existing development server on 3000 untouched.

`npm run maintenance` is dry-run. Review eligibility before applying it to the FlowTeam database with `--apply`. Do not point maintenance, migrations or seeds at other projects. Email recovery/delivery, physical-device/Safari verification, presence, large object storage and broad load testing remain outside this release.

## Confirmed release evidence

- Public HTTPS origin returns 200 without a Vercel login/bypass token.
- Production browser suite: **11/11 passed**, 0 skipped, 3.5 minutes. Includes distinct user identities and different HttpOnly/Secure session cookies, mobile touch input, cross-workspace 404 checks and authenticated/anonymous private-file denial.
- Vercel runtime error/fatal log query returned zero records during the production verification window; public application tests recorded no uncaught page errors in the main flows.
- GitHub Actions completed successfully on the public repository: [verified run](https://github.com/cristoferdiazalvarez/flowteam/actions/runs/43588765288). [Latest workflow results](https://github.com/cristoferdiazalvarez/flowteam/actions/workflows/ci.yml).
- Final screenshots are authentic captures from the public origin under `docs/screenshots/production`.

The deployment was made with the authenticated CLI to the explicit FlowTeam project. GitHub Actions runs on pushes independently of Vercel's GitHub App connection. If Vercel has not been granted access to this newly created repo, automatic Git-triggered deployments require connecting **only flowteam** in its Git settings; manual project-scoped deployment remains available. No account-wide Vercel token was added to GitHub Secrets, and no access was broadened to other repositories.
