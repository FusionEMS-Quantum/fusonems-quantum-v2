"""
Fire MDT NFIRS Export Service

NFIRS 5.0-aligned exports with provenance metadata.

Critical rules:
- All times labeled as "MDT-derived"
- Never fabricate PSAP dispatch times
- Include provenance metadata (source, confidence)
- Map MDT timeline events to NFIRS fields
- Support JSON and XML export formats
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import logging
import json
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

from models.fire_mdt import (
    FireIncident,
    FireIncidentTimeline,
    TimelineEventType,
    TimelineEventSource,
)

logger = logging.getLogger(__name__)


class NFIRSExportService:
    """NFIRS Export Service - NFIRS 5.0 compliant exports with provenance"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # NFIRS Export
    # ========================================================================

    async def export_incident_nfirs(
        self, incident_id: UUID, org_id: UUID, format: str = "json"
    ) -> Dict[str, Any]:
        """
        Export incident in NFIRS 5.0 structure.
        
        Args:
            incident_id: Incident UUID
            org_id: Organization UUID
            format: Export format ('json' or 'xml')
            
        Returns:
            NFIRS-structured data with provenance metadata
        """
        try:
            # Get incident with timeline events
            result = await self.db.execute(
                select(FireIncident)
                .where(
                    and_(
                        FireIncident.id == incident_id,
                        FireIncident.org_id == org_id,
                    )
                )
            )
            incident = result.scalar_one_or_none()

            if not incident:
                raise ValueError(f"Incident {incident_id} not found")

            # Get all timeline events
            timeline_result = await self.db.execute(
                select(FireIncidentTimeline)
                .where(FireIncidentTimeline.incident_id == incident_id)
                .order_by(FireIncidentTimeline.event_time.asc())
            )
            events = list(timeline_result.scalars().all())

            # Build event map
            event_map = {}
            for event in events:
                if event.event_type not in event_map:
                    event_map[event.event_type] = event

            # Generate NFIRS structure
            nfirs_data = self._build_nfirs_structure(incident, event_map)

            if format.lower() == "xml":
                return {"xml": self._convert_to_xml(nfirs_data)}
            else:
                return nfirs_data

        except Exception as e:
            logger.error(f"Failed to export NFIRS data: {e}")
            raise

    async def export_batch_nfirs(
        self,
        org_id: UUID,
        start_date: datetime,
        end_date: datetime,
        format: str = "json",
    ) -> List[Dict[str, Any]]:
        """
        Export multiple incidents in NFIRS format.
        
        Batch export for reporting period.
        """
        try:
            # Get all closed incidents in date range
            result = await self.db.execute(
                select(FireIncident)
                .where(
                    and_(
                        FireIncident.org_id == org_id,
                        FireIncident.created_at >= start_date,
                        FireIncident.created_at <= end_date,
                    )
                )
                .order_by(FireIncident.created_at.asc())
            )
            incidents = list(result.scalars().all())

            # Export each incident
            exports = []
            for incident in incidents:
                try:
                    export_data = await self.export_incident_nfirs(incident.id, org_id, format)
                    exports.append(export_data)
                except Exception as e:
                    logger.error(f"Failed to export incident {incident.id}: {e}")
                    continue

            return exports

        except Exception as e:
            logger.error(f"Failed to batch export NFIRS data: {e}")
            return []

    # ========================================================================
    # NFIRS Structure Building
    # ========================================================================

    def _build_nfirs_structure(
        self, incident: FireIncident, event_map: Dict[TimelineEventType, FireIncidentTimeline]
    ) -> Dict[str, Any]:
        """
        Build NFIRS 5.0 data structure from MDT incident and timeline.
        
        Maps MDT timeline events to NFIRS unit time fields with provenance.
        """
        # Basic incident information
        nfirs = {
            "version": "5.0",
            "export_timestamp": datetime.utcnow().isoformat(),
            "provenance": {
                "source": "FusionEMS Fire MDT",
                "note": "All times are MDT-derived from vehicle/unit timestamps. PSAP dispatch times not available.",
            },
            "incident": {
                "incident_number": incident.incident_number,
                "incident_type": incident.incident_type.value,
                "incident_date": incident.created_at.strftime("%Y%m%d"),
                "location": {
                    "address": incident.scene_address_text,
                    "latitude": float(incident.scene_lat) if incident.scene_lat else None,
                    "longitude": float(incident.scene_lng) if incident.scene_lng else None,
                },
            },
            "unit_times": self._build_unit_times(event_map),
            "timeline_events": self._build_timeline_export(event_map),
        }

        return nfirs

    def _build_unit_times(
        self, event_map: Dict[TimelineEventType, FireIncidentTimeline]
    ) -> Dict[str, Any]:
        """
        Map MDT timeline events to NFIRS unit time fields.
        
        NFIRS Fields mapped:
        - UNIT_NOTIFIED: Not available (PSAP time - never fabricated)
        - UNIT_ENROUTE: MDT_INCIDENT_GENERATED or UNIT_MOVING
        - UNIT_ARRIVED: ON_SCENE
        - UNIT_CLEARED: DEPART_SCENE or INCIDENT_COMPLETED
        """
        unit_times = {}

        # UNIT_NOTIFIED - NEVER PROVIDED (PSAP time)
        unit_times["unit_notified"] = {
            "time": None,
            "note": "PSAP dispatch time not available - MDT system only",
            "source": "not_available",
        }

        # UNIT_ENROUTE - Use UNIT_MOVING or fall back to MDT_INCIDENT_GENERATED
        if TimelineEventType.UNIT_MOVING in event_map:
            event = event_map[TimelineEventType.UNIT_MOVING]
            unit_times["unit_enroute"] = {
                "time": event.event_time.strftime("%Y%m%d%H%M"),
                "time_iso": event.event_time.isoformat(),
                "source": event.source.value,
                "confidence": event.confidence,
                "note": "MDT-derived: Unit moving en route to scene",
            }
        elif TimelineEventType.MDT_INCIDENT_GENERATED in event_map:
            event = event_map[TimelineEventType.MDT_INCIDENT_GENERATED]
            unit_times["unit_enroute"] = {
                "time": event.event_time.strftime("%Y%m%d%H%M"),
                "time_iso": event.event_time.isoformat(),
                "source": event.source.value,
                "confidence": event.confidence,
                "note": "MDT-derived: Incident generated (UNIT_MOVING not recorded)",
            }

        # UNIT_ARRIVED - ON_SCENE
        if TimelineEventType.ON_SCENE in event_map:
            event = event_map[TimelineEventType.ON_SCENE]
            unit_times["unit_arrived"] = {
                "time": event.event_time.strftime("%Y%m%d%H%M"),
                "time_iso": event.event_time.isoformat(),
                "source": event.source.value,
                "confidence": event.confidence,
                "note": "MDT-derived: Unit arrived on scene",
            }

        # UNIT_CLEARED - DEPART_SCENE or INCIDENT_COMPLETED
        if TimelineEventType.INCIDENT_COMPLETED in event_map:
            event = event_map[TimelineEventType.INCIDENT_COMPLETED]
            unit_times["unit_cleared"] = {
                "time": event.event_time.strftime("%Y%m%d%H%M"),
                "time_iso": event.event_time.isoformat(),
                "source": event.source.value,
                "confidence": event.confidence,
                "note": "MDT-derived: Incident completed",
            }
        elif TimelineEventType.DEPART_SCENE in event_map:
            event = event_map[TimelineEventType.DEPART_SCENE]
            unit_times["unit_cleared"] = {
                "time": event.event_time.strftime("%Y%m%d%H%M"),
                "time_iso": event.event_time.isoformat(),
                "source": event.source.value,
                "confidence": event.confidence,
                "note": "MDT-derived: Unit departed scene",
            }

        return unit_times

    def _build_timeline_export(
        self, event_map: Dict[TimelineEventType, FireIncidentTimeline]
    ) -> List[Dict[str, Any]]:
        """Build complete timeline export with all events and provenance"""
        timeline = []

        for event_type, event in event_map.items():
            timeline.append({
                "event_type": event_type.value,
                "event_time": event.event_time.isoformat(),
                "event_time_nfirs": event.event_time.strftime("%Y%m%d%H%M"),
                "source": event.source.value,
                "confidence": event.confidence,
                "location": {
                    "latitude": float(event.lat) if event.lat else None,
                    "longitude": float(event.lng) if event.lng else None,
                },
                "notes": event.notes,
                "override": event.override_flag,
            })

        # Sort by event time
        timeline.sort(key=lambda x: x["event_time"])

        return timeline

    # ========================================================================
    # Format Conversion
    # ========================================================================

    def _convert_to_xml(self, nfirs_data: Dict[str, Any]) -> str:
        """Convert NFIRS JSON structure to XML format"""
        try:
            root = Element("NFIRS_Report")
            root.set("version", nfirs_data["version"])
            root.set("export_timestamp", nfirs_data["export_timestamp"])

            # Provenance
            provenance = SubElement(root, "Provenance")
            SubElement(provenance, "Source").text = nfirs_data["provenance"]["source"]
            SubElement(provenance, "Note").text = nfirs_data["provenance"]["note"]

            # Incident
            incident = SubElement(root, "Incident")
            incident_data = nfirs_data["incident"]
            SubElement(incident, "IncidentNumber").text = incident_data["incident_number"]
            SubElement(incident, "IncidentType").text = incident_data["incident_type"]
            SubElement(incident, "IncidentDate").text = incident_data["incident_date"]

            # Location
            location = SubElement(incident, "Location")
            loc_data = incident_data["location"]
            SubElement(location, "Address").text = loc_data["address"]
            if loc_data["latitude"]:
                SubElement(location, "Latitude").text = str(loc_data["latitude"])
            if loc_data["longitude"]:
                SubElement(location, "Longitude").text = str(loc_data["longitude"])

            # Unit Times
            unit_times = SubElement(root, "UnitTimes")
            for time_type, time_data in nfirs_data["unit_times"].items():
                time_elem = SubElement(unit_times, time_type.upper())
                if time_data["time"]:
                    SubElement(time_elem, "Time").text = time_data["time"]
                    SubElement(time_elem, "TimeISO").text = time_data["time_iso"]
                SubElement(time_elem, "Source").text = time_data["source"]
                if "confidence" in time_data:
                    SubElement(time_elem, "Confidence").text = str(time_data["confidence"])
                SubElement(time_elem, "Note").text = time_data["note"]

            # Timeline Events
            timeline = SubElement(root, "Timeline")
            for event in nfirs_data["timeline_events"]:
                event_elem = SubElement(timeline, "Event")
                SubElement(event_elem, "Type").text = event["event_type"]
                SubElement(event_elem, "Time").text = event["event_time"]
                SubElement(event_elem, "TimeNFIRS").text = event["event_time_nfirs"]
                SubElement(event_elem, "Source").text = event["source"]
                SubElement(event_elem, "Confidence").text = str(event["confidence"])
                if event["notes"]:
                    SubElement(event_elem, "Notes").text = event["notes"]

            # Pretty print XML
            xml_string = tostring(root, encoding="unicode")
            dom = minidom.parseString(xml_string)
            return dom.toprettyxml(indent="  ")

        except Exception as e:
            logger.error(f"Failed to convert to XML: {e}")
            raise

    # ========================================================================
    # Validation
    # ========================================================================

    async def validate_nfirs_export(
        self, incident_id: UUID, org_id: UUID
    ) -> Dict[str, Any]:
        """
        Validate incident readiness for NFIRS export.
        
        Returns validation report with completeness assessment.
        """
        try:
            # Get incident with timeline
            result = await self.db.execute(
                select(FireIncident)
                .where(
                    and_(
                        FireIncident.id == incident_id,
                        FireIncident.org_id == org_id,
                    )
                )
            )
            incident = result.scalar_one_or_none()

            if not incident:
                return {"valid": False, "error": "Incident not found"}

            # Get timeline events
            timeline_result = await self.db.execute(
                select(FireIncidentTimeline)
                .where(FireIncidentTimeline.incident_id == incident_id)
            )
            events = list(timeline_result.scalars().all())

            # Build event map
            event_map = {}
            for event in events:
                if event.event_type not in event_map:
                    event_map[event.event_type] = event

            # Validation checks
            validation = {
                "valid": True,
                "warnings": [],
                "required_events_present": [],
                "missing_events": [],
            }

            # Check critical events
            critical_events = [
                TimelineEventType.MDT_INCIDENT_GENERATED,
                TimelineEventType.ON_SCENE,
            ]

            for event_type in critical_events:
                if event_type in event_map:
                    validation["required_events_present"].append(event_type.value)
                else:
                    validation["missing_events"].append(event_type.value)
                    validation["warnings"].append(f"Missing critical event: {event_type.value}")

            # Check recommended events
            if TimelineEventType.UNIT_MOVING not in event_map:
                validation["warnings"].append("Recommended event missing: UNIT_MOVING")

            if TimelineEventType.DEPART_SCENE not in event_map:
                validation["warnings"].append("Recommended event missing: DEPART_SCENE")

            # Overall validity
            if validation["missing_events"]:
                validation["valid"] = False

            return validation

        except Exception as e:
            logger.error(f"Failed to validate NFIRS export: {e}")
            return {"valid": False, "error": str(e)}
