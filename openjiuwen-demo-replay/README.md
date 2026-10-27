# 转账前保镖前端

React 19、TypeScript、Vite 6。安装、后端模型配置及端口说明见仓库根目录的 [README](../README.md)。

```bash
npm ci
npm run dev
```

默认地址为 `http://127.0.0.1:5174/`，后端默认为 `http://127.0.0.1:5180`。

- **风险检查**：默认首页。粘贴聊天内容、选填转账信息，点击「开始风险检查」后才提交到后端。
- **案例演示**：从 `public/data/` 读取合成预录案例，支持播放、单步、倍速及分析过程查看，无需后端或模型 Key。
- **模型设置**：连接后端 `GET/PUT /v1/settings/model`，保存后在本机后端生效。浏览器不会持久化 API Key。

端口占用时，将 `.env.example` 复制为 `.env`，修改 `OPENJIUWEN_DEMO_PORT` 和 `OPENJIUWEN_LIVE_PORT`，同时重启前后端。

```bash
npm run build
npm run preview
```

构建命令包含 TypeScript 检查。视觉设计说明见 [DESIGN.md](DESIGN.md)，接口接线说明见 [LIVE-API.md](LIVE-API.md)。
