"""
Telnyx Fax Provider

Integrates the Intelligent Fax System with Telnyx Programmable Fax API.
Uses the same Telnyx account as phone services.

Telnyx Fax API: https://developers.telnyx.com/docs/api/v2/fax
"""

import httpx
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.orm import Session

from core.config import settings
from models.telnyx import TelnyxFaxRecord
from utils.logger import logger


class TelnyxFaxStatus(str, Enum):
    QUEUED = "queued"
    SENDING = "sending"
    DELIVERED = "delivered"
    FAILED = "failed"
    RECEIVED = "received"
    CANCELLED = "cancelled"


@dataclass
class TelnyxFaxResult:
    success: bool
    fax_id: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    pages: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class TelnyxFaxProvider:
    BASE_URL = "https://api.telnyx.com/v2"
    
    def __init__(self, db: Session, org_id: int):
        self.db = db
        self.org_id = org_id
        self.api_key = settings.TELNYX_API_KEY
        self.connection_id = getattr(settings, 'TELNYX_FAX_CONNECTION_ID', None)
        self.from_number = getattr(settings, 'TELNYX_FAX_FROM_NUMBER', None) or getattr(settings, 'TELNYX_FROM_NUMBER', None)
        
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def send_fax(
        self,
        to_number: str,
        media_url: str,
        from_number: Optional[str] = None,
        quality: str = "normal",
        webhook_url: Optional[str] = None,
        client_reference: Optional[str] = None,
        store_media: bool = True
    ) -> TelnyxFaxResult:
        try:
            payload = {
                "to": to_number,
                "media_url": media_url,
                "quality": quality,
                "store_media": store_media
            }
            
            if self.connection_id:
                payload["connection_id"] = self.connection_id
            
            if from_number or self.from_number:
                payload["from"] = from_number or self.from_number
                
            if webhook_url:
                payload["webhook_url"] = webhook_url
                
            if client_reference:
                payload["client_state"] = client_reference
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/faxes",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=30.0
                )
                
            if response.status_code in (200, 201, 202):
                data = response.json().get("data", {})
                
                fax_record = TelnyxFaxRecord(
                    org_id=self.org_id,
                    fax_sid=data.get("id", ""),
                    sender_number=payload.get("from", ""),
                    status=data.get("status", "queued"),
                    fax_metadata={
                        "to": to_number,
                        "media_url": media_url,
                        "direction": "outbound",
                        "quality": quality,
                        "client_reference": client_reference,
                        "telnyx_response": data
                    }
                )
                self.db.add(fax_record)
                self.db.commit()
                
                logger.info(f"Telnyx fax sent: {data.get('id')}")
                
                return TelnyxFaxResult(
                    success=True,
                    fax_id=data.get("id"),
                    status=data.get("status"),
                    pages=data.get("page_count"),
                    metadata=data
                )
            else:
                error_data = response.json()
                error_msg = error_data.get("errors", [{}])[0].get("detail", "Unknown error")
                error_code = error_data.get("errors", [{}])[0].get("code", "unknown")
                
                logger.error(f"Telnyx fax failed: {error_msg}")
                
                return TelnyxFaxResult(
                    success=False,
                    error_message=error_msg,
                    error_code=error_code
                )
                
        except httpx.TimeoutException:
            return TelnyxFaxResult(success=False, error_message="Request timed out", error_code="timeout")
        except Exception as e:
            logger.error(f"Telnyx fax error: {str(e)}")
            return TelnyxFaxResult(success=False, error_message=str(e), error_code="exception")
    
    async def get_fax_status(self, fax_id: str) -> TelnyxFaxResult:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/faxes/{fax_id}",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
            if response.status_code == 200:
                data = response.json().get("data", {})
                return TelnyxFaxResult(
                    success=True,
                    fax_id=data.get("id"),
                    status=data.get("status"),
                    pages=data.get("page_count"),
                    metadata=data
                )
            else:
                return TelnyxFaxResult(success=False, error_message=f"Status check failed: {response.status_code}")
                
        except Exception as e:
            return TelnyxFaxResult(success=False, error_message=str(e))
    
    async def cancel_fax(self, fax_id: str) -> TelnyxFaxResult:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.BASE_URL}/faxes/{fax_id}",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                
            if response.status_code in (200, 204):
                fax_record = self.db.query(TelnyxFaxRecord).filter(
                    TelnyxFaxRecord.fax_sid == fax_id,
                    TelnyxFaxRecord.org_id == self.org_id
                ).first()
                
                if fax_record:
                    fax_record.status = "cancelled"
                    self.db.commit()
                
                return TelnyxFaxResult(success=True, fax_id=fax_id, status="cancelled")
            else:
                return TelnyxFaxResult(success=False, error_message=f"Cancel failed: {response.status_code}")
                
        except Exception as e:
            return TelnyxFaxResult(success=False, error_message=str(e))
    
    def process_webhook(self, webhook_data: Dict[str, Any]) -> TelnyxFaxResult:
        try:
            event_type = webhook_data.get("data", {}).get("event_type", "")
            payload = webhook_data.get("data", {}).get("payload", {})
            fax_id = payload.get("fax_id") or payload.get("id")
            
            logger.info(f"Telnyx fax webhook: {event_type} for {fax_id}")
            
            if event_type in ("fax.queued", "fax.sending", "fax.delivered", "fax.failed"):
                return self._handle_outbound_status(event_type, payload, fax_id)
            elif event_type == "fax.received":
                return self._handle_inbound_fax(payload)
            else:
                return TelnyxFaxResult(success=True, status="ignored", metadata={"event_type": event_type})
                
        except Exception as e:
            logger.error(f"Webhook error: {str(e)}")
            return TelnyxFaxResult(success=False, error_message=str(e))
    
    def _handle_outbound_status(self, event_type: str, payload: Dict[str, Any], fax_id: str) -> TelnyxFaxResult:
        status_map = {
            "fax.queued": "queued",
            "fax.sending": "sending",
            "fax.delivered": "delivered",
            "fax.failed": "failed"
        }
        new_status = status_map.get(event_type, "unknown")
        
        fax_record = self.db.query(TelnyxFaxRecord).filter(TelnyxFaxRecord.fax_sid == fax_id).first()
        
        if fax_record:
            fax_record.status = new_status
            fax_record.fax_metadata = {
                **fax_record.fax_metadata,
                "last_webhook": event_type,
                "last_update": datetime.utcnow().isoformat(),
                "webhook_payload": payload
            }
            
            if event_type == "fax.failed":
                fax_record.fax_metadata["failure_reason"] = payload.get("failure_reason", "Unknown")
                
            self.db.commit()
            
        return TelnyxFaxResult(success=True, fax_id=fax_id, status=new_status, pages=payload.get("page_count"), metadata=payload)
    
    def _handle_inbound_fax(self, payload: Dict[str, Any]) -> TelnyxFaxResult:
        fax_id = payload.get("fax_id") or payload.get("id")
        from_number = payload.get("from", {}).get("phone_number", "")
        to_number = payload.get("to", "")
        media_url = payload.get("media_url", "")
        page_count = payload.get("page_count", 0)
        
        fax_record = TelnyxFaxRecord(
            org_id=self.org_id,
            fax_sid=fax_id,
            sender_number=from_number,
            status="received",
            fax_metadata={
                "direction": "inbound",
                "from": from_number,
                "to": to_number,
                "media_url": media_url,
                "page_count": page_count,
                "received_at": datetime.utcnow().isoformat(),
                "telnyx_payload": payload
            }
        )
        self.db.add(fax_record)
        self.db.commit()
        
        logger.info(f"Inbound fax: {fax_id} from {from_number}")
        
        return TelnyxFaxResult(
            success=True,
            fax_id=fax_id,
            status="received",
            pages=page_count,
            metadata={"from": from_number, "media_url": media_url, "record_id": fax_record.id}
        )
    
    async def download_fax_media(self, media_url: str) -> Optional[bytes]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(media_url, headers=self._get_headers(), timeout=60.0)
                
            if response.status_code == 200:
                return response.content
            return None
        except Exception as e:
            logger.error(f"Download error: {str(e)}")
            return None
    
    def get_fax_history(self, direction: Optional[str] = None, status: Optional[str] = None, limit: int = 50) -> List[TelnyxFaxRecord]:
        query = self.db.query(TelnyxFaxRecord).filter(TelnyxFaxRecord.org_id == self.org_id)
        
        if direction:
            query = query.filter(TelnyxFaxRecord.fax_metadata["direction"].astext == direction)
            
        if status:
            query = query.filter(TelnyxFaxRecord.status == status)
            
        return query.order_by(TelnyxFaxRecord.created_at.desc()).limit(limit).all()
