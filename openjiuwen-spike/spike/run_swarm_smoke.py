#!/usr/bin/env python3
# coding: utf-8
"""SwarmFlow smoke with real GLM (OpenAI-compatible).

Modes:
  - direct (default): run_swarmflow + TeamWorkerBackend on mini_theme.py
  - team_mini: enable_swarmflow TeamAgentSpec + mini_theme.py (short, owned)
  - party_failfast / team_failfast: party_planner with phase-gate fail-fast (<<600s)
  - team: official agent_team_swarmflow_e2e.py (party_planner; 600s ceiling; avoid)

Never prints API keys. Exit 0 only on verified PASS.
"""
from __future__ import annotations

import asyncio
import os
import sys
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

SPIKE_DIR = Path(__file__).resolve().parent
AGENT_CORE = SPIKE_DIR.parent / "agent-core"
SCRIPT = SPIKE_DIR / "swarm_scripts" / "mini_theme.py"
SHANGHAI = ZoneInfo("Asia/Shanghai")


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
            max_tokens=400,
        ),
    )
    worker_spec = DeepAgentSpec(
        model=tmc,
        language="cn",
        max_iterations=20,
        enable_task_planning=False,
        restrict_to_sandbox=False,
    )
    return tmc, worker_spec


async def _run_direct(env: dict[str, str]) -> int:
    from openjiuwen.agent_teams.paths import configure_openjiuwen_home
    from openjiuwen.agent_teams.workflow.observer import WorkflowObserver
    from openjiuwen.agent_teams.workflow.runner import run_swarmflow

    home = SPIKE_DIR / "swarm_home"
    home.mkdir(parents=True, exist_ok=True)
    configure_openjiuwen_home(str(home))

    tmc, worker_spec = _build_team_model(env)
    model = tmc.build()
    observer = WorkflowObserver()
    events: list[str] = []

    def log_sink(msg: str) -> None:
        line = f"[swarmflow/log] {msg}"
        events.append(line)
        print(line)

    session_id = f"swarm_mini_{uuid.uuid4().hex[:8]}"
    team_name = "spike_swarm_mini"
    print(f"mode=direct team={team_name} session={session_id}")
    print(f"script={SCRIPT}")
    print(
        f"model={env.get('OPENJIUWEN_LLM_MODEL')} "
        f"base={env.get('OPENJIUWEN_LLM_API_BASE')} api_key=<redacted>"
    )

    result = await run_swarmflow(
        str(SCRIPT),
        model=model,
        observer=observer,
        args="转账前保镖·Swarm冒烟",
        team_name=team_name,
        language="cn",
        log_sink=log_sink,
        worker_base_spec=worker_spec,
        session_id=session_id,
        run_id=f"run_{uuid.uuid4().hex[:10]}",
    )

    run = observer.run
    kinds = []
    if run is not None:
        # walk progress via run structure
        print(f"workflow_result={result!r}")
        print(f"observer.run name={getattr(run, 'name', None)} status={getattr(run, 'status', None)}")
        phases = getattr(run, "phases", None) or []
        print(f"phases={len(phases)}")
        for p in phases:
            title = getattr(p, "title", None) or getattr(p, "name", None) or p
            print(f"  phase={title}")

    # Also dump recorded progress events if available
    rec = getattr(observer, "_events", None) or getattr(observer, "events", None)
    if rec:
        for ev in rec:
            kind = getattr(ev, "kind", None) or (ev.get("kind") if isinstance(ev, dict) else None)
            kinds.append(str(kind))
        print(f"progress_kinds={kinds}")

    # Success criteria: got a structured theme dict from real worker
    ok = isinstance(result, dict) and ("theme" in result or "vibe" in result)
    if not ok and result is not None:
        # some backends may return pydantic model
        theme = getattr(result, "theme", None)
        ok = theme is not None

    if ok:
        print("PASS SwarmFlow direct: mini-theme completed with structured LLM output")
        print(f"PASS_MARKER swarmflow_direct theme={getattr(result, 'theme', None) or (result.get('theme') if isinstance(result, dict) else result)}")
        return 0

    print(f"FAIL SwarmFlow direct: unexpected result={result!r}")
    return 1


