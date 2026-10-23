import type { DebateEvent, PayloadMeta, ValidSets } from "../types";
import { isFabricated } from "../lib/validSets";
import { humanLabel } from "../lib/humanLabels";
import {
  latestEventForNode,
  officerLabel,
  officerRole,
  verdictLabel,
} from "../lib/debateGraph";

interface Props {
  selectedId: string | null;
  visible: DebateEvent[];
  seen: Set<string>;
  valid: ValidSets;
  meta?: PayloadMeta;
  title: string;
  onClear: () => void;
  onSelect: (id: string) => void;
}

function Chip({
  id,
  kind,
  valid,
}: {
  id: string;
  kind: "evidence" | "rule";
  valid: ValidSets;
}) {
  const bad = isFabricated(id, kind, valid);
  const label = humanLabel(id, kind);
  return (
    <span
      className={`chip${bad ? " bad" : ""}`}
      title={id}
      aria-label={`${label}（${id}）`}
    >
      <span className="chip-label">{label}</span>
      <span className="chip-id" aria-hidden="true">
        {id}
      </span>
      {bad ? <em className="chip-mark">无据</em> : null}
    </span>
  );
}

function formatTs(ts?: string): string {
  if (!ts) return "";
  return ts.replace("+08:00", " Asia/Shanghai");
}

export function DebateAside({
  selectedId,
  visible,
  seen,
  valid,
  meta,
  title,
  onClear,
  onSelect,
}: Props) {
  const ev: DebateEvent | null = selectedId
    ? latestEventForNode(visible, selectedId)
    : null;

  if (selectedId && ev) {
    return (
      <aside className="debate-aside">
        <button type="button" className="da-back" onClick={onClear}>
          ← 返回本轨概览
        </button>
        <div className="da-head">
          <span className="da-dot" aria-hidden />
          <div>
            <h3>{officerLabel(selectedId)}</h3>
        {officerRole(selectedId) ? (
          <p className="da-role">{officerRole(selectedId)}</p>
        ) : null}
            <p className="da-ts">{formatTs(ev.ts)}</p>
          </div>
        </div>
        <div className="da-text">{ev.text || "（无正文）"}</div>
        <h4>证据与规则</h4>
        <div className="ids da-ids">
          {(ev.evidence_ids || []).map((id) => (
            <Chip key={`e-${id}`} id={id} kind="evidence" valid={valid} />
          ))}
          {(ev.rule_ids || []).map((id) => (
            <Chip key={`r-${id}`} id={id} kind="rule" valid={valid} />
          ))}
          {!ev.evidence_ids?.length && !ev.rule_ids?.length ? (
            <span className="da-dim">本轮未引用证据/规则编号</span>
          ) : null}
        </div>
        {ev.verdict ? (
          <div className="da-callout">裁定 · {verdictLabel(String(ev.verdict))}</div>
        ) : null}
        {ev.refuse_reason ? (
          <div className="da-callout warn">
            拒因 · {String(ev.refuse_reason)}
          </div>
        ) : null}
      </aside>
    );
  }

  if (selectedId && !ev) {
    return (
      <aside className="debate-aside">
        <button type="button" className="da-back" onClick={onClear}>
          ← 返回本轨概览
        </button>
        <h3>{officerLabel(selectedId)}</h3>
        {officerRole(selectedId) ? (
          <p className="da-role">{officerRole(selectedId)}</p>
        ) : null}
        {officerRole(selectedId) ? (
          <p className="da-role">{officerRole(selectedId)}</p>
        ) : null}
        <p className="da-dim">该官尚未在本轮发言</p>
      </aside>
    );
  }

  const spoken = [...seen];
  const latest = visible.length > 0 ? visible[visible.length - 1] : null;
  const gate =
    meta?.gate_verdict ??
    (meta?.gate !== undefined ? String(meta.gate) : undefined);

  return (
    <aside className="debate-aside">
      <h3>{title} · 概览</h3>
      <p className="da-dim">点左侧官员节点，查看论证全文与证据</p>
      <div className="da-stats">
        <div className="da-stat">
          <b>{spoken.length}</b>已发言官
        </div>
        <div className="da-stat">
          <b>{visible.length}</b>事件
        </div>
        <div className="da-stat">
          <b>{gate ?? "—"}</b>gate
        </div>
      </div>
      {spoken.length > 0 ? (
        <>
          <h4>已连线官员</h4>
          <ul className="da-list">
            {spoken.map((id) => (
              <li key={id}>
                <button type="button" onClick={() => onSelect(id)}>
                  {id}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {latest ? (
        <>
          <h4>最新一句</h4>
          <button
            type="button"
            className="da-latest"
            onClick={() => latest.node && onSelect(latest.node)}
          >
            <strong>{officerLabel(latest.node || "?")}</strong>
            <span>
              {(latest.text || "").length > 80
                ? `${(latest.text || "").slice(0, 80)}…`
                : latest.text || "（空）"}
            </span>
          </button>
        </>
      ) : (
        <p className="da-dim" style={{ marginTop: 16 }}>
          还没有官员发言 · 提交后这里会跟上
        </p>
      )}
    </aside>
  );
}
