import { useEffect, useMemo, useState } from "react";
import type {
  DebateEvent,
  PayloadMeta,
  SideVerdict,
  ValidSets,
} from "../types";
import { buildDebateGraph } from "../lib/debateGraph";
import { NodeRail } from "./NodeRail";
import { DebateGraph } from "./DebateGraph";
import { DebateAside } from "./DebateAside";
import { Banner } from "./Banner";

interface Props {
  side: "left" | "right";
  title: string;
  subtitle: string;
  events: DebateEvent[];
  idx: number;
  seen: Set<string>;
  valid: ValidSets;
  verdict: SideVerdict | null;
  meta?: PayloadMeta;
}

export function DebateStage({
  side,
  title,
  subtitle,
  events,
  idx,
  seen,
  valid,
  verdict,
  meta,
}: Props) {
  const tone = side === "left" ? "ok" : "refuse";
  const visible = useMemo(() => events.slice(0, idx + 1), [events, idx]);
  const active =
    visible.length > 0 ? visible[visible.length - 1]?.node || null : null;

  const { nodes, edges } = useMemo(
    () => buildDebateGraph(visible, active),
    [visible, active]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  // Auto-follow current speaker unless user pinned a selection
  useEffect(() => {
    if (!pinned) setSelectedId(active);
  }, [active, pinned]);

  // Reset pin when stream resets
  useEffect(() => {
    if (idx < 0 || visible.length === 0) {
      setPinned(false);
      setSelectedId(null);
    }
  }, [idx, visible.length]);

  const handleSelect = (id: string | null) => {
    if (id == null) {
      setPinned(true);
      setSelectedId(null);
      return;
    }
    setPinned(true);
    setSelectedId(id);
  };

  return (
    <section className={`col col-${side} debate-stage`} data-side={side}>
      <header className="col-head">
        <div className="stage-heading">
          <h2>{title}</h2>
          <span className={`stage-status${visible.length ? " started" : ""}`}>
            {verdict ? "检查完成" : visible.length ? `已展开 ${visible.length} 条分析` : "等待开始"}
          </span>
        </div>
        <details className="stage-record"><summary>运行记录</summary><p className="sub">{subtitle}</p></details>
      </header>
      <NodeRail
        seen={seen}
        active={active}
        tone={tone}
        onSelect={(id) => handleSelect(id)}
      />
      <div className="debate-body">
        <DebateGraph
          nodes={nodes}
          edges={edges}
          selectedId={selectedId}
          tone={tone}
          onSelect={handleSelect}
        />
        <DebateAside
          selectedId={selectedId}
          visible={visible}
          seen={seen}
          valid={valid}
          meta={meta}
          title={title}
          onClear={() => handleSelect(null)}
          onSelect={(id) => handleSelect(id)}
        />
      </div>
      {verdict ? <Banner verdict={verdict} /> : null}
    </section>
  );
}
