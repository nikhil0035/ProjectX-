"""Run: python -m scripts.seed (from backend/ with venv active)."""
import asyncio

from app.core.db import SessionLocal
from app.services.seed import seed_exercises


async def main() -> None:
    async with SessionLocal() as db:
        n = await seed_exercises(db)
    print(f"Seeded {n} exercises.")


if __name__ == "__main__":
    asyncio.run(main())
