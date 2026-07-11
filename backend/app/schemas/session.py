from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SessionStart(BaseModel):
    template_id: UUID | None = None
    started_at: datetime | None = None  # server defaults to now() if omitted
    bodyweight_kg: float | None = Field(default=None, ge=0, le=500)
    notes: str | None = None


class SessionComplete(BaseModel):
    completed_at: datetime | None = None
    notes: str | None = None


class LoggedSetIn(BaseModel):
    exercise_id: UUID
    order_idx: int = Field(ge=0)
    set_number: int = Field(ge=1)
    set_type: str = Field(default="working", pattern="^(working|warmup|drop|amrap|myo)$")
    parent_set_id: UUID | None = None
    superset_group_id: UUID | None = None
    weight_kg: float = Field(ge=0, le=1000)
    reps: int = Field(ge=0, le=1000)
    rpe: float | None = Field(default=None, ge=1, le=10)
    tempo: str | None = None
    notes: str | None = None
    completed_at: datetime | None = None


class LoggedSetOut(BaseModel):
    id: UUID
    exercise_id: UUID
    order_idx: int
    set_number: int
    set_type: str
    parent_set_id: UUID | None
    superset_group_id: UUID | None
    weight_kg: float
    reps: int
    rpe: float | None
    tempo: str | None
    notes: str | None
    completed_at: datetime

    model_config = {"from_attributes": True}


class WorkoutSessionOut(BaseModel):
    id: UUID
    template_id: UUID | None
    started_at: datetime
    completed_at: datetime | None
    notes: str | None
    bodyweight_kg: float | None
    sets: list[LoggedSetOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SuggestionOut(BaseModel):
    weight_kg: float
    reps_low: int
    reps_high: int
    reason: str
