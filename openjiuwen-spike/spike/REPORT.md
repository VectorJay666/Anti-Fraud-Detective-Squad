# openJiuwen Spike REPORT（转账前保镖 / Plan B）

更新：2026-10-21（Asia/Shanghai）。工作目录：`/workspace/openjiuwen-spike/spike/`。  
**未推送任何远端。**

## 重要更正（对 Test）

此前群聊声称的「debate+tool+HITL 已 PASS + run-*.log」**在本机磁盘上找不到原产物**（无 `spike/debate_tool_hitl.py` / 无旧 `events.json` / 无旧 `run-*.log`）。本 REPORT **不以口述冒烟代替验收**。  
当前可复现的 PASS：**脚本回放 + `rule_gate` 打回** + **官方 TeamRuntime P2P（D0）** + **TeamRuntime SCHEMA 辩论→rule_gate** + **live LLM（GLM）辩论→rule_gate**。SwarmFlow **direct**（`run_swarmflow`+TeamWorkerBackend+GLM）已 **PASS**（见 §5）；hierarchical / 官方 party_planner team e2e 另见 §5。

---

## 1. 安装 / import

| 项 | 状态 |
| --- | --- |
| clone `agent-core` | PASS（本机有，HEAD `f9f5036`） |
| `import openjiuwen` | PASS |
| `import TeamRuntime` | PASS（需补齐依赖，见下） |
| 跑通官方 P2P（经 spike wrapper） | **PASS**（见 §2） |

### 根因（「LogConfig not available」）

不是缺 yaml 文件本身。本机真实卡点：

1. 缺 **PyYAML** → `log_config.py` 的 `import yaml` 失败 → `LogManager` 抛误导文案 `LogConfig not available`。
2. 官方 `examples/multi_agent/runtime_p2p.py` **没有**先 `configure_log` / `LogManager.initialize()`（对照 `examples/intelli_router/intelliRouter_demo.py`）。
3. 随后 `TeamRuntime` / `Runner` 导入链还缺 `jsonschema`、`anyio`、`httpx`、`pycryptodome`、`sqlalchemy`、`alembic` 等（按报错补齐；未做完整 `pip install -e .`，因 pyproject 含 git/重依赖）。

### D0 命令（可复现）

```bash
source /workspace/openjiuwen-spike/.venv/bin/activate
# 最小依赖清单（本机实测冻结）：spike/requirements-p2p-smoke.txt
pip install -r /workspace/openjiuwen-spike/spike/requirements-p2p-smoke.txt

# wrapper：先 configure_log(spike/log_config_p2p.yaml) + LogManager.initialize()，再 import/exec 官方 runtime_p2p.main
# （未永久改 agent-core 示例；log yaml 基于 tests/log_config.yaml，另开 multi_agent INFO 以便留证）
PYTHONPATH=/workspace/openjiuwen-spike/agent-core \
  python /workspace/openjiuwen-spike/spike/run_p2p_smoke.py
```

### 模型

本步无 LLM（示例 Agent 为本地硬编码回复）。

### 历史失败摘录（`logs/run-install-20261017.log`）

```
RuntimeError: LogConfig not available. Please ensure extensions.common. configs.log_config is properly configured.
```

---

## 2. P2P（官方 TeamRuntime 示例）

| 状态 | **PASS** |
| --- | --- |
| 证据日志 | `spike/logs/run-p2p-20261020-170159.log`（Asia/Shanghai） |
| exit | `0` |
| 模型 | 无（Planner → Coder → Reviewer 硬编码） |
| 未改上游 | 未永久编辑 `examples/multi_agent/runtime_p2p.py`；用 `spike/run_p2p_smoke.py` |

### 复现命令

