import { useState, type ChangeEvent, type FormEvent } from "react";
import type { LiveDebateBody } from "../types";
import {
  validateLiveForm,
  type LiveFormInput,
} from "../lib/validateLive";
import { fetchServerModelSettings } from "../lib/llmSettings";

export type LiveSubmitOpts = {
  /** 默认 true：走 POST /v1/swarm/debate；false → 旁路 /v1/debate/live */
  useSwarm: boolean;
};

interface Props {
  running: boolean;
  /** 打开顶栏 API 设置 */
  onOpenSettings?: () => void;
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

export function LiveForm({ running, onSubmit, onOpenSettings }: Props) {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const s = await fetchServerModelSettings();
      if (!s.configured) {
        setError("请先去设置");
        setHint(null);
        onOpenSettings?.();
        return;
      }
    } catch {
      setError("读不到 API 设置，请确认 5180 已启动，或先去设置");
      setHint(null);
      onOpenSettings?.();
      return;
    }
    const result = validateLiveForm(form);
    if (!result.ok) {
      setError(result.error);
      setHint(null);
      return;
    }
    setError(null);
    setHint(result.softHint ?? null);
    // Key 由 5180 model.env 热加载提供，开庭 body 不再塞 llm
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
          <span className="field-label">可选案例 id</span>
          <input
            className="field-input"
            type="text"
            placeholder="可空；勿手写 LIVE-"
            value={form.case_id}
            onChange={set("case_id")}
            disabled={running}
          />
        </label>
        <label className="field field-check">
          <span className="field-label">SwarmFlow</span>
          <label className="check-line">
            <input
              type="checkbox"
              checked={useSwarm}
              onChange={(e) => setUseSwarm(e.target.checked)}
              disabled={running}
            />
            {useSwarm ? "开 · POST /v1/swarm/debate" : "关 · /v1/debate/live"}
          </label>
        </label>
        <label className="field field-check">
          <span className="field-label">启用 rule_gate</span>
          <label className="check-line">
            <input
              type="checkbox"
              checked={form.gate}
              onChange={set("gate")}
              disabled={running}
            />
            gate（默认开启）
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
          {onOpenSettings ? (
            <>
              {" "}
              <button type="button" className="linkish" onClick={onOpenSettings}>
                打开设置
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {hint ? <div className="form-hint">{hint}</div> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-live" disabled={running}>
          {running ? "会商中…" : "开始开庭"}
        </button>
        <span className="form-hint-inline">
          模型配置在顶栏「设置」；保存后 5180 热加载，开庭不再带 Key
          {useSwarm ? " · SwarmFlow" : ""}
        </span>
      </div>
    </form>
  );
}
