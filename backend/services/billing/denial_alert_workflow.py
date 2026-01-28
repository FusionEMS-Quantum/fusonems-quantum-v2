"""
Denial Alert Workflow
High-impact (>$1000) vs soft denials with sound alerts
Founder approval required for major actions
"""
from datetime import datetime
from typing import Dict, List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session

from models.payment_resolution import DenialAppeal, DenialReason
from models.compliance import AccessAudit
from utils.logger import logger


# LOCKED THRESHOLDS - Founder approval required to change
HIGH_IMPACT_THRESHOLD = Decimal('1000.00')
URGENT_PRIORITY_REASONS = [
    'medical_necessity',
    'authorization_required',
    'timely_filing',
    'invalid_diagnosis'
]


class DenialAlertWorkflow:
    """
    Automated denial classification and alert system.
    FREE - No paid integrations, uses rule-based logic.
    """
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
    
    def classify_denial(self, denial: DenialAppeal) -> Dict:
        """
        Classify denial as high-impact or soft.
        Returns classification and recommended actions.
        """
        amount = Decimal(str(denial.denial_amount))
        reason = denial.denial_reason.lower() if denial.denial_reason else ''
        
        # Determine severity
        is_high_impact = amount >= HIGH_IMPACT_THRESHOLD
        is_urgent_reason = any(
            urgent in reason 
            for urgent in URGENT_PRIORITY_REASONS
        )
        
        # Classification logic
        if is_high_impact and is_urgent_reason:
            severity = 'critical'
            alert_type = 'denial-urgent'
            priority = 'high'
        elif is_high_impact:
            severity = 'high'
            alert_type = 'denial-urgent'
            priority = 'high'
        elif is_urgent_reason:
            severity = 'medium'
            alert_type = 'denial-soft'
            priority = 'medium'
        else:
            severity = 'low'
            alert_type = 'denial-soft'
            priority = 'low'
        
        # Recommended actions
        actions = self._get_recommended_actions(
            denial, severity, is_high_impact, is_urgent_reason
        )
        
        return {
            'denial_id': denial.id,
            'severity': severity,
            'alert_type': alert_type,
            'priority': priority,
            'amount': float(amount),
            'reason': denial.denial_reason,
            'is_high_impact': is_high_impact,
            'is_urgent_reason': is_urgent_reason,
            'requires_founder_approval': is_high_impact,
            'recommended_actions': actions,
            'classification_timestamp': datetime.utcnow().isoformat()
        }
    
    def _get_recommended_actions(
        self, 
        denial: DenialAppeal, 
        severity: str, 
        is_high_impact: bool, 
        is_urgent_reason: bool
    ) -> List[Dict]:
        """Generate recommended actions based on denial characteristics."""
        actions = []
        
        if is_high_impact:
            actions.append({
                'action': 'Review with Founder',
                'reason': 'High-impact denial requires founder attention',
                'required': True,
                'estimated_time': '15 min'
            })
        
        if is_urgent_reason:
            actions.append({
                'action': 'Immediate appeal preparation',
                'reason': 'Time-sensitive denial reason',
                'required': True,
                'estimated_time': '30 min'
            })
        
        # Always recommend documentation review
        actions.append({
            'action': 'Review claim documentation',
            'reason': 'Verify all required documents are present',
            'required': False,
            'estimated_time': '10 min'
        })
        
        # Check if appeal is worth pursuing
        if denial.denial_amount > 100:
            actions.append({
                'action': 'Cost-benefit analysis',
                'reason': 'Determine if appeal cost is justified',
                'required': False,
                'estimated_time': '5 min'
            })
        
        return actions
    
    def process_new_denial(self, denial: DenialAppeal, notify: bool = True) -> Dict:
        """
        Process a new denial through the workflow.
        
        Args:
            denial: DenialAppeal object to process
            notify: Send notifications (desktop + sound)
        
        Returns:
            Processing result with classification and actions
        """
        logger.info(f"Processing denial {denial.id}: ${denial.denial_amount}")
        
        # Classify denial
        classification = self.classify_denial(denial)
        
        # Update denial with classification
        denial.priority = classification['priority']
        denial.severity = classification['severity']
        denial.requires_founder_review = classification['requires_founder_approval']
        
        self.db.commit()
        
        # Log classification
        audit = AccessAudit(
            org_id=self.org_id,
            resource_type='denial_appeal',
            resource_id=denial.id,
            action='classified',
            user_id=None,
            metadata={
                'severity': classification['severity'],
                'priority': classification['priority'],
                'amount': classification.get('amount', 0),
                'auto_classified': True
            },
            timestamp=datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()
        
        result = {
            'status': 'processed',
            'denial_id': denial.id,
            'classification': classification,
            'notification_sent': notify,
            'notification_type': classification['alert_type']
        }
        
        logger.info(
            f"Denial {denial.id} classified as {classification['severity']} "
            f"(${classification['amount']}, {classification['priority']} priority)"
        )
        
        return result
    
    def get_pending_high_impact_denials(self) -> List[Dict]:
        """
        Get all high-impact denials pending founder review.
        Used for founder dashboard.
        """
        denials = self.db.query(Denial).filter(
            Denial.org_id == self.org_id,
            Denial.denial_amount >= float(HIGH_IMPACT_THRESHOLD),
            Denial.status.in_(['new', 'pending']),
            Denial.requires_founder_review == True
        ).order_by(Denial.denial_date.desc()).all()
        
        return [self._format_denial_summary(d) for d in denials]
    
    def get_aging_denials(self, days_threshold: int = 30) -> List[Dict]:
        """
        Get denials older than threshold that need attention.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_threshold)
        
        denials = self.db.query(Denial).filter(
            Denial.org_id == self.org_id,
            Denial.denial_date <= cutoff_date,
            Denial.status != 'resolved'
        ).order_by(Denial.denial_date).all()
        
        return [self._format_denial_summary(d) for d in denials]
    
    def _format_denial_summary(self, denial: DenialAppeal) -> Dict:
        """Format denial for API response."""
        days_old = (datetime.utcnow().date() - denial.denial_date.date()).days
        
        return {
            'id': denial.id,
            'claim_id': denial.claim_id,
            'patient_name': denial.patient_name or 'Unknown',
            'payer': denial.payer_name or 'Unknown',
            'amount': float(denial.denial_amount),
            'reason': denial.denial_reason,
            'denial_date': denial.denial_date.isoformat() if denial.denial_date else None,
            'days_old': days_old,
            'severity': denial.severity or 'unknown',
            'priority': denial.priority or 'medium',
            'status': denial.status,
            'requires_founder_review': denial.requires_founder_review or False,
            'is_high_impact': denial.denial_amount >= float(HIGH_IMPACT_THRESHOLD)
        }
    
    def founder_approve_appeal(
        self, 
        denial_id: int, 
        founder_id: int, 
        notes: str = ''
    ) -> Dict:
        """
        Founder approves appeal for high-impact denial.
        Required for denials >$1000.
        """
        denial = self.db.query(Denial).filter(
            Denial.id == denial_id,
            Denial.org_id == self.org_id
        ).first()
        
        if not denial:
            return {'status': 'error', 'message': 'Denial not found'}
        
        # Update denial status
        denial.status = 'appeal_approved'
        denial.founder_approved = True
        denial.founder_id = founder_id
        denial.founder_notes = notes
        denial.approved_at = datetime.utcnow()
        
        self.db.commit()
        
        # Audit log
        audit = AccessAudit(
            org_id=self.org_id,
            resource_type='denial_appeal',
            resource_id=denial_id,
            action='founder_approved_appeal',
            user_id=founder_id,
            metadata={
                'amount': float(denial.total_charge_cents / 100) if hasattr(denial, 'total_charge_cents') else 0,
                'notes': notes,
                'policy': 'founder_approval_required_over_1000'
            },
            timestamp=datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()
        
        logger.info(f"Founder approved appeal for denial {denial_id} (${denial.denial_amount})")
        
        return {
            'status': 'approved',
            'denial_id': denial_id,
            'approved_by': founder_id,
            'approved_at': denial.approved_at.isoformat(),
            'next_step': 'submit_appeal'
        }
    
    def founder_reject_appeal(
        self, 
        denial_id: int, 
        founder_id: int, 
        reason: str = ''
    ) -> Dict:
        """
        Founder rejects appeal (write-off or alternative action).
        """
        denial = self.db.query(Denial).filter(
            Denial.id == denial_id,
            Denial.org_id == self.org_id
        ).first()
        
        if not denial:
            return {'status': 'error', 'message': 'Denial not found'}
        
        # Update denial status
        denial.status = 'appeal_rejected'
        denial.founder_approved = False
        denial.founder_id = founder_id
        denial.founder_notes = reason
        denial.reviewed_at = datetime.utcnow()
        
        self.db.commit()
        
        # Audit log
        audit = AccessAudit(
            org_id=self.org_id,
            resource_type='denial_appeal',
            resource_id=denial_id,
            action='founder_rejected_appeal',
            user_id=founder_id,
            metadata={
                'amount': float(denial.total_charge_cents / 100) if hasattr(denial, 'total_charge_cents') else 0,
                'reason': reason,
                'policy': 'founder_decision_required'
            },
            timestamp=datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()
        
        logger.info(f"Founder rejected appeal for denial {denial_id}: {reason}")
        
        return {
            'status': 'rejected',
            'denial_id': denial_id,
            'reviewed_by': founder_id,
            'reviewed_at': denial.reviewed_at.isoformat(),
            'next_step': 'consider_writeoff'
        }


from datetime import timedelta
