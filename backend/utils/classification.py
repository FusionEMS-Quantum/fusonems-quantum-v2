VALID_CLASSIFICATIONS = {
    "PHI",
    "OPS",
    "AVIATION_SAFETY",
    "BILLING_SENSITIVE",
    "LEGAL_HOLD",
    "TRAINING_ONLY",
    "NON_PHI",
}


def normalize_classification(value: str | None) -> str:
    if not value:
        return "OPS"
    normalized = value.strip().upper()
    if normalized in VALID_CLASSIFICATIONS:
        return normalized
    return "OPS"
