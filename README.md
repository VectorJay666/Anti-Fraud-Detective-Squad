# 转账前保镖：本机部署

按本文可以从一台新机器启动演示。不需要其他聊天记录或内部笔记。

演示只监听本机 `127.0.0.1`。换机器是在那台机器上重新安装并启动，不是把服务暴露到局域网或公网。

仓库里有两个目录：

| 目录 | 作用 | 默认地址 |
| --- | --- | --- |
| `openjiuwen-spike` | 后端。现场会商 HTTP 服务，以及它使用的 openJiuwen 源码 | `http://127.0.0.1:5180` |
| `openjiuwen-demo-replay` | 前端。回放已录好的事件；「真实使用」才会请求后端 | `http://127.0.0.1:5174` |

默认端口是 **5174**（页面）和 **5180**（后端）。不设置任何变量时就是这两个端口。如果被占用，按下文「端口被占用」改两个变量后重启，不要改源码。

只看回放、不调用模型：完成「环境」和「前端依赖」，然后只执行「启动前端」。现场裁定需要后端和模型 Key。

---

## 环境

| 项目 | 要求 |
| --- | --- |
| 操作系统 | Windows 10/11、macOS 或 Linux。无 GPU 要求 |
| Git | 能 `git clone` |
| Python | **3.11、3.12 或 3.13**。不要用 3.14 及以上。框架声明是 `>=3.11,<3.14`（`openjiuwen-spike/agent-core/pyproject.toml`） |
| Node.js | **18 或更高**，建议 20 LTS。自带 `npm` |
| 网络 | 安装依赖需要访问 PyPI 和 npm。现场裁定还要能访问你填写的模型接口 |
| 模型 Key | 仅现场裁定需要。接口须兼容 OpenAI。示例默认指向智谱 GLM，可改成自己的网关 |

检查版本：

```bash
python3 --version
node --version
npm --version
```

Windows 上如果 `python` 打开的是商店占位程序，改用已安装的 3.11–3.13，例如 `py -3.12 --version`。后文的 `python3` 在 Windows 上换成同一个启动器。

不要拷贝别人机器上的 `openjiuwen-spike/.venv` 或 `openjiuwen-demo-replay/node_modules`。虚拟环境和依赖目录跟操作系统、CPU 绑在一起，每台机器自己创建。

不要提交、不要外传 `openjiuwen-spike/spike/model.env`。该文件里是模型 Key。

---

## 1. 取得代码

可运行的演示在分支 `openjiuwen-final`。GitHub 默认分支 `main` 不是这份演示。

```bash
git clone https://github.com/VectorJay666/openjiuwen-fraud-detectives.git
cd openjiuwen-fraud-detectives
git checkout openjiuwen-final
```

确认当前目录就是仓库根（同时能看到下面两个路径）：

```bash
test -f openjiuwen-spike/spike/live_server.py && test -f openjiuwen-demo-replay/package.json && echo OK
```

Windows PowerShell：

```powershell
if ((Test-Path openjiuwen-spike\spike\live_server.py) -and (Test-Path openjiuwen-demo-replay\package.json)) { "OK" }
```

输出不是 `OK` 时，先 `git checkout openjiuwen-final`，不要在 `main` 上继续安装。

后文命令都以这个根目录为起点。写到 `cd` 的地方，都是从根目录进入。

---

## 2. 安装后端

macOS / Linux：

```bash
cd openjiuwen-spike
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -r spike/requirements-p2p-smoke.txt
```

Windows PowerShell（把 `py -3.12` 换成你本机的 3.11–3.13）：

```powershell
cd openjiuwen-spike
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -U pip
.\.venv\Scripts\python.exe -m pip install -r spike\requirements-p2p-smoke.txt
```

如果激活脚本被 PowerShell 拦住，不必改执行策略。后面启动也直接用 `.venv\Scripts\python.exe`。

不要再执行 `pip install openjiuwen`。后端启动时会把旁边的 `agent-core` 放到导入路径最前面，用的是仓库里的源码。再装一份 PyPI 包会和这份源码混在一起。

---

## 3. 填写模型配置

回放不需要这一步。要点「真实使用」做现场裁定，必须做。

在仓库根目录：

macOS / Linux：

```bash
cp openjiuwen-spike/spike/model.env.example openjiuwen-spike/spike/model.env
```

Windows：

```powershell
copy openjiuwen-spike\spike\model.env.example openjiuwen-spike\spike\model.env
```

用编辑器打开 `openjiuwen-spike/spike/model.env`，至少填入 Key。其余行保持与示例一致，或改成你自己的兼容接口：

