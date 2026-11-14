# Publication plan — no deployment performed

This repository has no configured remote and no cloud resources were created. Publication, account/project creation, push and external resource provisioning require the owner's explicit authorization. Do not add payment details, upgrade plans, enable paid add-ons, or accept an automatic paid trial.

## Proposed free portfolio setup

Next.js on Vercel Hobby + PostgreSQL on Neon Free is technically compatible with the current HTTP transport and Prisma's PostgreSQL adapter. It is intended for a small portfolio demo, not an unlimited production service. Neither service is needed to run locally.

Official documentation checked on **2026-11-14**:

- [Vercel Hobby](https://vercel.com/docs/plans/hobby): published allowances include 1 million function invocations/month, 4 active CPU-hours, 360 GB-hours provisioned memory, 100 GB fast transfer and a 300-second function duration limit. Features generally pause when a free limit is exhausted. Recheck the current account terms and limits before creating anything.
- [Neon pricing](https://neon.com/pricing): Free currently lists 100 CU-hours/month/project, 1 GB PostgreSQL storage/project and 5 GB network transfer/month; free usage can suspend when limits are reached. No credit card is required. Keep the account on Free. The app does not use Neon's optional managed auth, object storage or AI services.
- [Vercel WebSockets announcement](https://vercel.com/changelog/websocket-support-is-now-generally-available), dated 2026-10-20, now documents native support. Older “no WebSocket server” guidance is outdated. This implementation still deliberately uses polling: it requires no persistent connection, connection affinity, fan-out service or assumptions about function lifetime. WebSocket compute follows function limits/pricing; availability alone does not provide a shared broadcast bus across instances.

At a 3-second interval, one foreground tab produces about **1,200 snapshot requests/hour**, plus authentication traffic and user actions. Continuous polling can keep a free database awake, consuming compute; many visitors can exhaust transfer and function allowances. Full snapshots grow with workspace size. Before public promotion, add pagination/event cursors, backoff while idle, hosting abuse controls and a retention schedule. A free alternative needing no service account is the local setup already supplied. A self-hosted always-on server could add PostgreSQL LISTEN/NOTIFY and SSE later, but that is a different hosting model and has not been implemented or tested here.

## Approval-ready steps

After explicit publication authorization:

1. Agree on public GitHub repo name/visibility and which screenshots to include. Review the committed source and ignored `.env`, `.data`, `.storage`, browser traces and node_modules.
2. Create a Neon **Free** PostgreSQL project without card/billing upgrades, near the chosen function region. Set a pooled runtime `DATABASE_URL`; use the provider's migration connection as appropriate for release-time `prisma migrate deploy`. Do not run development migrations against production.
3. Create a Vercel **Hobby** project. Framework: Next.js; Node 24; build: `npm run build`; no static output override. Add `DATABASE_URL`, a fresh random `BETTER_AUTH_SECRET` (32+ bytes) and `BETTER_AUTH_URL=https://<approved-domain>` to private environment settings. Do not reuse local secrets.
4. Run `prisma migrate deploy` once as a controlled release step. Run the idempotent showcase seed only if wanted; visitor demos create their own isolated data. Never run embedded PostgreSQL in the deployment.
5. Keep attachments visibly unavailable on Vercel until a durable private storage adapter is authorized and implemented. The existing handler detects Vercel and returns a clear 503 rather than pretending ephemeral files persist. A specific free private storage provider has not been connected or validated.
6. Enable the workflow after the owner pushes to GitHub. GitHub Actions is prepared locally but has **not** run remotely. Local tests ran on macOS/Node 26; CI uses Linux/Node 24 and PostgreSQL 18.
7. Deploy HTTPS, verify cookie flags, tenant isolation, invitation origin, two sessions, mobile flows, conflict behavior and quota/retention settings on the actual deployment. Capture new hosted evidence. Review trusted proxy/IP behavior for auth throttling.
8. Only then add the approved URL to the portfolio and LinkedIn material. No live URL is invented in this repository.

## Local alternative

`npm run local` starts only the isolated database and local development app, applies checked-in migrations, preserves existing data and runs the idempotent showcase seed. Ctrl+C stops its own children. If another FlowTeam database already occupies port 55437, stop that process first or run `npm run dev` against it. Do not kill unrelated applications to reclaim a port.

## Operational prerequisites still outstanding

Durable private cloud attachments, verified email/password recovery, real deployment validation, production request budgets and a scheduled maintenance policy are not complete. Presence is optional and is not represented as implemented. The app can be reviewed and used entirely locally without any of these services.
