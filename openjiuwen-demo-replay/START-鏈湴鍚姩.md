# openJiuwen · 转账前保镖 Demo（Vite）本地启动

路径：`D:\GrokBot\projects\openjiuwen-demo-replay`  
端口：**127.0.0.1:5174**（勿用 ICT 的 5273）

Live API（现场会商）：`D:\GrokBot\projects\openjiuwen-spike\spike` → **127.0.0.1:5180**

## 这是什么

左右对照回放：无卡口 vs 有 `rule_gate` refuse。数据在 `public/data/`（**events-llm***，与 spike 逐字节一致）。  
**回放**页脚：GLM 真会商 + 本地 gate；编造为**确定性注入**（非模型自发）。**不是** SwarmFlow。  
**现场会商**页脚：只标「真 LLM 现场会商 + 本地 rule_gate」，**禁止**写注入 / 「已接 Swarm」。  
展示轨（Backend）：`POST /v1/swarm/debate` + progress SSE；**材料仍禁写「已接 Swarm」**，等 Test 全口径盖章。

## 前置

- Node 20+（本包一般已带本机 `node_modules`；若缺再 `npm install`）
- 仅测回放：无需 Python
- 测「现场会商」：同机还需 Live API `127.0.0.1:5180`（见下方终端 A；Key 在 spike 的 `model.env`，勿提交）

## 启动（只测回放 · 一条命令）

```powershell
cd D:\GrokBot\projects\openjiuwen-demo-replay
npm run dev
```

浏览器：`http://127.0.0.1:5174/`

若报缺依赖：先 `npm install` 再 `npm run dev`。

## 启动（现场会商 = 双进程）

终端 A（Live API）：

```powershell
cd D:\GrokBot\projects\openjiuwen-spike\spike
# 需本机已有 Python 依赖（盒子上用 ../.venv；Windows 需自建 venv 或装 requirements）
# 并保证同级目录有 agent-core（脚本会找 ..\agent-core）
python live_server.py
# 期望绑定 127.0.0.1:5180
```

健康检查：

```powershell
curl http://127.0.0.1:5180/health
# 期望 "ok":true,"live":true
```

终端 B（Demo）：

```powershell
cd D:\GrokBot\projects\openjiuwen-demo-replay
npm run dev
```

工具栏点 **「现场会商」**：顺序双轨（先左 `gate:false`，再右 `gate:true`）；Backend `_run_lock`，不可并行。  
Swarm 展示轨在 API：`POST /v1/swarm/debate`（progress SSE）；**勿在材料里写「已接 Swarm」**。

本机若 Python/venv/agent-core 未就绪，**先测回放**即可。

## 自测要点

- Play / Step / Reset 能走完两侧；进度时间线（ProgressTimeline）可见
- 右侧应出现 gate refuse / 打回（相对左侧无卡口）
- 回放页脚诚实写 TeamRuntime + 本地 gate（勿写 SwarmFlow）
- Live：页脚「真 LLM 现场会商」；右侧应有 refuse；勿写「已接 Swarm」

参考截图：`shots/act2-compare-vite.png`、`shots/live-contrast.png`  
接口说明：`LIVE-API.md`

## 停

终端 Ctrl+C。旧静态备份在 `legacy-static/`（一般不用）。  
**用户 OK 前不 push GitHub。**
