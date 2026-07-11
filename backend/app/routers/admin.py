from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.config import get_settings
from app.core.db import get_db
from app.services.seed import seed_exercises
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def _require_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != get_settings().jwt_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.post("/seed", status_code=200)
async def run_seed(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_require_admin),
) -> dict:
    n = await seed_exercises(db)
    return {"inserted": n}
