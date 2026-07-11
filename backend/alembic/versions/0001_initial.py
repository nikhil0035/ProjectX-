"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-11

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sync_version", sa.BigInteger(), server_default="1", nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "exercises",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("primary_muscle", sa.String(64), nullable=False),
        sa.Column("secondary_muscles", postgresql.JSONB(), server_default="[]", nullable=False),
        sa.Column("equipment", sa.String(64), nullable=True),
        sa.Column("is_custom", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sync_version", sa.BigInteger(), server_default="1", nullable=False),
    )
    op.create_index("ix_exercises_name", "exercises", ["name"])
    op.create_index("ix_exercises_primary_muscle", "exercises", ["primary_muscle"])

    op.create_table(
        "workout_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sync_version", sa.BigInteger(), server_default="1", nullable=False),
    )
    op.create_index("ix_workout_templates_user_id", "workout_templates", ["user_id"])

    op.create_table(
        "template_exercises",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workout_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "exercise_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("exercises.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("order_idx", sa.Integer(), nullable=False),
        sa.Column("superset_group_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("target_sets", sa.Integer(), nullable=False),
        sa.Column("target_reps_low", sa.Integer(), nullable=False),
        sa.Column("target_reps_high", sa.Integer(), nullable=False),
        sa.Column("target_rpe", sa.Numeric(3, 1), nullable=True),
        sa.Column("rest_seconds", sa.Integer(), server_default="120", nullable=False),
        sa.Column("tempo", sa.String(16), nullable=True),
        sa.Column("progression_rule", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sync_version", sa.BigInteger(), server_default="1", nullable=False),
    )
    op.create_index("ix_template_exercises_template_id", "template_exercises", ["template_id"])

    op.create_table(
        "workout_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workout_templates.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("bodyweight_kg", sa.Numeric(5, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sync_version", sa.BigInteger(), server_default="1", nullable=False),
    )
    op.create_index(
        "ix_workout_sessions_user_started",
        "workout_sessions",
        ["user_id", sa.text("started_at DESC")],
    )

    op.create_table(
        "logged_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workout_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "exercise_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("exercises.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("order_idx", sa.Integer(), nullable=False),
        sa.Column("set_number", sa.Integer(), nullable=False),
        sa.Column("set_type", sa.String(16), server_default="working", nullable=False),
        sa.Column(
            "parent_set_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("logged_sets.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("superset_group_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("weight_kg", sa.Numeric(6, 2), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False),
        sa.Column("rpe", sa.Numeric(3, 1), nullable=True),
        sa.Column("tempo", sa.String(16), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sync_version", sa.BigInteger(), server_default="1", nullable=False),
    )
    op.create_index("ix_logged_sets_session_order", "logged_sets", ["session_id", "order_idx"])
    op.create_index(
        "ix_logged_sets_exercise_completed",
        "logged_sets",
        ["exercise_id", sa.text("completed_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_logged_sets_exercise_completed", table_name="logged_sets")
    op.drop_index("ix_logged_sets_session_order", table_name="logged_sets")
    op.drop_table("logged_sets")

    op.drop_index("ix_workout_sessions_user_started", table_name="workout_sessions")
    op.drop_table("workout_sessions")

    op.drop_index("ix_template_exercises_template_id", table_name="template_exercises")
    op.drop_table("template_exercises")

    op.drop_index("ix_workout_templates_user_id", table_name="workout_templates")
    op.drop_table("workout_templates")

    op.drop_index("ix_exercises_primary_muscle", table_name="exercises")
    op.drop_index("ix_exercises_name", table_name="exercises")
    op.drop_table("exercises")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
