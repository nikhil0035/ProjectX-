from datetime import date
from typing import Literal

from pydantic import BaseModel

Period = Literal["day", "week", "month"]


class SubScores(BaseModel):
    training: float | None
    volume: float | None
    strength: float | None
    nutrition: float | None
    recovery: float | None


class DailyPoint(BaseModel):
    day: date
    score: float | None
    sessions: int


class DashboardResponse(BaseModel):
    period: Period
    period_start: date
    period_end: date
    score: float | None
    sub_scores: SubScores
    streak_days_trained: int
    sessions_completed: int
    sessions_planned: int
    week_strip: list[DailyPoint]
