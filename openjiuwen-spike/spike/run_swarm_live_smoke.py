#!/usr/bin/env python3
# coding: utf-8
"""Smoke: POST /v1/swarm/debate (SwarmFlow actual-layer).

Default (minimal LLM):
  1) health advertises swarm_path, default swarmflow=false
  2) short transcript → transcript_too_short (no Swarm)
  3) old /v1/debate/live still swarmflow=false on schema
  4) one real SwarmFlow run (gate:true) → done.swarmflow=true

Set SWARM_LIVE_SKIP_LLM=1 to skip step 4 (contract-only).
Never prints API keys. Never claims contest 「已接 Swarm」.
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

BASE = os.environ.get("OPENJIUWEN_LIVE_BASE", "http://127.0.0.1:5180")
PASS_MARKER = "live_three_officers_speak"
SPIKE = Path(__file__).resolve().parent
SHANGHAI = ZoneInfo("Asia/Shanghai")
LOG_DIR = SPIKE / "logs"

SAMPLE_TR = (
    "对方自称银行客服，说我的账户异常必须马上转到安全账户，"
    "否则十分钟内冻结。催我现在就转五千块到所谓安全账户。"
    "我还没转。请帮我裁定风险。"
)


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


def fail(msg: str, lines: list[str] | None = None) -> int:
    print(f"FAIL: {msg}")
    print(f"FAIL_MARKER {PASS_MARKER}")
    if lines is not None:
        lines.append(f"FAIL: {msg}")
        lines.append(f"FAIL_MARKER {PASS_MARKER}")
    return 1


def main() -> int:
    stamp = datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
    print(f"=== swarm_live_debate smoke {stamp} Asia/Shanghai ===")
    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"run-swarm-live-{stamp}.log"
    lines: list[str] = [f"=== swarm_live_debate smoke {stamp} Asia/Shanghai ==="]

    def log(s: str) -> None:
        print(s)
        lines.append(s)

    skip_llm = os.environ.get("SWARM_LIVE_SKIP_LLM", "").strip() in ("1", "true", "yes")

    # --- health ---
    log("=== GET /health ===")
    try:
        st, text = _get(f"{BASE}/health")
    except urllib.error.URLError as e:
        return fail(f"5180 not up: {e} — restart live_server.py", lines)

    if st != 200:
        return fail(f"health status {st}", lines)
    health = json.loads(text)
    log(
        f"health ok swarmflow={health.get('swarmflow')} "
        f"swarm_path={health.get('swarm_path')!r} engines={health.get('engines')}"
    )
    if health.get("swarmflow") is True:
        return fail("health.swarmflow must stay false (default TeamRuntime)", lines)
    if health.get("swarm_path") != "/v1/swarm/debate":
        return fail(f"health.swarm_path missing, got {health.get('swarm_path')!r}", lines)
    if "已接 Swarm" in text and "禁写" not in text:
        return fail("health forbidden bare 已接 Swarm", lines)

    # --- short reject on swarm path ---
    log("=== POST /v1/swarm/debate short transcript ===")
    try:
        st, raw = _post_sse(
            f"{BASE}/v1/swarm/debate",
            {"layer": "live", "transcript": "太短了", "gate": True},
            timeout=30,
        )
    except Exception as e:
        return fail(f"short request: {type(e).__name__}: {e}", lines)
    frames = parse_sse(raw)
    kinds = [k for k, _ in frames]
    log(f"short sse_events={kinds}")
    errors = [d for k, d in frames if k == "error"]
    if not errors or errors[0].get("code") != "transcript_too_short":
        return fail(f"expected transcript_too_short got {errors}", lines)
    # schema on swarm path should advertise engine without claiming done.swarmflow yet
    schemas = [d for k, d in frames if k == "schema"]
    if schemas and schemas[0].get("swarmflow") is True:
        return fail("schema must not set swarmflow true before engine run", lines)
    log("short_reject ok")

    # --- old TeamRuntime path unbroken ---
    log("=== POST /v1/debate/live short (TeamRuntime path unbroken) ===")
    try:
        st, raw = _post_sse(
            f"{BASE}/v1/debate/live",
            {"layer": "live", "transcript": "太短了", "gate": True},
            timeout=30,
        )
    except Exception as e:
        return fail(f"legacy short: {type(e).__name__}: {e}", lines)
    frames = parse_sse(raw)
    schemas = [d for k, d in frames if k == "schema"]
    if not schemas or schemas[0].get("swarmflow") is not False:
        return fail(f"legacy schema.swarmflow must be false, got {schemas}", lines)
    errors = [d for k, d in frames if k == "error"]
    if not errors or errors[0].get("code") != "transcript_too_short":
        return fail(f"legacy short reject broken: {errors}", lines)
    log("legacy_path ok swarmflow=false")

    if skip_llm:
        log("SWARM_LIVE_SKIP_LLM=1 — skip real SwarmFlow burn")
        log(f"PASS_MARKER {PASS_MARKER} (contract_only)")
        log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"wrote {log_path}")
        return 0

    # --- real SwarmFlow ---
    log("=== POST /v1/swarm/debate real SwarmFlow (gate:true) ===")
    body = {
        "layer": "live",
        "transcript": SAMPLE_TR,
        "amount": 5000,
        "payee": "安全账户",
        "urgency": "high",
        "gate": True,
        "case_id": None,
        "suspect_links": [],
        "user_note": "swarm live smoke",
    }
    try:
        st, raw = _post_sse(f"{BASE}/v1/swarm/debate", body, timeout=240)
    except Exception as e:
        return fail(f"swarm run: {type(e).__name__}: {e}", lines)

    if "已接 Swarm" in raw and "禁写" not in raw:
        # allow warning that says 禁写「已接 Swarm」
        bad = [ln for ln in raw.splitlines() if "已接 Swarm" in ln and "禁写" not in ln]
        if bad:
            return fail(f"SSE bare 已接 Swarm: {bad[:2]}", lines)

    frames = parse_sse(raw)
    kinds = [k for k, _ in frames]
    log(f"swarm sse_events={kinds}")
    errors = [d for k, d in frames if k == "error"]
    if errors:
        return fail(f"swarm error: {errors[0]}", lines)
    dones = [d for k, d in frames if k == "done"]
    if not dones:
        return fail(f"no done frame; kinds={kinds}", lines)
    done = dones[0]
    log(
        f"done swarmflow={done.get('swarmflow')} gate_verdict={done.get('gate_verdict')} "
        f"label={done.get('label')!r} footer={done.get('footer')!r} "
        f"empty_evidence_refuse={done.get('empty_evidence_refuse')}"
    )
    if done.get("swarmflow") is not True:
        return fail("done.swarmflow must be true on real SwarmFlow path", lines)
    if done.get("label") != "SwarmFlow 现场会商":
        return fail(f"label want SwarmFlow 现场会商 got {done.get('label')!r}", lines)
    if "SwarmFlow" not in (done.get("footer") or ""):
        return fail(f"footer must mention SwarmFlow, got {done.get('footer')!r}", lines)
    if done.get("gate") is not True:
        return fail("gate should be true", lines)
    if done.get("gate_verdict") is None:
        return fail("gate_verdict missing", lines)
    meta_true = [
        d
        for k, d in frames
        if k == "meta" and d.get("swarmflow") is True
    ]
    if not meta_true:
        return fail("expected a meta frame with swarmflow=true after engine", lines)
    wf = (done.get("swarmflow_meta") or meta_true[0].get("swarmflow_meta") or {}).get(
        "workflow"
    )
    log(f"swarmflow_meta.workflow={wf!r}")
    events = done.get("events") or []
    nodes = [e.get("node") for e in events]
    mid_n = done.get("mid_events_emitted")
    log(f"nodes={nodes} mid_events_emitted={mid_n}")
    if "特征官" not in nodes or "证据官" not in nodes:
        return fail(f"missing feature/evidence nodes: {nodes}", lines)
    for need in ("风险官", "合规官", "用户保护官"):
        if need not in nodes:
            return fail(f"missing new officer node {need}: {nodes}", lines)
    for need in ("风险官", "合规官", "用户保护官"):
        texts = [str(e.get("text") or "").strip() for e in events if e.get("node") == need]
        if not any(texts):
            return fail(f"{need} text empty in done.events", lines)
        log(f"{need}_text_len={len(texts[0])} preview={texts[0][:60]!r}")
    mid_frames_pre = [d for k, d in frames if k == "event"]
    for need in ("风险官", "合规官", "用户保护官"):
        mid_t = [str(d.get("text") or "").strip() for d in mid_frames_pre if d.get("node") == need]
        if not any(mid_t):
            return fail(f"{need} missing non-empty mid-stream event", lines)
    # Mid-stream SCHEMA bubbles: 5 live officers + scripted 反方 ≈ ≥5
    if isinstance(mid_n, int) and mid_n < 5:
        return fail(f"mid_events_emitted want ≥5 got {mid_n}", lines)
    mid_frames = [d for k, d in frames if k == "event"]
    mid_nodes = [d.get("node") for d in mid_frames]
    log(f"sse_event_nodes_order={mid_nodes}")
    # Contract order: 特征→证据→风险→合规→反方→用户保护→审判
    want_seq = ["特征官", "证据官", "风险官", "合规官", "反方官", "用户保护官"]
    positions = []
    for name in want_seq:
        try:
            positions.append(mid_nodes.index(name))
        except ValueError:
            return fail(f"order missing mid node {name}: {mid_nodes}", lines)
    if positions != sorted(positions):
        return fail(f"officer order wrong: {mid_nodes} want {want_seq}", lines)
    log("officer_order_ok " + "→".join(want_seq))

    # also verify engine=swarm alias on debate/live (short only — no second LLM burn)
    log("=== POST /v1/debate/live engine=swarm short alias ===")
    st, raw = _post_sse(
        f"{BASE}/v1/debate/live",
        {"engine": "swarm", "transcript": "太短", "gate": True},
        timeout=30,
    )
    frames = parse_sse(raw)
    errors = [d for k, d in frames if k == "error"]
    if not errors or errors[0].get("code") != "transcript_too_short":
        return fail(f"engine=swarm alias short fail: {errors}", lines)
    log("engine_alias ok")

    log(f"PASS_MARKER {PASS_MARKER}")
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {log_path}")
    return 0


if __name__ == "__main__":
    # capture fail path to log too
    code = main()
    raise SystemExit(code)
