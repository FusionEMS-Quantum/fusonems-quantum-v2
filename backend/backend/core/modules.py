from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List

@dataclass(frozen=True)
class ModuleSpec:
    key: str
    deps: List[str]

MODULES: Dict[str, ModuleSpec] = {
    "core": ModuleSpec("core", []),
    "billing": ModuleSpec("billing", ["core"]),
    "cad": ModuleSpec("cad", ["core"]),
    "transportlink": ModuleSpec("transportlink", ["core", "cad"]),
    "fire": ModuleSpec("fire", ["core"]),
    "hems": ModuleSpec("hems", ["core", "cad"]),
    "epcr": ModuleSpec("epcr", ["core"]),
    "telehealth": ModuleSpec("telehealth", ["core"]),
    "support": ModuleSpec("support", ["core"]),
    "founder": ModuleSpec("founder", ["core"]),
    "notifications": ModuleSpec("notifications", ["core"]),
    "telnyx": ModuleSpec("telnyx", ["core"]),
    "postmark": ModuleSpec("postmark", ["core"]),
}

def resolve_deps(module_key: str) -> List[str]:
    seen = set()
    order: List[str] = []

    def dfs(k: str):
        if k in seen:
            return
        seen.add(k)
        spec = MODULES.get(k)
        if not spec:
            return
        for d in spec.deps:
            dfs(d)
        order.append(k)

    dfs(module_key)
    return order
