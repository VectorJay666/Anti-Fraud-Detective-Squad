#!/usr/bin/env python3
# coding: utf-8
"""Smoke: Swarm mid-run progress streams over SSE BEFORE done.

Proves wall-clock: first `progress` AND mid-stream SCHEMA `event` frames
arrive earlier than `done` (streaming reader records arrival monotonic times).
Success: ≥2 mid-stream `event` frames before `done` (or ≥1 per speaking agent).

PASS_MARKER swarm_live_progress
Never prints API keys. Never claims contest 「已接 Swarm」.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = os.environ.get("OPENJIUWEN_LIVE_BASE", "http://127.0.0.1:5180")
PASS_MARKER = "swarm_live_progress"
SPIKE = Path(__file__).resolve().parent
SHANGHAI = ZoneInfo("Asia/Shanghai")
LOG_DIR = SPIKE / "logs"

SAMPLE_TR = (
    "对方自称银行客服，说我的账户异常必须马上转到安全账户，"
    "否则十分钟内冻结。催我现在就转五千块到所谓安全账户。"
    "我还没转。请帮我裁定风险。"
)


def fail(msg: str, lines: list[str] | None = None) -> int:
    print(f"FAIL: {msg}")
    print(f"FAIL_MARKER {PASS_MARKER}")
    if lines is not None:
        lines.append(f"FAIL: {msg}")
        lines.append(f"FAIL_MARKER {PASS_MARKER}")
    return 1


def stream_sse(url: str, body: dict, timeout: int = 300) -> list[tuple[str, dict, float]]:
    """Return list of (event, data, arrival_monotonic)."""
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
    frames: list[tuple[str, dict, float]] = []
    event = "message"
    data_lines: list[str] = []
    t0 = time.monotonic()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        # line-buffered read so frames arrive mid-run
        while True:
            raw = r.readline()
            if not raw:
                break
            line = raw.decode("utf-8", errors="replace").rstrip("\n").rstrip("\r")
            arrived = time.monotonic() - t0
            if line.startswith("event:"):
                event = line[6:].strip()
            elif line.startswith("data:"):
                data_lines.append(line[5:].lstrip())
            elif line.strip() == "":
                if data_lines:
                    blob = "\n".join(data_lines)
                    try:
                        payload = json.loads(blob)
                    except json.JSONDecodeError:
                        payload = {"raw": blob}
                    frames.append((event, payload, arrived))
                event = "message"
                data_lines = []
    if data_lines:
        blob = "\n".join(data_lines)
        try:
            payload = json.loads(blob)
        except json.JSONDecodeError:
            payload = {"raw": blob}
        frames.append((event, payload, time.monotonic() - t0))
    return frames


def main() -> int:
    stamp = datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
    print(f"=== swarm_live_progress smoke {stamp} Asia/Shanghai ===")
    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"run-swarm-progress-{stamp}.log"
    lines: list[str] = [f"=== swarm_live_progress smoke {stamp} Asia/Shanghai ==="]

    def log(s: str) -> None:
        print(s)
        lines.append(s)

    # health
    try:
        with urllib.request.urlopen(f"{BASE}/health", timeout=10) as r:
            health = json.loads(r.read().decode())
    except Exception as e:
        return fail(f"5180 not up: {e}", lines)
    log(f"health ok swarm_path={health.get('swarm_path')!r}")

    skip = os.environ.get("SWARM_PROGRESS_SKIP_LLM", "").strip() in ("1", "true", "yes")
    if skip:
        log("SWARM_PROGRESS_SKIP_LLM=1 — not a full PASS")
        return fail("skip mode not allowed for this marker", lines)

    log("=== POST /v1/swarm/debate streaming progress ===")
    body = {
        "layer": "live",
        "transcript": SAMPLE_TR,
        "amount": 5000,
        "payee": "安全账户",
        "urgency": "high",
        "gate": True,
        "suspect_links": [],
        "user_note": "swarm progress smoke",
    }
    try:
        frames = stream_sse(f"{BASE}/v1/swarm/debate", body, timeout=240)
    except Exception as e:
        return fail(f"stream: {type(e).__name__}: {e}", lines)

    kinds = [k for k, _, _ in frames]
    log(f"sse_kinds={kinds}")
    for k, d, t in frames:
        if k == "progress":
            log(
                f"  @{t:.3f}s progress seq={d.get('seq')} kind={d.get('kind')} "
                f"text={d.get('text')!r} ts={d.get('ts')}"
            )
        elif k == "event":
            log(
                f"  @{t:.3f}s event node={d.get('node')!r} "
                f"streamed_mid_run={d.get('streamed_mid_run')} "
                f"ts={d.get('ts')} text={(d.get('text') or '')[:60]!r}"
            )
        elif k in ("meta", "done", "error"):
            log(
                f"  @{t:.3f}s {k} swarmflow={d.get('swarmflow')} "
                f"progress_emitted={d.get('progress_emitted')} "
                f"mid_events_emitted={d.get('mid_events_emitted')} "
                f"gate_verdict={d.get('gate_verdict')}"
            )

    raw_join = json.dumps([d for _, d, _ in frames], ensure_ascii=False)
    if "已接 Swarm" in raw_join and "禁写" not in raw_join:
        bad = [x for x in raw_join.split("已接 Swarm") if "禁写" not in x[:20]]
        if bad:
            return fail("bare 已接 Swarm in stream", lines)

    errors = [d for k, d, _ in frames if k == "error"]
    if errors:
        return fail(f"error frame: {errors[0]}", lines)

    progress = [(d, t) for k, d, t in frames if k == "progress"]
    dones = [(d, t) for k, d, t in frames if k == "done"]
    if not progress:
        return fail("no progress frames — still batch-at-end?", lines)
    if not dones:
        return fail(f"no done; kinds={kinds}", lines)

    done, done_t = dones[0]
    first_p, first_t = progress[0]
    log(
        f"timing first_progress={first_t:.3f}s done={done_t:.3f}s "
        f"delta={done_t - first_t:.3f}s count={len(progress)}"
    )

    # Wall-clock proof: progress arrived strictly before done
    if not (first_t < done_t):
        return fail(
            f"progress not before done: first={first_t} done={done_t}", lines
        )
    # Prefer meaningful gap (LLM agents take seconds); allow ≥0.05s floor
    if (done_t - first_t) < 0.05:
        return fail(
            f"progress→done gap too small ({done_t - first_t:.4f}s); "
            "likely still buffered batch",
            lines,
        )

    # Kind coverage: at least phase or agent_started before completion
    pkinds = [d.get("kind") for d, _ in progress]
    log(f"progress_kinds={pkinds}")
    if not any(k in ("phase", "agent_started", "workflow_started") for k in pkinds):
        return fail(f"expected phase/agent/workflow progress, got {pkinds}", lines)

    if done.get("swarmflow") is not True:
        return fail("done.swarmflow must be true", lines)
    if done.get("progress_streaming") is not True and done.get("progress_emitted") is None:
        # progress_emitted on done is set by swarm_live
        log("warn: done missing progress_emitted (older server?)")
    emitted = done.get("progress_emitted")
    if emitted is not None and int(emitted) < 1:
        return fail(f"progress_emitted={emitted}", lines)
    if "SwarmFlow" not in (done.get("footer") or ""):
        return fail(f"bad footer {done.get('footer')!r}", lines)

    # SCHEMA events: prefer mid-stream (before done)
    events_timed = [(d, t) for k, d, t in frames if k == "event"]
    nodes = [e.get("node") for e, _ in events_timed]
    log(f"schema_nodes={nodes}")
    mid_events = [(d, t) for d, t in events_timed if t < done_t]
    mid_nodes = [d.get("node") for d, _ in mid_events]
    log(
        f"mid_stream_events={len(mid_events)} nodes={mid_nodes} "
        f"first_event_t={mid_events[0][1] if mid_events else None}"
    )
    if len(mid_events) < 2:
        return fail(
            f"need ≥2 mid-stream SCHEMA event frames before done; "
            f"got {len(mid_events)} nodes={mid_nodes} (still buffering?)",
            lines,
        )
    if "特征官" not in mid_nodes:
        return fail(f"missing mid-stream 特征官: {mid_nodes}", lines)
    if "证据官" not in mid_nodes:
        return fail(f"missing mid-stream 证据官: {mid_nodes}", lines)
    # Wall-clock: first SCHEMA event before done
    first_ev_t = mid_events[0][1]
    if not (first_ev_t < done_t):
        return fail(f"first event not before done: {first_ev_t} vs {done_t}", lines)
    log(
        f"timing first_progress={first_t:.3f}s first_event={first_ev_t:.3f}s "
        f"done={done_t:.3f}s mid_events={len(mid_events)}"
    )
    emitted_mid = done.get("mid_events_emitted")
    if emitted_mid is not None and int(emitted_mid) < 2:
        return fail(f"done.mid_events_emitted={emitted_mid}", lines)

    log(f"PASS_MARKER {PASS_MARKER}")
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {log_path}")
    return 0


if __name__ == "__main__":
    lines_capture: list[str] = []
    code = main()
    raise SystemExit(code)
