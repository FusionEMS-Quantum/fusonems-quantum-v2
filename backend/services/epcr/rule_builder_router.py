from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from core.guards import require_module
from core.security import require_roles
from models.epcr_core import (
    CertificationType,
    EpcrSchematronRule,
    EpcrValidationRule,
    EpcrVisibilityRule,
    ProtocolPathway,
    ProviderCertification,
    EpcrRecord,
)
from models.user import User, UserRole
from utils.tenancy import scoped_query
from .rule_engine import RuleEngine

router = APIRouter(
    prefix="/api/epcr/builders",
    tags=["ePCR Builders"],
    dependencies=[Depends(require_module("EPCR"))],
)


class VisibilityRuleCreate(BaseModel):
    name: str
    target_fields: List[str]
    visibility_condition: Dict[str, Any]
    default_visibility: bool = True
    description: Optional[str] = ""


class VisibilityRuleUpdate(BaseModel):
    name: Optional[str]
    target_fields: Optional[List[str]]
    visibility_condition: Optional[Dict[str, Any]]
    default_visibility: Optional[bool]
    description: Optional[str]
    active: Optional[bool]


class ValidationRuleCreate(BaseModel):
    name: str
    target_field: str
    condition: Dict[str, Any]
    severity: str = "high"
    enforcement: str = "required"
    description: Optional[str] = ""


class ValidationRuleUpdate(BaseModel):
    name: Optional[str]
    target_field: Optional[str]
    condition: Optional[Dict[str, Any]]
    severity: Optional[str]
    enforcement: Optional[str]
    active: Optional[bool]
    description: Optional[str]


class SchematronRuleCreate(BaseModel):
    name: str
    namespace: str
    assertion: str
    fix: str
    description: Optional[str] = ""


class ProtocolPathwayCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    protocol_type: str = "general"
    age_range: Dict[str, int] = Field(default_factory=dict)
    vitals_thresholds: Dict[str, Any] = Field(default_factory=dict)
    keywords: List[str] = Field(default_factory=list)
    ai_trigger: Dict[str, Any] = Field(default_factory=dict)
    confidence_override: int = 0
    active: bool = True


class ProtocolPathwayUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    active: Optional[bool]
    confidence_override: Optional[int]


class CertificationTypeCreate(BaseModel):
    name: str
    jurisdiction: Optional[str] = ""
    scope: Dict[str, Any] = Field(default_factory=dict)
    required_roles: List[str] = Field(default_factory=list)
    description: Optional[str] = ""


class ProviderCertificationCreate(BaseModel):
    provider_id: int
    certification_type_id: int
    issued_at: Optional[str] = None
    expires_at: Optional[str] = None
    status: str = "active"


class ProviderCertificationUpdate(BaseModel):
    expires_at: Optional[str]
    status: Optional[str]


def _require_admin(user: User) -> None:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")


