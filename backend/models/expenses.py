import uuid
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Numeric, func

from core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class ExpenseReceipt(Base):
    """Receipt/document for expense tracking"""
    __tablename__ = "expense_receipts"

    id = Column(String, primary_key=True, default=_uuid)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # OCR Processing
    ocr_status = Column(String, default="pending")  # pending, processing, completed, failed
    ocr_confidence = Column(Numeric(5, 2), default=0.0)
    ocr_error = Column(String, default="")
    ocr_retry_count = Column(Integer, default=0)
    ocr_processed_at = Column(DateTime(timezone=True))
    
    # Receipt data (from OCR or manual entry)
    vendor_name = Column(String, default="")
    receipt_date = Column(DateTime(timezone=True))
    total_amount = Column(Numeric(10, 2), default=0.0)
    currency = Column(String, default="USD")
    category = Column(String, default="")  # travel, supplies, fuel, etc.
    
    # Storage
    file_path = Column(String, default="")
    file_type = Column(String, default="")
    file_size = Column(Integer, default=0)
    
    # OCR extracted fields
    ocr_raw_text = Column(String, default="")
    ocr_fields = Column(JSON, default=dict)
    
    # Status
    is_posted = Column(Boolean, default=False)
    posted_at = Column(DateTime(timezone=True))
    
    # Metadata
    meta_data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Expense(Base):
    """Expense record for tracking and approval"""
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=_uuid)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receipt_id = Column(String, ForeignKey("expense_receipts.id"), nullable=True)
    
    # Expense details
    description = Column(String, default="")
    category = Column(String, default="")
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String, default="USD")
    expense_date = Column(DateTime(timezone=True), nullable=False)
    
    # Approval workflow
    status = Column(String, default="pending")  # pending, approved, rejected, posted
    submitted_at = Column(DateTime(timezone=True))
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True))
    rejection_reason = Column(String, default="")
    
    # Posting
    is_posted = Column(Boolean, default=False)
    posted_at = Column(DateTime(timezone=True))
    posted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Reference
    reference_type = Column(String, default="")  # incident, transport, mission, etc.
    reference_id = Column(String, default="")
    
    # Metadata
    meta_data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ExpenseApprovalWorkflow(Base):
    """Workflow tracking for expense approvals"""
    __tablename__ = "expense_approval_workflows"

    id = Column(String, primary_key=True, default=_uuid)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    expense_id = Column(String, ForeignKey("expenses.id"), nullable=False, index=True)
    
    # Workflow step
    step_name = Column(String, nullable=False)  # submitted, manager_review, finance_review, posted
    status = Column(String, default="pending")  # pending, completed, rejected
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timeline
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Notes
    notes = Column(String, default="")
    
    # Metadata
    meta_data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
