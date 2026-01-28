from typing import Dict, Any, List

from sqlalchemy.orm import Session

from models.epcr_core import (
    EpcrRecord,
    EpcrValidationRule,
    EpcrVisibilityRule,
    NEMSISValidationStatus,
)


class RuleEngine:
    @staticmethod
    def validate_record(db: Session, record: EpcrRecord | None) -> Dict[str, Any]:
        validation_errors: List[Dict[str, Any]] = []
        missing_fields: List[str] = []
        if not record:
            return {
                "status": NEMSISValidationStatus.WARN.value,
                "errors": [{"message": "No record provided"}],
                "missing_fields": [],
            }
        rules = (
            db.query(EpcrValidationRule)
            .filter(EpcrValidationRule.org_id == record.org_id, EpcrValidationRule.active == True)
            .all()
        )
        for rule in rules:
            field = rule.target_field or rule.condition.get("field")
            value = getattr(record, field, None) if field else None
            if rule.enforcement == "required" and not value:
                validation_errors.append({"rule": rule.name, "message": "required field missing"})
                missing_fields.append(field or "")
        status = NEMSISValidationStatus.FAIL if validation_errors else NEMSISValidationStatus.PASS
        return {
            "status": status.value,
            "errors": validation_errors,
            "missing_fields": [mf for mf in missing_fields if mf],
        }

    @staticmethod
    def apply_visibility_rules(db: Session, record: EpcrRecord | None) -> Dict[str, bool]:
        visibility = {}
        if not record:
            return visibility
        rules = (
            db.query(EpcrVisibilityRule)
            .filter(EpcrVisibilityRule.org_id == record.org_id, EpcrVisibilityRule.active == True)
            .all()
        )
        for rule in rules:
            condition_field = rule.visibility_condition.get("field")
            value = getattr(record, condition_field, None) if condition_field else None
            visible = rule.default_visibility
            if rule.visibility_condition.get("operator") == "equals":
                target = rule.visibility_condition.get("value")
                visible = value == target
            for target_field in rule.target_fields:
                visibility[target_field] = visible
        return visibility
