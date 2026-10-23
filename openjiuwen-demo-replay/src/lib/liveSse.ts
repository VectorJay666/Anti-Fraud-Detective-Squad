/** Live / SwarmFlow debate SSE client */

import type { LiveDebateBody, LiveRequestBody } from "../types";

export const LIVE_BASE = "http://127.0.0.1:5180";
/** SwarmFlow 两 worker；契约建议 ≥180s */
export const LIVE_TIMEOUT_MS = 300_000;

/** TeamRuntime 旁路 / 降级后诚实页脚（禁止宣称接通 SwarmFlow） */
export const FOOTER_TEAMRUNTIME = "真 LLM 现场会商 + 本地 rule_gate";
/** 仅当本次 done.swarmflow===true 可用；优先用后端 done.footer */
export const FOOTER_SWARMFLOW = "SwarmFlow 现场会商 + 本地 rule_gate";

export const SWARM_PATH = "/v1/swarm/debate";
export const LIVE_PATH = "/v1/debate/live";

export type LiveSseHandler = {
  onSchema?: (data: Record<string, unknown>) => void;
  onMeta?: (data: Record<string, unknown>) => void;
  /** Swarm 中间进度（边开边推）；勿与 SCHEMA event 混成定罪气泡 */
  onProgress?: (data: Record<string, unknown>) => void;
  onEvent?: (data: Record<string, unknown>) => void;
  onDone?: (data: Record<string, unknown>) => void;
  onError?: (data: {
    message?: string;
    code?: string;
    downgrade?: string;
    hint?: string;
  }) => void;
};

export class LiveSseError extends Error {
  code?: string;
  downgrade?: string;
  hint?: string;
  constructor(
    message: string,
    code?: string,
    extra?: { downgrade?: string; hint?: string }
  ) {
    super(message);
    this.name = "LiveSseError";
    this.code = code;
    this.downgrade = extra?.downgrade;
    this.hint = extra?.hint;
  }
}

export type StreamResult = {
  done: Record<string, unknown>;
  /** 本次成功完成的响应是否真实 SwarmFlow */
  swarmflow: boolean;
  /** 是否从 Swarm 轨降级到 TeamRuntime live */
  downgraded: boolean;
  footer: string;
  path: string;
};

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split(/\r?\n/);
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (!dataLines.length) return null;
  return { event, data: dataLines.join("\n") };
}

function asBool(v: unknown): boolean {
  return v === true;
}

function pickFooter(
  swarmflow: boolean,
  data?: Record<string, unknown>
): string {
  if (swarmflow) {
    const f = data?.footer;
    if (
      typeof f === "string" &&
      f.trim() &&
      !f.includes("\u5df2\u63a5")
    ) {
      return f.trim();
    }
    return FOOTER_SWARMFLOW;
  }
  return FOOTER_TEAMRUNTIME;
}

/**
 * POST debate and consume SSE frames.
 * Body: frozen live fields OR legacy `{ gate, case_id? }` (teaching dual-track).
 * Resolves on `done`; rejects on network/HTTP/`error` frame/abort/timeout.
 */
export async function streamLiveDebate(
  body: LiveRequestBody,
  handlers: LiveSseHandler,
  opts?: { signal?: AbortSignal; timeoutMs?: number; path?: string }
): Promise<Record<string, unknown>> {
  const timeoutMs = opts?.timeoutMs ?? LIVE_TIMEOUT_MS;
  const path = opts?.path ?? LIVE_PATH;
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  if (opts?.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", onOuterAbort, { once: true });
  }
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${LIVE_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LiveSseError(
        `HTTP ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`,
        "http"
      );
    }
    if (!res.body) {
      throw new LiveSseError("现场服务没有返回数据流", "no_body");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let donePayload: Record<string, unknown> | null = null;
    let streamError: LiveSseError | null = null;

    const dispatch = (event: string, raw: string) => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        data = { raw };
      }
      switch (event) {
        case "schema":
          handlers.onSchema?.(data);
          break;
        case "meta":
          handlers.onMeta?.(data);
          break;
        case "progress":
          handlers.onProgress?.(data);
          break;
        case "event":
          handlers.onEvent?.(data);
          break;
        case "done":
          donePayload = data;
          handlers.onDone?.(data);
          break;
        case "error": {
          const msg =
            typeof data.message === "string"
              ? data.message
              : typeof data.hint === "string"
                ? data.hint
                : "会商出错";
          const code =
            typeof data.code === "string" ? data.code : undefined;
          const downgrade =
            typeof data.downgrade === "string" ? data.downgrade : undefined;
          const hint =
            typeof data.hint === "string" ? data.hint : undefined;
          streamError = new LiveSseError(msg, code, { downgrade, hint });
          handlers.onError?.({ message: msg, code, downgrade, hint });
          break;
        }
        default:
          break;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, "");
        const parsed = parseSseBlock(block);
        if (!parsed) continue;
        dispatch(parsed.event, parsed.data);
        if (streamError) {
          try {
            await reader.cancel();
          } catch {
            /* ignore */
          }
          throw streamError;
        }
        if (donePayload) {
          try {
            await reader.cancel();
          } catch {
            /* ignore */
          }
          return donePayload;
        }
      }
    }

    if (buffer.trim()) {
      const parsed = parseSseBlock(buffer);
      if (parsed) {
        dispatch(parsed.event, parsed.data);
        if (streamError) throw streamError;
        if (donePayload) return donePayload;
      }
    }

    if (streamError) throw streamError;
    if (donePayload) return donePayload;
    throw new LiveSseError("会商中断：未收到完成结果", "incomplete");
  } catch (e) {
    if (e instanceof LiveSseError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new LiveSseError(
        `现场会商超时或已取消（等待超过 ${Math.round(timeoutMs / 1000)} 秒）`,
        "abort"
      );
    }
    throw new LiveSseError(
      e instanceof Error ? e.message : String(e),
      "network"
    );
  } finally {
    window.clearTimeout(timer);
    if (opts?.signal) {
      opts.signal.removeEventListener("abort", onOuterAbort);
    }
  }
}

