# Deploy

Web → Vercel, API → Render, Postgres → Neon.

## 1. Neon

Create a project, copy the **pooled** connection string (`...-pooler...`).

Apply migrations from your machine, once per schema change — Render does not
run them:

```bash
cd api && npx prisma migrate deploy   # DATABASE_URL from api/.env
```

They are deliberately not in the start command: through the pooler the
advisory lock hangs forever and the service never binds a port, and Neon's
direct host is unreachable from Render.

## 2. API on Render

New → Blueprint → point at this repo. `render.yaml` does the rest.
Set the two `sync: false` vars when prompted:

| Var           | Value                                             |
| ------------- | ------------------------------------------------- |
| `DATABASE_URL`| Neon pooled string                                 |
| `CORS_ORIGIN` | `https://<your-app>.vercel.app` (fill in after 3) |

`JWT_SECRET` is generated for you. Migrations apply on every start.

Check: `curl https://<api>.onrender.com/api/health` → `{"status":"ok",...}`

## 3. Web on Vercel

New Project → same repo → **Root Directory: `web`**. Framework auto-detects Next.js.

Env var: `NEXT_PUBLIC_API_URL = https://<api>.onrender.com` (no trailing slash).

Two settings that fail silently — the deploy reports Ready and every path
returns a plain-text `NOT_FOUND`:

- **Framework Preset must be Next.js, not Other.** With Other, Vercel runs the
  build and then serves the folder as static files, so no route resolves. If
  Build and Deployment shows a "Production Overrides" banner, the live
  deployment was built with the wrong preset — push a new commit, redeploying
  can carry the old config over.
- **Deployment Protection** is on by default and walls the site behind a Vercel
  login. Settings → Deployment Protection → Vercel Authentication → Disabled.

Don't rename the project or hand-edit the generated `.vercel.app` domain — both
detach the domain from its deployment and leave a dead alias.

## 4. Close the loop

Put the real Vercel URL into `CORS_ORIGIN` on Render and redeploy. Preview
deployments get their own URLs and will fail CORS — set `CORS_ORIGIN` to the
preview URL too, or just test against production.

## Notes

- Render free tier sleeps after 15 min idle; first request takes ~50s. The
  socket reconnects on its own once the instance is awake.
- Both `NEXT_PUBLIC_API_URL` and the websocket use the same origin — one var.
- No seed step: a starter workspace is created on first signup.
