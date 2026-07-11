from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models._mixins import Timestamps, UUIDPk


class WorkoutTemplate(UUIDPk, Timestamps, Base):
    __tablename__ = "workout_templates"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    exercises: Mapped[list["TemplateExercise"]] = relationship(
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateExercise.order_idx",
    )


class TemplateExercise(UUIDPk, Timestamps, Base):
    __tablename__ = "template_exercises"

    template_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("workout_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exercise_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("exercises.id", ondelete="RESTRICT"),
        nullable=False,
    )
    order_idx: Mapped[int] = mapped_column(Integer, nullable=False)
    superset_group_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True)

    target_sets: Mapped[int] = mapped_column(Integer, nullable=False)
    target_reps_low: Mapped[int] = mapped_column(Integer, nullable=False)
    target_reps_high: Mapped[int] = mapped_column(Integer, nullable=False)
    target_rpe: Mapped[float | None] = mapped_column(Numeric(3, 1), nullable=True)
    rest_seconds: Mapped[int] = mapped_column(Integer, default=120, nullable=False)
    tempo: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # e.g. {"type": "linear", "increment_kg": 2.5}
    progression_rule: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    template: Mapped[WorkoutTemplate] = relationship(back_populates="exercises")
