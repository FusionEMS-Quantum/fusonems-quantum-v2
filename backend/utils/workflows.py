from typing import Optional

from sqlalchemy.orm import Session

from models.workflow import WorkflowState


def upsert_workflow_state(
    db: Session,
    org_id: int,
    workflow_key: str,
    resource_type: str,
    resource_id: str,
    status: str,
    last_step: str = "",
    interruption_reason: str = "",
    metadata: Optional[dict] = None,
    classification: str = "OPS",
    training_mode: bool = False,
) -> WorkflowState:
    record = (
        db.query(WorkflowState)
        .filter(
            WorkflowState.org_id == org_id,
            WorkflowState.workflow_key == workflow_key,
            WorkflowState.resource_type == resource_type,
            WorkflowState.resource_id == resource_id,
            WorkflowState.training_mode == training_mode,
        )
        .first()
    )
    if not record:
        record = WorkflowState(
            org_id=org_id,
            workflow_key=workflow_key,
            resource_type=resource_type,
            resource_id=resource_id,
            status=status,
            last_step=last_step,
            interruption_reason=interruption_reason,
            metadata_json=metadata or {},
            classification=classification,
            training_mode=training_mode,
        )
        db.add(record)
    else:
        record.status = status
        record.last_step = last_step
        record.interruption_reason = interruption_reason
        record.metadata_json = metadata or record.metadata_json
    db.commit()
    db.refresh(record)
    return record
