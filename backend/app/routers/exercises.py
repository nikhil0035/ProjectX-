from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user_id
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseCreate, ExerciseOut

router = APIRouter()


@router.get("", response_model=list[ExerciseOut])
async def list_exercises(
    q: str | None = Query(default=None, description="Substring match on name"),
    muscle: str | None = Query(default=None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ExerciseOut]:
    stmt = select(Exercise).where(
        or_(Exercise.is_custom.is_(False), Exercise.created_by == user_id)
    )
    if q:
        stmt = stmt.where(Exercise.name.ilike(f"%{q}%"))
    if muscle:
        stmt = stmt.where(Exercise.primary_muscle == muscle)
    stmt = stmt.order_by(Exercise.name)
    result = await db.execute(stmt)
    return [ExerciseOut.model_validate(e) for e in result.scalars().all()]


@router.post("", response_model=ExerciseOut, status_code=status.HTTP_201_CREATED)
async def create_custom_exercise(
    payload: ExerciseCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ExerciseOut:
    exercise = Exercise(
        name=payload.name,
        primary_muscle=payload.primary_muscle,
        secondary_muscles=payload.secondary_muscles,
        equipment=payload.equipment,
        is_custom=True,
        created_by=user_id,
    )
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return ExerciseOut.model_validate(exercise)


@router.get("/{exercise_id}", response_model=ExerciseOut)
async def get_exercise(
    exercise_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ExerciseOut:
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    if not exercise or (exercise.is_custom and exercise.created_by != user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    return ExerciseOut.model_validate(exercise)