```bash
source /workspace/openjiuwen-spike/.venv/bin/activate
PYTHONPATH=/workspace/openjiuwen-spike/agent-core \
  python /workspace/openjiuwen-spike/spike/run_p2p_smoke.py
# 或写日志：
# PYTHONPATH=... python spike/run_p2p_smoke.py 2>&1 | tee spike/logs/run-p2p-$(TZ=Asia/Shanghai date +%Y%m%d-%H%M%S).log
```

### 日志摘录

```
TeamRuntime P2P 通信示例
流程: user -> planner -P2P-> coder -P2P-> reviewer
[Planner] 收到任务: 实现快速排序算法
[Coder]   收到计划，步骤数: 3，开始编码...
[Reviewer] 审查结果: {'approved': True, 'comments': '代码结构清晰，符合规范'}
--- 流程完成 ---
exit_code=0
```

### 说明

- `spike/log_config_p2p.yaml`：自 `tests/log_config.yaml` 派生；官方样例全局 `level: WARN` 会滤掉 `multi_agent` INFO，故改为 `INFO` 并加 `loggers.multi_agent.level: INFO` 以便验收留证。
- SwarmFlow direct：见 **§5 PASS**；hierarchical 仍未单独冒烟。

---

## 2b. 平台事件冒烟（TeamRuntime SCHEMA 辩论 → rule_gate）

| 状态 | **PASS**（确定性 / 无 LLM） |
| --- | --- |
| 性质 | **TeamRuntime CommunicableAgent 脚本化辩论**，产出 SCHEMA 事件后本地 `rule_gate` 盖章。**不是** SwarmFlow e2e，不得写成 SwarmFlow PASS。 |
| 证据日志 | `spike/logs/run-platform-debate-20261020-170441.log`（Asia/Shanghai） |
| 未 gated | `spike/events-platform.json`（含 `EV-FAB-TRANSFER` + `human_confirm` 误放行） |
| gated | `spike/events-platform-v2.json`（`gate_verdict=refuse`，审判官 `verdict=refuse`） |
| Frontend | 直播替换候选：**`spike/events-platform-v2.json`**（字段见 `SCHEMA.md`） |

### 命令

```bash
source /workspace/openjiuwen-spike/.venv/bin/activate
cd /workspace/openjiuwen-spike/spike
python run_platform_debate_smoke.py
# 底层：platform_debate.py（TeamRuntime P2P 顺序）→ events-platform.json
#       rule_gate.py → events-platform-v2.json
```

### 日志摘录

```
[特征官] 特征：冒充客服 + 催转限时。引用 EV-001、EV-002。
[证据官] 工具 lookup_chat_evidence 命中 ['EV-001', 'EV-002']（案卷可核）。
[反方官] 可能是用户主动咨询，不宜直接定罪。
[特征官/编造] 转账记录已移送，编号 EV-FAB-TRANSFER，建议定罪。
[human_confirm] approved true
gate_verdict=refuse
fabricated_evidence=['EV-FAB-TRANSFER']
fabricated_rules=['R-99']
PASS gate_verdict=refuse
exit_code=0
```

### 模型 / 仍 BLOCKED

- 本路径 **无 API Key**（确定性）。Live LLM 见 **§2c**。
- SwarmFlow direct：见 **§5 PASS**；hierarchical 仍未单独冒烟。

---

## 2c. Live LLM 辩论冒烟（GLM OpenAI-compatible → rule_gate）

| 状态 | **PASS** |
| --- | --- |
| 性质 | TeamRuntime CommunicableAgent + `Model`/`ModelClientConfig`（provider=`OpenAI`）调用 `glm-5.3-flash`；**不是** SwarmFlow e2e。 |
| 配置 | `spike/model.env`（脚本加载；**日志不打印 API Key**） |
| 证据日志 | `spike/logs/run-llm-debate-20261020-185502.log`（Asia/Shanghai，`exit_code=0`，无密钥泄漏） |
| 未 gated | `spike/events-llm.json`（特征官/证据官/反方官=`source:llm`；编造=`deterministic_inject`） |
| gated | `spike/events-llm-v2.json`（`gate_verdict=refuse`，审判官 refuse） |
| Frontend | 可替换候选：`spike/events-llm-v2.json`（或仍用 `events-platform-v2.json` 确定性对照） |

