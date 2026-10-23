# 转账前保镖 · 第二幕对照回放

左右对照回放（骨架不变）：

| 侧 | 数据 | 结局 |
| --- | --- | --- |
| **无卡口** | `data/events.json`（= `events-platform.json`） | `human_confirm approved true`，编造 `EV-FAB-TRANSFER` / `R-99` 被放行 |
| **有卡口** | `data/events-v2.json`（= `events-platform-v2.json`） | `gate_verdict=refuse`，审判官打回 |

> **范围**：TeamRuntime 确定性辩论事件流 + 本地 `rule_gate`。**不是** SwarmFlow / hierarchical / 现场 LLM 端到端。

## 怎么跑

```bash
cd /workspace/openjiuwen/demo-replay
python3 -m http.server 5174 --bind 127.0.0.1
```

浏览器：<http://127.0.0.1:5174/>

## 操作

- **Play** / **Pause**：两侧同步自动步进
- **Step**：各推进一条事件
- **Reset**：清屏重来

不在案卷/规则库的 `evidence_ids` / `rule_ids` 显示红标「无据」（有效：`EV-001` `EV-002` `R-01` `R-02`）。

## 数据来源

同步自 `/workspace/openjiuwen-spike/spike/events-platform.json` 与 `events-platform-v2.json`（`cp` 进 `data/`，逐字节一致；副本亦保留为 `data/events-platform*.json`）。
