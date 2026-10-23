import type { TeachingCaseMeta } from "../types";

interface Props {
  meta: TeachingCaseMeta;
}

export function TeachingMeta({ meta }: Props) {
  return (
    <aside className="teaching-meta">
      <div className="teaching-meta-row">
        <span className="case-id-chip large">{meta.case_id}</span>
      </div>
      <h2 className="teaching-meta-title">{meta.title}</h2>
      <p className="teaching-meta-one">{meta.one_liner}</p>
      <h3 className="teaching-meta-h">学习要点</h3>
      <ul className="learning-points">
        {meta.learning_points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {!meta.fixtures ? (
        <p className="teaching-meta-note">
          本案例事件流 fixtures 待补；可先读要点。完整左右对照请选{" "}
          <code>CASE-SPIKE-FAB-001</code>。
        </p>
      ) : null}
    </aside>
  );
}
