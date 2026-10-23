# openJiuwen 部署与后端导读

这是「反诈侦探团」最终版：SwarmFlow 上的多个角色对一段催转聊天做会商，本地规则再盖章，决定放行还是打回。页头是「SwarmFlow · 最终版」，标题是「反诈侦探团 · 转账前，先开庭」。仓库里有两块，可以分开跑。

| 目录 | 角色 | 本机回环 |
| --- | --- | --- |
| `openjiuwen-spike` | 后端。现场会商 HTTP 服务，以及它依赖的 openJiuwen 框架源码 | `http://localhost:5180` |
| `openjiuwen-demo-replay` | 前端。回放已经录好的事件；「真实使用」默认走 SwarmFlow | `http://localhost:5174` |

文档里的 `localhost` 是每台电脑自己的回环地址，不是某一台机器的局域网或公网地址，也不是磁盘路径。服务只接受回环绑定。换一台电脑是在那台电脑上自己起一份。

只想看界面、不调模型：装好 Node.js 后只跑前端即可。要看模型真的发言，再按下面把后端拉起来，在页面里填自己的接口。

---

## 环境

| 软件 | 版本 | 用来做什么 |
| --- | --- | --- |
| Python | **3.11、3.12 或 3.13**（不要用 3.14 及以上） | 后端。框架声明见 `openjiuwen-spike/agent-core/pyproject.toml` 的 `requires-python` |
| Node.js | **18 及以上**（建议 20 LTS） | 前端 Vite |
| 一个 OpenAI 兼容接口的 Key | 现场会商才需要 | 默认示例指向智谱 GLM |

先确认版本：

```bash
python --version
node --version
npm --version
```

Windows 上如果 `python` 指向了商店占位符，改用 `py -3.13 --version`，后面的 `python` 也换成 `py -3.13`。

**不要拷贝别人的虚拟环境。** `openjiuwen-spike/.venv` 和 `openjiuwen-demo-replay/node_modules` 跟操作系统、CPU 绑在一起。Linux 上建的 `.venv` 拿到 Windows 不能用。每台机器自己创建。

**不要提交、不要外传** `openjiuwen-spike/spike/model.env`。里面是模型 Key。日志里出现 Key 时，服务会打成 `<REDACTED_API_KEY>`。仓库说明里也不要写自己的磁盘路径、用户目录，或私人模型网关域名。回放数据里的 `api_base` 用的是占位地址。

---

## 第一次安装

在仓库根目录操作。下面的根目录就是同时包含 `openjiuwen-spike` 和 `openjiuwen-demo-replay` 的这一层。

### 1. 后端虚拟环境

macOS / Linux：

```bash
cd openjiuwen-spike
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -r spike/requirements-p2p-smoke.txt
```

Windows PowerShell：

```powershell
cd openjiuwen-spike
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -r spike\requirements-p2p-smoke.txt
```

如果 PowerShell 禁止运行脚本，不必改系统策略，直接用虚拟环境里的解释器：

```powershell
.\.venv\Scripts\python.exe -m pip install -U pip
.\.venv\Scripts\python.exe -m pip install -r spike\requirements-p2p-smoke.txt
```

`requirements-p2p-smoke.txt` 是这条演示链路实际用到的依赖（HTTP、OpenAI SDK、TeamRuntime / SwarmFlow 会碰到的库）。框架本体 **不** 从 PyPI 安装：启动时 `llm_debate.py` 里的 `_bootstrap_openjiuwen()` 把旁边的 `agent-core` 目录插到 `sys.path` 最前面，然后 `import openjiuwen`。这样读到的就是本仓库里的源码。

同一环境里不要再 `pip install openjiuwen`。PyPI 上的包和这份源码不是同一份，混装后很难判断自己改的是哪一棵树。

### 2. 模型配置

页面上就能填。打开前端的「真实使用」，在表单里填 **API Key**、**接口地址**、**模型名**。SwarmFlow 开关默认开着，请求发到本机回环的 `5180`。这三项只放在当前页面的内存里，不写入 `model.env`，也不进浏览器本地存储。刷新页面后 Key 就没了，需要再填。

齿轮保存会 PUT /v1/settings/model 热加载到 5180（见 spike/FE_SETTINGS_CONTRACT.md）；响应/SSE 无明文 Key。空 Key 前端提示「请先去设置」。冒烟脚本仍可用 spike/model.env。

默认地址是 `https://open.bigmodel.cn/api/paas/v4`，默认模型是 `glm-5.3-flash`。协议按 OpenAI 兼容处理，换 DeepSeek 或其他网关时改地址和模型名即可。

