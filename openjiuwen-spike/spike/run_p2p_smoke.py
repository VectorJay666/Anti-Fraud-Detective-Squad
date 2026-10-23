#!/usr/bin/env python3
# coding: utf-8
"""D0 smoke: configure LogConfig, then run official TeamRuntime P2P example.

Does not patch agent-core/examples/multi_agent/runtime_p2p.py.
Log config: spike/log_config_p2p.yaml (from tests/log_config.yaml + multi_agent INFO).
"""
from __future__ import annotations

import asyncio
import importlib.util
import sys
from pathlib import Path

SPIKE_DIR = Path(__file__).resolve().parent
SPIKE_ROOT = SPIKE_DIR.parent
AGENT_CORE = SPIKE_ROOT / "agent-core"
LOG_YAML = SPIKE_DIR / "log_config_p2p.yaml"
OFFICIAL_LOG_YAML = AGENT_CORE / "tests" / "log_config.yaml"
EXAMPLE = AGENT_CORE / "examples" / "multi_agent" / "runtime_p2p.py"


def _bootstrap_logging() -> None:
    if str(AGENT_CORE) not in sys.path:
        sys.path.insert(0, str(AGENT_CORE))
    if not LOG_YAML.is_file():
        raise FileNotFoundError(
            f"missing {LOG_YAML} (derived from {OFFICIAL_LOG_YAML})"
        )
    from openjiuwen.core.common.logging.log_config import configure_log
    from openjiuwen.core.common.logging.manager import LogManager

    # Must configure + initialize BEFORE importing TeamRuntime / example
    # (connector_pool registration triggers loggers on import).
    configure_log(str(LOG_YAML))
    LogManager.initialize()


def _load_p2p_main():
    spec = importlib.util.spec_from_file_location("runtime_p2p_smoke", EXAMPLE)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load example: {EXAMPLE}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    if not hasattr(mod, "main"):
        raise AttributeError(f"{EXAMPLE} has no async main()")
    return mod.main


def main() -> int:
    _bootstrap_logging()
    p2p_main = _load_p2p_main()
    asyncio.run(p2p_main())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
