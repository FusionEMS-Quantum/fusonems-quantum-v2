"""
Inbound Fax Classification and Workflow Matching Service

Handles automatic reception, classification, and intelligent matching of inbound faxes
to originating outbound requests. Uses AI/OCR for document classification and multi-factor
matching for workflow association.

Key Features:
- Automatic document classification with confidence scoring
- Intelligent workflow matching using multiple factors
- High confidence auto-attachment (>0.85)
- Low confidence human review queue (<0.85)
- Automatic halt of outbound fax attempts on match
- Immutable document storage and full audit trail
"""

import hashlib
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from difflib import SequenceMatcher

from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session

from models.fax import (
    InboundFax, 
    InboundFaxMatchAttempt,
    FaxRecord,
    FacilityContact
)


# Document type classification
class DocumentType:
    PCS = "pcs"
    AUTHORIZATION = "authorization"
    MEDICAL_RECORDS = "medical_records"
    DENIAL = "denial"
    CORRESPONDENCE = "correspondence"
    UNKNOWN = "unknown"
    
    ALL_TYPES = [PCS, AUTHORIZATION, MEDICAL_RECORDS, DENIAL, CORRESPONDENCE, UNKNOWN]


# Fax status constants
class InboundFaxStatus:
    RECEIVED = "received"
    CLASSIFYING = "classifying"
    CLASSIFIED = "classified"
    MATCHING = "matching"
    MATCHED = "matched"
    ATTACHED = "attached"
    PENDING_REVIEW = "pending_review"
    REJECTED = "rejected"


@dataclass
class ClassificationResult:
    """Result of document classification"""
    document_type: str
    confidence: float  # 0.0 - 1.0
    method: str  # ai, ocr, rule_based, manual
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MatchResult:
    """Result of workflow matching"""
    request_id: str
    request_type: str
    match_score: float  # 0.0 - 1.0
    match_factors: Dict[str, Any]
    confidence: str  # high, medium, low


@dataclass
class InboundFaxResult:
    """Complete inbound fax processing result"""
    inbound_fax_id: str
    status: str
    classification: ClassificationResult
    match: Optional[MatchResult]
    requires_review: bool
    review_reason: str
    actions_taken: List[str]


