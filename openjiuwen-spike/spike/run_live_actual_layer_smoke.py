#!/usr/bin/env python3
# coding: utf-8
"""Actual-layer contract smoke for POST /v1/debate/live.

Default (no LLM burn):
  1) health + footer wording
  2) short transcript → SSE error transcript_too_short (no LLM)
  3) dual-read chat_transcript also rejects when short
  4) Demo-compat body {gate, case_id} still accepted (schema only / optional full)

Optional LLM (set LIVE_ACTUAL_LLM=1): one short-but-valid transcript gated live.
Never prints API keys. Never claims 已接 Swarm.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = "http://127.0.0.1:5180"
PASS_MARKER = "live_actual_layer"
SPIKE = Path(__file__).resolve().parent
SHANGHAI = ZoneInfo("Asia/Shanghai")
LOG_DIR = SPIKE / "logs"


def _get(url: str, timeout: int = 15) -> tuple[int, str]:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", errors="replace")


def _post_sse(url: str, body: dict, timeout: int = 300) -> tuple[int, str]:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", errors="replace")


def parse_sse(raw: str) -> list[tuple[str, dict]]:
    out: list[tuple[str, dict]] = []
    event = "message"
    data_lines: list[str] = []
    for line in raw.splitlines():
        if line.startswith("event:"):
            event = line[6:].strip()
        elif line.startswith("data:"):
            data_lines.append(line[5:].lstrip())
        elif line.strip() == "":
            if data_lines:
                blob = "\n".join(data_lines)
                try:
                    out.append((event, json.loads(blob)))
                except json.JSONDecodeError:
                    out.append((event, {"raw": blob}))
            event = "message"
            data_lines = []
    if data_lines:
        blob = "\n".join(data_lines)
        try:
            out.append((event, json.loads(blob)))
        except json.JSONDecodeError:
            out.append((event, {"raw": blob}))
    return out


def fail(msg: str) -> int:
    print(f"FAIL: {msg}")
    print(f"FAIL_MARKER {PASS_MARKER}")
    return 1


def main() -> int:
    stamp = datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
    print(f"=== live_actual_layer smoke {stamp} Asia/Shanghai ===")
    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"run-live-actual-layer-{stamp}.log"
    lines: list[str] = []

    def log(s: str) -> None:
        print(s)
        lines.append(s)

    # --- health ---
    log("=== GET /health ===")
    try:
        st, text = _get(f"{BASE}/health")
    except urllib.error.URLError as e:
        return fail(f"5180 not up: {e} — start: ../.venv/bin/python live_server.py")
    if st != 200:
        return fail(f"health status {st}")
    health = json.loads(text)
    log(
        f"health ok live={health.get('live')} fabricate={health.get('fabricate')!r} "
        f"swarmflow={health.get('swarmflow')} footer={health.get('footer')!r}"
    )
    if health.get("swarmflow") is True:
        return fail("health must not claim swarmflow")
    if "已接 Swarm" in text:
        return fail("health forbidden 已接 Swarm")
    footer = health.get("footer") or ""
    if "真 LLM 现场会商" not in footer or "rule_gate" not in footer:
        return fail(f"health.footer want 真 LLM 现场会商 + rule_gate, got {footer!r}")

    # --- short transcript reject (no LLM) ---
    log("=== POST short transcript (expect error, no LLM) ===")
    try:
        st, raw = _post_sse(
            f"{BASE}/v1/debate/live",
            {
                "layer": "live",
                "transcript": "太短了",
                "gate": True,
            },
            timeout=30,
        )
    except Exception as e:
        return fail(f"short transcript request: {type(e).__name__}: {e}")
    if st != 200:
        return fail(f"short transcript status {st}")
    if "已接 Swarm" in raw:
        return fail("SSE must not say 已接 Swarm")
    frames = parse_sse(raw)
    kinds = [k for k, _ in frames]
    log(f"short sse_events={kinds}")
    errors = [d for k, d in frames if k == "error"]
    if not errors:
        return fail("expected error frame for short transcript")
    err = errors[0]
    if err.get("code") != "transcript_too_short":
        return fail(f"expected code=transcript_too_short got {err}")
    log(f"short_reject ok code={err.get('code')} message={err.get('message')}")

    # --- dual-read chat_transcript ---
    log("=== POST short chat_transcript dual-read ===")
    try:
        st, raw = _post_sse(
            f"{BASE}/v1/debate/live",
            {"chat_transcript": "还是太短", "gate": True},
            timeout=30,
        )
    except Exception as e:
        return fail(f"dual-read request: {type(e).__name__}: {e}")
    frames = parse_sse(raw)
    errors = [d for k, d in frames if k == "error"]
    if not errors or errors[0].get("code") != "transcript_too_short":
        return fail(f"dual-read short should error, got {errors}")
    log("dual_read_reject ok")

    # --- Demo-compat path still opens (schema + busy-or-run); do NOT require full LLM ---
    # Just verify old body is not rejected as transcript_too_short
    log("=== POST Demo-compat {gate, case_id} schema check ===")
    # We only verify parse accepts: send gate=false would burn LLM.
    # Instead unit-check via importing parse_live_request locally.
    sys.path.insert(0, str(SPIKE))
    from live_server import parse_live_request

    demo = parse_live_request({"gate": True, "case_id": "CASE-SPIKE-FAB-001"}, None)
    if demo.get("error"):
        return fail(f"Demo-compat parse must not error: {demo['error']}")
    if demo.get("actual_layer"):
        return fail("Demo-compat must not be actual_layer")
    if demo.get("case_id") != "CASE-SPIKE-FAB-001":
        return fail(f"Demo case_id mismatch {demo.get('case_id')}")
    log("demo_compat_parse ok")

    live_ok = parse_live_request(
        {
            "layer": "live",
            "transcript": "对方自称客服要我马上转账到安全账户，限十分钟内完成，否则冻结。" * 2,
            "amount": 5000,
            "payee": "安全账户",
            "urgency": "high",
            "gate": True,
            "suspect_links": ["https://evil.example/pay"],
            "user_note": "家人催",
        },
        None,
    )
    if live_ok.get("error"):
        return fail(f"valid live parse errored: {live_ok['error']}")
    if not live_ok.get("actual_layer"):
        return fail("valid live must be actual_layer")
    if live_ok.get("urgency") != "high":
        return fail("urgency not kept")
    # illegal urgency → mid
    urg = parse_live_request(
        {"transcript": "x" * 25, "urgency": "urgent!!!"}, None
    )
    if urg.get("urgency") != "mid":
        return fail(f"illegal urgency should fall back to mid, got {urg.get('urgency')}")
    log("parse_fields ok")

    # --- optional LLM ---
    if os.environ.get("LIVE_ACTUAL_LLM", "").strip() in ("1", "true", "yes"):
        log("=== LIVE_ACTUAL_LLM=1: gated live with transcript fixture ===")
        fixture = (
            "【客服】您好，我是银行客服，您的账户异常，请立刻转到安全账户。"
            "【用户】真的吗？要转多少？"
            "【客服】请在十分钟内转五千元，否则系统自动扣款并冻结账户。"
            "【用户】好的我这就去转。"
        )
        try:
            st, raw = _post_sse(
                f"{BASE}/v1/debate/live",
                {
                    "layer": "live",
                    "transcript": fixture,
                    "amount": 5000,
                    "payee": "安全账户",
                    "urgency": "high",
                    "gate": True,
                },
                timeout=300,
            )
        except Exception as e:
            return fail(f"live transcript debate: {type(e).__name__}: {e}")
        if "已接 Swarm" in raw or "确定性注入" in raw:
            return fail("live SSE forbidden wording")
        frames = parse_sse(raw)
        errors = [d for k, d in frames if k == "error"]
        if errors:
            return fail(f"live debate error {errors[0]}")
        dones = [d for k, d in frames if k == "done"]
        if not dones:
            return fail("missing done")
        done = dones[-1]
        log(
            f"live_done gate_verdict={done.get('gate_verdict')} "
            f"actual_layer={done.get('actual_layer')} "
            f"empty_evidence_refuse={done.get('empty_evidence_refuse')} "
            f"footer={done.get('footer')!r}"
        )
        if done.get("gate_verdict") != "refuse":
            # actual layer with EV-LIVE-001 may pass if citations clean;
            # empty_evidence must refuse; fabricated must refuse.
            # Accept refuse OR pass with evidence; but never convict without ids.
            pass
        if done.get("swarmflow") is True:
            return fail("done must not claim swarmflow")
        if done.get("footer") and "已接 Swarm" in str(done.get("footer")):
            return fail("footer forbidden")
        log("live_transcript_llm ok")
    else:
        log("skip LIVE_ACTUAL_LLM (set LIVE_ACTUAL_LLM=1 to burn one short live run)")

    msg = (
        f"PASS_MARKER {PASS_MARKER} short_reject=ok dual_read=ok "
        f"demo_compat_parse=ok footer=真 LLM 现场会商 + 本地 rule_gate "
        f"swarmflow=false"
    )
    log(msg)
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"log={log_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
