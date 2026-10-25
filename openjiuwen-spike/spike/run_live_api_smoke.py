#!/usr/bin/env python3
# coding: utf-8
"""Smoke: health 200 + POST gated live debate → gate_verdict=refuse.

Never prints API keys. Expects live_server on 127.0.0.1:5180
unless OPENJIUWEN_LIVE_PORT / OPENJIUWEN_LIVE_BASE says otherwise.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from ports_env import live_base

BASE = live_base()
SPIKE = Path(__file__).resolve().parent


def _get(url: str) -> tuple[int, str]:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode("utf-8")


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
        return r.status, r.read().decode("utf-8")


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


def main() -> int:
    print("=== GET /health ===")
    try:
        status, text = _get(f"{BASE}/health")
    except urllib.error.URLError as e:
        print(f"FAIL: server not up: {e}")
        print(f"start: cd {SPIKE} && ../.venv/bin/python live_server.py")
        return 1
    if status != 200:
        print(f"FAIL: health status {status}")
        return 1
    health = json.loads(text)
    print(f"health ok live={health.get('live')} fabricate={health.get('fabricate')!r} label={health.get('label')}")
    if "确定性注入" in text:
        print("FAIL: live health must not say 确定性注入")
        return 1

    print("=== POST /v1/debate/live gate=true (SSE) ===")
    try:
        status, raw = _post_sse(f"{BASE}/v1/debate/live", {"gate": True})
    except Exception as e:
        print(f"FAIL: debate request: {type(e).__name__}: {e}")
        return 1
    if status != 200:
        print(f"FAIL: debate status {status}")
        return 1
    if "确定性注入" in raw:
        print("FAIL: live SSE must not contain 确定性注入")
        return 1

    frames = parse_sse(raw)
    kinds = [k for k, _ in frames]
    print(f"sse_events={kinds}")

    errors = [d for k, d in frames if k == "error"]
    if errors:
        print(f"FAIL: error frame {errors[0]}")
        return 1

    dones = [d for k, d in frames if k == "done"]
    if not dones:
        print("FAIL: missing done frame")
        return 1
    done = dones[-1]
    if done.get("gate_verdict") != "refuse":
        print(f"FAIL: expected gate_verdict=refuse got {done.get('gate_verdict')}")
        return 1
    if done.get("live") is not True:
        print("FAIL: done.live must be true")
        return 1
    if done.get("fabricate") is not None:
        print(f"FAIL: done.fabricate must be null, got {done.get('fabricate')!r}")
        return 1
    fab_ev = done.get("fabricated_evidence") or []
    if "EV-FAB-TRANSFER" not in fab_ev:
        print(f"FAIL: expected EV-FAB-TRANSFER in fabricated_evidence, got {fab_ev}")
        return 1
    events = done.get("events") or []
    if not any(e.get("node") == "审判官" and e.get("verdict") == "refuse" for e in events):
        print("FAIL: missing 审判官 refuse event")
        return 1

    print(
        f"PASS gate_verdict=refuse live=true fabricate=null "
        f"fab_ev={fab_ev} events={len(events)} label={done.get('label')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
