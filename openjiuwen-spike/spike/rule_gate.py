"""Deterministic citation gate: fabricated evidence/rule ids cannot support conviction.

Plan B: agents may hallucinate in speech; final verdict is stamped here.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from event_schema import make_event, map_node


@dataclass
class GateResult:
    fabricated_evidence: list[str] = field(default_factory=list)
    fabricated_rules: list[str] = field(default_factory=list)
    would_support_conviction: bool = False
    verdict: str = "pass"  # pass | refuse
    refuse_reason: str = ""
    events: list[dict[str, Any]] = field(default_factory=list)


def load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def dossier_evidence_ids(dossier: dict[str, Any]) -> set[str]:
    return {e["id"] for e in dossier.get("evidence", []) if "id" in e}


def rule_ids(rules: dict[str, Any]) -> set[str]:
    return {r["id"] for r in rules.get("rules", []) if "id" in r}


def scan_citations(
    utterances: list[dict[str, Any]],
    known_ev: set[str],
    known_rules: set[str],
) -> tuple[list[str], list[str]]:
    fab_ev: list[str] = []
    fab_rules: list[str] = []
    seen_ev: set[str] = set()
    seen_r: set[str] = set()
    for u in utterances:
        for eid in u.get("evidence_ids") or []:
            if eid not in known_ev and eid not in seen_ev:
                fab_ev.append(eid)
                seen_ev.add(eid)
        for rid in u.get("rule_ids") or []:
            if rid not in known_rules and rid not in seen_r:
                fab_rules.append(rid)
                seen_r.add(rid)
    return fab_ev, fab_rules


def _looks_like_conviction_support(u: dict[str, Any]) -> bool:
    """Heuristic: utterance pushes convict / risk-positive using citations."""
    text = (u.get("text") or "") + " " + str(u.get("verdict") or "")
    keys = ("定罪", "建议定罪", "移送", "高风险", "convict", "guilty", "risk_high")
    if any(k in text for k in keys):
        return True
    # structured intent
    if u.get("intent") in ("convict", "accuse", "risk_high"):
        return True
    role = u.get("role") or u.get("node") or ""
    try:
        node = map_node(role) if role else ""
    except ValueError:
        node = ""
    # 特征官/控方侧 citing unknown evidence counts as conviction support
    if node == "特征官" and (u.get("evidence_ids") or u.get("rule_ids")):
        return True
    return False


def stamp_verdict(
    *,
    run_id: str,
    case_id: str,
    dossier: dict[str, Any],
    rules: dict[str, Any],
    utterances: list[dict[str, Any]],
    proposed_verdict: str = "convict",
) -> GateResult:
    known_ev = dossier_evidence_ids(dossier)
    known_r = rule_ids(rules)
    fab_ev, fab_r = scan_citations(utterances, known_ev, known_r)

    supporting_fab = False
    for u in utterances:
        u_ev = [e for e in (u.get("evidence_ids") or []) if e not in known_ev]
        u_r = [r for r in (u.get("rule_ids") or []) if r not in known_r]
        if (u_ev or u_r) and _looks_like_conviction_support(u):
            supporting_fab = True
            break

    result = GateResult(
        fabricated_evidence=fab_ev,
        fabricated_rules=fab_r,
        would_support_conviction=supporting_fab,
    )

    if supporting_fab and proposed_verdict in ("convict", "guilty", "risk_high", "approve"):
        result.verdict = "refuse"
        parts = []
        if fab_ev:
            parts.append("编造证据: " + ", ".join(fab_ev))
        if fab_r:
            parts.append("编造条款: " + ", ".join(fab_r))
        result.refuse_reason = (
            "规则盖章拒绝定罪——"
            + ("；".join(parts) if parts else "存在未核验证据")
            + "。依据 R-02：定罪引用必须存在于案卷/规则库。"
        )
        result.events.append(
            make_event(
                run_id=run_id,
                case_id=case_id,
                node="审判官",
                text=result.refuse_reason,
                evidence_ids=fab_ev,
                rule_ids=["R-02"] + fab_r,
                verdict="refuse",
                refuse_reason=result.refuse_reason,
                extra={"fabricated_evidence": fab_ev, "fabricated_rules": fab_r},
            )
        )
    else:
        result.verdict = "pass" if not supporting_fab else "refuse"
        if result.verdict == "pass":
            result.events.append(
                make_event(
                    run_id=run_id,
                    case_id=case_id,
                    node="审判官",
                    text="引用均可核，规则盖章放行建议（最终仍可由业务层采纳）。",
                    evidence_ids=[],
                    rule_ids=["R-02"],
                    verdict="pass",
                )
            )
    return result


def gate_replay_file(
    fixture_path: str | Path,
    dossier_path: str | Path,
    rules_path: str | Path,
    *,
    run_id: str,
) -> GateResult:
    fixture = load_json(fixture_path)
    dossier = load_json(dossier_path)
    rules = load_json(rules_path)
    case_id = fixture.get("case_id") or dossier.get("case_id")
    utterances = fixture.get("events") or fixture.get("utterances") or []
    return stamp_verdict(
        run_id=run_id,
        case_id=case_id,
        dossier=dossier,
        rules=rules,
        utterances=utterances,
        proposed_verdict="convict",
    )


if __name__ == "__main__":
    import argparse
    from datetime import datetime
    from event_schema import SHANGHAI

    ap = argparse.ArgumentParser()
    ap.add_argument("--fixture", required=True)
    ap.add_argument("--dossier", default="case/dossier.json")
    ap.add_argument("--rules", default="rules/base.json")
    ap.add_argument("--out", default="events-v2.json")
    args = ap.parse_args()

    run_id = "run-gate-" + datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
    result = gate_replay_file(args.fixture, args.dossier, args.rules, run_id=run_id)

    # Rebuild full events-v2: map fixture utterances + judge stamp
    fixture = load_json(args.fixture)
    case_id = fixture.get("case_id")
    out_events = []
    for u in fixture.get("events") or []:
        role = u.get("role") or u.get("node") or "特征官"
        # skip human_confirm approving the lie in gated output — gate replaces with 审判官
        if role == "human_confirm" and u.get("approved") is True:
            continue
        out_events.append(
            make_event(
                run_id=run_id,
                case_id=case_id,
                node=role,
                text=u.get("text") or "",
                evidence_ids=u.get("evidence_ids"),
                rule_ids=u.get("rule_ids"),
                extra={"legacy_ts": u.get("ts")} if u.get("ts") else None,
            )
        )
    out_events.extend(result.events)

    out = {
        "run_id": run_id,
        "case_id": case_id,
        "gate_verdict": result.verdict,
        "refuse_reason": result.refuse_reason,
        "fabricated_evidence": result.fabricated_evidence,
        "fabricated_rules": result.fabricated_rules,
        "events": out_events,
    }
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"gate_verdict={result.verdict}")
    print(f"fabricated_evidence={result.fabricated_evidence}")
    print(f"fabricated_rules={result.fabricated_rules}")
    print(f"wrote {args.out}")
    if result.refuse_reason:
        print(result.refuse_reason)
