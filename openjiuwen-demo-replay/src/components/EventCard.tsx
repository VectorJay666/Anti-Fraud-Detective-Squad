import type { DebateEvent, ValidSets } from "../types";
import { isFabricated } from "../lib/validSets";
import { humanLabel } from "../lib/humanLabels";

interface Props {
  ev: DebateEvent;
  valid: ValidSets;
  /** 0-based index among currently visible cards — drives stagger delay */
  enterIndex?: number;
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

export function EventCard({ ev, valid, enterIndex = 0 }: Props) {
  const ts = (ev.ts || "").replace("+08:00", " Asia/Shanghai");
  const delayMs = Math.min(enterIndex, 12) * 80;
  return (
    <article
      className="card"
      data-enter={enterIndex}
      data-node={ev.node || undefined}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="meta">
        <span className="meta-node">
          <span className="meta-dot" aria-hidden="true" />
          {ev.node || "?"}
        </span>
        <span className="meta-ts">{ts}</span>
      </div>
      <div className="text">{ev.text || ""}</div>
      <div className="ids">
        {(ev.evidence_ids || []).map((id) => (
          <Chip key={`e-${id}`} id={id} kind="evidence" valid={valid} />
        ))}
        {(ev.rule_ids || []).map((id) => (
          <Chip key={`r-${id}`} id={id} kind="rule" valid={valid} />
        ))}
      </div>
    </article>
  );
}
