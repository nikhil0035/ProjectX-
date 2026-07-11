from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user_id
from app.schemas.dashboard import DailyPoint, DashboardResponse, Period, SubScores
from app.services.scoring import (
    SubScores as InternalSubScores,
)
from app.services.scoring import (
    daily_training_points,
    period_bounds,
    sessions_in_range,
    training_adherence,
    training_streak_days,
)

router = APIRouter()


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    period: Period = Query(default="week"),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    start, end = period_bounds(period)

    training = await training_adherence(db, user_id, start, end)
    subs = InternalSubScores(training=training)

    completed, started = await sessions_in_range(db, user_id, start, end)
    days_in_period = (end - start).days + 1
    planned = round(4.0 * (days_in_period / 7.0))

    streak = await training_streak_days(db, user_id)

    # Week strip = the 7 days of the current week (Mon..Sun), regardless of `period`.
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    daily = await daily_training_points(db, user_id, week_start, week_end)
    strip = [
        DailyPoint(day=d, score=100.0 if n > 0 else 0.0, sessions=n) for d, n in daily
    ]

    return DashboardResponse(
        period=period,
        period_start=start,
        period_end=end,
        score=subs.composite(),
        sub_scores=SubScores(
            training=subs.training,
            volume=subs.volume,
            strength=subs.strength,
            nutrition=subs.nutrition,
            recovery=subs.recovery,
        ),
        streak_days_trained=streak,
        sessions_completed=completed,
        sessions_planned=planned,
        week_strip=strip,
    )
