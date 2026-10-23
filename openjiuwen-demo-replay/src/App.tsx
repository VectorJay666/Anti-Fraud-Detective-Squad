import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NODES,
  type DebateEvent,
  type Dossier,
  type LiveDebateBody,
  type NormalizedPayload,
  type PayloadMeta,
  type ProductLayer,
  type RulesDoc,
  type SideVerdict,
  type TeachingCaseMeta,
  type ValidSets,
} from "./types";
import { normalizePayload } from "./lib/normalize";
import { buildValidSets } from "./lib/validSets";
import { hydrateHumanLabels } from "./lib/humanLabels";
import { liveLayerVerdict, sideVerdict } from "./lib/verdict";
import {
  FOOTER_TEAMRUNTIME,
  LiveSseError,
  SWARM_PATH,
  checkLiveHealth,
  formatLiveUserError,
  streamLiveDebate,
  streamSwarmDebate,
  streamTeamruntimeDebate,
} from "./lib/liveSse";
import { TEACHING_CASES, findTeachingCase } from "./data/teachingCases";
import { Toolbar, type PlaySpeed, type UiMode } from "./components/Toolbar";
import { Column } from "./components/Column";
import { LayerTabs } from "./components/LayerTabs";
import { CasePicker } from "./components/CasePicker";
import { TeachingMeta } from "./components/TeachingMeta";
import { LiveForm, type LiveSubmitOpts } from "./components/LiveForm";
import {
  ProgressTimeline,
  type ProgressLine,
} from "./components/ProgressTimeline";
import {
  FinalShell,
  riskFromGate,
} from "./components/FinalShell";

const PLAY_MS = 1000;

const FOOTER_TEACHING =
  "典型事例展示 · 回放（可含确定性注入对照）· 非完整平台交付 · 不宣称 SwarmFlow";

interface SideState {
  events: DebateEvent[];
  meta: PayloadMeta;
  idx: number;
  seen: Set<string>;
}

interface FixtureSide {
  events: DebateEvent[];
  meta: PayloadMeta;
}

function emptySide(): SideState {
  return { events: [], meta: {}, idx: -1, seen: new Set() };
}

function advance(
  side: SideState
): { next: SideState; advanced: boolean; finished: boolean } {
  const n = side.idx + 1;
  if (n >= side.events.length) {
    return {
      next: side,
      advanced: false,
      finished: side.events.length > 0 && side.idx >= side.events.length - 1,
    };
  }
  const ev = side.events[n];
  const seen = new Set(side.seen);
  if (ev.node) seen.add(ev.node);
  const next = { ...side, idx: n, seen };
  return {
    next,
    advanced: true,
    finished: n === side.events.length - 1,
  };
}

const OFFICER_SET = new Set<string>(
  NODES.filter((n) => n !== "human_confirm")
);

function appendLiveEvent(prev: SideState, raw: Record<string, unknown>): SideState {
  const ev = raw as DebateEvent;
  // Drop provisional placeholder for this node when a real SCHEMA event lands
  const events = [
    ...prev.events.filter(
      (e) => !(e._provisional && e.node && e.node === ev.node)
    ),
    ev,
  ];
  const seen = new Set(prev.seen);
  if (ev.node) seen.add(ev.node);
  return {
    ...prev,
    events,
    idx: events.length - 1,
    seen,
  };
}

/** Mid-flight graph paint from progress.label when SCHEMA events are delayed until done. */
function upsertProgressEvent(
  prev: SideState,
  label: string,
  text?: string
): SideState {
  const hasReal = prev.events.some(
    (e) => e.node === label && !e._provisional
  );
  if (hasReal) return prev;

  const provisional: DebateEvent = {
    node: label,
    text: (text && text.trim()) || `${label}处理中…`,
    _provisional: true,
  };

  const existing = prev.events.findIndex(
    (e) => e.node === label && e._provisional
  );
  let events: DebateEvent[];
  let at: number;
  if (existing >= 0) {
    events = [...prev.events];
    events[existing] = provisional;
    at = existing;
  } else {
    events = [...prev.events, provisional];
    at = events.length - 1;
  }
  const seen = new Set(prev.seen);
  seen.add(label);
  return { ...prev, events, idx: at, seen };
}

function onlyProvisionalOrEmpty(events: DebateEvent[]): boolean {
  return (
    events.length === 0 || events.every((e) => e._provisional === true)
  );
}

