# Live GLM 会商 API（Demo 接线 + 实际层）

**口径（Test/Vector）**

- Live 轨只标：**「真 LLM 现场会商」**；盖章页脚：**「真 LLM 现场会商 + 本地 rule_gate」**
- Live 的 footer / meta / events **禁止**写「确定性注入」（注入措辞仅 replay 轨）
- `fabricate: null`（absent）
- 双跑：`gate: false`（ungated） / `gate: true`（本地 `rule_gate` 盖章）
- 默认 `/v1/debate/live` = TeamRuntime（`swarmflow:false`）
- 展示轨 `/v1/swarm/debate` = 真实 SwarmFlow（`swarmflow:true` 仅在该轨）
- **材料/Demo 仍禁写比赛口径「已接 Swarm」**，直到 Test 全口径盖章
- 实际层输入冻结见 `/workspace/openjiuwen/04-实际层输入规格-表单冻结.md`

## 端口

| 服务 | 绑定 | 说明 |
| --- | --- | --- |
| Live API | `127.0.0.1:5180` | 本文件。`OPENJIUWEN_LIVE_PORT` 可改 |
| Demo Vite | `127.0.0.1:5174` | Frontend。`OPENJIUWEN_DEMO_PORT` 可改；CORS 默认放行该源 |

不设变量时就是上表这两个端口。换端口、示例命令和「前端必须打到同一个后端端口」见仓库根 `README.md`「端口被占用时」，样例文件是 `openjiuwen-demo-replay/.env.example`。

环境变量（可选）：`OPENJIUWEN_DEMO_PORT` / `OPENJIUWEN_LIVE_HOST` / `OPENJIUWEN_LIVE_PORT` / `OPENJIUWEN_LIVE_CORS` / `VITE_LIVE_BASE` / `OPENJIUWEN_LIVE_BASE`

## 启动

```bash
cd /workspace/openjiuwen-spike/spike
# 需已有 model.env（勿提交 Key；日志永不打印 Key）
../.venv/bin/python live_server.py
```

## 健康检查

```bash
curl -sS http://127.0.0.1:5180/health
# 期望 HTTP 200，JSON 含 "ok": true, "live": true, "fabricate": null
# footer: "真 LLM 现场会商 + 本地 rule_gate"
```

## 现场会商（SSE）

### A. Demo / 保镖兼容（无 transcript → FAB-001 路径）

```bash
# 盖章轨（期望 gate_verdict=refuse，含 EV-FAB-TRANSFER 被拦）
curl -sS -N -X POST http://127.0.0.1:5180/v1/debate/live \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"gate":true,"case_id":"CASE-SPIKE-FAB-001"}'

# 未盖章轨
curl -sS -N -X POST http://127.0.0.1:5180/v1/debate/live \
  -H 'Content-Type: application/json' \
  -d '{"gate":false}'
```

### B. 实际层（冻结 v1 · 用户粘贴）

```bash
curl -sS -N -X POST http://127.0.0.1:5180/v1/debate/live \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{
    "layer": "live",
    "transcript": "对方自称客服催转……（20～8000 字）",
    "amount": 5000,
    "payee": "安全账户",
    "urgency": "high",
    "gate": true,
    "case_id": null,
    "suspect_links": [],
    "user_note": null
  }'
```

规则摘要：

| 项 | 行为 |
| --- | --- |
| `transcript` / 过渡双读 `chat_transcript` | trim 后 &lt;20 → SSE `error` `transcript_too_short`（不调 LLM）；&gt;8000 软截断 |
| 无 transcript | 走 Demo FAB 路径（默认 `CASE-SPIKE-FAB-001`），D5 冒烟不破 |
| `urgency` 非法 | 回落 `mid` |
| `gate:true` 且会商无 `evidence_ids` | 强制 `gate_verdict=refuse`（禁空跑定罪） |
| 实际层 | `skip_fabricate`；现场案卷证据 `EV-LIVE-001` |
| 页脚 | 仅「真 LLM 现场会商 + 本地 rule_gate」 |

### SSE 帧

