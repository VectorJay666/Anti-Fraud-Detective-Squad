export const NODES = [
  "特征官",
  "证据官",
  "风险官",
  "合规官",
  "反方官",
  "用户保护官",
  "审判官",
  "human_confirm",
] as const;

export type NodeName = (typeof NODES)[number] | string;

export interface DebateEvent {
  node?: string;
  ts?: string;
  text?: string;
  evidence_ids?: string[];
  rule_ids?: string[];
  verdict?: string;
  approved?: boolean;
  refuse_reason?: string;
  [key: string]: unknown;
}

export interface PayloadMeta {
  run_id?: string;
  case_id?: string;
  gate_verdict?: string;
  refuse_reason?: string;
  fabricated_evidence?: string[];
  fabricated_rules?: string[];
  mode?: string;
  warning?: string;
  checklist?: string[];
  [key: string]: unknown;
}

export interface NormalizedPayload {
  events: DebateEvent[];
  meta: PayloadMeta;
}

export interface ValidSets {
  evidence: Set<string>;
  ruleIds: Set<string>;
}

export interface SideVerdict {
  kind: "ok" | "refuse";
  title: string;
  body: string;
  checklist?: string[];
}

export interface Dossier {
  evidence?: { id?: string; type?: string; text?: string; case_id?: string }[];
}

export interface RulesDoc {
  rules?: { id?: string; title?: string; text?: string }[];
}

/** Product shell layer (top Tabs) */
export type ProductLayer = "teaching" | "live";

export type Urgency = "low" | "mid" | "high";

/** Frozen live submit body (04-实际层输入规格) */
export interface LiveDebateBody {
  layer: "live";
  transcript: string;
  amount: number | null;
  payee: string | null;
  urgency: Urgency;
  gate: boolean;
  case_id: string | null;
  suspect_links: string[];
  user_note: string | null;
  /** Test-only S6 inject; omit on normal path */
  force_swarm_fail?: boolean;
}

/** Minimal body still accepted by streamLiveDebate (teaching dual-track) */
export type LiveRequestBody =
  | LiveDebateBody
  | { gate: boolean; case_id?: string };

export type ScamType =
  | "fake_customer_service"
  | "romance_loan"
  | "investment"
  | "fake_logistics"
  | "other";

export interface TeachingCaseMeta {
  case_id: string;
  title: string;
  scam_type: ScamType;
  one_liner: string;
  learning_points: string[];
  /** Relative paths under /data/; null = placeholder only */
  fixtures: { ungated: string; gated: string; dossier?: string } | null;
}
