from utils.events import event_bus
from utils.logger import logger


def register_event_handlers() -> None:
    def log_handler(event):
        logger.info("Event processed %s for org %s", event.event_type, event.org_id)

    for event_type in [
        "RUN_CREATED",
        "UNIT_ASSIGNED",
        "PATIENT_CONTACT",
        "TRANSPORT_STARTED",
        "CHART_LOCKED",
        "CLAIM_SUBMITTED",
        "RECORD_ACCESSED",
    ]:
        event_bus.register(event_type, log_handler)
