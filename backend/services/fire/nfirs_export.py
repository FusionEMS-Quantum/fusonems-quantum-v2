"""
NFIRS (National Fire Incident Reporting System) Export Generator
Generates NFIRS 5.0 compliant incident reports
"""

from datetime import datetime
from typing import Optional, Any
import json
import logging

logger = logging.getLogger(__name__)


NFIRS_INCIDENT_TYPES = {
    "111": "Building fire",
    "112": "Fires in structure other than in a building",
    "113": "Cooking fire, confined to container",
    "114": "Chimney or flue fire, confined to chimney or flue",
    "115": "Incinerator overload or malfunction, fire confined",
    "116": "Fuel burner/boiler malfunction, fire confined",
    "117": "Commercial compactor fire, confined to rubbish",
    "118": "Trash or rubbish fire, contained",
    "120": "Fire in mobile property used as a fixed structure",
    "121": "Fire in mobile home used as fixed residence",
    "122": "Fire in motor home, camper, recreational vehicle",
    "123": "Fire in portable building, fixed location",
    "131": "Passenger vehicle fire",
    "132": "Road freight or transport vehicle fire",
    "140": "Natural vegetation fire, other",
    "141": "Forest, woods or wildland fire",
    "142": "Brush or brush-and-grass mixture fire",
    "143": "Grass fire",
    "150": "Outside rubbish fire, other",
    "151": "Outside rubbish, trash or waste fire",
    "152": "Garbage dump or sanitary landfill fire",
    "153": "Construction or demolition landfill fire",
    "154": "Dumpster or other outside trash receptacle fire",
    "155": "Outside stationary compactor/compacted trash fire",
    "160": "Special outside fire, other",
    "161": "Outside storage fire",
    "162": "Outside equipment fire",
    "163": "Outside gas or vapor combustion explosion",
    "164": "Outside mailbox fire",
    "170": "Cultivated vegetation, crop fire, other",
    "171": "Cultivated grain or crop fire",
    "172": "Cultivated orchard or vineyard fire",
    "173": "Cultivated trees or nursery stock fire",
    "300": "Rescue, EMS incident, other",
    "311": "Medical assist, assist EMS crew",
    "320": "Emergency medical service incident, other",
    "321": "EMS call, excluding vehicle accident with injury",
    "322": "Motor vehicle accident with injuries",
    "323": "Motor vehicle/pedestrian accident (MV Ped)",
    "324": "Motor vehicle accident with no injuries",
    "331": "Lock-in (if lock out, use 511)",
    "340": "Search for person, other",
    "341": "Search for person on land",
    "342": "Search for person in water",
    "343": "Search for person underground",
    "350": "Extrication, rescue, other",
    "351": "Extrication of victim(s) from building/structure",
    "352": "Extrication of victim(s) from vehicle",
    "353": "Removal of victim(s) from stalled elevator",
    "354": "Trench/below-grade rescue",
    "355": "Confined space rescue",
    "356": "High-angle rescue",
    "357": "Extrication of victim(s) from machinery",
    "360": "Water & ice-related rescue, other",
    "361": "Swimming/recreational water areas rescue",
    "362": "Ice rescue",
    "363": "Swift water rescue",
    "364": "Surf rescue",
    "365": "Watercraft rescue",
    "370": "Electrical rescue",
    "371": "Electrocution or potential electrocution",
    "372": "Trapped by power lines",
    "381": "Rescue or EMS standby",
    "400": "Hazardous condition, other",
    "410": "Combustible/flammable gas/liquid condition, other",
    "411": "Gasoline or other flammable liquid spill",
    "412": "Gas leak (natural gas or LPG)",
    "413": "Oil or other combustible liquid spill",
    "420": "Toxic condition, other",
    "421": "Chemical hazard (no spill or leak)",
    "422": "Chemical spill or leak",
    "423": "Refrigeration leak",
    "424": "Carbon monoxide incident",
    "430": "Radioactive condition, other",
    "431": "Radiation leak, radioactive material",
    "440": "Electrical wiring/equipment problem, other",
    "441": "Heat from short circuit (wiring), defective/worn",
    "442": "Overheated motor",
    "443": "Light ballast breakdown",
    "444": "Power line down",
    "445": "Arcing, shorted electrical equipment",
    "451": "Biological hazard, confirmed or suspected",
    "460": "Accident, potential accident, other",
    "461": "Building or structure weakened or collapsed",
    "462": "Aircraft standby",
    "463": "Vehicle accident, general cleanup",
    "471": "Explosive, bomb removal (for bomb scare, use 721)",
    "480": "Attempted burning, illegal action, other",
    "481": "Attempt to burn",
    "500": "Service call, other",
    "510": "Person in distress, other",
    "511": "Lock-out",
    "512": "Ring or jewelry removal",
    "520": "Water problem, other",
    "521": "Water evacuation",
    "522": "Water or steam leak",
    "531": "Smoke or odor removal",
    "540": "Animal problem, other",
    "541": "Animal problem",
    "542": "Animal rescue",
    "550": "Public service assistance, other",
    "551": "Assist police or other governmental agency",
    "552": "Police matter",
    "553": "Public service",
    "554": "Assist invalid",
    "555": "Defective elevator, no occupants",
    "561": "Unauthorized burning",
    "571": "Cover assignment, standby, moveup",
    "600": "Good intent call, other",
    "611": "Dispatched & cancelled en route",
    "621": "Wrong location",
    "622": "No incident found on arrival at dispatch address",
    "631": "Authorized controlled burning",
    "632": "Prescribed fire",
    "641": "Vicinity alarm (incident in other location)",
    "650": "Steam, other gas mistaken for smoke, other",
    "651": "Smoke scare, odor of smoke",
    "652": "Steam, vapor, fog or dust thought to be smoke",
    "653": "Smoke from barbecue, tar kettle",
    "661": "EMS call, party transported by non-fire agency",
    "671": "HazMat release investigation w/no HazMat",
    "672": "Biological hazard investigation, none found",
    "700": "False alarm or false call, other",
    "710": "Malicious, mischievous false call, other",
    "711": "Municipal alarm system, malicious false alarm",
    "712": "Direct tie to FD, malicious false alarm",
    "713": "Telephone, malicious false alarm",
    "714": "Central station, malicious false alarm",
    "715": "Local alarm system, malicious false alarm",
    "721": "Bomb scare - no bomb",
    "730": "System malfunction, other",
    "731": "Sprinkler activation due to malfunction",
    "732": "Extinguishing system activation due to malfunction",
    "733": "Smoke detector activation due to malfunction",
    "734": "Heat detector activation due to malfunction",
    "735": "Alarm system sounded due to malfunction",
    "736": "CO detector activation due to malfunction",
    "740": "Unintentional transmission of alarm, other",
    "741": "Sprinkler activation, no fire - unintentional",
    "742": "Extinguishing system activation",
    "743": "Smoke detector activation, no fire - unintentional",
    "744": "Detector activation, no fire - unintentional",
    "745": "Alarm system activation, no fire - unintentional",
    "746": "Carbon monoxide detector activation, no CO",
    "900": "Special type of incident, other",
    "911": "Citizen complaint",
}

