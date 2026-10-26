# 转账前保镖 Apple 风格前端实施计划

**Goal:** 在 Figma 创建可编辑的桌面与手机页面，并将其实现到现有 React 前端。

**Architecture:** 保留 App 的回放、SSE 和规则核验逻辑；重做应用外壳、输入表单和样式。默认进入风险检查，案例回放仍可访问。

**Tech Stack:** React 19、TypeScript、Vite、CSS、Figma Plugin API。

**Design:** https://www.figma.com/design/QvA0dkhzHKPxhkQc1lnsq4

## 约束

- 只修改本轮前端文件及本计划，保留用户已有改动。
- 本地预览，不发布或推送。
- 保留会话验证、规则开关、会商引擎选择、事件回放和结论功能。
- 浅灰背景、白色表面、系统字体、蓝色主操作；响应式布局并尊重减少动态效果设置。

## 实施步骤

- [x] 在 Figma 完成设计变量、组件以及桌面和手机页面，检查图层与截图。
- [x] 修改 `openjiuwen-demo-replay/src/App.tsx`：导航、页面标题、默认风险检查、输入与辅助信息布局。
- [x] 修改 `src/components/LiveForm.tsx`：聊天输入、示例填充、字符计数、可选信息与高级设置。
- [x] 修改 `src/components/LayerTabs.tsx`、`Toolbar.tsx`、`FinalShell.tsx`：统一文案和操作层级。
- [x] 移除 `src/index.css` 的深色主题并实现浅色布局，更新字体与页面信息。
- [x] 运行 TypeScript 与生产构建，浏览器检查桌面、手机、表单校验、案例回放与结论。
- [x] 检查 diff，仅暂存本轮文件并提交。
