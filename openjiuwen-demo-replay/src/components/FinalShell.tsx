import type { PayloadMeta, SideVerdict } from "../types";

export type RiskLevel = "high" | "mid" | "low";

export function riskFromGate(
  gate: string | undefined,
  verdict: SideVerdict | null,
  meta?: PayloadMeta | null
): RiskLevel {
  const explicit = String(meta?.risk_level || "").toLowerCase();
  if (explicit === "high" || explicit === "mid" || explicit === "low") {
    return explicit;
  }
  const g = (gate || "").toLowerCase();
  const reason = String(meta?.refuse_reason || verdict?.body || "");
  if (
    g === "convict" ||
    (verdict?.kind === "ok" && /风险|定罪|暂缓|拦截/.test(verdict.title || ""))
  )
    return "high";
  if (g === "pass" || (verdict?.kind === "ok" && /放行|未触发硬卡口|通过/.test(verdict.title || "")))
    return "low";
  if (g === "refuse" || verdict?.kind === "refuse") {
    // Severe intercept copy → high; soft "证据不足" → mid
    if (/拦转|垫资|诱导|催转|安全账户/.test(reason)) return "high";
    return "mid";
  }
  if (verdict) return "mid";
  return "low";
}

const RISK_LABEL: Record<RiskLevel, string> = {
  high: "高风险",
  mid: "中风险 · 先别转",
  low: "低风险",
};

interface Contrast {
  label: string;
  verdict: SideVerdict;
}

interface Props {
  verdict: SideVerdict;
  meta: PayloadMeta;
  risk: RiskLevel;
  enginePath?: string;
  swarmflow?: boolean;
  /** Teaching dual-track: show ungated contrast under gated primary */
  contrast?: Contrast | null;
  onReviewProcess: () => void;
  onRestart: () => void;
}

export function FinalShell({
  verdict,
  meta,
  risk,
  enginePath,
  swarmflow,
  contrast,
  onReviewProcess,
  onRestart,
}: Props) {
  const gate = String(meta.gate_verdict ?? meta.gate ?? "—");
  const caseId = meta.case_id || "—";
  const checklist = verdict.checklist?.length
    ? verdict.checklist
    : ([
        "核实对方真实身份",
        "勿转入所谓安全账户",
        "可先打官方客服核对",
      ] as string[]);

  return (
    <section className="final-shell" aria-label="最终裁定">
      <header className="final-shell-head">
        <p className="final-eyebrow">检查完成</p>
        <h2 className="final-title">转账前，再确认一下。</h2>
        <details className="result-details"><summary>查看检查记录</summary><p className="final-meta">
          case:{caseId}
          {" · "}
          gate:{gate}
          {enginePath ? ` · path:${enginePath}` : ""}
          {swarmflow != null
            ? ` · swarmflow:${swarmflow ? "true" : "false"}`
            : ""}
        </p></details>
      </header>

      <div className={`risk-bar risk-${risk}`} role="status">
        <div className="risk-bar-level">{RISK_LABEL[risk]}</div>
        <div className="risk-gauge" aria-hidden>
          <div className="risk-gauge-track">
            <span
              className="risk-gauge-pointer"
              style={{ left: risk === "low" ? "12%" : risk === "mid" ? "55%" : "88%" }}
            />
          </div>
          <div className="risk-gauge-scale">
            <span>低风险</span>
            <span>中风险</span>
            <span>高风险</span>
          </div>
        </div>
        <div className="risk-bar-copy">
          <div className="risk-bar-title">{verdict.title}</div>
          <div className="risk-bar-body">{verdict.body}</div>
        </div>
      </div>

      <div className="final-card">
        <h3 className="final-card-h">接下来，你可以这样做</h3>
        <ul className="final-checklist">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {contrast ? (
        <div className="final-contrast">
          <h3 className="final-card-h">对照 · {contrast.label}</h3>
          <p className="final-contrast-title">{contrast.verdict.title}</p>
          <p className="final-contrast-body">{contrast.verdict.body}</p>
        </div>
      ) : null}

      <div className="final-actions">
        <button type="button" className="final-btn ghost" onClick={onReviewProcess}>
          回看会商过程
        </button>
        <button type="button" className="final-btn primary" onClick={onRestart}>
          重新检查
        </button>
      </div>
    </section>
  );
}
