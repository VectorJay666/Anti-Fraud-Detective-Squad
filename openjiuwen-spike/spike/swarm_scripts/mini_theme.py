"""Minimal SwarmFlow script: one structured agent() call (no human).

Used by spike/run_swarm_smoke.py to prove TeamWorkerBackend + real GLM.
"""
from swarmflow import agent, log, phase

META = {
    "name": "mini-theme",
    "description": "Minimal SwarmFlow smoke: one agent structured output",
    "phases": [
        {"title": "构思", "detail": "无状态 agent 输出主题 JSON"},
    ],
}

THEME = {
    "type": "object",
    "additionalProperties": False,
    "required": ["theme", "vibe"],
    "properties": {
        "theme": {"type": "string", "description": "主题名"},
        "vibe": {"type": "string", "description": "一句话氛围"},
    },
}


async def run(args):
    topic = args if isinstance(args, str) and args.strip() else "转账前保镖演示"
    phase("构思")
    result = await agent(
        f"为「{topic}」起一个派对/演示主题名，并写一句氛围。只用中文，简洁。",
        schema=THEME,
        label="主题官",
        phase="构思",
    )
    log(f"theme_result={result}")
    return result
