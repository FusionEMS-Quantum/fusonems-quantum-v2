from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, DefaultDict
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

Handler = Callable[[Dict[str, Any]], None]

class EventBus:
    def __init__(self) -> None:
        self._handlers: DefaultDict[str, List[Handler]] = defaultdict(list)

    def on(self, event_name: str) -> Callable[[Handler], Handler]:
        def decorator(fn: Handler) -> Handler:
            self._handlers[event_name].append(fn)
            return fn
        return decorator

    def emit(self, event_name: str, payload: Dict[str, Any]) -> None:
        handlers = list(self._handlers.get(event_name, []))
        for h in handlers:
            try:
                h(payload)
            except Exception:
                logger.exception("event handler failed: %s", event_name)

event_bus = EventBus()
