# ProjectX

Personal workout planning and tracking app. Single-user, mobile-first.

## Stack

- **Mobile**: React Native + Expo (expo-router), TypeScript, Zustand, React Query, local SQLite
- **Backend**: Python 3.11+ FastAPI (async), SQLAlchemy, Alembic, PostgreSQL
- **Hosting**: Fly.io (backend) + Neon (Postgres), Expo EAS (mobile)
- **LLM**: Groq via pluggable `LLMProvider` interface

## Layout

```
backend/     FastAPI app
mobile/      Expo app
shared/      OpenAPI-generated TS types
infra/       docker-compose (local pg), Fly configs
docs/        ADRs, schema notes, setup guides
```

## Getting started

### Backend (local dev)

```bash
cd infra && docker compose up -d
cd ../backend
uv sync                    # or: pip install -e .
cp .env.example .env       # fill in DATABASE_URL, JWT_SECRET
alembic upgrade head
uvicorn app.main:app --reload
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

See `docs/` for phase-by-phase build notes and the full plan.
