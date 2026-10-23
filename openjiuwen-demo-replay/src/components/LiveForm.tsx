import { useState, type ChangeEvent, type FormEvent } from "react";
import type { LiveDebateBody } from "../types";
import {
  validateLiveForm,
  type LiveFormInput,
} from "../lib/validateLive";

export type LiveSubmitOpts = {
  /** 默认 true：走 POST /v1/swarm/debate；false → 旁路 /v1/debate/live */
  useSwarm: boolean;
};

interface Props {
  running: boolean;
  onSubmit: (
    body: LiveDebateBody,
    softHint: string | undefined,
    opts: LiveSubmitOpts
  ) => void;
}

const DEFAULT: LiveFormInput = {
  transcript: "",
  amount: "",
  payee: "",
  urgency: "mid",
  gate: true,
  case_id: "",
  suspect_links: "",
  user_note: "",
};

export function LiveForm({ running, onSubmit }: Props) {
  const [form, setForm] = useState<LiveFormInput>(DEFAULT);
  const [useSwarm, setUseSwarm] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const set =
    (key: keyof LiveFormInput) =>
    (
      e: ChangeEvent<
        HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement
      >
    ) => {
      const value =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateLiveForm(form);
    if (!result.ok) {
      setError(result.error);
      setHint(null);
      return;
    }
    setError(null);
    setHint(result.softHint ?? null);
    onSubmit(result.body, result.softHint, { useSwarm });
  };

  return (
    <form className="live-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">
          会话原文 <em>必填 · transcript</em>
        </span>
        <textarea
          className="field-input"
          rows={8}
          placeholder="粘贴聊天全文（20～8000 字；请先打码卡号）"
          value={form.transcript}
          onChange={set("transcript")}
          disabled={running}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">拟转金额（元）</span>
          <input
            className="field-input"
            type="text"
            inputMode="decimal"
            placeholder="可空"
            value={form.amount}
            onChange={set("amount")}
            disabled={running}
          />
        </label>
        <label className="field">
          <span className="field-label">收款方</span>
          <input
            className="field-input"
            type="text"
            maxLength={80}
            placeholder="可空"
            value={form.payee}
            onChange={set("payee")}
            disabled={running}
          />
        </label>
        <label className="field">
          <span className="field-label">紧急程度</span>
          <select
            className="field-input"
            value={form.urgency}
            onChange={set("urgency")}
            disabled={running}
          >
            <option value="low">low</option>
            <option value="mid">mid</option>
            <option value="high">high</option>
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">可选案卷 id</span>
          <input
            className="field-input"
            type="text"
            placeholder="空则服务端发 LIVE-…"
            value={form.case_id}
            onChange={set("case_id")}
            disabled={running}
          />
        </label>
        <label className="field field-check">
          <span className="field-label">本地 rule_gate</span>
          <label className="check-line">
            <input
              type="checkbox"
              checked={form.gate}
              onChange={set("gate")}
              disabled={running}
            />
            gate（默认开）
          </label>
        </label>
        <label className="field field-check">
          <span className="field-label">平台 Swarm 展示</span>
          <label className="check-line">
            <input
              type="checkbox"
              checked={useSwarm}
              onChange={(e) => setUseSwarm(e.target.checked)}
              disabled={running}
            />
            {useSwarm
              ? "开 · POST /v1/swarm/debate"
              : "关 · 旁路 /v1/debate/live"}
          </label>
        </label>
      </div>

      <label className="field">
        <span className="field-label">可疑链接（每行一条，≤10）</span>
        <textarea
          className="field-input"
          rows={2}
          placeholder="可空"
          value={form.suspect_links}
          onChange={set("suspect_links")}
          disabled={running}
        />
      </label>

      <label className="field">
        <span className="field-label">补充说明 ≤200</span>
        <input
          className="field-input"
          type="text"
          maxLength={200}
          placeholder="可空"
          value={form.user_note}
          onChange={set("user_note")}
          disabled={running}
        />
      </label>

      {error ? (
        <div className="form-error" role="alert">
          {error}
        </div>
      ) : null}
      {hint ? <div className="form-hint">{hint}</div> : null}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-live"
          disabled={running}
        >
          {running ? "会商中…" : "开始裁定"}
        </button>
        <span className="form-hint-inline">
          只发会话原文 · 不宣称接通 SwarmFlow
          {useSwarm ? " · 失败自动改走旁路会商" : ""}
        </span>
      </div>
    </form>
  );
}
