import type { ProductLayer } from "../types";

interface Props {
  layer: ProductLayer;
  onChange: (layer: ProductLayer) => void;
  disabled?: boolean;
}

export function LayerTabs({ layer, onChange, disabled }: Props) {
  return (
    <div className="layer-tabs" aria-label="页面切换">
      <button
        type="button"
        aria-pressed={layer === "live"}
        className={`layer-tab${layer === "live" ? " active" : ""}`}
        disabled={disabled}
        onClick={() => onChange("live")}
      >
        风险检查
      </button>
      <button
        type="button"
        aria-pressed={layer === "teaching"}
        className={`layer-tab${layer === "teaching" ? " active" : ""}`}
        disabled={disabled}
        onClick={() => onChange("teaching")}
      >
        案例演示
      </button>
    </div>
  );
}
