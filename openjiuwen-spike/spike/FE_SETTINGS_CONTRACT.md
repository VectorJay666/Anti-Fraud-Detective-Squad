# FE ↔ Backend：全局 API 设置栏契约

**端口** `127.0.0.1:5180` · **本地-only** · Key 永不进日志 / SSE `model_meta` / 材料截图默认态。

## 齿轮入口（Frontend）

- 顶栏齿轮 /「设置」→ 抽屉：`API Key` / `Base URL` / `模型名`
- 保存：本机 `localStorage` **+** `PUT /v1/settings/model`（写 `spike/model.env` chmod 600 + 进程热加载）
- 教学回放轨不需要 Key；实际层 / Swarm 开庭前必须 `configured=true`

## 接口

### `GET /v1/settings/model`

```json
{
  "configured": true,
  "base_url": "https://…",
  "model": "glm-5.3-flash",
  "key_set": true,
  "provider": "openai",
  "client_id": "glm-flash",
  "ts": "…"
}
```

- **无明文 Key**。`configured === key_set === (api_key 非空)`。

### `PUT /v1/settings/model`

```json
{ "api_key": "…", "base_url": "https://…", "model": "glm-5.3-flash" }
```

别名：`api_base` ≡ `base_url`。字段均可选，至少一项。

成功：

```json
{ "ok": true, "hot_reload": true, "settings": { "configured": true, "base_url": "…", "model": "…", "key_set": true } }
```

- 写入 `spike/model.env`（600）
- **不必重启 5180**：下次 `/v1/swarm/debate` 与 `/v1/debate/live` 直接吃新配置
- 空 `api_key` → `configured=false`；FE 提示「先去设置」

### 可选：开庭 body 覆盖

`POST` body 可带 `"llm": { "api_key", "api_base"|"base_url", "model" }`，仅当次会商覆盖（不强制落盘）。仍不进日志。

## 冒烟

```bash
curl -sS http://127.0.0.1:5180/v1/settings/model
curl -sS -X PUT http://127.0.0.1:5180/v1/settings/model \
  -H 'Content-Type: application/json' \
  -d '{"base_url":"https://open.bigmodel.cn/api/paas/v4","model":"glm-5.3-flash"}'
# 期望 settings.configured 反映 key 是否已有；响应 JSON 无 api_key 字段
```

## risk_level 契约（拒判 ≠ 高风险）

| `gate_verdict` | `risk_level`（done/meta） | UI 徽章 |
| --- | --- | --- |
| `refuse` | `mid` | 中风险 · 先别转（**禁止**高风险） |
| `convict` | `high` | 高风险 |
| `pass` | `low` | 低风险 |

FE `riskFromGate`：`refuse` 优先回 `mid`；否则吃 Backend `meta.risk_level`。