PROPERTY_USE_CODES = {
    "000": "Property use, other",
    "100": "Assembly",
    "110": "Fixed-use recreation places",
    "111": "Bowling establishment",
    "112": "Billiard center, pool hall",
    "113": "Electronic amusement center",
    "114": "Ice rink, roller rink",
    "115": "Armory",
    "116": "Gymnasium, physical education center",
    "120": "Variable-use amusement places",
    "121": "Ballroom, gymnasium",
    "122": "Convention center, exhibition hall",
    "123": "Stadium, arena",
    "124": "Playground",
    "129": "Amusement center, indoor/outdoor",
    "130": "Places of worship, funeral parlors",
    "131": "Church, mosque, synagogue, temple, chapel",
    "134": "Funeral parlor",
    "140": "Clubs",
    "141": "Athletic/health club",
    "142": "Clubhouse",
    "143": "Yacht club",
    "144": "Casino, gambling clubs",
    "150": "Public or government",
    "151": "Library",
    "152": "Museum",
    "154": "Memorial structure, includes monuments & statues",
    "155": "Courthouse",
    "160": "Eating, drinking places",
    "161": "Restaurant or cafeteria",
    "162": "Bar or nightclub",
    "170": "Passenger terminal",
    "171": "Airport passenger terminal",
    "173": "Bus station",
    "180": "Studio/theater",
    "181": "Live performance theater",
    "182": "Auditorium or concert hall",
    "183": "Movie theater",
    "185": "Radio, television studio",
    "200": "Educational",
    "210": "Schools, non-adult",
    "211": "Preschool",
    "213": "Elementary school, including kindergarten",
    "215": "High school/junior high school/middle school",
    "241": "College/university",
    "254": "Day care, in commercial property",
    "255": "Day care, in residence, licensed",
    "300": "Health care, detention, and correction",
    "311": "24-hour care nursing homes, 4 or more persons",
    "321": "Mental institution",
    "322": "Alcohol or substance abuse recovery center",
    "323": "Asylum, mental retardation/developmentally-disabled",
    "331": "Hospital - medical or psychiatric",
    "332": "Hospices",
    "340": "Clinics, doctors offices, hemodialysis center",
    "341": "Clinic, clinic-type infirmary",
    "342": "Doctor/dentist office",
    "361": "Jail, prison (not juvenile)",
    "363": "Juvenile detention facility",
    "365": "Police station",
    "400": "Residential",
    "419": "1 or 2 family dwelling",
    "429": "Multifamily dwelling",
    "439": "Boarding/rooming house",
    "449": "Hotel/motel, commercial",
    "459": "Residential board and care",
    "460": "Dormitory-type residence, other",
    "462": "Sorority house, fraternity house",
    "464": "Barracks, dormitory",
    "500": "Mercantile, business",
    "511": "Convenience store",
    "519": "Food and beverage sales, grocery store",
    "529": "Textile, wearing apparel sales",
    "539": "Household goods, sales, repairs",
    "549": "Specialty shop",
    "557": "Personal service, including barber & beauty shops",
    "559": "Recreational, hobby, home repair sales, pet store",
    "564": "Laundry, dry cleaning",
    "569": "Professional supplies, services",
    "571": "Service station, gas station",
    "579": "Motor vehicle or boat sales, services, repair",
    "580": "General retail",
    "581": "Department store",
    "592": "Bank",
    "593": "Office - veterinarian or vet clinic",
    "596": "Post office or mailing firms",
    "599": "Business office",
    "600": "Industrial, utility, defense, agriculture, mining",
    "615": "Electric-generating plant",
    "629": "Laboratory or science laboratory",
    "631": "Defense, military installation",
    "635": "Computer center",
    "639": "Communications center",
    "640": "Utility or distribution system",
    "642": "Electrical distribution",
    "644": "Gas distribution, pipeline",
    "645": "Flammable liquid distribution, pipeline",
    "647": "Water utility",
    "648": "Sanitation utility",
    "700": "Manufacturing, processing",
    "800": "Storage",
    "880": "Vehicle storage, vehicle parking garage",
    "881": "Parking garage, (detached residential garage=400)",
    "882": "Parking garage, general vehicle",
    "888": "Fire station",
    "891": "Warehouse",
    "898": "Pier, wharf, quay",
    "899": "Residential or self storage units",
    "900": "Outside or special property",
    "919": "Livestock/poultry storage (barn, hen house)",
    "921": "Bridge, trestle",
    "926": "Outbuilding, protective shelter",
    "931": "Open land or field",
    "935": "Campsite with utilities",
    "936": "Vacant lot",
    "937": "Beach",
    "938": "Graded and cared-for plots of land",
    "940": "Water area",
    "941": "Open ocean, sea, or tidal waters",
    "946": "Lake, river, stream",
    "951": "Railroad right of way",
    "952": "Railroad yard",
    "960": "Street, other",
    "961": "Highway, divided, limited access",
    "962": "Residential street, road or residential driveway",
    "963": "Street or road in commercial area",
    "965": "Vehicle parking area",
    "972": "Aircraft runway",
    "973": "Aircraft taxi way",
    "974": "Aircraft loading area",
    "981": "Construction site",
    "982": "Oil or gas field",
    "983": "Pipeline, power line or other utility right of way",
    "984": "Industrial plant yard - not railroad yard",
}

