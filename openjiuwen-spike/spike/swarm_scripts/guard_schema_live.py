"""SwarmFlow live 保镖: feature/evidence/risk/compliance/protect on user transcript.

Args: JSON string {"case_id","brief"} or plain brief text.
Only cite EV-LIVE-001 (现场粘贴会话). No human. No EV-FAB inject.
"""
from swarmflow import agent, log, phase
import json

META = {
    "name": "guard-schema-live",
    "description": "实际层 Swarm 保镖：特征/证据/风险/合规/用户保护，仅 EV-LIVE-001",
    "phases": [
        {"title": "特征", "detail": "特征官只引用 EV-LIVE-001"},
        {"title": "查证", "detail": "证据官核实案卷编号"},
        {"title": "风险", "detail": "风险官评估是否拦转"},
        {"title": "合规", "detail": "合规官核对条款与定罪把握"},
        {"title": "保护", "detail": "用户保护官给出可执行清单"},
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
            "description": "只许 EV-LIVE-001；无把握可空数组",
        },
        "rule_ids": {
            "type": "array",
            "items": {"type": "string"},
            "description": "只许 R-01 和/或 R-02；可空",
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
            "description": "只许 EV-LIVE-001；核实不到可空数组",
        },
    },
}

RISK = {
    "type": "object",
    "additionalProperties": False,
    "required": ["text", "evidence_ids"],
    "properties": {
        "text": {
            "type": "string",
            "description": "中文 2～4 句：风险等级与是否建议拦转/先别转；只依据 EV-LIVE-001",
        },
        "evidence_ids": {
            "type": "array",
            "items": {"type": "string"},
            "description": "只许 EV-LIVE-001；无把握可空",
        },
    },
}

COMPLIANCE = {
    "type": "object",
    "additionalProperties": False,
    "required": ["text", "evidence_ids", "rule_ids"],
    "properties": {
        "text": {
            "type": "string",
            "description": "中文 2～4 句：条款核对、证据是否足以定罪；空证据必须明确拒绝定罪",
        },
        "evidence_ids": {
            "type": "array",
            "items": {"type": "string"},
            "description": "只许 EV-LIVE-001；空证据时必须空数组",
        },
        "rule_ids": {
            "type": "array",
            "items": {"type": "string"},
            "description": "只许 R-01 和/或 R-02；可空",
        },
    },
}

PROTECT = {
    "type": "object",
    "additionalProperties": False,
    "required": ["text", "evidence_ids"],
    "properties": {
        "text": {
            "type": "string",
            "description": "中文 3～5 句可执行清单：先别转、官方渠道核实、保留聊天记录等，语气面向用户",
        },
        "evidence_ids": {
            "type": "array",
            "items": {"type": "string"},
            "description": "只许 EV-LIVE-001；可空",
        },
    },
}


def _parse_args(args):
    case_id = "LIVE-SWARM"
    brief = ""
    if isinstance(args, dict):
        case_id = str(args.get("case_id") or case_id)
        brief = str(args.get("brief") or "")
    elif isinstance(args, str) and args.strip():
        raw = args.strip()
        if raw.startswith("{"):
            try:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    case_id = str(obj.get("case_id") or case_id)
                    brief = str(obj.get("brief") or "")
                else:
                    brief = raw
            except Exception:
                brief = raw
        else:
            brief = raw
    if not brief:
        brief = (
            f"案卷 {case_id}：用户粘贴会话待审。"
            "证据仅 EV-LIVE-001。禁止编造其它编号；无证据不得定罪。"
        )
    return case_id, brief


def _text_of(obj) -> str:
    if isinstance(obj, dict):
        return str(obj.get("text") or "")
    return str(obj or "")


async def run(args):
    case_id, brief = _parse_args(args)
    phase("特征")
    feat = await agent(
        f"{brief}\n\n案卷={case_id}。你是反诈特征官，只许引用 EV-LIVE-001，输出 JSON。",
        schema=FEATURE,
        label="特征官",
        phase="特征",
    )
    log(f"feature={feat}")

    phase("查证")
    prev = _text_of(feat)
    evid = await agent(
        f"{brief}\n\n特征官发言：{prev}\n你是证据官，核实编号是否仅为 EV-LIVE-001，输出 JSON。",
        schema=EVIDENCE,
        label="证据官",
        phase="查证",
    )
    log(f"evidence={evid}")

    phase("风险")
    prev_e = _text_of(evid)
    risk = await agent(
        f"{brief}\n\n特征官：{prev}\n证据官：{prev_e}\n"
        "你是风险官：综合前面发言，用中文说明风险等级，并明确是否建议拦转/先别转。"
        "只许引用 EV-LIVE-001；无证据则偏向先别转。输出 JSON。",
        schema=RISK,
        label="风险官",
        phase="风险",
    )
    log(f"risk={risk}")

    phase("合规")
    prev_r = _text_of(risk)
    comp = await agent(
        f"{brief}\n\n特征官：{prev}\n证据官：{prev_e}\n风险官：{prev_r}\n"
        "你是合规官：核对是否命中 R-01/R-02，证据是否足以定罪。"
        "若 evidence_ids 为空或不足以定罪，必须明确拒绝定罪/不得仓促定罪。"
        "只许 EV-LIVE-001 与 R-01/R-02。输出 JSON。",
        schema=COMPLIANCE,
        label="合规官",
        phase="合规",
    )
    log(f"compliance={comp}")

    phase("保护")
    prev_c = _text_of(comp)
    prot = await agent(
        f"{brief}\n\n特征官：{prev}\n证据官：{prev_e}\n风险官：{prev_r}\n合规官：{prev_c}\n"
        "你是用户保护官：给用户可执行清单（先别转、打官方客服核实、勿点陌生链接、"
        "保留聊天记录等）。口语化、可照做。只许 EV-LIVE-001。输出 JSON。",
        schema=PROTECT,
        label="用户保护官",
        phase="保护",
    )
    log(f"protect={prot}")

    return {
        "feature": feat,
        "evidence": evid,
        "risk": risk,
        "compliance": comp,
        "protect": prot,
        "case_id": case_id,
    }
