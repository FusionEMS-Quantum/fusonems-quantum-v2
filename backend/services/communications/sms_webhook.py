"""
SMS Delivery Tracking Webhook Handler
Processes Telnyx SMS delivery status updates (FREE - included in plan)
"""
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import update

from core.database import get_db
from models.communications import CommsMessage
from utils.logger import logger

router = APIRouter(prefix="/api/communications/sms", tags=["SMS Tracking"])


@router.post("/webhook")
async def telnyx_sms_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Telnyx SMS delivery status webhook (FREE).
    
    Events handled:
    - message.sent: SMS sent to carrier
    - message.delivered: SMS delivered to recipient  
    - message.finalized: Final status (delivered, failed, etc)
    
    Updates delivery_status in comms_messages table.
    """
    try:
        body = await request.json()
        event_type = body.get('data', {}).get('event_type', '')
        payload = body.get('data', {}).get('payload', {})
        
        # Extract message ID and status
        message_id = payload.get('id')
        to_numbers = payload.get('to', [])
        from_number = payload.get('from', {}).get('phone_number', '')
        completed_at = payload.get('completed_at')
        
        if not message_id:
            return {"status": "ignored", "reason": "no_message_id"}
        
        logger.info(f"SMS webhook: {event_type} for message {message_id}")
        
        # Determine delivery status
        delivery_status = "unknown"
        if event_type == "message.sent":
            delivery_status = "sent"
        elif event_type == "message.delivered":
            delivery_status = "delivered"
        elif event_type == "message.finalized":
            # Check final status from first recipient
            if to_numbers and len(to_numbers) > 0:
                status = to_numbers[0].get('status', 'unknown')
                delivery_status = status  # delivered, failed, undelivered, etc
        
        # Find message by provider_message_id
        msg = db.query(CommsMessage).filter(
            CommsMessage.provider_message_id == message_id
        ).first()
        
        if msg:
            # Update delivery status and timestamps
            update_data = {"delivery_status": delivery_status}
            
            if event_type == "message.sent" and not msg.sent_at:
                update_data["sent_at"] = datetime.utcnow()
            
            if event_type == "message.delivered" and not msg.delivered_at:
                update_data["delivered_at"] = datetime.utcnow()
            
            # Update the record
            db.query(CommsMessage).filter(
                CommsMessage.id == msg.id
            ).update(update_data)
            db.commit()
            
            logger.info(f"Updated SMS {msg.id}: {delivery_status}")
            
            return {
                "status": "ok",
                "event_type": event_type,
                "message_id": message_id,
                "delivery_status": delivery_status,
                "message_record_id": msg.id
            }
        else:
            # Message not found - log for debugging
            logger.warning(f"SMS webhook: message not found for provider ID {message_id}")
            return {
                "status": "not_found",
                "message_id": message_id,
                "note": "Message record not found - may not have been created yet"
            }
            
    except Exception as e:
        logger.error(f"SMS webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.get("/delivery-status/{message_id}")
def get_sms_delivery_status(
    message_id: int,
    db: Session = Depends(get_db)
):
    """
    Get delivery status for a specific SMS.
    Available to: Founder, staff with permission
    """
    msg = db.query(CommsMessage).filter(
        CommsMessage.id == message_id
    ).first()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {
        "id": msg.id,
        "thread_id": msg.thread_id,
        "sender": msg.sender,
        "delivery_status": msg.delivery_status,
        "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
        "delivered_at": msg.delivered_at.isoformat() if msg.delivered_at else None,
        "provider_message_id": msg.provider_message_id,
        "created_at": msg.created_at.isoformat() if msg.created_at else None
    }
