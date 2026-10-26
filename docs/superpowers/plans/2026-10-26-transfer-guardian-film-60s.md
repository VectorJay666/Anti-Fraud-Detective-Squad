# Transfer Guardian 60s Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付60秒45fps的产品宣传动画，强化使用场景、实用过程和重要性，以Remotion路径动画为主，只有少量原始截图，配无歌词背景音乐。

**Architecture:** 一个帧驱动的React影片组件同时用于Remotion渲染与离线HTML Player。20镜、2700帧；三张截图标称各2秒。Sequence交叠、spring入场、interpolate路径与真实贝塞尔游标连接镜头。

**Tech Stack:** Remotion4.0.538、React、TypeScript、@remotion/paths、SVG、esbuild、Python NumPy原创配乐。

**Spec:** 用户本轮完整制作规范及后续明确修改：时长60秒、更多场景与动画、减少截图、去掉人声、增加合适配乐、45fps。

## Global Constraints

- 60秒、1920×1080、45fps、2700帧；六段章节0—8/8—14/14—24/24—36/36—48/48—60。
- 原六句文字逐字保留；按后续要求取消全部语音，保留文字与字幕。
- 黑底、2.5px细白线、#2B5CE6；红色只用于拒绝无据结论。
- 七角色顺序固定；rule_gate与human_confirm为流程关口，不是额外AI。
- 三张PNG保持哈希；截图标称6秒，转场交叠另计；最后6秒品牌卡静止。

### Task 1: 场景、字幕与背景音乐

**Files:** `promo-remotion/src/script.json`、`src/captions.json`、`src/timeline.ts`、`scripts/audio.py`。

- [x] 编写三种催转场景、材料提交、会商机制、规则重要性、人工操作和流程价值。
- [x] 保留六句原文，分短句字幕，导出SRT；取消语音播放与语音素材。
- [x] 合成原创96BPM立体声背景音乐，31秒落锁，36秒降压，54秒稳定和弦；编码AAC内嵌HTML。

### Task 2: 20镜与连续动画

**Files:** `promo-remotion/src/Film.tsx`、`src/Motion.tsx`、`src/AnimationScenes.tsx`、`src/Preview.tsx`。

- [x] 同一手机承接三个场景；聊天与背景汇入案卷；七角色接力汇入建议卷宗。
- [x] 增加证据条款核对、规则与人工两关、四步行动清单、本机链路、全流程归纳。
- [x] 约0.49秒交叠与轻位移；SVG路径按45fps采样；曲线游标依路径位置运动。
- [x] 原始截图仅用于12—14/31—33/46—48秒；54—60秒完整静止。

### Task 3: 验证与交付

**Files:** `scripts/verify.mjs`、`scripts/stills.mjs`、`scripts/contact_sheet.py`、`STORYBOARD.md`、`README.md`、`QA.md`、`delivery/转账前保镖-60秒动画预览.html`。

- [x] 检查2700帧连续覆盖、截图标称时长、六句文字完整、七角色、原图哈希及60秒纯音乐。
- [x] 导出45fps MP4、20镜分镜和20个转场检查点；比较2430与2699帧静态一致。
- [x] 本机HTTP浏览器验证播放、暂停、声音、进度、章节和全屏；记录file://测试的浏览器策略限制。
- [x] 检查Git差异，仅提交本轮动画目录与制作计划。