async def _run_team_e2e(env: dict[str, str]) -> int:
    """Delegate to official party_planner SwarmFlow e2e."""
    e2e = (
        AGENT_CORE
        / "tests"
        / "system_tests"
        / "agent_swarm"
        / "swarmflow"
        / "agent_team_swarmflow_e2e.py"
    )
    if not e2e.is_file():
        print(f"FAIL missing official e2e: {e2e}")
        return 1

    # Ensure env vars for config_swarmflow.yaml placeholders
    os.environ["API_BASE"] = env["OPENJIUWEN_LLM_API_BASE"]
    os.environ["LEADER_API_KEY"] = env["OPENJIUWEN_LLM_API_KEY"]
    os.environ["TEAMMATE_API_KEY"] = env["OPENJIUWEN_LLM_API_KEY"]
    os.environ["MODEL_NAME"] = env["OPENJIUWEN_LLM_MODEL"]
    os.environ.setdefault("OPENJIUWEN_E2E_MODEL", "glm")

    # Import and run main from e2e (it wires model from config_llm_local.yaml)
    sys.path.insert(0, str(e2e.parent))
    sys.path.insert(0, str(e2e.parent.parent))
    sys.path.insert(0, str(e2e.parent.parent.parent))
    sys.path.insert(0, str(AGENT_CORE))

    import importlib.util

    spec = importlib.util.spec_from_file_location("agent_team_swarmflow_e2e", e2e)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    # Running the module executes top-level setup (logging/chdir wiring)
    spec.loader.exec_module(mod)
    code = await mod.main()
    if code == 0:
        print("PASS SwarmFlow team e2e: party-planner via enable_swarmflow")
    else:
        print(f"FAIL SwarmFlow team e2e exit={code}")
    return int(code)



