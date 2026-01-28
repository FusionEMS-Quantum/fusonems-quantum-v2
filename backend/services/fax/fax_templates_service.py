"""
Fax Templates Service - Section V
Locked templates with approved language only.
Templates are IMMUTABLE without founder approval.
"""
from datetime import datetime
from enum import Enum
from io import BytesIO
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, validator
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy.orm import Session

from models.fax import FaxTemplate, DocumentType


class TemplateContext(BaseModel):
    """Required context fields for template rendering"""
    patient_name: str = Field(..., description="Patient full name")
    patient_dob: str = Field(..., description="Patient date of birth (MM/DD/YYYY)")
    service_date: str = Field(..., description="Date of service (MM/DD/YYYY)")
    transport_type: str = Field(..., description="Type of transport")
    reference_id: str = Field(..., description="Internal reference ID")
    return_fax: str = Field(..., description="Return fax number")
    contact_phone: str = Field(..., description="Contact phone number")
    facility_name: str = Field(..., description="Facility name for routing")
    department: Optional[str] = Field(None, description="Department if known")
    
    # Optional additional fields
    organization_name: str = Field(default="", description="Organization name")
    additional_notes: Optional[str] = Field(None, description="Additional notes if allowed by template")

    @validator("patient_dob", "service_date")
    def validate_date_format(cls, v):
        """Ensure dates are in MM/DD/YYYY format"""
        try:
            datetime.strptime(v, "%m/%d/%Y")
            return v
        except ValueError:
            raise ValueError("Date must be in MM/DD/YYYY format")

    @validator("return_fax", "contact_phone")
    def validate_phone_format(cls, v):
        """Basic phone/fax number validation"""
        digits = "".join(filter(str.isdigit, v))
        if len(digits) < 10:
            raise ValueError("Phone/fax number must contain at least 10 digits")
        return v


class ValidationResult(BaseModel):
    """Template validation result"""
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


