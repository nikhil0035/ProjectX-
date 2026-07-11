# Deployment Guide

## Stack
- **Backend**: Render (free tier, Docker)
- **Database**: Neon (free tier, PostgreSQL)
- **Mobile**: Expo Go on iPhone (dev) → EAS build (production)

---

## 1. Push code to GitHub

You need the code on GitHub so Render can pull it.

```bash
cd ProjectX
git init
git add .
git commit -m "Initial commit"
```

Then create a new **private** repo at https://github.com/new (name it `ProjectX`), and:

```bash
git remote add origin https://github.com/nikhil0035/ProjectX.git
git push -u origin main
```

---

## 2. Neon (PostgreSQL)

1. Sign up at https://neon.tech — free, no credit card.
2. Click **New Project** → name it `projectx`, region **Singapore** (closest free region to India).
3. Once created, go to **Connection Details** → select **Pooled connection** → copy the connection string. It looks like:
   ```
   postgres://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Change `postgres://` → `postgresql+asyncpg://` and remove `?sslmode=require` (SSL is on by default with asyncpg). Final form:
   ```
   postgresql+asyncpg://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb
   ```
   Save this — you'll paste it into Render in the next step.

---

## 3. Render (Backend)

### Create the Web Service

1. Sign up at https://render.com — free, no credit card.
2. Dashboard → **New** → **Web Service**.
3. Connect your GitHub account → select the `ProjectX` repo.
4. Fill in:
   | Field | Value |
   |---|---|
   | Name | `projectx-backend` |
   | Root Directory | `backend` |
   | Runtime | **Docker** |
   | Instance Type | **Free** |
5. Click **Create Web Service** — don't deploy yet, set env vars first.

### Set Environment Variables

In the service → **Environment** tab → **Add Environment Variable**:

| Key | Value |
|---|---|
| `DATABASE_URL` | The `postgresql+asyncpg://...` string from Neon |
| `JWT_SECRET` | A random 32+ character string (generate one at https://1password.com/password-generator/ — use "random string" mode) |
| `LLM_PROVIDER` | `groq` |
| `GROQ_API_KEY` | Leave blank for now |
| `CORS_ORIGINS` | `*` (wildcard for now; tighten once you have a stable Expo URL) |

### Deploy

Click **Deploy** (or push a commit — Render auto-deploys on every push to `main`).

The Dockerfile runs `alembic upgrade head` on every boot, so the database schema is created automatically.

### Verify

Once deploy finishes (2–3 min), click your service URL and open `/health`:
```
https://projectx-backend-xxxx.onrender.com/health
```
You should see `{"status":"ok"}`.

### Seed exercises (one-time)

Render free tier has a **Shell** tab in your service dashboard. Click it, then run:
```bash
python -m scripts.seed
```

---

## 4. Keep it warm (important on free tier)

Render free services spin down after **15 minutes idle**. First request after sleep takes ~30s — bad for the app.

Fix with [UptimeRobot](https://uptimerobot.com) (free):
1. Sign up → **New Monitor** → HTTP(s)
2. URL: `https://projectx-backend-xxxx.onrender.com/health`
3. Monitoring interval: **5 minutes**

This keeps the backend awake during the day at zero cost.

---

## 5. Mobile — Expo Go on iPhone 13

### One-time setup

1. Install **Expo Go** from the App Store on your iPhone.
2. On your Windows machine, install Node if you haven't:
   ```bash
   node --version   # should be 18+
   ```
3. Install mobile deps:
   ```bash
   cd mobile
   npm install
   ```

### Point the app at your Render backend

Create `mobile/.env`:
```bash
EXPO_PUBLIC_API_URL=https://projectx-backend-xxxx.onrender.com
```
Replace `xxxx` with your actual Render service name.

### Run

```bash
cd mobile
npx expo start
```

A QR code appears in the terminal. **Scan it with your iPhone camera** → opens in Expo Go.

> Your iPhone and Windows machine must be on the **same Wi-Fi network**.
> If scanning doesn't work, press `t` in the terminal to get a tunnel URL instead (works on any network, slightly slower).

---

## Local development

For local dev, run Postgres via Docker and point the backend at it.

```bash
# Terminal 1 — database
cd infra
docker compose up -d

# Terminal 2 — backend
cd backend
cp .env.example .env        # then edit JWT_SECRET at minimum
pip install -e ".[dev]"
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 3 — mobile
cd mobile
cp .env.example .env        # set EXPO_PUBLIC_API_URL=http://<your-local-ip>:8000
npx expo start
```

Find your local IP:
```bash
ipconfig    # look for IPv4 Address under your Wi-Fi adapter, e.g. 192.168.1.5
```

Set `EXPO_PUBLIC_API_URL=http://192.168.1.5:8000` — use your machine's IP, not `localhost` (your phone can't reach localhost on your PC).

---

## Environment variable reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://user:pass@host/db` |
| `JWT_SECRET` | Yes | Random 32+ char string. Keep secret. |
| `LLM_PROVIDER` | No | `groq` (default). Future: `claude`, `ollama` |
| `GROQ_API_KEY` | No | Required only when coach/weekly-review features are used |
| `CORS_ORIGINS` | No | Comma-separated allowed origins. Default: localhost ports |
