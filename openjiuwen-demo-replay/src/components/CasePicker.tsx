import type { TeachingCaseMeta } from "../types";

interface Props {
  cases: TeachingCaseMeta[];
  selectedId: string;
  onSelect: (caseId: string) => void;
  disabled?: boolean;
}

const SCAM_LABEL: Record<string, string> = {
  fake_customer_service: "假客服",
  romance_loan: "熟人急借",
  investment: "刷单返利",
  fake_logistics: "假物流",
  other: "其他",
};

export function CasePicker({ cases, selectedId, onSelect, disabled }: Props) {
  return (
    <div className="case-picker" role="group" aria-label="选择演示案例">
      {cases.map((c, index) => {
        const active = c.case_id === selectedId;
        return (
          <button
            key={c.case_id}
            type="button"
            aria-pressed={active}
            className={`case-card${active ? " active" : ""}${
              c.fixtures ? "" : " placeholder"
            }`}
            disabled={disabled}
            onClick={() => onSelect(c.case_id)}
          >
            <div className="case-card-top">
              <span className="case-number" aria-hidden="true">0{index + 1}</span>
              <span className="case-type">
                {SCAM_LABEL[c.scam_type] || c.scam_type}
              </span>
            </div>
            <div className="case-title">{c.title}</div>
            <div className="case-one-liner">{c.one_liner}</div>
            <div className="case-card-action">
              <span>{active ? "当前案例" : "查看案例"}</span>
              <span aria-hidden="true">{active ? "✓" : "→"}</span>
            </div>
            {!c.fixtures ? (
              <div className="case-placeholder-tag">暂无回放，可阅读学习要点</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
