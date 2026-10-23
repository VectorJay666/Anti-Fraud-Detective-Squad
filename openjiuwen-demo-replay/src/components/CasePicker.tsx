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
    <div className="case-picker" role="listbox" aria-label="典型事例展示">
      {cases.map((c) => {
        const active = c.case_id === selectedId;
        return (
          <button
            key={c.case_id}
            type="button"
            role="option"
            aria-selected={active}
            className={`case-card${active ? " active" : ""}${
              c.fixtures ? "" : " placeholder"
            }`}
            disabled={disabled}
            onClick={() => onSelect(c.case_id)}
          >
            <div className="case-card-top">
              <span className="case-id-chip">{c.case_id}</span>
              <span className="case-type">
                {SCAM_LABEL[c.scam_type] || c.scam_type}
              </span>
            </div>
            <div className="case-title">{c.title}</div>
            <div className="case-one-liner">{c.one_liner}</div>
            {!c.fixtures ? (
              <div className="case-placeholder-tag">事件流待补 · 先看要点</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
