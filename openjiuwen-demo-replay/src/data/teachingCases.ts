import type { TeachingCaseMeta } from "../types";

/** Teaching-layer case catalog (3 starters). All three have dual-track fixtures. */
export const TEACHING_CASES: TeachingCaseMeta[] = [
  {
    case_id: "CASE-SPIKE-FAB-001",
    title: "冒充银行客服催转",
    scam_type: "fake_customer_service",
    one_liner: "限时安全账户——本质是把钱转出监管",
    learning_points: [
      "催促限时制造恐慌",
      "冒充官方客服身份",
      "诱导转入所谓「安全账户」",
      "编造证据也会被盖章打回",
    ],
    fixtures: {
      ungated: "/data/events.json",
      gated: "/data/events-v2.json",
    },
  },
  {
    case_id: "TEACH-ROMANCE-LOAN-001",
    title: "熟人急借（拒判高光）",
    scam_type: "romance_loan",
    one_liner: "证据不足不定性诈骗——先别转、先核实",
    learning_points: [
      "熟人口吻不等于可信身份",
      "急用钱 + 换收款账户是常见套路",
      "证据不足时系统应 refuse，不定性诈骗",
    ],
    fixtures: {
      ungated: "/data/events-romance-loan.json",
      gated: "/data/events-romance-loan-gated.json",
    },
  },
  {
    case_id: "TEACH-BRUSH-ORDER-001",
    title: "刷单 / 投资返利（低风险对照）",
    scam_type: "investment",
    one_liner: "话术可疑但未达硬卡口——演示有卡口放行 / 低风险条",
    learning_points: [
      "可疑话术不等于已盖章拦截",
      "未形成可核硬卡口时可能放行",
      "放行仍建议人工核实后再转",
    ],
    fixtures: {
      ungated: "/data/events-brush-order.json",
      gated: "/data/events-brush-order-gated.json",
    },
  },
];

export function findTeachingCase(
  caseId: string
): TeachingCaseMeta | undefined {
  return TEACHING_CASES.find((c) => c.case_id === caseId);
}