本机脚本（`spike/run_*_smoke.py`）和页面上的「典型事例展示」现场双轨仍读 `spike/model.env`。需要跑这些时再复制：

macOS / Linux：`cp model.env.example model.env`  
Windows：`copy model.env.example model.env`

文件放在 `openjiuwen-spike/spike/model.env`。字段名以 `model.env.example` 为准。请求里带了 `llm.api_key` 时，以请求为准，不会回写这个文件。

### 3. 前端依赖

新开一个终端，回到仓库根目录：

```bash
cd openjiuwen-demo-replay
npm install
```

---

## 启动

两个进程，各占一个终端。

**后端**（已激活 `openjiuwen-spike/.venv`）：

```bash
cd openjiuwen-spike/spike
python live_server.py
```

Windows（推荐直接用虚拟环境解释器；**`..\` 与 `.venv` 中间不要空格**）：

```powershell
cd openjiuwen-spike\spike
..\.venv\Scripts\python.exe live_server.py
```

绝对路径示例（本机常见落盘；路径按你的克隆根改）：

```powershell
D:\GrokBot\projects\openjiuwen\openjiuwen-spike\.venv\Scripts\python.exe live_server.py
```

不要用系统自带的 `python live_server.py`：缺 `pydantic` 等依赖时开庭会挂。venv 里 `python.exe` 链到系统 Python 是正常现象，关键是 `site-packages` 是否装全（`pip install -r spike/requirements-p2p-smoke.txt`，缺 `jsonschema-path` 时再补装）。

看到类似一行即表示在听端口：

```text
live debate API on http://127.0.0.1:5180  CORS=http://127.0.0.1:5174
```

上面这一行是进程自己打印的回环绑定，不是某台电脑的对外地址。浏览器请开 `http://localhost:5174`。

另开终端做健康检查。

macOS / Linux：

```bash
curl -sS http://localhost:5180/health
```

Windows PowerShell：

```powershell
Invoke-RestMethod http://localhost:5180/health
```

返回 JSON 里应有 `"ok": true`、`"live": true`、`"fabricate": null`。健康检查本身不跑会商，所以这里的 `"swarmflow"` 是 `false`。页面上的「真实使用」默认提交 `/v1/swarm/debate`。`"engines"` 里同时列出 `teamruntime` 和 `swarmflow`。

**前端：**

```bash
cd openjiuwen-demo-replay
npm run dev
```

浏览器打开 <http://localhost:5174/>。

- **Play / Pause / Step / Reset**：回放 `public/data/` 里已经生成好的事件，不访问后端。
- **真实使用**：SwarmFlow 默认开启，向本机回环的 `5180` 发 `POST /v1/swarm/debate`，会消耗模型额度。跑通后页脚是「SwarmFlow 现场会商 + 本地 rule_gate」。失败停在 SwarmFlow，不自动改走另一条会商。前端把后端写在 `openjiuwen-demo-replay/src/lib/liveSse.ts` 的 `LIVE_BASE`，默认是回环地址。保持默认端口时不用改代码。

可选的静态构建：

```bash
npm run build
npm run preview
```

`preview` 同样在本机回环的 `5174` 端口。

---

## 后端是怎么搭起来的

HTTP 层很薄。真正的框架是旁边的 Python 包 `openjiuwen`（源码在 `openjiuwen-spike/agent-core/openjiuwen`，版本见该目录 `pyproject.toml`，当前为 0.1.19）。本演示没有用 Django / FastAPI 做应用骨架，入口是 `aiohttp` 写的 `spike/live_server.py`。

```text
浏览器 localhost:5174
        │  POST + SSE（text/event-stream）
        ▼
live_server.py          aiohttp，只绑回环 :5180
        │
        ├── POST /v1/swarm/debate    「真实使用」默认
        │         swarm_live.py
        │         run_swarmflow      框架：agent_teams/workflow/runner.py
        │         脚本 swarm_scripts/guard_schema_live.py
        │
        └── POST /v1/debate/live     关掉 SwarmFlow 开关后的旁路
                  llm_debate.py
                  TeamRuntime        框架：core/multi_agent/team_runtime
                  Model.invoke       框架：core/foundation/llm
        │
        ▼
rule_gate.py            本仓库自己的盖章，不进模型
        │
        ▼
SSE：schema → meta → event* → done | error
```

一次请求进来后，`live_server.py` 做四件事：校验 body、调用上面两条引擎之一、把每个角色的发言收成统一事件、用 SSE 推给前端。同一时刻只跑一路会商（进程里有一把锁）。

### 框架在源码里的位置

