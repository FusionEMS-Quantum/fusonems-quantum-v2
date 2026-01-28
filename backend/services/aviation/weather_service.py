"""
Aviation Weather Service - Free FAA/NOAA Data Integration
Fetches METAR, TAF, PIREPs from aviationweather.gov (no API key required)
"""

import httpx
import asyncio
from datetime import datetime, timedelta
from typing import Optional
import xml.etree.ElementTree as ET
import logging

logger = logging.getLogger(__name__)

AVIATION_WEATHER_BASE = "https://aviationweather.gov/cgi-bin/data/dataserver.php"


class AviationWeatherService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self._cache: dict = {}
        self._cache_ttl = 300

    async def get_metar(self, station_ids: list[str], hours_back: int = 2) -> list[dict]:
        cache_key = f"metar_{','.join(station_ids)}_{hours_back}"
        if cached := self._get_cached(cache_key):
            return cached

        params = {
            "dataSource": "metars",
            "requestType": "retrieve",
            "format": "xml",
            "stationString": ",".join(station_ids),
            "hoursBeforeNow": hours_back,
            "mostRecent": "true",
        }

        try:
            response = await self.client.get(AVIATION_WEATHER_BASE, params=params)
            response.raise_for_status()
            metars = self._parse_metar_xml(response.text)
            self._set_cache(cache_key, metars)
            return metars
        except Exception as e:
            logger.error(f"Failed to fetch METAR: {e}")
            return []

    async def get_taf(self, station_ids: list[str], hours_back: int = 6) -> list[dict]:
        cache_key = f"taf_{','.join(station_ids)}_{hours_back}"
        if cached := self._get_cached(cache_key):
            return cached

        params = {
            "dataSource": "tafs",
            "requestType": "retrieve",
            "format": "xml",
            "stationString": ",".join(station_ids),
            "hoursBeforeNow": hours_back,
            "mostRecent": "true",
        }

        try:
            response = await self.client.get(AVIATION_WEATHER_BASE, params=params)
            response.raise_for_status()
            tafs = self._parse_taf_xml(response.text)
            self._set_cache(cache_key, tafs)
            return tafs
        except Exception as e:
            logger.error(f"Failed to fetch TAF: {e}")
            return []

    async def get_pireps(self, lat: float, lon: float, radius_nm: int = 100) -> list[dict]:
        cache_key = f"pirep_{lat}_{lon}_{radius_nm}"
        if cached := self._get_cached(cache_key):
            return cached

        params = {
            "dataSource": "pireps",
            "requestType": "retrieve",
            "format": "xml",
            "radialDistance": f"{radius_nm};{lon},{lat}",
            "hoursBeforeNow": 3,
        }

        try:
            response = await self.client.get(AVIATION_WEATHER_BASE, params=params)
            response.raise_for_status()
            pireps = self._parse_pirep_xml(response.text)
            self._set_cache(cache_key, pireps)
            return pireps
        except Exception as e:
            logger.error(f"Failed to fetch PIREPs: {e}")
            return []

    async def get_airmets_sigmets(self) -> list[dict]:
        cache_key = "airmets_sigmets"
        if cached := self._get_cached(cache_key):
            return cached

        params = {
            "dataSource": "airsigmets",
            "requestType": "retrieve",
            "format": "xml",
            "hoursBeforeNow": 6,
        }

        try:
            response = await self.client.get(AVIATION_WEATHER_BASE, params=params)
            response.raise_for_status()
            sigmets = self._parse_sigmet_xml(response.text)
            self._set_cache(cache_key, sigmets)
            return sigmets
        except Exception as e:
            logger.error(f"Failed to fetch AIRMETs/SIGMETs: {e}")
            return []

    def _parse_metar_xml(self, xml_str: str) -> list[dict]:
        metars = []
        try:
            root = ET.fromstring(xml_str)
            for metar in root.findall(".//METAR"):
                data = {
                    "station_id": self._get_text(metar, "station_id"),
                    "observation_time": self._get_text(metar, "observation_time"),
                    "raw_text": self._get_text(metar, "raw_text"),
                    "temp_c": self._get_float(metar, "temp_c"),
                    "dewpoint_c": self._get_float(metar, "dewpoint_c"),
                    "wind_dir_degrees": self._get_int(metar, "wind_dir_degrees"),
                    "wind_speed_kt": self._get_int(metar, "wind_speed_kt"),
                    "wind_gust_kt": self._get_int(metar, "wind_gust_kt"),
                    "visibility_statute_mi": self._get_float(metar, "visibility_statute_mi"),
                    "altim_in_hg": self._get_float(metar, "altim_in_hg"),
                    "flight_category": self._get_text(metar, "flight_category"),
                    "ceiling_ft": None,
                    "sky_condition": [],
                }
                for sky in metar.findall("sky_condition"):
                    sky_data = {
                        "sky_cover": sky.get("sky_cover"),
                        "cloud_base_ft_agl": int(sky.get("cloud_base_ft_agl", 0)) if sky.get("cloud_base_ft_agl") else None,
                    }
                    data["sky_condition"].append(sky_data)
                    if sky_data["sky_cover"] in ("BKN", "OVC") and sky_data["cloud_base_ft_agl"]:
                        if data["ceiling_ft"] is None or sky_data["cloud_base_ft_agl"] < data["ceiling_ft"]:
                            data["ceiling_ft"] = sky_data["cloud_base_ft_agl"]
                metars.append(data)
        except ET.ParseError as e:
            logger.error(f"Failed to parse METAR XML: {e}")
        return metars

    def _parse_taf_xml(self, xml_str: str) -> list[dict]:
        tafs = []
        try:
            root = ET.fromstring(xml_str)
            for taf in root.findall(".//TAF"):
                data = {
                    "station_id": self._get_text(taf, "station_id"),
                    "issue_time": self._get_text(taf, "issue_time"),
                    "valid_time_from": self._get_text(taf, "valid_time_from"),
                    "valid_time_to": self._get_text(taf, "valid_time_to"),
                    "raw_text": self._get_text(taf, "raw_text"),
                    "forecast_periods": [],
                }
                for forecast in taf.findall("forecast"):
                    period = {
                        "time_from": self._get_text(forecast, "fcst_time_from"),
                        "time_to": self._get_text(forecast, "fcst_time_to"),
                        "change_indicator": self._get_text(forecast, "change_indicator"),
                        "wind_dir_degrees": self._get_int(forecast, "wind_dir_degrees"),
                        "wind_speed_kt": self._get_int(forecast, "wind_speed_kt"),
                        "visibility_statute_mi": self._get_float(forecast, "visibility_statute_mi"),
                        "wx_string": self._get_text(forecast, "wx_string"),
                    }
                    data["forecast_periods"].append(period)
                tafs.append(data)
        except ET.ParseError as e:
            logger.error(f"Failed to parse TAF XML: {e}")
        return tafs

    def _parse_pirep_xml(self, xml_str: str) -> list[dict]:
        pireps = []
        try:
            root = ET.fromstring(xml_str)
            for pirep in root.findall(".//AircraftReport"):
                data = {
                    "observation_time": self._get_text(pirep, "observation_time"),
                    "latitude": self._get_float(pirep, "latitude"),
                    "longitude": self._get_float(pirep, "longitude"),
                    "altitude_ft_msl": self._get_int(pirep, "altitude_ft_msl"),
                    "aircraft_ref": self._get_text(pirep, "aircraft_ref"),
                    "raw_text": self._get_text(pirep, "raw_text"),
                    "report_type": self._get_text(pirep, "report_type"),
                    "turbulence_intensity": self._get_text(pirep, "turbulence_intensity"),
                    "icing_intensity": self._get_text(pirep, "icing_intensity"),
                }
                pireps.append(data)
        except ET.ParseError as e:
            logger.error(f"Failed to parse PIREP XML: {e}")
        return pireps

    def _parse_sigmet_xml(self, xml_str: str) -> list[dict]:
        sigmets = []
        try:
            root = ET.fromstring(xml_str)
            for sigmet in root.findall(".//AIRSIGMET"):
                data = {
                    "airsigmet_type": self._get_text(sigmet, "airsigmet_type"),
                    "hazard": self._get_text(sigmet, "hazard"),
                    "severity": self._get_text(sigmet, "severity"),
                    "valid_time_from": self._get_text(sigmet, "valid_time_from"),
                    "valid_time_to": self._get_text(sigmet, "valid_time_to"),
                    "raw_text": self._get_text(sigmet, "raw_text"),
                    "min_ft_msl": self._get_int(sigmet, "min_ft_msl"),
                    "max_ft_msl": self._get_int(sigmet, "max_ft_msl"),
                }
                sigmets.append(data)
        except ET.ParseError as e:
            logger.error(f"Failed to parse SIGMET XML: {e}")
        return sigmets

    def _get_text(self, elem, tag: str) -> Optional[str]:
        child = elem.find(tag)
        return child.text if child is not None else None

    def _get_float(self, elem, tag: str) -> Optional[float]:
        text = self._get_text(elem, tag)
        return float(text) if text else None

    def _get_int(self, elem, tag: str) -> Optional[int]:
        text = self._get_text(elem, tag)
        return int(float(text)) if text else None

    def _get_cached(self, key: str):
        if key in self._cache:
            data, timestamp = self._cache[key]
            if datetime.now().timestamp() - timestamp < self._cache_ttl:
                return data
        return None

    def _set_cache(self, key: str, data):
        self._cache[key] = (data, datetime.now().timestamp())

    def evaluate_flight_conditions(self, metar: dict, minimums: dict) -> dict:
        """Evaluate if conditions meet VFR/IFR minimums"""
        result = {
            "go_no_go": "GO",
            "warnings": [],
            "visibility_ok": True,
            "ceiling_ok": True,
            "wind_ok": True,
        }

        vis = metar.get("visibility_statute_mi") or 10
        ceiling = metar.get("ceiling_ft") or 99999
        wind = metar.get("wind_speed_kt") or 0
        gust = metar.get("wind_gust_kt") or 0

        min_vis = minimums.get("min_visibility_sm", 3)
        min_ceiling = minimums.get("min_ceiling_ft", 1000)
        max_wind = minimums.get("max_wind_kt", 30)
        max_gust = minimums.get("max_gust_kt", 35)

        if vis < min_vis:
            result["visibility_ok"] = False
            result["warnings"].append(f"Visibility {vis} SM below minimum {min_vis} SM")
            result["go_no_go"] = "NO-GO"

        if ceiling < min_ceiling:
            result["ceiling_ok"] = False
            result["warnings"].append(f"Ceiling {ceiling} ft below minimum {min_ceiling} ft")
            result["go_no_go"] = "NO-GO"

        if wind > max_wind:
            result["wind_ok"] = False
            result["warnings"].append(f"Wind {wind} kt exceeds maximum {max_wind} kt")
            result["go_no_go"] = "NO-GO"

        if gust > max_gust:
            result["wind_ok"] = False
            result["warnings"].append(f"Gust {gust} kt exceeds maximum {max_gust} kt")
            result["go_no_go"] = "NO-GO"

        if result["go_no_go"] == "GO":
            if vis < min_vis * 1.5 or ceiling < min_ceiling * 1.5:
                result["go_no_go"] = "MARGINAL"
                result["warnings"].append("Conditions marginal - use caution")

        return result


weather_service = AviationWeatherService()