function mergeMeta(prev: PayloadMeta, data: Record<string, unknown>): PayloadMeta {
  const { fabricate: _f, ...rest } = data;
  return { ...prev, ...rest } as PayloadMeta;
}

async function loadFixturePair(
  meta: TeachingCaseMeta
): Promise<{ left: FixtureSide; right: FixtureSide; valid: ValidSets } | null> {
  if (!meta.fixtures) return null;
  const dossierPath = meta.fixtures.dossier || "/data/dossier.json";
  const [ej, ev2, dossier, rules] = await Promise.all([
    fetch(meta.fixtures.ungated).then((r) => {
      if (!r.ok) throw new Error(`${meta.fixtures!.ungated} ${r.status}`);
      return r.json();
    }),
    fetch(meta.fixtures.gated).then((r) => {
      if (!r.ok) throw new Error(`${meta.fixtures!.gated} ${r.status}`);
      return r.json();
    }),
    fetch(dossierPath).then((r) => {
      if (!r.ok) throw new Error(`${dossierPath} ${r.status}`);
      return r.json() as Promise<Dossier>;
    }),
    fetch("/data/rules.json").then((r) => r.json() as Promise<RulesDoc>),
  ]);
  const L: NormalizedPayload = normalizePayload(ej);
  const R: NormalizedPayload = normalizePayload(ev2);
  hydrateHumanLabels(dossier, rules);
  return {
    left: { events: L.events, meta: L.meta },
    right: { events: R.events, meta: R.meta },
    valid: buildValidSets(dossier, rules),
  };
}

