"""
Daily Briefing API Router
"""
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from services.founder.daily_briefing import DailyBriefing
from utils.logger import logger


router = APIRouter(
    prefix="/api/founder/briefing",
    tags=["Daily Briefing"]
)


@router.get("/today")
def get_todays_briefing(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get today's daily briefing.
    Founder only.
    Calm, concise, 1-2 minute read.
    """
    if not current_user.is_founder:
        raise HTTPException(status_code=403, detail="Founder access required")
    
    briefing_gen = DailyBriefing(db=db, org_id=current_user.org_id)
    briefing = briefing_gen.generate_briefing()
    
    return briefing


@router.get("/summary")
def get_briefing_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get just the executive summary (2-3 sentences).
    For quick dashboard display.
    """
    if not current_user.is_founder:
        raise HTTPException(status_code=403, detail="Founder access required")
    
    briefing_gen = DailyBriefing(db=db, org_id=current_user.org_id)
    briefing = briefing_gen.generate_briefing()
    
    return {
        'date': briefing['date'],
        'summary': briefing['summary'],
        'action_count': len(briefing['sections']['action_items'])
    }


@router.get("/action-items")
def get_action_items(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get just the recommended action items.
    For task list display.
    """
    if not current_user.is_founder:
        raise HTTPException(status_code=403, detail="Founder access required")
    
    briefing_gen = DailyBriefing(db=db, org_id=current_user.org_id)
    briefing = briefing_gen.generate_briefing()
    
    return {
        'date': briefing['date'],
        'action_items': briefing['sections']['action_items']
    }
