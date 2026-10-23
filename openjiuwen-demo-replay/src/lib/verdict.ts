import type { DebateEvent, PayloadMeta, SideVerdict } from "../types";

function asStringList(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string");
  return out.length ? out : undefined;
}

/** Teaching dual-column banners (replay / teaching dual-track live). */
export function sideVerdict(
  side: "left" | "right",
  events: DebateEvent[],
  meta: PayloadMeta
): SideVerdict | null {
  if (side === "right") {
    const gate = meta.gate_verdict || "";
    const reason =
      meta.refuse_reason ||
      [...events].reverse().find((e) => e.refuse_reason)?.refuse_reason ||
      "";
    if (gate === "refuse" || events.some((e) => e.verdict === "refuse")) {
      return {
        kind: "refuse",
        title: "规则盖章 · 拒判",
        body: reason || "定罪引用不在案卷/规则库，打回。",
        checklist: asStringList(meta.checklist),
      };
    }
    if (gate === "convict" || events.some((e) => e.verdict === "convict")) {
      const text =
        reason ||
        events.find((e) => e.verdict === "convict")?.text ||
        "会商给出高风险信号，请人工复核后再转。";
      return {
        kind: "ok",
        title: "规则盖章 · 拦截",
        body: text,
        checklist: asStringList(meta.checklist),
      };
    }
    if (gate === "pass" || events.some((e) => e.verdict === "pass")) {
      const text =
        reason ||
        events.find((e) => e.verdict === "pass")?.text ||
        "未见硬性违规引用；仍请自行核实对方身份。";
      return {
        kind: "ok",
        title: "有卡口 · 放行",
        body: text,
        checklist: asStringList(meta.checklist),
      };
    }
  }

  const hitl = [...events].reverse().find((e) => e.node === "human_confirm");
  if (hitl && hitl.approved === true) {
    return {
      kind: "ok",
      title: "无卡口 · 放行",
      body: "没有规则盖章时，人工确认也会放行——编造的「转账记录」和假条款都被当成真的了。",
    };
  }
  const convict = events.find(
    (e) => e.verdict === "convict" || e.verdict === "pass"
  );
  if (convict) {
    const label =
      convict.verdict === "pass"
        ? "通过"
        : convict.verdict === "convict"
          ? "定罪建议"
          : String(convict.verdict);
    return {
      kind: "ok",
      title: `终裁 · ${label}`,
      body: convict.text || "",
    };
  }
  return null;
}

/**
 * Actual-layer (live) banner copy.
 * refuse → 「证据不足 · 先别转」+ checklist; never 「已确认是诈骗」.
 */
export function liveLayerVerdict(
  events: DebateEvent[],
  meta: PayloadMeta
): SideVerdict | null {
  const gate = (meta.gate_verdict || "").toLowerCase();
  const checklist =
    asStringList(meta.checklist) ||
    ([
      "核实对方真实身份",
      "勿转入所谓安全账户",
      "可先打官方客服核对",
    ] as string[]);

  if (gate === "refuse" || events.some((e) => e.verdict === "refuse")) {
    const reason =
      meta.refuse_reason ||
      [...events].reverse().find((e) => e.refuse_reason)?.refuse_reason ||
      "";
    return {
      kind: "refuse",
      title: "证据不足 · 先别转",
      body: reason || "当前证据不足以定罪，请先核实再决定。",
      checklist,
    };
  }

  if (gate === "convict" || events.some((e) => e.verdict === "convict")) {
    return {
      kind: "ok",
      title: "风险提示 · 建议暂缓转账",
      body:
        meta.refuse_reason ||
        events.find((e) => e.verdict === "convict")?.text ||
        "会商给出高风险信号，请人工复核后再转。",
      checklist,
    };
  }

  if (gate === "pass" || events.some((e) => e.verdict === "pass")) {
    return {
      kind: "ok",
      title: "暂未触发硬卡口",
      body:
        events.find((e) => e.verdict === "pass")?.text ||
        "未见硬性违规引用；仍请自行核实对方身份。",
    };
  }

  if (events.length === 0) return null;
  return {
    kind: "ok",
    title: "会商结束",
    body: "未给出明确裁定，请查看会商过程。",
  };
}
