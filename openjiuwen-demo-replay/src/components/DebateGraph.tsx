import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import type { GraphEdge, GraphNode } from "../lib/debateGraph";
import { officerGlyph } from "../lib/debateGraph";

interface SimNode extends SimulationNodeDatum {
  id: string;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  tone: "ok" | "refuse";
  onSelect: (id: string | null) => void;
}

const NODE_R = 26;

export function DebateGraph({
  nodes,
  edges,
  selectedId,
  tone,
  onSelect,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 480, h: 360 });
  const [tick, setTick] = useState(0);
  const simNodesRef = useRef(new Map<string, SimNode>());
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const dragRef = useRef<{
    p: SimNode;
    moved: boolean;
    x0: number;
    y0: number;
  } | null>(null);
  const nodeIdsKey = nodes.map((n) => n.id).join("|");
  const edgeIdsKey = edges.map((e) => e.id).join("|");

  const rebuild = useCallback(() => {
    const simNodes = simNodesRef.current;
    const ids = new Set(nodes.map((n) => n.id));
    for (const id of [...simNodes.keys()]) {
      if (!ids.has(id)) simNodes.delete(id);
    }
    const { w, h } = size;
    for (const n of nodes) {
      if (simNodes.has(n.id)) continue;
      let anchor: SimNode | null = null;
      for (const e of edges) {
        const other =
          e.source === n.id
            ? e.target
            : e.target === n.id
              ? e.source
              : null;
        if (other && simNodes.has(other)) {
          anchor = simNodes.get(other)!;
          break;
        }
      }
      const a = Math.random() * Math.PI * 2;
      simNodes.set(n.id, {
        id: n.id,
        x: anchor ? anchor.x! + Math.cos(a) * 48 : w / 2 + Math.cos(a) * 36,
        y: anchor ? anchor.y! + Math.sin(a) * 48 : h / 2 + Math.sin(a) * 36,
      });
    }

    const linkData = edges
      .filter((e) => simNodes.has(e.source) && simNodes.has(e.target))
      .map((e) => ({ id: e.id, source: e.source, target: e.target }));
    const nodeData = [...simNodes.values()];

    const pad = NODE_R + 22; // 圆+标签不裁切
    const span = Math.min(w, h);
    // Spread nodes farther (charge more repulsive, longer links, larger collide).
    const charge = span < 420 ? -720 : span < 560 ? -1100 : -1500;
    const linkDist = Math.max(140, Math.min(240, span * 0.48));
    const centerStr = span < 420 ? 0.08 : span < 560 ? 0.045 : 0.025;

    const clampAll = () => {
      for (const p of simNodes.values()) {
        if (p.x == null || p.y == null) continue;
        p.x = Math.max(pad, Math.min(w - pad, p.x));
        p.y = Math.max(pad, Math.min(h - pad - 8, p.y));
      }
    };

    let sim = simRef.current;
    if (!sim) {
      sim = forceSimulation<SimNode>(nodeData)
        .force("charge", forceManyBody().strength(charge))
        .force("collide", forceCollide(NODE_R + 40).iterations(3))
        .force(
          "x",
          forceX(() => w / 2).strength(centerStr)
        )
        .force(
          "y",
          forceY(() => h / 2).strength(centerStr + 0.02)
        )
        .on("tick", () => {
          clampAll();
          setTick((t) => t + 1);
        });
      simRef.current = sim;
    } else {
      sim.force("charge", forceManyBody().strength(charge));
      sim.force("collide", forceCollide(NODE_R + 40).iterations(3));
      sim.force(
        "x",
        forceX(() => w / 2).strength(centerStr)
      );
      sim.force(
        "y",
        forceY(() => h / 2).strength(centerStr + 0.02)
      );
    }
    sim.nodes(nodeData);
    sim.force(
      "link",
      (forceLink(linkData as any) as any)
        .id((d: { id: string }) => d.id)
        .distance(linkDist)
        .strength(0.45)
    );
    sim.force("center", forceCenter(w / 2, h / 2).strength(0.04));
    clampAll();
    sim.alpha(0.75).restart();
  }, [nodes, edges, size]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([en]) => {
      const w = Math.max(200, en.contentRect.width);
      const h = Math.max(220, en.contentRect.height);
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    rebuild();
  }, [rebuild, nodeIdsKey, edgeIdsKey, size.w, size.h]);

  useEffect(() => {
    return () => {
      simRef.current?.stop();
      simRef.current = null;
    };
  }, []);

  // force tick read so render depends on simulation
  void tick;

  const viewNodes = nodes.map((n) => ({
    n,
    p: simNodesRef.current.get(n.id) || { x: size.w / 2, y: size.h / 2 },
  }));
  const viewEdges = edges
    .map((e) => ({
      e,
      a: simNodesRef.current.get(e.source),
      b: simNodesRef.current.get(e.target),
    }))
    .filter((x): x is { e: GraphEdge; a: SimNode; b: SimNode } =>
      Boolean(x.a && x.b && x.a.x != null && x.b.x != null)
    );

  const strokeOk = tone === "ok" ? "#6c8cff" : "#ff5a6e";
  const fillDone = tone === "ok" ? "#3dd6f5" : "#ffb547";
  const fillActive = tone === "ok" ? "#6c8cff" : "#ff5a6e";
  const fillIdle = "#2a3460";

  function nodeFill(status: GraphNode["status"]): string {
    if (status === "active") return fillActive;
    if (status === "done") return fillDone;
    return fillIdle;
  }

  const DRAG_THRESHOLD_PX = 6;

  function onPointerDown(ev: ReactPointerEvent, id: string) {
    const p = simNodesRef.current.get(id);
    const sim = simRef.current;
    if (!p || !sim) return;
    dragRef.current = {
      p,
      moved: false,
      x0: ev.clientX,
      y0: ev.clientY,
    };
    p.fx = p.x;
    p.fy = p.y;
    sim.alphaTarget(0.25).restart();
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
  }

  function onPointerMove(ev: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const pad = NODE_R + 22;
    drag.p.fx = Math.max(pad, Math.min(r.width - pad, ev.clientX - r.left));
    drag.p.fy = Math.max(pad, Math.min(r.height - pad - 8, ev.clientY - r.top));
    if (!drag.moved) {
      const dx = ev.clientX - drag.x0;
      const dy = ev.clientY - drag.y0;
      if (dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        drag.moved = true;
      }
    }
  }

  function onPointerUp(id: string) {
    const drag = dragRef.current;
    const sim = simRef.current;
    if (!drag) return;
    const moved = drag.moved;
    drag.p.fx = null;
    drag.p.fy = null;
    dragRef.current = null;
    sim?.alphaTarget(0);
    if (!moved) onSelect(id);
  }

  const activeId = nodes.find((n) => n.status === "active")?.id;
  return (
    <div
      className={`debate-graph tone-${tone}`}
      ref={wrapRef}
      onPointerMove={onPointerMove}
    >
      <svg width={size.w} height={size.h}>
        <defs>
          <marker
            id={`arr-${tone}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={strokeOk} />
          </marker>
        </defs>
        {viewEdges.map(({ e, a, b }) => {
          const dx = b.x! - a.x!;
          const dy = b.y! - a.y!;
          const len = Math.max(1, Math.hypot(dx, dy));
          const trim = NODE_R + 4;
          const x2 = b.x! - (dx * trim) / len;
          const y2 = b.y! - (dy * trim) / len;
          return (
            <g
              key={e.id}
              className={`dg-edge${e.fresh ? " fresh" : ""}${a.id === activeId || b.id === activeId ? " lit" : ""}`}
              onClick={(ev) => {
                ev.stopPropagation();
                onSelect(e.target);
              }}
            >
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="dg-hit"
              />
              <line
                x1={a.x}
                y1={a.y}
                x2={x2}
                y2={y2}
                stroke={strokeOk}
                markerEnd={`url(#arr-${tone})`}
                className="dg-line"
              />
            </g>
          );
        })}
        {viewNodes.map(({ n, p }) => {
          const sel = selectedId === n.id;
          const fill = nodeFill(n.status);
          return (
            <g
              key={n.id}
              className={[
                "dg-node",
                n.status,
                sel ? "sel" : "",
                n.status === "active" ? "pulse-on" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              transform={`translate(${p.x},${p.y})`}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                onPointerDown(ev, n.id);
              }}
              onPointerUp={(ev) => {
                ev.stopPropagation();
                onPointerUp(n.id);
              }}
            >
              {n.status === "active" ? (
                <circle r={NODE_R + 8} className="dg-halo" stroke={fill} />
              ) : null}
              {n.status === "active" ? (
                <circle r={NODE_R + 4} className="dg-ping" stroke={fill} />
              ) : null}
              <circle r={NODE_R} fill={fill} className="dg-body" />
              <text className="dg-glyph" dy="0.35em">
                {officerGlyph(n.id)}
              </text>
              <text className="dg-label" y={NODE_R + 16}>
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      {nodes.length === 0 ? (
        <div className="dg-empty">提交后官员会在这里逐步连线</div>
      ) : null}
      <div className="dg-legend" aria-hidden>
        <span>
          <i style={{ background: fillActive }} />
          发言中
        </span>
        <span>
          <i style={{ background: fillDone }} />
          已发言
        </span>
        <span>
          <i style={{ background: fillIdle }} />
          待命
        </span>
      </div>
    </div>
  );
}
