from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.user import User, UserRole
from services.founder.accounting_service import AccountingService


router = APIRouter(
    prefix="/api/founder/accounting",
    tags=["Founder", "Accounting"],
    dependencies=[Depends(require_module("FOUNDER"))],
)


@router.get("/cash-balance")
def get_cash_balance(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get cash balance across accounts"""
    return AccountingService.get_cash_balance(db, user.org_id)


@router.get("/accounts-receivable")
def get_accounts_receivable(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get accounts receivable metrics and aging analysis"""
    return AccountingService.get_accounts_receivable(db, user.org_id)


@router.get("/profit-loss")
def get_profit_loss(
    period: str = Query("monthly", regex="^(monthly|quarterly|yearly)$"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get P&L metrics for specified period (monthly, quarterly, or yearly)"""
    return AccountingService.get_profit_loss(db, user.org_id, period)


@router.get("/tax-summary")
def get_tax_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get tax liability and preparation status"""
    return AccountingService.get_tax_summary(db, user.org_id)
