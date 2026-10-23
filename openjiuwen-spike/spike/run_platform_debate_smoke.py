#!/usr/bin/env python3
# coding: utf-8
"""Smoke: TeamRuntime SCHEMA debate → events-platform.json → rule_gate → v2.

Deterministic / no LLM. NOT SwarmFlow PASS.
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SPIKE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SPIKE_DIR))

from event_schema import SHANGHAI  # noqa: E402
from platform_debate import main_async  # noqa: E402
import asyncio


def main() -> int:
    ungated = SPIKE_DIR / "events-platform.json"
    gated = SPIKE_DIR / "events-platform-v2.json"
    dossier = SPIKE_DIR / "case" / "dossier.json"
    rules = SPIKE_DIR / "rules" / "base.json"

    print("=== platform debate (TeamRuntime, deterministic) ===")
    payload = asyncio.run(
        main_async(case_id="CASE-SPIKE-FAB-001", out_path=ungated)
    )
    print(f"wrote {ungated} run_id={payload['run_id']} events={len(payload['events'])}")

    # Ensure fabrication present pre-gate
    fab_hits = [
        e
        for e in payload["events"]
        if "EV-FAB-TRANSFER" in (e.get("evidence_ids") or [])
    ]
    if not fab_hits:
        print("FAIL: ungated stream missing EV-FAB-TRANSFER")
        return 1

    print("=== rule_gate ===")
    cmd = [
        sys.executable,
        str(SPIKE_DIR / "rule_gate.py"),
        "--fixture",
        str(ungated),
        "--dossier",
        str(dossier),
        "--rules",
        str(rules),
        "--out",
        str(gated),
    ]
    proc = subprocess.run(cmd, cwd=str(SPIKE_DIR), capture_output=True, text=True)
    sys.stdout.write(proc.stdout)
    sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        print(f"FAIL: rule_gate exit {proc.returncode}")
        return proc.returncode

    out = json.loads(gated.read_text(encoding="utf-8"))
    if out.get("gate_verdict") != "refuse":
        print(f"FAIL: expected gate_verdict=refuse got {out.get('gate_verdict')}")
        return 1
    judge = [e for e in out.get("events", []) if e.get("node") == "审判官"]
    if not judge or judge[-1].get("verdict") != "refuse":
        print("FAIL: missing 审判官 refuse event")
        return 1

    print(
        f"PASS gate_verdict=refuse fabricated={out.get('fabricated_evidence')} "
        f"rules={out.get('fabricated_rules')}"
    )
    print(f"Frontend live-swap candidate: {gated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
