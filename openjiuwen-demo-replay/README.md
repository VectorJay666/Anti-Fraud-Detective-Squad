# 转账前保镖前端

本目录是页面。安装、启动、换端口和验收都以仓库根目录的 [README.md](../README.md) 为准。不要使用其他路径里的旧启动命令。

默认页面地址是 `http://127.0.0.1:5174/`。后端默认是 `http://127.0.0.1:5180`。端口被占用时，在本目录把 `.env.example` 复制为 `.env`，修改 `OPENJIUWEN_DEMO_PORT` 和 `OPENJIUWEN_LIVE_PORT`，然后按根 README 同时重启前端和后端。

```bash
npm ci
npm run dev
```

回放数据在 `public/data/`。顶部「典型事例展示」里的 Play 只读这些文件，不请求后端。「真实使用」才会把会话原文发给后端。
