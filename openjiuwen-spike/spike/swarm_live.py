#!/usr/bin/env python3
# coding: utf-8
"""SwarmFlow actual-layer debate → SCHEMA events (转账前保镖展示轨).

Runs run_swarmflow on swarm_scripts/guard_schema_live.py, maps workers to
SCHEMA, optional local rule_gate. Sets swarmflow=True only on this path.

Streams mid-run WorkflowObserver progress (phase / agent_*) AND SCHEMA
`event` frames over SSE as each officer finishes — does NOT wait for full
run_swarmflow before first progress/event frame. done.events remains a
fallback; FE ignores终包 when mid-stream events already arrived.

NOT contest materials claim 「已接 Swarm」— Demo/materials wait for Test stamp.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Callable, Optional

from event_schema import SHANGHAI, make_event, now_iso
from llm_debate import (
    build_gated_payload,
    build_live_brief,
    build_live_dossier,
    build_ungated_payload,
    force_refuse_empty_evidence,
    risk_level_for_gate,
)

SPIKE_DIR = Path(__file__).resolve().parent
AGENT_CORE = SPIKE_DIR.parent / "agent-core"
SCRIPT = SPIKE_DIR / "swarm_scripts" / "guard_schema_live.py"

SWARM_LABEL = "SwarmFlow 现场会商"
SWARM_FOOTER = "SwarmFlow 现场会商 + 本地 rule_gate"
# Honest: engine path is real; contest materials still 禁写「已接」until Test.
SWARM_WARNING = (
    "SwarmFlow guard-schema-live 真实路径。"
    "材料/Demo 禁写比赛口径「已接 Swarm」至 Test 全口径盖章。"
)

KNOWN_EV = {"EV-LIVE-001"}
KNOWN_R = {"R-01", "R-02"}

# Observer label → SCHEMA node / phase for mid-stream event frames
_LABEL_TO_SCHEMA = {
    "特征官": ("特征官", "feature"),
    "证据官": ("证据官", "tool"),
    "风险官": ("风险官", "risk"),
    "合规官": ("合规官", "compliance"),
    "用户保护官": ("用户保护官", "protect"),
    "feature": ("特征官", "feature"),
    "evidence": ("证据官", "tool"),
    "risk": ("风险官", "risk"),
    "compliance": ("合规官", "compliance"),
    "protect": ("用户保护官", "protect"),
    # phase titles / short labels from SwarmFlow observer
    "特征": ("特征官", "feature"),
    "查证": ("证据官", "tool"),
    "风险": ("风险官", "risk"),
    "合规": ("合规官", "compliance"),
    "保护": ("用户保护官", "protect"),
}


def _try_parse_agent_payload(raw: Any) -> Optional[dict[str, Any]]:
    """Parse agent outcome / log body into {text, evidence_ids, rule_ids}.

    Accepts JSON object, JSON string, or Python-literal-ish dict from log().
    """
    if raw is None:
        return None
    if isinstance(raw, dict):
        obj = raw
    else:
        s = str(raw).strip()
        if not s:
            return None
        # Strip common log prefixes: feature=… / evidence=…
        for prefix in (
            "feature=",
            "evidence=",
            "feat=",
            "evid=",
            "risk=",
            "compliance=",
            "protect=",
            "comp=",
            "prot=",
        ):
            if s.lower().startswith(prefix):
                s = s[len(prefix) :].strip()
                break
        obj = None
        if s.startswith("{") or s.startswith("["):
            try:
                obj = json.loads(s)
            except Exception:
                try:
                    # log() may emit Python repr with single quotes
                    import ast

                    obj = ast.literal_eval(s)
                except Exception:
                    obj = None
        if obj is None:
            # Plain prose outcome — still usable as text
            return {"text": s, "evidence_ids": [], "rule_ids": []}
        if not isinstance(obj, dict):
            return {"text": str(obj), "evidence_ids": [], "rule_ids": []}
    text_v = obj.get("text")
    if text_v is None:
        # Sometimes the whole dict is nested under a key
        for k in ("feature", "evidence", "risk", "compliance", "protect", "result", "output"):
            inner = obj.get(k)
            if isinstance(inner, dict) and inner.get("text") is not None:
                obj = inner
                text_v = obj.get("text")
                break
    if text_v is None or str(text_v).strip() == "":
        return None
    return {
        "text": str(text_v),
        "evidence_ids": list(obj.get("evidence_ids") or []),
        "rule_ids": list(obj.get("rule_ids") or []),
    }


def schema_event_from_officer(
    *,
    run_id: str,
    case_id: str,
    label: str,
    payload: dict[str, Any],
    swarm_workflow: str | None = None,
) -> Optional[dict[str, Any]]:
    """Build one SCHEMA event for live officers from parsed officer payload."""
    mapped = _LABEL_TO_SCHEMA.get(str(label or "").strip())
    if not mapped:
        return None
    node, phase = mapped
    eids = _clamp_ids(payload.get("evidence_ids"), KNOWN_EV, [])
    # 特征官 / 合规官 may carry R-01/R-02; others keep empty
    if node in ("特征官", "合规官"):
        rids = _clamp_ids(payload.get("rule_ids"), KNOWN_R, [])
    else:
        rids = []
    return make_event(
        run_id=run_id,
        case_id=case_id,
        node=node,
        text=str(payload.get("text") or ""),
        evidence_ids=eids,
        rule_ids=rids,
        extra={
            "phase": phase,
            "source": "swarmflow_live_stream",
            "swarmflow_workflow": swarm_workflow or "guard-schema-live",
            "swarmflow_label": node,
            "streamed_mid_run": True,
        },
    )


def scripted_defender_event(
    *,
    run_id: str,
    case_id: str,
    swarm_workflow: str | None = None,
) -> dict[str, Any]:
    """Scripted 反方官 — same copy as post-engine build; emit mid-run after 合规官."""
    return make_event(
        run_id=run_id,
        case_id=case_id,
        node="反方官",
        text=(
            "不宜仓促定罪：现场证据仅 EV-LIVE-001（用户粘贴），"
            "需核实来源与金额意图；无把握不得定罪。"
        ),
        evidence_ids=[],
        rule_ids=[],
        extra={
            "phase": "debate",
            "source": "swarmflow_scripted",
            "swarmflow_workflow": swarm_workflow or "guard-schema-live",
            "streamed_mid_run": True,
        },
    )


# Progress kinds we forward to FE (skip noisy log unless useful).
_PROGRESS_KINDS = frozenset(
    {
        "workflow_started",
        "phase",
        "agent_started",
        "agent_activity",
        "agent_completed",
        "agent_failed",
        "workflow_completed",
        "workflow_failed",
        "workflow_paused",
        "workflow_stopped",
        "log",
    }
)


def _clamp_ids(ids, allowed: set[str], fallback: list[str] | None = None) -> list[str]:
    if not isinstance(ids, list):
        return list(fallback or [])
    out = [x for x in ids if isinstance(x, str) and x in allowed]
    if out:
        return out
    return list(fallback or [])


def _build_team_model(env: dict[str, str]):
    from openjiuwen.core.foundation.llm import ModelClientConfig, ModelRequestConfig
    from openjiuwen.harness.schema.deep_agent_spec import DeepAgentSpec, TeamModelConfig

    provider_raw = (env.get("OPENJIUWEN_LLM_PROVIDER") or "openai").strip()
    provider = "OpenAI" if provider_raw.lower() == "openai" else provider_raw
    tmc = TeamModelConfig(
        model_client_config=ModelClientConfig(
            client_id=env.get("OPENJIUWEN_LLM_CLIENT_ID") or "glm-flash",
            client_provider=provider,
            api_key=env["OPENJIUWEN_LLM_API_KEY"],
            api_base=env["OPENJIUWEN_LLM_API_BASE"],
            verify_ssl=True,
            timeout=120.0,
        ),
        model_request_config=ModelRequestConfig(
            model=env["OPENJIUWEN_LLM_MODEL"],
            temperature=0.2,
            max_tokens=500,
        ),
    )
    worker = DeepAgentSpec(
        model=tmc,
        language="cn",
        max_iterations=20,
        enable_task_planning=False,
        restrict_to_sandbox=False,
    )
    return tmc, worker


def progress_event_to_dict(
    ev: Any,
    *,
    run_id: str,
    case_id: str,
    seq: int,
) -> Optional[dict[str, Any]]:
    """Map WorkflowProgressEvent → FE progress frame. None = skip."""
    kind = getattr(ev, "kind", None) or (ev.get("kind") if isinstance(ev, dict) else None)
    if not kind or str(kind) not in _PROGRESS_KINDS:
        return None
    kind_s = str(kind)
    phase = getattr(ev, "phase", None) if not isinstance(ev, dict) else ev.get("phase")
    label = getattr(ev, "label", None) if not isinstance(ev, dict) else ev.get("label")
    message = getattr(ev, "message", None) if not isinstance(ev, dict) else ev.get("message")
    name = getattr(ev, "name", None) if not isinstance(ev, dict) else ev.get("name")
    outcome = getattr(ev, "outcome", None) if not isinstance(ev, dict) else ev.get("outcome")
    activity_type = (
        getattr(ev, "activity_type", None)
        if not isinstance(ev, dict)
        else ev.get("activity_type")
    )
    tool_name = (
        getattr(ev, "tool_name", None) if not isinstance(ev, dict) else ev.get("tool_name")
    )

    # Human-readable one-liner for timeline UI
    if kind_s == "workflow_started":
        text = f"会商开始 · {name or 'guard-schema-live'}"
    elif kind_s == "phase":
        text = f"进入阶段：{phase or '—'}"
    elif kind_s == "agent_started":
        text = f"{label or '助手'}开始发言"
    elif kind_s == "agent_activity":
        if tool_name:
            text = f"{label or '助手'} · 工具 {tool_name}"
        else:
            text = str(message or f"{label or '助手'}活动中")
    elif kind_s == "agent_completed":
        text = f"{label or '助手'}发言完毕"
    elif kind_s == "agent_failed":
        text = f"{label or '助手'}失败：{message or ''}"
    elif kind_s == "workflow_completed":
        text = "会商引擎跑完"
    elif kind_s == "workflow_failed":
        text = f"会商失败：{message or ''}"
    elif kind_s == "log":
        msg = str(message or "").strip()
        if not msg or len(msg) > 200:
            return None  # skip empty / huge logs
        text = msg
    else:
        text = str(message or kind_s)

    return {
        "kind": kind_s,
        "phase": phase,
        "label": label,
        "message": message,
        "name": name,
        "outcome_preview": (str(outcome)[:120] if outcome is not None else None),
        "activity_type": activity_type,
        "tool_name": tool_name,
        "text": text,
        "ts": now_iso(),
        "seq": seq,
        "run_id": run_id,
        "case_id": case_id,
        # Mid-run: engine is live but done.swarmflow not yet claimed
        "swarmflow": False,
        "swarmflow_running": True,
        "source": "swarmflow_observer",
    }


def build_schema_events_from_swarm(
    *,
    run_id: str,
    case_id: str,
    feature: dict,
    evidence: dict,
    swarm_meta: dict,
    inject_fab: bool = False,
    risk: dict | None = None,
    compliance: dict | None = None,
    protect: dict | None = None,
) -> list[dict]:
    """Map SwarmFlow worker JSON → SCHEMA events. No fab unless inject_fab."""
    f_text = (feature or {}).get("text") or "特征：会话风险待核，仅可引用 EV-LIVE-001。"
    e_text = (evidence or {}).get("text") or "查证：仅核对 EV-LIVE-001。"
    r_text = (risk or {}).get("text") or "风险：仅依据 EV-LIVE-001；建议先别转，待官方核实。"
    c_text = (compliance or {}).get("text") or "合规：证据不足则不得定罪；仅可引用 EV-LIVE-001 / R-01/R-02。"
    p_text = (protect or {}).get("text") or (
        "保护清单：1) 先别转；2) 打银行官方客服核实；3) 勿点陌生链接；4) 保留聊天记录。"
    )
    f_eids = _clamp_ids((feature or {}).get("evidence_ids"), KNOWN_EV, [])
    f_rids = _clamp_ids((feature or {}).get("rule_ids"), KNOWN_R, [])
    e_eids = _clamp_ids((evidence or {}).get("evidence_ids"), KNOWN_EV, [])
    risk_eids = _clamp_ids((risk or {}).get("evidence_ids"), KNOWN_EV, [])
    comp_eids = _clamp_ids((compliance or {}).get("evidence_ids"), KNOWN_EV, [])
    comp_rids = _clamp_ids((compliance or {}).get("rule_ids"), KNOWN_R, [])
    prot_eids = _clamp_ids((protect or {}).get("evidence_ids"), KNOWN_EV, [])
    wf = swarm_meta.get("workflow")

    events = [
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="特征官",
            text=str(f_text),
            evidence_ids=f_eids,
            rule_ids=f_rids,
            extra={
                "phase": "feature",
                "source": "swarmflow",
                "swarmflow_workflow": wf,
                "swarmflow_label": "特征官",
            },
        ),
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="证据官",
            text=str(e_text),
            evidence_ids=e_eids,
            rule_ids=[],
            extra={
                "phase": "tool",
                "source": "swarmflow",
                "swarmflow_workflow": wf,
                "swarmflow_label": "证据官",
            },
        ),
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="风险官",
            text=str(r_text),
            evidence_ids=risk_eids,
            rule_ids=[],
            extra={
                "phase": "risk",
                "source": "swarmflow",
                "swarmflow_workflow": wf,
                "swarmflow_label": "风险官",
            },
        ),
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="合规官",
            text=str(c_text),
            evidence_ids=comp_eids,
            rule_ids=comp_rids,
            extra={
                "phase": "compliance",
                "source": "swarmflow",
                "swarmflow_workflow": wf,
                "swarmflow_label": "合规官",
            },
        ),
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="反方官",
            text=(
                "不宜仓促定罪：现场证据仅 EV-LIVE-001（用户粘贴），"
                "需核实来源与金额意图；无把握不得定罪。"
            ),
            evidence_ids=[],
            rule_ids=[],
            extra={
                "phase": "debate",
                "source": "swarmflow_scripted",
                "swarmflow_workflow": wf,
            },
        ),
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="用户保护官",
            text=str(p_text),
            evidence_ids=prot_eids,
            rule_ids=[],
            extra={
                "phase": "protect",
                "source": "swarmflow",
                "swarmflow_workflow": wf,
                "swarmflow_label": "用户保护官",
            },
        ),
    ]
    if inject_fab:
        # Showcase dual-track only — not default actual-layer
        events.append(
            make_event(
                run_id=run_id,
                case_id=case_id,
                node="特征官",
                text="转账记录已移送，编号 EV-FAB-TRANSFER，建议定罪。",
                evidence_ids=["EV-FAB-TRANSFER"],
                rule_ids=["R-01", "R-99"],
                extra={
                    "phase": "debate",
                    "source": "deterministic_inject",
                    "swarmflow_workflow": swarm_meta.get("workflow"),
                },
            )
        )
        events.append(
            make_event(
                run_id=run_id,
                case_id=case_id,
                node="human_confirm",
                text="approved true",
                evidence_ids=["EV-FAB-TRANSFER"],
                rule_ids=[],
                extra={
                    "phase": "hitl",
                    "approved": True,
                    "source": "deterministic",
                    "swarmflow_workflow": swarm_meta.get("workflow"),
                },
            )
        )
    return events


async def run_swarmflow_live(
    env: dict[str, str],
    *,
    case_id: str,
    brief: str,
    log_sink=None,
    on_progress: Callable[[Any], None] | None = None,
) -> tuple[dict, dict]:
    """Direct run_swarmflow on guard_schema_live. Returns (result, meta).

    on_progress: optional sync callback for each WorkflowProgressEvent (same
    loop as emit — put_nowait into a queue from iter_swarm_debate).
    """
    if not SCRIPT.is_file():
        raise FileNotFoundError(
            f"missing SwarmFlow script: {SCRIPT} "
            "(Windows 包须含 spike/swarm_scripts/guard_schema_live.py)"
        )
    from openjiuwen.agent_teams.paths import configure_openjiuwen_home
    from openjiuwen.agent_teams.workflow.observer import WorkflowObserver
    from openjiuwen.agent_teams.workflow.runner import run_swarmflow

    home = SPIKE_DIR / "swarm_live_home"
    home.mkdir(parents=True, exist_ok=True)
    configure_openjiuwen_home(str(home))

    tmc, worker = _build_team_model(env)
    model = tmc.build()
    observer = WorkflowObserver(on_event=on_progress)
    session_id = f"swarm_live_{uuid.uuid4().hex[:8]}"
    team_name = "spike_swarm_live"
    run_id_sf = f"run_{uuid.uuid4().hex[:10]}"

    args_payload = json.dumps(
        {"case_id": case_id, "brief": brief},
        ensure_ascii=False,
    )

    def _log(m: str) -> None:
        if log_sink:
            log_sink(m)

    result = await run_swarmflow(
        str(SCRIPT),
        model=model,
        observer=observer,
        args=args_payload,
        team_name=team_name,
        language="cn",
        log_sink=_log,
        worker_base_spec=worker,
        session_id=session_id,
        run_id=run_id_sf,
    )

    run = observer.run
    status = getattr(run, "status", None)
    name = getattr(run, "name", None)
    st = str(status).lower() if status is not None else ""
    if "completed" not in st and name != "guard-schema-live":
        raise RuntimeError(f"swarmflow incomplete status={status} name={name}")

    if not isinstance(result, dict) or "feature" not in result:
        raise RuntimeError(f"unexpected swarm result: {result!r}")

    progress_kinds = []
    for pev in getattr(observer, "events", []) or []:
        k = getattr(pev, "kind", None)
        if k:
            progress_kinds.append(str(k))

    meta = {
        "workflow": name or "guard-schema-live",
        "session_id": session_id,
        "team_name": team_name,
        "swarm_run_id": run_id_sf,
        "status": str(status),
        "engine": "swarmflow",
        "progress_kinds": progress_kinds,
        "progress_streaming": True,
    }
    return result, meta


async def iter_swarm_debate(
    *,
    run_id: str,
    case_id: str,
    env: dict[str, str],
    context: dict[str, Any],
    gate: bool = True,
    inject_fab: bool = False,
    force_empty_evidence: bool = False,
    log_sink=None,
) -> AsyncIterator[tuple[str, Any]]:
    """Yield progress / meta / event / final.

    Progress AND SCHEMA event frames are yielded AS WorkflowObserver fires
    (queue drain), before run_swarmflow returns. Each officer's agent_completed
    outcome becomes an immediate SSE `event`. done.events remains a full
    fallback; FE ignores终包 when mid-stream events already arrived.
    """
    brief = build_live_brief(case_id, context)
    dossier = build_live_dossier(case_id, context)
    model_meta = {
        "client_id": env.get("OPENJIUWEN_LLM_CLIENT_ID"),
        "client_provider": "OpenAI",
        "api_base": env.get("OPENJIUWEN_LLM_API_BASE"),
        "model": env.get("OPENJIUWEN_LLM_MODEL"),
    }

    # Pre-run meta: swarmflow still false until engine returns
    yield (
        "meta",
        {
            "live": True,
            "gate": gate,
            "gate_verdict": None,
            "fabricate": None,
            "label": SWARM_LABEL,
            "run_id": run_id,
            "case_id": case_id,
            "model_meta": model_meta,
            "swarmflow": False,
            "swarmflow_pending": True,
            "progress_streaming": True,
            "event_streaming": True,
            "footer": SWARM_FOOTER,
            "warning": "SwarmFlow 启动中…",
        },
    )

    q: asyncio.Queue = asyncio.Queue()
    _SENTINEL = object()
    seq_holder = {"n": 0}
    # Track SCHEMA nodes already pushed mid-run (avoid duplicate post-engine)
    streamed_nodes: list[str] = []
    streamed_by_node: dict[str, dict] = {}
    mid_feature: Optional[dict] = None
    mid_evidence: Optional[dict] = None
    mid_risk: Optional[dict] = None
    mid_compliance: Optional[dict] = None
    mid_protect: Optional[dict] = None

    def _enqueue_schema(ev: dict[str, Any]) -> None:
        node = ev.get("node")
        if not isinstance(node, str) or not node:
            return
        # One mid-stream bubble per officer node (含风险/合规/保护/反方)
        if node in streamed_by_node:
            return
        streamed_by_node[node] = ev
        streamed_nodes.append(node)
        try:
            q.put_nowait(("event", ev))
        except Exception:
            pass

    def _maybe_schema_from_progress(ev: Any) -> None:
        nonlocal mid_feature, mid_evidence, mid_risk, mid_compliance, mid_protect
        kind = getattr(ev, "kind", None) or (
            ev.get("kind") if isinstance(ev, dict) else None
        )
        kind_s = str(kind or "")
        label = getattr(ev, "label", None) if not isinstance(ev, dict) else ev.get("label")
        message = (
            getattr(ev, "message", None) if not isinstance(ev, dict) else ev.get("message")
        )
        outcome = (
            getattr(ev, "outcome", None) if not isinstance(ev, dict) else ev.get("outcome")
        )

        payload = None
        use_label = label
        if kind_s == "agent_completed":
            payload = _try_parse_agent_payload(outcome)
        elif kind_s == "log":
            msg = str(message or "").strip()
            low = msg.lower()
            if low.startswith("feature=") or low.startswith("feat="):
                use_label = "特征官"
                payload = _try_parse_agent_payload(msg)
            elif low.startswith("evidence=") or low.startswith("evid="):
                use_label = "证据官"
                payload = _try_parse_agent_payload(msg)
            elif low.startswith("risk="):
                use_label = "风险官"
                payload = _try_parse_agent_payload(msg)
            elif low.startswith("compliance=") or low.startswith("comp="):
                use_label = "合规官"
                payload = _try_parse_agent_payload(msg)
            elif low.startswith("protect=") or low.startswith("prot="):
                use_label = "用户保护官"
                payload = _try_parse_agent_payload(msg)

        if payload is None or not use_label:
            return

        schema_ev = schema_event_from_officer(
            run_id=run_id,
            case_id=case_id,
            label=str(use_label),
            payload=payload,
        )
        if schema_ev is None:
            return

        node = schema_ev["node"]
        if node == "特征官":
            mid_feature = {
                "text": schema_ev["text"],
                "evidence_ids": list(schema_ev.get("evidence_ids") or []),
                "rule_ids": list(schema_ev.get("rule_ids") or []),
            }
        elif node == "证据官":
            mid_evidence = {
                "text": schema_ev["text"],
                "evidence_ids": list(schema_ev.get("evidence_ids") or []),
            }
        elif node == "风险官":
            mid_risk = {
                "text": schema_ev["text"],
                "evidence_ids": list(schema_ev.get("evidence_ids") or []),
            }
        elif node == "合规官":
            mid_compliance = {
                "text": schema_ev["text"],
                "evidence_ids": list(schema_ev.get("evidence_ids") or []),
                "rule_ids": list(schema_ev.get("rule_ids") or []),
            }
        elif node == "用户保护官":
            mid_protect = {
                "text": schema_ev["text"],
                "evidence_ids": list(schema_ev.get("evidence_ids") or []),
            }

        # Order lock: 特征→证据→风险→合规→反方→用户保护→审判
        # Inject scripted 反方 BEFORE enqueueing 用户保护 (protect was racing ahead).
        if node == "合规官":
            _enqueue_schema(schema_ev)
            if "反方官" not in streamed_by_node:
                _enqueue_schema(
                    scripted_defender_event(run_id=run_id, case_id=case_id)
                )
            return
        if node == "用户保护官":
            if "反方官" not in streamed_by_node:
                _enqueue_schema(
                    scripted_defender_event(run_id=run_id, case_id=case_id)
                )
            _enqueue_schema(schema_ev)
            return

        _enqueue_schema(schema_ev)

        # Safety net: if 合规 already streamed but 反方 missed, inject now
        if "合规官" in streamed_by_node and "反方官" not in streamed_by_node:
            _enqueue_schema(
                scripted_defender_event(run_id=run_id, case_id=case_id)
            )

    def _on_progress(ev: Any) -> None:
        seq_holder["n"] += 1
        payload = progress_event_to_dict(
            ev, run_id=run_id, case_id=case_id, seq=seq_holder["n"]
        )
        if payload is not None:
            try:
                q.put_nowait(("progress", payload))
            except Exception:
                pass
        # SCHEMA event mid-run (does not replace progress)
        try:
            _maybe_schema_from_progress(ev)
        except Exception:
            pass

    async def _engine() -> tuple[dict, dict]:
        try:
            return await run_swarmflow_live(
                env,
                case_id=case_id,
                brief=brief,
                log_sink=log_sink,
                on_progress=_on_progress,
            )
        finally:
            await q.put(_SENTINEL)

    task = asyncio.create_task(_engine())
    progress_count = 0
    first_progress_ts: Optional[str] = None
    mid_event_count = 0
    first_event_ts: Optional[str] = None

    while True:
        item = await q.get()
        if item is _SENTINEL:
            break
        kind, payload = item
        if kind == "progress":
            progress_count += 1
            if first_progress_ts is None:
                first_progress_ts = payload.get("ts")
            yield ("progress", payload)
        elif kind == "event":
            mid_event_count += 1
            if first_event_ts is None:
                first_event_ts = payload.get("ts")
            yield ("event", payload)

    # Drain any stragglers (shouldn't happen after SENTINEL)
    while not q.empty():
        item = q.get_nowait()
        if item is _SENTINEL:
            continue
        kind, payload = item
        if kind == "progress":
            progress_count += 1
            yield ("progress", payload)
        elif kind == "event":
            mid_event_count += 1
            if first_event_ts is None:
                first_event_ts = payload.get("ts")
            yield ("event", payload)

    result, swarm_meta = await task
    swarm_meta = dict(swarm_meta)
    swarm_meta["progress_emitted"] = progress_count
    swarm_meta["first_progress_ts"] = first_progress_ts
    swarm_meta["mid_events_emitted"] = mid_event_count
    swarm_meta["first_event_ts"] = first_event_ts
    swarm_meta["event_streaming"] = True

    feature = result.get("feature") or {}
    evidence = result.get("evidence") or {}
    risk = result.get("risk") or {}
    compliance = result.get("compliance") or {}
    protect = result.get("protect") or {}
    if not isinstance(feature, dict):
        feature = {"text": str(feature), "evidence_ids": [], "rule_ids": []}
    if not isinstance(evidence, dict):
        evidence = {"text": str(evidence), "evidence_ids": []}
    if not isinstance(risk, dict):
        risk = {"text": str(risk), "evidence_ids": []}
    if not isinstance(compliance, dict):
        compliance = {"text": str(compliance), "evidence_ids": [], "rule_ids": []}
    if not isinstance(protect, dict):
        protect = {"text": str(protect), "evidence_ids": []}
    # Prefer mid-run parsed payloads when engine dict is thin
    if mid_feature and not (feature.get("text") or "").strip():
        feature = mid_feature
    if mid_evidence and not (evidence.get("text") or "").strip():
        evidence = mid_evidence
    if mid_risk and not (risk.get("text") or "").strip():
        risk = mid_risk
    if mid_compliance and not (compliance.get("text") or "").strip():
        compliance = mid_compliance
    if mid_protect and not (protect.get("text") or "").strip():
        protect = mid_protect

    yield (
        "meta",
        {
            "live": True,
            "gate": gate,
            "gate_verdict": None,
            "fabricate": None,
            "label": SWARM_LABEL,
            "run_id": run_id,
            "case_id": case_id,
            "model_meta": model_meta,
            "swarmflow": True,
            "swarmflow_meta": swarm_meta,
            "progress_streaming": True,
            "event_streaming": True,
            "progress_emitted": progress_count,
            "mid_events_emitted": mid_event_count,
            "first_event_ts": first_event_ts,
            "footer": SWARM_FOOTER,
            "warning": SWARM_WARNING,
        },
    )

    events = build_schema_events_from_swarm(
        run_id=run_id,
        case_id=case_id,
        feature=feature,
        evidence=evidence,
        swarm_meta=swarm_meta,
        inject_fab=inject_fab,
        risk=risk,
        compliance=compliance,
        protect=protect,
    )
    _MERGE_NODES = (
        "特征官",
        "证据官",
        "风险官",
        "合规官",
        "反方官",
        "用户保护官",
    )
    # Prefer mid-stream text/ts for officers already pushed (stable bubble identity)
    merged: list[dict] = []
    for ev in events:
        node = ev.get("node")
        prior = streamed_by_node.get(node) if isinstance(node, str) else None
        if prior is not None and node in _MERGE_NODES:
            # Keep mid-run ts/text; refresh ids from final build if richer
            keep = dict(prior)
            if ev.get("evidence_ids") and not keep.get("evidence_ids"):
                keep["evidence_ids"] = list(ev.get("evidence_ids") or [])
            if ev.get("rule_ids") and not keep.get("rule_ids"):
                keep["rule_ids"] = list(ev.get("rule_ids") or [])
            merged.append(keep)
        else:
            merged.append(ev)
            # Post-engine fallback: emit only nodes not already streamed mid-run
            if isinstance(node, str) and node not in streamed_by_node:
                yield ("event", ev)
                streamed_by_node[node] = ev
    events = merged

    # Smoke / gold-path hook: strip all evidence_ids before gate (禁空跑定罪)
    if force_empty_evidence:
        stripped: list[dict] = []
        for ev in events:
            e2 = dict(ev)
            e2["evidence_ids"] = []
            stripped.append(e2)
        events = stripped

    if gate:
        final = build_gated_payload(
            run_id=run_id,
            case_id=case_id,
            ungated_events=events,
            live=True,
            dossier=dossier,
        )
        # Ensure empty-evidence refuse even if gate path missed
        final = force_refuse_empty_evidence(
            run_id=final.get("run_id") or run_id,
            case_id=case_id,
            final=final,
            ungated_events=events,
            live=True,
        )
        for ev in final.get("events") or []:
            if ev.get("node") == "审判官":
                yield ("event", ev)
    else:
        final = build_ungated_payload(
            run_id=run_id,
            case_id=case_id,
            events=events,
            meta=model_meta,
            live=True,
        )

    final = dict(final)
    final["swarmflow"] = True
    final["swarmflow_meta"] = swarm_meta
    final["label"] = SWARM_LABEL
    final["footer"] = SWARM_FOOTER
    final["warning"] = SWARM_WARNING
    final["mode"] = "swarmflow_live_gated" if gate else "swarmflow_live_ungated"
    final["live"] = True
    final["fabricate"] = None
    final["progress_streaming"] = True
    final["event_streaming"] = True
    final["progress_emitted"] = progress_count
    final["mid_events_emitted"] = mid_event_count
    final["first_progress_ts"] = first_progress_ts
    final["first_event_ts"] = first_event_ts
    if "risk_level" not in final or not final.get("risk_level"):
        final["risk_level"] = risk_level_for_gate(final.get("gate_verdict"))
    yield ("final", final)