export default function App() {
  const [layer, setLayer] = useState<ProductLayer>("teaching");
  const [selectedCaseId, setSelectedCaseId] = useState(
    TEACHING_CASES[0].case_id
  );
  const selectedCase = useMemo(
    () => findTeachingCase(selectedCaseId) ?? TEACHING_CASES[0],
    [selectedCaseId]
  );

  const [left, setLeft] = useState<SideState>(emptySide);
  const [right, setRight] = useState<SideState>(emptySide);
  const [valid, setValid] = useState<ValidSets>({
    evidence: new Set(),
    ruleIds: new Set(),
  });
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<PlaySpeed>(1);
  const [error, setError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hasFixtures, setHasFixtures] = useState(false);
  const [leftBanner, setLeftBanner] = useState<SideVerdict | null>(null);
  const [rightBanner, setRightBanner] = useState<SideVerdict | null>(null);
  const [mode, setMode] = useState<UiMode>("replay");
  const [liveRunning, setLiveRunning] = useState(false);

  // Actual-layer single track
  const [liveSide, setLiveSide] = useState<SideState>(emptySide);
  const [liveBanner, setLiveBanner] = useState<SideVerdict | null>(null);
  const [liveSoftHint, setLiveSoftHint] = useState<string | null>(null);
  const [actualRunning, setActualRunning] = useState(false);
  const [actualError, setActualError] = useState<string | null>(null);
  const [actualStatus, setActualStatus] = useState<string | null>(null);
  const [liveFooter, setLiveFooter] = useState(FOOTER_TEAMRUNTIME);
  const [liveSwarmflow, setLiveSwarmflow] = useState(false);
  const [liveEnginePath, setLiveEnginePath] = useState<string>("");
  /** process = Act2 会商过程；final = P3 风险条/结论壳 */
  const [phase, setPhase] = useState<"process" | "final">("process");
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([]);
  const progressSeqRef = useRef(0);

  const fixturesRef = useRef<{ left: FixtureSide; right: FixtureSide } | null>(
    null
  );
  const timerRef = useRef<number | null>(null);
  const leftRef = useRef(left);
  const rightRef = useRef(right);
  const liveSideRef = useRef(liveSide);
  const liveAbortRef = useRef<AbortController | null>(null);
  const actualAbortRef = useRef<AbortController | null>(null);
  leftRef.current = left;
  rightRef.current = right;
  liveSideRef.current = liveSide;

  const applyFixtures = useCallback(
    (pair: { left: FixtureSide; right: FixtureSide; valid: ValidSets }) => {
      fixturesRef.current = { left: pair.left, right: pair.right };
      setValid(pair.valid);
      setHasFixtures(true);
      const L: SideState = {
        events: pair.left.events,
        meta: pair.left.meta,
        idx: -1,
        seen: new Set(),
      };
      const R: SideState = {
        events: pair.right.events,
        meta: pair.right.meta,
        idx: -1,
        seen: new Set(),
      };
      setLeft(L);
      setRight(R);
      leftRef.current = L;
      rightRef.current = R;
      setLeftBanner(null);
      setRightBanner(null);
      setMode("replay");
      setReady(true);
      setError(null);
      setPhase("process");
    },
    []
  );

  const clearFixtures = useCallback(() => {
    fixturesRef.current = null;
    setHasFixtures(false);
    const empty = emptySide();
    setLeft(empty);
    setRight(empty);
    leftRef.current = empty;
    rightRef.current = empty;
    setLeftBanner(null);
    setRightBanner(null);
    setMode("replay");
    setReady(true);
    setError(null);
    setPhase("process");
  }, []);

  // Base evidence/rule sets for chip marking (both layers)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dossier, rules] = await Promise.all([
          fetch("/data/dossier.json").then((r) => r.json() as Promise<Dossier>),
          fetch("/data/rules.json").then((r) => r.json() as Promise<RulesDoc>),
        ]);
        if (!cancelled) {
          hydrateHumanLabels(dossier, rules);
          setValid(buildValidSets(dossier, rules));
        }
      } catch {
        /* optional for live-only path */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load fixtures when teaching case changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReady(false);
      setPlaying(false);
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      try {
        if (!selectedCase.fixtures) {
          if (!cancelled) clearFixtures();
          return;
        }
        const pair = await loadFixturePair(selectedCase);
        if (cancelled || !pair) return;
        applyFixtures(pair);
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setReady(true);
          setHasFixtures(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCase, applyFixtures, clearFixtures]);

  const stopPlay = useCallback(() => {
    setPlaying(false);
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const maxLen = Math.max(left.events.length, right.events.length);
  const stepLabel =
    mode === "live" && liveRunning
      ? `live ${Math.max(left.events.length, right.events.length)}`
      : `${Math.max(left.idx, right.idx) + 1} / ${maxLen || 0}`;

  const stepOnce = useCallback(() => {
    const a = advance(leftRef.current);
    const b = advance(rightRef.current);
    setLeft(a.next);
    setRight(b.next);
    leftRef.current = a.next;
    rightRef.current = b.next;

    if (a.finished) {
      setLeftBanner(sideVerdict("left", a.next.events, a.next.meta));
    }
    if (b.finished) {
      setRightBanner(sideVerdict("right", b.next.events, b.next.meta));
    }

    if (!a.advanced && !b.advanced) {
      stopPlay();
      setPhase("final");
      return false;
    }
    return true;
  }, [stopPlay]);

  const reset = useCallback(() => {
    stopPlay();
    setPhase("process");
    if (mode === "live") {
      const empty = emptySide();
      setLeft(empty);
      setRight(empty);
      leftRef.current = empty;
      rightRef.current = empty;
      setLeftBanner(null);
      setRightBanner(null);
      setLiveError(null);
      return;
    }
    setLeft((s) => ({ ...s, idx: -1, seen: new Set() }));
    setRight((s) => ({ ...s, idx: -1, seen: new Set() }));
    setLeftBanner(null);
    setRightBanner(null);
  }, [stopPlay, mode]);

  const restoreReplay = useCallback(() => {
    stopPlay();
    setPhase("process");
    liveAbortRef.current?.abort();
    liveAbortRef.current = null;
    setLiveRunning(false);
    setLiveError(null);
    setMode("replay");
    const fx = fixturesRef.current;
    if (!fx) return;
    const L: SideState = {
      events: fx.left.events,
      meta: fx.left.meta,
      idx: -1,
      seen: new Set(),
    };
    const R: SideState = {
      events: fx.right.events,
      meta: fx.right.meta,
      idx: -1,
      seen: new Set(),
    };
    setLeft(L);
    setRight(R);
    leftRef.current = L;
    rightRef.current = R;
    setLeftBanner(null);
    setRightBanner(null);
  }, [stopPlay]);

  const togglePlay = useCallback(() => {
    if (mode !== "replay" || !hasFixtures) return;
    if (playing) {
      stopPlay();
      return;
    }
    const L = leftRef.current;
    const R = rightRef.current;
    const atEnd =
      L.idx >= L.events.length - 1 && R.idx >= R.events.length - 1;
    if (atEnd && L.events.length > 0) {
      setLeft((s) => ({ ...s, idx: -1, seen: new Set() }));
      setRight((s) => ({ ...s, idx: -1, seen: new Set() }));
      setLeftBanner(null);
      setRightBanner(null);
      leftRef.current = { ...L, idx: -1, seen: new Set() };
      rightRef.current = { ...R, idx: -1, seen: new Set() };
    }
    setPlaying(true);
    window.setTimeout(() => {
      if (!stepOnce()) return;
      timerRef.current = window.setInterval(() => {
        if (!stepOnce()) stopPlay();
      }, Math.max(120, Math.round(PLAY_MS / playSpeed)));
    }, 0);
  }, [playing, playSpeed, stepOnce, stopPlay, mode, hasFixtures]);

  // 倍速变更时若正在播放，按新间隔重开定时器
  useEffect(() => {
    if (!playing || mode !== "replay" || !hasFixtures) return;
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setInterval(() => {
      if (!stepOnce()) stopPlay();
    }, Math.max(120, Math.round(PLAY_MS / playSpeed)));
    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playSpeed]); // eslint-disable-line react-hooks/exhaustive-deps — only rebind on speed

  useEffect(
    () => () => {
      stopPlay();
      liveAbortRef.current?.abort();
      actualAbortRef.current?.abort();
    },
    [stopPlay]
  );

  const onStep = useCallback(() => {
    if (mode !== "replay" || !hasFixtures) return;
    stopPlay();
    stepOnce();
  }, [stopPlay, stepOnce, mode, hasFixtures]);

  const runOneTrack = useCallback(
    async (
      gate: boolean,
      side: "left" | "right",
      signal: AbortSignal,
      caseId?: string
    ) => {
      const setSide = side === "left" ? setLeft : setRight;
      const setBanner = side === "left" ? setLeftBanner : setRightBanner;
      const ref = side === "left" ? leftRef : rightRef;

      const start = emptySide();
      setSide(start);
      ref.current = start;
      setBanner(null);

      const body =
        caseId !== undefined
          ? { gate, case_id: caseId }
          : { gate };

      const done = await streamLiveDebate(
        body,
        {
          onMeta: (data) => {
            setSide((prev) => {
              const next = { ...prev, meta: mergeMeta(prev.meta, data) };
              ref.current = next;
              return next;
            });
          },
          onEvent: (data) => {
            setSide((prev) => {
              const next = appendLiveEvent(prev, data);
              ref.current = next;
              return next;
            });
          },
          onDone: (data) => {
            setSide((prev) => {
              const meta = mergeMeta(prev.meta, data);
              let events = prev.events;
              // Prefer streamed SCHEMA; adopt done.events only when feed empty
              // or still only progress placeholders (backend often dumps SCHEMA in done)
              if (
                onlyProvisionalOrEmpty(events) &&
                Array.isArray(data.events) &&
                (data.events as unknown[]).length > 0
              ) {
                events = data.events as DebateEvent[];
              }
              const seen = new Set<string>();
              for (const ev of events) {
                if (ev.node) seen.add(ev.node);
              }
              const next: SideState = {
                events,
                meta,
                idx: events.length - 1,
                seen,
              };
              ref.current = next;
              setBanner(sideVerdict(side, next.events, next.meta));
              return next;
            });
          },
        },
        { signal }
      );
      return done;
    },
    []
  );

  /** Teaching-layer demo: sequential dual-track (not product live form). */
  const startTeachingLiveDemo = useCallback(async () => {
    if (liveRunning) return;
    stopPlay();
    setPhase("process");
    setLiveError(null);
    setMode("live");
    setLiveRunning(true);
    setLeftBanner(null);
    setRightBanner(null);
    const empty = emptySide();
    setLeft(empty);
    setRight(empty);
    leftRef.current = empty;
    rightRef.current = empty;

    const ac = new AbortController();
    liveAbortRef.current = ac;

    try {
      const ok = await checkLiveHealth();
      if (!ok) {
        throw new LiveSseError(
          "连不上本机 5180。请先启动 spike/live_server.py，再重试。",
          "health"
        );
      }
      const caseId = selectedCase.case_id;
      await runOneTrack(false, "left", ac.signal, caseId);
      await runOneTrack(true, "right", ac.signal, caseId);
    } catch (e) {
      setLiveError(formatLiveUserError(e));
    } finally {
      setLiveRunning(false);
      liveAbortRef.current = null;
      // 双轨跑完（或中断后已有结论）→ 进最终壳
      const L = leftRef.current;
      const R = rightRef.current;
      if (L.events.length || R.events.length) setPhase("final");
    }
  }, [liveRunning, stopPlay, runOneTrack, selectedCase.case_id]);

  /** Actual layer: Swarm 展示轨（默认）或旁路 live；单轨，无教学双轨。 */
  const startActualLive = useCallback(
    async (
      body: LiveDebateBody,
      softHint: string | undefined,
      opts: LiveSubmitOpts
    ) => {
      if (actualRunning) return;
      setPhase("process");
      setLiveSoftHint(softHint ?? null);
      setActualError(null);
      setActualRunning(true);
      setLiveBanner(null);
      setLiveSwarmflow(false);
      setLiveFooter(FOOTER_TEAMRUNTIME);
      setLiveEnginePath(opts.useSwarm ? SWARM_PATH : "/v1/debate/live");
      setProgressLines([]);
      progressSeqRef.current = 0;
      setActualStatus(
        opts.useSwarm
          ? "会商中…（走 Swarm 轨，边开边推）"
          : "会商中…（旁路 live，非 SwarmFlow）"
      );
      const empty = emptySide();
      setLiveSide(empty);
      liveSideRef.current = empty;

      const ac = new AbortController();
      actualAbortRef.current = ac;

      const bindHandlers = () => ({
        onMeta: (data: Record<string, unknown>) => {
          setLiveSide((prev) => {
            const next = { ...prev, meta: mergeMeta(prev.meta, data) };
            liveSideRef.current = next;
            return next;
          });
          if (data.progress_streaming === true) {
            setActualStatus("会商中…（中间进度实时推）");
          }
        },
        onProgress: (data: Record<string, unknown>) => {
          const kind =
            typeof data.kind === "string" ? data.kind : "progress";
          const text =
            typeof data.text === "string" && data.text.trim()
              ? data.text.trim()
              : typeof data.message === "string" && data.message.trim()
                ? data.message.trim()
                : kind;
          const seq =
            typeof data.seq === "number"
              ? data.seq
              : ++progressSeqRef.current;
          const ts = typeof data.ts === "string" ? data.ts : undefined;
          const id = `p-${seq}-${kind}-${ts || progressSeqRef.current}`;
          setProgressLines((prev) => [
            ...prev,
            { id, kind, text, ts, seq },
          ]);
          setActualStatus(`会商中… ${text}`);
          const label =
            typeof data.label === "string" ? data.label.trim() : "";
          if (label && OFFICER_SET.has(label)) {
            setLiveSide((prev) => {
              const next = upsertProgressEvent(prev, label, text);
              liveSideRef.current = next;
              return next;
            });
          }
        },
        onEvent: (data: Record<string, unknown>) => {
          setLiveSide((prev) => {
            const next = appendLiveEvent(prev, data);
            liveSideRef.current = next;
            return next;
          });
        },
        onDone: (data: Record<string, unknown>) => {
          setLiveSide((prev) => {
            const meta = mergeMeta(prev.meta, data);
            let events = prev.events;
            // Prefer streamed SCHEMA; adopt done.events only when feed empty
            // or still only progress placeholders (backend often dumps SCHEMA in done)
            if (
              onlyProvisionalOrEmpty(events) &&
              Array.isArray(data.events) &&
              (data.events as unknown[]).length > 0
            ) {
              events = data.events as DebateEvent[];
            }
            const seen = new Set<string>();
            for (const ev of events) {
              if (ev.node) seen.add(ev.node);
            }
            const next: SideState = {
              events,
              meta,
              idx: events.length - 1,
              seen,
            };
            liveSideRef.current = next;
            setLiveBanner(liveLayerVerdict(next.events, next.meta));
            return next;
          });
        },
      });

      try {
        const ok = await checkLiveHealth();
        if (!ok) {
          throw new LiveSseError(
            "连不上本机 5180。表单已通过本地校验；请先启动 spike/live_server.py，再重试。",
            "health"
          );
        }

        const injectFail =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("force_swarm_fail") ===
            "1";
        const swarmBody = injectFail
          ? { ...body, force_swarm_fail: true }
          : body;

        const result = opts.useSwarm
          ? await streamSwarmDebate(
              swarmBody,
              {
                ...bindHandlers(),
                onDowngrade: (info) => {
                  // 清掉失败半成品，诚实降级（不宣称 Swarm 成功）
                  const cleared = emptySide();
                  setLiveSide(cleared);
                  liveSideRef.current = cleared;
                  setLiveBanner(null);
                  setProgressLines([]);
                  progressSeqRef.current = 0;
                  setLiveSwarmflow(false);
                  setLiveFooter(FOOTER_TEAMRUNTIME);
                  setLiveEnginePath("/v1/debate/live");
                  setActualStatus(
                    "平台 Swarm 轨失败，正在自动改走旁路会商…"
                  );
                  setActualError(
                    info.hint ||
                      info.message ||
                      "Swarm 轨失败，未完成 SwarmFlow；已自动回退旁路会商"
                  );
                },
              },
              { signal: ac.signal }
            )
          : await streamTeamruntimeDebate(body, bindHandlers(), {
              signal: ac.signal,
            });

        setLiveSwarmflow(result.swarmflow);
        setLiveFooter(result.footer);
        setLiveEnginePath(result.path);
        if (result.downgraded) {
          setActualError(null);
          setActualStatus("旁路会商已完成（本次非 SwarmFlow）");
        } else {
          setActualError(null);
          setActualStatus(null);
        }
      } catch (e) {
        setActualError(formatLiveUserError(e));
        setLiveSwarmflow(false);
        setLiveFooter(FOOTER_TEAMRUNTIME);
        setActualStatus(null);
      } finally {
        setActualRunning(false);
        actualAbortRef.current = null;
        // Act2 结束 → P3 最终交付壳（有事件或已出 banner）
        const cur = liveSideRef.current;
        if (cur.events.length > 0 || cur.meta.gate_verdict) {
          setPhase("final");
        }
      }
    },
    [actualRunning]
  );

  const onLayerChange = useCallback(
    (next: ProductLayer) => {
      if (next === layer) return;
      stopPlay();
      liveAbortRef.current?.abort();
      actualAbortRef.current?.abort();
      setLiveRunning(false);
      setActualRunning(false);
      setLiveError(null);
      setActualError(null);
      setActualStatus(null);
      setLiveFooter(FOOTER_TEAMRUNTIME);
      setLiveSwarmflow(false);
      setLiveEnginePath("");
      setProgressLines([]);
      progressSeqRef.current = 0;
      setPhase("process");
      setLayer(next);
    },
    [layer, stopPlay]
  );

  const footer = layer === "live" ? liveFooter : FOOTER_TEACHING;

  const rightSub =
    mode === "live"
      ? "live · gate:true"
      : hasFixtures
        ? `${selectedCase.case_id} · gate refuse`
        : "无 fixtures";

  if (error && layer === "teaching") {
    return (
      <pre className="boot-error">
        加载失败：{error}
        {"\n"}请用 npm run dev 打开（见 README）。
      </pre>
    );
  }

  const teachingFinalVerdict =
    rightBanner ||
    leftBanner ||
    sideVerdict("right", right.events, right.meta) ||
    sideVerdict("left", left.events, left.meta);
  const liveFinalVerdict =
    liveBanner || liveLayerVerdict(liveSide.events, liveSide.meta);

  return (
    <div
      className={`app mode-${layer === "live" ? "live" : mode}${
        phase === "final" ? " phase-final" : ""
      }`}
    >
      <header className="top">
        <p className="eyebrow">
          {phase === "final"
            ? "openJiuwen · 最终交付"
            : "openJiuwen · Demo Act 2"}
        </p>
        <h1>
          {phase === "final"
            ? "反诈侦探团 · 风险条与结论"
            : "反诈侦探团 · 典型事例展示 / 真实使用"}
        </h1>
        <p className="tagline">「连 AI 自己都会骗，所以要有审判官」</p>
      </header>

      <LayerTabs
        layer={layer}
        onChange={onLayerChange}
        disabled={liveRunning || actualRunning}
      />

      {phase === "final" && layer === "teaching" && teachingFinalVerdict ? (
        <FinalShell
          verdict={teachingFinalVerdict}
          meta={right.meta.gate_verdict ? right.meta : left.meta}
          risk={riskFromGate(
            (right.meta.gate_verdict
              ? right.meta.gate_verdict
              : left.meta.gate_verdict) as string | undefined,
            teachingFinalVerdict,
            right.meta.gate_verdict ? right.meta : left.meta
          )}
          contrast={null}
          onReviewProcess={() => setPhase("process")}
          onRestart={() => {
            reset();
            setPhase("process");
          }}
        />
      ) : phase === "final" && layer === "live" && liveFinalVerdict ? (
        <FinalShell
          verdict={liveFinalVerdict}
          meta={liveSide.meta}
          risk={riskFromGate(
            liveSide.meta.gate_verdict as string | undefined,
            liveFinalVerdict,
            liveSide.meta
          )}
          enginePath={liveEnginePath}
          swarmflow={liveSwarmflow}
          onReviewProcess={() => setPhase("process")}
          onRestart={() => {
            setPhase("process");
            setLiveBanner(null);
            setLiveSide(emptySide());
            liveSideRef.current = emptySide();
            setProgressLines([]);
            progressSeqRef.current = 0;
            setActualError(null);
            setActualStatus(null);
            setLiveSoftHint(null);
            setLiveSwarmflow(false);
            setLiveFooter(FOOTER_TEAMRUNTIME);
            setLiveEnginePath("");
          }}
        />
      ) : layer === "teaching" ? (
        <>
          <CasePicker
            cases={TEACHING_CASES}
            selectedId={selectedCaseId}
            onSelect={setSelectedCaseId}
            disabled={liveRunning}
          />
          <TeachingMeta meta={selectedCase} />

          {!ready ? (
            <div className="boot-loading">加载事件流…</div>
          ) : (
            <>
              <Toolbar
                mode={mode}
                playing={playing}
                liveRunning={liveRunning}
                stepLabel={stepLabel}
                hasFixtures={hasFixtures}
                playSpeed={playSpeed}
                onPlay={togglePlay}
                onStep={onStep}
                onReset={reset}
                onLive={startTeachingLiveDemo}
                onBackReplay={restoreReplay}
                onSpeed={setPlaySpeed}
              />

              {liveError ? (
                <div className="live-error" role="alert">
                  {liveError}
                </div>
              ) : null}

              {hasFixtures ? (
                /* Default UI: 有卡口 only. 无卡口 fixtures still load into `left` for logic/contrast data, but are not rendered. */
                <main className="cols cols-single">
                  <Column
                    side="right"
                    title="有卡口（规则盖章）"
                    subtitle={rightSub}
                    events={right.events}
                    idx={right.idx}
                    seen={right.seen}
                    valid={valid}
                    verdict={rightBanner}
                    meta={right.meta}
                  />
                </main>
              ) : (
                <div className="placeholder-panel">
                  本案例暂无事件流 fixtures，请先阅读上方学习要点；请选{" "}
                  <strong>CASE-SPIKE-FAB-001</strong>。
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="live-layer">
          <LiveForm running={actualRunning} onSubmit={startActualLive} />
          {liveSoftHint ? (
            <div className="form-hint centered">{liveSoftHint}</div>
          ) : null}
          {actualStatus ? (
            <div className="live-status" role="status">
              {actualStatus}
            </div>
          ) : null}
          {actualError ? (
            <div className="live-error" role="alert">
              {actualError}
            </div>
          ) : null}
          <ProgressTimeline
            lines={progressLines}
            compact
            waiting={actualRunning && progressLines.length === 0}
          />
          <main className="cols cols-single cols-stage">
            <Column
              side="right"
              title="现场裁定"
              subtitle={[
                `gate:${String(liveSide.meta.gate_verdict ?? liveSide.meta.gate ?? "—")}`,
                `case:${liveSide.meta.case_id || "—"}`,
                liveEnginePath
                  ? `path:${liveEnginePath}`
                  : null,
                liveSwarmflow
                  ? "swarmflow:true"
                  : actualRunning
                    ? "swarmflow:…"
                    : "swarmflow:false",
              ]
                .filter(Boolean)
                .join(" · ")}
              events={liveSide.events}
              idx={liveSide.idx}
              seen={liveSide.seen}
              valid={valid}
              verdict={liveBanner}
              meta={liveSide.meta}
            />
          </main>
        </div>
      )}

      <footer className={`foot${layer === "live" && liveSwarmflow ? " foot-swarm" : ""}`}>{footer}</footer>
    </div>
  );
}
