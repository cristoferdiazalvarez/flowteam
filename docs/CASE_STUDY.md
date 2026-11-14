# FlowTeam — designing for momentum and trust

## Problem

Teams often scatter context across project lists, chat and personal notes. A portfolio project should show more than polished screens: persistent data, authorization boundaries and collaboration must withstand real concurrent users.

FlowTeam brings the overview, board, task conversation and team settings into a focused interface. Its visual identity uses an original folded-flow SVG mark, soft violet accents, warm status colors, restrained surfaces and generous spacing. Both themes and mobile navigation share the same tokens.

## Product decisions

**A demo worth touching.** Every visitor gets a new authenticated guest identity and private fictional workspace. A visitor can edit, move and delete tasks without damaging someone else's demonstration. Progress and workload are computed from those persisted rows. Fictional people and starting content are explicitly marked as demo data.

**A calm overview.** The first screen answers: what is moving, what needs attention and what should I do next? Project progress, unfinished personal tasks, recent activity and workload connect to actionable detail views. Empty workspaces show genuine zeros and purposeful empty states.

**An escape route from drag.** Pointer and keyboard board movement are supported, while the edit form's status selector remains a clear alternative on touch devices and for assistive technology. Board, list and calendar all read the same task records.

## Engineering decisions

**PostgreSQL locally without Docker.** The Mac had neither Docker nor PostgreSQL. An embedded binary package starts a real PostgreSQL cluster in the project directory on a dedicated loopback port. There is no change to system services or other portfolio projects. This is a development convenience, not a production database recommendation.

**Sessions through a maintained library.** Better Auth handles password crypto, authentication and cookie lifecycle. Application authorization remains explicit in server commands: tenant membership is separate from management roles, and every referenced resource is scoped to the selected tenant.

**Collaboration with a bounded cost model.** Three-second foreground polling works through short HTTP requests on conventional or serverless hosting. It trades instant delivery for operational simplicity. The documentation quantifies request volume and free database compute limitations. No connection-local cache is treated as shared server state.

**Concurrent edits should be visible.** A task's conditional version update makes one of two conflicting edits fail with 409 instead of losing a teammate's work silently. Project row locks serialize board ordering, and the client rolls optimistic changes back if a write fails. Comments carry request keys so a completed request can be retried safely.

**Storage is part of security.** Attachments stay outside public assets. Both uploads and downloads check membership, file sizes and allowed content types. The hosted adapter stores small private files in PostgreSQL under atomic quotas; this avoids a separate storage provider for a zero-budget demo. The explicit tradeoff is consuming database space/transfer, so large files are excluded. Ephemeral function disk is never presented as durable storage.

## Challenges found through execution

The initial dependency audit found toolchain advisories. Prisma was upgraded to a patched stable major and a scoped minimatch override removed the lint parser advisory; generation, schema compatibility, lint and build were rerun.

Browser execution exposed a controlled-checkbox timing problem and a mobile sidebar overflow issue. The checklist now updates locally before the persistence response and rolls back on failure. The sidebar scrolls within the viewport. Tests also honor the real authentication throttle rather than disabling it to pass rapid guest account creation.

The pointer test is intended to exercise actual dnd-kit sensor movement and verify persisted status after reload; two-session tests observe new task and comment data through polling. See the final [verification record](TESTING.md) for actual results and scope instead of treating this narrative as a test report.

## Interview talking points

- Why a valid resource ID never substitutes for tenant authorization.
- How a conditional update differs from last-write-wins, and why rich text would need a different conflict model.
- Why transactionally correct ordering also needs optimistic rollback in the interface.
- Why a serverless-compatible transport still consumes database compute and request quotas.
- Why guest demo isolation is a data-model decision rather than just a reset button.
- Why local file persistence cannot be carried unchanged into ephemeral hosting.

## Honest scope

Implemented scope is documented in README and the API contract. Email verification/recovery, presence, true nested subtasks, pagination and larger object storage remain future work. No live deployment or remote CI execution is claimed. This project demonstrates a coherent application and the ability to identify its operating boundaries.
