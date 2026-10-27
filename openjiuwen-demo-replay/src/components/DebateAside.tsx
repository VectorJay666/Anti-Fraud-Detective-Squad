import type { DebateEvent, PayloadMeta, ValidSets } from "../types";
import { isFabricated } from "../lib/validSets";
import { humanLabel } from "../lib/humanLabels";
import {
  latestEventForNode,
  officerLabel,
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
          ← 返回分析概览
        </button>
        <div className="da-head">
          <span className="da-dot" aria-hidden />
          <div>
            <h3>{officerLabel(selectedId)}</h3>
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
            核验说明 · {String(ev.refuse_reason)}
          </div>
        ) : null}
      </aside>
    );
  }

  if (selectedId && !ev) {
    return (
      <aside className="debate-aside">
        <button type="button" className="da-back" onClick={onClear}>
          ← 返回分析概览
        </button>
        <h3>{officerLabel(selectedId)}</h3>
        <p className="da-dim">该角色暂未提供分析内容。</p>
      </aside>
    );
  }

  const spoken = [...seen];
  const latest = visible.length > 0 ? visible[visible.length - 1] : null;
  const citedIds = new Set(visible.flatMap(event => [
    ...(event.evidence_ids || []),
    ...(event.rule_ids || []),
  ]));

  return (
    <aside className="debate-aside">
      <h3>{title} · 概览</h3>
      <p className="da-dim">选择角色节点，查看分析内容和引用依据。</p>
      <div className="da-stats">
        <div className="da-stat">
          <b>{spoken.length}</b>参与角色
        </div>
        <div className="da-stat">
          <b>{visible.length}</b>分析记录
        </div>
        <div className="da-stat">
          <b>{citedIds.size}</b>引用依据
        </div>
      </div>
      {spoken.length > 0 ? (
        <>
          <h4>已参与的角色</h4>
          <ul className="da-list">
            {spoken.map((id) => (
              <li key={id}>
                <button type="button" onClick={() => onSelect(id)}>
                  {officerLabel(id)}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {latest ? (
        <>
          <h4>最新分析</h4>
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
          开始检查或播放案例后，这里会展示分析进度。
        </p>
      )}
    </aside>
  );
}
