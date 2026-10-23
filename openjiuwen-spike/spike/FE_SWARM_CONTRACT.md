# Frontend · SwarmFlow 展示轨契约（Backend 2026-10-21 · progress 流）

## URL
- **主**：`POST http://127.0.0.1:5180/v1/swarm/debate`
- **别名**：`POST /v1/debate/live` + body `"engine":"swarm"`
- CORS：`http://127.0.0.1:5174`（同现网）
- 超时建议 ≥ 300s（SwarmFlow 五 worker：特征/证据/风险/合规/用户保护）

## Body（冻结 04，transcript 必填）
同实际层表单九字段；只发 `transcript`（勿发 `chat_transcript`）。
`gate` 默认 true。日常不要 `inject_fab`。

## SSE 顺序（实时）
```
schema
meta          (swarmflow:false, swarmflow_pending:true, progress_streaming:true, event_streaming:true)
progress*     ★ 会商进行中边跑边推（phase / agent_*）
event*        ★ SCHEMA 发言气泡边产出边推（特征官→证据官→风险官→合规官→反方官→用户保护官，与 progress 交错）
meta          (swarmflow:true + swarmflow_meta，引擎成功后)
event?        仅补尚未中途推过的节点（如 审判官 / inject_fab）；已推过的不重复
done          swarmflow:true + gate_verdict + footer + events[]（终包兜底）
```
失败则任意时刻 `error`（可无 done）。

FE：中途收到过 `event` 时 **忽略** `done.events` 整包灌墙（只 merge meta/verdict）。

## 帧说明
| event | 要点 |
| --- | --- |
| `schema` | `engine=swarmflow`；此时 `swarmflow` 仍可能为 false |
| `meta` | 启动：`swarmflow:false` + `progress_streaming:true`；引擎成功后：`swarmflow:true` + `swarmflow_meta` |
| `progress` | **中间进度**（见下表）；`swarmflow_running:true`，`swarmflow` 仍为 false（勿当「已接」） |
| `event` | SCHEMA 同形；**每位官员产出后立刻推**（与 progress 交错）。progress 不能替代 event |
| `done` | `swarmflow:true`、`gate_verdict`、`footer=SwarmFlow 现场会商 + 本地 rule_gate`、`progress_emitted`、`mid_events_emitted`、`events[]` 兜底 |
| `error` | `transcript_too_short` / `busy` / `swarm_debate_failed`（含 `downgrade=teamruntime`） |

## `progress` 字段
```json
{
  "kind": "workflow_started|phase|agent_started|agent_activity|agent_completed|agent_failed|workflow_completed|log|…",
  "phase": "特征|查证|风险|合规|保护|…",
  "label": "特征官|证据官|风险官|合规官|用户保护官|…",
  "text": "进入阶段：特征",
  "message": "…",
  "ts": "2026-10-21T15:00:01+08:00",
  "seq": 1,
  "run_id": "run-swarm-live-…",
  "case_id": "LIVE-…",
  "swarmflow": false,
  "swarmflow_running": true,
  "source": "swarmflow_observer"
}
```

### FE 怎么画时间线
- 收到 `progress` → **立刻**往时间线 append 一行（用 `text`；可用 `kind` 上色）
- `kind=phase` → 阶段标题（如「进入阶段：特征」）
- `kind=agent_started` / `agent_completed` → 「某某开始/发言完毕」
- `kind=agent_activity` → 可选细粒度（工具调用）
- SCHEMA `event` 画正式发言气泡（中途就会到）；`progress` 是过程条，不要和 SCHEMA 混成同一条定罪话术
- `progress` **不能**替代 `event`；没有中途 `event` 时才用 `done.events` 兜底灌入
- `done.swarmflow===true` 才标 SwarmFlow 页脚；材料仍 **禁写「已接 Swarm」**


## SCHEMA 节点（实际层 Swarm）
稳定 node 名（FE 勿随意改字）：
1. `特征官` — 催转/冒充特征
2. `证据官` — 核实 EV-LIVE-001
3. `风险官` — 风险等级 / 是否建议拦转（NEW）
4. `合规官` — 条款核对；空证据拒绝定罪（NEW）
5. `反方官` — 脚本化（不宜仓促定罪）
6. `用户保护官` — 可执行清单 / 对用户建议输出（先别转、官方核实…）
7. `审判官` — 本地 rule_gate 终裁

仅允许引用 `EV-LIVE-001` 与 `R-01`/`R-02`。材料仍 **禁写「已接 Swarm」**。

## 何时 true / false
- **true**：仅 Swarm 轨且 `run_swarmflow` 已成功的 **后置 meta / done**
- **false**：默认 TeamRuntime live；swarm schema；启动 meta；**所有 progress**；失败 error

## 失败降级
收到 `swarm_debate_failed` → 回退 `POST /v1/debate/live`（不传 engine），页脚改回「真 LLM 现场会商 + 本地 rule_gate」。

## 材料铁律
引擎 footer ≠ 比赛「已接 Swarm」。未 Test 盖章前 UI/材料禁写「已接」。