async def _run_team_mini(env: dict[str, str]) -> int:
    """enable_swarmflow team path with mini_theme.py (1 phase, no human)."""
    import re
    import time
    import uuid
    from pathlib import Path as _Path

    import yaml

    from openjiuwen.agent_teams.paths import configure_openjiuwen_home, workflow_journal_path
    from openjiuwen.agent_teams.schema.blueprint import TeamAgentSpec
    from openjiuwen.core.runner.runner import Runner

    # Wire model env for YAML ${VAR}
    os.environ["API_BASE"] = env["OPENJIUWEN_LLM_API_BASE"]
    os.environ["LEADER_API_KEY"] = env["OPENJIUWEN_LLM_API_KEY"]
    os.environ["TEAMMATE_API_KEY"] = env["OPENJIUWEN_LLM_API_KEY"]
    os.environ["MODEL_NAME"] = env["OPENJIUWEN_LLM_MODEL"]

    cfg_path = SPIKE_DIR / "config_swarmflow_mini.yaml"
    workdir = SPIKE_DIR / "swarm_team_mini_workdir"
    home = SPIKE_DIR / "swarm_team_mini_home"
    workdir.mkdir(parents=True, exist_ok=True)
    home.mkdir(parents=True, exist_ok=True)
    configure_openjiuwen_home(str(home))

    # Script relative to workdir so leader echoes a short path
    script_rel = "../swarm_scripts/mini_theme.py"
    script_abs = (workdir / script_rel).resolve()
    if not script_abs.is_file():
        print(f"FAIL missing script: {script_abs}")
        return 1

    env_re = re.compile(r"\$\{(\w+)}")

    def expand(v):
        if isinstance(v, str):
            return env_re.sub(lambda m: os.environ.get(m.group(1), m.group(0)), v)
        if isinstance(v, dict):
            return {k: expand(x) for k, x in v.items()}
        if isinstance(v, list):
            return [expand(x) for x in v]
        return v

    raw = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))
    cfg = expand(raw)
    cfg.pop("runtime", None)
    spec = TeamAgentSpec.model_validate(cfg)
    if not getattr(spec, "enable_swarmflow", False):
        print("FAIL enable_swarmflow not set on TeamAgentSpec")
        return 1

    session_id = f"team_mini_{uuid.uuid4().hex[:8]}"
    start_deadline_s = 90.0
    run_timeout_s = 180.0
    narration_quiesce_s = 4.0
    narration_max_s = 30.0

    print(f"mode=team_mini team={spec.team_name} session={session_id}")
    print(f"script={script_abs} rel={script_rel}")
    print(
        f"model={env.get('OPENJIUWEN_LLM_MODEL')} "
        f"base={env.get('OPENJIUWEN_LLM_API_BASE')} api_key=<redacted>"
    )
    print(f"enable_swarmflow={spec.enable_swarmflow}")

    class Probe:
        def __init__(self) -> None:
            self.done = asyncio.Event()
            self.started = False
            self.completed = False
            self.failed = False
            self.workflow_name = None
            self.phases: set[str] = set()
            self.logs: list[str] = []
            self.agent_completed: dict[str, int] = {}

        async def drain(self, monitor) -> None:
            async for event in monitor.workflow_events():
                payload = getattr(event, "payload", None) or {}
                kind = payload.get("kind")
                if kind == "workflow_started":
                    self.started = True
                    self.workflow_name = payload.get("workflow_name") or payload.get("name")
                    print(f"[team_mini] workflow_started name={self.workflow_name}")
                elif kind == "phase":
                    phase = payload.get("phase")
                    if phase:
                        self.phases.add(phase)
                        print(f"[team_mini] phase={phase}")
                elif kind == "agent_completed":
                    label = payload.get("label") or "?"
                    self.agent_completed[label] = self.agent_completed.get(label, 0) + 1
                    print(f"[team_mini] agent_completed label={label}")
                elif kind == "log":
                    text = payload.get("text")
                    if text:
                        self.logs.append(text)
                        print(f"[team_mini] log={text}")
                elif kind == "workflow_completed":
                    self.completed = True
                    print("[team_mini] workflow_completed")
                    self.done.set()
                    return
                elif kind == "workflow_failed":
                    self.failed = True
                    print(f"[team_mini] workflow_failed: {payload.get('text')}")
                    self.done.set()
                    return

    probe = Probe()
    prev_cwd = os.getcwd()
    os.chdir(workdir)
    try:
        await Runner.start()
        monitor = None
        drain_task = None
        last_chunk = [0.0]
        watchdog_task = None

        query = (
            "请立即调用 swarmflow 工具运行多 agent 工作流。"
            f'参数: script_path 必须填 "{script_rel}", args 填 "转账前保镖·team_mini"。'
            "只需调用这一个工具，然后等待工作流结果，不要自己拆解或执行其它步骤。"
        )

        async def consume() -> None:
            nonlocal monitor, drain_task, watchdog_task
            async for chunk in Runner.run_agent_team_streaming(
                agent_team=spec,
                inputs={"query": query},
                session=session_id,
            ):
                last_chunk[0] = time.monotonic()
                payload = getattr(chunk, "payload", None)
                ready = (
                    isinstance(payload, dict)
                    and payload.get("event_type") == "team.runtime_ready"
                )
                if ready and monitor is None:
                    monitor = await Runner.get_agent_team_monitor(
                        team_name=spec.team_name,
                        session_id=session_id,
                    )
                    if monitor is not None:
                        await monitor.start()
                        drain_task = asyncio.create_task(probe.drain(monitor))

                        async def _watch() -> None:
                            await asyncio.sleep(start_deadline_s)
                            if not probe.started and not probe.done.is_set():
                                print(
                                    f"[team_mini] no workflow_started within {start_deadline_s}s"
                                )
                                probe.done.set()

                        watchdog_task = asyncio.create_task(_watch())

        consume_task = asyncio.create_task(consume())
        done_task = asyncio.create_task(probe.done.wait())
        try:
            await asyncio.wait(
                {done_task, consume_task},
                timeout=run_timeout_s,
                return_when=asyncio.FIRST_COMPLETED,
            )
            if consume_task.done() and not probe.done.is_set():
                exc = consume_task.exception()
                print(f"[team_mini] leader stream ended early: {exc!r}")
            elif not probe.done.is_set():
                print(f"[team_mini] timed out after {run_timeout_s}s")
            elif probe.completed and not consume_task.done():
                last_chunk[0] = time.monotonic()
                deadline = time.monotonic() + narration_max_s
                while time.monotonic() < deadline and not consume_task.done():
                    if time.monotonic() - last_chunk[0] >= narration_quiesce_s:
                        break
                    await asyncio.sleep(0.4)
        finally:
            done_task.cancel()
            if watchdog_task is not None:
                watchdog_task.cancel()
                try:
                    await watchdog_task
                except asyncio.CancelledError:
                    pass
            if monitor is not None:
                await monitor.stop()
            if drain_task is not None:
                drain_task.cancel()
                try:
                    await drain_task
                except asyncio.CancelledError:
                    pass
            if not consume_task.done():
                consume_task.cancel()
                try:
                    await consume_task
                except asyncio.CancelledError:
                    pass
            await Runner.stop()
    finally:
        os.chdir(prev_cwd)

    # Structured result evidence from script log line
    theme_hit = any("theme_result=" in x and "theme" in x for x in probe.logs)
    print(
        f"probe started={probe.started} completed={probe.completed} failed={probe.failed} "
        f"name={probe.workflow_name} phases={sorted(probe.phases)} "
        f"agents={probe.agent_completed} theme_hit={theme_hit}"
    )

    ok = (
        probe.started
        and probe.completed
        and not probe.failed
        and probe.workflow_name == "mini-theme"
        and "构思" in probe.phases
        and theme_hit
    )
    if ok:
        print("PASS SwarmFlow team_mini: enable_swarmflow + mini-theme completed")
        print("PASS_MARKER swarmflow_team_mini")
        return 0

    print("FAIL SwarmFlow team_mini verification")
    return 1



def main() -> int:
    mode = (os.environ.get("SWARM_SMOKE_MODE") or "direct").strip().lower()
    secrets: list[str] = []
    try:
        env = _load_model_env()
        secrets.append(env.get("OPENJIUWEN_LLM_API_KEY", ""))
        _bootstrap()
        print(f"=== SwarmFlow smoke mode={mode} ts={_ts()} Asia/Shanghai ===")
        if mode in ("team_mini", "mini_team"):
            return asyncio.run(_run_team_mini(env))
        if mode in ("party_failfast", "team_failfast", "failfast", "party_ff"):
            # Delegate to dedicated phase-gate script (tees its own log).
            import run_swarm_party_failfast as _pff
            return int(_pff.main())
        if mode in ("team", "e2e", "full", "official"):
            return asyncio.run(_run_team_e2e(env))
        return asyncio.run(_run_direct(env))
    except Exception as e:
        msg = _redact(f"FAIL SwarmFlow smoke: {type(e).__name__}: {e}", secrets)
        print(msg)
        print(_redact(traceback.format_exc(), secrets))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
