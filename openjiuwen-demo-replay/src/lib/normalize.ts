import type { DebateEvent, NormalizedPayload, PayloadMeta } from "../types";

/** Normalize: bare array OR { events: [] } wrapper */
export function normalizePayload(raw: unknown): NormalizedPayload {
  if (Array.isArray(raw)) {
    return { events: raw as DebateEvent[], meta: {} };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const events = Array.isArray(obj.events)
      ? (obj.events as DebateEvent[])
      : [];
    const { events: _e, ...rest } = obj;
    return { events, meta: rest as PayloadMeta };
  }
  return { events: [], meta: {} };
}
