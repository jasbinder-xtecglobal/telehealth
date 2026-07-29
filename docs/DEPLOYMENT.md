# Deployment — Render (API) + Vercel (web)

Both platforms build from GitHub. The branch is `first-upload`.

---

## The ordering problem

Each side needs the other's URL, so it takes two passes:

```
1. Deploy API to Render        → get https://xxx.onrender.com
2. Put that URL in vercel.json → commit and push
3. Deploy web to Vercel        → get https://yyy.vercel.app
4. Set WEB_ORIGIN on Render    → redeploy API
```

Nothing works fully until step 4. That is expected.

---

## Why the API is proxied through the web domain

The web app calls `/trpc` on **its own** domain, and Vercel forwards that to
Render. This is not decoration:

The session lives in an httpOnly cookie. `vercel.app` and `onrender.com` are
different sites, so a `SameSite=Lax` cookie is never sent between them — login
would appear to succeed and every following request would come back
unauthenticated. Proxying keeps the cookie first-party.

The alternative — calling Render directly with `SameSite=None` — works in
Chrome today but is blocked by Safari's tracking prevention and is being phased
out in Chrome. It is supported (`COOKIE_SAMESITE=none`) but not recommended:
a demo that silently fails on someone's iPhone is worse than no demo.

---

## 1. Render — the API

**New Web Service** → connect the repo → branch `first-upload`.

| Field | Value |
|---|---|
| Root Directory | *(leave blank)* |
| Build Command | `pnpm install --frozen-lockfile` |
| Start Command | `node --experimental-transform-types apps/api/src/index.ts` |
| Health Check Path | `/health` |
| Instance Type | **Starter ($7)** — see note below |

**Root Directory must stay blank.** Render resolves the start command relative
to it, so anything set here is prepended. Setting it to `apps/web` produces:

```
Error: Cannot find module '/opt/render/project/src/apps/web/apps/api/src/index.ts'
```

If you would rather set it, use `apps/api` and drop the prefix from the start
command (`node --experimental-transform-types src/index.ts`). The cost is that
Render then only auto-deploys on changes inside that directory.

**There is no build step.** The API runs TypeScript directly via Node's type
transformation, so `pnpm run build` is wrong here — it would try to build the
web app too.

**Instance type.** The Free tier spins down after 15 minutes idle and takes
roughly 50 seconds to wake. For a stakeholder demo that reads as "broken".
Starter stays warm.

### Environment variables

| Key | Value |
|---|---|
| `DATABASE_URL` | your Neon **pooled** connection string |
| `NODE_ENV` | `production` |
| `COOKIE_SAMESITE` | `lax` |
| `WEB_ORIGIN` | set after step 3 — `https://your-app.vercel.app` |

Do **not** set `PORT`. Render injects it; the app reads it automatically.

Deploy. The log should end with:

```
api listening on port 10000 (production)
```

Confirm: `https://your-api.onrender.com/health` returns `{"ok":true,...}`.

---

## 2. Point the proxy at Render

Edit [apps/web/vercel.json](../apps/web/vercel.json) and replace the
placeholder host with your Render URL:

```json
{ "source": "/trpc/:path*", "destination": "https://your-api.onrender.com/trpc/:path*" }
```

Commit and push.

---

## 3. Vercel — the web app

**Add New → Project** → same repo → branch `first-upload`.

| Field | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `apps/web` |
| Build Command | *(default)* |
| Output Directory | `dist` |

**Turn on "Include files outside of the Root Directory"** in the Root Directory
settings. Without it Vercel cannot see `pnpm-workspace.yaml` or the API's types,
and the build fails.

### Environment variable

| Key | Value |
|---|---|
| `VITE_API_URL` | `/trpc` |

The leading slash is the whole point — it keeps the call same-origin so the
cookie is sent.

Deploy.

---

## 4. Close the loop

On Render, set `WEB_ORIGIN` to your Vercel URL and redeploy.

---

## Verify

1. Open the Vercel URL — you should land on **Sign in**
2. Sign in as `david.szekely@example.test` / `Nightshift2026Rounds`
3. The waiting room should show patients
4. Reload the page — if you stay signed in, the cookie is working
5. Open the **Home Visits** tab — the map should draw a route

If step 4 sends you back to sign-in, the cookie is not surviving. Check that
`VITE_API_URL` is `/trpc` and that the `vercel.json` rewrite names the right
Render host.

---

## Things to know

**The database is shared with local development.** Both environments point at
the same Neon project, so seeding locally wipes the deployed demo. Create a
second Neon branch or project before showing anyone.

**Server-sent events may buffer through the Vercel proxy.** The live queue also
polls every five seconds, so the UI stays current either way — but pushes may
arrive late. Append `?nosub=1` to disable subscriptions if it misbehaves.

**Sessions live in Postgres**, so a Render restart does not sign anyone out.

**Delete the dev mailbox before this is anything but a demo.**
`auth.devMailbox` exposes recipient email addresses without authentication —
it exists so verification links can be followed without a mail server.
