# Deploy Compra Layout Agent (Vercel + Render)

## Overview

| Service | Hosts | Folder |
|---------|--------|--------|
| **Vercel** | React frontend | `client/` |
| **Render** | Express API | `server/` |

---

## Step 1 — Push code to GitHub

Repo: https://github.com/hr001784/compara.git

```powershell
cd c:\Users\Admin\.cursor\aiproject
git add .
git status
git commit -m "Add layout agent app with Vercel and Render config"
git push -u origin main
```

---

## Step 2 — Deploy API on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in.
2. **New +** → **Blueprint** (or **Web Service**).
3. Connect GitHub repo `hr001784/compara`.
4. If using Blueprint, select `render.yaml` in the repo root.
5. If manual setup:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Health Check Path:** `/api/health`
6. **Environment variables** (Environment tab):

| Key | Value |
|-----|--------|
| `ANTHROPIC_API_KEY` | Your key from [console.anthropic.com](https://console.anthropic.com/) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` (optional) |
| `CLIENT_URL` | Leave empty for now; add Vercel URL after Step 3 |

7. Click **Deploy**. Wait until status is **Live**.
8. Your API URL: **https://compara.onrender.com**

Test: [https://compara.onrender.com/api/health](https://compara.onrender.com/api/health) — should show `{"ok":true,"llmConfigured":true}`

---

## Step 3 — Deploy frontend on Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New…** → **Project** → import `hr001784/compara`.
3. **Important settings:**
   - **Root Directory:** `client` (click Edit)
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables:**

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://compara.onrender.com/api` |

Must end with `/api` — this is your live Render backend.

5. Click **Deploy**.
6. Copy your Vercel URL, e.g. `https://compara.vercel.app`

---

## Step 4 — Link frontend and backend (CORS)

The API auto-allows all `*.vercel.app` domains. You should still set `CLIENT_URL` on Render for custom domains.

1. In **Render** → **compara** service → **Environment**.
2. Set `CLIENT_URL` to your **exact** Vercel URL (copy from browser address bar):

```
https://compara-gzf8.vercel.app
```

Replace with your real URL if different. Multiple URLs:

```
https://compara-gzf8.vercel.app,https://compara.vercel.app
```

3. Save — Render redeploys (~1 min).

4. On **Vercel** → Settings → Environment Variables — confirm:

```
VITE_API_URL=https://compara.onrender.com/api
```

5. **Redeploy Vercel** after any env change (Deployments → Redeploy).

---

## Step 5 — Configure API key (Anthropic)

1. Create a key at [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. In **Render** → Environment → add or update:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

3. Never commit `.env` to GitHub (already in `.gitignore`).

Local development:

```powershell
copy server\.env.example server\.env
# Edit server\.env and paste your key
```

---

## Verify production

1. Open your Vercel URL.
2. Header should show **Claude connected** (not only “Smart rules”).
3. Try a recipe: **Convert to 9:16**.
4. Chat should show **Agent understood** and update the canvas.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Server offline” on Vercel | Check `VITE_API_URL` ends with `/api`; redeploy Vercel |
| CORS error in browser | Add exact Vercel URL to `CLIENT_URL` on Render |
| Render slow first request | Free tier cold start (~30s); wait and retry |
| LLM not working | Set `ANTHROPIC_API_KEY` on Render only (not Vercel) |

---

## Local development

```powershell
# Terminal 1
cd server
copy .env.example .env
# add ANTHROPIC_API_KEY
node index.js

# Terminal 2
cd client
npm run dev
```

Open http://localhost:5173 — API proxied via Vite to port 3001.
