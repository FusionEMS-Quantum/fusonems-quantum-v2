from datetime import datetime, timezone
from typing import Optional, Tuple


DRIFT_THRESHOLD_SECONDS = 120


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_device_time(device_time: Optional[str]) -> Optional[datetime]:
    if not device_time:
        return None
    try:
        parsed = datetime.fromisoformat(device_time.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def compute_drift_seconds(
    device_time: Optional[datetime], server_time: Optional[datetime] = None
) -> Tuple[int, bool]:
    if not device_time:
        return 0, False
    server = server_time or utc_now()
    drift = int((server - device_time).total_seconds())
    drifted = abs(drift) >= DRIFT_THRESHOLD_SECONDS
    return drift, drifted
