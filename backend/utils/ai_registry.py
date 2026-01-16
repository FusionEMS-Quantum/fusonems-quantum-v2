import hashlib
from typing import Any

from sqlalchemy.orm import Session

from models.ai_registry import AiOutputRegistry
from utils.classification import normalize_classification


def hash_prompt(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def register_ai_output(
    db: Session,
    org_id: int,
    model_name: str,
    model_version: str,
    prompt: str,
    output_text: str,
    advisory_level: str,
    classification: str,
    input_refs: list[dict[str, Any]],
    config_snapshot: dict[str, Any],
    training_mode: bool = False,
) -> AiOutputRegistry:
    classification = normalize_classification(classification)
    if training_mode:
        classification = "TRAINING_ONLY"
    record = AiOutputRegistry(
        org_id=org_id,
        classification=classification,
        advisory_level=advisory_level,
        model_name=model_name,
        model_version=model_version,
        prompt_hash=hash_prompt(prompt),
        config_snapshot=config_snapshot,
        input_refs=input_refs,
        output_text=output_text,
        training_mode=training_mode,
        acceptance_state="pending",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