| event | 含义 |
| --- | --- |
| `schema` | 字段/节点约定；`live:true` `fabricate:null` |
| `meta` | `gate`、`label=真 LLM 现场会商`、`model_meta`（无 key）、`gate_verdict` 初值 null |
| `event` | 单条 SCHEMA 事件（随会商推进） |
| `done` | 终局：`gate_verdict`、`events[]`、`fabricate:null`、`footer` |
| `error` | 失败；`message` 已脱敏 |

## 冒烟

另开终端（服务已起）：

```bash
cd /workspace/openjiuwen-spike/spike
# 实际层契约（默认不烧 LLM）：短 transcript 拒 + 双读 + Demo parse
../.venv/bin/python run_live_actual_layer_smoke.py
# 可选烧一刀实际层 LLM：LIVE_ACTUAL_LLM=1 ../.venv/bin/python run_live_actual_layer_smoke.py

# Demo 盖章轨（烧 LLM，期望 refuse + EV-FAB-TRANSFER）
../.venv/bin/python run_live_api_smoke.py
```

期望实际层：`PASS_MARKER live_actual_layer`  
期望 Demo：`PASS gate_verdict=refuse live=true fabricate=null`

## Frontend 接线（Backend 侧已就绪 / 未做）

**已就绪**

- `POST http://127.0.0.1:5180/v1/debate/live` + SSE（Demo body + 实际层冻结 body）
- CORS：`http://127.0.0.1:5174`
- 双跑 `gate` 开关；短 transcript 服务端拒

**Frontend 仍需做（BLOCKED on FE）**

- 实际层表单按冻结规格提交 `transcript`…
- 教学层 / 实际层分路由；页脚 live：**「真 LLM 现场会商 + 本地 rule_gate」**
- Replay 轨继续用 `public/data/events*.json`，页脚可保留注入诚实句
- 处理 `error` / `busy`；超时建议 ≥ 120s

**明确不做**

- hierarchical / party 全表面接到 FE（今日仅 guard-schema-live 展示轨）
- 浏览器直连大模型 Key（Key 只在 box `model.env`）
- 材料写比赛口径「已接 Swarm」（展示轨 footer 可写 SwarmFlow 引擎名）

## D5 Demo↔live 保镖 e2e

```bash
cd /workspace/openjiuwen-spike/spike
../.venv/bin/python run_demo_live_e2e_smoke.py
# 期望：PASS_MARKER demo_live_bodyguard_e2e … gate_verdict=refuse
# 另验：GET /v1/showcase → modes replay+live，swarmflow=false
```

## SwarmFlow 展示轨（实际层）

| | |
| --- | --- |
| URL | `POST http://127.0.0.1:5180/v1/swarm/debate` |
| 别名 | `POST /v1/debate/live` + `"engine":"swarm"`（同等） |
| Body | 同冻结 `04`（`transcript` 必填 20～8000） |
| SSE | `schema` / `meta` / `event*` / `done` \| `error`（SCHEMA 同形） |
| `swarmflow` | schema 初值 false → **meta/done 在真实 `run_swarmflow` 成功后才 true** |
| Footer | `SwarmFlow 现场会商 + 本地 rule_gate` |
| 失败降级 | `error.code=swarm_debate_failed` + `downgrade=teamruntime` → 回退 `/v1/debate/live` |
| 空证据 | `gate:true` → `gate_verdict=refuse`（`empty_evidence_refuse`） |
| 材料 | **仍禁写「已接 Swarm」**；引擎 footer ≠ 比赛口径 |

```bash
# 契约冒烟（含一刀真实 SwarmFlow，约 1～3 min）
../.venv/bin/python live_server.py   # 需重启以加载新码
../.venv/bin/python run_swarm_live_smoke.py
# 期望：PASS_MARKER swarm_live_debate
# 仅契约不烧 LLM：SWARM_LIVE_SKIP_LLM=1 ../.venv/bin/python run_swarm_live_smoke.py
```

### Frontend 契约（短）

```json
// request
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

| 何时 `swarmflow:true` | 何时 `false` |
| --- | --- |
| `/v1/swarm/debate` 或 `engine:swarm`，且 SwarmFlow 跑通后的 `meta`/`done` | `/v1/debate/live` 默认；swarm schema 帧；启动失败的 `error` |
| Footer 可标 SwarmFlow | 失败时 UI 诚实降级到 TeamRuntime，**勿写已接** |