### 命令

```bash
source /workspace/openjiuwen-spike/.venv/bin/activate
cd /workspace/openjiuwen-spike/spike
# model.env 需含 OPENJIUWEN_LLM_API_KEY / API_BASE / MODEL 等（勿把 key 写入日志）
python run_llm_debate_smoke.py
```

### 设计要点

- 至少三角色走真实 LLM：`特征官`、`证据官`、`反方官`。
- 编造路径 **确定性注入** `EV-FAB-TRANSFER` + `R-99` + `human_confirm` 误放行，保证 `rule_gate` 可演示 refuse（不依赖模型是否愿意幻觉）。
- `api_base=https://ai.xem8k5.top/v1`，`client_provider=OpenAI`（兼容端点）。

### 日志摘录（已脱敏）

```
model=glm-5.3-flash base=https://ai.xem8k5.top/v1 client_id=glm-flash
api_key=<redacted>
[特征官/llm] ...
[证据官/llm] ...
[反方官/llm] ...
[特征官/inject] 转账记录已移送，编号 EV-FAB-TRANSFER，建议定罪。
gate_verdict=refuse
PASS gate_verdict=refuse fab=['EV-FAB-TRANSFER'] rules=['R-99']
exit_code=0
```

### 相关

- SwarmFlow direct：见 **§5 PASS**。hierarchical 仍未单独冒烟。
- 纯「诱导模型自行编造」路径：未单独验收（本 PASS 以 inject 保证 gate 演示）。

---

## 3. Hierarchical tools（官方 hierarchical_tools 示例）

| 状态 | **BLOCKED** |
| --- | --- |
| 原因 | 未跑；依赖 LogConfig + 完整依赖 + 模型配置 |
| 预期命令（待环境好后） | `PYTHONPATH=. python examples/multi_agent/builtin_teams/hierarchical_tools_research_team.py`（需填入真实 `ModelClientConfig`，本报告不编造已跑日志） |

---

## 4. Debate + tool + HITL

| 状态 | **脚本回放 PASS / 现场 LLM BLOCKED** |
| --- | --- |

### 4a. 脚本回放（本机可复现，非 SwarmFlow）

```bash
cd /workspace/openjiuwen-spike/spike
python3 debate_tool_hitl.py --out events.json
```

- 模型：**无**（确定性脚本）
- 产物：`events.json`（含 Frontend 字段；含编造 `EV-FAB-TRANSFER` + `human_confirm approved`）

### 4b. 风险记录（必须写进材料）

控方发言编造「转账记录已移送」/`EV-FAB-TRANSFER`；若无规则卡口，路径会落到 **human_confirm 批准编造证据**（见 `fixtures/scripted_fabricated_pre_gate.json` 与 `events.json` 最后一条）。  
**此前若有人声称「审判官已当场打回」——与实测不符；打回仅在接上 rule_gate 之后成立。**

### 4c. 现场 DeepSeek / openJiuwen 辩论

旧口径 DeepSeek 现场辩论：**未在本机留下可复现 run 日志**（不得写 PASS）。
另：GLM live TeamRuntime 辩论已在 **§2c PASS**（非 SwarmFlow / 非本脚本 `debate_tool_hitl`）。

---

## 5. SwarmFlow 端到端