@router.post("/visibility-rules", status_code=status.HTTP_201_CREATED)
def create_visibility_rule(
    payload: VisibilityRuleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    rule = EpcrVisibilityRule(org_id=user.org_id, **payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/visibility-rules")
def list_visibility_rules(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    return scoped_query(db, EpcrVisibilityRule, user.org_id).all()


@router.patch("/visibility-rules/{rule_id}")
def update_visibility_rule(
    rule_id: int,
    payload: VisibilityRuleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    rule = scoped_query(db, EpcrVisibilityRule, user.org_id).filter(EpcrVisibilityRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    for attr, value in payload.dict(exclude_unset=True).items():
        if hasattr(rule, attr):
            setattr(rule, attr, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/visibility-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_visibility_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    rule = scoped_query(db, EpcrVisibilityRule, user.org_id).filter(EpcrVisibilityRule.id == rule_id).first()
    if rule:
        rule.active = False
        db.commit()


@router.post("/visibility-rules/{rule_id}/test")
def test_visibility_rule(
    rule_id: int,
    record_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = None
    if record_id:
        record = scoped_query(db, EpcrRecord, user.org_id).filter(EpcrRecord.id == record_id).first()
    visibility = RuleEngine.apply_visibility_rules(db, record) if record else {}
    return {"rule_id": rule_id, "visibility": visibility}


@router.post("/validation-rules", status_code=status.HTTP_201_CREATED)
def create_validation_rule(
    payload: ValidationRuleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    rule = EpcrValidationRule(org_id=user.org_id, **payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/validation-rules")
def list_validation_rules(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    return scoped_query(db, EpcrValidationRule, user.org_id).all()


@router.patch("/validation-rules/{rule_id}")
def update_validation_rule(
    rule_id: int,
    payload: ValidationRuleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    rule = scoped_query(db, EpcrValidationRule, user.org_id).filter(EpcrValidationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    for attr, value in payload.dict(exclude_unset=True).items():
        if hasattr(rule, attr):
            setattr(rule, attr, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/validation-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_validation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    rule = scoped_query(db, EpcrValidationRule, user.org_id).filter(EpcrValidationRule.id == rule_id).first()
    if rule:
        rule.active = False
        db.commit()


@router.post("/validation-rules/{rule_id}/test")
def test_validation_rule(
    rule_id: int,
    record_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    record = None
    if record_id:
        record = scoped_query(db, EpcrRecord, user.org_id).filter(EpcrRecord.id == record_id).first()
    validation = RuleEngine.validate_record(db, record) if record else {}
    return {"rule_id": rule_id, "validation": validation}


@router.post("/schematron-rules", status_code=status.HTTP_201_CREATED)
def create_schematron_rule(
    payload: SchematronRuleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    rule = EpcrSchematronRule(org_id=user.org_id, **payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/schematron-rules")
def list_schematron_rules(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    return scoped_query(db, EpcrSchematronRule, user.org_id).all()


@router.patch("/schematron-rules/{rule_id}")
def update_schematron_rule(
    rule_id: int,
    payload: SchematronRuleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    rule = scoped_query(db, EpcrSchematronRule, user.org_id).filter(EpcrSchematronRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    for attr, value in payload.model_dump(exclude_unset=True).items():
        if hasattr(rule, attr):
            setattr(rule, attr, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/schematron-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schematron_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    rule = scoped_query(db, EpcrSchematronRule, user.org_id).filter(EpcrSchematronRule.id == rule_id).first()
    if rule:
        db.delete(rule)
        db.commit()


@router.post("/protocol-pathways", status_code=status.HTTP_201_CREATED)
def create_protocol_pathway(
    payload: ProtocolPathwayCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    pathway = ProtocolPathway(org_id=user.org_id, **payload.model_dump())
    db.add(pathway)
    db.commit()
    db.refresh(pathway)
    return pathway


@router.get("/protocol-pathways")
def list_protocol_pathways(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    return scoped_query(db, ProtocolPathway, user.org_id).all()


@router.patch("/protocol-pathways/{pathway_id}")
def update_protocol_pathway(
    pathway_id: int,
    payload: ProtocolPathwayUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    pathway = scoped_query(db, ProtocolPathway, user.org_id).filter(ProtocolPathway.id == pathway_id).first()
    if not pathway:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pathway not found")
    for attr, value in payload.dict(exclude_unset=True).items():
        if hasattr(pathway, attr):
            setattr(pathway, attr, value)
    db.commit()
    db.refresh(pathway)
    return pathway


@router.delete("/protocol-pathways/{pathway_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_protocol_pathway(
    pathway_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    pathway = scoped_query(db, ProtocolPathway, user.org_id).filter(ProtocolPathway.id == pathway_id).first()
    if pathway:
        db.delete(pathway)
        db.commit()


@router.post("/protocol-pathways/{pathway_id}/test")
def test_protocol_pathway(
    pathway_id: int,
    sample_record_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    pathway = scoped_query(db, ProtocolPathway, user.org_id).filter(ProtocolPathway.id == pathway_id).first()
    if not pathway:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pathway not found")
    record = None
    if sample_record_id:
        record = scoped_query(db, EpcrRecord, user.org_id).filter(EpcrRecord.id == sample_record_id).first()
    if not record:
        return {"protocol": pathway.name, "confidence": pathway.confidence_override, "details": "No sample provided"}
    return {"protocol": pathway.name, "confidence": pathway.confidence_override or 70, "record": record.id}


@router.post("/certifications", status_code=status.HTTP_201_CREATED)
def create_certification_type(
    payload: CertificationTypeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    cert_type = CertificationType(org_id=user.org_id, **payload.model_dump())
    db.add(cert_type)
    db.commit()
    db.refresh(cert_type)
    return cert_type


@router.get("/certifications")
def list_certification_types(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    return scoped_query(db, CertificationType, user.org_id).all()


@router.post("/provider-certs", status_code=status.HTTP_201_CREATED)
def assign_provider_certification(
    payload: ProviderCertificationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    assignment = ProviderCertification(org_id=user.org_id, **payload.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/provider-certs")
def list_provider_certifications(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin, UserRole.provider)),
):
    return scoped_query(db, ProviderCertification, user.org_id).all()


@router.patch("/provider-certs/{assignment_id}")
def update_provider_certification(
    assignment_id: int,
    payload: ProviderCertificationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.admin)),
):
    _require_admin(user)
    assignment = scoped_query(db, ProviderCertification, user.org_id).filter(ProviderCertification.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    for attr, value in payload.dict(exclude_unset=True).items():
        if hasattr(assignment, attr):
            setattr(assignment, attr, value)
    db.commit()
    db.refresh(assignment)
    return assignment
