# coding: utf-8
"""Demo / live port contract.

Defaults stay 5174 (Vite) and 5180 (live_server). Shell variables win.
Missing keys are filled from spike/.env, then openjiuwen-demo-replay/.env.
Already-set variables are left alone. Only port-related keys are read.
"""
from __future__ import annotations

import os
from pathlib import Path

SPIKE_DIR = Path(__file__).resolve().parent
DEMO_DIR = SPIKE_DIR.parent.parent / "openjiuwen-demo-replay"

PORT_KEYS = frozenset(
    {
        "OPENJIUWEN_DEMO_PORT",
        "OPENJIUWEN_LIVE_PORT",
        "OPENJIUWEN_LIVE_HOST",
        "OPENJIUWEN_LIVE_CORS",
        "OPENJIUWEN_LIVE_BASE",
        "VITE_LIVE_BASE",
    }
)

_loaded = False


def load_port_files() -> None:
    global _loaded
    if _loaded:
        return
    _loaded = True
    for path in (SPIKE_DIR / ".env", DEMO_DIR / ".env"):
        _fill(path)


def _fill(path: Path) -> None:
    if not path.is_file():
        return
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        if key not in PORT_KEYS or key in os.environ:
            continue
        os.environ[key] = val.strip().strip('"').strip("'")


def tcp_port(name: str, default: int) -> int:
    load_port_files()
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        port = int(raw)
    except ValueError:
        raise SystemExit(f"{name} must be an integer TCP port, got {raw!r}") from None
    if not 1 <= port <= 65535:
        raise SystemExit(f"{name} must be from 1 to 65535, got {port}")
    return port


def live_host() -> str:
    load_port_files()
    return os.environ.get("OPENJIUWEN_LIVE_HOST", "127.0.0.1").strip() or "127.0.0.1"


def live_port() -> int:
    return tcp_port("OPENJIUWEN_LIVE_PORT", 5180)


def demo_port() -> int:
    return tcp_port("OPENJIUWEN_DEMO_PORT", 5174)


def demo_origin() -> str:
    """Browser origin of the Vite app. No trailing slash."""
    return f"http://127.0.0.1:{demo_port()}"


def cors_origin() -> str:
    load_port_files()
    explicit = os.environ.get("OPENJIUWEN_LIVE_CORS", "").strip()
    if explicit:
        return explicit.rstrip("/")
    return demo_origin()


def live_bind_url() -> str:
    """Where this live_server process listens. No trailing slash."""
    return f"http://{live_host()}:{live_port()}"


def live_base() -> str:
    """Where clients send live/swarm requests. OPENJIUWEN_LIVE_BASE overrides."""
    load_port_files()
    explicit = os.environ.get("OPENJIUWEN_LIVE_BASE", "").strip()
    if explicit:
        return explicit.rstrip("/")
    return live_bind_url()
