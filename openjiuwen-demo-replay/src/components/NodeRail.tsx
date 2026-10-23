import { NODES } from "../types";

interface Props {
  seen: Set<string>;
  /** Current speaker (latest visible event node) */
  active?: string | null;
  tone: "ok" | "refuse";
  /** Click a seen officer to re-read their speech in the aside */
  onSelect?: (id: string) => void;
}

const RAIL_NODES = NODES.filter((n) => n !== "human_confirm");

export function NodeRail({ seen, active, tone, onSelect }: Props) {
  return (
    <div className={`nodes tone-${tone}`} role="list" aria-label="会商角色">
      {RAIL_NODES.map((name, i) => {
        const on = seen.has(name);
        const isActive = Boolean(active && active === name);
        const clickable = Boolean(on && onSelect);
        const cls = [
          "node",
          on ? "on" : "",
          isActive ? "active" : "",
          clickable ? "clickable" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={name} className="node-slot" role="listitem">
            {i > 0 ? <div className="node-rail" aria-hidden="true" /> : null}
            <button
              type="button"
              className={cls}
              data-node={name}
              title={clickable ? `查看${name}发言` : name}
              disabled={!clickable}
              onClick={() => {
                if (clickable) onSelect?.(name);
              }}
            >
              <span className="dot" />
              <span className="label">{name}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
