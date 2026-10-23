import type {
  DebateEvent,
  PayloadMeta,
  SideVerdict,
  ValidSets,
} from "../types";
import { DebateStage } from "./DebateStage";

interface Props {
  side: "left" | "right";
  title: string;
  subtitle: string;
  events: DebateEvent[];
  idx: number;
  seen: Set<string>;
  valid: ValidSets;
  verdict: SideVerdict | null;
  meta?: PayloadMeta;
}

/** Column shell → DebateStage（圈线主视觉；胶囊 NodeRail 仍作进度） */
export function Column(props: Props) {
  return <DebateStage {...props} />;
}
