from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models._mixins import Timestamps, UUIDPk


class Exercise(UUIDPk, Timestamps, Base):
    __tablename__ = "exercises"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    primary_muscle: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    secondary_muscles: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    equipment: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
