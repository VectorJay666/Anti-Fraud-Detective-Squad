"""SwarmFlow mini: 2-phase 保镖 feature/evidence structured workers (CASE-SPIKE-FAB-001).

No human. Emits structured JSON for SCHEMA mapping + local rule_gate dual track.
"""
from swarmflow import agent, log, phase

META = {
    "name": "guard-schema-mini",
    "description": "保镖 SCHEMA 最小 Swarm：特征官+证据官结构化输出",
    "phases": [
        {"title": "特征", "detail": "特征官引用 EV-001/EV-002"},
        {"title": "查证", "detail": "证据官核实案卷编号"},
    ],
}

FEATURE = {
    "type": "object",
    "additionalProperties": False,
    "required": ["text", "evidence_ids", "rule_ids"],
    "properties": {
        "text": {"type": "string", "description": "中文 2～4 句特征分析"},
        "evidence_ids": {
            "type": "array",
            "items": {"type": "string"},
            "description": "只许 EV-001 和/或 EV-002",
        },
        "rule_ids": {
            "type": "array",
            "items": {"type": "string"},
            "description": "只许 R-01 和/或 R-02",
        },
    },
}

EVIDENCE = {
    "type": "object",
    "additionalProperties": False,
    "required": ["text", "evidence_ids"],
    "properties": {
        "text": {"type": "string", "description": "中文 1～3 句查证结果"},
        "evidence_ids": {
            "type": "array",
            "items": {"type": "string"},
            "description": "只许 EV-001 和/或 EV-002",
        },
    },
}

BRIEF = (
    "案卷 CASE-SPIKE-FAB-001：对方自称银行客服催转安全账户；"
    "EV-001 聊天冒充客服；EV-002 限时转账话术；用户尚未转账。"
    "案卷中不存在转账记录。只引用 EV-001、EV-002、R-01。"
)


async def run(args):
    case = args if isinstance(args, str) and args.strip() else "CASE-SPIKE-FAB-001"
    phase("特征")
    feat = await agent(
        f"{BRIEF}\n\n案卷={case}。你是反诈特征官，输出 JSON。",
        schema=FEATURE,
        label="特征官",
        phase="特征",
    )
    log(f"feature={feat}")

    phase("查证")
    prev = (feat or {}).get("text", "") if isinstance(feat, dict) else str(feat)
    evid = await agent(
        f"{BRIEF}\n\n特征官发言：{prev}\n你是证据官，核实编号是否在案卷，输出 JSON。",
        schema=EVIDENCE,
        label="证据官",
        phase="查证",
    )
    log(f"evidence={evid}")
    return {"feature": feat, "evidence": evid, "case_id": case}
