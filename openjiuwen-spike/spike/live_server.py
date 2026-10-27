#!/usr/bin/env python3
# coding: utf-8
"""Thin live GLM debate HTTP API for openJiuwen Demo (127.0.0.1 only).

POST /v1/debate/live
  Demo/compat body: {"gate": true|false, "case_id"?: "..."}  (no transcript)
  Actual-layer body (frozen v1) + optional "engine": "teamruntime"|"swarm"
  Dual-read: chat_transcript → transcript (short transition).
  → SSE: schema, meta, event*, done|error
  Default engine=teamruntime → swarmflow:false

POST /v1/swarm/debate
  Same frozen v1 body (transcript required). Real SwarmFlow guard-schema-live.
  → SSE same SCHEMA; meta/done swarmflow:true ONLY after real run_swarmflow.
  Footer: 「SwarmFlow 现场会商 + 本地 rule_gate」.
  Materials still 禁写比赛口径「已接 Swarm」until Test stamp.
  Test-only S6: body/query force_swarm_fail=true OR env SPIKE_FORCE_SWARM_FAIL=1
  → SSE error code=swarm_debate_failed, downgrade=teamruntime (FE → /v1/debate/live).

GET  /health
GET  /v1/showcase
GET  /v1/settings/model   → {configured, base_url, model, key_set} (no plaintext key)
PUT  /v1/settings/model   → {api_key?, base_url?, model?} writes model.env (600) + hot reload
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from aiohttp import web

SPIKE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SPIKE_DIR))

from ports_env import cors_origin, demo_origin, live_bind_url, live_host, live_port  # noqa: E402
from event_schema import SHANGHAI, now_iso  # noqa: E402
from llm_debate import (  # noqa: E402
    LIVE_LABEL,
    build_gated_payload,
    build_live_brief,
    build_live_dossier,
    build_ungated_payload,
    iter_llm_debate,
    load_model_env,
    model_settings_public,
    redact,
    risk_level_for_gate,
    write_model_env,
    _bootstrap_openjiuwen,
)
from swarm_live import (  # noqa: E402
    SWARM_FOOTER,
    SWARM_LABEL,
    SWARM_WARNING,
    iter_swarm_debate,
)

HOST = live_host()
PORT = live_port()
DEMO_ORIGIN = demo_origin()
CORS_ORIGIN = cors_origin()
LIVE_BIND = live_bind_url()

TRANSCRIPT_MIN = 20
TRANSCRIPT_MAX = 8000
URGENCY_OK = frozenset({"low", "mid", "high"})

_bootstrapped = False
_run_lock = asyncio.Lock()
_secrets: list[str] = []


def _cors_headers() -> dict[str, str]:
    return {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
        "Access-Control-Max-Age": "600",
    }


def _sse_pack(event: str, data: Any) -> bytes:
    body = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {body}\n\n".encode("utf-8")


def _footer_warning(gate: bool) -> str:
    if gate:
        return f"{LIVE_LABEL} + 本地 rule_gate。NOT SwarmFlow。"
    return f"{LIVE_LABEL}（ungated）。NOT SwarmFlow。"


def parse_live_request(body: dict, query_gate: Optional[str]) -> dict[str, Any]:
    """Parse Demo-compat or actual-layer frozen body.

    Returns dict with keys:
      gate, case_id, layer, transcript|None, amount, payee, urgency,
      suspect_links, user_note, actual_layer(bool), truncated(bool),
      error|None
    """
    if not isinstance(body, dict):
        body = {}

    # dual-read chat_transcript → transcript
    raw_tr = body.get("transcript")
    if raw_tr is None and body.get("chat_transcript") is not None:
        raw_tr = body.get("chat_transcript")
    transcript: Optional[str] = None
    truncated = False
    if raw_tr is not None:
        transcript = str(raw_tr).strip()
        if len(transcript) > TRANSCRIPT_MAX:
            transcript = transcript[:TRANSCRIPT_MAX]
            truncated = True

    layer_raw = body.get("layer")
    if layer_raw is None:
        # missing layer: treat as live when transcript present; else Demo path
        layer = "live" if transcript else "demo"
    else:
        layer = str(layer_raw).strip() or "live"

    actual_layer = bool(transcript)  # transcript path = actual layer

    gate = bool(body.get("gate", True))
    if query_gate is not None:
        gate = query_gate.strip().lower() in ("1", "true", "yes", "on")

    if actual_layer:
        case_id = str(body.get("case_id") or "").strip() or f"LIVE-{uuid.uuid4().hex[:8]}"
    else:
        case_id = str(body.get("case_id") or "CASE-SPIKE-FAB-001")

    urgency = str(body.get("urgency") or "mid").strip().lower()
    if urgency not in URGENCY_OK:
        urgency = "mid"

    amount = body.get("amount", None)
    if amount is not None and amount != "":
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return {
                "error": {
                    "message": "金额格式不对",
                    "code": "bad_amount",
                }
            }
        if amount < 0:
            return {
                "error": {
                    "message": "金额格式不对",
                    "code": "bad_amount",
                }
            }
    else:
        amount = None

    payee = body.get("payee", None)
    if payee is not None:
        payee = str(payee).strip()[:80] or None

    links = body.get("suspect_links") or []
    if not isinstance(links, list):
        links = []
    suspect_links = [str(u).strip() for u in links if str(u).strip()][:10]

    user_note = body.get("user_note", None)
    if user_note is not None:
        user_note = str(user_note).strip()[:200] or None

    err = None
    if actual_layer and transcript is not None and len(transcript) < TRANSCRIPT_MIN:
        err = {
            "message": "再多贴几句聊天，不然没法审",
            "code": "transcript_too_short",
            "min": TRANSCRIPT_MIN,
            "got": len(transcript),
        }

    return {
        "gate": gate,
        "case_id": case_id,
        "layer": layer,
        "transcript": transcript,
        "amount": amount,
        "payee": payee,
        "urgency": urgency,
        "suspect_links": suspect_links,
        "user_note": user_note,
        "actual_layer": actual_layer,
        "truncated": truncated,
        "error": err,
    }


async def handle_options(request: web.Request) -> web.Response:
    return web.Response(status=204, headers=_cors_headers())



def _merge_request_llm(body: dict, env: dict[str, str]) -> dict[str, str]:
    """Optional body.llm override for a single debate (never logged)."""
    llm = body.get("llm") if isinstance(body, dict) else None
    if not isinstance(llm, dict):
        return env
    out = dict(env)
    key = llm.get("api_key")
    if key is not None and str(key).strip():
        out["OPENJIUWEN_LLM_API_KEY"] = str(key).strip()
    base = llm.get("api_base") or llm.get("base_url")
    if base is not None and str(base).strip():
        out["OPENJIUWEN_LLM_API_BASE"] = str(base).strip().rstrip("/")
    model = llm.get("model")
    if model is not None and str(model).strip():
        out["OPENJIUWEN_LLM_MODEL"] = str(model).strip()
    return out


async def handle_settings_get(request: web.Request) -> web.Response:
    """GET /v1/settings/model — public view, no plaintext key."""
    payload = model_settings_public()
    payload["ts"] = now_iso()
    return web.json_response(payload, headers=_cors_headers())


async def handle_settings_put(request: web.Request) -> web.Response:
    """PUT /v1/settings/model — write spike/model.env (600) + in-process hot reload.

    Body: {api_key?, base_url?|api_base?, model?, provider?, client_id?}
    Empty api_key clears key → configured=false. Key never echoed, never logged.
    """
    try:
        body = await request.json() if request.can_read_body else {}
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}

    api_key = body.get("api_key", None)
    base = body.get("base_url", None)
    if base is None:
        base = body.get("api_base", None)
    model = body.get("model", None)
    provider = body.get("provider", None)
    client_id = body.get("client_id", None)

    # Validate base_url if provided
    if base is not None:
        b = str(base).strip()
        if b and not (b.startswith("http://") or b.startswith("https://")):
            return web.json_response(
                {"ok": False, "message": "base_url 要以 http:// 或 https:// 开头", "code": "bad_base_url"},
                status=400,
                headers=_cors_headers(),
            )

    kwargs = {}
    if api_key is not None:
        kwargs["api_key"] = api_key
    if base is not None:
        kwargs["base_url"] = base
    if model is not None:
        kwargs["model"] = model
    if provider is not None:
        kwargs["provider"] = provider
    if client_id is not None:
        kwargs["client_id"] = client_id

    if not kwargs:
        return web.json_response(
            {"ok": False, "message": "body 需含 api_key / base_url / model 至少一项", "code": "empty_body"},
            status=400,
            headers=_cors_headers(),
        )

    public = write_model_env(**kwargs)
    # Refresh process secrets list used by redact (no print)
    global _secrets
    from llm_debate import parse_model_env_file

    env_now = parse_model_env_file()
    _secrets = [env_now.get("OPENJIUWEN_LLM_API_KEY", "")]
    return web.json_response(
        {"ok": True, "hot_reload": True, "settings": public, "ts": now_iso()},
        headers=_cors_headers(),
    )


async def handle_showcase(request: web.Request) -> web.Response:
    """Thin Demo entry pointer. Defaults: replay 5174 / live 5180. Not Swarm attribution."""
    payload = {
        "url": f"{DEMO_ORIGIN}/",
        "modes": ["replay", "live"],
        "live_base": LIVE_BIND,
        "swarmflow": False,
        "swarm_path": "/v1/swarm/debate",
        "note": "replay=对照回放；live=TeamRuntime SSE；swarm_path=SwarmFlow 展示轨。材料勿写已接 Swarm。",
        "ts": now_iso(),
    }
    return web.json_response(payload, headers=_cors_headers())


async def handle_health(request: web.Request) -> web.Response:
    payload = {
        "ok": True,
        "service": "openjiuwen-live-debate",
        "label": LIVE_LABEL,
        "live": True,
        "fabricate": None,
        # Default TeamRuntime path is NOT SwarmFlow; swarm endpoint is separate.
        "swarmflow": False,
        "swarm_path": "/v1/swarm/debate",
        "engines": ["teamruntime", "swarmflow"],
        "bind": f"{HOST}:{PORT}",
        "ts": now_iso(),
        "footer": f"{LIVE_LABEL} + 本地 rule_gate",
        "settings_path": "/v1/settings/model",
        "note": "swarm_path=真实 SwarmFlow；settings_path=全局 API 齿轮；材料可写已接 Swarm（S1–S10 PASS）",
    }
    return web.json_response(payload, headers=_cors_headers())


async def _sse_response() -> web.StreamResponse:
    return web.StreamResponse(
        status=200,
        reason="OK",
        headers={
            **_cors_headers(),
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def handle_swarm_debate(
    request: web.Request, body: Optional[dict] = None
) -> web.StreamResponse:
    """Actual-layer SwarmFlow path. transcript required. swarmflow:true after real run."""
    global _bootstrapped, _secrets

    if body is None:
        try:
            body = await request.json() if request.can_read_body else {}
        except Exception:
            body = {}
    if not isinstance(body, dict):
        body = {}

    # Force actual-layer parse: require transcript semantics
    if body.get("transcript") is None and body.get("chat_transcript") is None:
        # still parse so we can emit structured error via SSE
        body = {**body, "transcript": body.get("transcript", "")}

    parsed = parse_live_request(body, request.rel_url.query.get("gate"))
    inject_fab = bool(body.get("inject_fab", False))
    if request.rel_url.query.get("inject_fab", "").lower() in ("1", "true", "yes"):
        inject_fab = True
    force_empty_evidence = bool(body.get("force_empty_evidence", False))
    if request.rel_url.query.get("force_empty_evidence", "").lower() in (
        "1",
        "true",
        "yes",
    ):
        force_empty_evidence = True
    # S6 test-only: force SSE error code=swarm_debate_failed (FE downgrade path).
    # Body/query force_swarm_fail OR env SPIKE_FORCE_SWARM_FAIL. Normal path untouched.
    force_swarm_fail = bool(body.get("force_swarm_fail", False))
    if request.rel_url.query.get("force_swarm_fail", "").lower() in (
        "1",
        "true",
        "yes",
    ):
        force_swarm_fail = True
    if os.environ.get("SPIKE_FORCE_SWARM_FAIL", "").strip().lower() in (
        "1",
        "true",
        "yes",
    ):
        force_swarm_fail = True

    resp = await _sse_response()
    await resp.prepare(request)

    async def send(ev: str, data: Any) -> None:
        await resp.write(_sse_pack(ev, data))
        # Push mid-run progress immediately (avoid TCP / proxy buffering)
        try:
            await resp.drain()
        except Exception:
            pass

    schema = {
        "nodes": [
            "特征官",
            "证据官",
            "风险官",
            "合规官",
            "反方官",
            "用户保护官",
            "审判官",
            "human_confirm",
        ],
        "fields": [
            "run_id",
            "case_id",
            "ts",
            "node",
            "text",
            "evidence_ids",
            "rule_ids",
            "verdict",
            "refuse_reason",
        ],
        "label": SWARM_LABEL,
        "live": True,
        "fabricate": None,
        "swarmflow": False,  # flips true in meta after engine
        "engine": "swarmflow",
        "footer": SWARM_FOOTER,
    }
    await send("schema", schema)

    # Swarm path always requires transcript (no Demo FAB shortcut)
    tr = parsed.get("transcript")
    if not tr or (isinstance(tr, str) and len(tr.strip()) < TRANSCRIPT_MIN):
        err = parsed.get("error") or {
            "message": "再多贴几句聊天，不然没法审",
            "code": "transcript_too_short",
            "min": TRANSCRIPT_MIN,
            "got": len(tr.strip()) if isinstance(tr, str) else 0,
        }
        await send("error", err)
        await resp.write_eof()
        return resp
    if parsed.get("error"):
        await send("error", parsed["error"])
        await resp.write_eof()
        return resp

    gate = parsed["gate"]
    case_id = parsed["case_id"]

    if force_swarm_fail:
        await send(
            "error",
            {
                "message": (
                    "injected swarm_debate_failed "
                    "(test-only force_swarm_fail / SPIKE_FORCE_SWARM_FAIL)"
                ),
                "code": "swarm_debate_failed",
                "swarmflow": False,
                "downgrade": "teamruntime",
                "hint": "可回退 POST /v1/debate/live（engine 默认 teamruntime）",
                "injected": True,
            },
        )
        await resp.write_eof()
        return resp

    if _run_lock.locked():
        await send(
            "error",
            {"message": "busy: another live debate is running", "code": "busy"},
        )
        await resp.write_eof()
        return resp

    async with _run_lock:
        try:
            env = load_model_env()
            env = _merge_request_llm(body, env)
            _secrets = [env.get("OPENJIUWEN_LLM_API_KEY", "")]
            if not _bootstrapped:
                _bootstrap_openjiuwen()
                _bootstrapped = True

            run_id = "run-swarm-live-" + datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
            live_ctx = {
                "transcript": parsed["transcript"],
                "amount": parsed["amount"],
                "payee": parsed["payee"],
                "urgency": parsed["urgency"],
                "suspect_links": parsed["suspect_links"],
                "user_note": parsed["user_note"],
            }

            async for kind, payload in iter_swarm_debate(
                run_id=run_id,
                case_id=case_id,
                env=env,
                context=live_ctx,
                gate=gate,
                inject_fab=inject_fab,
                force_empty_evidence=force_empty_evidence,
            ):
                if kind == "progress":
                    # Mid-run Swarm observer → SSE as they fire (not batch-at-end)
                    await send("progress", payload)
                elif kind == "meta":
                    await send("meta", payload)
                elif kind == "event":
                    await send("event", payload)
                elif kind == "final":
                    warning = payload.get("warning") or SWARM_WARNING
                    if "已接 Swarm" in warning and "禁写" not in warning:
                        warning = SWARM_WARNING
                    await send(
                        "done",
                        {
                            "live": True,
                            "gate": gate,
                            "gate_verdict": payload.get("gate_verdict"),
                            "risk_level": payload.get("risk_level")
                            or risk_level_for_gate(payload.get("gate_verdict")),
                            "fabricate": None,
                            "label": SWARM_LABEL,
                            "run_id": payload.get("run_id"),
                            "case_id": case_id,
                            "refuse_reason": payload.get("refuse_reason"),
                            "fabricated_evidence": payload.get("fabricated_evidence"),
                            "fabricated_rules": payload.get("fabricated_rules"),
                            "empty_evidence_refuse": payload.get("empty_evidence_refuse"),
                            "events": payload.get("events"),
                            "warning": warning,
                            "footer": SWARM_FOOTER,
                            "swarmflow": True,
                            "swarmflow_meta": payload.get("swarmflow_meta"),
                            "layer": "live",
                            "actual_layer": True,
                            "engine": "swarmflow",
                            "mode": payload.get("mode"),
                            "progress_streaming": True,
                            "event_streaming": True,
                            "progress_emitted": payload.get("progress_emitted"),
                            "mid_events_emitted": payload.get("mid_events_emitted"),
                            "first_progress_ts": payload.get("first_progress_ts"),
                            "first_event_ts": payload.get("first_event_ts"),
                        },
                    )
        except Exception as e:
            msg = redact(f"{type(e).__name__}: {e}", _secrets)
            await send(
                "error",
                {
                    "message": msg,
                    "code": "swarm_debate_failed",
                    "swarmflow": False,
                    "downgrade": "teamruntime",
                    "hint": "可回退 POST /v1/debate/live（engine 默认 teamruntime）",
                },
            )

    await resp.write_eof()
    return resp


async def handle_debate_live(request: web.Request) -> web.StreamResponse:
    global _bootstrapped, _secrets

    try:
        body = await request.json() if request.can_read_body else {}
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}

    # Optional: engine=swarm on same URL → SwarmFlow path (transcript required)
    engine = str(body.get("engine") or "teamruntime").strip().lower()
    if engine in ("swarm", "swarmflow"):
        return await handle_swarm_debate(request, body=body)

    parsed = parse_live_request(body, request.rel_url.query.get("gate"))

    resp = await _sse_response()
    await resp.prepare(request)

    async def send(ev: str, data: Any) -> None:
        await resp.write(_sse_pack(ev, data))

    schema = {
        "nodes": [
            "特征官",
            "证据官",
            "风险官",
            "合规官",
            "反方官",
            "用户保护官",
            "审判官",
            "human_confirm",
        ],
        "fields": [
            "run_id",
            "case_id",
            "ts",
            "node",
            "text",
            "evidence_ids",
            "rule_ids",
            "verdict",
            "refuse_reason",
        ],
        "label": LIVE_LABEL,
        "live": True,
        "fabricate": None,
        "swarmflow": False,
        "footer": f"{LIVE_LABEL} + 本地 rule_gate",
    }
    await send("schema", schema)

    if parsed.get("error"):
        await send("error", parsed["error"])
        await resp.write_eof()
        return resp

    gate = parsed["gate"]
    case_id = parsed["case_id"]
    actual_layer = parsed["actual_layer"]

    if _run_lock.locked():
        await send(
            "error",
            {"message": "busy: another live debate is running", "code": "busy"},
        )
        await resp.write_eof()
        return resp

    async with _run_lock:
        try:
            env = load_model_env()
            env = _merge_request_llm(body, env)
            _secrets = [env.get("OPENJIUWEN_LLM_API_KEY", "")]
            if not _bootstrapped:
                _bootstrap_openjiuwen()
                _bootstrapped = True

            run_id = "run-live-" + datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
            model_meta: dict = {}
            events: list[dict] = []

            live_ctx = None
            live_dossier = None
            brief = None
            known_ev = None
            skip_fabricate = False
            if actual_layer:
                live_ctx = {
                    "transcript": parsed["transcript"],
                    "amount": parsed["amount"],
                    "payee": parsed["payee"],
                    "urgency": parsed["urgency"],
                    "suspect_links": parsed["suspect_links"],
                    "user_note": parsed["user_note"],
                }
                live_dossier = build_live_dossier(case_id, live_ctx)
                brief = build_live_brief(case_id, live_ctx)
                known_ev = ["EV-LIVE-001"]
                skip_fabricate = True  # actual layer: no Demo fab inject

            await send(
                "meta",
                {
                    "live": True,
                    "gate": gate,
                    "gate_verdict": None,
                    "fabricate": None,
                    "label": LIVE_LABEL,
                    "run_id": run_id,
                    "case_id": case_id,
                    "layer": "live" if actual_layer else parsed["layer"],
                    "actual_layer": actual_layer,
                    "truncated": parsed["truncated"],
                    "swarmflow": False,
                    "warning": _footer_warning(gate),
                    "footer": f"{LIVE_LABEL} + 本地 rule_gate",
                },
            )

            async for kind, payload in iter_llm_debate(
                run_id=run_id,
                case_id=case_id,
                env=env,
                live_mode=True,
                context=live_ctx,
                skip_fabricate=skip_fabricate,
                brief=brief,
                known_ev=known_ev,
            ):
                if kind == "meta":
                    model_meta = payload
                    await send(
                        "meta",
                        {
                            "live": True,
                            "gate": gate,
                            "gate_verdict": None,
                            "fabricate": None,
                            "label": LIVE_LABEL,
                            "run_id": run_id,
                            "case_id": case_id,
                            "model_meta": model_meta,  # no api_key
                            "swarmflow": False,
                            "footer": f"{LIVE_LABEL} + 本地 rule_gate",
                        },
                    )
                elif kind == "event":
                    events.append(payload)
                    await send("event", payload)

            if gate:
                final = build_gated_payload(
                    run_id=run_id,
                    case_id=case_id,
                    ungated_events=events,
                    live=True,
                    dossier=live_dossier,
                )
                for ev in final["events"]:
                    if ev.get("node") == "审判官":
                        await send("event", ev)
            else:
                final = build_ungated_payload(
                    run_id=run_id,
                    case_id=case_id,
                    events=events,
                    meta=model_meta,
                    live=True,
                )

            # belt: never claim Swarm in done
            warning = final.get("warning") or _footer_warning(gate)
            if "已接 Swarm" in warning:
                warning = _footer_warning(gate)

            await send(
                "done",
                {
                    "live": True,
                    "gate": gate,
                    "gate_verdict": final.get("gate_verdict"),
                    "risk_level": final.get("risk_level")
                    or risk_level_for_gate(final.get("gate_verdict")),
                    "fabricate": None,
                    "label": LIVE_LABEL,
                    "run_id": final.get("run_id"),
                    "case_id": case_id,
                    "refuse_reason": final.get("refuse_reason"),
                    "fabricated_evidence": final.get("fabricated_evidence"),
                    "fabricated_rules": final.get("fabricated_rules"),
                    "empty_evidence_refuse": final.get("empty_evidence_refuse"),
                    "events": final.get("events"),
                    "warning": warning,
                    "footer": f"{LIVE_LABEL} + 本地 rule_gate",
                    "swarmflow": False,
                    "layer": "live" if actual_layer else parsed["layer"],
                    "actual_layer": actual_layer,
                },
            )
        except Exception as e:
            msg = redact(f"{type(e).__name__}: {e}", _secrets)
            await send("error", {"message": msg, "code": "debate_failed"})

    await resp.write_eof()
    return resp


def main() -> None:
    if HOST not in ("127.0.0.1", "localhost", "::1"):
        raise SystemExit(f"refusing non-local bind: {HOST}")
    app = web.Application()
    app.router.add_route("OPTIONS", "/health", handle_options)
    app.router.add_route("OPTIONS", "/v1/debate/live", handle_options)
    app.router.add_route("OPTIONS", "/v1/swarm/debate", handle_options)
    app.router.add_route("OPTIONS", "/v1/showcase", handle_options)
    app.router.add_route("OPTIONS", "/v1/settings/model", handle_options)
    app.router.add_get("/v1/showcase", handle_showcase)
    app.router.add_get("/health", handle_health)
    app.router.add_get("/v1/settings/model", handle_settings_get)
    app.router.add_put("/v1/settings/model", handle_settings_put)
    app.router.add_post("/v1/debate/live", handle_debate_live)
    app.router.add_get("/v1/debate/live", handle_debate_live)  # ?gate=true
    app.router.add_post("/v1/swarm/debate", handle_swarm_debate)
    print(
        f"live debate API on http://{HOST}:{PORT}  "
        f"CORS={CORS_ORIGIN}  label={LIVE_LABEL}  "
        f"swarm_path=/v1/swarm/debate",
        flush=True,
    )
    web.run_app(app, host=HOST, port=PORT, print=None)


if __name__ == "__main__":
    main()
