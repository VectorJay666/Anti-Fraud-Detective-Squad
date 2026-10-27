import { useEffect, useState, type FormEvent } from "react";
import {
  DEFAULT_API_BASE,
  DEFAULT_MODEL,
} from "../lib/validateLive";
import {
  cacheLlmDraft,
  fetchServerModelSettings,
  loadLlmSettings,
  putServerModelSettings,
  type LlmSettings,
  type ServerModelSettings,
} from "../lib/llmSettings";
import { liveServiceLabel } from "../lib/liveSse";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (configured: boolean) => void;
}

export function ApiSettings({ open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<LlmSettings>(() => loadLlmSettings());
  const [server, setServer] = useState<ServerModelSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setSavedFlash(false);
    setLoading(true);
    const draft = loadLlmSettings();
    fetchServerModelSettings()
      .then((s) => {
        if (cancelled) return;
        setServer(s);
        setForm({
          api_key: "",
          api_base: s.base_url || draft.api_base || DEFAULT_API_BASE,
          model: s.model || draft.model || DEFAULT_MODEL,
        });
        onSaved(Boolean(s.configured));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setServer(null);
        setForm(draft);
        setError(
          e instanceof Error
            ? `${e.message}。请确认分析服务 ${liveServiceLabel()} 已启动。`
            : `读不到设置，请确认分析服务 ${liveServiceLabel()} 已启动。`
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]); // eslint: onSaved intentionally omitted

  if (!open) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const base = (form.api_base.trim() || DEFAULT_API_BASE).replace(/\/+$/, "");
      if (!/^https?:\/\//i.test(base)) {
        throw new Error("接口地址要以 http:// 或 https:// 开头");
      }
      if (!form.api_key.trim() && !server?.key_set) {
        throw new Error("请先去设置填写 API Key");
      }
      const payload: { api_key?: string; base_url: string; model: string } = {
        base_url: base,
        model: form.model.trim() || DEFAULT_MODEL,
      };
      if (form.api_key.trim()) payload.api_key = form.api_key.trim();
      const next = await putServerModelSettings(payload);
      setServer(next);
      cacheLlmDraft({
        api_key: "",
        api_base: next.base_url,
        model: next.model,
      });
      setForm((p) => ({
        ...p,
        api_key: "",
        api_base: next.base_url,
        model: next.model,
      }));
      setSavedFlash(true);
      onSaved(Boolean(next.configured));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-settings-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="settings-head">
          <h2 id="api-settings-title">API 设置</h2>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <p className="settings-hint">
          保存后写入本机分析服务的 model.env，下次检查立即生效。接口密钥不会在页面回显。
        </p>
        {loading ? <p className="settings-status">读取中…</p> : null}
        <form className="settings-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">
              API Key{" "}
              <em>{server?.key_set ? "已配置 · 留空则保留原 Key" : "必填"}</em>
            </span>
            <input
              className="field-input"
              type="password"
              name="llm-api-key"
              autoComplete="off"
              placeholder={
                server?.key_set ? "••••••••（已设置，改则重填）" : "粘贴模型 Key"
              }
              value={form.api_key}
              onChange={(e) =>
                setForm((p) => ({ ...p, api_key: e.target.value }))
              }
              disabled={loading || saving}
            />
          </label>
          <label className="field">
            <span className="field-label">接口地址 · Base URL</span>
            <input
              className="field-input"
              type="text"
              name="llm-api-base"
              autoComplete="off"
              spellCheck={false}
              placeholder={DEFAULT_API_BASE}
              value={form.api_base}
              onChange={(e) =>
                setForm((p) => ({ ...p, api_base: e.target.value }))
              }
              disabled={loading || saving}
            />
          </label>
          <label className="field">
            <span className="field-label">模型名</span>
            <input
              className="field-input"
              type="text"
              name="llm-model"
              autoComplete="off"
              spellCheck={false}
              placeholder={DEFAULT_MODEL}
              value={form.model}
              onChange={(e) =>
                setForm((p) => ({ ...p, model: e.target.value }))
              }
              disabled={loading || saving}
            />
          </label>
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}
          {savedFlash ? (
            <div className="form-hint" role="status">设置已保存，可以开始风险检查。</div>
          ) : null}
          <div className="settings-actions">
            <button type="submit" className="btn btn-live" disabled={loading || saving}>
              {saving ? "保存中…" : "保存"}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              关闭
            </button>
          </div>
          <p className="settings-status">
            {server?.configured
              ? `已配置 · ${server.model} @ ${server.base_url}`
              : "填写模型接口和 API Key 后即可开始检查。"}
          </p>
        </form>
      </div>
    </div>
  );
}
