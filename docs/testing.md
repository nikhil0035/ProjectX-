# Testing

## Unit tests (no database)

Pure-function services that don't touch the DB run against a plain Python environment:

```bash
cd backend
uv sync --extra dev   # or: pip install -e '.[dev]'
pytest tests/test_progression.py tests/test_scoring.py -v
```

These cover:
- [tests/test_progression.py](../backend/tests/test_progression.py) — all rule variants + edge cases
- [tests/test_scoring.py](../backend/tests/test_scoring.py) — composite math + period bounds

## API integration tests (with Postgres)

Because the models use Postgres-specific types (`JSONB`, `UUID`), API tests
run against a real Postgres instance, not sqlite.

Bring up local Postgres, then run against a scratch database:

```bash
cd infra && docker compose up -d
cd ../backend
# create a test database once:
docker exec -it projectx-postgres psql -U projectx -c "CREATE DATABASE projectx_test;"
DATABASE_URL=postgresql+asyncpg://projectx:projectx_dev@localhost:5432/projectx_test \
  alembic upgrade head
DATABASE_URL=postgresql+asyncpg://projectx:projectx_dev@localhost:5432/projectx_test \
  JWT_SECRET=test-secret \
  pytest tests/ -v
```

For CI, spin Postgres up via a service container and point `DATABASE_URL` at it.
