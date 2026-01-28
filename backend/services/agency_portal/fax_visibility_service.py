"""
Agency-Safe Fax Visibility Service

Provides document request status information to agency portals
without exposing internal fax mechanics, phone numbers, or retry logic.

Maps internal fax states to agency-safe workflow statuses.
"""

from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from models.fax import FaxQueue, FaxLog


class AgencyFaxVisibilityService:
    """
    Service for providing agency-safe fax visibility.
    
    Exposes only workflow status, never fax operational details.
    """
    
    # Mapping from internal fax states to agency-safe states
    STATE_MAPPING = {
        'queued': 'Document Requested',
        'pending': 'Document Requested',
        'sent': 'Waiting on Sender',
        'retrying': 'Waiting on Sender',
        'received': 'Document Received',
        'processing': 'Under Review',
        'completed': 'Complete',
        'failed': 'Document Requested',  # Failed requests revert to requested state
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_document_request_status(
        self, 
        agency_id: str, 
        incident_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Get document request statuses for an agency.
        
        Args:
            agency_id: The agency ID requesting visibility
            incident_id: Optional incident ID to filter by
            
        Returns:
            List of document request statuses with agency-safe information
        """
        query = self.db.query(FaxQueue).filter(
            FaxQueue.agency_id == agency_id
        )
        
        if incident_id:
            query = query.filter(FaxQueue.incident_id == incident_id)
        
        # Only show recent requests (last 90 days)
        query = query.filter(
            FaxQueue.created_at >= datetime.utcnow() - timedelta(days=90)
        )
        
        fax_requests = query.order_by(FaxQueue.created_at.desc()).all()
        
        return [
            self._map_to_agency_safe_status(fax_request)
            for fax_request in fax_requests
        ]
    
    def _map_to_agency_safe_status(self, fax_request: FaxQueue) -> Dict:
        """
        Map internal fax request to agency-safe status.
        
        Args:
            fax_request: Internal fax queue entry
            
        Returns:
            Agency-safe status dictionary
        """
        # Map internal state to agency-safe state
        agency_status = self.STATE_MAPPING.get(
            fax_request.status,
            'Document Requested'
        )
        
        # Determine recipient role (never expose actual fax number or identity)
        recipient_role = self._get_recipient_role(fax_request)
        
        return {
            'id': str(fax_request.id),
            'incident_id': fax_request.incident_id,
            'documentType': fax_request.document_type or 'Medical Documentation',
            'requestedAt': fax_request.created_at.isoformat(),
            'status': agency_status,
            'recipientRole': recipient_role,
            # Explicitly exclude:
            # - fax_number
            # - retry_count
            # - attempt_timing
            # - error_messages
            # - internal_notes
        }
    
    def _get_recipient_role(self, fax_request: FaxQueue) -> str:
        """
        Get agency-safe recipient role description.
        
        Args:
            fax_request: Internal fax queue entry
            
        Returns:
            Generic role description (e.g., "Hospital", "Physician Office")
        """
        # Map recipient type to generic role
        recipient_type = fax_request.recipient_type or 'unknown'
        
        role_mapping = {
            'hospital': 'Hospital',
            'facility': 'Medical Facility',
            'physician': 'Physician Office',
            'payer': 'Insurance Payer',
            'lab': 'Laboratory',
            'imaging': 'Imaging Center',
            'pharmacy': 'Pharmacy',
            'unknown': 'Healthcare Provider'
        }
        
        return role_mapping.get(recipient_type.lower(), 'Healthcare Provider')
    
    def get_pending_document_count(self, agency_id: str, incident_id: str) -> int:
        """
        Get count of pending document requests for an incident.
        
        Args:
            agency_id: The agency ID
            incident_id: The incident ID
            
        Returns:
            Count of pending document requests
        """
        pending_states = ['queued', 'pending', 'sent', 'retrying', 'processing']
        
        count = self.db.query(FaxQueue).filter(
            FaxQueue.agency_id == agency_id,
            FaxQueue.incident_id == incident_id,
            FaxQueue.status.in_(pending_states)
        ).count()
        
        return count
    
    def get_completed_document_count(self, agency_id: str, incident_id: str) -> int:
        """
        Get count of completed document requests for an incident.
        
        Args:
            agency_id: The agency ID
            incident_id: The incident ID
            
        Returns:
            Count of completed document requests
        """
        count = self.db.query(FaxQueue).filter(
            FaxQueue.agency_id == agency_id,
            FaxQueue.incident_id == incident_id,
            FaxQueue.status == 'completed'
        ).count()
        
        return count


from datetime import timedelta
