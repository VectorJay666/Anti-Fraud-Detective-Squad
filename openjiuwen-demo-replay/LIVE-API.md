# Live / SwarmFlow API（Backend）+ Frontend 接线

真源：
- 旁路 live：`/workspace/openjiuwen-spike/spike/LIVE.md`
- **展示轨契约**：`/workspace/openjiuwen-spike/spike/FE_SWARM_CONTRACT.md`

## Base

- Base：`http://127.0.0.1:5180`
- Demo Vite：`http://127.0.0.1:5174` — 顶部 Tab **教学层 / 实际层**
- `GET /health`

## 实际层（产品表单）

九字段 body（冻结 04；**只发 `transcript`**，勿发 `chat_transcript`）：

```json
{
  "layer": "live",
  "transcript": "……≥20字",
  "amount": 5000,
  "payee": "安全账户",
  "urgency": "high",
  "gate": true,
  "case_id": null,
  "suspect_links": [],
  "user_note": null
}
```

| 开关 | URL | 说明 |
| --- | --- | --- |
| **平台 Swarm 展示（默认开）** | `POST /v1/swarm/debate` | 真实 SwarmFlow；SSE：`schema`→`meta`→`progress*`→`event*`→`done` |
| 旁路（开关关） | `POST /v1/debate/live` | TeamRuntime；`swarmflow` 永远 false |
| 别名（Backend 支持，FE 未默认用） | `POST /v1/debate/live` + `"engine":"swarm"` | 与主 URL 同等 |

### SSE 要点（展示轨）

| event | 要点 |
| --- | --- |
| `schema` | `engine=swarmflow`；此时 `swarmflow` 仍可能为 false |
| `meta` | 启动：`progress_streaming:true`；引擎成功后 `swarmflow:true` |
| `progress` | **中间进度边开边推**（phase / agent_*）；FE 立刻画时间线；`swarmflow` 仍 false |
| `event` | SCHEMA 同形气泡（特征官/证据官/风险官/合规官/用户保护官/反方官/审判官…） |
| `done` | `swarmflow` / `gate_verdict` / `footer` / `progress_emitted` |
| `error` | `transcript_too_short` / `busy` / `swarm_debate_failed`（含 `downgrade=teamruntime`） |

### 页脚（诚实）

| 条件 | 页脚 |
| --- | --- |
| 本次 `done.swarmflow===true` | `SwarmFlow 现场会商 + 本地 rule_gate`（或 `done.footer`） |
| 旁路 / 降级 / 失败未完成 | `真 LLM 现场会商 + 本地 rule_gate` |
| **一律禁止** | 写「已接 Swarm」（引擎 footer ≠ 比赛口径） |

### 失败降级（FE 已实现）

收到 SSE `error.code=swarm_debate_failed` → 自动再打 `POST /v1/debate/live`（**不传 engine**），页脚改回旁路诚实句。超时建议 ≥180s。

## 教学层

- fixtures 预录对照回放（三案）
- 可选旧 live 双轨演示：仍发 `{ gate, case_id? }` → `POST /v1/debate/live`
- 页脚：教学/回放诚实句；禁写「已接 Swarm」

## 截图

`shots/live-contrast.png`
