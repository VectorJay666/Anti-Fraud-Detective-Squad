import type { TeachingCaseMeta } from "../types";

interface Props {
  meta: TeachingCaseMeta;
}

export function TeachingMeta({ meta }: Props) {
  return (
    <aside className="teaching-meta">
      <h2 className="teaching-meta-title">{meta.title}</h2>
      <p className="teaching-meta-one">{meta.one_liner}</p>
      <h3 className="teaching-meta-h">学习要点</h3>
      <ul className="learning-points">
        {meta.learning_points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <details className="case-record">
        <summary>案例记录</summary>
        <p>编号：{meta.case_id}</p>
        <p>{meta.fixtures ? "预录案例回放，播放时不会提交聊天内容或请求模型。" : "当前可查看学习要点，暂未提供预录回放。"}</p>
      </details>
      {!meta.fixtures ? (
        <p className="teaching-meta-note">
          本案例暂无回放，可以先阅读学习要点，或选择其他案例体验分析过程。
        </p>
      ) : null}
    </aside>
  );
}
