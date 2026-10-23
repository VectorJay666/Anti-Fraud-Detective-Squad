/* openJiuwen · 转账前保镖 · 第二幕对照回放
 * 平台会商事件流（events-platform*）+ rule_gate — not SwarmFlow E2E
 */
const NODES = ["特征官", "证据官", "风险官", "合规官", "用户保护官", "反方官", "审判官", "human_confirm"];
const PLAY_MS = 900;

/** Normalize: bare array OR { events: [] } wrapper */
function normalizePayload(raw) {
  if (Array.isArray(raw)) {
    return { events: raw, meta: {} };
  }
  const events = Array.isArray(raw.events) ? raw.events : [];
  const { events: _e, ...meta } = raw;
  return { events, meta };
}

function buildValidSets(dossier, rules) {
  const evidence = new Set(
    (dossier.evidence || []).map((e) => e.id).filter(Boolean)
  );
  const ruleIds = new Set(
    (rules.rules || []).map((r) => r.id).filter(Boolean)
  );
  return { evidence, ruleIds };
}

function isFabricated(id, kind, valid) {
  if (kind === "evidence") return !valid.evidence.has(id);
  return !valid.ruleIds.has(id);
}

function renderNodeRail(container) {
  container.innerHTML = "";
  NODES.forEach((name, i) => {
    const row = document.createElement("div");
    row.className = "node";
    row.dataset.node = name;
    row.innerHTML = `<span class="dot"></span><span class="label">${name}</span>`;
    container.appendChild(row);
    if (i < NODES.length - 1) {
      const rail = document.createElement("div");
      rail.className = "node-rail";
      container.appendChild(rail);
    }
  });
}

function lightNodes(container, seen) {
  container.querySelectorAll(".node").forEach((el) => {
    el.classList.toggle("on", seen.has(el.dataset.node));
  });
}

function chipHtml(ids, kind, valid) {
  return (ids || [])
    .map((id) => {
      const bad = isFabricated(id, kind, valid);
      return `<span class="chip${bad ? " bad" : ""}">${id}</span>`;
    })
    .join("");
}

