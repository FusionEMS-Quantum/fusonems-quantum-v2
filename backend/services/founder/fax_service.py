"""
Founder Fax Service - Healthcare Fax Integration

Provides:
1. Send/receive fax functionality
2. SRFax, Twilio Fax, or similar provider integration
3. Fax status tracking and webhooks
4. Cover page generation
5. Failed fax retry logic
6. Healthcare-compliant fax workflows
"""

import base64
import io
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, BinaryIO
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc

from models.fax import FaxRecord, FaxAttachment
from models.user import User
from models.organization import Organization
from utils.logger import logger
from utils.write_ops import audit_and_event
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch


class FounderFaxService:
    """Complete fax service for healthcare communications"""
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self.provider = "srfax"  # Default provider
        self.api_key = None
        self.fax_number = None
        
        # Initialize org-specific settings
        self._initialize_org_settings()
    
    def _initialize_org_settings(self):
        """Load organization fax configuration"""
        org = self.db.query(Organization).get(self.org_id)
        if org and hasattr(org, 'fax_settings') and org.fax_settings:
            self.provider = org.fax_settings.get('provider', 'srfax')
            self.api_key = org.fax_settings.get('api_key')
            self.fax_number = org.fax_settings.get('fax_number')
    
    # DASHBOARD STATISTICS
    
    def get_fax_stats(self) -> Dict[str, Any]:
        """Get fax statistics for founder dashboard"""
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        
        # Sent today
        sent_today = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.direction == 'outbound',
            FaxRecord.created_at >= twenty_four_hours_ago
        ).count()
        
        # Received today
        received_today = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.direction == 'inbound',
            FaxRecord.created_at >= twenty_four_hours_ago
        ).count()
        
        # Failed in last 24h
        failed_count = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.created_at >= twenty_four_hours_ago,
            FaxRecord.status == 'failed'
        ).count()
        
        # Pending/sending
        pending_count = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.status.in_(['queued', 'sending'])
        ).count()
        
        # Weekly volume
        weekly_volume = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.created_at >= one_week_ago
        ).count()
        
        # Success rate (last 7 days)
        total_sent = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.direction == 'outbound',
            FaxRecord.created_at >= one_week_ago
        ).count()
        
        successful_sent = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.direction == 'outbound',
            FaxRecord.status == 'delivered',
            FaxRecord.created_at >= one_week_ago
        ).count()
        
        success_rate = round((successful_sent / total_sent) * 100, 1) if total_sent > 0 else 0
        
        return {
            'sent_today': sent_today,
            'received_today': received_today,
            'failed_24h': failed_count,
            'pending': pending_count,
            'weekly_volume': weekly_volume,
            'success_rate': success_rate,
            'provider_status': 'active' if self.api_key else 'needs_setup'
        }
    
    # INBOX/OUTBOX
    
    def get_inbox(self, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Get received faxes"""
        faxes = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.direction == 'inbound'
        ).order_by(desc(FaxRecord.created_at)).limit(limit).offset(offset).all()
        
        return [self._serialize_fax(fax) for fax in faxes]
    
    def get_outbox(self, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Get sent faxes"""
        faxes = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.direction == 'outbound'
        ).order_by(desc(FaxRecord.created_at)).limit(limit).offset(offset).all()
        
        return [self._serialize_fax(fax) for fax in faxes]
    
    def get_recent_faxes(self, limit: int = 15) -> List[Dict[str, Any]]:
        """Get recent fax activity"""
        faxes = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id
        ).order_by(desc(FaxRecord.created_at)).limit(limit).all()
        
        return [self._serialize_fax(fax) for fax in faxes]
    
    def get_failed_faxes(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get failed faxes that need attention"""
        faxes = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.status == 'failed',
            FaxRecord.retry_count < FaxRecord.max_retries
        ).order_by(desc(FaxRecord.created_at)).limit(limit).all()
        
        return [self._serialize_fax(fax) for fax in faxes]
    
    def get_fax_by_id(self, fax_id: int) -> Optional[Dict[str, Any]]:
        """Get fax details by ID"""
        fax = self.db.query(FaxRecord).filter(
            FaxRecord.id == fax_id,
            FaxRecord.org_id == self.org_id
        ).first()
        
        if not fax:
            return None
        
        # Include attachments
        attachments = self.db.query(FaxAttachment).filter(
            FaxAttachment.fax_id == fax_id
        ).all()
        
        result = self._serialize_fax(fax)
        result['attachments'] = [self._serialize_attachment(att) for att in attachments]
        
        return result
    
    # SEND FAX
    
    def send_fax(
        self,
        recipient_number: str,
        recipient_name: str = "",
        document_data: Optional[bytes] = None,
        document_url: Optional[str] = None,
        cover_page: Optional[Dict[str, str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Send a fax"""
        
        # Create fax record
        fax = FaxRecord(
            org_id=self.org_id,
            direction='outbound',
            status='queued',
            sender_number=self.fax_number or "",
            recipient_number=recipient_number,
            recipient_name=recipient_name,
            provider=self.provider,
            queued_at=datetime.utcnow(),
            created_by=user_id
        )
        
        # Handle cover page
        if cover_page:
            fax.has_cover_page = True
            fax.cover_page_subject = cover_page.get('subject', '')
            fax.cover_page_message = cover_page.get('message', '')
            fax.cover_page_from = cover_page.get('from_name', '')
            fax.cover_page_to = cover_page.get('to_name', recipient_name)
        
        # Store document
        if document_data:
            fax.document_url = self._store_document(document_data, fax.id)
            fax.document_size_bytes = len(document_data)
        elif document_url:
            fax.document_url = document_url
        
        self.db.add(fax)
        self.db.commit()
        self.db.refresh(fax)
        
        # Store attachments
        if attachments:
            for att_data in attachments:
                attachment = FaxAttachment(
                    org_id=self.org_id,
                    fax_id=fax.id,
                    filename=att_data.get('filename', 'attachment.pdf'),
                    original_filename=att_data.get('original_filename', ''),
                    content_type=att_data.get('content_type', 'application/pdf'),
                    size_bytes=att_data.get('size_bytes', 0),
                    file_url=att_data.get('file_url', ''),
                    created_by=user_id
                )
                self.db.add(attachment)
        
        self.db.commit()
        
        # Send to provider
        try:
            provider_result = self._send_to_provider(fax)
            
            fax.status = 'sending'
            fax.sent_at = datetime.utcnow()
            fax.provider_fax_id = provider_result.get('fax_id', '')
            fax.provider_status = provider_result.get('status', '')
            fax.provider_response = provider_result
            
            self.db.commit()
            
            logger.info(f"Fax {fax.id} sent to provider, tracking ID: {fax.provider_fax_id}")
            
            return {
                'success': True,
                'fax_id': fax.id,
                'status': fax.status,
                'provider_fax_id': fax.provider_fax_id
            }
            
        except Exception as e:
            logger.error(f"Failed to send fax {fax.id}: {e}")
            
            fax.status = 'failed'
            fax.failed_at = datetime.utcnow()
            fax.error_message = str(e)
            self.db.commit()
            
            return {
                'success': False,
                'fax_id': fax.id,
                'error': str(e)
            }
    
    # RETRY FAILED
    
    def retry_fax(self, fax_id: int, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Retry a failed fax"""
        fax = self.db.query(FaxRecord).filter(
            FaxRecord.id == fax_id,
            FaxRecord.org_id == self.org_id
        ).first()
        
        if not fax:
            return {'success': False, 'error': 'Fax not found'}
        
        if fax.status != 'failed':
            return {'success': False, 'error': 'Fax is not in failed state'}
        
        if fax.retry_count >= fax.max_retries:
            return {'success': False, 'error': 'Max retries reached'}
        
        # Reset status
        fax.status = 'queued'
        fax.retry_count += 1
        fax.queued_at = datetime.utcnow()
        fax.error_message = ""
        fax.error_code = ""
        
        self.db.commit()
        
        # Retry send
        try:
            provider_result = self._send_to_provider(fax)
            
            fax.status = 'sending'
            fax.sent_at = datetime.utcnow()
            fax.provider_fax_id = provider_result.get('fax_id', '')
            fax.provider_response = provider_result
            
            self.db.commit()
            
            logger.info(f"Fax {fax.id} retry successful, attempt {fax.retry_count}")
            
            return {
                'success': True,
                'fax_id': fax.id,
                'retry_count': fax.retry_count,
                'status': fax.status
            }
            
        except Exception as e:
            logger.error(f"Fax {fax.id} retry failed: {e}")
            
            fax.status = 'failed'
            fax.failed_at = datetime.utcnow()
            fax.error_message = str(e)
            self.db.commit()
            
            return {
                'success': False,
                'fax_id': fax.id,
                'error': str(e)
            }
    
    # DELETE FAX
    
    def delete_fax(self, fax_id: int) -> bool:
        """Delete a fax record"""
        fax = self.db.query(FaxRecord).filter(
            FaxRecord.id == fax_id,
            FaxRecord.org_id == self.org_id
        ).first()
        
        if not fax:
            return False
        
        # Delete attachments first
        self.db.query(FaxAttachment).filter(
            FaxAttachment.fax_id == fax_id
        ).delete()
        
        # Delete fax
        self.db.delete(fax)
        self.db.commit()
        
        logger.info(f"Fax {fax_id} deleted")
        return True
    
    # WEBHOOK HANDLING
    
    def handle_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming fax webhook from provider"""
        
        if self.provider == 'srfax':
            return self._handle_srfax_webhook(payload)
        elif self.provider == 'twilio':
            return self._handle_twilio_webhook(payload)
        else:
            logger.warning(f"Unknown fax provider: {self.provider}")
            return {'success': False, 'error': 'Unknown provider'}
    
    def _handle_srfax_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle SRFax webhook"""
        
        action = payload.get('action')
        
        if action == 'receive':
            # Incoming fax
            return self._process_inbound_fax(payload)
        
        elif action == 'status':
            # Status update for outbound fax
            return self._update_fax_status(payload)
        
        return {'success': True, 'action': action}
    
    def _handle_twilio_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Twilio Fax webhook"""
        
        # Twilio uses FaxStatus parameter
        status = payload.get('FaxStatus')
        fax_sid = payload.get('FaxSid')
        
        if not fax_sid:
            return {'success': False, 'error': 'Missing FaxSid'}
        
        # Find fax by provider ID
        fax = self.db.query(FaxRecord).filter(
            FaxRecord.provider_fax_id == fax_sid
        ).first()
        
        if not fax:
            # Could be new inbound fax
            if status == 'received':
                return self._process_inbound_fax(payload)
            return {'success': False, 'error': 'Fax not found'}
        
        # Update status
        if status == 'delivered':
            fax.status = 'delivered'
            fax.delivered_at = datetime.utcnow()
        elif status == 'failed':
            fax.status = 'failed'
            fax.failed_at = datetime.utcnow()
            fax.error_message = payload.get('ErrorCode', 'Unknown error')
        
        fax.provider_status = status
        fax.provider_response = payload
        
        self.db.commit()
        
        return {'success': True, 'fax_id': fax.id, 'status': fax.status}
    
    def _process_inbound_fax(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process an incoming fax"""
        
        # Create fax record for inbound
        fax = FaxRecord(
            org_id=self.org_id,
            direction='inbound',
            status='received',
            sender_number=payload.get('from_number', payload.get('From', '')),
            sender_name=payload.get('from_name', ''),
            recipient_number=payload.get('to_number', payload.get('To', self.fax_number)),
            page_count=int(payload.get('pages', payload.get('NumPages', 0))),
            provider=self.provider,
            provider_fax_id=payload.get('fax_id', payload.get('FaxSid', '')),
            provider_status='received',
            provider_response=payload,
            document_url=payload.get('document_url', payload.get('MediaUrl', '')),
            created_at=datetime.utcnow()
        )
        
        self.db.add(fax)
        self.db.commit()
        self.db.refresh(fax)
        
        logger.info(f"Inbound fax received: {fax.id} from {fax.sender_number}")
        
        return {'success': True, 'fax_id': fax.id}
    
    def _update_fax_status(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Update fax status from webhook"""
        
        provider_fax_id = payload.get('fax_id', '')
        
        fax = self.db.query(FaxRecord).filter(
            FaxRecord.provider_fax_id == provider_fax_id
        ).first()
        
        if not fax:
            return {'success': False, 'error': 'Fax not found'}
        
        status = payload.get('status', '').lower()
        
        if status in ['delivered', 'success']:
            fax.status = 'delivered'
            fax.delivered_at = datetime.utcnow()
        elif status in ['failed', 'error']:
            fax.status = 'failed'
            fax.failed_at = datetime.utcnow()
            fax.error_message = payload.get('error_message', 'Unknown error')
            fax.error_code = payload.get('error_code', '')
        
        fax.provider_status = status
        fax.provider_response = payload
        
        self.db.commit()
        
        return {'success': True, 'fax_id': fax.id, 'status': fax.status}
    
    # COVER PAGE GENERATION
    
    def generate_cover_page(
        self,
        to_name: str,
        to_number: str,
        from_name: str,
        from_number: str,
        subject: str,
        message: str,
        page_count: int = 1
    ) -> bytes:
        """Generate a PDF cover page for fax"""
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 24)
        c.drawString(1 * inch, height - 1 * inch, "FAX COVER SHEET")
        
        # Divider line
        c.line(1 * inch, height - 1.3 * inch, width - 1 * inch, height - 1.3 * inch)
        
        # To section
        y = height - 2 * inch
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, y, "TO:")
        c.setFont("Helvetica", 12)
        c.drawString(2 * inch, y, to_name)
        
        y -= 0.3 * inch
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, y, "FAX:")
        c.setFont("Helvetica", 12)
        c.drawString(2 * inch, y, to_number)
        
        # From section
        y -= 0.6 * inch
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, y, "FROM:")
        c.setFont("Helvetica", 12)
        c.drawString(2 * inch, y, from_name)
        
        y -= 0.3 * inch
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, y, "FAX:")
        c.setFont("Helvetica", 12)
        c.drawString(2 * inch, y, from_number)
        
        # Subject
        y -= 0.6 * inch
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, y, "SUBJECT:")
        c.setFont("Helvetica", 12)
        c.drawString(2 * inch, y, subject)
        
        # Pages
        y -= 0.3 * inch
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, y, "PAGES:")
        c.setFont("Helvetica", 12)
        c.drawString(2 * inch, y, f"{page_count} (including cover)")
        
        # Date
        y -= 0.3 * inch
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, y, "DATE:")
        c.setFont("Helvetica", 12)
        c.drawString(2 * inch, y, datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))
        
        # Message
        y -= 0.6 * inch
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, y, "MESSAGE:")
        
        y -= 0.3 * inch
        c.setFont("Helvetica", 11)
        
        # Wrap message text
        message_lines = self._wrap_text(message, 70)
        for line in message_lines:
            c.drawString(1 * inch, y, line)
            y -= 0.2 * inch
            if y < 1 * inch:
                break
        
        # Footer - Confidentiality notice
        c.setFont("Helvetica-Oblique", 8)
        footer_text = (
            "CONFIDENTIALITY NOTICE: This fax contains confidential information protected by HIPAA. "
            "If you are not the intended recipient, any disclosure, copying, distribution or use of this information is strictly prohibited. "
            "Please notify the sender immediately and destroy all copies."
        )
        footer_lines = self._wrap_text(footer_text, 100)
        y = 1 * inch
        for line in footer_lines:
            c.drawString(1 * inch, y, line)
            y -= 0.15 * inch
        
        c.showPage()
        c.save()
        
        buffer.seek(0)
        return buffer.read()
    
    # HELPER METHODS
    
    def _send_to_provider(self, fax: FaxRecord) -> Dict[str, Any]:
        """Send fax to provider API"""
        
        if self.provider == 'srfax':
            return self._send_via_srfax(fax)
        elif self.provider == 'twilio':
            return self._send_via_twilio(fax)
        else:
            raise Exception(f"Unsupported fax provider: {self.provider}")
    
    def _send_via_srfax(self, fax: FaxRecord) -> Dict[str, Any]:
        """Send fax via SRFax API"""
        
        # TODO: Implement actual SRFax API integration
        # This is a placeholder for the actual implementation
        
        logger.info(f"Sending fax {fax.id} via SRFax to {fax.recipient_number}")
        
        # Mock response for now
        return {
            'fax_id': f'srfax_{fax.id}_{int(datetime.utcnow().timestamp())}',
            'status': 'queued',
            'message': 'Fax queued successfully'
        }
    
    def _send_via_twilio(self, fax: FaxRecord) -> Dict[str, Any]:
        """Send fax via Twilio Fax API"""
        
        # TODO: Implement actual Twilio Fax API integration
        # This is a placeholder for the actual implementation
        
        logger.info(f"Sending fax {fax.id} via Twilio to {fax.recipient_number}")
        
        # Mock response for now
        return {
            'fax_id': f'FX{fax.id}{int(datetime.utcnow().timestamp())}',
            'status': 'queued',
            'message': 'Fax queued successfully'
        }
    
    def _store_document(self, data: bytes, fax_id: int) -> str:
        """Store fax document (placeholder - integrate with actual storage)"""
        # TODO: Integrate with document storage service
        return f"/fax/documents/{fax_id}.pdf"
    
    def _serialize_fax(self, fax: FaxRecord) -> Dict[str, Any]:
        """Serialize fax record to dict"""
        return {
            'id': fax.id,
            'direction': fax.direction,
            'status': fax.status,
            'sender_number': fax.sender_number,
            'sender_name': fax.sender_name,
            'recipient_number': fax.recipient_number,
            'recipient_name': fax.recipient_name,
            'page_count': fax.page_count,
            'has_cover_page': fax.has_cover_page,
            'document_url': fax.document_url,
            'document_filename': fax.document_filename,
            'provider': fax.provider,
            'provider_fax_id': fax.provider_fax_id,
            'retry_count': fax.retry_count,
            'max_retries': fax.max_retries,
            'error_message': fax.error_message,
            'created_at': fax.created_at.isoformat() if fax.created_at else None,
            'sent_at': fax.sent_at.isoformat() if fax.sent_at else None,
            'delivered_at': fax.delivered_at.isoformat() if fax.delivered_at else None,
            'failed_at': fax.failed_at.isoformat() if fax.failed_at else None,
        }
    
    def _serialize_attachment(self, attachment: FaxAttachment) -> Dict[str, Any]:
        """Serialize attachment to dict"""
        return {
            'id': attachment.id,
            'filename': attachment.filename,
            'content_type': attachment.content_type,
            'size_bytes': attachment.size_bytes,
            'file_url': attachment.file_url,
            'page_count': attachment.page_count,
            'created_at': attachment.created_at.isoformat() if attachment.created_at else None,
        }
    
    def _wrap_text(self, text: str, max_chars: int) -> List[str]:
        """Wrap text to fit within max characters per line"""
        words = text.split()
        lines = []
        current_line = []
        current_length = 0
        
        for word in words:
            if current_length + len(word) + 1 <= max_chars:
                current_line.append(word)
                current_length += len(word) + 1
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
                current_length = len(word)
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return lines