export type SwarmHandlers = LiveSseHandler & {
  /** Swarm 轨失败、即将回退 TeamRuntime live 时回调（可清 UI / 改文案） */
  onDowngrade?: (info: {
    message: string;
    code?: string;
    hint?: string;
  }) => void;
};

/**
 * 实际层展示轨：默认 `POST /v1/swarm/debate`（body 同 04，只发 transcript）。
 * 收到 `swarm_debate_failed` → 自动降级 `POST /v1/debate/live`（不带 engine）。
 * 别名 `debate/live`+`engine:"swarm"` 不在此函数使用；主 URL 写死为 SWARM_PATH。
 */
export async function streamSwarmDebate(
  body: LiveDebateBody,
  handlers: SwarmHandlers,
  opts?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<StreamResult> {
  const timeoutMs = opts?.timeoutMs ?? LIVE_TIMEOUT_MS;
  let sawSwarmflowTrue = false;

  const wrapHandlers = (h: SwarmHandlers): LiveSseHandler => ({
    onSchema: h.onSchema,
    onMeta: (data) => {
      if (asBool(data.swarmflow)) sawSwarmflowTrue = true;
      h.onMeta?.(data);
    },
    onProgress: h.onProgress,
    onEvent: h.onEvent,
    onDone: (data) => {
      if (asBool(data.swarmflow)) sawSwarmflowTrue = true;
      h.onDone?.(data);
    },
    onError: h.onError,
  });

  try {
    const done = await streamLiveDebate(body, wrapHandlers(handlers), {
      signal: opts?.signal,
      timeoutMs,
      path: SWARM_PATH,
    });
    const swarmflow = asBool(done.swarmflow) || sawSwarmflowTrue;
    // 契约：仅成功完成且 swarmflow true 才标 SwarmFlow 页脚
    const okSwarm = swarmflow === true;
    return {
      done,
      swarmflow: okSwarm,
      downgraded: false,
      footer: pickFooter(okSwarm, done),
      path: SWARM_PATH,
    };
  } catch (e) {
    const isSwarmFail =
      e instanceof LiveSseError && e.code === "swarm_debate_failed";
    if (!isSwarmFail) throw e;

    const fail = e as LiveSseError;
    handlers.onDowngrade?.({
      message: fail.message,
      code: fail.code,
      hint: fail.hint,
    });

    // 降级：旁路 TeamRuntime，不带 engine；页脚回诚实 live 句
    sawSwarmflowTrue = false;
    const done = await streamLiveDebate(body, wrapHandlers(handlers), {
      signal: opts?.signal,
      timeoutMs,
      path: LIVE_PATH,
    });
    return {
      done,
      swarmflow: false,
      downgraded: true,
      footer: FOOTER_TEAMRUNTIME,
      path: LIVE_PATH,
    };
  }
}

/** 实际层也可显式关 Swarm，直打旁路 live */
export async function streamTeamruntimeDebate(
  body: LiveDebateBody,
  handlers: LiveSseHandler,
  opts?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<StreamResult> {
  const done = await streamLiveDebate(body, handlers, {
    signal: opts?.signal,
    timeoutMs: opts?.timeoutMs ?? LIVE_TIMEOUT_MS,
    path: LIVE_PATH,
  });
  return {
    done,
    swarmflow: false,
    downgraded: false,
    footer: FOOTER_TEAMRUNTIME,
    path: LIVE_PATH,
  };
}


/** Map LiveSseError / network failures → plain Chinese, actionable; never imply Swarm succeeded. */
export function formatLiveUserError(e: unknown): string {
  if (!(e instanceof LiveSseError)) {
    const raw = e instanceof Error ? e.message : String(e);
    if (/failed to fetch|networkerror|load failed|fetch/i.test(raw)) {
      return "连不上本机 5180 现场服务。请先启动 spike（live_server），再点「开始裁定」重试。";
    }
    return raw.trim() || "会商失败，请重试。";
  }

  const hint = typeof e.hint === "string" ? e.hint.trim() : "";
  const msg = (e.message || "").trim();

  switch (e.code) {
    case "health":
      return (
        msg ||
        "连不上本机 5180。请先启动 spike/live_server.py，再重试。"
      );
    case "busy":
      return "服务忙：另一路现场会商进行中，请稍后再点「开始裁定」。";
    case "transcript_too_short":
      return hint || msg || "会话原文过短，请多贴几句聊天后再试。";
    case "swarm_debate_failed":
      return (
        hint ||
        msg ||
        "平台 Swarm 轨失败，未完成 SwarmFlow。可重试，或改走旁路会商。"
      );
    case "abort":
      return `${msg}。若不是手动取消，请确认 5180 正常后重试。`;
    case "http":
      return `现场服务返回错误（${msg}）。请查看 5180 日志后重试。`;
    case "network":
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        return "连不上本机 5180 现场服务。请确认已启动后再重试。";
      }
      return `网络异常：${msg}。请检查 5180 后重试。`;
    case "no_body":
      return "现场服务没有返回数据流。请重启 5180 后重试。";
    case "incomplete":
      return "会商中断：未收到完成结果。请重试；仍失败则查看 5180 日志。";
    default:
      return hint || msg || "会商失败，请重试。";
  }
}

export async function checkLiveHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${LIVE_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return false;
    const j = (await r.json()) as { ok?: boolean };
    return j.ok === true;
  } catch {
    return false;
  }
}
