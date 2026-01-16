from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.ai_console import AiInsight
from models.user import User, UserRole
from utils.ai_registry import register_ai_output
from utils.tenancy import scoped_query
from utils.write_ops import apply_training_mode, audit_and_event, model_snapshot


router = APIRouter(
    prefix="/api/ai_console",
    tags=["AI Console"],
    dependencies=[Depends(require_module("AI_CONSOLE"))],
)


class InsightCreate(BaseModel):
    category: str
    prompt: str
    response: str | None = None
    metrics: dict = {}


@router.post("/insights", status_code=status.HTTP_201_CREATED)
def create_insight(
    payload: InsightCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.dispatcher)),
):
    insight = AiInsight(**payload.dict(), org_id=user.org_id)
    apply_training_mode(insight, request)
    db.add(insight)
    db.commit()
    db.refresh(insight)
    register_ai_output(
        db=db,
        org_id=user.org_id,
        model_name="quantum-ai",
        model_version="v1.0",
        prompt=payload.prompt,
        output_text=payload.response or "",
        advisory_level="ADVISORY",
        classification=insight.classification,
        input_refs=[{"resource": "ai_insight", "id": insight.id}],
        config_snapshot={"module": "ai_console"},
        training_mode=request.state.training_mode,
    )
    audit_and_event(
        db=db,
        request=request,
        user=user,
        action="create",
        resource="ai_insight",
        classification=insight.classification,
        after_state=model_snapshot(insight),
        event_type="RECORD_WRITTEN",
        event_payload={"insight_id": insight.id},
    )
    return insight


@router.get("/insights")
def list_insights(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles()),
):
    return scoped_query(db, AiInsight, user.org_id, request.state.training_mode).order_by(
        AiInsight.created_at.desc()
    ).all()


@router.get("/predictions")
def get_predictions():
    return {
        "call_volume_next_8h": [6, 5, 9, 12, 8, 4, 6, 5],
        "peak_window": "17:00-20:00",
        "recommendation": "Stage an additional ALS unit near Zone 4",
    }