| 状态 | **PASS（direct）** + **PASS（team_mini）** + **PASS（保镖 SCHEMA+gate 双轨）** + **PASS（party_failfast 全阶段）** |
| --- | --- |
| 性质 | `openjiuwen.agent_teams.workflow.run_swarmflow` + `TeamWorkerBackend` + 真实 GLM（`glm-5.3-flash`）。**是 SwarmFlow**，不是 TeamRuntime P2P。 |
| 脚本 | `spike/swarm_scripts/mini_theme.py`（单 phase / 单 `agent()` 结构化输出） |
| 冒烟入口 | `spike/run_swarm_smoke.py`（默认 `SWARM_SMOKE_MODE=direct`） |
| 证据日志 | `spike/logs/run-swarm-direct-20261020-200639.log`（Asia/Shanghai，`exit=0`，无密钥泄漏） |
| Demo 草图 | `spike/SWARM_DEMO.md` |

### 复现命令（direct）

```bash
source /workspace/openjiuwen-spike/.venv/bin/activate
cd /workspace/openjiuwen-spike/spike
# model.env 需含 OPENJIUWEN_LLM_*（勿把 key 写入日志）
PYTHONPATH=/workspace/openjiuwen-spike/agent-core \
  python run_swarm_smoke.py
```

### 日志摘录（已脱敏）

```
mode=direct team=spike_swarm_mini
model=glm-5.3-flash base=https://ai.xem8k5.top/v1 api_key=<redacted>
llm_call_start ... model_name=glm-5.3-flash
Executing tool: structured_output with args: {"theme":"金库守夜人",...}
observer.run name=mini-theme status=completed
progress_kinds=[workflow_started, phase, agent_started, agent_activity, agent_completed, log, workflow_completed]
PASS SwarmFlow direct: mini-theme completed with structured LLM output
exit_code=0
```

### 依赖补齐（本机曾缺）

`sqlmodel`、`opentelemetry-sdk`、`tenacity`、`loguru`、`portalocker`、`aiosqlite`、otel httpx/requests/aiohttp instrumentation。已装入 `.venv`。

### team_mini（`enable_swarmflow` + mini-theme）— **PASS**

| 状态 | **PASS** |
| --- | --- |
| 性质 | `TeamAgentSpec(enable_swarmflow=true)` → leader 调 `swarmflow` 工具 → `mini_theme.py`（1 phase「构思」+ 结构化输出）。**是 team 路径**，不是 `run_swarmflow` direct。 |
| 入口 | `SWARM_SMOKE_MODE=team_mini python run_swarm_smoke.py` |
| 配置 | `spike/config_swarmflow_mini.yaml` |
| 证据 | `spike/logs/run-swarm-team-mini-20261020-202731.log`（Asia/Shanghai，exit=0） |
| 验收 | `workflow_started` → phase `构思` → `agent_completed` 主题官 → `theme_result=...` → `workflow_completed`；`PASS_MARKER swarmflow_team_mini` |

#### 复现

```bash
cd /workspace/openjiuwen-spike/spike
source ../.venv/bin/activate
SWARM_SMOKE_MODE=team_mini PYTHONPATH=../agent-core python run_swarm_smoke.py
```

#### 日志摘录

```
enable_swarmflow=True
[team_mini] workflow_started name=mini-theme
[team_mini] phase=构思
[team_mini] agent_completed label=主题官
[team_mini] log=theme_result={'theme': '...', 'vibe': '...'}
[team_mini] workflow_completed
PASS_MARKER swarmflow_team_mini
```

#### 与 Test 四条 / 保镖 Demo 的差距（勿宣称已接）

1. 事件是 Swarm progress（phase/agent），**不是**保镖 SCHEMA 同形（特征官/证据官/审判官）。
2. **无** `rule_gate` 双轨（gate true refuse / gate false pass）。
3. party_planner **party_failfast 全阶段 PASS**（见下）；官方 `enable_swarmflow` team streaming e2e 未单独宣称。
4. 材料 / Demo 页脚仍 **禁止**写「已接 Swarm 保镖端到端」。

#### 下一步（保镖 SCHEMA+gate，未本轮实现）

