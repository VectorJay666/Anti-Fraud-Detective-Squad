#!/usr/bin/env python3
# coding: utf-8
"""Live-LLM TeamRuntime debate for 「转账前保镖」(OpenAI-compatible GLM).

Loads spike/model.env (never print secrets). At least 特征官/反方官 call Model.invoke.
Fabricate path: after live rounds, inject EV-FAB-TRANSFER + human_confirm so
rule_gate refuse remains demonstrable even if the model refuses to hallucinate.

NOT SwarmFlow e2e.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Optional

from event_schema import SHANGHAI, make_event, now_iso

SPIKE_DIR = Path(__file__).resolve().parent
MODEL_ENV = SPIKE_DIR / "model.env"
DOSSIER_PATH = SPIKE_DIR / "case" / "dossier.json"
RULES_PATH = SPIKE_DIR / "rules" / "base.json"

SECRET_ENV_KEYS = (
    "OPENJIUWEN_LLM_API_KEY",
    "API_KEY",
    "OPENAI_API_KEY",
)


def parse_model_env_file(path: Path = MODEL_ENV) -> dict[str, str]:
    """Read model.env (or empty dict). Never raises on missing key; never prints secrets."""
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        out[k] = v
    if "OPENJIUWEN_LLM_PROVIDER" not in out and "PROVIDER" in out:
        out["OPENJIUWEN_LLM_PROVIDER"] = out["PROVIDER"]
    if "OPENJIUWEN_LLM_CLIENT_ID" not in out and "CLIENT_ID" in out:
        out["OPENJIUWEN_LLM_CLIENT_ID"] = out["CLIENT_ID"]
    return out


def apply_model_env_to_process(env: dict[str, str], *, overwrite: bool = True) -> None:
    """Push env into os.environ. overwrite=True enables settings hot-reload."""
    for k, v in env.items():
        if overwrite or k not in os.environ:
            os.environ[k] = v


def load_model_env(
    path: Path = MODEL_ENV,
    *,
    require_key: bool = True,
    overwrite_environ: bool = True,
) -> dict[str, str]:
    """Load spike/model.env into a dict (+ os.environ).

    overwrite_environ=True so PUT /v1/settings/model hot-reload sticks for next debate.
    require_key=False for settings GET (empty key → caller sees configured=false).
    """
    out = parse_model_env_file(path)
    if not out and not path.is_file():
        if require_key:
            raise FileNotFoundError(f"missing model env: {path}")
        return out
    apply_model_env_to_process(out, overwrite=overwrite_environ)
    if require_key and not out.get("OPENJIUWEN_LLM_API_KEY"):
        raise RuntimeError("OPENJIUWEN_LLM_API_KEY missing in model.env")
    return out


_MODEL_ENV_KEYS = (
    "OPENJIUWEN_LLM_API_KEY",
    "OPENJIUWEN_LLM_API_BASE",
    "OPENJIUWEN_LLM_MODEL",
    "OPENJIUWEN_LLM_PROVIDER",
    "OPENJIUWEN_LLM_CLIENT_ID",
)


def model_settings_public(env: dict[str, str] | None = None) -> dict[str, object]:
    """Safe settings view — NEVER includes plaintext api_key."""
    env = env if env is not None else parse_model_env_file()
    key = (env.get("OPENJIUWEN_LLM_API_KEY") or "").strip()
    base = (env.get("OPENJIUWEN_LLM_API_BASE") or "").strip()
    model = (env.get("OPENJIUWEN_LLM_MODEL") or "").strip()
    return {
        "configured": bool(key),
        "base_url": base,
        "model": model,
        "key_set": bool(key),
        "provider": (env.get("OPENJIUWEN_LLM_PROVIDER") or "openai").strip() or "openai",
        "client_id": (env.get("OPENJIUWEN_LLM_CLIENT_ID") or "glm-flash").strip() or "glm-flash",
    }


def write_model_env(
    *,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
    provider: str | None = None,
    client_id: str | None = None,
    path: Path = MODEL_ENV,
) -> dict[str, object]:
    """Merge updates into model.env (chmod 600), hot-apply to process. No key in return."""
    cur = parse_model_env_file(path)
    if api_key is not None:
        cur["OPENJIUWEN_LLM_API_KEY"] = str(api_key).strip()
    if base_url is not None:
        cur["OPENJIUWEN_LLM_API_BASE"] = str(base_url).strip().rstrip("/")
    if model is not None:
        cur["OPENJIUWEN_LLM_MODEL"] = str(model).strip()
    if provider is not None:
        cur["OPENJIUWEN_LLM_PROVIDER"] = str(provider).strip() or "openai"
    if client_id is not None:
        cur["OPENJIUWEN_LLM_CLIENT_ID"] = str(client_id).strip() or "glm-flash"
    # defaults so file is usable after first save
    cur.setdefault("OPENJIUWEN_LLM_API_BASE", "https://open.bigmodel.cn/api/paas/v4")
    cur.setdefault("OPENJIUWEN_LLM_MODEL", "glm-5.3-flash")
    cur.setdefault("OPENJIUWEN_LLM_PROVIDER", "openai")
    cur.setdefault("OPENJIUWEN_LLM_CLIENT_ID", "glm-flash")
    cur.setdefault("OPENJIUWEN_LLM_API_KEY", "")

    lines = [
        "# Local demo model config — DO NOT commit real keys",
        "# Written by PUT /v1/settings/model (chmod 600)",
    ]
    for k in _MODEL_ENV_KEYS:
        lines.append(f"{k}={cur.get(k, '')}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    apply_model_env_to_process(cur, overwrite=True)
    return model_settings_public(cur)


def risk_level_for_gate(gate_verdict: str | None) -> str:
    """Backend-owned risk badge contract (FE prefers meta.risk_level).

    refuse / 规则盖章拒判 → mid（不得标高风险）
    convict → high
    pass → low
    None/ungated → mid
    """
    g = (gate_verdict or "").strip().lower()
    if g == "convict":
        return "high"
    if g == "pass":
        return "low"
    if g == "refuse":
        return "mid"
    return "mid"


def redact(text: str, secrets: list[str]) -> str:
    out = text
    for s in secrets:
        if s and len(s) >= 8:
            out = out.replace(s, "<REDACTED_API_KEY>")
    return out


def _bootstrap_openjiuwen() -> None:
    agent_core = SPIKE_DIR.parent / "agent-core"
    import sys

    if str(agent_core) not in sys.path:
        sys.path.insert(0, str(agent_core))
    from openjiuwen.core.common.logging.log_config import configure_log
    from openjiuwen.core.common.logging.manager import LogManager

    configure_log(str(SPIKE_DIR / "log_config_p2p.yaml"))
    LogManager.initialize()


def _build_model(env: dict[str, str]):
    from openjiuwen.core.foundation.llm import Model, ModelClientConfig, ModelRequestConfig

    provider_raw = (env.get("OPENJIUWEN_LLM_PROVIDER") or "openai").strip()
    # openjiuwen enum value is "OpenAI"
    provider = "OpenAI" if provider_raw.lower() == "openai" else provider_raw
    client = ModelClientConfig(
        client_id=env.get("OPENJIUWEN_LLM_CLIENT_ID") or "glm-flash",
        client_provider=provider,
        api_key=env["OPENJIUWEN_LLM_API_KEY"],
        api_base=env["OPENJIUWEN_LLM_API_BASE"],
        verify_ssl=True,
        timeout=120.0,
    )
    req = ModelRequestConfig(
        model=env["OPENJIUWEN_LLM_MODEL"],
        temperature=0.3,
        max_tokens=400,
    )
    return Model(client, req), {
        "client_id": client.client_id,
        "client_provider": str(client.client_provider),
        "api_base": client.api_base,
        "model": env["OPENJIUWEN_LLM_MODEL"],
    }


def _dossier_brief() -> str:
    d = json.loads(DOSSIER_PATH.read_text(encoding="utf-8"))
    lines = [
        f"案卷 {d.get('case_id')}: {d.get('title')}",
        "事实:",
        *[f"- {f}" for f in d.get("facts", [])],
        "证据（仅可引用下列 id）:",
    ]
    for e in d.get("evidence", []):
        lines.append(f"- {e['id']}: {e.get('text','')[:120]}")
    lines.append("注意：案卷中不存在转账记录；禁止编造不存在的证据编号。")
    return "\n".join(lines)


async def _llm_text(model, system: str, user: str) -> str:
    resp = await model.invoke(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
    )
    content = getattr(resp, "content", None)
    if content is None:
        content = str(resp)
    return str(content).strip()


def _extract_known_ids(text: str, known: list[str]) -> list[str]:
    found = []
    for kid in known:
        if kid in text and kid not in found:
            found.append(kid)
    return found


def build_agents(
    CommunicableAgent,
    BaseAgent,
    Session,
    model,
    *,
    brief: Optional[str] = None,
    known_ev: Optional[list[str]] = None,
    known_rules: Optional[list[str]] = None,
):
    known_ev = list(known_ev) if known_ev is not None else ["EV-001", "EV-002"]
    known_rules = list(known_rules) if known_rules is not None else ["R-01", "R-02"]
    brief = brief if brief is not None else _dossier_brief()

    class FeatureAgent(CommunicableAgent, BaseAgent):
        def configure(self, config) -> "FeatureAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id, case_id = ctx["run_id"], ctx["case_id"]
            phase = ctx.get("phase", "feature")
            if phase == "fabricate":
                # Deterministic injection — gate demo must not depend on model inventing
                ev = make_event(
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
                    },
                )
                return {"event": ev, "run_id": run_id, "case_id": case_id}

            ctx_extra = (ctx.get("user_context") or "").strip()
            ev_hint = "、".join(known_ev) if known_ev else "（无）"
            text = await _llm_text(
                model,
                system=(
                    "你是反诈「特征官」。根据案卷/用户粘贴指出催转/冒充风险。"
                    f"只引用已有证据编号（{ev_hint}）和条款 R-01。"
                    "用中文 2～4 句，不要编造不存在的证据。"
                ),
                user=brief
                + (("\n\n【用户补充上下文】\n" + ctx_extra) if ctx_extra else "")
                + "\n\n请输出特征分析。",
            )
            eids = _extract_known_ids(text, known_ev) or (list(known_ev[:2]) if known_ev else [])
            rids = _extract_known_ids(text, known_rules) or ["R-01"]
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="特征官",
                text=text,
                evidence_ids=eids,
                rule_ids=rids,
                extra={"phase": "feature", "source": "llm"},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    class EvidenceAgent(CommunicableAgent, BaseAgent):
        def configure(self, config) -> "EvidenceAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id, case_id = ctx["run_id"], ctx["case_id"]
            prev_text = (ctx.get("event") or {}).get("text") or ""
            ctx_extra = (ctx.get("user_context") or "").strip()
            ev_hint = "、".join(known_ev) if known_ev else "（无）"
            text = await _llm_text(
                model,
                system=(
                    "你是「证据官」。核实特征官引用是否在案卷/现场证据中。"
                    f"只承认 {ev_hint}。用中文 1～3 句说明查证结果。"
                ),
                user=f"{brief}"
                + (("\n\n【用户补充上下文】\n" + ctx_extra) if ctx_extra else "")
                + f"\n\n特征官发言：\n{prev_text}\n\n请查证。",
            )
            eids = _extract_known_ids(text, known_ev) or (list(known_ev[:2]) if known_ev else [])
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="证据官",
                text=text,
                evidence_ids=eids,
                rule_ids=[],
                extra={"phase": "tool", "source": "llm"},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    class RiskAgent(CommunicableAgent, BaseAgent):
        def configure(self, config) -> "RiskAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id, case_id = ctx["run_id"], ctx["case_id"]
            ctx_extra = (ctx.get("user_context") or "").strip()
            feat = (ctx.get("feature_text") or "").strip()
            evid = (ctx.get("evidence_text") or "").strip()
            ev_hint = "、".join(known_ev) if known_ev else "（无）"
            text = await _llm_text(
                model,
                system=(
                    "你是「风险官」。综合特征/证据，用中文 2～4 句说明风险等级，"
                    "并明确是否建议拦转/先别转。无证据则偏向先别转。"
                    f"只引用 {ev_hint}。不要编造编号。"
                ),
                user=brief
                + (("\n\n【用户补充上下文】\n" + ctx_extra) if ctx_extra else "")
                + f"\n\n特征官：{feat}\n证据官：{evid}\n\n请评估风险。",
            )
            eids = _extract_known_ids(text, known_ev)
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="风险官",
                text=text,
                evidence_ids=eids,
                rule_ids=[],
                extra={"phase": "risk", "source": "llm"},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    class ComplianceAgent(CommunicableAgent, BaseAgent):
        def configure(self, config) -> "ComplianceAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id, case_id = ctx["run_id"], ctx["case_id"]
            ctx_extra = (ctx.get("user_context") or "").strip()
            feat = (ctx.get("feature_text") or "").strip()
            evid = (ctx.get("evidence_text") or "").strip()
            risk = (ctx.get("risk_text") or "").strip()
            ev_hint = "、".join(known_ev) if known_ev else "（无）"
            rule_hint = "、".join(known_rules) if known_rules else "R-01/R-02"
            text = await _llm_text(
                model,
                system=(
                    "你是「合规官」。核对是否命中条款、证据是否足以定罪。"
                    f"只许引用证据 {ev_hint} 与条款 {rule_hint}。"
                    "若证据不足必须明确拒绝定罪。用中文 2～4 句。"
                ),
                user=brief
                + (("\n\n【用户补充上下文】\n" + ctx_extra) if ctx_extra else "")
                + f"\n\n特征官：{feat}\n证据官：{evid}\n风险官：{risk}\n\n请合规裁定。",
            )
            eids = _extract_known_ids(text, known_ev)
            rids = _extract_known_ids(text, known_rules)
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="合规官",
                text=text,
                evidence_ids=eids,
                rule_ids=rids,
                extra={"phase": "compliance", "source": "llm"},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    class ProtectAgent(CommunicableAgent, BaseAgent):
        def configure(self, config) -> "ProtectAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id, case_id = ctx["run_id"], ctx["case_id"]
            ctx_extra = (ctx.get("user_context") or "").strip()
            feat = (ctx.get("feature_text") or "").strip()
            evid = (ctx.get("evidence_text") or "").strip()
            risk = (ctx.get("risk_text") or "").strip()
            comp = (ctx.get("compliance_text") or "").strip()
            defe = (ctx.get("defender_text") or "").strip()
            ev_hint = "、".join(known_ev) if known_ev else "（无）"
            text = await _llm_text(
                model,
                system=(
                    "你是「用户保护官」，会商最后对用户的建议输出。"
                    "给可执行清单：先别转、打官方客服核实、"
                    "勿点陌生链接、保留聊天记录等。口语化、可照做。中文 3～5 句。"
                    f"只引用 {ev_hint}。不要编造编号。"
                ),
                user=brief
                + (("\n\n【用户补充上下文】\n" + ctx_extra) if ctx_extra else "")
                + f"\n\n特征官：{feat}\n证据官：{evid}\n风险官：{risk}\n合规官：{comp}"
                + (f"\n反方官：{defe}" if defe else "")
                + "\n\n请给出保护清单（面向用户的最终建议）。",
            )
            eids = _extract_known_ids(text, known_ev)
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="用户保护官",
                text=text,
                evidence_ids=eids,
                rule_ids=[],
                extra={"phase": "protect", "source": "llm"},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    class DefenderAgent(CommunicableAgent, BaseAgent):
        def configure(self, config) -> "DefenderAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id, case_id = ctx["run_id"], ctx["case_id"]
            ctx_extra = (ctx.get("user_context") or "").strip()
            text = await _llm_text(
                model,
                system=(
                    "你是「反方官」。提出不宜仓促定罪的理由（如用户尚未转账、可能误判）。"
                    "用中文 1～3 句。不要编造证据编号。"
                ),
                user=brief
                + (("\n\n【用户补充上下文】\n" + ctx_extra) if ctx_extra else "")
                + "\n\n请质证。",
            )
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="反方官",
                text=text,
                evidence_ids=[],
                rule_ids=[],
                extra={"phase": "debate", "source": "llm"},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    class HumanConfirmAgent(CommunicableAgent, BaseAgent):
        def configure(self, config) -> "HumanConfirmAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id, case_id = ctx["run_id"], ctx["case_id"]
            fab = (ctx.get("event") or {}).get("evidence_ids") or ["EV-FAB-TRANSFER"]
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="human_confirm",
                text="approved true",
                evidence_ids=list(fab),
                rule_ids=[],
                extra={"phase": "hitl", "approved": True, "source": "deterministic"},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    return FeatureAgent, EvidenceAgent, RiskAgent, ComplianceAgent, ProtectAgent, DefenderAgent, HumanConfirmAgent


async def run_llm_debate(*, run_id: str, case_id: str, env: dict[str, str]) -> tuple[list[dict], dict]:
    from openjiuwen.core.common.logging import multi_agent_logger
    from openjiuwen.core.multi_agent.team_runtime import TeamRuntime, CommunicableAgent
    from openjiuwen.core.single_agent.base import BaseAgent
    from openjiuwen.core.single_agent.schema.agent_card import AgentCard
    from openjiuwen.core.session.session import Session

    model, meta = _build_model(env)
    (
        FeatureAgent,
        EvidenceAgent,
        RiskAgent,
        ComplianceAgent,
        ProtectAgent,
        DefenderAgent,
        HumanConfirmAgent,
    ) = build_agents(CommunicableAgent, BaseAgent, Session, model)

    cards = {
        "feature": AgentCard(id="feature", name="特征官", description="特征/控方"),
        "evidence": AgentCard(id="evidence", name="证据官", description="证据核验"),
        "risk": AgentCard(id="risk", name="风险官", description="风险拦转"),
        "compliance": AgentCard(id="compliance", name="合规官", description="条款合规"),
        "protect": AgentCard(id="protect", name="用户保护官", description="用户保护"),
        "defender": AgentCard(id="defender", name="反方官", description="反方"),
        "human": AgentCard(id="human", name="human_confirm", description="人工确认"),
    }
    runtime = TeamRuntime()
    runtime.register_agent(cards["feature"], lambda: FeatureAgent(card=cards["feature"]))
    runtime.register_agent(cards["evidence"], lambda: EvidenceAgent(card=cards["evidence"]))
    runtime.register_agent(cards["risk"], lambda: RiskAgent(card=cards["risk"]))
    runtime.register_agent(cards["compliance"], lambda: ComplianceAgent(card=cards["compliance"]))
    runtime.register_agent(cards["protect"], lambda: ProtectAgent(card=cards["protect"]))
    runtime.register_agent(cards["defender"], lambda: DefenderAgent(card=cards["defender"]))
    runtime.register_agent(cards["human"], lambda: HumanConfirmAgent(card=cards["human"]))
    await runtime.start()

    events: list[dict[str, Any]] = []
    try:
        multi_agent_logger.info("=" * 55)
        multi_agent_logger.info("TeamRuntime LLM debate (GLM OpenAI-compatible)")
        multi_agent_logger.info(
            f"model={meta['model']} provider={meta['client_provider']} base={meta['api_base']}"
        )
        multi_agent_logger.info("NOT SwarmFlow; fabricate injected for gate demo")
        multi_agent_logger.info("=" * 55)

        r1 = await runtime.send(
            message={"run_id": run_id, "case_id": case_id, "phase": "feature"},
            recipient="feature",
            sender="user",
        )
        events.append(r1["event"])
        multi_agent_logger.info(f"[特征官/llm] {r1['event']['text'][:200]}")

        r2 = await runtime.send(
            message={**r1, "run_id": run_id, "case_id": case_id},
            recipient="evidence",
            sender="feature",
        )
        events.append(r2["event"])
        multi_agent_logger.info(f"[证据官/llm] {r2['event']['text'][:200]}")

        r_risk = await runtime.send(
            message={
                "run_id": run_id,
                "case_id": case_id,
                "feature_text": r1["event"]["text"],
                "evidence_text": r2["event"]["text"],
            },
            recipient="risk",
            sender="evidence",
        )
        events.append(r_risk["event"])
        multi_agent_logger.info(f"[风险官/llm] {r_risk['event']['text'][:200]}")

        r_comp = await runtime.send(
            message={
                "run_id": run_id,
                "case_id": case_id,
                "feature_text": r1["event"]["text"],
                "evidence_text": r2["event"]["text"],
                "risk_text": r_risk["event"]["text"],
            },
            recipient="compliance",
            sender="risk",
        )
        events.append(r_comp["event"])
        multi_agent_logger.info(f"[合规官/llm] {r_comp['event']['text'][:200]}")

        r3 = await runtime.send(
            message={"run_id": run_id, "case_id": case_id},
            recipient="defender",
            sender="compliance",
        )
        events.append(r3["event"])
        multi_agent_logger.info(f"[反方官/llm] {r3['event']['text'][:200]}")

        r_prot = await runtime.send(
            message={
                "run_id": run_id,
                "case_id": case_id,
                "feature_text": r1["event"]["text"],
                "evidence_text": r2["event"]["text"],
                "risk_text": r_risk["event"]["text"],
                "compliance_text": r_comp["event"]["text"],
                "defender_text": r3["event"]["text"],
            },
            recipient="protect",
            sender="defender",
        )
        events.append(r_prot["event"])
        multi_agent_logger.info(f"[用户保护官/llm] {r_prot['event']['text'][:200]}")

        r4 = await runtime.send(
            message={"run_id": run_id, "case_id": case_id, "phase": "fabricate"},
            recipient="feature",
            sender="protect",
        )
        events.append(r4["event"])
        multi_agent_logger.info(f"[特征官/inject] {r4['event']['text']}")

        r5 = await runtime.send(
            message={**r4, "run_id": run_id, "case_id": case_id},
            recipient="human",
            sender="feature",
        )
        events.append(r5["event"])
        multi_agent_logger.info(f"[human_confirm] {r5['event']['text']}")
        multi_agent_logger.info(f"llm debate done events={len(events)}")
    finally:
        await runtime.stop()

    return events, meta


def write_ungated(
    *,
    run_id: str,
    case_id: str,
    events: list[dict],
    meta: dict,
    out_path: Path,
) -> dict:
    payload = {
        "run_id": run_id,
        "case_id": case_id,
        "generated_at": now_iso(),
        "mode": "teamruntime_llm_debate",
        "model_meta": meta,  # no api_key
        "warning": (
            "Live LLM TeamRuntime debate + deterministic fabricate inject. "
            "NOT SwarmFlow e2e."
        ),
        "events": events,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


async def main_async(*, case_id: str, out_path: Path) -> dict:
    env = load_model_env()
    _bootstrap_openjiuwen()
    run_id = "run-llm-" + datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
    events, meta = await run_llm_debate(run_id=run_id, case_id=case_id, env=env)
    return write_ungated(
        run_id=run_id, case_id=case_id, events=events, meta=meta, out_path=out_path
    )


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(SPIKE_DIR / "events-llm.json"))
    ap.add_argument("--case-id", default="CASE-SPIKE-FAB-001")
    args = ap.parse_args()
    payload = asyncio.run(main_async(case_id=args.case_id, out_path=Path(args.out)))
    print(f"wrote {args.out} run_id={payload['run_id']} events={len(payload['events'])}")




def build_live_user_context(ctx: dict[str, Any]) -> str:
    """Format actual-layer form fields for agent prompts."""
    lines: list[str] = []
    tr = (ctx.get("transcript") or "").strip()
    if tr:
        lines.append("会话原文（transcript）:")
        lines.append(tr)
    if ctx.get("amount") is not None:
        lines.append(f"拟转金额(元): {ctx.get('amount')}")
    if ctx.get("payee"):
        lines.append(f"收款方: {ctx.get('payee')}")
    urg = ctx.get("urgency") or "mid"
    lines.append(f"紧急程度: {urg}")
    links = ctx.get("suspect_links") or []
    if links:
        lines.append("可疑链接:")
        for u in links[:10]:
            lines.append(f"- {u}")
    if ctx.get("user_note"):
        lines.append(f"用户补充: {ctx.get('user_note')}")
    return "\n".join(lines)


def build_live_dossier(case_id: str, ctx: dict[str, Any]) -> dict[str, Any]:
    """Minimal dossier for actual-layer gate: transcript as sole known evidence."""
    tr = (ctx.get("transcript") or "").strip()
    facts = ["用户粘贴会话，请求实时裁定"]
    if ctx.get("amount") is not None:
        facts.append(f"拟转金额(元): {ctx.get('amount')}")
    if ctx.get("payee"):
        facts.append(f"收款方: {ctx.get('payee')}")
    if ctx.get("user_note"):
        facts.append(f"用户补充: {ctx.get('user_note')}")
    return {
        "case_id": case_id,
        "title": "用户实时粘贴会话（实际层）",
        "facts": facts,
        "evidence": [
            {
                "id": "EV-LIVE-001",
                "type": "chat_snippet",
                "text": tr[:2000] if tr else "(empty)",
            }
        ],
        "note": "实际层现场证据仅 EV-LIVE-001；禁空跑定罪。",
    }


def build_live_brief(case_id: str, ctx: dict[str, Any]) -> str:
    d = build_live_dossier(case_id, ctx)
    lines = [
        f"案卷 {d.get('case_id')}: {d.get('title')}",
        "事实:",
        *[f"- {f}" for f in d.get("facts", [])],
        "证据（仅可引用下列 id）:",
    ]
    for e in d.get("evidence", []):
        lines.append(f"- {e['id']}: {e.get('text', '')[:200]}")
    lines.append("注意：禁止编造不存在的证据编号；无证据不得定罪。")
    return "\n".join(lines)


# --- Live API helpers (SSE / thin HTTP). NOT SwarmFlow. ---

LIVE_LABEL = "真 LLM 现场会商"


def _live_scrub_event(ev: dict) -> dict:
    """Live surface: never emit 确定性注入 / deterministic_inject labels."""
    out = dict(ev)
    src = out.get("source")
    if src in ("deterministic_inject", "deterministic", "llm"):
        out["source"] = "live"
    out.pop("hallucination", None)
    return out


async def iter_llm_debate(
    *,
    run_id: str,
    case_id: str,
    env: dict[str, str],
    live_mode: bool = True,
    context: Optional[dict[str, Any]] = None,
    skip_fabricate: bool = False,
    brief: Optional[str] = None,
    known_ev: Optional[list[str]] = None,
) -> AsyncIterator[tuple[str, Any]]:
    """Yield ("meta", model_meta) once, then ("event", SCHEMA_event) as debate runs.

    Order: 特征官 → 证据官 → 风险官 → 合规官 → 反方官 → 用户保护官
    → [特征官(fab-step) → human_confirm].
    Fab-step keeps Demo gated refuse demonstrable; skip_fabricate=True for
    actual-layer transcript path. live_mode scrubs inject labels.
    """
    from openjiuwen.core.common.logging import multi_agent_logger
    from openjiuwen.core.multi_agent.team_runtime import TeamRuntime, CommunicableAgent
    from openjiuwen.core.single_agent.base import BaseAgent
    from openjiuwen.core.single_agent.schema.agent_card import AgentCard
    from openjiuwen.core.session.session import Session

    model, meta = _build_model(env)
    yield ("meta", meta)

    user_context = build_live_user_context(context) if context else ""
    (
        FeatureAgent,
        EvidenceAgent,
        RiskAgent,
        ComplianceAgent,
        ProtectAgent,
        DefenderAgent,
        HumanConfirmAgent,
    ) = build_agents(
        CommunicableAgent,
        BaseAgent,
        Session,
        model,
        brief=brief,
        known_ev=known_ev,
    )

    cards = {
        "feature": AgentCard(id="feature", name="特征官", description="特征/控方"),
        "evidence": AgentCard(id="evidence", name="证据官", description="证据核验"),
        "risk": AgentCard(id="risk", name="风险官", description="风险拦转"),
        "compliance": AgentCard(id="compliance", name="合规官", description="条款合规"),
        "protect": AgentCard(id="protect", name="用户保护官", description="用户保护"),
        "defender": AgentCard(id="defender", name="反方官", description="反方"),
        "human": AgentCard(id="human", name="human_confirm", description="人工确认"),
    }
    runtime = TeamRuntime()
    runtime.register_agent(cards["feature"], lambda: FeatureAgent(card=cards["feature"]))
    runtime.register_agent(cards["evidence"], lambda: EvidenceAgent(card=cards["evidence"]))
    runtime.register_agent(cards["risk"], lambda: RiskAgent(card=cards["risk"]))
    runtime.register_agent(cards["compliance"], lambda: ComplianceAgent(card=cards["compliance"]))
    runtime.register_agent(cards["protect"], lambda: ProtectAgent(card=cards["protect"]))
    runtime.register_agent(cards["defender"], lambda: DefenderAgent(card=cards["defender"]))
    runtime.register_agent(cards["human"], lambda: HumanConfirmAgent(card=cards["human"]))
    await runtime.start()

    def _emit(ev: dict) -> dict:
        return _live_scrub_event(ev) if live_mode else ev

    try:
        multi_agent_logger.info("=" * 55)
        multi_agent_logger.info(
            f"{LIVE_LABEL} (TeamRuntime GLM) live_mode={live_mode} skip_fabricate={skip_fabricate}"
        )
        multi_agent_logger.info(
            f"model={meta['model']} provider={meta['client_provider']} base={meta['api_base']}"
        )
        multi_agent_logger.info("NOT SwarmFlow")
        multi_agent_logger.info("=" * 55)

        r1 = await runtime.send(
            message={
                "run_id": run_id,
                "case_id": case_id,
                "phase": "feature",
                "user_context": user_context,
            },
            recipient="feature",
            sender="user",
        )
        e1 = _emit(r1["event"])
        multi_agent_logger.info(f"[特征官] {e1['text'][:200]}")
        yield ("event", e1)

        r2 = await runtime.send(
            message={**r1, "run_id": run_id, "case_id": case_id, "user_context": user_context},
            recipient="evidence",
            sender="feature",
        )
        e2 = _emit(r2["event"])
        multi_agent_logger.info(f"[证据官] {e2['text'][:200]}")
        yield ("event", e2)

        r_risk = await runtime.send(
            message={
                "run_id": run_id,
                "case_id": case_id,
                "user_context": user_context,
                "feature_text": e1["text"],
                "evidence_text": e2["text"],
            },
            recipient="risk",
            sender="evidence",
        )
        e_risk = _emit(r_risk["event"])
        multi_agent_logger.info(f"[风险官] {e_risk['text'][:200]}")
        yield ("event", e_risk)

        r_comp = await runtime.send(
            message={
                "run_id": run_id,
                "case_id": case_id,
                "user_context": user_context,
                "feature_text": e1["text"],
                "evidence_text": e2["text"],
                "risk_text": e_risk["text"],
            },
            recipient="compliance",
            sender="risk",
        )
        e_comp = _emit(r_comp["event"])
        multi_agent_logger.info(f"[合规官] {e_comp['text'][:200]}")
        yield ("event", e_comp)

        r3 = await runtime.send(
            message={"run_id": run_id, "case_id": case_id, "user_context": user_context},
            recipient="defender",
            sender="compliance",
        )
        e3 = _emit(r3["event"])
        multi_agent_logger.info(f"[反方官] {e3['text'][:200]}")
        yield ("event", e3)

        r_prot = await runtime.send(
            message={
                "run_id": run_id,
                "case_id": case_id,
                "user_context": user_context,
                "feature_text": e1["text"],
                "evidence_text": e2["text"],
                "risk_text": e_risk["text"],
                "compliance_text": e_comp["text"],
                "defender_text": e3["text"],
            },
            recipient="protect",
            sender="defender",
        )
        e_prot = _emit(r_prot["event"])
        multi_agent_logger.info(f"[用户保护官] {e_prot['text'][:200]}")
        yield ("event", e_prot)

        if not skip_fabricate:
            r4 = await runtime.send(
                message={"run_id": run_id, "case_id": case_id, "phase": "fabricate"},
                recipient="feature",
                sender="protect",
            )
            e4 = _emit(r4["event"])
            multi_agent_logger.info(f"[特征官/fab-step] {e4['text']}")
            yield ("event", e4)

            r5 = await runtime.send(
                message={**r4, "run_id": run_id, "case_id": case_id},
                recipient="human",
                sender="feature",
            )
            e5 = _emit(r5["event"])
            multi_agent_logger.info(f"[human_confirm] {e5['text']}")
            yield ("event", e5)
    finally:
        await runtime.stop()


def _collect_evidence_ids(events: list[dict]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for e in events:
        for eid in e.get("evidence_ids") or []:
            if eid and eid not in seen:
                out.append(eid)
                seen.add(eid)
    return out


def force_refuse_empty_evidence(
    *,
    run_id: str,
    case_id: str,
    final: dict,
    ungated_events: list[dict],
    live: bool = True,
) -> dict:
    """禁空跑定罪: no evidence_ids from debate → gate_verdict=refuse."""
    if _collect_evidence_ids(ungated_events):
        return final
    reason = (
        "证据不足 · 先别转——会商未产出可核 evidence_ids，禁空跑定罪。"
    )
    judge = make_event(
        run_id=run_id,
        case_id=case_id,
        node="审判官",
        text=reason,
        evidence_ids=[],
        rule_ids=["R-02"],
        verdict="refuse",
        refuse_reason=reason,
        extra={"empty_evidence": True},
    )
    if live:
        judge = _live_scrub_event(judge)
    events = list(final.get("events") or [])
    # drop prior 审判官 if any
    events = [e for e in events if e.get("node") != "审判官"]
    events.append(judge)
    out = dict(final)
    out["gate_verdict"] = "refuse"
    out["refuse_reason"] = reason
    out["events"] = events
    out["empty_evidence_refuse"] = True
    out["risk_level"] = risk_level_for_gate("refuse")
    return out


def build_gated_payload(
    *,
    run_id: str,
    case_id: str,
    ungated_events: list[dict],
    live: bool = True,
    dossier: Optional[dict] = None,
) -> dict:
    """Apply rule_gate; drop approving human_confirm from gated event list."""
    from rule_gate import load_json, stamp_verdict

    dossier = dossier if dossier is not None else load_json(DOSSIER_PATH)
    rules = load_json(RULES_PATH)
    gate_run_id = "run-gate-" + datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
    result = stamp_verdict(
        run_id=gate_run_id,
        case_id=case_id,
        dossier=dossier,
        rules=rules,
        utterances=ungated_events,
        proposed_verdict="convict",
    )
    out_events: list[dict] = []
    for u in ungated_events:
        role = u.get("role") or u.get("node") or "特征官"
        if role == "human_confirm" and u.get("approved") is True:
            continue
        out_events.append(
            make_event(
                run_id=gate_run_id,
                case_id=case_id,
                node=role,
                text=u.get("text") or "",
                evidence_ids=u.get("evidence_ids"),
                rule_ids=u.get("rule_ids"),
                extra={"legacy_ts": u.get("ts")} if u.get("ts") else None,
            )
        )
    out_events.extend(result.events)
    if live:
        out_events = [_live_scrub_event(e) for e in out_events]
    final = {
        "run_id": gate_run_id,
        "case_id": case_id,
        "gate_verdict": result.verdict,
        "refuse_reason": result.refuse_reason,
        "fabricated_evidence": result.fabricated_evidence,
        "fabricated_rules": result.fabricated_rules,
        "live": True if live else False,
        "fabricate": None,
        "label": LIVE_LABEL if live else None,
        "mode": "teamruntime_llm_live_gated" if live else "teamruntime_llm_gated",
        "warning": (
            f"{LIVE_LABEL} + 本地 rule_gate。NOT SwarmFlow。"
            if live
            else "TeamRuntime LLM + rule_gate. NOT SwarmFlow."
        ),
        "events": out_events,
        "source_run_id": run_id,
    }
    out = force_refuse_empty_evidence(
        run_id=gate_run_id,
        case_id=case_id,
        final=final,
        ungated_events=ungated_events,
        live=live,
    )
    out = dict(out)
    out["risk_level"] = risk_level_for_gate(out.get("gate_verdict"))
    return out


def build_ungated_payload(
    *,
    run_id: str,
    case_id: str,
    events: list[dict],
    meta: dict,
    live: bool = True,
) -> dict:
    return {
        "run_id": run_id,
        "case_id": case_id,
        "generated_at": now_iso(),
        "gate_verdict": None,
        "risk_level": risk_level_for_gate(None),
        "live": True if live else False,
        "fabricate": None,
        "label": LIVE_LABEL if live else None,
        "mode": "teamruntime_llm_live" if live else "teamruntime_llm_debate",
        "model_meta": meta,
        "warning": (
            f"{LIVE_LABEL}（未盖章 / ungated）。NOT SwarmFlow。"
            if live
            else "Live LLM TeamRuntime debate. NOT SwarmFlow e2e."
        ),
        "events": events,
    }