`agent-core/openjiuwen/` 是 SDK。和这次演示直接相关的是这几块，其余目录（演进、检索、可观测、各种 harness）可以先当库，用到再翻。

| 路径 | 这次演示里它干什么 |
| --- | --- |
| `core/foundation/llm` | 模型客户端。`Model` + `ModelClientConfig` + `ModelRequestConfig`。Provider 写成 `OpenAI` 时走兼容协议 |
| `core/single_agent` | 单个智能体的基类 `BaseAgent`、名片 `AgentCard`、会话 `Session` |
| `core/multi_agent/team_runtime` | `TeamRuntime`。登记多个智能体，用消息总线做点对点 `send` |
| `agent_teams/workflow` | SwarmFlow。`run_swarmflow()` 装载一份 Python 脚本，交给 worker 后端执行，并用 `WorkflowObserver` 往外推进度 |
| `core/runner`、`core/workflow`、`core/application` | SDK 自带的另一条用法：用 `Runner` 跑 `WorkflowAgent`。`agent-core/README.zh.md` 的示例走的是这条。**本演示的 5180 服务不经过 `Runner.run_agent`** |

SDK 说明以 `openjiuwen-spike/agent-core/README.zh.md` 为准。下面只讲 5180 这条进程实际怎么把框架用起来。

### 默认会商：TeamRuntime

代码在 `openjiuwen-spike/spike/llm_debate.py`。

1. `resolve_model_env()` 优先用请求体里的 `llm`（`api_key` / `api_base` / `model`）。没有 Key 时再读 `model.env`。请求里的 Key 不写入环境变量，也不落盘。
2. `_build_model()` 组装 `ModelClientConfig` / `ModelRequestConfig`，得到一个 `Model`。超时 120 秒，`temperature=0.3`。
3. `build_agents()` 在函数内部定义 7 个类，都继承框架的 `CommunicableAgent` 和 `BaseAgent`：特征官、证据官、风险官、合规官、用户保护官、反方官、`human_confirm`。每个类实现 `invoke()`，里面调用 `Model`，再把结果收成一条事件。
4. 为每个角色建一张 `AgentCard`（`id` 如 `feature`，`name` 如「特征官」）。
5. `runtime = TeamRuntime()`，然后 `runtime.register_agent(card, lambda: SomeAgent(card=card))`。注册的是工厂，不是已经构造好的实例。
6. `await runtime.start()` 拉起这个团队自己的消息总线。
7. 业务代码按固定顺序 `await runtime.send(message, recipient="feature", sender="user")`，下一跳把上一跳的结果当 message 再发给下一个 `recipient`。顺序是：特征官 → 证据官 → 风险官 → 合规官 → 反方官，以及保护官、人工确认。`recipient` 必须等于某张名片的 `id`。

`TeamRuntime` 本身不管「保镖业务」。它只管：这张名片对应哪个工厂、消息发给谁、超时多久。角色提示词、案卷摘录、事件字段都写在 `spike/` 里。

案卷和规则是普通 JSON：

- `spike/case/dossier.json`：演示案 `CASE-SPIKE-FAB-001`，只有 `EV-001`、`EV-002`
- `spike/rules/base.json`：`R-01` 催转话术，`R-02` 证据编号必须在案卷里

### 盖章：rule_gate

`spike/rule_gate.py` 不调用模型。它扫描各角色发言里的 `evidence_ids` / `rule_ids`，跟案卷和规则库做集合比对。编号不在库里，就记为编造。编造编号不能支撑定罪，盖章结果可以是 `refuse`。

所以模型可以在发言里胡说一个证据号，最终裁定仍由这段本地代码决定。页脚口径是「真 LLM 现场会商 + 本地 rule_gate」。

### 展示轨：SwarmFlow

`POST /v1/swarm/debate` 进入 `spike/swarm_live.py`，调用框架的 `run_swarmflow()`，脚本是 `spike/swarm_scripts/guard_schema_live.py`。

这份脚本的写法和服务里的 Agent 类不同。它向加载器要的名字是：

```python
from swarmflow import agent, log, phase
```

文件顶上有 `META`（流程名 `guard-schema-live`、五个 phase：特征、查证、风险、合规、保护），以及每个角色要返回的 JSON Schema。`run_swarmflow` 用 `TeamWorkerBackend` 起真实模型 worker，用 `WorkflowObserver` 在整次跑完之前就把进度和事件推出来。真实使用表单默认提交 `POST /v1/swarm/debate`。这次跑通后 SSE 里 `swarmflow` 为 `true`，页脚是「SwarmFlow 现场会商 + 本地 rule_gate」。失败停在 SwarmFlow，不自动改走 `/v1/debate/live`。

