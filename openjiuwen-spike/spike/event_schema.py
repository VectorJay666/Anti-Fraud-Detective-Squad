"""Frontend-facing event schema helpers (Asia/Shanghai ISO8601)."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any

SHANGHAI = timezone(timedelta(hours=8), name="Asia/Shanghai")

NODE_MAP = {
    "accuser": "特征官",
    "prosecutor": "特征官",
    "feature": "特征官",
    "evidence": "证据官",
    "defender": "反方官",
    "judge": "审判官",
    "risk": "风险官",
    "compliance": "合规官",
    "protect": "用户保护官",
    "human_confirm": "human_confirm",
    "特征官": "特征官",
    "证据官": "证据官",
    "反方官": "反方官",
    "审判官": "审判官",
    "风险官": "风险官",
    "合规官": "合规官",
    "用户保护官": "用户保护官",
}

ALLOWED_NODES = {
    "特征官",
    "证据官",
    "反方官",
    "审判官",
    "风险官",
    "合规官",
    "用户保护官",
    "human_confirm",
}


def now_iso() -> str:
    return datetime.now(SHANGHAI).isoformat(timespec="seconds")


def map_node(role_or_node: str) -> str:
    n = NODE_MAP.get(role_or_node, role_or_node)
    if n not in ALLOWED_NODES:
        raise ValueError(f"unknown node: {role_or_node!r}")
    return n


def make_event(
    *,
    run_id: str,
    case_id: str,
    node: str,
    text: str = "",
    evidence_ids: list[str] | None = None,
    rule_ids: list[str] | None = None,
    ts: str | None = None,
    verdict: str | None = None,
    refuse_reason: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ev: dict[str, Any] = {
        "run_id": run_id,
        "case_id": case_id,
        "ts": ts or now_iso(),
        "node": map_node(node),
        "text": text,
        "evidence_ids": list(evidence_ids or []),
        "rule_ids": list(rule_ids or []),
    }
    if verdict is not None:
        ev["verdict"] = verdict
    if refuse_reason is not None:
        ev["refuse_reason"] = refuse_reason
    if extra:
        for k, v in extra.items():
            if k not in ev:
                ev[k] = v
    return ev