AID_GIVEN_RECEIVED = {
    "1": "Mutual aid received",
    "2": "Automatic aid received",
    "3": "Mutual aid given",
    "4": "Automatic aid given",
    "5": "Other aid given",
    "N": "None",
}

ACTIONS_TAKEN = {
    "00": "Action taken, other",
    "10": "Fire control or extinguishment, other",
    "11": "Extinguishment by fire service personnel",
    "12": "Salvage & overhaul",
    "13": "Establish fire lines (wildfire)",
    "14": "Contain fire (wildland)",
    "15": "Confine fire (wildland)",
    "16": "Control fire (wildland)",
    "17": "Manage prescribed fire (wildland)",
    "20": "Search & rescue, other",
    "21": "Search",
    "22": "Rescue, remove from harm",
    "23": "Extricate, disentangle",
    "24": "Recover body",
    "30": "EMS & transport, other",
    "31": "Provide basic life support (BLS)",
    "32": "Provide advanced life support (ALS)",
    "33": "Provide first aid & check for injuries",
    "34": "Transport person",
    "40": "Hazardous condition, other",
    "41": "Identify, analyze hazardous materials",
    "42": "HazMat detection, monitoring, sampling, & analysis",
    "43": "Hazardous materials spill control and confinement",
    "44": "Hazardous materials leak control & containment",
    "45": "Remove hazard",
    "46": "Decontamination",
    "47": "Corrective action for weather or natural hazards",
    "48": "Restore municipal services",
    "50": "Fire, crime & accident investigation, other",
    "51": "Establish safe area",
    "52": "Forcible entry",
    "53": "Ventilate",
    "54": "Evacuate area",
    "55": "Assess severe weather or natural disaster damage",
    "56": "Crowd control",
    "57": "Investigate",
    "58": "Investigate fire out on arrival",
    "60": "Systems & services, other",
    "61": "Restore fire alarm system",
    "62": "Restore sprinkler system or fire suppression system",
    "63": "Restore fire detection system",
    "64": "Shut down system",
    "65": "Secure property",
    "66": "Remove water",
    "70": "Assistance, other",
    "71": "Assist physically disabled",
    "72": "Assist animal",
    "73": "Provide manpower",
    "74": "Provide apparatus",
    "75": "Provide equipment",
    "76": "Provide water",
    "77": "Control traffic",
    "78": "Provide light or electricity",
    "79": "Provide information, advice, or referral",
    "80": "Information, investigation & enforcement, other",
    "81": "Incident command",
    "82": "Notify other agencies",
    "83": "Provide information to public or media",
    "84": "Refer to proper authority",
    "85": "Enforce codes",
    "86": "Standby",
    "90": "Fill-in, standby, other",
    "91": "Fill-in or move up",
    "92": "Standby",
    "93": "Cancelled en route",
}


