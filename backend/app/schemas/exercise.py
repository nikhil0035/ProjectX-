from uuid import UUID

from pydantic import BaseModel, Field


class ExerciseBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    primary_muscle: str = Field(min_length=1, max_length=64)
    secondary_muscles: list[str] = Field(default_factory=list)
    equipment: str | None = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseOut(ExerciseBase):
    id: UUID
    is_custom: bool

    model_config = {"from_attributes": True}