Swarm 跑起来会在 `spike/swarm_live_home/` 下写团队工作区（会话、日志、各 worker 的工作目录）。那是运行产物，换机器时不用拷。

脚本目录至少要留着这三个文件，缺了展示轨会失败并降级回 TeamRuntime：

- `swarm_scripts/guard_schema_live.py`
- `swarm_scripts/guard_schema_mini.py`
- `swarm_scripts/mini_theme.py`

### HTTP 契约（后端同学够用的部分）

| 方法 | 路径 | 行为 |
| --- | --- | --- |
| `GET` | `/health` | 存活检查。不调模型 |
| `GET` | `/v1/showcase` | 展示用的静态说明 |
| `POST` | `/v1/debate/live` | 默认引擎 TeamRuntime。也接受 `GET`，用查询参数 `?gate=true` |
| `POST` | `/v1/swarm/debate` | SwarmFlow。body 里要有 `transcript` |

SSE 事件名：`schema`（字段约定）、`meta`（本次是否盖章、模型名，不含 key）、`event`（一个角色一句）、`done`（终局 `gate_verdict`）、`error`。

两种 body：

- **回放演示体**：可以不带 `transcript`，例如 `{"gate": true, "case_id": "CASE-SPIKE-FAB-001"}`。走预制案卷。
- **现场粘贴体**：带 `transcript`（也认旧字段 `chat_transcript`）。去空白后短于 20 字返回 `transcript_too_short`，不调模型；长于 8000 字截断。可带 `amount`、`payee`、`urgency`（`low` / `mid` / `high`，非法则回落 `mid`）、`suspect_links`、`user_note`。

`gate: true` 时会跑本地盖章。现场粘贴这条路径使用证据号 `EV-LIVE-001`，规则仍是 `R-01`、`R-02`。

更细的字段表在 `openjiuwen-spike/spike/LIVE.md`。前端和 Swarm 的降级约定在 `openjiuwen-spike/spike/FE_SWARM_CONTRACT.md`。

跨域只放行一个来源，默认是前端那个回环源。服务启动时若 `OPENJIUWEN_LIVE_HOST` 不是回环地址，进程会直接退出。下面表里的值是代码默认值，指的是本机回环，不是某台电脑的对外地址。

| 环境变量 | 默认 | 作用 |
| --- | --- | --- |
| `OPENJIUWEN_LIVE_HOST` | 回环地址 | 只允许本机回环。代码里的字面量是回环，不要改成局域网或公网地址 |
| `OPENJIUWEN_LIVE_PORT` | `5180` | 后端端口。改了之后还要改前端 `LIVE_BASE`，否则页面仍打原来的端口 |
| `OPENJIUWEN_LIVE_CORS` | 前端回环源 | 允许的前端源，要和浏览器地址栏一致 |

---

## 自己打一发请求

健康检查通过之后。下面这条走 SwarmFlow，会调用模型，聊天记录至少 20 字。

macOS / Linux：

```bash
curl -sS -N -X POST http://localhost:5180/v1/swarm/debate \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"gate":true,"transcript":"对方自称客服催我立刻转到安全账户，金额五千，说不转就冻结。"}'
```

Windows PowerShell 把 JSON 交给 `curl.exe` 时，引号容易被吃掉，用文件更稳：

```powershell
Set-Content -Encoding utf8 body.json '{"gate":true,"transcript":"对方自称客服催我立刻转到安全账户，金额五千，说不转就冻结。"}'
curl.exe -N -X POST http://localhost:5180/v1/swarm/debate `
  -H "Content-Type: application/json" `
  -H "Accept: text/event-stream" `
  --data-binary "@body.json"
```

关掉页面上的 SwarmFlow 开关时，同一份 body 改发 `http://localhost:5180/v1/debate/live`。

不烧模型、只核对参数校验：

```bash
cd openjiuwen-spike/spike
python run_live_actual_layer_smoke.py
```

期望输出里有 `PASS_MARKER live_actual_layer`。这条默认不请求模型。

---

## 建议阅读顺序

按这个顺序读，能从「请求从哪进来」走到「框架类在哪」：

