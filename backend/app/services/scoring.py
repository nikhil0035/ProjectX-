"""Composite fitness score.

Rule-based, deterministic. Sub-scores each 0-100; composite is weighted mean of
the sub-scores that are available (nulls are skipped and weights renormalized).

Phase 1 wires only `training`. Phase 4 wires `volume` and `strength`.
Phase 5 wires `nutrition`. Phase 6 wires `recovery`.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Literal
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import WorkoutSession

Period = Literal["day", "week", "month"]

WEIGHTS: dict[str, float] = {
    "training": 0.25,
    "volume": 0.15,
    "strength": 0.15,
    "nutrition": 0.25,
    "recovery": 0.20,
}


@dataclass
class SubScores:
    training: float | None = None
    volume: float | None = None
    strength: float | None = None
    nutrition: float | None = None
    recovery: float | None = None

    def composite(self) -> float | None:
        present = {k: v for k, v in self.__dict__.items() if v is not None}
        if not present:
            return None
        total_weight = sum(WEIGHTS[k] for k in present)
        if total_weight == 0:
            return None
        return round(sum(present[k] * WEIGHTS[k] for k in present) / total_weight, 1)


def period_bounds(period: Period, today: date | None = None) -> tuple[date, date]:
    today = today or datetime.utcnow().date()
    if period == "day":
        return today, today
    if period == "week":
        start = today - timedelta(days=today.weekday())  # Monday
        return start, start + timedelta(days=6)
    # month = rolling 30 days ending today
    return today - timedelta(days=29), today


async def training_adherence(
    db: AsyncSession, user_id: UUID, start: date, end: date, planned_per_week: float = 4.0
) -> float:
    """Simple Phase 1 stub: sessions completed in [start, end] vs a target.

    Assumes ~`planned_per_week` sessions/week is the target; scales for shorter windows.
    Capped at 100.
    """
    days = (end - start).days + 1
    target = planned_per_week * (days / 7.0)
    if target <= 0:
        return 0.0

    result = await db.execute(
        select(func.count(WorkoutSession.id)).where(
            and_(
                WorkoutSession.user_id == user_id,
                WorkoutSession.completed_at.is_not(None),
                func.date(WorkoutSession.started_at) >= start,
                func.date(WorkoutSession.started_at) <= end,
            )
        )
    )
    completed = result.scalar_one()
    return round(min(100.0, (completed / target) * 100.0), 1)


async def sessions_in_range(
    db: AsyncSession, user_id: UUID, start: date, end: date
) -> tuple[int, int]:
    """Returns (completed, started) for [start, end]."""
    result = await db.execute(
        select(
            func.count(WorkoutSession.id).filter(WorkoutSession.completed_at.is_not(None)),
            func.count(WorkoutSession.id),
        ).where(
            and_(
                WorkoutSession.user_id == user_id,
                func.date(WorkoutSession.started_at) >= start,
                func.date(WorkoutSession.started_at) <= end,
            )
        )
    )
    completed, started = result.one()
    return int(completed or 0), int(started or 0)


async def training_streak_days(db: AsyncSession, user_id: UUID) -> int:
    """Consecutive prior days (ending today) with at least one completed session."""
    result = await db.execute(
        select(func.date(WorkoutSession.started_at))
        .where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.completed_at.is_not(None),
        )
        .distinct()
        .order_by(func.date(WorkoutSession.started_at).desc())
        .limit(60)
    )
    days = [row[0] for row in result.all()]
    if not days:
        return 0
    today = datetime.utcnow().date()
    streak = 0
    cursor = today
    for d in days:
        if d == cursor:
            streak += 1
            cursor = cursor - timedelta(days=1)
        elif d < cursor:
            break
    return streak


async def daily_training_points(
    db: AsyncSession, user_id: UUID, start: date, end: date
) -> list[tuple[date, int]]:
    """(day, completed_sessions_that_day) for every day in [start, end]."""
    result = await db.execute(
        select(
            func.date(WorkoutSession.started_at).label("d"),
            func.count(WorkoutSession.id),
        )
        .where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.completed_at.is_not(None),
            func.date(WorkoutSession.started_at) >= start,
            func.date(WorkoutSession.started_at) <= end,
        )
        .group_by("d")
        .order_by("d")
    )
    by_day = {row[0]: int(row[1]) for row in result.all()}
    out: list[tuple[date, int]] = []
    cursor = start
    while cursor <= end:
        out.append((cursor, by_day.get(cursor, 0)))
        cursor += timedelta(days=1)
    return out
