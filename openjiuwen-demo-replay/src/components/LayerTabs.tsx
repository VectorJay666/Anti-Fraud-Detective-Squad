import type { ProductLayer } from "../types";

interface Props {
  layer: ProductLayer;
  onChange: (layer: ProductLayer) => void;
  disabled?: boolean;
}

export function LayerTabs({ layer, onChange, disabled }: Props) {
  return (
    <div className="layer-tabs" role="tablist" aria-label="产品层">
      <button
        type="button"
        role="tab"
        aria-selected={layer === "teaching"}
        className={`layer-tab${layer === "teaching" ? " active" : ""}`}
        disabled={disabled}
        onClick={() => onChange("teaching")}
      >
        典型事例展示
        <span className="layer-tab-sub">经典案 · 回放对照</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={layer === "live"}
        className={`layer-tab${layer === "live" ? " active" : ""}`}
        disabled={disabled}
        onClick={() => onChange("live")}
      >
        真实使用
        <span className="layer-tab-sub">粘贴原文 · 现场裁定</span>
      </button>
    </div>
  );
}