1. `openjiuwen-spike/spike/live_server.py` — 路由、CORS、SSE、两套入口怎么分支。
2. `openjiuwen-spike/spike/llm_debate.py` — `TeamRuntime` 的注册和 `send` 顺序；`_bootstrap_openjiuwen()` 如何挂上源码。
3. `openjiuwen-spike/spike/rule_gate.py` — 盖章规则，纯函数，没有模型。
4. `openjiuwen-spike/spike/event_schema.py` — 推给前端的事件长什么样。
5. `openjiuwen-spike/agent-core/openjiuwen/core/multi_agent/team_runtime/team_runtime.py` — `register_agent` / `start` / `send` 的实现。
6. `openjiuwen-spike/spike/swarm_live.py` 和 `spike/swarm_scripts/guard_schema_live.py` — 展示轨如何把脚本交给框架。
7. `openjiuwen-spike/agent-core/openjiuwen/agent_teams/workflow/runner.py` — `run_swarmflow` 的入口说明。
8. `openjiuwen-spike/agent-core/openjiuwen/core/foundation/llm/model.py` — `Model` 怎么发 HTTP。
9. `openjiuwen-spike/agent-core/README.zh.md` — SDK 自己的 WorkflowAgent / ReActAgent 用法。那是框架的另一条产品路径，和 5180 进程并列，方便以后对照。

`spike/run_*_smoke.py` 是一条条验收脚本，适合在读完对应模块后跑，用来确认自己的理解和现有行为一致。

---

## 换机器时要带什么

要带：

- `openjiuwen-spike/agent-core/`（框架源码）
- `openjiuwen-spike/spike/` 下的 `.py`、`swarm_scripts/`、`case/`、`rules/`、`model.env.example`、`requirements-p2p-smoke.txt`、`log_config_p2p.yaml`、`config_*.yaml`
- `openjiuwen-demo-replay/` 里除 `node_modules` 和 `dist` 以外的源码（至少 `package.json`、`package-lock.json`、`src/`、`public/`、`index.html`、`vite.config.ts`、`tsconfig*.json`）

可以不带，到新机器会自己长出来：

- `openjiuwen-spike/.venv`
- `openjiuwen-demo-replay/node_modules`
- `openjiuwen-demo-replay/dist`（`npm run build` 再生）
- `openjiuwen-spike/spike/swarm_live_home/`
- `openjiuwen-spike/spike/logs/`
- `model.env`（在新机器上从 example 复制，自己填 Key）

---

## 碰到这些情况

| 现象 | 处理 |
| --- | --- |
| `No module named aiohttp` 或别的第三方包 | 确认用的是 `openjiuwen-spike/.venv` 里的解释器，并且已经 `pip install -r spike/requirements-p2p-smoke.txt` |
| 页面提示「请填写 API Key」 | 真实使用表单的 Key 是空的。填上后再点「开始裁定」 |
| `missing_model_env` | 这次请求没带 Key，本机也没有 `spike/model.env`。在页面填写，或按上面的步骤建 `model.env` |
| 页面提示连不上后端 | 后端终端还在跑；用的是回环地址，不是局域网地址；前端源和 `OPENJIUWEN_LIVE_CORS` 一致 |
| `refusing non-local bind` | `OPENJIUWEN_LIVE_HOST` 被设成了回环以外的地址。改回回环 |
| 浏览器能开页面，现场会商一直转圈后报错 | 看后端终端。模型 `API_BASE`、Key、模型名是否匹配；公司网络是否拦了 HTTPS |
| `swarm_debate_failed` 然后仍有结果 | 展示轨失败后服务会降级到 `/v1/debate/live`。先确认 `swarm_scripts/guard_schema_live.py` 还在 |
| `npm install` 失败 | Node 版本低于 18，或当前目录不是 `openjiuwen-demo-replay` |
| 启动报无法将 `..\` 识别为 cmdlet | PowerShell 把路径拆开了：`..\` 与 `.venv` **中间不能有空格** |
| `OSError: [WinError 10048] ... 5180 ... 只允许使用一次` | 端口被旧进程占用。`Get-NetTCPConnection -LocalPort 5180` 看 OwningProcess，再 `Stop-Process -Id PID -Force`，然后用上面的 venv 命令重启 |
| `ModuleNotFoundError: No module named 'pydantic'`（开庭挂） | 没用 `openjiuwen-spike/.venv`，或 venv 被掏空。在 `openjiuwen-spike` 下用 `.venv\Scripts\python.exe -m pip install -r spike\requirements-p2p-smoke.txt`（必要时加 `jsonschema-path`），再用 `..\.venv\Scripts\python.exe live_server.py` |
| 激活 venv 时 PowerShell 报脚本无法加载 | 改用 `..\.venv\Scripts\python.exe live_server.py`，从 `spike` 目录执行 |

前端页面怎么操作，见 `openjiuwen-demo-replay/README.md`。接口字段的冻结说明见 `openjiuwen-spike/spike/LIVE.md`。
