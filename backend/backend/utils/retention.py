from __future__ import annotations
from dataclasses import dataclass

@dataclass(frozen=True)
class RetentionPolicy:
    name: str
    days: int

DEFAULT_POLICIES = [
    RetentionPolicy("audit", 3650),
    RetentionPolicy("events", 365),
    RetentionPolicy("uploads", 365),
]
