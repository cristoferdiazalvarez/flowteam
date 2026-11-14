# Security design and boundaries

## Implemented

- Better Auth with maintained password hashing (library-managed scrypt), database sessions, expiry, signed session cookie and logout invalidation. Cookies are HttpOnly, SameSite and secure on HTTPS through the library. Development intentionally uses loopback HTTP.
- Server-side membership checks on snapshots and every command, tenant-qualified resource lookups, and explicit OWNER/ADMIN management permissions. Storage reads independently check membership.
- Origin checks on business/file mutations, trusted origins for authentication, Zod input validation, bounded string/list sizes, color/icon enums, parameterized Prisma/SQL queries.
- Safe Markdown descriptions: ReactMarkdown does not render raw HTML and filters unsafe links by default. Comments render as escaped React text. No `dangerouslySetInnerHTML`.
- Random invite tokens stored as hashes, single-use transactional claim, expiration and revocation. Task links are references; they never bypass membership.
- Database-backed limits for auth, mutations, bootstrap and uploads. No in-memory-only throttle that silently resets across serverless instances.
- Optimistic task versions prevent lost edits. Row locks and transactions maintain ordering. Comment UUID keys make completed request retries safe.
- Private file paths, signature validation, restricted formats/size, nonpublic storage, authenticated octet-stream downloads and compensating deletion if metadata persistence fails.
- `.env` ignored, generated random development credentials, `.env.example` placeholders; local data/files ignored. Security headers: frame deny, nosniff and strict-origin referrer policy.

## Honest limitations

This is a working portfolio application, not a claim of independent security certification. Email verification/recovery, MFA, granular private projects, malware scanning, audit-log immutability, account deletion and enterprise compliance workflows are not implemented. Demo users have private workspaces and generated credentials; their sessions expire after 7 days. Clear cookies to start a fresh demo. Demo workspace creation is not the same as a globally shared demo database.

The local filesystem adapter’s metadata quota check is not a strict cross-request storage reservation; the hosted database adapter serializes quota reservations with a PostgreSQL advisory transaction lock; simultaneous local-filesystem uploads can overshoot its 5 MiB metadata quota. The hosted database reservations are atomic and do not have that race. File data is read into memory after size checks; a hosting proxy must cap incoming requests. No public upload URLs or inline HTML/SVG serving are provided. Removing a task/project deletes attachment metadata; use dry-run maintenance and explicit apply to reclaim orphaned disk files. Vercel uses a private PostgreSQL blob adapter with atomic reservations and 1 MiB/file, 5 MiB/workspace and 100 MiB global binary-data limits. No separate storage service or billing resource is required.

Read snapshots are currently unpaginated and not independently rate limited, so public launch needs hosting-level abuse protection and request budgets. Authentication throttling uses the framework's request context and deployment proxy configuration should be reviewed. This is not a promise of unlimited free public traffic. The free demo action creates a persisted guest account internally without asking visitors to register.

Non-task administrative edits use last-write-wins. Membership authorization is checked before each operation, but an admin revoke concurrent with a previously authorized in-flight request does not retroactively cancel it. Checklists support small completion updates rather than collaborative rich text. Presence is not inferred from polling.

## Retention

`npm run maintenance` reports eligible data only. `npm run maintenance -- --apply` removes demo workspaces older than 14 days **only if every member is a demo.invalid account with no live session**, then unreferenced guest users, old counters, old expired sessions/verifications and orphan UUID files. Real workspaces and demo spaces joined by real accounts are excluded. Review output before apply; schedule only after publication approval. Orphans created by that same run are collected on the next run. Database blobs cascade with a workspace; unreferenced database blobs older than 14 days are also eligible for cleanup. Existing auth rate-limit counters still require a future bounded retention rule.

## Dependency policy

Commit the lockfile, run `npm ci`, audit and CI before publishing. Prisma 7.10.1 replaces the initially attempted Prisma 6 toolchain due to the deepmerge-ts advisory. A scoped override pins the lint parser's minimatch to a patched 11.x release; lint/type/build verification covers that tool compatibility. Embedded PostgreSQL is a beta development convenience; production uses independently hosted PostgreSQL. Never deploy the embedded process as a Vercel function.