function renderEventCard(ev, valid) {
  const el = document.createElement("div");
  el.className = "card";
  const ts = (ev.ts || "").replace("+08:00", " Asia/Shanghai");
  el.innerHTML = `
    <div class="meta"><span>${ev.node || "?"}</span><span>${ts}</span></div>
    <div class="text">${escapeHtml(ev.text || "")}</div>
    <div class="ids">
      ${chipHtml(ev.evidence_ids, "evidence", valid)}
      ${chipHtml(ev.rule_ids, "rule", valid)}
    </div>`;
  return el;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sideVerdict(side, events, meta) {
  // Prefer gate meta on right; human_confirm / verdict on events
  if (side === "right") {
    const gate = meta.gate_verdict || "";
    const reason =
      meta.refuse_reason ||
      [...events].reverse().find((e) => e.refuse_reason)?.refuse_reason ||
      "";
    if (gate === "refuse" || events.some((e) => e.verdict === "refuse")) {
      return {
        kind: "refuse",
        title: "规则盖章 · refuse",
        body: reason || "定罪引用不在案卷/规则库，打回。",
      };
    }
  }
  // left: approved HITL
  const hitl = [...events].reverse().find((e) => e.node === "human_confirm");
  if (hitl && hitl.approved === true) {
    return {
      kind: "ok",
      title: "无卡口 · 放行",
      body: "human_confirm approved true — 编造证据 EV-FAB-TRANSFER / 假条款 R-99 被放行（无 rule_gate）",
    };
  }
  const convict = events.find((e) => e.verdict === "convict" || e.verdict === "pass");
  if (convict) {
    return {
      kind: "ok",
      title: `终裁 · ${convict.verdict}`,
      body: convict.text || "",
    };
  }
  return null;
}

const state = {
  left: { events: [], meta: {}, idx: -1, seen: new Set() },
  right: { events: [], meta: {}, idx: -1, seen: new Set() },
  valid: { evidence: new Set(), ruleIds: new Set() },
  playing: false,
  timer: null,
};

function maxLen() {
  return Math.max(state.left.events.length, state.right.events.length);
}

function updateStepLabel() {
  const i = Math.max(state.left.idx, state.right.idx) + 1;
  document.getElementById("step-label").textContent = `${i} / ${maxLen()}`;
}

function advanceSide(side) {
  const s = state[side];
  const next = s.idx + 1;
  if (next >= s.events.length) return false;
  s.idx = next;
  const ev = s.events[next];
  if (ev.node) s.seen.add(ev.node);

  const feed = document.getElementById(`feed-${side}`);
  feed.appendChild(renderEventCard(ev, state.valid));
  feed.scrollTop = feed.scrollHeight;

  lightNodes(document.getElementById(`nodes-${side}`), s.seen);

  // Banner when this side finished
  if (s.idx === s.events.length - 1) {
    const v = sideVerdict(side, s.events, s.meta);
    const banner = document.getElementById(`banner-${side}`);
    if (v) {
      banner.hidden = false;
      banner.className = `banner ${v.kind === "refuse" ? "refuse" : "ok"}`;
      banner.innerHTML = `<div class="title">${escapeHtml(v.title)}</div><div>${escapeHtml(v.body)}</div>`;
    }
  }
  return true;
}

function stepOnce() {
  const a = advanceSide("left");
  const b = advanceSide("right");
  updateStepLabel();
  if (!a && !b) {
    stopPlay();
    return false;
  }
  return true;
}

function reset() {
  stopPlay();
  ["left", "right"].forEach((side) => {
    state[side].idx = -1;
    state[side].seen = new Set();
    document.getElementById(`feed-${side}`).innerHTML = "";
    const banner = document.getElementById(`banner-${side}`);
    banner.hidden = true;
    banner.innerHTML = "";
    banner.className = "banner";
    lightNodes(document.getElementById(`nodes-${side}`), state[side].seen);
  });
  updateStepLabel();
}

function stopPlay() {
  state.playing = false;
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  document.getElementById("btn-play").textContent = "Play";
}

function togglePlay() {
  if (state.playing) {
    stopPlay();
    return;
  }
  // If already at end, reset then play
  if (
    state.left.idx >= state.left.events.length - 1 &&
    state.right.idx >= state.right.events.length - 1
  ) {
    reset();
  }
  state.playing = true;
  document.getElementById("btn-play").textContent = "Pause";
  stepOnce();
  state.timer = setInterval(() => {
    if (!stepOnce()) stopPlay();
  }, PLAY_MS);
}

async function boot() {
  renderNodeRail(document.getElementById("nodes-left"));
  renderNodeRail(document.getElementById("nodes-right"));

  const [ej, ev2, dossier, rules] = await Promise.all([
    fetch("data/events.json").then((r) => r.json()),
    fetch("data/events-v2.json").then((r) => r.json()),
    fetch("data/dossier.json").then((r) => r.json()),
    fetch("data/rules.json").then((r) => r.json()),
  ]);

  state.valid = buildValidSets(dossier, rules);
  const L = normalizePayload(ej);
  const R = normalizePayload(ev2);
  state.left.events = L.events;
  state.left.meta = L.meta;
  state.right.events = R.events;
  state.right.meta = R.meta;

  updateStepLabel();

  document.getElementById("btn-play").addEventListener("click", togglePlay);
  document.getElementById("btn-step").addEventListener("click", () => {
    stopPlay();
    stepOnce();
  });
  document.getElementById("btn-reset").addEventListener("click", reset);
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<pre style="color:#ff3b30;padding:16px">加载失败：${escapeHtml(String(err))}\n请用本地静态服务器打开（见 README）。</pre>`
  );
});
