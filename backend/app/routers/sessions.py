from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.security import get_current_user_id
from app.models.session import LoggedSet, WorkoutSession
from app.models.template import TemplateExercise
from app.schemas.session import (
    LoggedSetIn,
    LoggedSetOut,
    SessionComplete,
    SessionStart,
    SuggestionOut,
    WorkoutSessionOut,
)
from app.services.progression import PreviousSet, TemplateTarget, suggest_next

router = APIRouter()


@router.get("/suggest", response_model=SuggestionOut)
async def suggest_weight(
    exercise_id: UUID = Query(...),
    template_exercise_id: UUID = Query(...),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> SuggestionOut:
    """Return a progression suggestion for the next session based on the last session's sets."""
    te_result = await db.execute(
        select(TemplateExercise).where(TemplateExercise.id == template_exercise_id)
    )
    te = te_result.scalar_one_or_none()
    if not te:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template exercise not found")

    # Find the most recent completed session where this exercise was logged.
    prev_sets_result = await db.execute(
        select(LoggedSet)
        .join(WorkoutSession, LoggedSet.session_id == WorkoutSession.id)
        .where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.completed_at.is_not(None),
            LoggedSet.exercise_id == exercise_id,
            LoggedSet.set_type == "working",
        )
        .order_by(WorkoutSession.completed_at.desc(), LoggedSet.set_number.asc())
        .limit(te.target_sets * 2)  # grab enough sets from recent sessions
    )
    raw_sets = prev_sets_result.scalars().all()

    prev = [PreviousSet(weight_kg=s.weight_kg, reps=s.reps, rpe=float(s.rpe) if s.rpe else None) for s in raw_sets]
    target = TemplateTarget(
        target_sets=te.target_sets,
        target_reps_low=te.target_reps_low,
        target_reps_high=te.target_reps_high,
        target_rpe=float(te.target_rpe) if te.target_rpe else None,
    )
    suggestion = suggest_next(prev, target, te.progression_rule)
    return SuggestionOut(
        weight_kg=suggestion.weight_kg,
        reps_low=suggestion.reps_low,
        reps_high=suggestion.reps_high,
        reason=suggestion.reason,
    )


async def _load(db: AsyncSession, user_id: UUID, session_id: UUID) -> WorkoutSession:
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == session_id, WorkoutSession.user_id == user_id)
        .options(selectinload(WorkoutSession.sets))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.post("", response_model=WorkoutSessionOut, status_code=status.HTTP_201_CREATED)
async def start_session(
    payload: SessionStart,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> WorkoutSessionOut:
    session = WorkoutSession(
        user_id=user_id,
        template_id=payload.template_id,
        started_at=payload.started_at or datetime.now(UTC),
        notes=payload.notes,
        bodyweight_kg=payload.bodyweight_kg,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session, attribute_names=["sets"])
    return WorkoutSessionOut.model_validate(session)


@router.get("", response_model=list[WorkoutSessionOut])
async def list_sessions(
    limit: int = Query(default=50, ge=1, le=200),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[WorkoutSessionOut]:
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user_id)
        .options(selectinload(WorkoutSession.sets))
        .order_by(WorkoutSession.started_at.desc())
        .limit(limit)
    )
    return [WorkoutSessionOut.model_validate(s) for s in result.scalars().all()]


@router.get("/{session_id}", response_model=WorkoutSessionOut)
async def get_session(
    session_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> WorkoutSessionOut:
    session = await _load(db, user_id, session_id)
    return WorkoutSessionOut.model_validate(session)


@router.patch("/{session_id}/complete", response_model=WorkoutSessionOut)
async def complete_session(
    session_id: UUID,
    payload: SessionComplete,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> WorkoutSessionOut:
    session = await _load(db, user_id, session_id)
    session.completed_at = payload.completed_at or datetime.now(UTC)
    if payload.notes is not None:
        session.notes = payload.notes
    await db.commit()
    await db.refresh(session, attribute_names=["sets"])
    return WorkoutSessionOut.model_validate(session)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    session = await _load(db, user_id, session_id)
    await db.delete(session)
    await db.commit()


@router.post("/{session_id}/sets", response_model=LoggedSetOut, status_code=status.HTTP_201_CREATED)
async def add_set(
    session_id: UUID,
    payload: LoggedSetIn,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> LoggedSetOut:
    session = await _load(db, user_id, session_id)
    if session.completed_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add sets to a completed session",
        )
    logged = LoggedSet(
        session_id=session.id,
        exercise_id=payload.exercise_id,
        order_idx=payload.order_idx,
        set_number=payload.set_number,
        set_type=payload.set_type,
        parent_set_id=payload.parent_set_id,
        superset_group_id=payload.superset_group_id,
        weight_kg=payload.weight_kg,
        reps=payload.reps,
        rpe=payload.rpe,
        tempo=payload.tempo,
        notes=payload.notes,
        completed_at=payload.completed_at or datetime.now(UTC),
    )
    db.add(logged)
    await db.commit()
    await db.refresh(logged)
    return LoggedSetOut.model_validate(logged)


@router.patch("/{session_id}/sets/{set_id}", response_model=LoggedSetOut)
async def update_set(
    session_id: UUID,
    set_id: UUID,
    payload: LoggedSetIn,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> LoggedSetOut:
    await _load(db, user_id, session_id)  # ownership check
    result = await db.execute(
        select(LoggedSet).where(LoggedSet.id == set_id, LoggedSet.session_id == session_id)
    )
    logged = result.scalar_one_or_none()
    if not logged:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found")

    logged.exercise_id = payload.exercise_id
    logged.order_idx = payload.order_idx
    logged.set_number = payload.set_number
    logged.set_type = payload.set_type
    logged.parent_set_id = payload.parent_set_id
    logged.superset_group_id = payload.superset_group_id
    logged.weight_kg = payload.weight_kg
    logged.reps = payload.reps
    logged.rpe = payload.rpe
    logged.tempo = payload.tempo
    logged.notes = payload.notes
    if payload.completed_at is not None:
        logged.completed_at = payload.completed_at

    await db.commit()
    await db.refresh(logged)
    return LoggedSetOut.model_validate(logged)


@router.delete("/{session_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_set(
    session_id: UUID,
    set_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    await _load(db, user_id, session_id)
    result = await db.execute(
        select(LoggedSet).where(LoggedSet.id == set_id, LoggedSet.session_id == session_id)
    )
    logged = result.scalar_one_or_none()
    if not logged:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found")
    await db.delete(logged)
    await db.commit()
