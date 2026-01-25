from __future__ import annotations
import time
from collections import defaultdict
from typing import Dict, Tuple

# Simple in-memory limiter. For production multi-instance, replace with Redis.
_BUCKETS: Dict[str, Tuple[int, float]] = defaultdict(lambda: (0, 0.0))

def allow(key: str, limit_per_minute: int) -> bool:
    now = time.time()
    count, window_start = _BUCKETS[key]
    if now - window_start >= 60:
        _BUCKETS[key] = (1, now)
        return True
    if count >= limit_per_minute:
        return False
    _BUCKETS[key] = (count + 1, window_start)
    return True
