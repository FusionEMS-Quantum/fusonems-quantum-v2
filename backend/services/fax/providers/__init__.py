"""
Fax Providers

Provider implementations for different fax services.
Currently supports Telnyx (same provider as phone).
"""

from services.fax.providers.telnyx_fax_provider import (
    TelnyxFaxProvider,
    TelnyxFaxResult,
    TelnyxFaxStatus,
)

__all__ = [
    "TelnyxFaxProvider",
    "TelnyxFaxResult",
    "TelnyxFaxStatus",
]
