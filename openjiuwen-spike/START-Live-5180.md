# 后端本机启动

完整环境安装、模型设置及前端启动说明见仓库根目录的 [README](../README.md)。以下命令从仓库根目录执行。

Windows PowerShell，已创建虚拟环境并安装依赖时：

```powershell
cd openjiuwen-spike\spike
..\.venv\Scripts\python.exe live_server.py
```

macOS / Linux：

```bash
cd openjiuwen-spike/spike
../.venv/bin/python live_server.py
```

默认监听 `http://127.0.0.1:5180`，允许前端来源 `http://127.0.0.1:5174`。

在前端「模型设置」保存接口和 Key 后，后端会更新本机 `spike/model.env` 并热加载。也可复制 `model.env.example` 手工配置。不要提交真实 Key。

端口占用时，在 `openjiuwen-demo-replay/.env` 设置 `OPENJIUWEN_DEMO_PORT` 和 `OPENJIUWEN_LIVE_PORT`，或在启动进程的终端导出同名变量，再同时重启前后端。

健康检查：`GET /health`。页面与后端地址：`GET /v1/showcase`。模型状态：`GET /v1/settings/model`，不会返回明文 Key。
