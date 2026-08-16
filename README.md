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
- [Testing](#testing)
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

<img width="2842" height="1495" alt="image" src="https://github.com/user-attachments/assets/3f08141d-e347-44c8-9850-b29fcfa60aed" />
<img width="2864" height="1319" alt="image" src="https://github.com/user-attachments/assets/66c95db9-3d2b-4c56-97da-004665fba058" />
<img width="2343" height="1475" alt="image" src="https://github.com/user-attachments/assets/c22aa377-9acb-4e3e-bd2b-63d800f50270" />



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


## Deployment

Web on Vercel, API on Render, PostgreSQL on Neon. `render.yaml` at the repo root
defines the API service. Full instructions, including the Vercel settings that
fail silently and the Google OAuth setup, are in [DEPLOY.md](DEPLOY.md).

Two notes when testing a deployment:

- Render's free tier sleeps after fifteen minutes idle; the first request then
  takes around fifty seconds. The socket reconnects on its own once awake.
- Realtime is per-instance. Two browsers on the deployed site sync live; a local
  tab and a deployed tab share the database but not a socket server.
