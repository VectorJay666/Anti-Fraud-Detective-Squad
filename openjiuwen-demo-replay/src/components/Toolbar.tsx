export type UiMode = "replay" | "live";
export type PlaySpeed = 1 | 2 | 4;

interface Props {
  mode: UiMode;
  playing: boolean;
  liveRunning: boolean;
  stepLabel: string;
  hasFixtures: boolean;
  playSpeed: PlaySpeed;
  onPlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onLive: () => void;
  onBackReplay: () => void;
  onSpeed: (s: PlaySpeed) => void;
}

const SPEEDS: PlaySpeed[] = [1, 2, 4];

export function Toolbar({
  mode,
  playing,
  liveRunning,
  stepLabel,
  hasFixtures,
  playSpeed,
  onPlay,
  onStep,
  onReset,
  onLive,
  onBackReplay,
  onSpeed,
}: Props) {
  const replayDisabled = liveRunning || mode === "live" || !hasFixtures;
  return (
    <div className="toolbar">
      <span className={`mode-badge mode-${mode}`} title="典型事例展示内模式">
        {mode === "live" ? "演示 live" : "回放"}
      </span>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onPlay}
        disabled={replayDisabled}
      >
        {playing ? "暂停" : "播放"}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onStep}
        disabled={replayDisabled}
      >
        步进
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onReset}
        disabled={liveRunning || !hasFixtures}
      >
        重置
      </button>
      <span className="speed-group" role="group" aria-label="回放倍速">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn btn-speed${playSpeed === s ? " on" : ""}`}
            onClick={() => onSpeed(s)}
            disabled={replayDisabled && !playing}
            title={`回放 ${s}×（仅典型事例展示 fixtures）`}
          >
            {s}×
          </button>
        ))}
      </span>
      <span className="toolbar-sep" aria-hidden />
      <button
        type="button"
        className="btn btn-live"
        onClick={onLive}
        disabled={liveRunning}
        title="典型事例展示：顺序双轨调用 5180（非真实使用表单）"
      >
        {liveRunning ? "会商中…" : "现场会商"}
      </button>
      {mode === "live" ? (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onBackReplay}
          disabled={liveRunning || !hasFixtures}
        >
          返回回放
        </button>
      ) : null}
      <span className="step-label">{stepLabel}</span>
    </div>
  );
}
