import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import Exercise

SEED_DIR = Path(__file__).parent / "seed_data"


async def seed_exercises(db: AsyncSession) -> int:
    """Idempotent: inserts exercises from seed_data/exercises.json that don't already exist by name."""
    with (SEED_DIR / "exercises.json").open(encoding="utf-8") as f:
        entries = json.load(f)

    existing = {
        name
        for (name,) in (await db.execute(select(Exercise.name).where(Exercise.is_custom.is_(False)))).all()
    }

    inserted = 0
    for entry in entries:
        if entry["name"] in existing:
            continue
        db.add(
            Exercise(
                name=entry["name"],
                primary_muscle=entry["primary_muscle"],
                secondary_muscles=entry.get("secondary_muscles", []),
                equipment=entry.get("equipment"),
                is_custom=False,
                created_by=None,
            )
        )
        inserted += 1

    if inserted:
        await db.commit()
    return inserted
