# openJiuwen · Live API（5180）本机启动

路径：`openjiuwen-spike/spike`（相对仓库根目录）  
绑定：本机回环 `5180`（CORS 放行前端回环 `5174`）

## 口径（必读）

- 页脚只写：**真 LLM 现场会商 + 本地 rule_gate**
- 默认 `POST /v1/debate/live` = TeamRuntime（`swarmflow:false`）
- 展示轨 `POST /v1/swarm/debate` = 真实 SwarmFlow + progress SSE
- **材料/Demo 禁写「已接 Swarm」**，直到 Test 全口径盖章

## 目录结构（期望）

```
openjiuwen-spike\
  START-Live-5180.md
  agent-core\          # 精简包：至少含 openjiuwen 包（脚本 sys.path 找这里）
  spike\
    live_server.py
    model.env          # 含 Key，勿提交、勿外传
    model.env.example
    *.py / *.md / config_*.yaml / case\ / fixtures\ / rules\
```

## Windows 注意

盒子上用的是 Linux `.venv`（**不能**直接拷到 Windows 用）。本机需要：

1. 安装 Python 3.11+  
2. 在 `openjiuwen-spike` 建 venv 并装依赖（至少 `aiohttp`，以及 agent-core / openjiuwen 所需包；见 `agent-core\pyproject.toml`）  
3. 再启动 `live_server.py`

若暂时搞不定 venv：**只开 Demo 回放**（5174）即可自测前端。

## 启动

```powershell
cd openjiuwen-spike\spike
..\.venv\Scripts\python.exe live_server.py
```

健康检查：

```powershell
curl http://127.0.0.1:5180/health
# 期望 "ok":true,"live":true,"fabricate":null
```

Demo 另开终端：

```powershell
cd openjiuwen-demo-replay
npm run dev
```

## 展示轨（自测 API，勿写材料口径）

```powershell
# 需 transcript；详见 FE_SWARM_CONTRACT.md / LIVE.md
curl -N -X POST http://127.0.0.1:5180/v1/swarm/debate -H "Content-Type: application/json" -H "Accept: text/event-stream" -d "{\"gate\":true,\"transcript\":\"对方自称客服催我立刻转到安全账户，金额五千，说不转就冻结……\"}"
```

## Windows 必带目录（2026-10-21）

Swarm 展示轨依赖 `spike/swarm_scripts/`，至少包含：

- `guard_schema_live.py`（缺则 Demo 报 `swarm_debate_failed` 并降级 TeamRuntime）
- `guard_schema_mini.py`
- `mini_theme.py`

拷包时不要只拷 `live_server.py` / `swarm_live.py`。材料仍禁写「已接 Swarm」。

## 常见坑

- PowerShell：`..\` 与 `.venv` **中间不能有空格**
- 5180 被占：`Get-NetTCPConnection -LocalPort 5180` 后 `Stop-Process -Id PID -Force`
- 必用 `.venv\Scripts\python.exe`，勿用系统 python（否则易缺 pydantic）
- 齿轮：`GET`/`PUT /v1/settings/model` 热加载，见 `spike/FE_SETTINGS_CONTRACT.md`
