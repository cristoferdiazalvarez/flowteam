# FlowTeam implementation plan

- [x] Inspect host; isolate Next.js and real PostgreSQL in the existing FlowTeam directory.
- [x] Model authentication, tenant membership and project/task collaboration with Prisma migration and seed.
- [x] Complete vertical slices: guest demo/auth/onboarding, projects, board/list/calendar, task details, inbox and team settings.
- [x] Add server authorization, version conflicts, transactional ordering, private local uploads and foreground polling.
- [x] Execute unit, PostgreSQL integration and desktop/tablet/mobile browser tests; correct observed failures and capture real screenshots.
- [x] Document architecture, API, data model, security, test scope, interview case study and publication prerequisites.
- [x] Verify the one-command local launcher, data preservation and controlled shutdown.
- [x] Owner-authorized public GitHub repo, push, successful remote CI and independent Vercel Hobby/Neon Free HTTPS deployment.
- [x] Bounded durable private PostgreSQL file adapter, verified locally and on public HTTPS.
- [ ] Optional email recovery/delivery, presence, large object storage and physical-device/Safari coverage.