```text
OPENJIUWEN_LLM_API_KEY=你的key
OPENJIUWEN_LLM_API_BASE=https://open.bigmodel.cn/api/paas/v4
OPENJIUWEN_LLM_MODEL=glm-5.3-flash
OPENJIUWEN_LLM_PROVIDER=openai
OPENJIUWEN_LLM_CLIENT_ID=glm-flash
```

`OPENJIUWEN_LLM_PROVIDER=openai` 表示走 OpenAI 兼容协议，不表示必须使用 OpenAI 的模型。文件名必须是 `model.env`，并且和 `live_server.py` 在同一目录 `openjiuwen-spike/spike/`。Key 那一行不能空。

---

## 4. 安装前端

新开一个终端，回到仓库根目录：

```bash
cd openjiuwen-demo-replay
npm ci
```

`npm ci` 按 `package-lock.json` 安装。若该命令不可用，在同一目录执行 `npm install`。

---

## 5. 启动

两个进程，两个终端。先启动后端，再启动前端。

默认不设置端口变量。页面是 `http://127.0.0.1:5174/`，后端是 `http://127.0.0.1:5180`。5174 或 5180 已被占用时，先做下一节，再回到这里启动。

### 后端

macOS / Linux（在已激活 `.venv` 的终端）：

```bash
cd openjiuwen-spike/spike
python live_server.py
```

未激活虚拟环境时：

```bash
cd openjiuwen-spike/spike
../.venv/bin/python live_server.py
```

Windows：

```powershell
cd openjiuwen-spike\spike
..\.venv\Scripts\python.exe live_server.py
```

成功时终端打印一行，默认类似：

```text
live debate API on http://127.0.0.1:5180  CORS=http://127.0.0.1:5174
```

`live debate API on` 后面的地址是后端。`CORS=` 后面的地址必须和浏览器地址栏一致（含 `127.0.0.1` 和端口）。这一行没有出现、或进程马上退出，按「常见问题」处理。保持这个终端开着。

### 前端

另一个终端，仓库根目录：

```bash
cd openjiuwen-demo-replay
npm run dev
```

成功时终端有一行 `Local:`，默认是：

```text
Local:   http://127.0.0.1:5174/
```

用这一行里的地址打开浏览器，不要改成 `localhost`，除非你同时把 CORS 配成同一个来源。页面标题是「反诈侦探团 · 第二幕对照」。

---

## 6. 怎样算启动成功

把下面地址里的端口换成你实际使用的端口。默认就是 5174 和 5180。

### 6.1 后端健康检查（不调用模型）

macOS / Linux：

```bash
curl -sS http://127.0.0.1:5180/health
curl -sS http://127.0.0.1:5180/v1/showcase
```

Windows PowerShell：

```powershell
Invoke-RestMethod http://127.0.0.1:5180/health
Invoke-RestMethod http://127.0.0.1:5180/v1/showcase
```

`/health` 的 JSON 里要有 `"ok": true` 和 `"live": true`。`"swarmflow": false` 是健康检查的正常值，不表示服务启动失败。

`/v1/showcase` 里：

- `url` 是页面地址，默认 `http://127.0.0.1:5174/`
- `live_base` 是后端地址，默认 `http://127.0.0.1:5180`

这两个字段必须和你打开的页面、后端启动行一致。不一致就不要继续做现场裁定，先改端口配置并同时重启两个进程。

不调用模型的接口检查（后端已在运行，且当前终端能看到同一组端口变量）：

```bash
cd openjiuwen-spike/spike
python run_live_actual_layer_smoke.py
```

Windows 把 `python` 换成 `..\.venv\Scripts\python.exe`。输出里要有 `PASS_MARKER live_actual_layer`。

### 6.2 回放（不需要后端，不消耗模型额度）

1. 浏览器打开前端 `Local:` 那一行的地址。
2. 确认顶部在「典型事例展示」。
3. 点击 **Play**。

左右两侧会按已录好的事件逐步出现文字。这一步没有请求 5180。

### 6.3 现场裁定（消耗模型额度）

后端终端仍在运行，并且 `model.env` 里已填写 Key。

1. 点击顶部 **真实使用**。
2. 在「会话原文」粘贴下面这段（不少于 20 字）：

```text
对方自称客服，催我立刻转到安全账户，金额五千，说不转就冻结银行卡。
```

3. 其余输入可以留空。保持「本地 rule_gate」和「平台 Swarm 展示」的默认勾选。
4. 点击 **开始裁定**。

