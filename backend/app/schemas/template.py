from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class TemplateExerciseIn(BaseModel):
    exercise_id: UUID
    order_idx: int = Field(ge=0)
    superset_group_id: UUID | None = None
    target_sets: int = Field(ge=1, le=20)
    target_reps_low: int = Field(ge=1, le=100)
    target_reps_high: int = Field(ge=1, le=100)
    target_rpe: float | None = Field(default=None, ge=1, le=10)
    rest_seconds: int = Field(default=120, ge=0, le=1800)
    tempo: str | None = None
    progression_rule: dict[str, Any] = Field(default_factory=lambda: {"type": "linear", "increment_kg": 2.5})


class TemplateExerciseOut(TemplateExerciseIn):
    id: UUID

    model_config = {"from_attributes": True}


class WorkoutTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    notes: str | None = None
    exercises: list[TemplateExerciseIn] = Field(default_factory=list)


class WorkoutTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    notes: str | None = None
    exercises: list[TemplateExerciseIn] | None = None


class WorkoutTemplateOut(BaseModel):
    id: UUID
    name: str
    notes: str | None
    exercises: list[TemplateExerciseOut]

    model_config = {"from_attributes": True}
