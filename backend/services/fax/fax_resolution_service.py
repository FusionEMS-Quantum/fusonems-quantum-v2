"""
Layered Fax Number Resolution Service
NO GUESSING - Authoritative Sources Only

Strict Priority Order:
1. Internal System Records (Primary, Trusted)
2. Agency-Provided Data
3. Approved External Reference Sources (Read-Only)
4. Human Review (Fail-Safe)
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session

from models.fax import FacilityContact, FaxResolutionHistory


@dataclass
class ResolutionStep:
    """Single step in the resolution audit trail"""
    layer: int
    source: str
    action: str
    result: str
    timestamp: str
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FaxResolutionResult:
    """Complete resolution result with audit trail"""
    resolved: bool
    fax_number: Optional[str]
    source_layer: int  # 1-4
    source_description: str
    confidence_score: float  # 0.0 - 1.0
    department: str
    requires_human_review: bool
    conflicting_numbers: List[str]
    audit_trail: List[ResolutionStep]
    facility_contact_id: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "resolved": self.resolved,
            "fax_number": self.fax_number,
            "source_layer": self.source_layer,
            "source_description": self.source_description,
            "confidence_score": self.confidence_score,
            "department": self.department,
            "requires_human_review": self.requires_human_review,
            "conflicting_numbers": self.conflicting_numbers,
            "audit_trail": [
                {
                    "layer": step.layer,
                    "source": step.source,
                    "action": step.action,
                    "result": step.result,
                    "timestamp": step.timestamp,
                    "details": step.details
                }
                for step in self.audit_trail
            ],
            "facility_contact_id": self.facility_contact_id
        }


class FaxResolutionService:
    """
    Layered fax number resolution with strict authoritative sources.
    NO web scraping, NO search engines, NO guessing.
    """
    
    # Confidence threshold for automatic resolution
    CONFIDENCE_THRESHOLD = 0.8
    
    # Department routing based on document type
    DOCUMENT_TYPE_ROUTING = {
        "PCS": "physician",
        "physician_certification": "physician",
        "medical_director": "physician",
        "medical_records": "records",
        "records_request": "records",
        "him": "records",
        "authorization": "admissions",
        "pre_authorization": "admissions",
        "case_management": "case_management",
        "denial": "billing",
        "appeal": "billing",
        "correspondence": "billing",
        "general": "general"
    }
    
    def __init__(self, db: Session, org_id: int, user_id: Optional[int] = None):
        self.db = db
        self.org_id = org_id
        self.user_id = user_id
        self.audit_trail: List[ResolutionStep] = []
        
    def resolve_fax_number(
        self,
        facility_name: str,
        facility_address: Optional[str] = None,
        document_type: str = "general",
        workflow_context: str = "",
        npi: Optional[str] = None,
        cms_ccn: Optional[str] = None
    ) -> FaxResolutionResult:
        """
        Resolve fax number through layered approach.
        Returns result with audit trail.
        """
        self.audit_trail = []
        self._log_step(0, "start", "resolution_initiated", "Starting layered resolution", {
            "facility_name": facility_name,
            "facility_address": facility_address,
            "document_type": document_type
        })
        
        # Determine target department from document type
        target_department = self._route_department(document_type)
        
        # Layer 1: Internal System Records
        result = self._layer1_internal_records(
            facility_name, facility_address, target_department, npi, cms_ccn
        )
        if result:
            return self._finalize_result(result, facility_name, facility_address, document_type, workflow_context)
        
        # Layer 2: Agency-Provided Data
        result = self._layer2_agency_data(
            facility_name, facility_address, target_department, npi, cms_ccn
        )
        if result:
            return self._finalize_result(result, facility_name, facility_address, document_type, workflow_context)
        
        # Layer 3: Approved External Reference Sources
        result = self._layer3_external_references(
            facility_name, facility_address, target_department, npi, cms_ccn
        )
        if result:
            return self._finalize_result(result, facility_name, facility_address, document_type, workflow_context)
        
        # Layer 4: Human Review Required
        result = self._layer4_human_review(facility_name, target_department)
        return self._finalize_result(result, facility_name, facility_address, document_type, workflow_context)
    
    def _layer1_internal_records(
        self,
        facility_name: str,
        facility_address: Optional[str],
        department: str,
        npi: Optional[str],
        cms_ccn: Optional[str]
    ) -> Optional[FaxResolutionResult]:
        """
        Layer 1: Internal System Records (Primary, Trusted)
        - Facilities already associated with incidents
        - Previously successful fax numbers
        - Historical contact records
        """
        self._log_step(1, "internal_records", "searching", "Searching internal system records")
        
        # Build query with multiple match strategies
        query = self.db.query(FacilityContact).filter(
            FacilityContact.org_id == self.org_id,
            FacilityContact.source_layer == 1,
            FacilityContact.active == True
        )
        
        candidates = []
        
        # Strategy 1: Exact name + department match
        if department != "general":
            exact_dept = query.filter(
                FacilityContact.facility_name.ilike(facility_name),
                FacilityContact.department == department
            ).all()
            candidates.extend([(c, 1.0, "exact_name_department") for c in exact_dept])
        
        # Strategy 2: Exact name + general department
        exact_general = query.filter(
            FacilityContact.facility_name.ilike(facility_name),
            FacilityContact.department == "general"
        ).all()
        candidates.extend([(c, 0.95, "exact_name_general") for c in exact_general])
        
        # Strategy 3: NPI match (very high confidence)
        if npi:
            npi_match = query.filter(FacilityContact.npi == npi).all()
            candidates.extend([(c, 0.98, "npi_match") for c in npi_match])
        
        # Strategy 4: CMS CCN match (high confidence)
        if cms_ccn:
            ccn_match = query.filter(FacilityContact.cms_ccn == cms_ccn).all()
            candidates.extend([(c, 0.97, "cms_ccn_match") for c in ccn_match])
        
        # Strategy 5: Fuzzy name match with address
        if facility_address:
            fuzzy_addr = query.filter(
                FacilityContact.facility_name.ilike(f"%{facility_name}%"),
                FacilityContact.facility_address.ilike(f"%{facility_address}%")
            ).all()
            candidates.extend([(c, 0.90, "fuzzy_name_address") for c in fuzzy_addr])
        
        # Strategy 6: Last successful fax to this facility
        recent_success = query.filter(
            FacilityContact.facility_name.ilike(facility_name),
            FacilityContact.last_successful_fax.isnot(None)
        ).order_by(desc(FacilityContact.last_successful_fax)).first()
        
        if recent_success:
            candidates.append((recent_success, 0.92, "recent_success"))
        
        if not candidates:
            self._log_step(1, "internal_records", "not_found", "No internal records found")
            return None
        
        # Deduplicate and select best match
        best_match, confidence, match_type = self._select_best_candidate(candidates)
        
        self._log_step(1, "internal_records", "found", f"Found via {match_type}", {
            "facility_contact_id": best_match.id,
            "fax_number": best_match.fax_number,
            "department": best_match.department,
            "confidence": confidence,
            "total_successful": best_match.total_successful_faxes,
            "last_success": str(best_match.last_successful_fax) if best_match.last_successful_fax else None
        })
        
        return FaxResolutionResult(
            resolved=True,
            fax_number=best_match.fax_number,
            source_layer=1,
            source_description=f"Internal records - {best_match.source_description or 'incident history'}",
            confidence_score=confidence,
            department=best_match.department or department,
            requires_human_review=confidence < self.CONFIDENCE_THRESHOLD,
            conflicting_numbers=[],
            audit_trail=self.audit_trail.copy(),
            facility_contact_id=best_match.id
        )
    
    def _layer2_agency_data(
        self,
        facility_name: str,
        facility_address: Optional[str],
        department: str,
        npi: Optional[str],
        cms_ccn: Optional[str]
    ) -> Optional[FaxResolutionResult]:
        """
        Layer 2: Agency-Provided Data
        - Facility profiles entered by agency staff
        - Versioned and auditable
        """
        self._log_step(2, "agency_data", "searching", "Searching agency-provided facility data")
        
        query = self.db.query(FacilityContact).filter(
            FacilityContact.org_id == self.org_id,
            FacilityContact.source_layer == 2,
            FacilityContact.active == True,
            FacilityContact.replaced_by.is_(None)  # Only current versions
        )
        
        candidates = []
        
        # Strategy 1: Exact name + department
        if department != "general":
            exact = query.filter(
                FacilityContact.facility_name.ilike(facility_name),
                FacilityContact.department == department
            ).all()
            candidates.extend([(c, 0.95, "agency_exact_dept") for c in exact])
        
        # Strategy 2: Exact name + general
        exact_gen = query.filter(
            FacilityContact.facility_name.ilike(facility_name),
            FacilityContact.department == "general"
        ).all()
        candidates.extend([(c, 0.90, "agency_exact_general") for c in exact_gen])
        
        # Strategy 3: Verified contacts (higher confidence)
        verified = query.filter(
            FacilityContact.facility_name.ilike(facility_name),
            FacilityContact.verified == True
        ).all()
        candidates.extend([(c, 0.93, "agency_verified") for c in verified])
        
        # Strategy 4: NPI or CCN match
        if npi:
            npi_match = query.filter(FacilityContact.npi == npi).all()
            candidates.extend([(c, 0.92, "agency_npi") for c in npi_match])
        
        if cms_ccn:
            ccn_match = query.filter(FacilityContact.cms_ccn == cms_ccn).all()
            candidates.extend([(c, 0.91, "agency_ccn") for c in ccn_match])
        
        if not candidates:
            self._log_step(2, "agency_data", "not_found", "No agency-provided data found")
            return None
        
        best_match, confidence, match_type = self._select_best_candidate(candidates)
        
        self._log_step(2, "agency_data", "found", f"Found via {match_type}", {
            "facility_contact_id": best_match.id,
            "fax_number": best_match.fax_number,
            "department": best_match.department,
            "verified": best_match.verified,
            "version": best_match.version,
            "confidence": confidence
        })
        
        return FaxResolutionResult(
            resolved=True,
            fax_number=best_match.fax_number,
            source_layer=2,
            source_description=f"Agency-provided - {best_match.source_description or 'facility profile'}",
            confidence_score=confidence,
            department=best_match.department or department,
            requires_human_review=confidence < self.CONFIDENCE_THRESHOLD or not best_match.verified,
            conflicting_numbers=[],
            audit_trail=self.audit_trail.copy(),
            facility_contact_id=best_match.id
        )
    
    def _layer3_external_references(
        self,
        facility_name: str,
        facility_address: Optional[str],
        department: str,
        npi: Optional[str],
        cms_ccn: Optional[str]
    ) -> Optional[FaxResolutionResult]:
        """
        Layer 3: Approved External Reference Sources (Read-Only)
        - CMS facility datasets
        - State provider registries
        - NPI organization registry
        - Government-published provider directories
        
        NOTE: This layer queries pre-loaded reference data only.
        NO live API calls, NO web scraping, NO search engines.
        """
        self._log_step(3, "external_reference", "searching", "Searching approved external reference sources")
        
        query = self.db.query(FacilityContact).filter(
            FacilityContact.org_id == self.org_id,
            FacilityContact.source_layer == 3,
            FacilityContact.active == True
        )
        
        candidates = []
        
        # Strategy 1: NPI registry match (highest confidence for external)
        if npi:
            npi_match = query.filter(FacilityContact.npi == npi).all()
            candidates.extend([(c, 0.85, "external_npi") for c in npi_match])
        
        # Strategy 2: CMS CCN match
        if cms_ccn:
            ccn_match = query.filter(FacilityContact.cms_ccn == cms_ccn).all()
            candidates.extend([(c, 0.83, "external_cms") for c in ccn_match])
        
        # Strategy 3: State license match
        state_match = query.filter(
            FacilityContact.facility_name.ilike(facility_name),
            FacilityContact.state_license.isnot(None)
        ).all()
        candidates.extend([(c, 0.80, "external_state_registry") for c in state_match])
        
        # Strategy 4: Exact name + city match (lower confidence)
        if facility_address:
            # Extract city from address (simplified)
            city_match = query.filter(
                FacilityContact.facility_name.ilike(facility_name)
            ).all()
            candidates.extend([(c, 0.75, "external_name_city") for c in city_match if c.facility_city])
        
        if not candidates:
            self._log_step(3, "external_reference", "not_found", "No external reference data found")
            return None
        
        best_match, confidence, match_type = self._select_best_candidate(candidates)
        
        # External sources always require review unless very high confidence identifiers
        requires_review = confidence < 0.85 or not (npi or cms_ccn)
        
        self._log_step(3, "external_reference", "found", f"Found via {match_type}", {
            "facility_contact_id": best_match.id,
            "fax_number": best_match.fax_number,
            "source": best_match.source_description,
            "confidence": confidence,
            "requires_review": requires_review
        })
        
        return FaxResolutionResult(
            resolved=True,
            fax_number=best_match.fax_number,
            source_layer=3,
            source_description=f"External reference - {best_match.source_description or 'government registry'}",
            confidence_score=confidence,
            department=department,  # Use requested department, not from external data
            requires_human_review=requires_review,
            conflicting_numbers=[],
            audit_trail=self.audit_trail.copy(),
            facility_contact_id=best_match.id
        )
    
    def _layer4_human_review(
        self,
        facility_name: str,
        department: str
    ) -> FaxResolutionResult:
        """
        Layer 4: Human Review (Fail-Safe)
        Resolution failed - human intervention required.
        NO fax sent without validated destination.
        """
        self._log_step(4, "human_review", "required", "No authoritative source found - human review required", {
            "reason": "No fax number found in any authoritative source"
        })
        
        return FaxResolutionResult(
            resolved=False,
            fax_number=None,
            source_layer=4,
            source_description="Human review required",
            confidence_score=0.0,
            department=department,
            requires_human_review=True,
            conflicting_numbers=[],
            audit_trail=self.audit_trail.copy()
        )
    
    def _select_best_candidate(
        self,
        candidates: List[tuple]
    ) -> tuple:
        """
        Select best candidate from multiple matches.
        Returns (contact, confidence, match_type).
        Detects conflicts and adjusts confidence.
        """
        if not candidates:
            return None, 0.0, "none"
        
        if len(candidates) == 1:
            return candidates[0]
        
        # Deduplicate by facility_contact_id, keep highest confidence
        unique = {}
        for contact, conf, match_type in candidates:
            if contact.id not in unique or conf > unique[contact.id][1]:
                unique[contact.id] = (contact, conf, match_type)
        
        candidates = list(unique.values())
        
        if len(candidates) == 1:
            return candidates[0]
        
        # Check for conflicting fax numbers
        fax_numbers = set(c[0].fax_number for c in candidates)
        
        if len(fax_numbers) > 1:
            # Multiple different fax numbers - conflict detected
            self._log_step(0, "conflict", "detected", "Multiple conflicting fax numbers found", {
                "conflicting_numbers": list(fax_numbers),
                "count": len(candidates)
            })
            
            # Return highest confidence but flag for review
            best = max(candidates, key=lambda x: x[1])
            contact, conf, match_type = best
            
            # Reduce confidence due to conflict
            adjusted_conf = conf * 0.7
            
            return contact, adjusted_conf, f"{match_type}_conflict"
        
        # Same fax number from multiple sources - reinforcement
        best = max(candidates, key=lambda x: x[1])
        contact, conf, match_type = best
        
        # Slight confidence boost for multiple confirmations
        adjusted_conf = min(conf * 1.05, 1.0)
        
        return contact, adjusted_conf, f"{match_type}_confirmed"
    
    def _route_department(self, document_type: str) -> str:
        """
        Route to appropriate department based on document type.
        """
        document_type_lower = document_type.lower()
        
        for key, dept in self.DOCUMENT_TYPE_ROUTING.items():
            if key.lower() in document_type_lower:
                return dept
        
        return "general"
    
    def _log_step(
        self,
        layer: int,
        source: str,
        action: str,
        result: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """Add step to audit trail"""
        step = ResolutionStep(
            layer=layer,
            source=source,
            action=action,
            result=result,
            timestamp=datetime.utcnow().isoformat(),
            details=details or {}
        )
        self.audit_trail.append(step)
    
    def _finalize_result(
        self,
        result: FaxResolutionResult,
        facility_name: str,
        facility_address: Optional[str],
        document_type: str,
        workflow_context: str
    ) -> FaxResolutionResult:
        """
        Finalize result and save to resolution history.
        """
        # Save to resolution history
        history = FaxResolutionHistory(
            org_id=self.org_id,
            facility_name=facility_name,
            facility_address=facility_address or "",
            document_type=document_type,
            workflow_context=workflow_context,
            resolved=result.resolved,
            fax_number=result.fax_number or "",
            source_layer=result.source_layer,
            source_description=result.source_description,
            confidence_score=int(result.confidence_score * 100),
            department=result.department,
            requires_human_review=result.requires_human_review,
            conflicting_numbers=result.conflicting_numbers,
            resolution_steps=[
                {
                    "layer": step.layer,
                    "source": step.source,
                    "action": step.action,
                    "result": step.result,
                    "timestamp": step.timestamp,
                    "details": step.details
                }
                for step in result.audit_trail
            ],
            facility_contact_id=result.facility_contact_id,
            created_by=self.user_id
        )
        
        self.db.add(history)
        self.db.commit()
        
        return result
    
    def add_facility_contact(
        self,
        facility_name: str,
        fax_number: str,
        source_layer: int,
        source_description: str,
        department: str = "general",
        facility_address: str = "",
        facility_city: str = "",
        facility_state: str = "",
        facility_zip: str = "",
        npi: Optional[str] = None,
        cms_ccn: Optional[str] = None,
        state_license: Optional[str] = None,
        phone_number: str = "",
        department_tag: str = "",
        verified: bool = False,
        notes: str = ""
    ) -> FacilityContact:
        """
        Add new facility contact to the database.
        Used for Layer 1 (internal) and Layer 2 (agency-provided) sources.
        """
        contact = FacilityContact(
            org_id=self.org_id,
            facility_name=facility_name,
            facility_address=facility_address,
            facility_city=facility_city,
            facility_state=facility_state,
            facility_zip=facility_zip,
            npi=npi or "",
            cms_ccn=cms_ccn or "",
            state_license=state_license or "",
            fax_number=fax_number,
            phone_number=phone_number,
            department=department,
            department_tag=department_tag,
            source_layer=source_layer,
            source_description=source_description,
            verified=verified,
            notes=notes,
            created_by=self.user_id
        )
        
        self.db.add(contact)
        self.db.commit()
        self.db.refresh(contact)
        
        return contact
    
    def update_success_stats(self, facility_contact_id: int, success: bool):
        """
        Update facility contact statistics after fax attempt.
        Tracks success/failure rates and last successful fax.
        """
        contact = self.db.query(FacilityContact).filter(
            FacilityContact.id == facility_contact_id,
            FacilityContact.org_id == self.org_id
        ).first()
        
        if not contact:
            return
        
        if success:
            contact.total_successful_faxes += 1
            contact.last_successful_fax = datetime.utcnow()
        else:
            contact.total_failed_faxes += 1
        
        self.db.commit()
    
    def mark_human_reviewed(
        self,
        resolution_history_id: int,
        confirmed_fax_number: str,
        confirmed_department: str
    ):
        """
        Mark resolution as human-reviewed and create verified facility contact.
        """
        history = self.db.query(FaxResolutionHistory).filter(
            FaxResolutionHistory.id == resolution_history_id,
            FaxResolutionHistory.org_id == self.org_id
        ).first()
        
        if not history:
            return None
        
        # Mark as reviewed
        history.human_reviewed = True
        history.human_reviewed_at = datetime.utcnow()
        history.human_reviewed_by = self.user_id
        
        # Create or update facility contact as verified Layer 1 (internal) record
        contact = self.add_facility_contact(
            facility_name=history.facility_name,
            fax_number=confirmed_fax_number,
            source_layer=1,  # Promote to internal record
            source_description="Human-verified from manual review",
            department=confirmed_department,
            facility_address=history.facility_address,
            verified=True,
            notes=f"Verified during resolution {resolution_history_id}"
        )
        
        history.facility_contact_id = contact.id
        self.db.commit()
        
        return contact
