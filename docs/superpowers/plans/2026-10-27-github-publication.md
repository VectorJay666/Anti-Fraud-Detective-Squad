# GitHub 最新项目同步实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将本机最新完整项目及更新的 README 推送到用户指定仓库的 main。

**Architecture:** 在独立工作目录合并目标仓库现有提交与本地最新版，保留当前浅色前端、可配置端口和线上模型设置、风险等级修正。通过普通 Git 推送保留双方提交历史，不覆盖用户未提交素材。

**Tech Stack:** Git、React 19、TypeScript、Vite 6、Python aiohttp。

**Spec:** 用户要求同步到 `https://github.com/VectorJay666/Anti-Fraud-Detective-Squad.git` 并更新现有 README。

## Global Constraints

- 原工作目录中的素材、临时文件与已有删除状态保持不变。
- 模型 Key、model.env、依赖缓存和本地运行日志不进入提交。
- 保留远端 main 的历史及模型设置能力，保留本地 Apple 风格界面。
- 文档区分预录合成案例回放和实际调用模型，使用当前按钮文案及端口配置。
- 本轮在当前会话内执行，不派发子代理。

### Task 1: 合并现有项目

**Files:**
- Merge: `openjiuwen-demo-replay/src/App.tsx`、`components/LiveForm.tsx`、`components/DebateAside.tsx`、`src/index.css`。
- Adapt: `components/ProductChrome.tsx`、`components/ApiSettings.tsx`、`lib/llmSettings.ts`。
- Preserve: `openjiuwen-spike/spike/live_server.py` 的可配置端口及模型设置接口，`llm_debate.py` 的热加载与风险等级。

**Interfaces:** 保留 `GET/PUT /v1/settings/model`、`POST /v1/swarm/debate` 和 `POST /v1/debate/live`，前端设置入口连接原有 `ApiSettings`。

- [x] 合并 `32514e6` 与本地 `e11fa6f`，逐一处理 6 个文本冲突，保留模型设置、角色说明和拒判风险等级修正；保留本地自动备用会商及实际引擎说明。
- [x] 保留简洁导航和表单，将模型设置入口接入导航；设置弹层使用相同浅色样式。
- [x] 前端构建通过，后端实际层契约检查通过；验证设置读取、空输入校验、缺少配置提示及完整案例回放；前端风险映射 5 个场景通过，未调用付费模型。

### Task 2: 文档与发布

**Files:**
- Modify: `README.md`、`openjiuwen-demo-replay/README.md`、`openjiuwen-spike/START-Live-5180.md`、`.gitignore`。
- Add: `docs/images/risk-check.png`、`docs/images/multi-role-analysis.png`。

**Interfaces:** README 中的克隆地址指向指定仓库，默认分支 main；默认前端 5174、后端 5180。

- [x] 首页介绍项目功能、真实截图、回放启动、在线模型配置、接口及演示文件；保留 Windows 与 macOS/Linux 本机部署指引。
- [x] 校验 README 相对链接、脚本名称、实际 UI 文案及 3430 个待上传文件；模型配置热加载和脱敏检查通过，最大新增历史对象 6882616 字节。
- [ ] 检查 diff，提交合并与文档更新，普通推送到目标 main，读取远端 SHA 确认成功。
