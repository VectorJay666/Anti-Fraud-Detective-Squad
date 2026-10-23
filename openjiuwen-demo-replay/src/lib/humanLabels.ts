import type { Dossier, RulesDoc } from "../types";

/** Hardcoded fallbacks — teaching 三案 + LIVE + 常见编造编号 */
const EVIDENCE_FALLBACK: Record<string, string> = {
  "EV-001": "催转账话术",
  "EV-002": "限时压迫",
  "EV-RL-001": "熟人急借·换卡",
  "EV-RL-002": "医院借口",
  "EV-RL-003": "限时催转",
  "EV-BO-001": "刷单垫资",
  "EV-BO-002": "返利群诱导",
  "EV-BO-003": "加码返本",
  "EV-FAB-TRANSFER": "编造·转账记录",
  "EV-LIVE-001": "现场摘录·催转",
  "EV-LIVE-002": "现场摘录·限时",
  "EV-LIVE-003": "现场摘录·身份",
};

const RULE_FALLBACK: Record<string, string> = {
  "R-01": "规则：催转话术",
  "R-02": "规则：证据必须可核",
  "R-03": "规则：垫资返利/刷单",
  "R-99": "编造·未知条款",
};

const evidenceMap = new Map<string, string>(Object.entries(EVIDENCE_FALLBACK));
const ruleMap = new Map<string, string>(Object.entries(RULE_FALLBACK));

function shortFromEvidenceText(text: string): string {
  const t = text.trim();
  if (!t) return "";
  if (/账户异常|安全账户|银行客服/.test(t)) return "催转账话术";
  if (/10\s*分钟|限时|立刻|马上/.test(t)) return "限时压迫";
  if (/刷单|垫/.test(t)) return "刷单垫资";
  if (/返利群|加群/.test(t)) return "返利群诱导";
  if (/返本|金牌代理|加码/.test(t)) return "加码返本";
  if (/医院|急借|换了张新卡|先转/.test(t)) return "熟人急借";
  // keep short: first ~10 chars
  return t.length > 12 ? `${t.slice(0, 12)}…` : t;
}

/** Optional: enrich maps from dossier + rules (boot path). */
export function hydrateHumanLabels(dossier: Dossier, rules: RulesDoc): void {
  for (const e of dossier.evidence || []) {
    if (!e?.id) continue;
    if (evidenceMap.has(e.id)) continue;
    const fromText =
      typeof e.text === "string" ? shortFromEvidenceText(e.text) : "";
    if (fromText) evidenceMap.set(e.id, fromText);
    else if (e.type === "chat_snippet")
      evidenceMap.set(e.id, `聊天摘录 · ${e.id}`);
  }
  for (const r of rules.rules || []) {
    if (!r?.id) continue;
    if (ruleMap.has(r.id)) continue;
    if (typeof r.title === "string" && r.title.trim()) {
      ruleMap.set(r.id, `规则：${r.title.trim()}`);
    }
  }
}

export function evidenceLabel(id: string): string {
  const hit = evidenceMap.get(id);
  if (hit) return hit;
  if (id.startsWith("EV-LIVE-")) return `现场摘录 · ${id.replace(/^EV-LIVE-/, "")}`;
  if (id.startsWith("EV-RL-")) return `熟人急借 · ${id}`;
  if (id.startsWith("EV-BO-")) return `刷单返利 · ${id}`;
  if (id.startsWith("EV-FAB")) return `编造 · ${id}`;
  return `证据 · ${id}`;
}

export function ruleLabel(id: string): string {
  const hit = ruleMap.get(id);
  if (hit) return hit;
  return `规则 · ${id}`;
}

export function humanLabel(id: string, kind: "evidence" | "rule"): string {
  return kind === "evidence" ? evidenceLabel(id) : ruleLabel(id);
}
