# Backend 群同步便签（2026-10-21）

## Swarm 展示轨
- `POST /v1/swarm/debate` · 真实 `run_swarmflow` + `guard-schema-live` → SCHEMA + rule_gate
- **中间进度已接 SSE**：`progress` 帧边跑边推（phase / agent_*），非终局批量
- 冒烟：`logs/run-swarm-progress-20261021-150058.log` · `PASS_MARKER swarm_live_progress`
- 契约：`FE_SWARM_CONTRACT.md`
- `done.swarmflow=true` 才标 SwarmFlow 页脚；材料仍禁写「已接 Swarm」

## 旧路径
- `/v1/debate/live` TeamRuntime 旁路仍 `swarmflow:false`