class InboundFaxService:
    """
    Inbound Fax Classification and Workflow Matching Service
    
    Confidence Thresholds:
    - High confidence (>0.85): Auto-attach, halt outbound attempts
    - Medium confidence (0.60-0.85): Flag for review, do NOT auto-attach
    - Low confidence (<0.60): Queue for manual matching
    """
    
    # Confidence thresholds
    HIGH_CONFIDENCE_THRESHOLD = 0.85
    MEDIUM_CONFIDENCE_THRESHOLD = 0.60
    
    # Document type classification keywords
    CLASSIFICATION_KEYWORDS = {
        DocumentType.PCS: [
            "physician certification statement",
            "pcs form",
            "medical necessity",
            "certification statement",
            "physician signature",
            "medical director",
            "ambulance medical necessity"
        ],
        DocumentType.AUTHORIZATION: [
            "prior authorization",
            "authorization approval",
            "auth number",
            "authorization approved",
            "authorization denied",
            "auth #",
            "authorization request"
        ],
        DocumentType.MEDICAL_RECORDS: [
            "medical records",
            "patient chart",
            "history and physical",
            "discharge summary",
            "progress notes",
            "face sheet",
            "emergency department"
        ],
        DocumentType.DENIAL: [
            "claim denied",
            "denial notice",
            "denied claim",
            "claim rejection",
            "payment denied",
            "denial reason",
            "claims denial"
        ],
        DocumentType.CORRESPONDENCE: [
            "re:",
            "regarding:",
            "correspondence",
            "follow up",
            "response to"
        ]
    }
    
    def __init__(self, db: Session, org_id: int, user_id: Optional[int] = None):
        self.db = db
        self.org_id = org_id
        self.user_id = user_id
    
    def receive_fax(
        self,
        sender_fax_number: str,
        document_url: str,
        document_content: bytes,
        pages: int,
        provider: str = "srfax",
        provider_fax_id: str = "",
        provider_metadata: Optional[Dict[str, Any]] = None
    ) -> InboundFaxResult:
        """
        Receive and process an inbound fax.
        
        Steps:
        1. Store document immutably
        2. Classify document type
        3. Attempt workflow matching
        4. Auto-attach if high confidence or flag for review
        5. Halt outbound attempts if matched
        
        Args:
            sender_fax_number: Fax number that sent the document
            document_url: URL to the received document
            document_content: Raw document bytes for hash calculation
            pages: Number of pages in the fax
            provider: Fax provider (srfax, twilio, etc.)
            provider_fax_id: Provider's internal fax ID
            provider_metadata: Additional provider data
        
        Returns:
            InboundFaxResult with processing outcome
        """
        actions_taken = []
        
        # Step 1: Store document immutably
        inbound_fax_id = str(uuid.uuid4())
        document_hash = self._calculate_hash(document_content)
        
        inbound_fax = InboundFax(
            id=inbound_fax_id,
            org_id=self.org_id,
            received_at=datetime.utcnow(),
            sender_fax_number=sender_fax_number,
            pages=pages,
            original_document_url=document_url,
            original_document_sha256=document_hash,
            original_document_size_bytes=len(document_content),
            provider=provider,
            provider_fax_id=provider_fax_id,
            provider_metadata=provider_metadata or {},
            status=InboundFaxStatus.RECEIVED,
            created_by=self.user_id
        )
        
        self.db.add(inbound_fax)
        self.db.flush()
        
        actions_taken.append("stored_document_immutably")
        
        # Step 2: Classify document type
        inbound_fax.status = InboundFaxStatus.CLASSIFYING
        self.db.flush()
        
        classification = self._classify_document(document_content, sender_fax_number)
        
        inbound_fax.classified_type = classification.document_type
        inbound_fax.classification_confidence = int(classification.confidence * 100)
        inbound_fax.classification_method = classification.method
        inbound_fax.classification_details = classification.details
        inbound_fax.status = InboundFaxStatus.CLASSIFIED
        self.db.flush()
        
        actions_taken.append(f"classified_as_{classification.document_type}")
        
        # Step 3: Attempt workflow matching
        inbound_fax.status = InboundFaxStatus.MATCHING
        self.db.flush()
        
        match_result = self._match_to_workflow(
            inbound_fax_id=inbound_fax_id,
            sender_fax_number=sender_fax_number,
            document_type=classification.document_type,
            extracted_data=classification.details.get("extracted_fields", {})
        )
        
        requires_review = False
        review_reason = ""
        
        if match_result:
            inbound_fax.matched_request_id = match_result.request_id
            inbound_fax.match_confidence = int(match_result.match_score * 100)
            inbound_fax.match_method = "multi_factor"
            inbound_fax.match_details = match_result.match_factors
            
            actions_taken.append(f"matched_to_{match_result.request_id}")
            
            # Step 4: High confidence handling
            if match_result.match_score >= self.HIGH_CONFIDENCE_THRESHOLD:
                # Auto-attach to workflow
                inbound_fax.status = InboundFaxStatus.ATTACHED
                actions_taken.append("auto_attached_to_workflow")
                
                # Halt further outbound fax attempts
                self._halt_outbound_attempts(match_result.request_id)
                actions_taken.append("halted_outbound_attempts")
                
                # Update workflow status
                self._update_workflow_status(
                    match_result.request_id,
                    match_result.request_type,
                    "document_received"
                )
                actions_taken.append("updated_workflow_status")
                
            else:
                # Low confidence - flag for human review
                inbound_fax.status = InboundFaxStatus.PENDING_REVIEW
                inbound_fax.requires_human_review = True
                inbound_fax.review_reason = f"Match confidence {match_result.match_score:.2f} below threshold {self.HIGH_CONFIDENCE_THRESHOLD}"
                requires_review = True
                review_reason = inbound_fax.review_reason
                actions_taken.append("flagged_for_human_review")
        
        else:
            # No match found - flag for manual matching
            inbound_fax.status = InboundFaxStatus.PENDING_REVIEW
            inbound_fax.requires_human_review = True
            inbound_fax.review_reason = "No matching workflow found"
            requires_review = True
            review_reason = inbound_fax.review_reason
            actions_taken.append("queued_for_manual_matching")
        
        self.db.commit()
        self.db.refresh(inbound_fax)
        
        return InboundFaxResult(
            inbound_fax_id=inbound_fax_id,
            status=inbound_fax.status,
            classification=classification,
            match=match_result,
            requires_review=requires_review,
            review_reason=review_reason,
            actions_taken=actions_taken
        )
    
    def _classify_document(
        self,
        document_content: bytes,
        sender_fax_number: str
    ) -> ClassificationResult:
        """
        Classify document type using multiple methods.
        
        Priority:
        1. AI classification (if available)
        2. OCR + keyword matching
        3. Rule-based (sender number, patterns)
        4. Default to unknown
        
        Args:
            document_content: Raw document bytes
            sender_fax_number: Sender's fax number
        
        Returns:
            ClassificationResult with document type and confidence
        """
        # For now, use OCR + keyword matching
        # In production, integrate with AI service
        
        # Extract text (placeholder - integrate with actual OCR service)
        extracted_text = self._extract_text_placeholder(document_content)
        extracted_fields = self._extract_fields_placeholder(extracted_text)
        
        # Keyword-based classification
        scores = {}
        for doc_type, keywords in self.CLASSIFICATION_KEYWORDS.items():
            score = self._calculate_keyword_score(extracted_text.lower(), keywords)
            scores[doc_type] = score
        
        # Get best match
        if scores:
            best_type = max(scores, key=scores.get)
            confidence = scores[best_type]
            
            # Minimum confidence threshold
            if confidence < 0.3:
                best_type = DocumentType.UNKNOWN
                confidence = 0.0
        else:
            best_type = DocumentType.UNKNOWN
            confidence = 0.0
        
        return ClassificationResult(
            document_type=best_type,
            confidence=confidence,
            method="ocr_keyword_matching",
            details={
                "extracted_text": extracted_text[:500],  # First 500 chars
                "extracted_fields": extracted_fields,
                "keyword_scores": scores
            }
        )
    
    def _match_to_workflow(
        self,
        inbound_fax_id: str,
        sender_fax_number: str,
        document_type: str,
        extracted_data: Dict[str, Any]
    ) -> Optional[MatchResult]:
        """
        Match inbound fax to originating outbound request.
        
        Matching factors (weighted):
        1. Reference ID in fax content (0.4)
        2. Sender fax number (0.25)
        3. Patient name + DOB (0.20)
        4. Service date (0.10)
        5. Facility name (0.05)
        
        Args:
            inbound_fax_id: ID of the inbound fax
            sender_fax_number: Fax number that sent the document
            document_type: Classified document type
            extracted_data: Extracted fields from OCR
        
        Returns:
            MatchResult if match found with sufficient confidence, else None
        """
        # Find recent outbound faxes that might be waiting for a response
        recent_outbound = self.db.query(FaxRecord).filter(
            FaxRecord.org_id == self.org_id,
            FaxRecord.direction == "outbound",
            FaxRecord.status.in_(["sent", "delivered"]),
            FaxRecord.recipient_number == sender_fax_number
        ).order_by(desc(FaxRecord.sent_at)).limit(50).all()
        
        if not recent_outbound:
            # Also check by facility contact
            facility_contacts = self.db.query(FacilityContact).filter(
                FacilityContact.org_id == self.org_id,
                FacilityContact.fax_number == sender_fax_number,
                FacilityContact.active == True
            ).all()
            
            if facility_contacts:
                # Find outbound faxes to these facilities
                facility_names = [fc.facility_name for fc in facility_contacts]
                recent_outbound = self.db.query(FaxRecord).filter(
                    FaxRecord.org_id == self.org_id,
                    FaxRecord.direction == "outbound",
                    FaxRecord.status.in_(["sent", "delivered"]),
                    FaxRecord.recipient_name.in_(facility_names)
                ).order_by(desc(FaxRecord.sent_at)).limit(50).all()
        
        if not recent_outbound:
            return None
        
        # Calculate match scores for each candidate
        match_attempts = []
        
        for outbound_fax in recent_outbound:
            match_factors = {}
            total_score = 0.0
            
            # Factor 1: Reference ID match (weight: 0.4)
            reference_id = extracted_data.get("reference_id") or extracted_data.get("claim_id")
            outbound_ref = outbound_fax.meta.get("reference_id") or outbound_fax.meta.get("claim_id")
            
            if reference_id and outbound_ref and reference_id == outbound_ref:
                match_factors["reference_id"] = 1.0
                total_score += 0.4
            
            # Factor 2: Sender fax number (weight: 0.25)
            if outbound_fax.recipient_number == sender_fax_number:
                match_factors["sender_fax_number"] = 1.0
                total_score += 0.25
            
            # Factor 3: Patient name + DOB (weight: 0.20)
            patient_name = extracted_data.get("patient_name", "")
            patient_dob = extracted_data.get("patient_dob", "")
            outbound_patient = outbound_fax.meta.get("patient_name", "")
            outbound_dob = outbound_fax.meta.get("patient_dob", "")
            
            if patient_name and outbound_patient:
                name_similarity = self._similarity_ratio(patient_name.lower(), outbound_patient.lower())
                match_factors["patient_name_similarity"] = name_similarity
                total_score += 0.15 * name_similarity
                
                if patient_dob and outbound_dob and patient_dob == outbound_dob:
                    match_factors["patient_dob"] = 1.0
                    total_score += 0.05
            
            # Factor 4: Service date (weight: 0.10)
            service_date = extracted_data.get("service_date", "")
            outbound_date = outbound_fax.meta.get("service_date", "")
            
            if service_date and outbound_date:
                date_similarity = self._similarity_ratio(service_date, outbound_date)
                match_factors["service_date_similarity"] = date_similarity
                total_score += 0.10 * date_similarity
            
            # Factor 5: Facility name (weight: 0.05)
            facility_name = extracted_data.get("facility_name", "")
            outbound_facility = outbound_fax.recipient_name
            
            if facility_name and outbound_facility:
                facility_similarity = self._similarity_ratio(facility_name.lower(), outbound_facility.lower())
                match_factors["facility_similarity"] = facility_similarity
                total_score += 0.05 * facility_similarity
            
            # Create match attempt record
            match_attempt = InboundFaxMatchAttempt(
                org_id=self.org_id,
                inbound_fax_id=inbound_fax_id,
                request_id=str(outbound_fax.id),
                request_type="fax_request",
                match_score=int(total_score * 100),
                match_factors=match_factors,
                selected=False
            )
            
            self.db.add(match_attempt)
            match_attempts.append((total_score, outbound_fax, match_factors, match_attempt))
        
        self.db.flush()
        
        if not match_attempts:
            return None
        
        # Select best match
        match_attempts.sort(key=lambda x: x[0], reverse=True)
        best_score, best_outbound, best_factors, best_attempt = match_attempts[0]
        
        # Only return match if above minimum threshold
        if best_score < self.MEDIUM_CONFIDENCE_THRESHOLD:
            return None
        
        # Mark as selected
        best_attempt.selected = True
        best_attempt.selected_at = datetime.utcnow()
        best_attempt.selected_by = self.user_id
        self.db.flush()
        
        # Determine confidence level
        if best_score >= self.HIGH_CONFIDENCE_THRESHOLD:
            confidence_level = "high"
        elif best_score >= self.MEDIUM_CONFIDENCE_THRESHOLD:
            confidence_level = "medium"
        else:
            confidence_level = "low"
        
        return MatchResult(
            request_id=str(best_outbound.id),
            request_type="fax_request",
            match_score=best_score,
            match_factors=best_factors,
            confidence=confidence_level
        )
    
    def _halt_outbound_attempts(self, request_id: str):
        """
        Halt further outbound fax attempts for the matched request.
        Updates the outbound fax record to prevent retries.
        
        Args:
            request_id: ID of the matched request (outbound fax ID)
        """
        try:
            fax_id = int(request_id)
            fax_record = self.db.query(FaxRecord).filter(
                FaxRecord.id == fax_id,
                FaxRecord.org_id == self.org_id
            ).first()
            
            if fax_record:
                # Update status and prevent further attempts
                fax_record.status = "response_received"
                fax_record.meta = {
                    **fax_record.meta,
                    "response_received": True,
                    "response_received_at": datetime.utcnow().isoformat(),
                    "halt_retries": True
                }
                self.db.flush()
        except (ValueError, TypeError):
            # Invalid request_id format
            pass
    
    def _update_workflow_status(
        self,
        request_id: str,
        request_type: str,
        new_status: str
    ):
        """
        Update the workflow status to reflect document received.
        
        Args:
            request_id: ID of the workflow request
            request_type: Type of request (for routing)
            new_status: New status to set
        """
        # This is a placeholder - actual implementation would route to
        # the appropriate workflow service based on request_type
        # For now, we update the fax record metadata
        try:
            fax_id = int(request_id)
            fax_record = self.db.query(FaxRecord).filter(
                FaxRecord.id == fax_id,
                FaxRecord.org_id == self.org_id
            ).first()
            
            if fax_record:
                fax_record.meta = {
                    **fax_record.meta,
                    "workflow_status": new_status,
                    "workflow_status_updated_at": datetime.utcnow().isoformat()
                }
                self.db.flush()
        except (ValueError, TypeError):
            pass
    
    def manual_match(
        self,
        inbound_fax_id: str,
        request_id: str,
        request_type: str,
        reviewed_by: int,
        notes: str = ""
    ) -> bool:
        """
        Manually match an inbound fax to a workflow request.
        Used when automatic matching fails or needs human confirmation.
        
        Args:
            inbound_fax_id: ID of the inbound fax
            request_id: ID of the workflow request to match
            request_type: Type of request
            reviewed_by: User ID of reviewer
            notes: Review notes
        
        Returns:
            True if successful, False otherwise
        """
        inbound_fax = self.db.query(InboundFax).filter(
            InboundFax.id == inbound_fax_id,
            InboundFax.org_id == self.org_id
        ).first()
        
        if not inbound_fax:
            return False
        
        # Update inbound fax
        inbound_fax.matched_request_id = request_id
        inbound_fax.match_confidence = 100  # Manual match = 100% confidence
        inbound_fax.match_method = "manual"
        inbound_fax.status = InboundFaxStatus.ATTACHED
        inbound_fax.reviewed_by = reviewed_by
        inbound_fax.reviewed_at = datetime.utcnow()
        inbound_fax.review_notes = notes
        inbound_fax.requires_human_review = False
        
        # Create match attempt record
        match_attempt = InboundFaxMatchAttempt(
            org_id=self.org_id,
            inbound_fax_id=inbound_fax_id,
            request_id=request_id,
            request_type=request_type,
            match_score=100,
            match_factors={"manual_review": True},
            selected=True,
            selected_at=datetime.utcnow(),
            selected_by=reviewed_by
        )
        
        self.db.add(match_attempt)
        
        # Halt outbound attempts
        self._halt_outbound_attempts(request_id)
        
        # Update workflow status
        self._update_workflow_status(request_id, request_type, "document_received")
        
        self.db.commit()
        
        return True
    
    def reject_fax(
        self,
        inbound_fax_id: str,
        reviewed_by: int,
        reason: str
    ) -> bool:
        """
        Reject an inbound fax (spam, wrong org, etc.)
        
        Args:
            inbound_fax_id: ID of the inbound fax
            reviewed_by: User ID of reviewer
            reason: Rejection reason
        
        Returns:
            True if successful, False otherwise
        """
        inbound_fax = self.db.query(InboundFax).filter(
            InboundFax.id == inbound_fax_id,
            InboundFax.org_id == self.org_id
        ).first()
        
        if not inbound_fax:
            return False
        
        inbound_fax.status = InboundFaxStatus.REJECTED
        inbound_fax.reviewed_by = reviewed_by
        inbound_fax.reviewed_at = datetime.utcnow()
        inbound_fax.review_notes = reason
        inbound_fax.requires_human_review = False
        
        self.db.commit()
        
        return True
    
    def get_pending_review(self, limit: int = 50) -> List[InboundFax]:
        """
        Get inbound faxes pending human review.
        
        Args:
            limit: Maximum number of records to return
        
        Returns:
            List of InboundFax records requiring review
        """
        return self.db.query(InboundFax).filter(
            InboundFax.org_id == self.org_id,
            InboundFax.requires_human_review == True,
            InboundFax.status == InboundFaxStatus.PENDING_REVIEW
        ).order_by(desc(InboundFax.received_at)).limit(limit).all()
    
    def get_match_attempts(self, inbound_fax_id: str) -> List[InboundFaxMatchAttempt]:
        """
        Get all match attempts for an inbound fax.
        
        Args:
            inbound_fax_id: ID of the inbound fax
        
        Returns:
            List of InboundFaxMatchAttempt records
        """
        return self.db.query(InboundFaxMatchAttempt).filter(
            InboundFaxMatchAttempt.inbound_fax_id == inbound_fax_id,
            InboundFaxMatchAttempt.org_id == self.org_id
        ).order_by(desc(InboundFaxMatchAttempt.match_score)).all()
    
    # Helper methods
    
    def _calculate_hash(self, content: bytes) -> str:
        """Calculate SHA256 hash of content"""
        return hashlib.sha256(content).hexdigest()
    
    def _similarity_ratio(self, str1: str, str2: str) -> float:
        """Calculate similarity ratio between two strings (0.0 - 1.0)"""
        return SequenceMatcher(None, str1, str2).ratio()
    
    def _calculate_keyword_score(self, text: str, keywords: List[str]) -> float:
        """
        Calculate keyword match score for a document type.
        
        Args:
            text: Document text (lowercased)
            keywords: List of keywords to search for
        
        Returns:
            Score between 0.0 and 1.0
        """
        if not text or not keywords:
            return 0.0
        
        matches = sum(1 for keyword in keywords if keyword.lower() in text)
        return min(matches / len(keywords), 1.0)
    
    def _extract_text_placeholder(self, document_content: bytes) -> str:
        """
        Placeholder for OCR text extraction.
        
        In production, integrate with:
        - Tesseract OCR
        - AWS Textract
        - Google Cloud Vision
        - Azure Computer Vision
        
        Args:
            document_content: Raw document bytes
        
        Returns:
            Extracted text
        """
        # TODO: Integrate with actual OCR service
        return ""
    
    def _extract_fields_placeholder(self, text: str) -> Dict[str, Any]:
        """
        Placeholder for structured field extraction.
        
        In production, use NLP/AI to extract:
        - Patient name
        - Patient DOB
        - Service date
        - Facility name
        - Reference IDs
        - Provider names
        - Phone/fax numbers
        
        Args:
            text: Extracted text
        
        Returns:
            Dictionary of extracted fields
        """
        # TODO: Integrate with NLP service
        return {}
