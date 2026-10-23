import type { DebateEvent } from "../types";
import { NODES } from "../types";

export type GraphNodeStatus = "idle" | "done" | "active";

export interface GraphNode {
  id: string;
  label: string;
  role?: string;
  status: GraphNodeStatus;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** newest edge — play draw animation */
  fresh?: boolean;
}

const OFFICER_ORDER = NODES.filter((n) => n !== "human_confirm");

const GLYPH: Record<string, string> = {
  特征官: "特",
  证据官: "证",
  风险官: "险",
  合规官: "合",
  用户保护官: "护",
  反方官: "反",
  审判官: "审",
  human_confirm: "确",
};

const NODE_LABEL: Record<string, string> = {
  human_confirm: "人工确认",
};

export function officerGlyph(id: string): string {
  return GLYPH[id] || id.slice(0, 1) || "?";
}

/** Audience-facing name; hide SCHEMA jargon like human_confirm */
export function officerLabel(id: string): string {
  return NODE_LABEL[id] || id;
}

const ROLE_BLURB: Record<string, string> = {
  特征官: "抽话术特征",
  证据官: "核验证据",
  风险官: "评风险等级",
  合规官: "对规则条款",
  反方官: "反方质证",
  用户保护官: "护用户权益",
  审判官: "综合裁定",
  human_confirm: "人工拍板",
};

/** Short role purpose shown beside the officer name */
export function officerRole(id: string): string {
  return ROLE_BLURB[id] || "";
}


export function verdictLabel(v: string): string {
  const m: Record<string, string> = {
    convict: "定罪建议",
    refuse: "拒判",
    pass: "通过",
    approved: "已确认",
  };
  return m[v] || v;
}

/** Build force-graph nodes/edges from currently visible SCHEMA events. */
export function buildDebateGraph(
  visible: DebateEvent[],
  activeNode: string | null
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const order: string[] = [];
  const spoken = new Set<string>();
  for (const ev of visible) {
    const n = ev.node;
    if (!n) continue;
    if (!spoken.has(n)) {
      spoken.add(n);
      order.push(n);
    }
  }

  // Prefer known officer order for stable layout when present
  const nodes: GraphNode[] = order.map((id) => ({
    id,
    label: officerLabel(id),
    role: officerRole(id),
    status:
      activeNode === id ? "active" : spoken.has(id) ? "done" : "idle",
  }));

  const edges: GraphEdge[] = [];
  for (let i = 1; i < order.length; i++) {
    const source = order[i - 1];
    const target = order[i];
    if (source === target) continue;
    edges.push({
      id: `e-${source}-${target}-${i}`,
      source,
      target,
      fresh: i === order.length - 1,
    });
  }

  return { nodes, edges };
}

/** Latest event for a given officer within visible window. */
export function latestEventForNode(
  visible: DebateEvent[],
  nodeId: string
): DebateEvent | null {
  for (let i = visible.length - 1; i >= 0; i--) {
    if (visible[i].node === nodeId) return visible[i];
  }
  return null;
}

export function knownOfficers(): readonly string[] {
  return OFFICER_ORDER;
}