- 新脚本 `spike/swarm_scripts/guard_debate_mini.py`：2 phase 内产出 SCHEMA 事件 list（可确定性注入 EV-FAB）。
- `team_mini` 跑完后：`rule_gate.py` 打 `events-swarm-v2.json`（refuse）；另跑无 gate 轨对照。
- Frontend：第三轨订阅读 progress 或换 `events-swarm-v2.json`；页脚写「SwarmFlow team_mini · 非 party_planner」。

### 官方 team e2e（`enable_swarmflow` + party_planner）

| 状态 | **BLOCKED** |
| --- | --- |
| 证据日志 | `spike/logs/run-swarm-team-20261020-201604.log`（exit=1）；细节见 `.e2e_workdir/logs/jiuwen_details.log` |
| OTel | 已解除：`import opentelemetry.exporter` OK（venv 已装 `opentelemetry-exporter-otlp`） |
| 根因 | party_planner 未在 `_RUN_TIMEOUT_S`（600s）内完成：`[swarmflow] timed out waiting for workflow completion` → `VERIFICATION FAILED: phases missing from the run: ['审批', '拟菜单', '筹备', '邀请函']` |
| 次要噪声 | human workspace `write_file`：`Cannot close an active file lock`（非本次唯一根因，但伴随出现） |
| 命令 | `cd spike && source ../.venv/bin/activate && SWARM_SMOKE_MODE=team PYTHONPATH=../agent-core python run_swarm_smoke.py` |



### 保镖 SCHEMA + rule_gate 双轨（SwarmFlow 归因）— **PASS**

| 状态 | **PASS**（双轨） |
| --- | --- |
| 案卷 | `CASE-SPIKE-FAB-001`（`case/dossier.json` + `rules/base.json`） |
| Swarm | `run_swarmflow` + `swarm_scripts/guard_schema_mini.py`（特征官/证据官 worker） |
| SCHEMA | `events-swarm-bodyguard.json`（ungated）/ `events-swarm-bodyguard-v2.json`（gated） |
| gate:false | `logs/run-swarm-bodyguard-gate-false-20261020-202950.log` — `gate_verdict=None`，含 EV-FAB + human_confirm approved，无审判官 refuse；`PASS_MARKER swarm_bodyguard_gate_false` |
| gate:true | `logs/run-swarm-bodyguard-gate-true-20261020-202950.log` — `gate_verdict=refuse`，fab `EV-FAB-TRANSFER`/`R-99`，审判官 refuse，跳过 human_confirm；`PASS_MARKER swarm_bodyguard_gate_true` |
| 入口 | `python run_swarm_bodyguard_gate_smoke.py`（一次 Swarm，本地拆双轨） |

```bash
cd /workspace/openjiuwen-spike/spike
source ../.venv/bin/activate
PYTHONPATH=../agent-core python run_swarm_bodyguard_gate_smoke.py
```

**材料口径**：可写「SwarmFlow worker 产出 SCHEMA + 本地 rule_gate 双轨冒烟 PASS」；**禁止** Demo 文案写「已接 Swarm」。编造路径仍为确定性注入（非模型自发）。

### 口径边界（对 Test / 材料）

- **保镖 SCHEMA+gate 双轨已 PASS**（见上）；仍 **不得**在 Demo UI 写「已接 Swarm」。
- party_failfast 全阶段 PASS；材料可写「SwarmFlow SCHEMA+gate / party_failfast 冒烟」，勿写 Demo「已接 Swarm」。
- hierarchical_tools：仍未单独冒烟。
- 不得把 TeamRuntime 会商写成 SwarmFlow。


### party_planner 阶段门控（party_failfast）— **PASS**