成功：几十秒到两分钟内出现角色发言（特征官、证据官等），页脚有裁定结果。这一步会请求你配置的模型接口。

失败且页面写「连不上本机 …」：后端没在听，或页面请求的端口不是后端那一个。看下一节和「常见问题」。

---

## 端口被占用

5174 或 5180 已被别的程序使用时，进程会退出并提示 `Port ... is already in use` 或 `address already in use`。它不会自动改绑到下一个端口。自动换端口会让浏览器地址和后端允许的来源对不上，现场裁定会失败。

选两个空闲端口。下面用页面 **18080**、后端 **18081** 举例。换成任意 1–65535 的空闲端口即可。

### 推荐做法：写一个 `.env`

在仓库根目录执行：

macOS / Linux：

```bash
cp openjiuwen-demo-replay/.env.example openjiuwen-demo-replay/.env
```

Windows：

```powershell
copy openjiuwen-demo-replay\.env.example openjiuwen-demo-replay\.env
```

编辑 `openjiuwen-demo-replay/.env`，只改这两行：

```text
OPENJIUWEN_DEMO_PORT=18080
OPENJIUWEN_LIVE_PORT=18081
```

保存后，**两个终端都重新启动**（先停掉已退出或仍占用旧端口的进程）：

```bash
cd openjiuwen-spike/spike
python live_server.py
```

```bash
cd openjiuwen-demo-replay
npm run dev
```

Windows 后端仍用 `..\.venv\Scripts\python.exe live_server.py`。

前端和后端都会读这个文件。已经在 shell 里导出的同名变量优先于文件。

启动行应变成：

```text
live debate API on http://127.0.0.1:18081  CORS=http://127.0.0.1:18080
```

```text
Local:   http://127.0.0.1:18080/
```

浏览器打开 `http://127.0.0.1:18080/`。健康检查改为：

```bash
curl -sS http://127.0.0.1:18081/health
curl -sS http://127.0.0.1:18081/v1/showcase
```

`showcase.url` 应为 `http://127.0.0.1:18080/`，`showcase.live_base` 应为 `http://127.0.0.1:18081`。然后按第 6 节做回放和现场裁定。

### 页面怎样知道后端端口

不需要改 `src` 里的地址。`npm run dev`、`npm run build`、`npm run preview` 启动时读取环境，并按下面顺序决定页面请求的基址：

1. `VITE_LIVE_BASE`，若设置了完整 URL
2. 否则 `OPENJIUWEN_LIVE_BASE`，若设置了完整 URL
3. 否则 `http://127.0.0.1:<OPENJIUWEN_LIVE_PORT>`，端口默认 5180

后端监听的是 `OPENJIUWEN_LIVE_PORT`，不是 `VITE_LIVE_BASE`。因此正常换端口只改 `OPENJIUWEN_DEMO_PORT` 和 `OPENJIUWEN_LIVE_PORT`。页面会去请求 `http://127.0.0.1:` 加上你写的后端端口。

后端允许的浏览器来源默认是 `http://127.0.0.1:<OPENJIUWEN_DEMO_PORT>`。所以页面端口一改，后端也要重启，CORS 才会跟着变。

只改其中一个端口也可以：

- 只改页面、后端仍用 5180：只设置 `OPENJIUWEN_DEMO_PORT`
- 只改后端、页面仍用 5174：只设置 `OPENJIUWEN_LIVE_PORT`

改完必须同时重启前端和后端。使用 `npm run build` 后再 `npm run preview` 时，改端口后要重新 build，基址在构建时写入页面。

`VITE_LIVE_BASE` 只在页面要请求的完整地址不是 `http://127.0.0.1:<后端端口>` 时才填，而且必须和后端实际监听的地址一致。后端拒绝绑定 `127.0.0.1`、`localhost`、`::1` 以外的地址。

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `OPENJIUWEN_DEMO_PORT` | `5174` | 前端 dev / preview 端口。未另设 CORS 时，后端用它组成允许的来源 |
| `OPENJIUWEN_LIVE_PORT` | `5180` | 后端监听端口。也是页面默认请求的端口 |
| `VITE_LIVE_BASE` | `http://127.0.0.1:<OPENJIUWEN_LIVE_PORT>` | 可选。页面请求的完整基址，覆盖上一行的推导 |
| `OPENJIUWEN_LIVE_BASE` | 与后端绑定地址相同 | 可选。检查脚本的请求基址；页面在没设 `VITE_LIVE_BASE` 时也认它。不改变后端监听端口 |
| `OPENJIUWEN_LIVE_CORS` | `http://127.0.0.1:<OPENJIUWEN_DEMO_PORT>` | 可选。允许的浏览器来源，必须和地址栏的协议、主机、端口一致 |
| `OPENJIUWEN_LIVE_HOST` | `127.0.0.1` | 后端绑定地址。不要改成局域网 IP |

