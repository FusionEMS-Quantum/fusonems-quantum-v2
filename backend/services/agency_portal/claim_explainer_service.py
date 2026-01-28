"""
Claim Explainer Service - Agency Portal
Generates plain-language explanations for claim status without exposing internal billing mechanics.
Uses ONLY approved language templates - no AI speculation or creativity.
"""

from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from models.founder_billing import Claim, DocumentationRequest
from utils.logger import logger
import hashlib
import json

# Thread-safe in-memory cache
_explanation_cache: Dict[str, Dict] = {}


class ClaimExplainerService:
    """
    Deterministic claim explainer service.
    Generates agency-facing explanations from workflow state using approved templates only.
    """

    # Approved language templates - ONLY these phrases may be used
    APPROVED_TEMPLATES = {
        "waiting_third_party_docs": "This claim is waiting on required documentation from a third party.",
        "payer_reviewing": "The payer is currently reviewing the claim.",
        "gathering_info": "Additional information was requested and is being gathered.",
        "denied_internal_review": "The claim was denied and is under internal review.",
        "submitted_awaiting_response": "This claim has been submitted and is awaiting payer response.",
        "ready_for_submission": "Documentation is complete. The claim is being prepared for submission.",
        "payment_received": "Payment has been received. No further action required.",
        "partial_payment": "Partial payment received. Remaining balance under review.",
        "payer_review_no_action": "This claim is currently under review by the payer. No action is required from your agency at this time.",
    }

    # Responsible party labels
    RESPONSIBLE_PARTIES = {
        "facility": "Waiting on facility",
        "physician": "Waiting on physician office",
        "payer": "Payer",
        "internal": "Internal review",
        "complete": "Complete - no action needed",
        "agency": "Your agency",
    }

    # Current step labels
    CURRENT_STEPS = {
        "documentation_pending": "Documentation Collection",
        "ready_for_submission": "Ready for Submission",
        "submitted": "Submitted to Payer",
        "under_review": "Under Payer Review",
        "denied": "Denied - Under Review",
        "paid": "Paid",
        "partial_paid": "Partially Paid",
        "internal_review": "Internal Review",
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_explanation(
        self, claim_id: int, agency_id: int
    ) -> Optional[Dict[str, str]]:
        """
        Generate plain-language explanation for a claim.
        
        Args:
            claim_id: The claim ID
            agency_id: The agency ID (for verification)
            
        Returns:
            {
                "current_step": str,
                "what_is_needed": str,
                "who_is_responsible": str
            }
        """
        # Check cache first (5 minute TTL)
        cache_key = self._generate_cache_key(claim_id, agency_id)
        cached = self._get_from_cache(cache_key)
        if cached:
            logger.info(f"Cache hit for claim {claim_id} explanation")
            return cached

        # Fetch claim with documentation requests
        claim = await self._fetch_claim(claim_id, agency_id)
        if not claim:
            logger.warning(f"Claim {claim_id} not found or not authorized for agency {agency_id}")
            return None

        # Generate explanation based on claim state
        explanation = self._determine_explanation(claim)

        # Audit log
        await self._audit_log_explanation(claim_id, agency_id, explanation)

        # Cache the result
        self._cache_explanation(cache_key, explanation)

        return explanation

    async def _fetch_claim(self, claim_id: int, agency_id: int) -> Optional[object]:
        """Fetch claim with documentation requests."""
        query = (
            select(Claim)
            .where(
                and_(
                    Claim.id == claim_id,
                    Claim.agency_id == agency_id  # Verify agency ownership
                )
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    def _determine_explanation(self, claim: object) -> Dict[str, str]:
        """
        Deterministic explanation logic.
        Uses ONLY approved templates based on claim state.
        """
        status = claim.status.lower() if claim.status else ""
        
        # Check for paid states first
        if status == "paid":
            return {
                "current_step": self.CURRENT_STEPS["paid"],
                "what_is_needed": self.APPROVED_TEMPLATES["payment_received"],
                "who_is_responsible": self.RESPONSIBLE_PARTIES["complete"],
            }

        if status == "partial_payment":
            return {
                "current_step": self.CURRENT_STEPS["partial_paid"],
                "what_is_needed": self.APPROVED_TEMPLATES["partial_payment"],
                "who_is_responsible": self.RESPONSIBLE_PARTIES["internal"],
            }

        # Check for denied state
        if status in ["denied", "rejected"]:
            return {
                "current_step": self.CURRENT_STEPS["denied"],
                "what_is_needed": self.APPROVED_TEMPLATES["denied_internal_review"],
                "who_is_responsible": self.RESPONSIBLE_PARTIES["internal"],
            }

        # Check for submitted/pending states
        if status in ["submitted", "pending", "in_review"]:
            # Check if waiting on additional info
            if hasattr(claim, "additional_info_requested") and claim.additional_info_requested:
                return {
                    "current_step": self.CURRENT_STEPS["under_review"],
                    "what_is_needed": self.APPROVED_TEMPLATES["gathering_info"],
                    "who_is_responsible": self.RESPONSIBLE_PARTIES["internal"],
                }
            else:
                return {
                    "current_step": self.CURRENT_STEPS["submitted"],
                    "what_is_needed": self.APPROVED_TEMPLATES["payer_review_no_action"],
                    "who_is_responsible": self.RESPONSIBLE_PARTIES["payer"],
                }

        # Check for documentation pending
        if status in ["draft", "documentation_pending", "incomplete"]:
            # Determine who is blocking
            responsible_party = self._determine_blocking_party(claim)
            
            if responsible_party in ["facility", "physician"]:
                return {
                    "current_step": self.CURRENT_STEPS["documentation_pending"],
                    "what_is_needed": self.APPROVED_TEMPLATES["waiting_third_party_docs"],
                    "who_is_responsible": self.RESPONSIBLE_PARTIES[responsible_party],
                }
            else:
                # Internal or ready for submission
                return {
                    "current_step": self.CURRENT_STEPS["ready_for_submission"],
                    "what_is_needed": self.APPROVED_TEMPLATES["ready_for_submission"],
                    "who_is_responsible": self.RESPONSIBLE_PARTIES["internal"],
                }

        # Default case - internal review
        return {
            "current_step": self.CURRENT_STEPS["internal_review"],
            "what_is_needed": self.APPROVED_TEMPLATES["gathering_info"],
            "who_is_responsible": self.RESPONSIBLE_PARTIES["internal"],
        }

    def _determine_blocking_party(self, claim: object) -> str:
        """
        Determine who is blocking based on documentation requests.
        
        Returns: "facility", "physician", "internal", or "complete"
        """
        # Check if claim has documentation_requests relationship
        if not hasattr(claim, "documentation_requests"):
            return "internal"

        doc_requests = claim.documentation_requests
        if not doc_requests:
            return "complete"

        # Check for pending facility docs
        for doc in doc_requests:
            if doc.status == "pending":
                if doc.source_type == "facility":
                    return "facility"
                elif doc.source_type in ["physician", "doctor", "provider"]:
                    return "physician"

        # If no pending external docs, return internal
        return "internal"

    def _generate_cache_key(self, claim_id: int, agency_id: int) -> str:
        """Generate cache key."""
        key_string = f"claim_explainer:{claim_id}:{agency_id}"
        return hashlib.md5(key_string.encode()).hexdigest()

    def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, str]]:
        """Get explanation from cache if not expired."""
        if cache_key not in _explanation_cache:
            return None

        cached_data = _explanation_cache[cache_key]
        expires_at = cached_data.get("expires_at")
        
        if expires_at and datetime.utcnow() < expires_at:
            return cached_data.get("explanation")
        else:
            # Expired - remove from cache
            del _explanation_cache[cache_key]
            return None

    def _cache_explanation(self, cache_key: str, explanation: Dict[str, str]) -> None:
        """Cache explanation with 5-minute TTL."""
        _explanation_cache[cache_key] = {
            "explanation": explanation,
            "expires_at": datetime.utcnow() + timedelta(minutes=5),
        }

    async def _audit_log_explanation(
        self, claim_id: int, agency_id: int, explanation: Dict[str, str]
    ) -> None:
        """Audit log all generated explanations."""
        logger.info(
            "Claim explanation generated",
            extra={
                "claim_id": claim_id,
                "agency_id": agency_id,
                "current_step": explanation["current_step"],
                "who_is_responsible": explanation["who_is_responsible"],
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


async def get_claim_explanation(
    claim_id: int, agency_id: int, db: AsyncSession
) -> Optional[Dict[str, str]]:
    """
    Helper function to generate claim explanation.
    
    Args:
        claim_id: The claim ID
        agency_id: The agency ID
        db: Database session
        
    Returns:
        Explanation dict or None if not found/authorized
    """
    service = ClaimExplainerService(db)
    return await service.generate_explanation(claim_id, agency_id)
