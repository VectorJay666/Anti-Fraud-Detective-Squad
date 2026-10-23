# 事件流 Schema（Frontend 对接）

每条事件字段（`events-v2.json` / gated 输出）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `run_id` | string | 一次编排运行 ID |
| `case_id` | string | 案卷 ID |
| `ts` | string | ISO8601，含时区，Asia/Shanghai（例 `2026-10-17T16:10:12+08:00`） |
| `node` | string | 固定枚举：`特征官` \| `证据官` \| `反方官` \| `审判官` \| `human_confirm` |
| `text` | string | 发言/说明 |
| `evidence_ids` | string[] | 引用的证据编号 |
| `rule_ids` | string[] | 引用的条款编号 |
| `verdict` | string? | 仅审判官终裁：`pass` \| `refuse` \| `convict`（业务层） |
| `refuse_reason` | string? | 拒判原因 |

## 角色映射（debate spike）

| 旧 role | node |
| --- | --- |
| `accuser` / `prosecutor` | `特征官`（控方侧） |
| `defender` | `反方官` |
| `evidence` | `证据官` |
| `judge` | `审判官` |
| `human_confirm` | `human_confirm` |

旧字段如 `legacy_ts`、`approved`、`phase` 可保留在同级，前端可忽略。

无据标红：`evidence_ids` / `rule_ids` 中任一编号不在案卷 `evidence[].id` 或 `rules/base.json` → 前端标「无据」。