也可以不写 `.env`，而在**每个**要启动的终端里先导出再启动。两个终端不会共享另一次导出的变量。

macOS / Linux：

```bash
export OPENJIUWEN_DEMO_PORT=18080
export OPENJIUWEN_LIVE_PORT=18081
```

Windows PowerShell：

```powershell
$env:OPENJIUWEN_DEMO_PORT = "18080"
$env:OPENJIUWEN_LIVE_PORT = "18081"
```

路径 `/health`、`/v1/showcase`、`/v1/debate/live`、`/v1/swarm/debate` 不随端口改变。

---

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 根目录没有 `openjiuwen-spike` 或 `openjiuwen-demo-replay` | 当前在 `main`。执行 `git checkout openjiuwen-final` |
| `No module named aiohttp` 或其他第三方模块找不到 | 用 `openjiuwen-spike/.venv` 里的解释器。确认已执行 `pip install -r spike/requirements-p2p-smoke.txt`。不要用系统里另一个 `python` |
| 从别的电脑拷来的 `.venv` 无法运行 | 删掉该 `.venv`，按第 2 节在本机重建 |
| `missing model env` 或 `OPENJIUWEN_LLM_API_KEY missing` | `openjiuwen-spike/spike/model.env` 不存在，或 Key 那一行是空的。从 `model.env.example` 复制后再填 |
| `Port 5174 is already in use` 或 `address already in use` | 按「端口被占用」换端口，写入 `.env`，然后同时重启前端和后端。不要只改一边 |
| 页面能开，点击「开始裁定」后提示连不上 | 后端终端仍在运行。启动行里的端口等于页面正在请求的端口。浏览器用 `127.0.0.1`，不要用 `localhost`，除非 `OPENJIUWEN_LIVE_CORS` 也写成 `http://localhost:<页面端口>` |
| `refusing non-local bind` | `OPENJIUWEN_LIVE_HOST` 不是本机地址。改回 `127.0.0.1` 或删掉这一行 |
| 页面一直转圈后报错，但不是「连不上」 | 看后端终端。检查 `OPENJIUWEN_LLM_API_BASE`、Key、`OPENJIUWEN_LLM_MODEL` 是否匹配，以及本机能否访问该 HTTPS 地址 |
| `npm ci` 或 `npm install` 失败 | 确认 Node 不低于 18，当前目录是 `openjiuwen-demo-replay` |
| PowerShell 禁止运行 `Activate.ps1` | 不要激活。安装和启动都用 `openjiuwen-spike\.venv\Scripts\python.exe` |
| 改了 `.env` 但页面仍请求旧端口 | 停掉 `npm run dev` 后重新运行。若使用的是 build 产物，重新执行 `npm run build` |

---

## 附录：代码位置

部署不必阅读本节。

HTTP 入口是 `openjiuwen-spike/spike/live_server.py`（aiohttp）。框架源码在 `openjiuwen-spike/agent-core/openjiuwen`，由 `llm_debate.py` 在启动路径上加入 `sys.path`，不从 PyPI 安装。

```text
浏览器  127.0.0.1:<OPENJIUWEN_DEMO_PORT>
        │  POST，响应为 text/event-stream
        ▼
live_server.py     127.0.0.1:<OPENJIUWEN_LIVE_PORT>
        ├── POST /v1/debate/live      默认会商
        └── POST /v1/swarm/debate     另一条会商路径
        ▼
本地规则比对（spike/rule_gate.py）后，把角色发言推给页面
```

| 方法 | 路径 | 行为 |
| --- | --- | --- |
| `GET` | `/health` | 存活检查，不调用模型 |
| `GET` | `/v1/showcase` | 返回当前页面地址和后端地址 |
| `POST` | `/v1/debate/live` | 默认会商。也可以 `GET ?gate=true` |
| `POST` | `/v1/swarm/debate` | 需要正文里的 `transcript` |

现场粘贴的 `transcript` 去掉空白后短于 20 字会直接返回错误，不调用模型；长于 8000 字会被截断。

更细的字段说明在 `openjiuwen-spike/spike/LIVE.md`。前端目录 `openjiuwen-demo-replay/README.md` 只说明回放数据，启动命令以本文为准。
