from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.user import User, UserRole
from services.founder.expenses_service import ExpensesService


router = APIRouter(
    prefix="/api/founder/expenses",
    tags=["Founder", "Expenses"],
    dependencies=[Depends(require_module("FOUNDER"))],
)


@router.get("/pending-receipts")
def get_pending_receipts(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get pending receipts in OCR queue"""
    return ExpensesService.get_pending_receipts(db, user.org_id)


@router.get("/ocr-failures")
def get_ocr_failures(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get OCR failures with error details"""
    return ExpensesService.get_ocr_failures(db, user.org_id, limit)


@router.get("/unposted")
def get_unposted_expenses(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get unposted expenses across all organizations"""
    return ExpensesService.get_unposted_expenses(db, user.org_id)


@router.get("/approval-workflows")
def get_approval_workflows(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get expense approval workflow status"""
    return ExpensesService.get_approval_workflows(db, user.org_id)


@router.get("/processing-metrics")
def get_processing_metrics(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get receipt processing status and metrics"""
    return ExpensesService.get_receipt_processing_metrics(db, user.org_id)
