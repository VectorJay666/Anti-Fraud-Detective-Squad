import { LIVE_BASE } from "./liveSse";
import { DEFAULT_API_BASE, DEFAULT_MODEL } from "./validateLive";
import type { LiveLlmConfig } from "../types";

const STORAGE_KEY = "oj-demo-llm-settings";

export type LlmSettings = LiveLlmConfig;

export type ServerModelSettings = {
  configured: boolean;
  base_url: string;
  model: string;
  key_set: boolean;
  provider?: string;
  client_id?: string;
  ts?: string;
};

/** Draft fields for the settings form (Key never returned by GET). */
export function loadLlmSettings(): LlmSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { api_key: "", api_base: DEFAULT_API_BASE, model: DEFAULT_MODEL };
    }
    const parsed = JSON.parse(raw) as Partial<LlmSettings>;
    return {
      api_key: typeof parsed.api_key === "string" ? parsed.api_key : "",
      api_base:
        typeof parsed.api_base === "string" && parsed.api_base.trim()
          ? parsed.api_base.trim()
          : DEFAULT_API_BASE,
      model:
        typeof parsed.model === "string" && parsed.model.trim()
          ? parsed.model.trim()
          : DEFAULT_MODEL,
    };
  } catch {
    return { api_key: "", api_base: DEFAULT_API_BASE, model: DEFAULT_MODEL };
  }
}

/** Cache non-secret draft locally so the form remembers base/model between sessions. */
export function cacheLlmDraft(settings: LlmSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      // Do not persist api_key in localStorage when server holds it;
      // keep empty so screenshots / shared machines stay safer. User re-pastes if needed.
      api_key: "",
      api_base: settings.api_base.trim() || DEFAULT_API_BASE,
      model: settings.model.trim() || DEFAULT_MODEL,
    })
  );
}

export function settingsConfigured(s: { configured?: boolean; key_set?: boolean; api_key?: string }): boolean {
  if (typeof s.configured === "boolean") return s.configured;
  if (typeof s.key_set === "boolean") return s.key_set;
  return Boolean(s.api_key?.trim());
}

export async function fetchServerModelSettings(): Promise<ServerModelSettings> {
  const res = await fetch(`${LIVE_BASE}/v1/settings/model`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`设置读取失败（HTTP ${res.status}）`);
  }
  const data = (await res.json()) as ServerModelSettings;
  return {
    configured: Boolean(data.configured),
    base_url: data.base_url || DEFAULT_API_BASE,
    model: data.model || DEFAULT_MODEL,
    key_set: Boolean(data.key_set),
    provider: data.provider,
    client_id: data.client_id,
    ts: data.ts,
  };
}

export async function putServerModelSettings(partial: {
  api_key?: string;
  base_url?: string;
  api_base?: string;
  model?: string;
}): Promise<ServerModelSettings> {
  const body: Record<string, string> = {};
  if (partial.api_key !== undefined && partial.api_key !== "") {
    body.api_key = partial.api_key;
  }
  const base = (partial.base_url ?? partial.api_base ?? "").trim();
  if (base) body.base_url = base.replace(/\/+$/, "");
  if (partial.model?.trim()) body.model = partial.model.trim();
  if (Object.keys(body).length === 0) {
    throw new Error("至少填一项再保存");
  }
  const res = await fetch(`${LIVE_BASE}/v1/settings/model`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`设置保存失败（HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}）`);
  }
  const data = (await res.json()) as {
    ok?: boolean;
    settings?: ServerModelSettings;
  };
  if (!data.settings) {
    throw new Error("设置保存成功但未返回状态");
  }
  return {
    configured: Boolean(data.settings.configured),
    base_url: data.settings.base_url || DEFAULT_API_BASE,
    model: data.settings.model || DEFAULT_MODEL,
    key_set: Boolean(data.settings.key_set),
    provider: data.settings.provider,
    client_id: data.settings.client_id,
    ts: data.settings.ts,
  };
}

export function validateLlmDraft(
  s: LlmSettings,
  opts?: { requireKey: boolean; keyAlreadySet: boolean }
): { ok: true } | { ok: false; error: string } {
  const needKey = opts?.requireKey !== false && !opts?.keyAlreadySet;
  if (needKey && !s.api_key.trim()) {
    return { ok: false, error: "请先去设置填写 API Key" };
  }
  const api_base = (s.api_base.trim() || DEFAULT_API_BASE).replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(api_base)) {
    return { ok: false, error: "接口地址要以 http:// 或 https:// 开头" };
  }
  return { ok: true };
}
