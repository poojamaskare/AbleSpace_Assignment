# Pyramid

A collaborative task board built from a Figma design. Multiple people work the
same board at once and see each other's changes live, including each other's
cursors.

**Stack:** Next.js 16 · React 19 · NestJS 11 · Prisma 7 · PostgreSQL · Socket.IO 4

| | |
| --- | --- |
| Live app | https://able-space-assignment-woad.vercel.app |
| Web | Vercel |
| API | Render |
| Database | Neon (PostgreSQL) |

---

## Table of contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Design decisions](#design-decisions)
- [Testing](#testing)
- [Known limits](#known-limits)
- [Deployment](#deployment)

---

## Features

**Authentication**
- Google sign-in via the OAuth popup code flow
- Guest login, no credentials required
- JWT shared by the REST API and the WebSocket connection
- Profile editing with selectable avatar presets

**Projects**
- Six-digit join codes for sharing a board
- Join by code, rotate a leaked code, leave a project
- Role-aware access: members read, editors write, guests are read-only on boards they did not create
- Starter workspace created automatically on first sign-in

**Board**
- Four default columns; create, rename, reorder and delete
- Cards show priority, due date, labels, assignees and subtask/comment counts
- Overdue dates highlighted
- Drag and drop for cards and for whole columns
- Optimistic updates with rollback on failure

**Views**
- Board and list views over the same data
- Fields menu to toggle visible columns, persisted across reloads
- Search plus priority and label filters, composable

**Task detail**
- Description, priority, start and due dates, assignees, labels
- Subtasks
- Threaded comments, one level of replies
- Activity feed

**Realtime**
- Live sync of task and column creates, updates, moves and deletes
- Presence avatars of everyone currently viewing the board
- Live collaborator cursors with pointer, avatar and name
- Dark and light themes

---

## Screenshots

> Add screenshots or a short demo clip here: the board with cards, the task
> detail screen, and two windows side by side showing live cursors.

---

## Tech stack

### Frontend

| Package | Purpose |
| --- | --- |
| Next.js 16.3 (App Router, Turbopack) | Framework and routing |
| React 19.2, TypeScript 5 | UI and types |
| Tailwind CSS 4 | Styling |
| shadcn/ui on Radix | Accessible primitives |
| dnd-kit (core, sortable) | Drag and drop |
| socket.io-client | Realtime transport |
| next-themes | Dark and light mode |
| lucide-react | Icons |
| date-fns, react-day-picker | Dates and date picker |
| sonner | Toasts |

### Backend

| Package | Purpose |
| --- | --- |
| NestJS 11 on Express | HTTP framework and DI |
| Prisma 7 with `@prisma/adapter-pg` | ORM and migrations |
| PostgreSQL | Database |
| Socket.IO 4 via `@nestjs/websockets` | Realtime gateway |
| `@nestjs/jwt` | Token signing and verification |
| class-validator, class-transformer | Request validation |

---

## Getting started

**Prerequisites:** Node 24 and a PostgreSQL database.

```bash
git clone https://github.com/poojamaskare/AbleSpace_Assignment.git
cd AbleSpace_Assignment
```

**1. API**

```bash
cd api
npm install
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
npx prisma migrate deploy
npx prisma generate
npm run start:dev             # http://localhost:4000/api
```

**2. Web**

```bash
cd web
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev                   # http://localhost:3000
```

Open http://localhost:3000 and choose **Continue as guest**. A starter
workspace is created on first sign-in, so there is no seed step.

Google sign-in is optional. Leave the Google variables empty and the button
renders disabled; every other feature, including realtime, works on guest
login alone.

**Trying the collaboration features**

1. Open the app in two browser windows.
2. Sign in as two different accounts.
3. Copy the six-digit code from the Projects page in the first window.
4. Join with that code in the second, then select the project.

Both windows must point at the same API instance. Realtime is per-instance, so
a local tab and a deployed tab share a database but not a socket server. Note
that guests can view a board they joined but not edit it, so drive the edits
from the account that created the board.

---

## Environment variables

Both files are gitignored. Copy the `.env.example` in each package and fill in
your own values. In production these are set in the Render and Vercel
dashboards rather than committed.

### `api/.env`

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. On Neon, use the pooled string. |
| `JWT_SECRET` | Yes | Any long random string. Signs tokens for REST and WebSocket alike. |
| `PORT` | No | Defaults to `4000`. |
| `CORS_ORIGIN` | No | Defaults to `http://localhost:3000`. Set to the deployed web URL in production. |
| `GOOGLE_CLIENT_ID` | No | OAuth 2.0 Web application client. Omit to disable Google sign-in. |
| `GOOGLE_CLIENT_SECRET` | No | Required alongside the client id. |

### `web/.env.local`

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | API origin, no trailing slash. Configures REST and the WebSocket together. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | The same client id as the API. |

To generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Scripts

**api**

| Command | Does |
| --- | --- |
| `npm run start:dev` | Development server with watch |
| `npm run build` | Compile to `dist` |
| `npm run start:prod` | Run the compiled server |
| `npm test` | Jest |
| `npm run lint` | ESLint |

**web**

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | `node:test` |
| `npm run lint` | ESLint |

---

## Project structure

```
api/
  prisma/
    schema.prisma            Data model
    migrations/              Three migrations
  src/
    auth/                    Google and guest login, profile, avatars
      starter-workspace.ts   Creates a project with its columns and code
    projects/
      membership.ts          assertMember / assertCanEdit access rules
      join-code.ts           Six-digit codes with collision retry
    tasks/
      position.ts            Sparse ordering maths
    columns/                 Column CRUD, last-column guard
    labels/  comments/       Project-scoped labels, threaded comments
    realtime/
      realtime.gateway.ts    Socket auth, rooms, presence, cursors
      realtime.service.ts    Broadcast helper used by feature services

web/
  src/
    app/(auth)/              Login
    app/(app)/               Tasks, projects, settings, task detail
    components/board/        Board, list, cards, columns, filters
    components/task/         Detail screen pickers
    hooks/
      use-realtime-board.ts  Applies other people's changes
      use-presence.ts        Who is on this board
      use-cursors.ts         Pointer relay and throttling
    lib/
      board.ts               Move and filter logic
      view.ts                View preferences and coercion
      api.ts                 Fetch wrapper, attaches JWT and socket id
      socket.ts              One shared socket per tab

render.yaml                  API service definition
DEPLOY.md                    Deployment guide
```

---

## Architecture

```
Browser (Next.js)
  |
  |-- REST over HTTPS -----------> NestJS API ------> PostgreSQL
  |     Authorization: Bearer JWT      |
  |     X-Socket-Id: <this tab>        |
  |                                    |
  '-- WebSocket (Socket.IO) ---------->'
        auth: { token: JWT }
```

One origin serves both REST and the WebSocket, so a single
`NEXT_PUBLIC_API_URL` configures both.

**How a change propagates.** The browser applies the change locally, then sends
the request with an `X-Socket-Id` header identifying the tab. The service
writes to the database and announces the change to the project's room,
excluding the originating socket. Every other tab merges the event into its
board state.

The originator is excluded deliberately: it already applied the change
optimistically, so echoing it back would duplicate the card or fight in-flight
local state. Because exclusion happens at the source, every event a client
receives is by construction somebody else's, which keeps the handlers simple
enough to be idempotent on reconnect.

**Authorization.** Every project-scoped operation routes through one of two
guards in `api/src/projects/membership.ts`: `assertMember` for reads,
`assertCanEdit` for writes. Tasks, columns, labels, comments and the realtime
room join all call one of them, and each resolves in a single indexed lookup.

---

## Data model

```
User ----< ProjectMember >---- Project
 |                               |
 |                               |-- Column ----< Task
 |                               |                 |
 |                               '-- Label >------'|
 |                                                 |
 '--< Comment, Activity, assignments >-------------'
```

| Model | Notes |
| --- | --- |
| `User` | Google or guest, distinguished by `isGuest`. Email is the identity key. |
| `Project` | Owns a unique six-digit `code`. `leadId` is the creator. |
| `ProjectMember` | Compound primary key `(projectId, userId)`. The lead is a member too, so no check needs "lead OR member". |
| `Column` | A table, not an enum, so columns reorder and rename per project. |
| `Task` | Self-referencing `parentId` gives subtasks. `position` is a float for sparse ordering. |
| `Label` | Unique per project, not globally. |
| `Comment` | One level of threading via `parentId`. |
| `Activity` | Feeds the Updates list on the task detail screen. |

---

## Design decisions

| Decision | Instead of | Why |
| --- | --- | --- |
| Sparse float positions, midpoint on insert | Contiguous integers, renumbered per move | Renumbering rewrites every row below the insert, turning one drag into many writes and many realtime events. The midpoint costs one write at any column size. |
| A `ProjectMember` table | `project.leadId === userId` per service | The ownership check was duplicated across six services and locked teammates out once boards became shareable. Centralising fixed every path at once. |
| Guests read-only on boards they joined | Full write access | A guest identity is anonymous and vanishes with the browser, so its edits cannot be attributed or undone. Guests keep full control of workspaces they lead. |
| Server-side Google code exchange | Verifying an id token with `google-auth-library` | The token arrives on the response to a secret-authenticated request over TLS, so there is no third party to forge it. A client-supplied token would need verification. |
| Identical error for wrong and dead join codes | Distinct messages | Six digits is a million codes. A distinct reply would let an enumerator tell live boards from dead ones. Attempts are also rate limited. |
| Cursor positions in board-content coordinates | Viewport coordinates | Viewport coordinates break when two windows differ in width or scroll, putting a pointer over the wrong card. Content coordinates also let the browser move cursors on scroll for free. |
| Cursor identity stamped server-side | Trusting the payload | Clients send only coordinates. Otherwise any member could paint a teammate's face on the board and drive it around. |
| No server-side cursor state | Storing positions | A cursor matters only at the instant it arrives, so a dropped packet costs one frame instead of stale state. Disconnects emit an explicit removal. |
| One packet per animation frame | Emitting on every `pointermove` | Pointer events fire far faster than a screen refreshes, and the newest position makes older ones irrelevant. |
| Optimistic updates with rollback | Waiting on the server | The board reflects the action immediately and restores the previous state if the request fails, so the UI never shows something that did not persist. |
| Self-referencing `parentId` for subtasks | A separate table | A subtask has the same fields as a task. A second table would duplicate every column and endpoint. The board filters on `parentId: null`. |
| Labels unique per project | Globally unique names | A global constraint means the first team to create "Bug" blocks everyone else from having one. |

---

## Testing

```bash
cd api && npm test     # Jest
cd web && npm test     # node:test
```

Coverage is aimed at logic where a mistake is invisible in the UI: task and
column move maths, including the off-by-one that makes a downward drag land one
slot short; the filter shared by both views; view preference parsing against
stale and corrupt localStorage; presence de-duplication; and theme resolution.

---

## Known limits

Each is marked in the code alongside its upgrade path.

| Limit | Why it is acceptable | Upgrade path |
| --- | --- | --- |
| Join-code rate limiting is in memory | Resets on deploy, per-instance; fine for one instance | Move the counter to Redis before scaling out |
| Positions can converge past float precision | Needs roughly fifty inserts into one exact gap | A rebalance pass on the column |
| Live cursors are board view only | List rows are not pointed at the way cards are | Same hook, different geometry |
| Cursor alignment drifts phone to desktop | Columns are fixed width above the small breakpoint, so desktop pairs align | Normalise x by content width |
| Migrations are applied by hand | Through Neon's pooler the Prisma advisory lock hangs | Move into the start command if deploys outpace it |
| Avatar preset list exists in both packages | Eight strings; a shared package costs more than it saves | Extract if the list grows |

---

## Deployment

Web on Vercel, API on Render, PostgreSQL on Neon. `render.yaml` at the repo root
defines the API service. Full instructions, including the Vercel settings that
fail silently and the Google OAuth setup, are in [DEPLOY.md](DEPLOY.md).

Two notes when testing a deployment:

- Render's free tier sleeps after fifteen minutes idle; the first request then
  takes around fifty seconds. The socket reconnects on its own once awake.
- Realtime is per-instance. Two browsers on the deployed site sync live; a local
  tab and a deployed tab share the database but not a socket server.
