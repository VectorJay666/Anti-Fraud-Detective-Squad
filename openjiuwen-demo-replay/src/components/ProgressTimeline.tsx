import { useEffect, useRef } from "react";

export type ProgressLine = {
  id: string;
  kind: string;
  text: string;
  ts?: string;
  seq?: number;
};

interface Props {
  lines: ProgressLine[];
  /** Thin strip above DebateStage — not the main visual */
  compact?: boolean;
  /** Show intentional empty while waiting for first progress frame */
  waiting?: boolean;
}

function kindClass(kind: string): string {
  if (kind === "phase") return "prog-phase";
  if (kind.startsWith("agent_")) return "prog-agent";
  if (kind === "workflow_started" || kind === "workflow_completed")
    return "prog-flow";
  if (kind === "log") return "prog-log";
  return "prog-other";
}

function kindLabel(kind: string): string {
  if (kind === "phase") return "分析阶段";
  if (kind === "workflow_started") return "检查开始";
  if (kind === "workflow_completed") return "检查完成";
  if (kind.startsWith("agent_")) return "角色分析";
  if (kind === "log") return "服务消息";
  return "检查进度";
}

export function ProgressTimeline({
  lines,
  compact = false,
  waiting = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  if (!lines.length) {
    if (!waiting) return null;
    return (
      <div
        className={`progress-timeline${compact ? " compact" : ""} progress-waiting`}
        aria-live="polite"
      >
        <p className="progress-label">
          检查进度
        </p>
        <p className="progress-wait">正在准备分析，新的进度会自动显示在这里。</p>
      </div>
    );
  }

  return (
    <div
      className={`progress-timeline${compact ? " compact" : ""}`}
      ref={ref}
      aria-live="polite"
    >
      <p className="progress-label">
        检查进度
      </p>
      <ul className="progress-list">
        {lines.map((line) => (
          <li
            key={line.id}
            className={`progress-item ${kindClass(line.kind)}`}
            data-enter="1"
          >
            <span className="progress-kind" title={line.kind}>{kindLabel(line.kind)}</span>
            <span className="progress-text">{line.text}</span>
            {line.ts ? (
              <span className="progress-ts">
                {line.ts.replace("+08:00", "")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
