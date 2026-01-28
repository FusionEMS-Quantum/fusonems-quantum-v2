from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from decimal import Decimal

from models.expenses import ExpenseReceipt, Expense, ExpenseApprovalWorkflow
from models.user import User
from utils.logger import logger


class ExpensesService:
    """Service for expense and receipt management operations"""
    
    @staticmethod
    def get_pending_receipts(db: Session, org_id: int) -> Dict[str, Any]:
        """Get pending receipts in OCR queue"""
        try:
            # Count receipts by OCR status
            pending_count = db.query(func.count(ExpenseReceipt.id)).filter(
                and_(
                    ExpenseReceipt.org_id == org_id,
                    ExpenseReceipt.ocr_status == "pending"
                )
            ).scalar() or 0
            
            processing_count = db.query(func.count(ExpenseReceipt.id)).filter(
                and_(
                    ExpenseReceipt.org_id == org_id,
                    ExpenseReceipt.ocr_status == "processing"
                )
            ).scalar() or 0
            
            # Get recent pending receipts
            pending_receipts = db.query(ExpenseReceipt).filter(
                and_(
                    ExpenseReceipt.org_id == org_id,
                    ExpenseReceipt.ocr_status.in_(["pending", "processing"])
                )
            ).order_by(desc(ExpenseReceipt.created_at)).limit(10).all()
            
            # Average OCR processing time (for completed receipts)
            avg_time_query = db.query(
                func.avg(
                    func.julianday(ExpenseReceipt.ocr_processed_at) - func.julianday(ExpenseReceipt.created_at)
                ) * 24 * 60  # Convert to minutes
            ).filter(
                and_(
                    ExpenseReceipt.org_id == org_id,
                    ExpenseReceipt.ocr_status == "completed",
                    ExpenseReceipt.ocr_processed_at.isnot(None)
                )
            ).scalar() or 0
            
            return {
                "pending_count": pending_count,
                "processing_count": processing_count,
                "total_in_queue": pending_count + processing_count,
                "avg_processing_time_minutes": round(avg_time_query, 1),
                "recent_receipts": [
                    {
                        "id": r.id,
                        "vendor_name": r.vendor_name or "Unknown",
                        "ocr_status": r.ocr_status,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                        "file_type": r.file_type,
                        "file_size": r.file_size
                    }
                    for r in pending_receipts
                ]
            }
        except Exception as e:
            logger.error(f"Failed to get pending receipts: {e}")
            return {
                "pending_count": 0,
                "processing_count": 0,
                "total_in_queue": 0,
                "avg_processing_time_minutes": 0,
                "recent_receipts": [],
                "error": str(e)
            }
    
    @staticmethod
    def get_ocr_failures(db: Session, org_id: int, limit: int = 20) -> Dict[str, Any]:
        """Get OCR failures with error details"""
        try:
            # Get failed receipts
            failures = db.query(ExpenseReceipt).filter(
                and_(
                    ExpenseReceipt.org_id == org_id,
                    ExpenseReceipt.ocr_status == "failed"
                )
            ).order_by(desc(ExpenseReceipt.created_at)).limit(limit).all()
            
            # Count failures by error type
            total_failures = len(failures)
            retry_exceeded = sum(1 for f in failures if f.ocr_retry_count >= 3)
            low_confidence = sum(1 for f in failures if "confidence" in (f.ocr_error or "").lower())
            
            return {
                "total_failures": total_failures,
                "retry_exceeded": retry_exceeded,
                "low_confidence_failures": low_confidence,
                "failures": [
                    {
                        "id": f.id,
                        "vendor_name": f.vendor_name or "Unknown",
                        "file_path": f.file_path,
                        "file_type": f.file_type,
                        "ocr_error": f.ocr_error,
                        "ocr_retry_count": f.ocr_retry_count,
                        "ocr_confidence": float(f.ocr_confidence) if f.ocr_confidence else 0,
                        "created_at": f.created_at.isoformat() if f.created_at else None,
                        "user_id": f.user_id
                    }
                    for f in failures
                ]
            }
        except Exception as e:
            logger.error(f"Failed to get OCR failures: {e}")
            return {
                "total_failures": 0,
                "retry_exceeded": 0,
                "low_confidence_failures": 0,
                "failures": [],
                "error": str(e)
            }
    
    @staticmethod
    def get_unposted_expenses(db: Session, org_id: int) -> Dict[str, Any]:
        """Get unposted expenses across all organizations"""
        try:
            # Get unposted approved expenses
            unposted = db.query(Expense).filter(
                and_(
                    Expense.org_id == org_id,
                    Expense.status == "approved",
                    Expense.is_posted == False
                )
            ).order_by(desc(Expense.approved_at)).all()
            
            total_amount = sum(float(e.amount) for e in unposted)
            
            # Group by category
            by_category = {}
            for expense in unposted:
                cat = expense.category or "uncategorized"
                if cat not in by_category:
                    by_category[cat] = {"count": 0, "amount": 0}
                by_category[cat]["count"] += 1
                by_category[cat]["amount"] += float(expense.amount)
            
            # Oldest unposted expense
            oldest = min([e.approved_at for e in unposted if e.approved_at], default=None)
            days_oldest = (datetime.utcnow() - oldest).days if oldest else 0
            
            return {
                "unposted_count": len(unposted),
                "total_amount": round(total_amount, 2),
                "by_category": by_category,
                "oldest_days": days_oldest,
                "expenses": [
                    {
                        "id": e.id,
                        "description": e.description,
                        "category": e.category,
                        "amount": float(e.amount),
                        "expense_date": e.expense_date.isoformat() if e.expense_date else None,
                        "approved_at": e.approved_at.isoformat() if e.approved_at else None,
                        "user_id": e.user_id
                    }
                    for e in unposted[:20]  # Limit to 20 for display
                ]
            }
        except Exception as e:
            logger.error(f"Failed to get unposted expenses: {e}")
            return {
                "unposted_count": 0,
                "total_amount": 0,
                "by_category": {},
                "oldest_days": 0,
                "expenses": [],
                "error": str(e)
            }
    
    @staticmethod
    def get_approval_workflows(db: Session, org_id: int) -> Dict[str, Any]:
        """Get expense approval workflow status"""
        try:
            # Get pending expenses by status
            pending_submission = db.query(func.count(Expense.id)).filter(
                and_(
                    Expense.org_id == org_id,
                    Expense.status == "pending",
                    Expense.submitted_at.is_(None)
                )
            ).scalar() or 0
            
            pending_approval = db.query(func.count(Expense.id)).filter(
                and_(
                    Expense.org_id == org_id,
                    Expense.status == "pending",
                    Expense.submitted_at.isnot(None)
                )
            ).scalar() or 0
            
            approved = db.query(func.count(Expense.id)).filter(
                and_(
                    Expense.org_id == org_id,
                    Expense.status == "approved",
                    Expense.is_posted == False
                )
            ).scalar() or 0
            
            rejected = db.query(func.count(Expense.id)).filter(
                and_(
                    Expense.org_id == org_id,
                    Expense.status == "rejected"
                )
            ).scalar() or 0
            
            # Get active workflow steps
            active_workflows = db.query(ExpenseApprovalWorkflow).filter(
                and_(
                    ExpenseApprovalWorkflow.org_id == org_id,
                    ExpenseApprovalWorkflow.status == "pending"
                )
            ).order_by(desc(ExpenseApprovalWorkflow.started_at)).limit(10).all()
            
            # Average approval time
            avg_approval_time = db.query(
                func.avg(
                    func.julianday(Expense.approved_at) - func.julianday(Expense.submitted_at)
                ) * 24  # Convert to hours
            ).filter(
                and_(
                    Expense.org_id == org_id,
                    Expense.status == "approved",
                    Expense.submitted_at.isnot(None),
                    Expense.approved_at.isnot(None)
                )
            ).scalar() or 0
            
            return {
                "pending_submission": pending_submission,
                "pending_approval": pending_approval,
                "approved_unposted": approved,
                "rejected": rejected,
                "total_pending": pending_submission + pending_approval,
                "avg_approval_time_hours": round(avg_approval_time, 1),
                "active_workflows": [
                    {
                        "id": w.id,
                        "expense_id": w.expense_id,
                        "step_name": w.step_name,
                        "assigned_to": w.assigned_to,
                        "started_at": w.started_at.isoformat() if w.started_at else None,
                        "notes": w.notes
                    }
                    for w in active_workflows
                ]
            }
        except Exception as e:
            logger.error(f"Failed to get approval workflows: {e}")
            return {
                "pending_submission": 0,
                "pending_approval": 0,
                "approved_unposted": 0,
                "rejected": 0,
                "total_pending": 0,
                "avg_approval_time_hours": 0,
                "active_workflows": [],
                "error": str(e)
            }
    
    @staticmethod
    def get_receipt_processing_metrics(db: Session, org_id: int) -> Dict[str, Any]:
        """Get receipt processing status and metrics"""
        try:
            # Last 24 hours stats
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            
            processed_24h = db.query(func.count(ExpenseReceipt.id)).filter(
                and_(
                    ExpenseReceipt.org_id == org_id,
                    ExpenseReceipt.ocr_status == "completed",
                    ExpenseReceipt.ocr_processed_at >= twenty_four_hours_ago
                )
            ).scalar() or 0
            
            failed_24h = db.query(func.count(ExpenseReceipt.id)).filter(
                and_(
                    ExpenseReceipt.org_id == org_id,
                    ExpenseReceipt.ocr_status == "failed",
                    ExpenseReceipt.created_at >= twenty_four_hours_ago
                )
            ).scalar() or 0
            
            # Average confidence score for completed receipts
            avg_confidence = db.query(
                func.avg(ExpenseReceipt.ocr_confidence)
            ).filter(
                and_(
                    ExpenseReceipt.org_id == org_id,
                    ExpenseReceipt.ocr_status == "completed",
                    ExpenseReceipt.ocr_processed_at >= twenty_four_hours_ago
                )
            ).scalar() or 0
            
            # Success rate
            total_24h = processed_24h + failed_24h
            success_rate = (processed_24h / total_24h * 100) if total_24h > 0 else 100
            
            # Receipts without expenses (orphaned)
            orphaned_receipts = db.query(func.count(ExpenseReceipt.id)).filter(
                and_(
                    ExpenseReceipt.org_id == org_id,
                    ExpenseReceipt.ocr_status == "completed",
                    ExpenseReceipt.is_posted == False,
                    ~db.query(Expense).filter(
                        Expense.receipt_id == ExpenseReceipt.id
                    ).exists()
                )
            ).scalar() or 0
            
            return {
                "processed_24h": processed_24h,
                "failed_24h": failed_24h,
                "success_rate": round(success_rate, 1),
                "avg_confidence": round(float(avg_confidence) if avg_confidence else 0, 1),
                "orphaned_receipts": orphaned_receipts,
                "ai_insight": ExpensesService._generate_processing_insight(
                    success_rate, 
                    float(avg_confidence) if avg_confidence else 0,
                    orphaned_receipts
                )
            }
        except Exception as e:
            logger.error(f"Failed to get receipt processing metrics: {e}")
            return {
                "processed_24h": 0,
                "failed_24h": 0,
                "success_rate": 0,
                "avg_confidence": 0,
                "orphaned_receipts": 0,
                "ai_insight": None,
                "error": str(e)
            }
    
    # Helper methods for AI insights
    @staticmethod
    def _generate_processing_insight(success_rate: float, avg_confidence: float, orphaned: int) -> Dict[str, str]:
        """Generate AI insight for receipt processing"""
        if success_rate < 70:
            return {
                "type": "critical",
                "message": f"OCR success rate at {success_rate:.1f}% - review failed receipts and consider manual processing"
            }
        elif avg_confidence < 75:
            return {
                "type": "warning",
                "message": f"Average OCR confidence at {avg_confidence:.1f}% - may require manual verification"
            }
        elif orphaned > 10:
            return {
                "type": "warning",
                "message": f"{orphaned} processed receipts without expenses - review and create expense records"
            }
        else:
            return {
                "type": "positive",
                "message": f"Receipt processing healthy - {success_rate:.1f}% success rate with {avg_confidence:.1f}% confidence"
            }
