import type { SideVerdict } from "../types";

interface Props {
  verdict: SideVerdict;
}

export function Banner({ verdict }: Props) {
  return (
    <div className={`banner ${verdict.kind === "refuse" ? "refuse" : "ok"}`}>
      <div className="banner-seal" aria-hidden>
        {verdict.kind === "refuse" ? "拒" : "放"}
      </div>
      <div className="banner-body">
        <div className="title">{verdict.title}</div>
        <div className="body">{verdict.body}</div>
        {verdict.checklist && verdict.checklist.length > 0 ? (
          <ul className="banner-checklist">
            {verdict.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
