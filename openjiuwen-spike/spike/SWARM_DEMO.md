# SwarmFlow → Demo 展示草图（给 Frontend）

更新：2026-10-20 Asia/Shanghai。Backend 已跑通 **SwarmFlow direct**（`run_swarmflow` + TeamWorkerBackend + GLM）。

## 已证明什么

| 轨 | 状态 | 入口 |
| --- | --- | --- |
| SwarmFlow **direct** | **PASS** | `spike/run_swarm_smoke.py`（默认）；脚本 `swarm_scripts/mini_theme.py` |
| SwarmFlow **team**（`enable_swarmflow` + leader 调工具） | 见 `REPORT.md` §5 / team 日志 | `SWARM_SMOKE_MODE=team python run_swarm_smoke.py` |
| TeamRuntime GLM 会商 | PASS（非 Swarm） | `run_llm_debate_smoke.py` |
| 对照回放 | PASS | Demo `5174` 读 `events-llm*` |

## Demo 怎么「体现已连 Swarm」

不要再只写「非 SwarmFlow」。建议三轨并列（左→右或 Tab）：

1. **对照回放**（现有）— 预录 events；页脚可保留「确定性注入」诚实句。
2. **TeamRuntime live**（5180 SSE，若已接线）— 「真 LLM 现场会商」；**禁止**写注入。
3. **SwarmFlow**（新）— 最小展示：
   - 按钮「跑 Swarm 冒烟」→ 调 Backend 薄 API（可复用 `run_swarmflow` 包装，端口另开如 `5181`），SSE 推 progress：
     - `workflow_started` / `phase` / `agent_started` / `agent_activity` / `agent_completed` / `workflow_completed`
   - UI：时间线显示 phase「构思」+ worker「主题官」+ 结构化结果 JSON。
   - 页脚固定：`SwarmFlow · TeamWorkerBackend · GLM · 非对照回放`

### 事件形状（建议映射到现 SCHEMA 或独立 `swarm_events`）

```json
{
  "source": "swarmflow",
  "kind": "agent_completed",
  "workflow": "mini-theme",
  "phase": "构思",
  "label": "主题官",
  "result": {"theme": "...", "vibe": "..."},
  "ts": "ISO8601+08:00"
}
```

Frontend 不必等 SCHEMA 大改：先独立面板渲染 progress timeline 即可。

## 本机复现（box）

```bash
source /workspace/openjiuwen-spike/.venv/bin/activate
cd /workspace/openjiuwen-spike/spike
# 需 spike/model.env（勿提交密钥）
PYTHONPATH=/workspace/openjiuwen-spike/agent-core \
  python run_swarm_smoke.py
# 日志：spike/logs/run-swarm-direct-*.log
```

## 诚实边界

- direct PASS = SwarmFlow **引擎 + 真实 GLM worker** 已通；不等于 party_planner 全表面 / hierarchical。
- 材料主线仍可写 TeamRuntime+gate；Swarm 作为「平台编排已接」加分轨，措辞跟 Test 验收日志走。


## 更新：team_mini PASS（2026-10-20）

`SWARM_SMOKE_MODE=team_mini` 已证明 **enable_swarmflow** leader→swarmflow 工具→mini-theme。
Demo 仍勿写「已接 Swarm 保镖」。下一刀：保镖 SCHEMA 事件脚本 + rule_gate 双轨后再换 Frontend 第三轨。
