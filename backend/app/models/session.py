from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models._mixins import Timestamps, UUIDPk


class WorkoutSession(UUIDPk, Timestamps, Base):
    __tablename__ = "workout_sessions"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    template_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("workout_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    bodyweight_kg: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    sets: Mapped[list["LoggedSet"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="(LoggedSet.order_idx, LoggedSet.set_number)",
    )


class LoggedSet(UUIDPk, Timestamps, Base):
    __tablename__ = "logged_sets"

    session_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exercise_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("exercises.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    order_idx: Mapped[int] = mapped_column(Integer, nullable=False)
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # 'working' | 'warmup' | 'drop' | 'amrap' | 'myo'
    set_type: Mapped[str] = mapped_column(String(16), default="working", nullable=False)
    parent_set_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("logged_sets.id", ondelete="SET NULL"),
        nullable=True,
    )
    superset_group_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True)

    weight_kg: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    rpe: Mapped[float | None] = mapped_column(Numeric(3, 1), nullable=True)
    tempo: Mapped[str | None] = mapped_column(String(16), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    session: Mapped[WorkoutSession] = relationship(back_populates="sets")
