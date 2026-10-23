#!/usr/bin/env python3
# coding: utf-8
"""D5 Demo↔live e2e smoke: 5174 reachable + 5180 health/showcase + gated live SSE.

CASE-SPIKE-FAB-001 → SCHEMA events + gate_verdict=refuse (EV-FAB-TRANSFER).
NOT SwarmFlow attribution. Never prints API keys. Never claims 已接 Swarm.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = "http://127.0.0.1:5180"
DEMO = "http://127.0.0.1:5174"
CASE_ID = "CASE-SPIKE-FAB-001"
PASS_MARKER = "demo_live_bodyguard_e2e"
SPIKE = Path(__file__).resolve().parent
SHANGHAI = ZoneInfo("Asia/Shanghai")


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
    print(f"=== D5 demo_live_bodyguard_e2e {stamp} Asia/Shanghai ===")
    print(f"case_id={CASE_ID} demo={DEMO} live={BASE}")

    # --- Demo Vite ---
    print("=== GET Demo 5174/ ===")
    try:
        st, html = _get(DEMO + "/")
    except urllib.error.URLError as e:
        return fail(f"Demo 5174 not up: {e}")
    if st != 200:
        return fail(f"Demo status {st}")
    if "已接 Swarm" in html:
        return fail("Demo HTML must not claim 已接 Swarm")
    print(f"demo ok status={st} bytes={len(html)}")

    # --- health ---
    print("=== GET /health ===")
    try:
        st, text = _get(f"{BASE}/health")
    except urllib.error.URLError as e:
        return fail(f"5180 not up: {e} — start: ../.venv/bin/python live_server.py")
    if st != 200:
        return fail(f"health status {st}")
    health = json.loads(text)
    print(
        f"health ok live={health.get('live')} fabricate={health.get('fabricate')!r} "
        f"swarmflow={health.get('swarmflow')} label={health.get('label')}"
    )
    if health.get("live") is not True or health.get("fabricate") is not None:
        return fail("health must be live=true fabricate=null")
    if health.get("swarmflow") is True:
        return fail("live health must not claim swarmflow=true")
    if "确定性注入" in text or "已接 Swarm" in text:
        return fail("live health forbidden wording")

    # --- showcase contract stub ---
    print("=== GET /v1/showcase ===")
    try:
        st, text = _get(f"{BASE}/v1/showcase")
    except urllib.error.URLError as e:
        return fail(f"showcase unreachable: {e}")
    if st != 200:
        return fail(f"showcase status {st} (restart live_server.py if 404)")
    showcase = json.loads(text)
    print(f"showcase={json.dumps(showcase, ensure_ascii=False)}")
    if "5174" not in str(showcase.get("url", "")):
        return fail("showcase.url must point at Demo 5174")
    modes = showcase.get("modes") or []
    if "live" not in modes or "replay" not in modes:
        return fail(f"showcase.modes must include replay+live, got {modes}")
    if showcase.get("swarmflow") is True:
        return fail("showcase must not claim swarmflow=true")
    if "已接 Swarm" in text:
        return fail("showcase must not say 已接 Swarm")

    # --- gated live SSE (bodyguard fabricate case) ---
    print(f"=== POST /v1/debate/live gate=true case_id={CASE_ID} ===")
    try:
        st, raw = _post_sse(
            f"{BASE}/v1/debate/live",
            {"gate": True, "case_id": CASE_ID},
            timeout=300,
        )
    except Exception as e:
        return fail(f"debate request: {type(e).__name__}: {e}")
    if st != 200:
        return fail(f"debate status {st}")
    if "确定性注入" in raw or "已接 Swarm" in raw:
        return fail("live SSE forbidden wording")

    frames = parse_sse(raw)
    kinds = [k for k, _ in frames]
    print(f"sse_events={kinds}")

    errors = [d for k, d in frames if k == "error"]
    if errors:
        return fail(f"error frame {errors[0]}")

    schemas = [d for k, d in frames if k == "schema"]
    if not schemas:
        return fail("missing schema frame")
    sch = schemas[0]
    required_nodes = {"特征官", "证据官", "反方官", "审判官"}
    nodes = set(sch.get("nodes") or [])
    if not required_nodes.issubset(nodes):
        return fail(f"schema.nodes missing {required_nodes - nodes}")
    if sch.get("live") is not True or sch.get("fabricate") is not None:
        return fail("schema must be live=true fabricate=null")

    metas = [d for k, d in frames if k == "meta"]
    if metas and metas[-1].get("case_id") not in (None, CASE_ID):
        # allow interim meta without case_id; final should match when present
        pass
    case_ok = any(d.get("case_id") == CASE_ID for d in metas)
    if not case_ok:
        print(f"WARN: no meta.case_id={CASE_ID} yet (checking done)")

    dones = [d for k, d in frames if k == "done"]
    if not dones:
        return fail("missing done frame")
    done = dones[-1]
    if done.get("gate_verdict") != "refuse":
        return fail(f"expected gate_verdict=refuse got {done.get('gate_verdict')}")
    if done.get("live") is not True:
        return fail("done.live must be true")
    if done.get("fabricate") is not None:
        return fail(f"done.fabricate must be null, got {done.get('fabricate')!r}")
    if done.get("case_id") != CASE_ID:
        return fail(f"done.case_id want {CASE_ID} got {done.get('case_id')}")
    if done.get("swarmflow") is True:
        return fail("done must not claim swarmflow")

    fab_ev = done.get("fabricated_evidence") or []
    if "EV-FAB-TRANSFER" not in fab_ev:
        return fail(f"expected EV-FAB-TRANSFER in fabricated_evidence, got {fab_ev}")

    events = done.get("events") or []
    streamed = [d for k, d in frames if k == "event"]
    if len(events) < 1 and len(streamed) < 1:
        return fail("no SCHEMA events")
    use_events = events if events else streamed
    nodes_seen = {e.get("node") for e in use_events if isinstance(e, dict)}
    if "审判官" not in nodes_seen:
        return fail(f"missing 审判官 event; nodes={nodes_seen}")
    if not any(
        e.get("node") == "审判官" and e.get("verdict") == "refuse" for e in use_events
    ):
        return fail("missing 审判官 refuse event")

    # streamed event count for observability
    print(
        f"PASS_MARKER {PASS_MARKER} gate_verdict=refuse live=true fabricate=null "
        f"case_id={CASE_ID} fab_ev={fab_ev} events={len(use_events)} "
        f"streamed_event_frames={len(streamed)} nodes={sorted(n for n in nodes_seen if n)} "
        f"label={done.get('label')} demo=5174 showcase=ok swarmflow=false"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
