"""
NOTAM Service - FAA NOTAM Data (free public data)
"""

import httpx
import re
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)

NOTAM_API_BASE = "https://notams.aim.faa.gov/notamSearch/search"


class NOTAMService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self._cache: dict = {}
        self._cache_ttl = 600

    async def get_notams_by_location(
        self,
        locations: list[str],
        notam_type: str = "DOMESTIC",
    ) -> list[dict]:
        """
        Fetch NOTAMs for given airport identifiers
        locations: List of ICAO or FAA identifiers (e.g., ["KJFK", "KLAX"])
        """
        cache_key = f"notams_{','.join(locations)}_{notam_type}"
        if cached := self._get_cached(cache_key):
            return cached

        payload = {
            "searchType": 0,
            "designatorsForLocation": ",".join(locations),
            "notamType": notam_type,
            "formatType": "DOMESTIC",
            "archiveStartDate": "",
            "archiveEndDate": "",
        }

        try:
            response = await self.client.post(
                NOTAM_API_BASE,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            notams = self._parse_notam_response(data)
            self._set_cache(cache_key, notams)
            return notams
        except Exception as e:
            logger.error(f"Failed to fetch NOTAMs: {e}")
            return []

    async def get_notams_by_radius(
        self,
        lat: float,
        lon: float,
        radius_nm: int = 50,
    ) -> list[dict]:
        """Fetch NOTAMs within radius of a point"""
        cache_key = f"notams_radius_{lat}_{lon}_{radius_nm}"
        if cached := self._get_cached(cache_key):
            return cached

        payload = {
            "searchType": 3,
            "latDegrees": int(abs(lat)),
            "latMinutes": int((abs(lat) % 1) * 60),
            "latSeconds": int(((abs(lat) % 1) * 60 % 1) * 60),
            "latDirection": "N" if lat >= 0 else "S",
            "longDegrees": int(abs(lon)),
            "longMinutes": int((abs(lon) % 1) * 60),
            "longSeconds": int(((abs(lon) % 1) * 60 % 1) * 60),
            "longDirection": "E" if lon >= 0 else "W",
            "radius": radius_nm,
            "formatType": "DOMESTIC",
        }

        try:
            response = await self.client.post(
                NOTAM_API_BASE,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
            notams = self._parse_notam_response(data)
            self._set_cache(cache_key, notams)
            return notams
        except Exception as e:
            logger.error(f"Failed to fetch NOTAMs by radius: {e}")
            return []

    def _parse_notam_response(self, data: dict) -> list[dict]:
        notams = []
        notam_list = data.get("notamList", [])

        for notam in notam_list:
            parsed = {
                "notam_id": notam.get("notamID"),
                "location": notam.get("facilityDesignator"),
                "classification": notam.get("classification"),
                "accountability": notam.get("accountId"),
                "effective_start": notam.get("effectiveStart"),
                "effective_end": notam.get("effectiveEnd"),
                "text": notam.get("traditionalMessage", ""),
                "icao_message": notam.get("icaoMessage", ""),
                "created": notam.get("createdDate"),
                "type": self._classify_notam(notam.get("traditionalMessage", "")),
                "priority": self._determine_priority(notam),
            }
            notams.append(parsed)

        return sorted(notams, key=lambda x: x["priority"], reverse=True)

    def _classify_notam(self, text: str) -> str:
        text_upper = text.upper()
        if any(kw in text_upper for kw in ["RWY", "RUNWAY", "RY"]):
            return "RUNWAY"
        if any(kw in text_upper for kw in ["TWY", "TAXIWAY"]):
            return "TAXIWAY"
        if any(kw in text_upper for kw in ["NAV", "VOR", "ILS", "LOC", "GPS", "RNAV"]):
            return "NAVAID"
        if any(kw in text_upper for kw in ["OBST", "TOWER", "CRANE"]):
            return "OBSTRUCTION"
        if any(kw in text_upper for kw in ["SVC", "SERVICE", "FUEL"]):
            return "SERVICE"
        if any(kw in text_upper for kw in ["AIRSPACE", "TFR", "RESTRICTED"]):
            return "AIRSPACE"
        if any(kw in text_upper for kw in ["AD", "AERODROME", "AP "]):
            return "AERODROME"
        if any(kw in text_upper for kw in ["COMMUNICATION", "FREQ", "TWR", "ATIS"]):
            return "COMMUNICATION"
        return "OTHER"

    def _determine_priority(self, notam: dict) -> int:
        text = notam.get("traditionalMessage", "").upper()
        if any(kw in text for kw in ["CLSD", "CLOSED", "UNSERVICEABLE", "U/S"]):
            return 3
        if any(kw in text for kw in ["TFR", "RESTRICTED", "PROHIBITED"]):
            return 3
        if any(kw in text for kw in ["RWY", "RUNWAY"]):
            return 2
        if any(kw in text for kw in ["NAV", "ILS", "VOR"]):
            return 2
        return 1

    def filter_critical_notams(self, notams: list[dict]) -> list[dict]:
        """Filter to show only operationally critical NOTAMs"""
        critical_types = ["RUNWAY", "AIRSPACE", "NAVAID", "OBSTRUCTION"]
        return [n for n in notams if n["type"] in critical_types or n["priority"] >= 2]

    def _get_cached(self, key: str):
        if key in self._cache:
            data, timestamp = self._cache[key]
            if datetime.now().timestamp() - timestamp < self._cache_ttl:
                return data
        return None

    def _set_cache(self, key: str, data):
        self._cache[key] = (data, datetime.now().timestamp())


notam_service = NOTAMService()