| 项 | 内容 |
| --- | --- |
| 入口 | `python run_swarm_party_failfast.py`（direct `run_swarmflow`，不经 leader stream） |
| 配置 | `config_swarmflow_party_failfast.yaml`；隔离 `swarm_party_failfast_{workdir,home}`；`swarm_party_resources` → 官方 resources |
| 白名单 | 构思 → 征询嘉宾 → 拟菜单 → 筹备 → 审批 → 邀请函（对齐官方 e2e） |
| 门控 | `START_DEADLINE_S=180` / `PHASE_TIMEOUT_S=300` / `OVERALL_CAP_S=900` |
| HITL | JSON schema 答复 + 本地 avatar `_try_direct_structured` 短路（跳过 LLM format） |
| 网关 | `SPIKE_LLM_FORCE_NONSTREAM=1`：stream+tools 在 GLM 网关常 500，非流式 tool call 可用；本地 openai client 另有 500→invoke 回退 |
| worker | `enable_sys_operation=False`（仅 structured_output） |
| 证据 | `logs/run-swarm-party-failfast-20261021-093429.log` — exit=0，`wall_time_s=142.4`，`humans=7/7`，`missing=[]`，`PASS_MARKER swarmflow_party_failfast` |
| 口径 | 工程分账可写 party_failfast PASS；材料/Demo **仍禁写「已接 Swarm」**（非 UI 端到端、非官方 team streaming e2e） |
| 本地 agent-core 补丁（未推远端） | `_async_read_write_lock.py` same-task；`avatar_session_backend.py` 修 `_try_direct_structured` 误插导致的类方法丢失 + JSON 短路；`openai_model_client.py` force-nonstream / stream→invoke 回退 |

```bash
cd /workspace/openjiuwen-spike/spike
source ../.venv/bin/activate
PYTHONPATH=../agent-core python run_swarm_party_failfast.py
# 或：SWARM_SMOKE_MODE=party_failfast PYTHONPATH=../agent-core python run_swarm_smoke.py
```

---


### D5 Demo↔live 保镖 1 案 e2e — **PASS**（2026-10-21）

| 项 | 值 |
| --- | --- |
| 状态 | **PASS**（5174 Demo 可达 + 5180 health/showcase + gated live SSE） |
| 案 | `CASE-SPIKE-FAB-001` |
| 入口 | `python run_demo_live_e2e_smoke.py`（需 `live_server.py` @5180 + Vite @5174） |
| 证据 | `logs/run-demo-live-bodyguard-e2e-20261021-093935.log` |
| 标记 | `PASS_MARKER demo_live_bodyguard_e2e` |
| 终局 | `gate_verdict=refuse` · `fabricate=null` · `EV-FAB-TRANSFER` · 审判官 refuse · `swarmflow=false` |
| 契约 | `GET /v1/showcase` → `{url:5174, modes:[replay,live], live_base:5180, swarmflow:false}` |
| 口径 | Live =「真 LLM 现场会商 + 本地 rule_gate」；**禁止** Demo/材料写「已接 Swarm」 |

```bash
cd /workspace/openjiuwen-spike/spike
# 终端 A：../.venv/bin/python live_server.py
# 终端 B：Demo Vite 已在 5174
../.venv/bin/python run_demo_live_e2e_smoke.py
```

**Frontend handoff（可选加强，非阻塞）**

- 现有：工具栏「现场会商」→ 顺序 `gate:false`（左）→ `gate:true`（右）；页脚 `真 LLM 现场会商 + 本地 rule_gate`
- 建议：`streamLiveDebate({ gate, case_id: "CASE-SPIKE-FAB-001" })` 显式传案号（服务端已默认同案）
- SCHEMA 字段：`run_id/case_id/ts/node/text/evidence_ids/rule_ids/verdict/refuse_reason`；SSE：`schema/meta/event*/done|error`
- 勿在 UI 写 Swarm / 已接 Swarm；replay 轨可保留「确定性注入」诚实句


### 实际层 `debate/live` 契约对齐 — **PASS**（2026-10-21）

