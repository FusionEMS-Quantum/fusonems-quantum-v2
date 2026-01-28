from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from decimal import Decimal

from models.billing_claims import BillingClaim
from models.billing_accounts import BillingInvoice, BillingInvoiceLine
from models.billing_exports import ClaimSubmission
from utils.logger import logger


class AccountingService:
    """Service for accounting operations and financial metrics"""
    
    @staticmethod
    def get_cash_balance(db: Session, org_id: int) -> Dict[str, Any]:
        """Get cash balance across accounts"""
        try:
            # Get total cash from paid claims in last 90 days
            ninety_days_ago = datetime.utcnow() - timedelta(days=90)
            
            paid_claims = db.query(
                func.sum(BillingClaim.amount_paid)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status == "paid",
                    BillingClaim.payment_date >= ninety_days_ago
                )
            ).scalar() or Decimal(0)
            
            # Get total from paid invoices
            paid_invoices = db.query(
                func.sum(BillingInvoice.amount_paid)
            ).filter(
                and_(
                    BillingInvoice.org_id == org_id,
                    BillingInvoice.status == "paid",
                    BillingInvoice.updated_at >= ninety_days_ago
                )
            ).scalar() or Decimal(0)
            
            total_cash = float(paid_claims) + float(paid_invoices)
            
            # Calculate change from previous period
            previous_period_start = ninety_days_ago - timedelta(days=90)
            previous_paid = db.query(
                func.sum(BillingClaim.amount_paid)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status == "paid",
                    BillingClaim.payment_date >= previous_period_start,
                    BillingClaim.payment_date < ninety_days_ago
                )
            ).scalar() or Decimal(0)
            
            previous_total = float(previous_paid)
            change_pct = ((total_cash - previous_total) / previous_total * 100) if previous_total > 0 else 0
            
            # Get recent deposits (last 7 days)
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            recent_deposits = db.query(
                func.count(BillingClaim.id),
                func.sum(BillingClaim.amount_paid)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status == "paid",
                    BillingClaim.payment_date >= seven_days_ago
                )
            ).first()
            
            return {
                "total_cash": round(total_cash, 2),
                "change_from_previous_period_pct": round(change_pct, 2),
                "recent_deposits_count": recent_deposits[0] or 0,
                "recent_deposits_amount": float(recent_deposits[1] or 0),
                "period_days": 90,
                "ai_insight": AccountingService._generate_cash_insight(total_cash, change_pct)
            }
        except Exception as e:
            logger.error(f"Failed to get cash balance: {e}")
            return {
                "total_cash": 0,
                "change_from_previous_period_pct": 0,
                "recent_deposits_count": 0,
                "recent_deposits_amount": 0,
                "period_days": 90,
                "ai_insight": None,
                "error": str(e)
            }
    
    @staticmethod
    def get_accounts_receivable(db: Session, org_id: int) -> Dict[str, Any]:
        """Get accounts receivable metrics"""
        try:
            # Total AR (unpaid + submitted claims)
            total_ar = db.query(
                func.sum(BillingClaim.total_charge)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status.in_(["submitted", "pending", "in_review"])
                )
            ).scalar() or Decimal(0)
            
            # Aging buckets
            current_date = datetime.utcnow()
            thirty_days_ago = current_date - timedelta(days=30)
            sixty_days_ago = current_date - timedelta(days=60)
            ninety_days_ago = current_date - timedelta(days=90)
            
            current_ar = db.query(
                func.sum(BillingClaim.total_charge)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status.in_(["submitted", "pending", "in_review"]),
                    BillingClaim.created_at >= thirty_days_ago
                )
            ).scalar() or Decimal(0)
            
            ar_30_60 = db.query(
                func.sum(BillingClaim.total_charge)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status.in_(["submitted", "pending", "in_review"]),
                    BillingClaim.created_at >= sixty_days_ago,
                    BillingClaim.created_at < thirty_days_ago
                )
            ).scalar() or Decimal(0)
            
            ar_60_90 = db.query(
                func.sum(BillingClaim.total_charge)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status.in_(["submitted", "pending", "in_review"]),
                    BillingClaim.created_at >= ninety_days_ago,
                    BillingClaim.created_at < sixty_days_ago
                )
            ).scalar() or Decimal(0)
            
            ar_over_90 = db.query(
                func.sum(BillingClaim.total_charge)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status.in_(["submitted", "pending", "in_review"]),
                    BillingClaim.created_at < ninety_days_ago
                )
            ).scalar() or Decimal(0)
            
            # Average days to payment
            avg_days = db.query(
                func.avg(
                    func.julianday(BillingClaim.payment_date) - func.julianday(BillingClaim.created_at)
                )
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status == "paid",
                    BillingClaim.payment_date.isnot(None)
                )
            ).scalar() or 0
            
            total_ar_float = float(total_ar)
            
            return {
                "total_ar": round(total_ar_float, 2),
                "current": round(float(current_ar), 2),
                "ar_30_60_days": round(float(ar_30_60), 2),
                "ar_60_90_days": round(float(ar_60_90), 2),
                "ar_over_90_days": round(float(ar_over_90), 2),
                "avg_days_to_payment": round(avg_days, 1),
                "aging_breakdown_pct": {
                    "current": round((float(current_ar) / total_ar_float * 100) if total_ar_float > 0 else 0, 1),
                    "30_60": round((float(ar_30_60) / total_ar_float * 100) if total_ar_float > 0 else 0, 1),
                    "60_90": round((float(ar_60_90) / total_ar_float * 100) if total_ar_float > 0 else 0, 1),
                    "over_90": round((float(ar_over_90) / total_ar_float * 100) if total_ar_float > 0 else 0, 1)
                },
                "ai_insight": AccountingService._generate_ar_insight(total_ar_float, float(ar_over_90), avg_days)
            }
        except Exception as e:
            logger.error(f"Failed to get accounts receivable: {e}")
            return {
                "total_ar": 0,
                "current": 0,
                "ar_30_60_days": 0,
                "ar_60_90_days": 0,
                "ar_over_90_days": 0,
                "avg_days_to_payment": 0,
                "aging_breakdown_pct": {"current": 0, "30_60": 0, "60_90": 0, "over_90": 0},
                "ai_insight": None,
                "error": str(e)
            }
    
    @staticmethod
    def get_profit_loss(db: Session, org_id: int, period: str = "monthly") -> Dict[str, Any]:
        """Get P&L metrics for specified period"""
        try:
            # Determine date range based on period
            current_date = datetime.utcnow()
            if period == "monthly":
                start_date = current_date.replace(day=1)
                period_label = current_date.strftime("%B %Y")
            elif period == "quarterly":
                quarter_month = ((current_date.month - 1) // 3) * 3 + 1
                start_date = current_date.replace(month=quarter_month, day=1)
                period_label = f"Q{(current_date.month - 1) // 3 + 1} {current_date.year}"
            else:  # yearly
                start_date = current_date.replace(month=1, day=1)
                period_label = str(current_date.year)
            
            # Revenue (paid claims)
            revenue = db.query(
                func.sum(BillingClaim.amount_paid)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status == "paid",
                    BillingClaim.payment_date >= start_date
                )
            ).scalar() or Decimal(0)
            
            # For demo purposes, estimate costs at 60% of revenue
            # In production, this would come from expense tracking
            revenue_float = float(revenue)
            estimated_costs = revenue_float * 0.60
            gross_profit = revenue_float - estimated_costs
            gross_margin_pct = (gross_profit / revenue_float * 100) if revenue_float > 0 else 0
            
            # Get transaction count
            transaction_count = db.query(
                func.count(BillingClaim.id)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status == "paid",
                    BillingClaim.payment_date >= start_date
                )
            ).scalar() or 0
            
            # Previous period comparison
            if period == "monthly":
                prev_start = (start_date - timedelta(days=1)).replace(day=1)
                prev_end = start_date
            elif period == "quarterly":
                prev_start = (start_date - timedelta(days=90)).replace(day=1)
                prev_end = start_date
            else:
                prev_start = start_date.replace(year=start_date.year - 1)
                prev_end = start_date
            
            prev_revenue = db.query(
                func.sum(BillingClaim.amount_paid)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status == "paid",
                    BillingClaim.payment_date >= prev_start,
                    BillingClaim.payment_date < prev_end
                )
            ).scalar() or Decimal(0)
            
            prev_revenue_float = float(prev_revenue)
            revenue_change_pct = ((revenue_float - prev_revenue_float) / prev_revenue_float * 100) if prev_revenue_float > 0 else 0
            
            return {
                "period": period,
                "period_label": period_label,
                "revenue": round(revenue_float, 2),
                "costs": round(estimated_costs, 2),
                "gross_profit": round(gross_profit, 2),
                "gross_margin_pct": round(gross_margin_pct, 1),
                "transaction_count": transaction_count,
                "revenue_change_pct": round(revenue_change_pct, 1),
                "ai_insight": AccountingService._generate_pl_insight(gross_margin_pct, revenue_change_pct)
            }
        except Exception as e:
            logger.error(f"Failed to get P&L: {e}")
            return {
                "period": period,
                "period_label": "",
                "revenue": 0,
                "costs": 0,
                "gross_profit": 0,
                "gross_margin_pct": 0,
                "transaction_count": 0,
                "revenue_change_pct": 0,
                "ai_insight": None,
                "error": str(e)
            }
    
    @staticmethod
    def get_tax_summary(db: Session, org_id: int) -> Dict[str, Any]:
        """Get tax liability and preparation status"""
        try:
            # Current year tax calculations
            current_year = datetime.utcnow().year
            year_start = datetime(current_year, 1, 1)
            
            # Total revenue for tax year
            revenue = db.query(
                func.sum(BillingClaim.amount_paid)
            ).filter(
                and_(
                    BillingClaim.org_id == org_id,
                    BillingClaim.status == "paid",
                    BillingClaim.payment_date >= year_start
                )
            ).scalar() or Decimal(0)
            
            revenue_float = float(revenue)
            
            # Estimate tax liability (simplified - 21% corporate tax rate)
            estimated_profit = revenue_float * 0.40  # Assuming 40% profit margin
            estimated_tax = estimated_profit * 0.21
            
            # Current quarter
            current_quarter = (datetime.utcnow().month - 1) // 3 + 1
            quarters_remaining = 5 - current_quarter
            
            # Check if quarterly filings are up to date
            # In production, this would check actual filing records
            quarterly_filings_current = True
            next_filing_date = AccountingService._get_next_filing_date()
            
            return {
                "tax_year": current_year,
                "current_quarter": f"Q{current_quarter}",
                "estimated_tax_liability": round(estimated_tax, 2),
                "ytd_revenue": round(revenue_float, 2),
                "quarterly_filings_current": quarterly_filings_current,
                "next_filing_date": next_filing_date.strftime("%Y-%m-%d"),
                "days_until_filing": (next_filing_date - datetime.utcnow()).days,
                "ai_insight": AccountingService._generate_tax_insight(estimated_tax, next_filing_date)
            }
        except Exception as e:
            logger.error(f"Failed to get tax summary: {e}")
            return {
                "tax_year": datetime.utcnow().year,
                "current_quarter": "",
                "estimated_tax_liability": 0,
                "ytd_revenue": 0,
                "quarterly_filings_current": False,
                "next_filing_date": None,
                "days_until_filing": 0,
                "ai_insight": None,
                "error": str(e)
            }
    
    # Helper methods for AI insights
    @staticmethod
    def _generate_cash_insight(total_cash: float, change_pct: float) -> Dict[str, str]:
        """Generate AI insight for cash balance"""
        if change_pct > 20:
            return {
                "type": "positive",
                "message": f"Cash position improved by {abs(change_pct):.1f}% - strong growth trend"
            }
        elif change_pct < -20:
            return {
                "type": "warning",
                "message": f"Cash position decreased by {abs(change_pct):.1f}% - review collection processes"
            }
        else:
            return {
                "type": "neutral",
                "message": "Cash flow stable - continue monitoring"
            }
    
    @staticmethod
    def _generate_ar_insight(total_ar: float, ar_over_90: float, avg_days: float) -> Dict[str, str]:
        """Generate AI insight for AR"""
        over_90_pct = (ar_over_90 / total_ar * 100) if total_ar > 0 else 0
        
        if over_90_pct > 25:
            return {
                "type": "critical",
                "message": f"{over_90_pct:.1f}% of AR is over 90 days - immediate collection action needed"
            }
        elif avg_days > 60:
            return {
                "type": "warning",
                "message": f"Average collection time is {avg_days:.0f} days - consider improving collection process"
            }
        else:
            return {
                "type": "positive",
                "message": f"Healthy AR aging with {avg_days:.0f} day average collection time"
            }
    
    @staticmethod
    def _generate_pl_insight(margin_pct: float, revenue_change_pct: float) -> Dict[str, str]:
        """Generate AI insight for P&L"""
        if margin_pct < 30:
            return {
                "type": "warning",
                "message": f"Gross margin at {margin_pct:.1f}% - review cost structure"
            }
        elif revenue_change_pct < -10:
            return {
                "type": "warning",
                "message": f"Revenue declined {abs(revenue_change_pct):.1f}% - analyze revenue trends"
            }
        elif revenue_change_pct > 15:
            return {
                "type": "positive",
                "message": f"Revenue grew {revenue_change_pct:.1f}% - strong performance"
            }
        else:
            return {
                "type": "neutral",
                "message": f"Margins at {margin_pct:.1f}% - stable performance"
            }
    
    @staticmethod
    def _generate_tax_insight(estimated_tax: float, next_filing: datetime) -> Dict[str, str]:
        """Generate AI insight for tax"""
        days_until = (next_filing - datetime.utcnow()).days
        
        if days_until < 30:
            return {
                "type": "warning",
                "message": f"Quarterly filing due in {days_until} days - ensure preparation is complete"
            }
        else:
            return {
                "type": "neutral",
                "message": f"Next filing in {days_until} days - estimated liability ${estimated_tax:,.2f}"
            }
    
    @staticmethod
    def _get_next_filing_date() -> datetime:
        """Calculate next quarterly tax filing date"""
        current_date = datetime.utcnow()
        current_month = current_date.month
        
        # Quarterly filing months: 4, 7, 10, 1 (next year)
        filing_months = [4, 7, 10, 1]
        
        for month in filing_months:
            if month > current_month:
                return datetime(current_date.year, month, 15)
        
        # If no month found this year, return January next year
        return datetime(current_date.year + 1, 1, 15)
