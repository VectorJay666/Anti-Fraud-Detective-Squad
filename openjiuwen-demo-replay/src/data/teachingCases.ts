import type { TeachingCaseMeta } from "../types";

/** Teaching-layer case catalog (3 starters). All three have dual-track fixtures. */
export const TEACHING_CASES: TeachingCaseMeta[] = [
  {
    case_id: "CASE-SPIKE-FAB-001",
    title: "冒充银行客服催转",
    scam_type: "fake_customer_service",
    one_liner: "用账户异常和限时转账制造恐慌，要求转入所谓安全账户。",
    learning_points: [
      "催促限时制造恐慌",
      "冒充官方客服身份",
      "诱导转入所谓「安全账户」",
      "引用的证据和规则也需要经过核验",
    ],
    fixtures: {
      ungated: "/data/events.json",
      gated: "/data/events-v2.json",
    },
  },
  {
    case_id: "TEACH-ROMANCE-LOAN-001",
    title: "熟人急借与账户变更",
    scam_type: "romance_loan",
    one_liner: "熟悉的口吻遇上陌生账户，先确认身份，再决定是否转账。",
    learning_points: [
      "熟人口吻不等于可信身份",
      "急用钱 + 换收款账户是常见套路",
      "证据不足时不直接定性诈骗，优先核实身份",
    ],
    fixtures: {
      ungated: "/data/events-romance-loan.json",
      gated: "/data/events-romance-loan-gated.json",
    },
  },
  {
    case_id: "TEACH-BRUSH-ORDER-001",
    title: "刷单与投资返利",
    scam_type: "investment",
    one_liner: "识别可疑话术，了解风险提示与证据核验结论的区别。",
    learning_points: [
      "可疑话术需要进一步核实，不能仅凭印象下结论",
      "未触发规则不代表转账一定安全",
      "即使检查通过，仍应确认对方身份和收款账户",
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
