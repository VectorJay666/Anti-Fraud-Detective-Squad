#!/usr/bin/env python3
# coding: utf-8
"""TeamRuntime scripted debate for 「转账前保镖」(deterministic, no LLM).

NOT SwarmFlow e2e. Agents are CommunicableAgent stubs that emit SCHEMA.md
events, including a fabricated EV-FAB-TRANSFER path so rule_gate can refuse.

Flow (P2P sequential, same spirit as runtime_p2p):
  user -> 特征官 -> 证据官 -> 反方官 -> 特征官(编造) -> human_confirm
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Optional

from event_schema import SHANGHAI, make_event, now_iso

SPIKE_DIR = Path(__file__).resolve().parent


def _bootstrap_openjiuwen() -> None:
    agent_core = SPIKE_DIR.parent / "agent-core"
    import sys

    if str(agent_core) not in sys.path:
        sys.path.insert(0, str(agent_core))
    from openjiuwen.core.common.logging.log_config import configure_log
    from openjiuwen.core.common.logging.manager import LogManager

    log_yaml = SPIKE_DIR / "log_config_p2p.yaml"
    configure_log(str(log_yaml))
    LogManager.initialize()


def _import_runtime():
    from openjiuwen.core.common.logging import multi_agent_logger
    from openjiuwen.core.multi_agent.team_runtime import TeamRuntime, CommunicableAgent
    from openjiuwen.core.single_agent.base import BaseAgent
    from openjiuwen.core.single_agent.schema.agent_card import AgentCard
    from openjiuwen.core.session.session import Session

    return multi_agent_logger, TeamRuntime, CommunicableAgent, BaseAgent, AgentCard, Session


def build_agents(CommunicableAgent, BaseAgent, Session):
    class FeatureAgent(CommunicableAgent, BaseAgent):
        """特征官：首轮真证据；次轮故意编造 EV-FAB-TRANSFER。"""

        def configure(self, config) -> "FeatureAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id = ctx["run_id"]
            case_id = ctx["case_id"]
            phase = ctx.get("phase", "feature")
            if phase == "fabricate":
                ev = make_event(
                    run_id=run_id,
                    case_id=case_id,
                    node="特征官",
                    text="转账记录已移送，编号 EV-FAB-TRANSFER，建议定罪。",
                    evidence_ids=["EV-FAB-TRANSFER"],
                    rule_ids=["R-01", "R-99"],
                    extra={"phase": "debate", "hallucination": True, "intent": "convict"},
                )
            else:
                ev = make_event(
                    run_id=run_id,
                    case_id=case_id,
                    node="特征官",
                    text="特征：冒充客服 + 催转限时。引用 EV-001、EV-002。",
                    evidence_ids=["EV-001", "EV-002"],
                    rule_ids=["R-01"],
                    extra={"phase": "feature"},
                )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    class EvidenceAgent(CommunicableAgent, BaseAgent):
        def configure(self, config) -> "EvidenceAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            prev = ctx.get("event") or {}
            run_id = ctx["run_id"]
            case_id = ctx["case_id"]
            hits = [e for e in (prev.get("evidence_ids") or []) if e.startswith("EV-00")]
            if not hits:
                hits = ["EV-001", "EV-002"]
            tool = {"tool": "lookup_chat_evidence", "query": "催转话术", "hits": hits}
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="证据官",
                text=f"工具 lookup_chat_evidence 命中 {hits}（案卷可核）。",
                evidence_ids=hits,
                rule_ids=[],
                extra={"phase": "tool", "tool": tool},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id, "prev": prev}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    class DefenderAgent(CommunicableAgent, BaseAgent):
        def configure(self, config) -> "DefenderAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id = ctx["run_id"]
            case_id = ctx["case_id"]
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="反方官",
                text="可能是用户主动咨询，不宜直接定罪。",
                evidence_ids=[],
                rule_ids=[],
                extra={"phase": "debate"},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    class HumanConfirmAgent(CommunicableAgent, BaseAgent):
        """Pre-gate HITL risk: wrongly approves fabricated evidence."""

        def configure(self, config) -> "HumanConfirmAgent":
            return self

        async def invoke(self, inputs: Any, session: Optional[Session] = None) -> Any:
            ctx = inputs if isinstance(inputs, dict) else {}
            run_id = ctx["run_id"]
            case_id = ctx["case_id"]
            fab = (ctx.get("event") or {}).get("evidence_ids") or ["EV-FAB-TRANSFER"]
            ev = make_event(
                run_id=run_id,
                case_id=case_id,
                node="human_confirm",
                text="approved true",
                evidence_ids=list(fab),
                rule_ids=[],
                extra={"phase": "hitl", "approved": True},
            )
            return {"event": ev, "run_id": run_id, "case_id": case_id}

        async def stream(self, inputs: Any, session: Optional[Session] = None) -> AsyncIterator[Any]:
            yield await self.invoke(inputs, session)

    return FeatureAgent, EvidenceAgent, DefenderAgent, HumanConfirmAgent


async def run_debate(
    *,
    run_id: str,
    case_id: str,
) -> list[dict[str, Any]]:
    multi_agent_logger, TeamRuntime, CommunicableAgent, BaseAgent, AgentCard, Session = (
        _import_runtime()
    )
    FeatureAgent, EvidenceAgent, DefenderAgent, HumanConfirmAgent = build_agents(
        CommunicableAgent, BaseAgent, Session
    )

    cards = {
        "feature": AgentCard(id="feature", name="特征官", description="特征抽取/控方"),
        "evidence": AgentCard(id="evidence", name="证据官", description="证据核验"),
        "defender": AgentCard(id="defender", name="反方官", description="反方质证"),
        "human": AgentCard(id="human", name="human_confirm", description="人工确认"),
    }

    runtime = TeamRuntime()
    runtime.register_agent(cards["feature"], lambda: FeatureAgent(card=cards["feature"]))
    runtime.register_agent(cards["evidence"], lambda: EvidenceAgent(card=cards["evidence"]))
    runtime.register_agent(cards["defender"], lambda: DefenderAgent(card=cards["defender"]))
    runtime.register_agent(cards["human"], lambda: HumanConfirmAgent(card=cards["human"]))
    await runtime.start()

    events: list[dict[str, Any]] = []
    try:
        multi_agent_logger.info("=" * 55)
        multi_agent_logger.info("TeamRuntime platform debate (deterministic, no LLM)")
        multi_agent_logger.info("转账前保镖 · SCHEMA events · NOT SwarmFlow")
        multi_agent_logger.info("=" * 55)

        # 1) 特征官
        r1 = await runtime.send(
            message={"run_id": run_id, "case_id": case_id, "phase": "feature"},
            recipient="feature",
            sender="user",
        )
        events.append(r1["event"])
        multi_agent_logger.info(f"[特征官] {r1['event']['text']}")

        # 2) 证据官
        r2 = await runtime.send(
            message={**r1, "run_id": run_id, "case_id": case_id},
            recipient="evidence",
            sender="feature",
        )
        events.append(r2["event"])
        multi_agent_logger.info(f"[证据官] {r2['event']['text']}")

        # 3) 反方官
        r3 = await runtime.send(
            message={"run_id": run_id, "case_id": case_id},
            recipient="defender",
            sender="evidence",
        )
        events.append(r3["event"])
        multi_agent_logger.info(f"[反方官] {r3['event']['text']}")

        # 4) 特征官编造
        r4 = await runtime.send(
            message={"run_id": run_id, "case_id": case_id, "phase": "fabricate"},
            recipient="feature",
            sender="defender",
        )
        events.append(r4["event"])
        multi_agent_logger.info(f"[特征官/编造] {r4['event']['text']}")

        # 5) human_confirm 错误放行
        r5 = await runtime.send(
            message={**r4, "run_id": run_id, "case_id": case_id},
            recipient="human",
            sender="feature",
        )
        events.append(r5["event"])
        multi_agent_logger.info(f"[human_confirm] {r5['event']['text']}")

        multi_agent_logger.info(f"debate done events={len(events)}")
    finally:
        await runtime.stop()

    return events


def write_ungated_payload(
    *,
    run_id: str,
    case_id: str,
    events: list[dict[str, Any]],
    out_path: Path,
) -> dict[str, Any]:
    payload = {
        "run_id": run_id,
        "case_id": case_id,
        "generated_at": now_iso(),
        "mode": "teamruntime_scripted_debate",
        "warning": (
            "TeamRuntime CommunicableAgent deterministic smoke — "
            "NOT openJiuwen SwarmFlow e2e. See REPORT.md."
        ),
        "events": events,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


async def main_async(
    *,
    case_id: str,
    out_path: Path,
) -> dict[str, Any]:
    _bootstrap_openjiuwen()
    run_id = "run-platform-" + datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")
    events = await run_debate(run_id=run_id, case_id=case_id)
    return write_ungated_payload(
        run_id=run_id, case_id=case_id, events=events, out_path=out_path
    )


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(SPIKE_DIR / "events-platform.json"))
    ap.add_argument("--case-id", default="CASE-SPIKE-FAB-001")
    args = ap.parse_args()
    payload = asyncio.run(main_async(case_id=args.case_id, out_path=Path(args.out)))
    print(f"wrote {args.out} run_id={payload['run_id']} events={len(payload['events'])}")
