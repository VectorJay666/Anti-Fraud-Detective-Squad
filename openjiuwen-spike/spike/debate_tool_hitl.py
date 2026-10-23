#!/usr/bin/env python3
"""Scripted debate + tool + HITL fixture for spike (Plan B gate input).

This file does NOT call openJiuwen SwarmFlow / live LLM APIs.
It emits a deterministic event stream matching the known hallucination
scenario (控方编造 EV-FAB-TRANSFER「转账记录已移送」→ human_confirm 放行),
so rule_gate can demonstrate a real 打回 without inventing platform APIs.

Live openJiuwen smoke (p2p / hierarchical / SwarmFlow) is tracked in REPORT.md;
those items are BLOCKED or 未复现 until deps+LogConfig are green.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from event_schema import SHANGHAI, make_event, now_iso


def build_scripted_events(run_id: str, case_id: str) -> list[dict]:
    # Tiny "tool" stub: lookup link — real dossier hit only
    tool_hit = {
        "tool": "lookup_chat_evidence",
        "query": "催转话术",
        "hits": ["EV-001", "EV-002"],
    }
    events = [
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="特征官",
            text="特征：冒充客服 + 催转限时。引用 EV-001、EV-002。",
            evidence_ids=["EV-001", "EV-002"],
            rule_ids=["R-01"],
            extra={"phase": "feature"},
        ),
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="证据官",
            text=f"工具 lookup_chat_evidence 命中 {tool_hit['hits']}。",
            evidence_ids=["EV-001", "EV-002"],
            rule_ids=[],
            extra={"phase": "tool", "tool": tool_hit},
        ),
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="反方官",
            text="可能是用户主动咨询，不宜直接定罪。",
            evidence_ids=[],
            rule_ids=[],
            extra={"phase": "debate"},
        ),
        # HALLUCINATION: fabricated transfer evidence
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="特征官",
            text="转账记录已移送，编号 EV-FAB-TRANSFER，建议定罪。",
            evidence_ids=["EV-FAB-TRANSFER"],
            rule_ids=["R-01", "R-99"],
            extra={"phase": "debate", "hallucination": True},
        ),
        # Pre-gate path: human wrongly approves (documented risk)
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="human_confirm",
            text="approved true",
            evidence_ids=["EV-FAB-TRANSFER"],
            rule_ids=[],
            extra={"phase": "hitl", "approved": True},
        ),
    ]
    return events


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="events.json")
    ap.add_argument("--case-id", default="CASE-SPIKE-FAB-001")
    args = ap.parse_args()
    run_id = "run-scripted-" + datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
    events = build_scripted_events(run_id, args.case_id)
    payload = {
        "run_id": run_id,
        "case_id": args.case_id,
        "generated_at": now_iso(),
        "mode": "scripted_fixture",
        "warning": "Not a live openJiuwen Swarm run. See REPORT.md.",
        "events": events,
    }
    Path(args.out).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {args.out} run_id={run_id} events={len(events)}")


if __name__ == "__main__":
    main()
