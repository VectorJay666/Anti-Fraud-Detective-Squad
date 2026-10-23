# 转账前保镖 · 第二幕对照回放（Vite + TS）

左右对照回放：

| 侧 | 数据 | 结局 |
| --- | --- | --- |
| **无卡口** | `public/data/events.json`（= `events-llm.json`） | `human_confirm approved true`，编造 `EV-FAB-TRANSFER` / `R-99` 被放行 |
| **有卡口** | `public/data/events-v2.json`（= `events-llm-v2.json`） | `gate_verdict=refuse`，规则盖章打回 |

> **范围**：GLM 真会商（特征/证据/反方）+ 本地 `rule_gate`；编造为确定性注入，非模型自发。**不是** SwarmFlow / hierarchical。

旧静态版备份在 `legacy-static/`。

## 怎么跑

```bash
cd /workspace/openjiuwen/demo-replay
npm install
npm run dev
```

浏览器：<http://127.0.0.1:5174/>

构建：

```bash
npm run build
npm run preview   # 同样绑 127.0.0.1:5174
```

## 操作

- **Play** / **Pause**：两侧同步自动步进（约 900ms）
- **Step**：各推进一条事件
- **Reset**：清屏重来
- **现场会商**（默认关）：切 live 模式，顺序调 `127.0.0.1:5180` 双轨（先 `gate:false` 左，再 `gate:true` 右）；页脚改为「真 LLM 现场会商 + 本地 rule_gate」，**不写**确定性注入
- **返回回放**：恢复 fixtures，不刷新页

Live 需先起 Backend：`cd /workspace/openjiuwen-spike/spike && ../.venv/bin/python live_server.py`（见 `LIVE-API.md` / spike `LIVE.md`）。

不在案卷/规则库的 `evidence_ids` / `rule_ids` 显示红标「无据」（有效：`EV-001` `EV-002` `R-01` `R-02`，见 `dossier.json` / `rules.json`）。

## 数据

- 运行时从 `/data/*.json` 加载（Vite `public/data/`）
- 仓库根下仍保留 `data/` 副本便于对照；换源时请同步拷到 `public/data/`
- 可选后续：`events-llm*.json`（未默认启用）
