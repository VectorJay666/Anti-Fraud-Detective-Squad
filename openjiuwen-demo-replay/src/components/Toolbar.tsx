import { liveServiceLabel } from "../lib/liveSse";

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
        {mode === "live" ? "在线分析" : "案例回放"}
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
        下一步
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
            title={`以 ${s} 倍速度播放案例`}
            aria-pressed={playSpeed === s}
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
        title={`使用分析服务重新检查此案例（需启动 ${liveServiceLabel()} 服务）`}
      >
        {liveRunning ? "正在分析…" : "在线分析此案例"}
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
