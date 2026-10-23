#!/usr/bin/env python3
# coding: utf-8
"""Smoke: live LLM TeamRuntime debate → events-llm.json → rule_gate → v2.

Never prints API keys. Redacts secrets in captured log stream.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

SPIKE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SPIKE_DIR))

from llm_debate import load_model_env, main_async, redact  # noqa: E402
import asyncio


def main() -> int:
    env = load_model_env()
    secrets = [env.get("OPENJIUWEN_LLM_API_KEY", "")]
    for k in ("OPENAI_API_KEY",):
        if os.environ.get(k):
            secrets.append(os.environ[k])

    ungated = SPIKE_DIR / "events-llm.json"
    gated = SPIKE_DIR / "events-llm-v2.json"

    print("=== llm debate (TeamRuntime + GLM, secrets redacted) ===")
    print(
        f"model={env.get('OPENJIUWEN_LLM_MODEL')} "
        f"base={env.get('OPENJIUWEN_LLM_API_BASE')} "
        f"client_id={env.get('OPENJIUWEN_LLM_CLIENT_ID')}"
    )
    # never print key
    print("api_key=<redacted>")

    try:
        payload = asyncio.run(
            main_async(case_id="CASE-SPIKE-FAB-001", out_path=ungated)
        )
    except Exception as e:
        msg = redact(f"FAIL llm debate: {type(e).__name__}: {e}", secrets)
        print(msg)
        return 1

    print(
        redact(
            f"wrote {ungated} run_id={payload['run_id']} events={len(payload['events'])}",
            secrets,
        )
    )

    llm_nodes = [
        e for e in payload["events"] if (e.get("extra") or {}).get("source") == "llm"
        or e.get("source") == "llm"
        or (isinstance(e, dict) and e.get("node") in ("特征官", "证据官", "反方官")
            and e.get("evidence_ids") != ["EV-FAB-TRANSFER"])
    ]
    # SCHEMA may put source in top-level via extra merge
    sources = []
    for e in payload["events"]:
        if e.get("source") == "llm":
            sources.append(e["node"])
    if not sources:
        # make_event merges extra into top-level
        print("WARN: no source=llm markers found — check events")
    else:
        print(f"llm_roles={sources}")

    fab = [e for e in payload["events"] if "EV-FAB-TRANSFER" in (e.get("evidence_ids") or [])]
    if not fab:
        print("FAIL: missing EV-FAB-TRANSFER inject")
        return 1

    print("=== rule_gate ===")
    proc = subprocess.run(
        [
            sys.executable,
            str(SPIKE_DIR / "rule_gate.py"),
            "--fixture",
            str(ungated),
            "--dossier",
            str(SPIKE_DIR / "case" / "dossier.json"),
            "--rules",
            str(SPIKE_DIR / "rules" / "base.json"),
            "--out",
            str(gated),
        ],
        cwd=str(SPIKE_DIR),
        capture_output=True,
        text=True,
    )
    sys.stdout.write(redact(proc.stdout, secrets))
    sys.stderr.write(redact(proc.stderr, secrets))
    if proc.returncode != 0:
        print(f"FAIL: rule_gate exit {proc.returncode}")
        return proc.returncode

    out = json.loads(gated.read_text(encoding="utf-8"))
    if out.get("gate_verdict") != "refuse":
        print(f"FAIL: expected refuse got {out.get('gate_verdict')}")
        return 1
    if not any(e.get("node") == "审判官" and e.get("verdict") == "refuse" for e in out["events"]):
        print("FAIL: missing 审判官 refuse")
        return 1

    print(
        f"PASS gate_verdict=refuse fab={out.get('fabricated_evidence')} "
        f"rules={out.get('fabricated_rules')}"
    )
    print(f"Frontend candidate: {gated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
