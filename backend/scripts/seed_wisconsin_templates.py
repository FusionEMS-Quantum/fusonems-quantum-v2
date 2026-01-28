"""
Seed Wisconsin billing templates.
Pre-loads all starter templates with proper Wisconsin compliance.
"""

from sqlalchemy.orm import Session
from models.wisconsin_billing import PatientStatementTemplate, TemplateType, TemplateTone
from datetime import datetime


def seed_wisconsin_templates(db: Session):
    """Seed all Wisconsin starter templates."""
    
    templates = [
        {
            "template_type": TemplateType.INITIAL_STATEMENT,
            "template_name": "Initial Patient Statement - Wisconsin",
            "subject_line": "Statement for EMS Services Provided",
            "body_content": """Hello {{PatientName}},

This statement reflects charges for emergency medical services provided on {{ServiceDate}}.

Balance Due: {{BalanceDue}}
Due Date: {{DueDate}}

If insurance is pending, no action may be required at this time. If you have questions or need assistance, please contact us. Payment options are available.

Thank you,
{{CompanyName}}
{{CompanyPhone}} | {{CompanyEmail}}""",
            "tone": TemplateTone.FRIENDLY
        },
        {
            "template_type": TemplateType.FRIENDLY_REMINDER,
            "template_name": "Friendly Reminder - Wisconsin",
            "subject_line": "Friendly Reminder — EMS Statement",
            "body_content": """Hello {{PatientName}},

This is a friendly reminder regarding your EMS statement dated {{ServiceDate}}.

Current Balance: {{BalanceDue}}

If you've already sent payment, thank you. If you have questions or insurance information to provide, please reach out.

{{CompanyName}}
{{CompanyPhone}} | {{CompanyEmail}}""",
            "tone": TemplateTone.FRIENDLY
        },
        {
            "template_type": TemplateType.SECOND_NOTICE,
            "template_name": "Second Notice - Wisconsin",
            "subject_line": "Second Notice — EMS Statement",
            "body_content": """Hello {{PatientName}},

Our records indicate an outstanding balance for EMS services provided on {{ServiceDate}}.

Balance Due: {{BalanceDue}}

Please contact us if you need assistance or would like to discuss payment options.

{{CompanyName}}
{{CompanyPhone}} | {{CompanyEmail}}""",
            "tone": TemplateTone.NEUTRAL
        },
        {
            "template_type": TemplateType.FINAL_NOTICE,
            "template_name": "Final Notice - Wisconsin",
            "subject_line": "Final Notice — EMS Statement",
            "body_content": """Hello {{PatientName}},

This is a final notice regarding your EMS statement.

Outstanding Balance: {{BalanceDue}}

If you have questions or believe this notice was sent in error, please contact us promptly.

{{CompanyName}}
{{CompanyPhone}} | {{CompanyEmail}}""",
            "tone": TemplateTone.FIRM
        },
        {
            "template_type": TemplateType.PAYMENT_CONFIRMATION,
            "template_name": "Payment Confirmation - Wisconsin",
            "subject_line": "Payment Received — Thank You",
            "body_content": """Hello {{PatientName}},

We've received your payment of {{PaymentAmount}}.

Remaining Balance: {{RemainingBalance}}

Thank you for taking care of this matter.

{{CompanyName}}
{{CompanyPhone}} | {{CompanyEmail}}""",
            "tone": TemplateTone.FRIENDLY
        }
    ]
    
    for tmpl_data in templates:
        # Check if template already exists
        existing = db.query(PatientStatementTemplate).filter_by(
            template_type=tmpl_data["template_type"],
            state="WI",
            version=1
        ).first()
        
        if not existing:
            template = PatientStatementTemplate(
                template_type=tmpl_data["template_type"],
                template_name=tmpl_data["template_name"],
                version=1,
                subject_line=tmpl_data["subject_line"],
                body_content=tmpl_data["body_content"],
                tone=tmpl_data["tone"],
                state="WI",
                active=True,
                approved=True,  # Pre-approved starter templates
                approved_at=datetime.utcnow(),
                supports_email=True,
                supports_pdf=True,
                supports_lob_print=True,
                merge_fields=[
                    "PatientName", "ServiceDate", "BalanceDue", "DueDate",
                    "CompanyName", "CompanyPhone", "CompanyEmail",
                    "PaymentAmount", "RemainingBalance"
                ],
                state_specific_disclosure="Medical transport services are tax-exempt in Wisconsin."
            )
            db.add(template)
            print(f"Created template: {template.template_name}")
        else:
            print(f"Template already exists: {tmpl_data['template_name']}")
    
    db.commit()
    print("Wisconsin templates seeded successfully")


if __name__ == "__main__":
    from database import get_db
    db = next(get_db())
    seed_wisconsin_templates(db)
