import type { LiveDebateBody, Urgency } from "../types";

const CARD_RE = /\d{12,19}/;
const MAX_TRANSCRIPT = 8000;
const MIN_TRANSCRIPT = 20;

export type LiveFormInput = {
  transcript: string;
  amount: string;
  payee: string;
  urgency: string;
  gate: boolean;
  case_id: string;
  suspect_links: string;
  user_note: string;
};

export type ValidateResult =
  | { ok: true; body: LiveDebateBody; softHint?: string }
  | { ok: false; error: string };

function parseUrgency(raw: string): Urgency {
  if (raw === "low" || raw === "mid" || raw === "high") return raw;
  return "mid";
}

function parseLinks(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

/** Client-side gate before POST /v1/debate/live */
export function validateLiveForm(input: LiveFormInput): ValidateResult {
  let transcript = input.transcript.trim();
  if (!transcript || transcript.length < MIN_TRANSCRIPT) {
    return { ok: false, error: "请至少填写 20 字的聊天内容，方便我们了解上下文。" };
  }

  let softHint: string | undefined;
  if (transcript.length > MAX_TRANSCRIPT) {
    transcript = transcript.slice(0, MAX_TRANSCRIPT);
    softHint = "已截到前 8000 字，可分段再审";
  }

  if (CARD_RE.test(transcript)) {
    return { ok: false, error: "聊天中包含疑似银行卡号，请隐去卡号后再检查。" };
  }

  let amount: number | null = null;
  const amountRaw = input.amount.trim();
  if (amountRaw !== "") {
    const n = Number(amountRaw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "金额格式不对" };
    }
    amount = n;
  }

  const payee = input.payee.trim() || null;
  if (payee && payee.length > 80) {
    return { ok: false, error: "收款方备注请控制在 80 字内" };
  }

  const user_note = input.user_note.trim() || null;
  if (user_note && user_note.length > 200) {
    return { ok: false, error: "补充说明请控制在 200 字内" };
  }

  const case_id = input.case_id.trim() || null;
  const suspect_links = parseLinks(input.suspect_links);

  const body: LiveDebateBody = {
    layer: "live",
    transcript,
    amount,
    payee,
    urgency: parseUrgency(input.urgency),
    gate: input.gate,
    case_id,
    suspect_links,
    user_note,
  };

  return softHint ? { ok: true, body, softHint } : { ok: true, body };
}