# LOCKED TEMPLATE DEFINITIONS - Section V Requirements
LOCKED_TEMPLATES = {
    DocumentType.PCS: """DOCUMENT REQUEST - PHYSICIAN CERTIFICATION STATEMENT

This fax is a request for documentation, not a claim submission.

Patient: {patient_name}
Date of Birth: {patient_dob}
Date of Service: {service_date}
Service Type: {transport_type}
Reference ID: {reference_id}

We are requesting a completed Physician Certification Statement (PCS) 
for the above patient's medical transport service.

Please fax the completed PCS to: {return_fax}

If you have questions, contact us at: {contact_phone}
Reference ID: {reference_id}

CONFIDENTIALITY NOTICE: This fax contains protected health information (PHI) 
under HIPAA regulations. It is intended solely for the addressee. If you are 
not the intended recipient, you are hereby notified that any disclosure, 
copying, distribution, or action taken in reliance on the contents of this 
fax is strictly prohibited. If you have received this fax in error, please 
notify us immediately at {contact_phone} and destroy this document.
""",
    
    DocumentType.AUTHORIZATION: """DOCUMENT REQUEST - AUTHORIZATION FOR MEDICAL TRANSPORT

This fax is a request for documentation, not a claim submission.

Patient: {patient_name}
Date of Birth: {patient_dob}
Date of Service: {service_date}
Service Type: {transport_type}
Reference ID: {reference_id}

We are requesting authorization documentation for the above patient's 
medical transport service.

Required documentation:
- Authorization number and approval date
- Approved transport level
- Origin and destination
- Any special instructions or limitations

Please fax the authorization documentation to: {return_fax}

If you have questions, contact us at: {contact_phone}
Reference ID: {reference_id}

CONFIDENTIALITY NOTICE: This fax contains protected health information (PHI) 
under HIPAA regulations. It is intended solely for the addressee. If you are 
not the intended recipient, you are hereby notified that any disclosure, 
copying, distribution, or action taken in reliance on the contents of this 
fax is strictly prohibited. If you have received this fax in error, please 
notify us immediately at {contact_phone} and destroy this document.
""",
    
    DocumentType.MEDICAL_RECORDS: """DOCUMENT REQUEST - MEDICAL RECORDS

This fax is a request for documentation, not a claim submission.

Patient: {patient_name}
Date of Birth: {patient_dob}
Date of Service: {service_date}
Service Type: {transport_type}
Reference ID: {reference_id}

We are requesting medical records to support medical necessity for the 
above patient's transport service.

Required records:
- Face sheet with demographics
- Physician orders for transport
- Relevant clinical notes supporting medical necessity
- Diagnosis codes

Please fax the requested records to: {return_fax}

If you have questions, contact us at: {contact_phone}
Reference ID: {reference_id}

CONFIDENTIALITY NOTICE: This fax contains protected health information (PHI) 
under HIPAA regulations. It is intended solely for the addressee. If you are 
not the intended recipient, you are hereby notified that any disclosure, 
copying, distribution, or action taken in reliance on the contents of this 
fax is strictly prohibited. If you have received this fax in error, please 
notify us immediately at {contact_phone} and destroy this document.
""",
    
    DocumentType.DENIAL_DOCUMENTATION: """DOCUMENT REQUEST - APPEAL DOCUMENTATION

This fax is a request for documentation, not a claim submission.

Patient: {patient_name}
Date of Birth: {patient_dob}
Date of Service: {service_date}
Service Type: {transport_type}
Reference ID: {reference_id}

We are requesting additional documentation to support an appeal for the 
above patient's transport service.

Required documentation:
- Clinical documentation supporting medical necessity
- Physician certification of medical necessity
- Any additional records referenced in the denial

Please fax the requested documentation to: {return_fax}

If you have questions, contact us at: {contact_phone}
Reference ID: {reference_id}

CONFIDENTIALITY NOTICE: This fax contains protected health information (PHI) 
under HIPAA regulations. It is intended solely for the addressee. If you are 
not the intended recipient, you are hereby notified that any disclosure, 
copying, distribution, or action taken in reliance on the contents of this 
fax is strictly prohibited. If you have received this fax in error, please 
notify us immediately at {contact_phone} and destroy this document.
""",
    
    DocumentType.GENERAL_COMPLIANCE: """DOCUMENT REQUEST - COMPLIANCE DOCUMENTATION

This fax is a request for documentation, not a claim submission.

Patient: {patient_name}
Date of Birth: {patient_dob}
Date of Service: {service_date}
Service Type: {transport_type}
Reference ID: {reference_id}

We are requesting documentation to support compliance requirements for 
the above patient's transport service.

Please fax the requested documentation to: {return_fax}

If you have questions, contact us at: {contact_phone}
Reference ID: {reference_id}

CONFIDENTIALITY NOTICE: This fax contains protected health information (PHI) 
under HIPAA regulations. It is intended solely for the addressee. If you are 
not the intended recipient, you are hereby notified that any disclosure, 
copying, distribution, or action taken in reliance on the contents of this 
fax is strictly prohibited. If you have received this fax in error, please 
notify us immediately at {contact_phone} and destroy this document.
"""
}


