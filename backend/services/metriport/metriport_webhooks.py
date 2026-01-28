"""
Metriport Webhook Handler
Processes real-time updates from Metriport
"""

from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime
import json

from core.database import get_db
from services.metriport.metriport_service import get_metriport_service
from models.metriport import (
    MetriportWebhookEvent,
    MetriportDocumentSync,
    MetriportSyncStatus,
    FHIRDocumentType
)
from utils.logger import logger


router = APIRouter(prefix="/api/metriport/webhooks", tags=["metriport-webhooks"])


async def verify_webhook_signature(request: Request) -> bool:
    """
    Verify webhook signature from Metriport
    TODO: Implement signature verification based on Metriport documentation
    """
    # For now, just check if webhook secret matches
    from core.config import settings
    webhook_secret = getattr(settings, 'METRIPORT_WEBHOOK_SECRET', '')
    
    if not webhook_secret:
        logger.warning("Metriport webhook secret not configured")
        return True  # Allow in development
    
    signature = request.headers.get('x-metriport-signature', '')
    
    # Implement signature verification logic here
    # This should match Metriport's webhook signing mechanism
    
    return True


@router.post("/events")
async def handle_webhook_event(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle incoming webhook events from Metriport
    
    Event types:
    - medical.document-download: Document is ready for download
    - medical.document-conversion: Document conversion completed
    - medical.consolidated-data: Consolidated data is ready
    - medical.patient-discovery: Patient discovery completed
    """
    try:
        # Verify signature
        if not await verify_webhook_signature(request):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )
        
        # Parse payload
        payload = await request.json()
        event_type = payload.get('type', '')
        
        logger.info(f"Received Metriport webhook: {event_type}")
        
        # Store webhook event
        webhook_event = MetriportWebhookEvent(
            event_type=event_type,
            webhook_id=payload.get('id', ''),
            metriport_patient_id=payload.get('data', {}).get('patientId', ''),
            raw_payload=payload,
            processed=False
        )
        db.add(webhook_event)
        db.commit()
        
        # Process event based on type
        try:
            if event_type == 'medical.document-download':
                await handle_document_download(db, payload, webhook_event.id)
            
            elif event_type == 'medical.document-conversion':
                await handle_document_conversion(db, payload, webhook_event.id)
            
            elif event_type == 'medical.consolidated-data':
                await handle_consolidated_data(db, payload, webhook_event.id)
            
            elif event_type == 'medical.patient-discovery':
                await handle_patient_discovery(db, payload, webhook_event.id)
            
            else:
                logger.warning(f"Unknown webhook event type: {event_type}")
            
            # Mark as processed
            webhook_event.processed = True
            webhook_event.processed_at = datetime.utcnow()
            db.commit()
        
        except Exception as e:
            logger.error(f"Error processing webhook event: {e}")
            webhook_event.processing_error = str(e)
            webhook_event.retry_count += 1
            db.commit()
            raise
        
        return {"status": "success", "event_id": webhook_event.id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


async def handle_document_download(
    db: Session,
    payload: Dict[str, Any],
    webhook_event_id: int
):
    """
    Handle document download event
    Document is ready to be downloaded
    """
    try:
        data = payload.get('data', {})
        patient_id = data.get('patientId', '')
        document_id = data.get('documentId', '')
        
        logger.info(f"Document ready for download: {document_id}")
        
        # Get patient mapping
        from models.metriport import MetriportPatientMapping
        mapping = db.query(MetriportPatientMapping).filter(
            MetriportPatientMapping.metriport_patient_id == patient_id
        ).first()
        
        if not mapping:
            logger.warning(f"Patient mapping not found for Metriport ID: {patient_id}")
            return
        
        # Download document
        service = get_metriport_service()
        await service.download_document(
            db=db,
            org_id=mapping.org_id,
            metriport_patient_id=patient_id,
            document_id=document_id,
            master_patient_id=mapping.master_patient_id
        )
        
        logger.info(f"Document downloaded successfully: {document_id}")
    
    except Exception as e:
        logger.error(f"Error handling document download: {e}")
        raise


async def handle_document_conversion(
    db: Session,
    payload: Dict[str, Any],
    webhook_event_id: int
):
    """
    Handle document conversion event
    Document has been converted to FHIR format
    """
    try:
        data = payload.get('data', {})
        patient_id = data.get('patientId', '')
        document_id = data.get('documentId', '')
        conversion_type = data.get('conversionType', '')
        
        logger.info(f"Document conversion completed: {document_id} ({conversion_type})")
        
        # Update document sync record
        doc_sync = db.query(MetriportDocumentSync).filter(
            MetriportDocumentSync.document_id == document_id
        ).first()
        
        if doc_sync:
            doc_sync.sync_status = MetriportSyncStatus.COMPLETED
            doc_sync.parsed_at = datetime.utcnow()
            db.commit()
            logger.info(f"Updated document sync status: {document_id}")
        else:
            logger.warning(f"Document sync record not found: {document_id}")
    
    except Exception as e:
        logger.error(f"Error handling document conversion: {e}")
        raise


async def handle_consolidated_data(
    db: Session,
    payload: Dict[str, Any],
    webhook_event_id: int
):
    """
    Handle consolidated data ready event
    Patient's consolidated FHIR data is ready
    """
    try:
        data = payload.get('data', {})
        patient_id = data.get('patientId', '')
        resources = data.get('resources', [])
        
        logger.info(f"Consolidated data ready for patient: {patient_id}")
        logger.info(f"Available resources: {resources}")
        
        # Get patient mapping
        from models.metriport import MetriportPatientMapping
        mapping = db.query(MetriportPatientMapping).filter(
            MetriportPatientMapping.metriport_patient_id == patient_id
        ).first()
        
        if not mapping:
            logger.warning(f"Patient mapping not found: {patient_id}")
            return
        
        # Update sync status
        mapping.sync_status = MetriportSyncStatus.COMPLETED
        mapping.last_sync_at = datetime.utcnow()
        mapping.metadata['available_resources'] = resources
        db.commit()
        
        logger.info(f"Updated patient sync status: {patient_id}")
    
    except Exception as e:
        logger.error(f"Error handling consolidated data: {e}")
        raise


async def handle_patient_discovery(
    db: Session,
    payload: Dict[str, Any],
    webhook_event_id: int
):
    """
    Handle patient discovery event
    Patient has been found in HIE networks
    """
    try:
        data = payload.get('data', {})
        patient_id = data.get('patientId', '')
        status_val = data.get('status', '')
        
        logger.info(f"Patient discovery completed: {patient_id} - {status_val}")
        
        # Get patient mapping
        from models.metriport import MetriportPatientMapping
        mapping = db.query(MetriportPatientMapping).filter(
            MetriportPatientMapping.metriport_patient_id == patient_id
        ).first()
        
        if not mapping:
            logger.warning(f"Patient mapping not found: {patient_id}")
            return
        
        # Update mapping metadata
        mapping.metadata['discovery_status'] = status_val
        mapping.metadata['discovery_completed_at'] = datetime.utcnow().isoformat()
        
        if status_val == 'completed':
            mapping.mapping_verified = True
        
        db.commit()
        
        logger.info(f"Updated patient discovery status: {patient_id}")
    
    except Exception as e:
        logger.error(f"Error handling patient discovery: {e}")
        raise


@router.get("/events/pending")
async def get_pending_webhook_events(
    db: Session = Depends(get_db)
):
    """
    Get pending webhook events for manual processing
    (Admin/monitoring endpoint)
    """
    try:
        pending_events = db.query(MetriportWebhookEvent).filter(
            MetriportWebhookEvent.processed == False,
            MetriportWebhookEvent.retry_count < 3
        ).order_by(MetriportWebhookEvent.received_at.desc()).limit(50).all()
        
        return {
            'count': len(pending_events),
            'events': [
                {
                    'id': event.id,
                    'event_type': event.event_type,
                    'metriport_patient_id': event.metriport_patient_id,
                    'received_at': event.received_at.isoformat(),
                    'retry_count': event.retry_count,
                    'error': event.processing_error
                }
                for event in pending_events
            ]
        }
    
    except Exception as e:
        logger.error(f"Error getting pending events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/events/{event_id}/retry")
async def retry_webhook_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    """
    Manually retry processing a webhook event
    """
    try:
        event = db.query(MetriportWebhookEvent).filter(
            MetriportWebhookEvent.id == event_id
        ).first()
        
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Webhook event not found"
            )
        
        if event.retry_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum retry attempts exceeded"
            )
        
        # Reset processing status
        event.processed = False
        event.processing_error = ""
        event.retry_count += 1
        db.commit()
        
        # Process based on event type
        payload = event.raw_payload
        event_type = event.event_type
        
        try:
            if event_type == 'medical.document-download':
                await handle_document_download(db, payload, event.id)
            elif event_type == 'medical.document-conversion':
                await handle_document_conversion(db, payload, event.id)
            elif event_type == 'medical.consolidated-data':
                await handle_consolidated_data(db, payload, event.id)
            elif event_type == 'medical.patient-discovery':
                await handle_patient_discovery(db, payload, event.id)
            
            # Mark as processed
            event.processed = True
            event.processed_at = datetime.utcnow()
            db.commit()
            
            return {"status": "success", "message": "Event processed successfully"}
        
        except Exception as e:
            event.processing_error = str(e)
            db.commit()
            raise
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying webhook event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/events/stats")
async def get_webhook_stats(
    db: Session = Depends(get_db)
):
    """
    Get webhook processing statistics
    """
    try:
        from sqlalchemy import func
        
        total_events = db.query(func.count(MetriportWebhookEvent.id)).scalar()
        
        processed_events = db.query(func.count(MetriportWebhookEvent.id)).filter(
            MetriportWebhookEvent.processed == True
        ).scalar()
        
        failed_events = db.query(func.count(MetriportWebhookEvent.id)).filter(
            MetriportWebhookEvent.processed == False,
            MetriportWebhookEvent.retry_count >= 3
        ).scalar()
        
        pending_events = db.query(func.count(MetriportWebhookEvent.id)).filter(
            MetriportWebhookEvent.processed == False,
            MetriportWebhookEvent.retry_count < 3
        ).scalar()
        
        # Get event type breakdown
        event_types = db.query(
            MetriportWebhookEvent.event_type,
            func.count(MetriportWebhookEvent.id)
        ).group_by(MetriportWebhookEvent.event_type).all()
        
        return {
            'total_events': total_events,
            'processed': processed_events,
            'failed': failed_events,
            'pending': pending_events,
            'event_types': {
                event_type: count
                for event_type, count in event_types
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting webhook stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
