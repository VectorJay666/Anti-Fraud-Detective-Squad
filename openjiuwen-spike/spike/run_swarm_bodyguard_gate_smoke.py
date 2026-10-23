#!/usr/bin/env python3
# coding: utf-8
"""SwarmFlow → SCHEMA (CASE-SPIKE-FAB-001) → rule_gate dual track.

One SwarmFlow direct run (guard_schema_mini), then:
  gate:false → ungated events (human_confirm approved; no 审判官 refuse)
  gate:true  → rule_gate refuse on EV-FAB-TRANSFER / R-99

Never prints API keys. Does NOT claim Demo 「已接 Swarm」.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

SPIKE_DIR = Path(__file__).resolve().parent
AGENT_CORE = SPIKE_DIR.parent / "agent-core"
SCRIPT = SPIKE_DIR / "swarm_scripts" / "guard_schema_mini.py"
DOSSIER = SPIKE_DIR / "case" / "dossier.json"
RULES = SPIKE_DIR / "rules" / "base.json"
SHANGHAI = ZoneInfo("Asia/Shanghai")
CASE_ID = "CASE-SPIKE-FAB-001"


def _ts() -> str:
    return datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")


def _redact(text: str, secrets: list[str]) -> str:
    out = text
    for s in secrets:
        if s and len(s) >= 8:
            out = out.replace(s, "<REDACTED_API_KEY>")
    return out


def _bootstrap() -> None:
    if str(AGENT_CORE) not in sys.path:
        sys.path.insert(0, str(AGENT_CORE))
    if str(SPIKE_DIR) not in sys.path:
        sys.path.insert(0, str(SPIKE_DIR))
    from openjiuwen.core.common.logging.log_config import configure_log
    from openjiuwen.core.common.logging.manager import LogManager

    configure_log(str(SPIKE_DIR / "log_config_p2p.yaml"))
    LogManager.initialize()


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


def _clamp_ids(ids, allowed: set[str], fallback: list[str]) -> list[str]:
    if not isinstance(ids, list):
        return list(fallback)
    out = [x for x in ids if isinstance(x, str) and x in allowed]
    return out or list(fallback)


def _build_schema_events(
    *,
    run_id: str,
    case_id: str,
    feature: dict,
    evidence: dict,
    swarm_meta: dict,
) -> list[dict]:
    from event_schema import make_event

    known_ev = {"EV-001", "EV-002"}
    known_r = {"R-01", "R-02"}
    f_text = (feature or {}).get("text") or "特征：冒充客服催转，引用 EV-001、EV-002。"
    e_text = (evidence or {}).get("text") or "查证：EV-001、EV-002 在案卷中。"
    f_eids = _clamp_ids((feature or {}).get("evidence_ids"), known_ev, ["EV-001", "EV-002"])
    f_rids = _clamp_ids((feature or {}).get("rule_ids"), known_r, ["R-01"])
    e_eids = _clamp_ids((evidence or {}).get("evidence_ids"), known_ev, ["EV-001", "EV-002"])

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
                "swarmflow_workflow": swarm_meta.get("workflow"),
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
                "swarmflow_workflow": swarm_meta.get("workflow"),
                "swarmflow_label": "证据官",
            },
        ),
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="反方官",
            text=(
                "不宜仓促定罪：用户尚未转账，EV-001/EV-002 仅为话术记录，"
                "需核实来源；案卷无转账记录。"
            ),
            evidence_ids=[],
            rule_ids=[],
            extra={
                "phase": "debate",
                "source": "swarmflow_scripted",
                "swarmflow_workflow": swarm_meta.get("workflow"),
            },
        ),
        # Deterministic fabricate — gate demo must not depend on model hallucination
        make_event(
            run_id=run_id,
            case_id=case_id,
            node="特征官",
            text="转账记录已移送，编号 EV-FAB-TRANSFER，建议定罪。",
            evidence_ids=["EV-FAB-TRANSFER"],
            rule_ids=["R-01", "R-99"],
            extra={
                "phase": "debate",
                "hallucination": True,
                "intent": "convict",
                "source": "deterministic_inject",
                "swarmflow_workflow": swarm_meta.get("workflow"),
            },
        ),
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
        ),
    ]
    return events


async def _run_swarm(env: dict[str, str]) -> tuple[dict, dict]:
    from openjiuwen.agent_teams.paths import configure_openjiuwen_home
    from openjiuwen.agent_teams.workflow.observer import WorkflowObserver
    from openjiuwen.agent_teams.workflow.runner import run_swarmflow

    home = SPIKE_DIR / "swarm_bodyguard_home"
    home.mkdir(parents=True, exist_ok=True)
    configure_openjiuwen_home(str(home))

    tmc, worker = _build_team_model(env)
    model = tmc.build()
    observer = WorkflowObserver()
    session_id = f"bodyguard_{uuid.uuid4().hex[:8]}"
    team_name = "spike_swarm_bodyguard"
    run_id_sf = f"run_{uuid.uuid4().hex[:10]}"

    print(f"swarm team={team_name} session={session_id} script={SCRIPT.name}")
    print(
        f"model={env.get('OPENJIUWEN_LLM_MODEL')} "
        f"base={env.get('OPENJIUWEN_LLM_API_BASE')} api_key=<redacted>"
    )

    result = await run_swarmflow(
        str(SCRIPT),
        model=model,
        observer=observer,
        args=CASE_ID,
        team_name=team_name,
        language="cn",
        log_sink=lambda m: print(f"[swarmflow/log] {m}"),
        worker_base_spec=worker,
        session_id=session_id,
        run_id=run_id_sf,
    )

    run = observer.run
    status = getattr(run, "status", None)
    name = getattr(run, "name", None)
    print(f"swarm status={status} name={name} result_type={type(result).__name__}")
    if status != "completed" and name != "guard-schema-mini":
        # status may be enum
        st = str(status)
        if "completed" not in st.lower() and name != "guard-schema-mini":
            raise RuntimeError(f"swarmflow incomplete status={status} name={name}")

    if not isinstance(result, dict) or "feature" not in result:
        raise RuntimeError(f"unexpected swarm result: {result!r}")

    meta = {
        "workflow": name or "guard-schema-mini",
        "session_id": session_id,
        "team_name": team_name,
        "swarm_run_id": run_id_sf,
        "status": str(status),
    }
    return result, meta


def _write_ungated(events: list[dict], meta: dict, model_meta: dict, path: Path) -> dict:
    payload = {
        "run_id": events[0]["run_id"],
        "case_id": CASE_ID,
        "generated_at": datetime.now(SHANGHAI).isoformat(timespec="seconds"),
        "gate_verdict": None,
        "mode": "swarmflow_bodyguard_ungated",
        "swarmflow": True,
        "swarmflow_meta": meta,
        "model_meta": model_meta,
        "warning": (
            "SwarmFlow guard-schema-mini workers + deterministic EV-FAB inject；"
            "ungated（无 rule_gate）。材料勿写「已接 Swarm 保镖 Demo」。"
        ),
        "events": events,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def _apply_gate(ungated_events: list[dict], out_path: Path) -> dict:
    from event_schema import make_event
    from rule_gate import load_json, stamp_verdict

    dossier = load_json(DOSSIER)
    rules = load_json(RULES)
    gate_run_id = "run-swarm-gate-" + _ts()
    result = stamp_verdict(
        run_id=gate_run_id,
        case_id=CASE_ID,
        dossier=dossier,
        rules=rules,
        utterances=ungated_events,
        proposed_verdict="convict",
    )
    out_events: list[dict] = []
    for u in ungated_events:
        role = u.get("node") or "特征官"
        if role == "human_confirm" and u.get("approved") is True:
            continue
        out_events.append(
            make_event(
                run_id=gate_run_id,
                case_id=CASE_ID,
                node=role,
                text=u.get("text") or "",
                evidence_ids=u.get("evidence_ids"),
                rule_ids=u.get("rule_ids"),
                extra={"legacy_ts": u.get("ts"), "source": u.get("source")}
                if u.get("ts") or u.get("source")
                else None,
            )
        )
    out_events.extend(result.events)
    payload = {
        "run_id": gate_run_id,
        "case_id": CASE_ID,
        "gate_verdict": result.verdict,
        "refuse_reason": result.refuse_reason,
        "fabricated_evidence": result.fabricated_evidence,
        "fabricated_rules": result.fabricated_rules,
        "mode": "swarmflow_bodyguard_gated",
        "swarmflow": True,
        "warning": (
            "SwarmFlow SCHEMA + 本地 rule_gate refuse。"
            "材料勿写「已接 Swarm 保镖 Demo」。"
        ),
        "events": out_events,
        "source_run_id": ungated_events[0]["run_id"],
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def main() -> int:
    sys.path.insert(0, str(SPIKE_DIR))
    from llm_debate import load_model_env

    secrets: list[str] = []
    try:
        env = load_model_env()
        secrets.append(env.get("OPENJIUWEN_LLM_API_KEY", ""))
        _bootstrap()

        stamp = _ts()
        print(f"=== Swarm bodyguard SCHEMA+gate dual track ts={stamp} Asia/Shanghai ===")

        result, swarm_meta = asyncio.run(_run_swarm(env))
        feature = result.get("feature") or {}
        evidence = result.get("evidence") or {}
        if not isinstance(feature, dict):
            feature = {"text": str(feature), "evidence_ids": ["EV-001"], "rule_ids": ["R-01"]}
        if not isinstance(evidence, dict):
            evidence = {"text": str(evidence), "evidence_ids": ["EV-001", "EV-002"]}

        schema_run_id = "run-swarm-bodyguard-" + stamp
        events = _build_schema_events(
            run_id=schema_run_id,
            case_id=CASE_ID,
            feature=feature,
            evidence=evidence,
            swarm_meta=swarm_meta,
        )
        model_meta = {
            "client_id": env.get("OPENJIUWEN_LLM_CLIENT_ID"),
            "client_provider": "OpenAI",
            "api_base": env.get("OPENJIUWEN_LLM_API_BASE"),
            "model": env.get("OPENJIUWEN_LLM_MODEL"),
        }

        ungated_path = SPIKE_DIR / "events-swarm-bodyguard.json"
        gated_path = SPIKE_DIR / "events-swarm-bodyguard-v2.json"
        log_false = SPIKE_DIR / "logs" / f"run-swarm-bodyguard-gate-false-{stamp}.log"
        log_true = SPIKE_DIR / "logs" / f"run-swarm-bodyguard-gate-true-{stamp}.log"
        SPIKE_DIR.joinpath("logs").mkdir(exist_ok=True)

        # --- gate:false ---
        ungated = _write_ungated(events, swarm_meta, model_meta, ungated_path)
        nodes = [e.get("node") for e in ungated["events"]]
        has_fab = any(
            "EV-FAB-TRANSFER" in (e.get("evidence_ids") or []) for e in ungated["events"]
        )
        has_hc = any(
            e.get("node") == "human_confirm" and e.get("approved") is True
            for e in ungated["events"]
        )
        judge_refuse = any(
            e.get("node") == "审判官" and e.get("verdict") == "refuse"
            for e in ungated["events"]
        )
        ok_false = (
            ungated.get("gate_verdict") is None
            and has_fab
            and has_hc
            and not judge_refuse
            and "特征官" in nodes
            and "证据官" in nodes
            and ungated.get("swarmflow") is True
        )
        with log_false.open("w", encoding="utf-8") as f:
            f.write(f"track=gate:false ts={stamp}\n")
            f.write(f"swarmflow_meta={json.dumps(swarm_meta, ensure_ascii=False)}\n")
            f.write(f"wrote {ungated_path}\n")
            f.write(f"nodes={nodes}\n")
            f.write(f"gate_verdict={ungated.get('gate_verdict')}\n")
            f.write(f"has_EV-FAB={has_fab} has_human_confirm_approved={has_hc} judge_refuse={judge_refuse}\n")
            if ok_false:
                f.write("PASS gate:false ungated approved path (no rule_gate refuse)\n")
                f.write("PASS_MARKER swarm_bodyguard_gate_false\n")
            else:
                f.write("FAIL gate:false verification\n")
        print(log_false.read_text(encoding="utf-8"))
        if not ok_false:
            print("FAIL gate:false track")
            return 1

        # --- gate:true ---
        gated = _apply_gate(events, gated_path)
        fab_ev = gated.get("fabricated_evidence") or []
        fab_rules = gated.get("fabricated_rules") or []
        ok_true = (
            gated.get("gate_verdict") == "refuse"
            and "EV-FAB-TRANSFER" in fab_ev
            and "R-99" in fab_rules
            and any(
                e.get("node") == "审判官" and e.get("verdict") == "refuse"
                for e in gated.get("events") or []
            )
            and not any(
                e.get("node") == "human_confirm" and e.get("approved") is True
                for e in gated.get("events") or []
            )
        )
        with log_true.open("w", encoding="utf-8") as f:
            f.write(f"track=gate:true ts={stamp}\n")
            f.write(f"swarmflow_meta={json.dumps(swarm_meta, ensure_ascii=False)}\n")
            f.write(f"wrote {gated_path}\n")
            f.write(f"gate_verdict={gated.get('gate_verdict')}\n")
            f.write(f"fabricated_evidence={fab_ev}\n")
            f.write(f"fabricated_rules={fab_rules}\n")
            f.write(f"refuse_reason={gated.get('refuse_reason')}\n")
            if ok_true:
                f.write("PASS gate:true rule_gate refuse EV-FAB-TRANSFER/R-99\n")
                f.write("PASS_MARKER swarm_bodyguard_gate_true\n")
            else:
                f.write("FAIL gate:true verification\n")
        print(log_true.read_text(encoding="utf-8"))
        if not ok_true:
            print("FAIL gate:true track")
            return 1

        print("PASS SwarmFlow bodyguard SCHEMA + rule_gate dual track")
        print("PASS_MARKER swarm_bodyguard_gate_dual")
        print(f"artifacts: {ungated_path.name} {gated_path.name}")
        print(f"logs: {log_false.name} {log_true.name}")
        return 0
    except Exception as e:
        print(_redact(f"FAIL: {type(e).__name__}: {e}", secrets))
        print(_redact(traceback.format_exc(), secrets))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