| 项 | 值 |
| --- | --- |
| 规格 | `/workspace/openjiuwen/04-实际层输入规格-表单冻结.md` |
| 改动 | `live_server.py` 收冻结 body；双读 `chat_transcript`；&lt;20 SSE error；&gt;8000 软截断；空 evidence → refuse |
| 管线 | `llm_debate.iter_llm_debate(context=…, skip_fabricate=…)`；实际层 `EV-LIVE-001` |
| 冒烟 | `run_live_actual_layer_smoke.py` → `PASS_MARKER live_actual_layer` |
| 日志 | `logs/run-live-actual-layer-20261021-122048.log` |
| Demo 旧路径 | `run_live_api_smoke.py` 仍 **PASS**（`gate_verdict=refuse` · `EV-FAB-TRANSFER`） |
| 页脚 | 「真 LLM 现场会商 + 本地 rule_gate」；禁「已接 Swarm」 |
| 推送 | **未推远端** |

```bash
cd /workspace/openjiuwen-spike/spike
../.venv/bin/python live_server.py   # 终端 A
../.venv/bin/python run_live_actual_layer_smoke.py
../.venv/bin/python run_live_api_smoke.py   # Demo 兼容回归
```

---

## 6. 自演进（S-xxx 补充条款）

| 状态 | **未测** |
| --- | --- |
| 说明 | 仅为方案推断；无 `ev_xxx → S-xxx → 全量回归 → revoke 逐字节还原` 实测 |

---

## 7. 规则盖章打回（Plan B 关键项）— PASS

### 命令

```bash
cd /workspace/openjiuwen-spike/spike
python3 rule_gate.py \
  --fixture fixtures/scripted_fabricated_pre_gate.json \
  --dossier case/dossier.json \
  --rules rules/base.json \
  --out events-v2.json
```

### 模型

无（确定性模块）。规则库：`rules/base.json`（R-01 / R-02）。

### 日志摘录（`logs/run-gate-20261017-161120.log`）

```
=== rule_gate on fixtures/scripted_fabricated_pre_gate.json ===
gate_verdict=refuse
fabricated_evidence=['EV-FAB-TRANSFER']
fabricated_rules=['R-99']
wrote events-v2.json
规则盖章拒绝定罪——编造证据: EV-FAB-TRANSFER；编造条款: R-99。依据 R-02：定罪引用必须存在于案卷/规则库。
```

### 审判官事件（摘自 `events-v2.json`）

- `node`: `审判官`
- `verdict`: `refuse`
- `refuse_reason`: 编造证据 EV-FAB-TRANSFER + 编造条款 R-99
- **无人肉批准**；输出中已跳过 `human_confirm approved true`

Demo 第二幕只有在存在本段 gate 日志 / `events-v2.json` 时，才允许说「打回」。

---

## 产物路径

| 路径 | 用途 |
| --- | --- |
| `spike/events.json` | 脚本辩论+HITL（含编造被批准，风险对照） |
| `spike/events-v2.json` | Frontend 字段 + 审判官 refuse（旧 gate 产物） |
| `spike/events-platform.json` | TeamRuntime 辩论未 gated（含编造+HITL） |
| `spike/events-platform-v2.json` | **Frontend 直播替换候选** + 审判官 refuse |
| `spike/events-llm.json` / `events-llm-v2.json` | Live LLM 辩论未/已 gated |
| `spike/llm_debate.py` / `run_llm_debate_smoke.py` | GLM ModelClient 辩论冒烟 |
| `spike/logs/run-llm-debate-*.log` | LLM 冒烟日志（脱敏） |
| `spike/platform_debate.py` / `run_platform_debate_smoke.py` | TeamRuntime SCHEMA 辩论冒烟 |
| `spike/SCHEMA.md` | 事件契约 |
| `spike/rule_gate.py` | 确定性盖章 |
| `spike/logs/run-gate-*.log` / `run-platform-debate-*.log` | 打回 / 平台事件复现日志 |
| `spike/GROUP_NOTE.md` | 群聊摘要 |

