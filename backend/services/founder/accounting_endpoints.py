from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
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
    period: str = Query("monthly", pattern="^(monthly|quarterly|yearly)$"),
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


# --- Tax E-Filing (IRS e-file) ---
from services.founder.tax_efile_service import TaxEfileService


class QuarterlyEfilePayload(BaseModel):
    quarter: str = Field(..., pattern="^(Q1|Q2|Q3|Q4)$")
    tax_year: int = Field(..., ge=2020, le=2030)
    amount: float = Field(..., ge=0)
    payment_date: str | None = None


class Efile1099PrepPayload(BaseModel):
    tax_year: int = Field(..., ge=2020, le=2030)
    recipient_count: int = Field(..., ge=0)
    amounts_by_type: dict[str, float] | None = None


class EfileW2PrepPayload(BaseModel):
    tax_year: int = Field(..., ge=2020, le=2030)
    employee_count: int = Field(..., ge=0)


class EfileSubmitPayload(BaseModel):
    form_type: str = Field(..., pattern="^(1099|w2)$")
    tax_year: int = Field(..., ge=2020, le=2030)
    prep_id: str | None = None


@router.get("/efile-status")
def get_efile_status(
    tax_year: int | None = Query(None, ge=2020, le=2030),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Get e-file status for quarterly, 1099, and W-2"""
    return TaxEfileService.get_efile_status(db, user.org_id, tax_year)


@router.post("/efile/quarterly")
def submit_quarterly_efile(
    payload: QuarterlyEfilePayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Submit quarterly estimated tax (1040-ES) via e-file"""
    return TaxEfileService.submit_quarterly_estimated(
        db, user.org_id, payload.quarter, payload.tax_year, payload.amount, payload.payment_date
    )


@router.post("/efile/1099-prep")
def submit_1099_prep(
    payload: Efile1099PrepPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Prepare 1099 data for e-file; then call POST /efile/file to submit"""
    return TaxEfileService.submit_1099_prep(
        db, user.org_id, payload.tax_year, payload.recipient_count, payload.amounts_by_type
    )


@router.post("/efile/w2-prep")
def submit_w2_prep(
    payload: EfileW2PrepPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Prepare W-2 data for e-file; then call POST /efile/file to submit"""
    return TaxEfileService.submit_w2_prep(db, user.org_id, payload.tax_year, payload.employee_count)


@router.post("/efile/file")
def submit_efile(
    payload: EfileSubmitPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.founder, UserRole.ops_admin)),
):
    """Submit prepared 1099 or W-2 to IRS e-file"""
    return TaxEfileService.submit_efile(
        db, user.org_id, payload.form_type, payload.tax_year, payload.prep_id
    )