class NFIRSExportGenerator:
    def __init__(self, agency_fdid: str, agency_state: str, agency_name: str):
        self.fdid = agency_fdid
        self.state = agency_state
        self.agency_name = agency_name

    def generate_basic_module(self, incident: dict) -> dict:
        """Generate NFIRS Basic Module (required for all incidents)"""
        return {
            "A1_FDID": self.fdid,
            "A2_State": self.state,
            "A3_Incident_Date": self._format_date(incident.get("incident_date")),
            "A4_Station": incident.get("station", "01"),
            "A5_Incident_Number": incident.get("incident_number"),
            "A6_Exposure": incident.get("exposure_number", "000"),
            "B1_Location_Type": incident.get("location_type"),
            "B2_Mixed_Use": incident.get("mixed_use"),
            "B3_Property_Use": incident.get("property_use_code"),
            "C1_Incident_Type": incident.get("incident_type_code"),
            "C2_Aid_Given_Received": incident.get("aid_given_received", "N"),
            "C3_Actions_Taken_1": incident.get("actions_taken_1"),
            "C3_Actions_Taken_2": incident.get("actions_taken_2"),
            "C3_Actions_Taken_3": incident.get("actions_taken_3"),
            "D1_Property_Loss": incident.get("property_loss", 0),
            "D2_Contents_Loss": incident.get("contents_loss", 0),
            "D3_Pre_Incident_Value": incident.get("pre_incident_value"),
            "D4_Contents_Value": incident.get("contents_value"),
            "E1_Alarm_Time": self._format_time(incident.get("alarm_time")),
            "E2_Arrival_Time": self._format_time(incident.get("arrival_time")),
            "E3_Controlled_Time": self._format_time(incident.get("controlled_time")),
            "E4_Last_Unit_Cleared": self._format_time(incident.get("cleared_time")),
            "F1_Shift_or_Platoon": incident.get("shift"),
            "F2_District": incident.get("district"),
            "G1_Personnel_Responded": incident.get("personnel_count", 0),
            "G2_Apparatus_Responded": incident.get("apparatus_count", 0),
            "H1_Casualties_Fire": incident.get("casualties_fire", 0),
            "H2_Casualties_Fire_Service": incident.get("casualties_fire_service", 0),
            "H3_Injuries_Civilian": incident.get("injuries_civilian", 0),
            "H4_Injuries_Fire_Service": incident.get("injuries_fire_service", 0),
            "I_Detector_Presence": incident.get("detector_presence"),
            "J_HazMat_Release": incident.get("hazmat_release"),
            "K1_Completed_Modules": self._get_completed_modules(incident),
            "K2_Special_Studies": incident.get("special_studies"),
            "L1_Street_Address": incident.get("street_address"),
            "L2_City": incident.get("city"),
            "L3_State": incident.get("state", self.state),
            "L4_Zip": incident.get("zip_code"),
            "L5_Census_Tract": incident.get("census_tract"),
            "M_Remarks": incident.get("narrative", "")[:500],
        }

    def generate_fire_module(self, incident: dict) -> Optional[dict]:
        """Generate NFIRS Fire Module (for structure fires)"""
        if not incident.get("incident_type_code", "").startswith("1"):
            return None

        return {
            "A1_Area_of_Origin": incident.get("area_of_origin"),
            "A2_Heat_Source": incident.get("heat_source"),
            "A3_Item_First_Ignited": incident.get("item_first_ignited"),
            "A4_Type_of_Material_First_Ignited": incident.get("material_first_ignited"),
            "B1_Cause_of_Ignition": incident.get("cause_of_ignition"),
            "B2_Factors_Contributing_1": incident.get("contributing_factor_1"),
            "B2_Factors_Contributing_2": incident.get("contributing_factor_2"),
            "B2_Factors_Contributing_3": incident.get("contributing_factor_3"),
            "B3_Human_Factors_1": incident.get("human_factor_1"),
            "B3_Human_Factors_2": incident.get("human_factor_2"),
            "C1_Equipment_Involved_in_Ignition": incident.get("equipment_involved"),
            "D1_Fire_Spread": incident.get("fire_spread"),
            "E1_Number_of_Stories": incident.get("stories"),
            "E2_Number_of_Stories_Damaged": incident.get("stories_damaged"),
            "F1_Detector_Effectiveness": incident.get("detector_effectiveness"),
            "G1_AES_Present": incident.get("aes_present"),
            "G2_AES_Operation": incident.get("aes_operation"),
            "G3_AES_Effectiveness": incident.get("aes_effectiveness"),
        }

    def generate_structure_module(self, incident: dict) -> Optional[dict]:
        """Generate NFIRS Structure Fire Module"""
        if not incident.get("is_structure_fire"):
            return None

        return {
            "A_Structure_Type": incident.get("structure_type"),
            "B_Building_Status": incident.get("building_status"),
            "C_Building_Height": incident.get("building_height"),
            "D_Main_Floor_Size": incident.get("main_floor_size"),
            "E_Construction_Type": incident.get("construction_type"),
            "F_Detector_Type_1": incident.get("detector_type_1"),
            "F_Detector_Type_2": incident.get("detector_type_2"),
            "G_Detector_Power_1": incident.get("detector_power_1"),
            "G_Detector_Power_2": incident.get("detector_power_2"),
            "H_Detector_Operation": incident.get("detector_operation"),
            "I_Detector_Effectiveness": incident.get("detector_effectiveness"),
            "J_Detector_Failure_Reason": incident.get("detector_failure_reason"),
            "K_AES_Type": incident.get("aes_type"),
            "L_AES_Operation": incident.get("aes_operation"),
            "M_Number_Sprinkler_Heads": incident.get("sprinkler_heads_operated"),
            "N_AES_Failure_Reason": incident.get("aes_failure_reason"),
        }

    def generate_ems_module(self, incident: dict) -> Optional[dict]:
        """Generate NFIRS EMS Module"""
        if not incident.get("incident_type_code", "").startswith("3"):
            return None

        return {
            "A_Patient_Number": incident.get("patient_number", 1),
            "B_Age": incident.get("patient_age"),
            "C_Gender": incident.get("patient_gender"),
            "D_Race": incident.get("patient_race"),
            "E_Ethnicity": incident.get("patient_ethnicity"),
            "F_Human_Factors_1": incident.get("human_factor_1"),
            "F_Human_Factors_2": incident.get("human_factor_2"),
            "F_Human_Factors_3": incident.get("human_factor_3"),
            "G_Injury_Type_1": incident.get("injury_type_1"),
            "G_Injury_Type_2": incident.get("injury_type_2"),
            "G_Injury_Type_3": incident.get("injury_type_3"),
            "G_Injury_Type_4": incident.get("injury_type_4"),
            "G_Injury_Type_5": incident.get("injury_type_5"),
            "H_Body_Part_1": incident.get("body_part_1"),
            "H_Body_Part_2": incident.get("body_part_2"),
            "H_Body_Part_3": incident.get("body_part_3"),
            "H_Body_Part_4": incident.get("body_part_4"),
            "H_Body_Part_5": incident.get("body_part_5"),
            "I_Cause_of_Injury": incident.get("cause_of_injury"),
            "J_Provider_Impression_1": incident.get("provider_impression_1"),
            "J_Provider_Impression_2": incident.get("provider_impression_2"),
            "J_Provider_Impression_3": incident.get("provider_impression_3"),
            "K_Procedures_Used_1": incident.get("procedure_1"),
            "K_Procedures_Used_2": incident.get("procedure_2"),
            "K_Procedures_Used_3": incident.get("procedure_3"),
            "L_Disposition": incident.get("patient_disposition"),
            "M_Destination": incident.get("destination_facility"),
        }

    def generate_hazmat_module(self, incident: dict) -> Optional[dict]:
        """Generate NFIRS HazMat Module"""
        if not incident.get("hazmat_release"):
            return None

        return {
            "A_HazMat_ID": incident.get("hazmat_id_type"),
            "B_UN_Number": incident.get("un_number"),
            "C_DOT_Class": incident.get("dot_class"),
            "D_CAS_Number": incident.get("cas_number"),
            "E_Chemical_Name": incident.get("chemical_name"),
            "F_Container_Type": incident.get("container_type"),
            "G_Container_Capacity": incident.get("container_capacity"),
            "H_Capacity_Unit": incident.get("capacity_unit"),
            "I_Amount_Released": incident.get("amount_released"),
            "J_Released_Unit": incident.get("released_unit"),
            "K_Area_Affected": incident.get("area_affected"),
            "L_Area_Affected_Unit": incident.get("area_affected_unit"),
            "M_Area_Evacuated": incident.get("area_evacuated"),
            "N_Population_Evacuated": incident.get("population_evacuated"),
            "O_Injuries_Civilians": incident.get("hazmat_injuries_civilian"),
            "P_Injuries_Fire_Service": incident.get("hazmat_injuries_fire"),
            "Q_Actions_Taken_1": incident.get("hazmat_action_1"),
            "Q_Actions_Taken_2": incident.get("hazmat_action_2"),
            "Q_Actions_Taken_3": incident.get("hazmat_action_3"),
        }

    def generate_apparatus_module(self, incident: dict) -> list[dict]:
        """Generate NFIRS Apparatus/Resources Module"""
        apparatus_list = incident.get("apparatus", [])
        modules = []

        for app in apparatus_list:
            modules.append({
                "A_Apparatus_ID": app.get("unit_id"),
                "B_Apparatus_Type": app.get("apparatus_type"),
                "C_Dispatched_Time": self._format_time(app.get("dispatch_time")),
                "D_Arrival_Time": self._format_time(app.get("arrival_time")),
                "E_Clear_Time": self._format_time(app.get("clear_time")),
                "F_Personnel_Count": app.get("personnel_count"),
                "G_Actions_Taken_1": app.get("action_1"),
                "G_Actions_Taken_2": app.get("action_2"),
            })

        return modules

    def generate_personnel_module(self, incident: dict) -> list[dict]:
        """Generate NFIRS Personnel Module"""
        personnel_list = incident.get("personnel", [])
        modules = []

        for person in personnel_list:
            modules.append({
                "A_Activity_Date": self._format_date(incident.get("incident_date")),
                "B_Personnel_ID": person.get("employee_id"),
                "C_Activity_Type": person.get("activity_type"),
                "D_Actions_Taken_1": person.get("action_1"),
                "D_Actions_Taken_2": person.get("action_2"),
            })

        return modules

    def export_incident(self, incident: dict) -> dict:
        """Export complete NFIRS incident with all applicable modules"""
        export = {
            "basic_module": self.generate_basic_module(incident),
            "fire_module": self.generate_fire_module(incident),
            "structure_module": self.generate_structure_module(incident),
            "ems_module": self.generate_ems_module(incident),
            "hazmat_module": self.generate_hazmat_module(incident),
            "apparatus_modules": self.generate_apparatus_module(incident),
            "personnel_modules": self.generate_personnel_module(incident),
            "export_timestamp": datetime.now().isoformat(),
            "nfirs_version": "5.0",
        }

        export = {k: v for k, v in export.items() if v is not None}
        return export

    def _format_date(self, dt: Any) -> Optional[str]:
        if dt is None:
            return None
        if isinstance(dt, str):
            return dt[:10].replace("-", "")
        if isinstance(dt, datetime):
            return dt.strftime("%Y%m%d")
        return None

    def _format_time(self, dt: Any) -> Optional[str]:
        if dt is None:
            return None
        if isinstance(dt, str) and len(dt) >= 5:
            return dt[11:16].replace(":", "") if "T" in dt else dt[:5].replace(":", "")
        if isinstance(dt, datetime):
            return dt.strftime("%H%M")
        return None

    def _get_completed_modules(self, incident: dict) -> str:
        modules = ["1"]
        if incident.get("incident_type_code", "").startswith("1"):
            modules.append("2")
            if incident.get("is_structure_fire"):
                modules.append("3")
        if incident.get("incident_type_code", "").startswith("3"):
            modules.append("4")
        if incident.get("hazmat_release"):
            modules.append("5")
        if incident.get("apparatus"):
            modules.append("6")
        if incident.get("personnel"):
            modules.append("7")
        return ",".join(modules)
