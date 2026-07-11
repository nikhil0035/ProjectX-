from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.security import get_current_user_id
from app.models.template import TemplateExercise, WorkoutTemplate
from app.schemas.template import (
    TemplateExerciseIn,
    WorkoutTemplateCreate,
    WorkoutTemplateOut,
    WorkoutTemplateUpdate,
)

router = APIRouter()


def _apply_exercises(template: WorkoutTemplate, exercises: list[TemplateExerciseIn]) -> None:
    template.exercises.clear()
    for e in exercises:
        template.exercises.append(
            TemplateExercise(
                exercise_id=e.exercise_id,
                order_idx=e.order_idx,
                superset_group_id=e.superset_group_id,
                target_sets=e.target_sets,
                target_reps_low=e.target_reps_low,
                target_reps_high=e.target_reps_high,
                target_rpe=e.target_rpe,
                rest_seconds=e.rest_seconds,
                tempo=e.tempo,
                progression_rule=e.progression_rule,
            )
        )


async def _load(db: AsyncSession, user_id: UUID, template_id: UUID) -> WorkoutTemplate:
    result = await db.execute(
        select(WorkoutTemplate)
        .where(WorkoutTemplate.id == template_id, WorkoutTemplate.user_id == user_id)
        .options(selectinload(WorkoutTemplate.exercises))
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return template


@router.get("", response_model=list[WorkoutTemplateOut])
async def list_templates(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[WorkoutTemplateOut]:
    result = await db.execute(
        select(WorkoutTemplate)
        .where(WorkoutTemplate.user_id == user_id, WorkoutTemplate.archived_at.is_(None))
        .options(selectinload(WorkoutTemplate.exercises))
        .order_by(WorkoutTemplate.created_at.desc())
    )
    return [WorkoutTemplateOut.model_validate(t) for t in result.scalars().all()]


@router.post("", response_model=WorkoutTemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: WorkoutTemplateCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> WorkoutTemplateOut:
    template = WorkoutTemplate(user_id=user_id, name=payload.name, notes=payload.notes)
    _apply_exercises(template, payload.exercises)
    db.add(template)
    await db.commit()
    await db.refresh(template, attribute_names=["exercises"])
    return WorkoutTemplateOut.model_validate(template)


@router.get("/{template_id}", response_model=WorkoutTemplateOut)
async def get_template(
    template_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> WorkoutTemplateOut:
    template = await _load(db, user_id, template_id)
    return WorkoutTemplateOut.model_validate(template)


@router.patch("/{template_id}", response_model=WorkoutTemplateOut)
async def update_template(
    template_id: UUID,
    payload: WorkoutTemplateUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> WorkoutTemplateOut:
    template = await _load(db, user_id, template_id)
    if payload.name is not None:
        template.name = payload.name
    if payload.notes is not None:
        template.notes = payload.notes
    if payload.exercises is not None:
        _apply_exercises(template, payload.exercises)
    await db.commit()
    await db.refresh(template, attribute_names=["exercises"])
    return WorkoutTemplateOut.model_validate(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    template = await _load(db, user_id, template_id)
    await db.delete(template)
    await db.commit()
