# GrooveRoom — Deployment Guide (v2)

Deploy the **frontend on Vercel** and the **backend on Render**, running on two
separate origins.

```
[ Browser ] ──HTTPS──> [ Vercel (React/Vite SPA) ]
      │                         │  axios + socket.io
      └──────────HTTPS──────────┴──> [ Render (Express API + Socket.io) ] ──> MongoDB Atlas / Cloudinary / Clerk
```

---

## 0. What already changed in the codebase

These edits were made so the app works across two origins (you don't need to do
them — they're already in the repo):

| File | Change |
|------|--------|
| `backend/src/index.js` | CORS origin now reads `process.env.CLIENT_URL`; `PORT` has a fallback; removed the old "serve frontend dist" block (frontend now lives on Vercel); added a `/` health route. |
| `backend/src/lib/socket.js` | Socket.io CORS origin now reads `process.env.CLIENT_URL`. |
| `backend/package.json` | Added `engines.node >= 18`. |
| `frontend/src/lib/axios.ts` | API base URL now reads `VITE_API_URL` (falls back to `http://localhost:5000`). |
| `frontend/src/stores/useChatStore.ts` | Socket URL now reads `VITE_API_URL`. |
| `frontend/vercel.json` | SPA rewrite so client-side routes (e.g. `/admin`) don't 404 on refresh. |
| `backend/.env.example`, `frontend/.env.example` | Templates listing every required variable. |

---

## 1. Prerequisites

Create / have ready accounts for:

- **GitHub** — the repo must be pushed here (Render & Vercel deploy from Git).
- **MongoDB Atlas** — connection string (already in your `.env`).
- **Cloudinary** — cloud name + API key + secret (already in your `.env`).
- **Clerk** — publishable + secret key (already in your `.env`).
- **Render** — https://render.com (backend).
- **Vercel** — https://vercel.com (frontend).

> Deployment order matters because each side needs the other's URL. We deploy the
> **backend first**, then the **frontend**, then come back and give the backend
> the frontend's URL.

---

## 2. Push the project to GitHub

From the project root:

```bash
git add .
git commit -m "Prepare GrooveRoom for Vercel + Render deployment"
git push origin main
```

> `.env` files are git-ignored and will **not** be pushed — that's correct. You'll
> set the real secrets in the Render and Vercel dashboards instead.

---

## 3. Allow MongoDB Atlas access from Render

Render's outbound IPs are dynamic on the free tier, so:

1. Atlas → **Network Access** → **Add IP Address** → **Allow access from anywhere**
   (`0.0.0.0/0`) → Confirm.
2. Make sure your DB user / password in `MONGODB_URI` is correct.

---

## 4. Deploy the backend on Render

1. Render dashboard → **New** → **Web Service**.
2. Connect your GitHub repo and select it.
3. Configure:
   - **Name**: `groove-backend` (or anything).
   - **Root Directory**: `backend`
   - **Runtime / Language**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free is fine to start.
4. Add **Environment Variables** (Render → the service → *Environment*). Copy from
   your local `backend/.env`, but set `NODE_ENV=production`:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas connection string |
   | `CLOUDINARY_CLOUD_NAME` | … |
   | `CLOUDINARY_API_KEY` | … |
   | `CLOUDINARY_API_SECRET` | … |
   | `CLERK_PUBLISHABLE_KEY` | `pk_test_…` |
   | `CLERK_SECRET_KEY` | `sk_test_…` |
   | `ADMIN_EMAIL` | your admin email |
   | `CLIENT_URL` | `http://localhost:3000` *(temporary — updated in step 6)* |

   > Do **not** set `PORT` — Render injects it automatically and the code reads it.

5. Click **Create Web Service** and wait for the deploy to finish.
6. Copy the live URL, e.g. `https://groove-backend.onrender.com`. Open it in a
   browser — you should see `{"status":"ok","message":"GrooveRoom API is running"}`.

---

## 5. Deploy the frontend on Vercel

1. Vercel dashboard → **Add New…** → **Project** → import the same GitHub repo.
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
3. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_…` (same as backend's publishable key) |
   | `VITE_API_URL` | your Render backend URL, e.g. `https://groove-backend.onrender.com` — **no trailing slash, no `/api`** |

4. Click **Deploy**. When done, copy the live URL, e.g.
   `https://grooveroom.vercel.app`.

---

## 6. Connect the two (the important step)

The backend currently only allows `http://localhost:3000` via CORS. Point it at
your real Vercel URL:

1. Render → your backend service → **Environment** → edit `CLIENT_URL`:
   ```
   CLIENT_URL = https://grooveroom.vercel.app
   ```
   (use your actual Vercel domain, **no trailing slash**)
2. Save — Render redeploys automatically.

Now requests and socket connections from Vercel are allowed.

---

## 7. Configure Clerk for the live domains

In the **Clerk dashboard** for this application:

1. Add your Vercel URL (`https://grooveroom.vercel.app`) to the allowed
   origins / domains so OAuth sign-in works from production.
2. The OAuth redirect lands on `/sso-callback` then `/auth-callback` (already
   wired in the app) — no code change needed, just make sure the domain is
   whitelisted.

> The keys here are `pk_test`/`sk_test` (a Clerk **development** instance). That
> works for testing. For a real public launch, create a Clerk **Production**
> instance and swap the keys in both Render (`CLERK_*`) and Vercel
> (`VITE_CLERK_PUBLISHABLE_KEY`).

---

## 8. Seed the database (one time)

The seed scripts insert the demo songs/albums. Run them **locally**, pointed at
your Atlas database (the same `MONGODB_URI` you put on Render):

```bash
cd backend
# make sure backend/.env has the production MONGODB_URI
npm run seed:albums
npm run seed:songs
```

> The seeded `audioUrl`/`imageUrl` values are relative paths like `/songs/1.mp3`
> and `/cover-images/1.jpg`. Those files live in `frontend/public`, so they are
> served by **Vercel** and resolve against the frontend origin automatically — no
> extra hosting needed. (Songs uploaded later via the admin panel use Cloudinary.)

---

## 9. Verify

1. Open the Vercel URL.
2. Sign in with Clerk (Google).
3. Play a song — audio should load.
4. Open the browser **DevTools → Network**: API calls go to your Render URL and
   return 200; the socket.io connection upgrades to `websocket` (status 101).
5. Log in with the `ADMIN_EMAIL` account → the **Admin Dashboard** link appears →
   stat cards and add/delete song & album work.

---

## 10. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| **CORS error** in console | `CLIENT_URL` on Render doesn't exactly match the Vercel URL (check `https://`, no trailing slash). Redeploy backend after fixing. |
| **Network/API calls fail** | `VITE_API_URL` on Vercel wrong or has a trailing slash / `/api`. Fix and **redeploy** (Vite bakes env vars at build time). |
| **Sign-in popup blocked / fails** | Vercel domain not added in the Clerk dashboard. |
| **Songs/images 404** | Database wasn't seeded, or files missing from `frontend/public/songs`. Re-run seeds (step 8). |
| **Refreshing `/admin` shows 404** | `frontend/vercel.json` missing — it's included; make sure it's committed. |
| **`MongooseServerSelectionError`** | Atlas Network Access doesn't allow `0.0.0.0/0` (step 3), or bad `MONGODB_URI`. |
| **Socket not connecting** | `VITE_API_URL` (frontend) and `CLIENT_URL` (backend) must point at each other; check both. |
| **Render free instance slow first hit** | Free services sleep after inactivity; the first request wakes it (~30s cold start). Normal. |

---

## Quick env-var cheat sheet

**Render (backend):** `NODE_ENV`, `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, `ADMIN_EMAIL`, `CLIENT_URL` *(= Vercel URL)*

**Vercel (frontend):** `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL` *(= Render URL)*
