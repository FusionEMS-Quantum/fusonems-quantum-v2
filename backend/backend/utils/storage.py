from __future__ import annotations
from pathlib import Path
from typing import Optional
import os

DEFAULT_STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", "/app/storage"))

def ensure_storage_dir(path: Optional[Path] = None) -> Path:
    p = path or DEFAULT_STORAGE_DIR
    p.mkdir(parents=True, exist_ok=True)
    return p
