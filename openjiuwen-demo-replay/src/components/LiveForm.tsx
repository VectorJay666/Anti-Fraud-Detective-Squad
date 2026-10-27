import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { LiveDebateBody } from "../types";
import { validateLiveForm, type LiveFormInput } from "../lib/validateLive";
import { fetchServerModelSettings } from "../lib/llmSettings";
import { liveServiceLabel } from "../lib/liveSse";

export type LiveSubmitOpts = { useSwarm: boolean };

interface Props {
  running: boolean;
  onOpenSettings?: () => void;
  onSubmit: (body: LiveDebateBody, softHint: string | undefined, opts: LiveSubmitOpts) => void;
}

const DEFAULT: LiveFormInput = {
  transcript: "", amount: "", payee: "", urgency: "mid", gate: true,
  case_id: "", suspect_links: "", user_note: "",
};

const EXAMPLE = "对方：您好，我是银行客服。您的账户出现异常，需要立即处理。\n我：我应该怎么核实？\n对方：请在十分钟内把 5000 元转入我们提供的安全账户，不要告诉其他人，否则账户会被冻结。\n我：我想先拨打银行的官方客服电话确认。\n对方：来不及了，请现在就转账。";

export function LiveForm({ running, onSubmit, onOpenSettings }: Props) {
  const [form, setForm] = useState<LiveFormInput>(DEFAULT);
  const [useSwarm, setUseSwarm] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [checkingSettings, setCheckingSettings] = useState(false);
  const transcriptRef = useRef<HTMLTextAreaElement>(null);

  const set = (key: keyof LiveFormInput) => (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(prev => ({ ...prev, [key]: value }));
    setError(null);
    setHint(null);
  };

  const fillExample = () => {
    setForm(prev => ({ ...prev, transcript: EXAMPLE }));
    setError(null);
    setHint(null);
    transcriptRef.current?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (running || checkingSettings) return;
    const result = validateLiveForm(form);
    if (!result.ok) {
      setError(result.error);
      setHint(null);
      if (form.transcript.trim().length < 20 || /\d{12,19}/.test(form.transcript)) transcriptRef.current?.focus();
      return;
    }
    setError(null);
    setHint(result.softHint ?? null);
    setCheckingSettings(true);
    try {
      const settings = await fetchServerModelSettings();
      if (!settings.configured) {
        setError("请先在模型设置中填写接口和 API Key。");
        onOpenSettings?.();
        return;
      }
      onSubmit(result.body, result.softHint, { useSwarm });
    } catch {
      setError(`暂时无法读取模型设置，请确认分析服务 ${liveServiceLabel()} 已启动。`);
    } finally {
      setCheckingSettings(false);
    }
  };

  return (
    <form className="live-form" onSubmit={handleSubmit} noValidate aria-busy={running} aria-labelledby="check-form-title">
      <header className="form-heading">
        <h2 id="check-form-title">先聊聊，这笔转账。</h2>
        <p>粘贴聊天内容，其他信息可以稍后补充。</p>
      </header>
      <div className="transcript-field">
        <div className="field-heading">
          <label className="field-label" htmlFor="transcript">聊天内容</label>
          <button className="text-button" type="button" onClick={fillExample} disabled={running || !!form.transcript.trim()} title={form.transcript.trim() ? "清空聊天内容后可以填写示例" : "填入示例对话，不会自动提交"}>填写示例 <span aria-hidden="true">↗</span></button>
        </div>
        <div className="transcript-box">
          <textarea id="transcript" ref={transcriptRef} rows={6} className="transcript-input"
            placeholder={"把让你犹豫的对话粘贴到这里…\n\n例如，对方是否在催促转账、要求保密，\n或让你转入一个陌生账户？"}
            value={form.transcript} onChange={set("transcript")} disabled={running}
            aria-describedby={`transcript-note${error ? " check-error" : ""}`} />
          <div className="transcript-bottom"><span id="transcript-note">请先隐去银行卡号等敏感信息</span><span className={form.transcript.length > 8000 ? "over-limit" : ""}>{form.transcript.length} / 8000</span></div>
        </div>
      </div>
      <div className="field-row transfer-fields">
        <label className="field"><span className="field-label">转账金额</span><input className="field-input" inputMode="decimal" placeholder="¥  输入金额（选填）" value={form.amount} onChange={set("amount")} disabled={running} /></label>
        <label className="field"><span className="field-label">收款方</span><input className="field-input" maxLength={80} placeholder="对方姓名或账户备注（选填）" value={form.payee} onChange={set("payee")} disabled={running} /></label>
      </div>
      <details className="advanced-settings">
        <summary>更多信息与高级设置 <span aria-hidden="true">＋</span></summary>
        <div className="advanced-fields">
          <label className="field"><span className="field-label">紧急程度</span><select className="field-input" value={form.urgency} onChange={set("urgency")} disabled={running}><option value="low">不着急，可以慢慢核实</option><option value="mid">一般，希望尽快了解</option><option value="high">很紧急，对方正在催促</option></select></label>
          <label className="field"><span className="field-label">可疑链接 <em>选填，每行一条，最多 10 条</em></span><textarea className="field-input" rows={2} placeholder="粘贴对方提供的网址" value={form.suspect_links} onChange={set("suspect_links")} disabled={running} /></label>
          <label className="field"><span className="field-label">补充说明 <em>选填</em></span><textarea className="field-input" rows={2} maxLength={200} placeholder="还有什么信息想让我们知道？（200 字以内）" value={form.user_note} onChange={set("user_note")} disabled={running} /></label>
          <label className="field"><span className="field-label">记录编号 <em>选填，留空自动生成</em></span><input className="field-input" placeholder="用于关联本次检查" value={form.case_id} onChange={set("case_id")} disabled={running} /></label>
          <label className="check-line"><input type="checkbox" checked={form.gate} onChange={set("gate")} disabled={running} /><span><strong>规则核验</strong><small>核对证据和规则后再给出结论</small></span></label>
          <label className="check-line"><input type="checkbox" checked={useSwarm} onChange={e => setUseSwarm(e.target.checked)} disabled={running} /><span><strong>多角色协作分析</strong><small>开启后优先使用协作服务，不可用时自动切换备用会商</small></span></label>
        </div>
      </details>
      {error && <div className="form-error" id="check-error" role="alert">{error}</div>}
      {hint && <div className="form-hint" role="status">{hint}</div>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={running || checkingSettings}>{(running || checkingSettings) && <span className="button-spinner" aria-hidden="true" />}{checkingSettings ? "确认模型设置…" : running ? "正在检查…" : "开始风险检查"}</button>
        <span className="form-hint-inline">仅在点击检查后提交至分析服务</span>
      </div>
    </form>
  );
}
