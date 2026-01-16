MODULE_DEPENDENCIES = {
    "CAD": [],
    "EPCR": ["CAD"],
    "BILLING": ["EPCR"],
    "FIRE": [],
    "TELEHEALTH": [],
    "HEMS": ["COMMS"],
    "COMMS": [],
    "SCHEDULING": [],
    "INVENTORY": [],
    "AUTOMATION": [],
    "VALIDATION": [],
    "COMPLIANCE": [],
    "AI_CONSOLE": [],
    "FOUNDER": [],
    "INVESTOR": [],
    "EVENTS": [],
    "BUSINESS_OPS": [],
    "TRAINING": [],
    "EXPORTS": [],
    "REPAIR": [],
}

MODULE_KEYS = list(MODULE_DEPENDENCIES.keys())