class FaxTemplatesService:
    """Service for managing locked fax templates"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_template(self, document_type: DocumentType) -> Optional[str]:
        """
        Get locked template for document type.
        Returns the approved, immutable template.
        """
        # First check database for approved template
        db_template = self.db.query(FaxTemplate).filter(
            FaxTemplate.document_type == document_type.value,
            FaxTemplate.is_active == True,
            FaxTemplate.approved == True
        ).first()
        
        if db_template:
            return db_template.template_body
        
        # Fall back to locked template definitions
        return LOCKED_TEMPLATES.get(document_type)
    
    def validate_template_context(
        self, 
        document_type: DocumentType, 
        context: Dict
    ) -> ValidationResult:
        """
        Validate that all required fields are present and valid.
        NO free-form text allowed beyond approved fields.
        """
        errors = []
        warnings = []
        
        try:
            # Validate context against TemplateContext model
            validated_context = TemplateContext(**context)
            
            # Get template
            template = self.get_template(document_type)
            if not template:
                errors.append(f"No approved template found for {document_type.value}")
                return ValidationResult(valid=False, errors=errors)
            
            # Check for all required placeholders in template
            required_fields = [
                "patient_name", "patient_dob", "service_date",
                "transport_type", "reference_id", "return_fax",
                "contact_phone", "facility_name"
            ]
            
            missing_fields = []
            for field in required_fields:
                if f"{{{field}}}" in template:
                    if not getattr(validated_context, field, None):
                        missing_fields.append(field)
            
            if missing_fields:
                errors.append(f"Missing required fields: {', '.join(missing_fields)}")
            
            # Check for unexpected placeholders in template
            template_placeholders = set()
            import re
            for match in re.finditer(r'\{(\w+)\}', template):
                template_placeholders.add(match.group(1))
            
            provided_fields = set(context.keys())
            unexpected = provided_fields - set(TemplateContext.__fields__.keys())
            
            if unexpected:
                warnings.append(f"Unexpected fields will be ignored: {', '.join(unexpected)}")
            
        except Exception as e:
            errors.append(f"Context validation failed: {str(e)}")
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def render_template(
        self, 
        document_type: DocumentType, 
        context: Dict
    ) -> Optional[str]:
        """
        Render template with provided context.
        Validates all required fields present.
        NO free-form text allowed beyond approved fields.
        """
        # Validate context first
        validation = self.validate_template_context(document_type, context)
        if not validation.valid:
            raise ValueError(f"Template context validation failed: {', '.join(validation.errors)}")
        
        # Get template
        template = self.get_template(document_type)
        if not template:
            raise ValueError(f"No approved template found for {document_type.value}")
        
        # Render with validated context only
        validated_context = TemplateContext(**context)
        
        # Convert to dict with only allowed fields
        render_context = validated_context.dict(exclude_none=False)
        
        try:
            rendered = template.format(**render_context)
            return rendered
        except KeyError as e:
            raise ValueError(f"Template rendering failed - missing field: {str(e)}")
    
    def generate_cover_page_pdf(
        self, 
        document_type: DocumentType, 
        context: Dict
    ) -> bytes:
        """
        Generate PDF cover page using ReportLab.
        Apply template with context.
        Include HIPAA notice.
        """
        # Render template text
        rendered_text = self.render_template(document_type, context)
        if not rendered_text:
            raise ValueError("Failed to render template")
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        
        # Container for PDF elements
        elements = []
        
        # Get styles
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor='black',
            spaceAfter=20,
            alignment=1  # Center
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['BodyText'],
            fontSize=11,
            leading=14,
            spaceAfter=12
        )
        
        confidential_style = ParagraphStyle(
            'Confidential',
            parent=styles['BodyText'],
            fontSize=9,
            textColor='red',
            leading=11,
            spaceAfter=12
        )
        
        # Add organization name if provided
        org_name = context.get('organization_name', 'Healthcare Organization')
        elements.append(Paragraph(org_name, title_style))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Split rendered text into paragraphs and format
        lines = rendered_text.split('\n')
        for line in lines:
            if line.strip():
                if 'CONFIDENTIALITY NOTICE' in line:
                    # Start confidentiality section in red
                    elements.append(Spacer(1, 0.2 * inch))
                    elements.append(Paragraph(line.strip(), confidential_style))
                elif line.startswith('DOCUMENT REQUEST'):
                    # Title line
                    elements.append(Paragraph(line.strip(), title_style))
                else:
                    # Regular body text
                    elements.append(Paragraph(line.strip(), body_style))
            else:
                # Preserve spacing
                elements.append(Spacer(1, 0.1 * inch))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def request_template_change(
        self,
        document_type: DocumentType,
        proposed_body: str,
        justification: str,
        requested_by_user_id: int
    ) -> int:
        """
        Request a change to a locked template.
        Requires founder approval before taking effect.
        """
        # Get current active template
        current_template = self.db.query(FaxTemplate).filter(
            FaxTemplate.document_type == document_type.value,
            FaxTemplate.is_active == True,
            FaxTemplate.approved == True
        ).first()
        
        if not current_template:
            raise ValueError(f"No active template found for {document_type.value}")
        
        # Create change request
        current_template.pending_change_request = True
        current_template.proposed_body = proposed_body
        current_template.change_requested_by = requested_by_user_id
        current_template.change_requested_at = datetime.utcnow()
        current_template.change_justification = justification
        
        self.db.commit()
        
        return current_template.id
    
    def approve_template_change(
        self,
        template_id: int,
        approved_by_user_id: int
    ) -> int:
        """
        Approve a pending template change (founder only).
        Creates new version and archives old version.
        """
        # Get template with pending change
        template = self.db.query(FaxTemplate).filter(
            FaxTemplate.id == template_id,
            FaxTemplate.pending_change_request == True
        ).first()
        
        if not template:
            raise ValueError("No pending change request found")
        
        # Archive current version
        template.is_active = False
        
        # Create new version
        new_template = FaxTemplate(
            org_id=template.org_id,
            document_type=template.document_type,
            template_name=template.template_name,
            template_body=template.proposed_body,
            version=template.version + 1,
            is_active=True,
            approved=True,
            approved_by=approved_by_user_id,
            approved_at=datetime.utcnow(),
            created_by=template.change_requested_by
        )
        
        self.db.add(new_template)
        self.db.flush()
        
        # Link versions
        template.replaced_by = new_template.id
        
        self.db.commit()
        
        return new_template.id
    
    def reject_template_change(
        self,
        template_id: int,
        rejection_reason: str
    ) -> None:
        """Reject a pending template change request"""
        template = self.db.query(FaxTemplate).filter(
            FaxTemplate.id == template_id,
            FaxTemplate.pending_change_request == True
        ).first()
        
        if not template:
            raise ValueError("No pending change request found")
        
        # Clear change request
        template.pending_change_request = False
        template.proposed_body = f"REJECTED: {rejection_reason}"
        
        self.db.commit()
    
    def initialize_locked_templates(
        self,
        org_id: int,
        created_by_user_id: int
    ) -> List[int]:
        """
        Initialize locked templates from LOCKED_TEMPLATES constant.
        Called during system setup.
        Returns list of created template IDs.
        """
        created_ids = []
        
        for doc_type, template_body in LOCKED_TEMPLATES.items():
            # Check if template already exists
            existing = self.db.query(FaxTemplate).filter(
                FaxTemplate.org_id == org_id,
                FaxTemplate.document_type == doc_type.value,
                FaxTemplate.is_active == True
            ).first()
            
            if not existing:
                new_template = FaxTemplate(
                    org_id=org_id,
                    document_type=doc_type.value,
                    template_name=f"{doc_type.value.replace('_', ' ').title()} Request",
                    template_body=template_body,
                    version=1,
                    is_active=True,
                    approved=True,
                    approved_by=created_by_user_id,
                    approved_at=datetime.utcnow(),
                    created_by=created_by_user_id
                )
                self.db.add(new_template)
                self.db.flush()
                created_ids.append(new_template.id)
        
        self.db.commit()
        
        return created_ids
    
    def get_all_templates(
        self,
        org_id: int,
        include_inactive: bool = False
    ) -> List[FaxTemplate]:
        """Get all templates for organization"""
        query = self.db.query(FaxTemplate).filter(
            FaxTemplate.org_id == org_id
        )
        
        if not include_inactive:
            query = query.filter(FaxTemplate.is_active == True)
        
        return query.order_by(FaxTemplate.document_type, FaxTemplate.version.desc()).all()
    
    def get_pending_change_requests(
        self,
        org_id: int
    ) -> List[FaxTemplate]:
        """Get all templates with pending change requests"""
        return self.db.query(FaxTemplate).filter(
            FaxTemplate.org_id == org_id,
            FaxTemplate.pending_change_request == True,
            FaxTemplate.is_active == True
        ).all()
