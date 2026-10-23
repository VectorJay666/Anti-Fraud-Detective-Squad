#!/usr/bin/env python3
# coding: utf-8
"""party_planner phase-gate fail-fast via direct run_swarmflow (no leader LLM).

Why direct: enable_swarmflow team path needs the leader to call swarmflow via
streaming tool-calls; the GLM gateway frequently 500s those (~60s). Direct
``run_swarmflow`` still exercises Party Planner + HITL + workers.

Strategy:
  Required phases: 构思 → 征询嘉宾 → 拟菜单 → 筹备 → 审批 → 邀请函
  HITL: JSON answers matching GUEST_FLAVOR/GUEST_AVOID/APPROVAL; avatar
  short-circuit (local agent-core patch) skips LLM format.
  Idle phase gate + overall cap; PASS_MARKER only when all phases + completed
  + human turns.

Does NOT claim Demo 「已接 Swarm」. Does NOT push GitHub.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

SPIKE_DIR = Path(__file__).resolve().parent
AGENT_CORE = SPIKE_DIR.parent / "agent-core"
SHANGHAI = ZoneInfo("Asia/Shanghai")

REQUIRED_PHASES = ["构思", "征询嘉宾", "拟菜单", "筹备", "审批", "邀请函"]
START_DEADLINE_S = 180.0
PHASE_TIMEOUT_S = 300.0
OVERALL_CAP_S = 900.0


def _ts() -> str:
    return datetime.now(SHANGHAI).strftime("%Y%m%d-%H%M%S")


def _redact(text: str, secrets: list[str]) -> str:
    out = text
    for s in secrets:
        if s and len(s) >= 8:
            out = out.replace(s, "<REDACTED_API_KEY>")
    return out


def _load_model_env() -> dict[str, str]:
    sys.path.insert(0, str(SPIKE_DIR))
    from llm_debate import load_model_env

    return load_model_env()


def _bootstrap() -> None:
    if str(AGENT_CORE) not in sys.path:
        sys.path.insert(0, str(AGENT_CORE))
    from openjiuwen.core.common.logging.log_config import configure_log
    from openjiuwen.core.common.logging.manager import LogManager

    configure_log(str(SPIKE_DIR / "log_config_p2p.yaml"))
    LogManager.initialize()


def _human_answer(prompt: str) -> str:
    """Schema-shaped JSON so avatar can skip LLM format (local patch)."""
    if "忌口" in prompt or "过敏" in prompt:
        return json.dumps({"avoid": "无"}, ensure_ascii=False)
    if "口味" in prompt or "蛋糕" in prompt:
        return json.dumps({"flavor": "巧克力"}, ensure_ascii=False)
    if "批准" in prompt or "方案" in prompt or "签核" in prompt:
        return json.dumps({"approved": True, "note": "同意并批准"}, ensure_ascii=False)
    return "好的,没问题"


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
            verify_ssl=False,
            timeout=120.0,
        ),
        model_request_config=ModelRequestConfig(
            model=env["OPENJIUWEN_LLM_MODEL"],
            temperature=0.2,
            max_tokens=1200,
        ),
    )
    worker_spec = DeepAgentSpec(
        model=tmc,
        language="cn",
        max_iterations=12,
        enable_task_planning=False,
        restrict_to_sandbox=False,
        completion_timeout=180.0,
        enable_sys_operation=False,
        tools=None,
    )
    return tmc, worker_spec


def _scan_fs_locks(paths: list[Path]) -> list[str]:
    hits: list[str] = []
    for p in paths:
        if not p.is_file():
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for line in text.splitlines():
            if "Cannot close an active file lock" not in line and "active file lock" not in line:
                continue
            short = line[:280] + ("…" if len(line) > 280 else "")
            hits.append(f"{p.name}:{short}")
            if len(hits) >= 8:
                return hits
    return hits


async def _run_party_failfast(env: dict[str, str], log_path: Path) -> int:
    os.environ["SPIKE_LLM_FORCE_NONSTREAM"] = "1"
    from openjiuwen.agent_teams.paths import configure_openjiuwen_home
    from openjiuwen.agent_teams.workflow.engine.progress import ProgressKind
    from openjiuwen.agent_teams.workflow.observer import WorkflowObserver
    from openjiuwen.agent_teams.workflow.runner import run_swarmflow

    resources = SPIKE_DIR / "swarm_party_resources"
    script = resources / "party_planner.py"
    if not script.is_file():
        print(f"FAIL missing script: {script}")
        return 1

    workdir = SPIKE_DIR / "swarm_party_failfast_workdir"
    home = SPIKE_DIR / "swarm_party_failfast_home"
    workdir.mkdir(parents=True, exist_ok=True)
    home.mkdir(parents=True, exist_ok=True)
    (workdir / "logs").mkdir(parents=True, exist_ok=True)
    configure_openjiuwen_home(str(home))

    tmc, worker_spec = _build_team_model(env)
    model = tmc.build()
    session_id = f"party_ff_{uuid.uuid4().hex[:8]}"
    run_id = f"wf_{uuid.uuid4().hex[:10]}"
    team_name = "spike_swarm_party_failfast"
    t0 = time.monotonic()

    print(f"mode=party_failfast_direct team={team_name} session={session_id} run_id={run_id}")
    print(f"script={script}")
    print(
        f"model={env.get('OPENJIUWEN_LLM_MODEL')} "
        f"base={env.get('OPENJIUWEN_LLM_API_BASE')} api_key=<redacted>"
    )
    print(
        f"phase_gate REQUIRED={REQUIRED_PHASES} "
        f"START_DEADLINE_S={START_DEADLINE_S} "
        f"PHASE_TIMEOUT_S={PHASE_TIMEOUT_S} "
        f"OVERALL_CAP_S={OVERALL_CAP_S}"
    )
    print(f"home={home} workdir={workdir}")
    print(f"log_path={log_path}")

    class Probe:
        def __init__(self) -> None:
            self.done = asyncio.Event()
            self.started = False
            self.completed = False
            self.failed = False
            self.workflow_name = None
            self.phases: set[str] = set()
            self.phase_order: list[str] = []
            self.human_prompts = 0
            self.human_replies = 0
            self.last_progress = time.monotonic()
            self.root_cause: str | None = None
            self.fail_kind: str | None = None
            self.result = None
            self.backend = None

        def _bump(self) -> None:
            self.last_progress = time.monotonic()

    probe = Probe()
    loop = asyncio.get_running_loop()
    base_observer = WorkflowObserver()

    def on_backend_ready(backend) -> None:
        probe.backend = backend
        print("[party_ff] backend ready")

    def emit_and_handle(event) -> None:
        base_observer.emit(event)
        kind = getattr(event, "kind", None)
        if kind == ProgressKind.WORKFLOW_STARTED:
            probe.started = True
            probe.workflow_name = getattr(event, "name", None) or getattr(event, "workflow_name", None)
            probe._bump()
            print(f"[party_ff] workflow_started name={probe.workflow_name}")
        elif kind == ProgressKind.PHASE:
            phase = getattr(event, "phase", None)
            if phase and phase not in probe.phases:
                probe.phases.add(phase)
                probe.phase_order.append(phase)
                probe._bump()
                print(f"[party_ff] phase={phase}")
        elif kind == ProgressKind.HUMAN_PROMPT:
            corr = getattr(event, "correlation_id", None)
            prompt = getattr(event, "prompt", None) or ""
            label = getattr(event, "label", None)
            if not corr:
                print("[party_ff] human_prompt without correlation_id")
                return
            probe.human_prompts += 1
            answer = _human_answer(prompt)
            print(f"[party_ff] human '{label}' corr={corr} -> {answer}")
            backend = probe.backend
            if backend is None:
                print("[party_ff] human reply: backend not ready")
                return

            def _submit() -> None:
                try:
                    ok = backend._sessions().submit_human_reply(corr, answer)
                    print(f"[party_ff] submit_human_reply ok={ok}")
                    if ok:
                        probe._bump()
                except Exception as exc:  # noqa: BLE001
                    print(f"[party_ff] submit_human_reply failed: {type(exc).__name__}: {exc}")

            # submit from event loop ASAP without blocking emit
            loop.call_soon(_submit)
        elif kind == ProgressKind.HUMAN_REPLIED:
            probe.human_replies += 1
            probe._bump()
            print(f"[party_ff] human_replied total={probe.human_replies}")
        elif kind == ProgressKind.WORKFLOW_COMPLETED:
            probe.completed = True
            probe._bump()
            print("[party_ff] workflow_completed")
            probe.done.set()
        elif kind == ProgressKind.WORKFLOW_FAILED:
            probe.failed = True
            probe.root_cause = f"workflow_failed: {getattr(event, 'message', None) or getattr(event, 'text', None)}"
            probe.fail_kind = "workflow"
            print(f"[party_ff] workflow_failed: {probe.root_cause}")
            probe.done.set()

    class _SinkObserver:
        def emit(self, event) -> None:
            emit_and_handle(event)

        @property
        def run(self):
            return base_observer.run

    observer = _SinkObserver()

    async def phase_gate() -> None:
        deadline = time.monotonic() + START_DEADLINE_S
        while not probe.started and not probe.done.is_set():
            if time.monotonic() >= deadline:
                probe.root_cause = (
                    f"no workflow_started within {START_DEADLINE_S}s "
                    "(direct run_swarmflow did not start)"
                )
                probe.fail_kind = "start"
                print(f"[party_ff] FAIL_GATE start: {probe.root_cause}")
                probe.done.set()
                return
            await asyncio.sleep(0.4)

        for phase_name in REQUIRED_PHASES:
            if probe.done.is_set():
                return
            if phase_name in probe.phases:
                continue
            while phase_name not in probe.phases and not probe.done.is_set():
                if probe.completed or probe.failed:
                    return
                idle = time.monotonic() - probe.last_progress
                if idle >= PHASE_TIMEOUT_S:
                    seen = list(probe.phase_order)
                    missing = [p for p in REQUIRED_PHASES if p not in probe.phases]
                    probe.root_cause = (
                        f"phase_gate idle {idle:.1f}s waiting for '{phase_name}' "
                        f"(limit {PHASE_TIMEOUT_S}s); "
                        f"seen={seen}; missing={missing}; "
                        f"humans={probe.human_prompts}/{probe.human_replies}"
                    )
                    probe.fail_kind = "phase"
                    print(f"[party_ff] FAIL_GATE phase: {probe.root_cause}")
                    probe.done.set()
                    return
                await asyncio.sleep(0.4)

        while not probe.done.is_set():
            if probe.completed or probe.failed:
                return
            if time.monotonic() - t0 >= OVERALL_CAP_S:
                missing = [p for p in REQUIRED_PHASES if p not in probe.phases]
                probe.root_cause = (
                    f"overall_cap {OVERALL_CAP_S}s hit before workflow_completed; "
                    f"phases_seen={list(probe.phase_order)}; missing={missing}"
                )
                probe.fail_kind = "overall"
                print(f"[party_ff] FAIL_GATE overall: {probe.root_cause}")
                probe.done.set()
                return
            await asyncio.sleep(0.5)

    def log_sink(msg: str) -> None:
        print(f"[party_ff] log={msg}")
        probe._bump()

    prev_cwd = os.getcwd()
    os.chdir(workdir)
    gate_task = asyncio.create_task(phase_gate())
    run_task = asyncio.create_task(
        run_swarmflow(
            str(script),
            model=model,
            observer=observer,
            args="小明的生日",
            team_name=team_name,
            language="cn",
            log_sink=log_sink,
            worker_base_spec=worker_spec,
            human_base_spec=worker_spec,
            session_id=session_id,
            run_id=run_id,
            on_backend_ready=on_backend_ready,
        )
    )
    try:
        done_task = asyncio.create_task(probe.done.wait())
        await asyncio.wait(
            {done_task, run_task, gate_task},
            timeout=OVERALL_CAP_S,
            return_when=asyncio.FIRST_COMPLETED,
        )
        if run_task.done():
            try:
                probe.result = run_task.result()
                print(f"[party_ff] run_swarmflow returned: {probe.result!r}"[:500])
                if not probe.done.is_set():
                    if probe.failed:
                        probe.done.set()
                    elif probe.completed or (
                        probe.started and not [p for p in REQUIRED_PHASES if p not in probe.phases]
                    ):
                        # completed event may race; treat clean return as done
                        probe.completed = True
                        probe.done.set()
                    else:
                        probe.root_cause = (
                            f"run_swarmflow returned early without all phases; "
                            f"seen={list(probe.phase_order)}; result={probe.result!r}"
                        )
                        probe.fail_kind = "workflow"
                        probe.done.set()
            except Exception as exc:  # noqa: BLE001
                probe.root_cause = f"run_swarmflow exception: {type(exc).__name__}: {exc}"
                probe.fail_kind = "workflow"
                probe.failed = True
                print(f"[party_ff] run_swarmflow ERROR: {probe.root_cause}")
                probe.done.set()
        elif not probe.done.is_set():
            missing = [p for p in REQUIRED_PHASES if p not in probe.phases]
            probe.root_cause = (
                f"overall_cap {OVERALL_CAP_S}s (asyncio.wait) before done; "
                f"seen={list(probe.phase_order)}; missing={missing}"
            )
            probe.fail_kind = "overall"
            print(f"[party_ff] FAIL_GATE wait: {probe.root_cause}")
            probe.done.set()
    finally:
        gate_task.cancel()
        try:
            await gate_task
        except asyncio.CancelledError:
            pass
        if not run_task.done():
            run_task.cancel()
            try:
                await run_task
            except asyncio.CancelledError:
                pass
            except Exception:  # noqa: BLE001
                pass
        os.chdir(prev_cwd)

    wall = time.monotonic() - t0
    print(f"wall_time_s={wall:.1f}")

    fs_hits = _scan_fs_locks(
        [log_path, workdir / "logs" / "jiuwen_details.log", home / "logs" / "jiuwen_details.log"]
    )
    if fs_hits:
        print(f"fs_lock_hits={len(fs_hits)}")
        for h in fs_hits[:5]:
            print(f"  FS_LOCK {h}")

    missing = [p for p in REQUIRED_PHASES if p not in probe.phases]
    print(
        f"probe started={probe.started} completed={probe.completed} failed={probe.failed} "
        f"name={probe.workflow_name} phases={probe.phase_order} "
        f"missing={missing} humans={probe.human_prompts}/{probe.human_replies}"
    )

    ok = (
        probe.started
        and probe.completed
        and not probe.failed
        and not missing
        and probe.human_prompts > 0
        and probe.human_replies > 0
        and probe.root_cause is None
    )
    # name check: party-planner META name
    if ok and probe.workflow_name and probe.workflow_name != "party-planner":
        print(f"WARN workflow_name={probe.workflow_name} (expected party-planner)")

    if ok:
        print("PASS party_planner phase-gate fail-fast: all required phases + completed")
        print("PASS_MARKER swarmflow_party_failfast")
        print("NOTE materials still 禁写「已接 Swarm」; full e2e 600s path not claimed")
        return 0

    rc = probe.root_cause
    if rc is None:
        if missing:
            rc = f"verification missing phases: {missing}; seen={probe.phase_order}"
        elif not probe.completed:
            rc = f"workflow did not complete; seen={probe.phase_order}; failed={probe.failed}"
        else:
            rc = "verification failed (human/completed checks)"
        probe.fail_kind = probe.fail_kind or "verify"
    if fs_hits:
        rc = rc + f"; FS_LOCK_ERRORS={len(fs_hits)}"
    print("FAIL_MARKER swarmflow_party_failfast")
    print(f"ROOT_CAUSE={rc}")
    print(f"fail_kind={probe.fail_kind} wall_time_s={wall:.1f}")
    return 1


class _Tee:
    def __init__(self, *streams):
        self.streams = streams

    def write(self, data):
        for s in self.streams:
            s.write(data)
            s.flush()

    def flush(self):
        for s in self.streams:
            s.flush()


def main() -> int:
    secrets: list[str] = []
    stamp = _ts()
    log_path = SPIKE_DIR / "logs" / f"run-swarm-party-failfast-{stamp}.log"
    SPIKE_DIR.joinpath("logs").mkdir(exist_ok=True)
    log_f = log_path.open("w", encoding="utf-8")
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout = _Tee(old_out, log_f)
    sys.stderr = _Tee(old_err, log_f)
    try:
        env = _load_model_env()
        secrets.append(env.get("OPENJIUWEN_LLM_API_KEY", ""))
        _bootstrap()
        print(f"=== SwarmFlow party_failfast ts={stamp} Asia/Shanghai ===")
        code = asyncio.run(_run_party_failfast(env, log_path))
        print(f"=== smoke exit={code} log={log_path} ===")
        return code
    except Exception as e:
        print(_redact(f"FAIL party_failfast: {type(e).__name__}: {e}", secrets))
        print(_redact(traceback.format_exc(), secrets))
        print("FAIL_MARKER swarmflow_party_failfast")
        print(f"ROOT_CAUSE=exception {type(e).__name__}: {e}")
        return 1
    finally:
        sys.stdout = old_out
        sys.stderr = old_err
        log_f.close()
        print(f"wrote {log_path}")


if __name__ == "__main__":
    raise SystemExit(main())
