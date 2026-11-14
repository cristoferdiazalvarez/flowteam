# API contract

All business endpoints require a valid Better Auth session cookie. Failed authentication returns 401; tenant-qualified lookups use 404 for inaccessible data, management checks use 403, validation 400, stale versions/unique conflicts 409, expired invitations 410 and request throttling 429. Error payloads are `{ "error": "human readable message" }`. Raw database errors are logged on the server, never returned to clients. A no-store response prevents caching tenant snapshots.

## Authentication

Better Auth handles `/api/auth/*`. The UI uses its typed client for `signUp.email`, `signIn.email`, `useSession`, and `signOut`. The local app origin is `http://127.0.0.1:3000`; use that exact origin, not `localhost`, to keep cookie and trusted-origin behavior consistent.

## GET /api/data?workspace=<workspaceId>

Returns `{ user, workspaces, workspace, notifications }`. A new account has a null workspace until onboarding. Snapshots contain projects, ordered columns/tasks, assignments, label joins, checklists, attachments metadata, comments, recent activity (40), teams, membership and invitation status. Account/password/session secrets and invite token hashes are excluded. Inbox results are limited to the current user (30 latest).

## POST /api/data

JSON commands use `{ action, workspaceId, ...fields }`. `Origin` must match `BETTER_AUTH_URL`. The server obtains `userId` from the session, never the body. Maximum 80 business mutations/minute/user. Defaults and lengths are defined in `lib/validation.ts`.

| Action            | Fields beyond workspaceId                                                         | Permission                            |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| bootstrap         | name, demo (boolean); no workspaceId                                              | Authenticated; max 5/day/user         |
| acceptInvite      | token; no workspaceId                                                             | Authenticated token holder            |
| createProject     | name, description, color, icon, status, startDate, dueDate, memberIds             | OWNER/ADMIN                           |
| editProject       | id + same project fields                                                          | OWNER/ADMIN                           |
| archiveProject    | id, archived                                                                      | OWNER/ADMIN                           |
| deleteProject     | id                                                                                | OWNER/ADMIN                           |
| createColumn      | projectId, name                                                                   | OWNER/ADMIN                           |
| editColumn        | id, projectId, name, done                                                         | OWNER/ADMIN                           |
| createTask        | projectId, columnId, title, description, priority, dueDate, assigneeIds, labelIds | Any member                            |
| editTask          | id, version + same task fields except projectId                                   | Any member                            |
| moveTask          | id, version, columnId, optional beforeId                                          | Any member                            |
| deleteTask        | id, version                                                                       | Any member                            |
| comment           | taskId, body, requestId (UUID idempotency key)                                    | Any member                            |
| subtask           | taskId, title; or taskId, id, done                                                | Any member                            |
| label             | projectId, name, color (#RRGGBB)                                                  | OWNER/ADMIN                           |
| invite            | role (ADMIN/MEMBER)                                                               | OWNER/ADMIN; returns one-time raw URL |
| revokeInvite      | id                                                                                | OWNER/ADMIN                           |
| role              | membership id, role (ADMIN/MEMBER)                                                | OWNER; cannot change OWNER            |
| workspace         | name                                                                              | OWNER/ADMIN                           |
| team              | optional id, name, memberIds (membership IDs)                                     | OWNER/ADMIN                           |
| readNotifications | no extra fields                                                                   | Only current user's inbox             |

Dates use ISO 8601 strings or null. Priority is Low/Medium/High/Urgent; project status is Planning/In progress/On hold/Completed. Sending a different project column or a nonmember assignee is rejected. Icons are a bounded built-in set. Mutations must send their full editable task/project fields: omitted optional lists default to empty and descriptions default to empty.

Example task move:

```json
{
  "action": "moveTask",
  "workspaceId": "workspace-id",
  "id": "task-id",
  "version": 3,
  "columnId": "target-column",
  "beforeId": "neighbor-task"
}
```

A 409 response requires refetching and a new user decision. Mutation retries are disabled by default. Reusing a successful comment's requestId is safe; non-idempotent create commands require checking refreshed state after an ambiguous response.

## Files

`POST /api/files/upload` accepts multipart `file`, `workspaceId`, `taskId`. Only authenticated members of the task workspace may upload. Limit: 1 MiB/file, 5 MiB/workspace, 20 uploads/hour/user. Extension and content signatures are validated for PDF, TXT, PNG, JPEG and WebP. Files are stored using opaque UUID names outside `public/`.

`GET /api/files/<attachmentId>` rechecks session and workspace membership on every download, returns octet-stream with attachment disposition, nosniff and private/no-store. Inaccessible attachments return 404; anonymous requests return 401. On Vercel bytes are stored in private PostgreSQL blobs with atomic workspace/global quota checks and a global 100 MiB binary-data ceiling. No public object URLs or ephemeral-disk persistence are used. A reverse proxy should enforce the upload body limit as well when self-hosting publicly.
