# Transfer Guardian Film Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可离线打开、带普通话男声和简体字幕的 30 秒 Remotion 宣传动画。

**Architecture:** 新建独立 `promo-remotion`，不改产品前后端。一个帧驱动的 React 影片组件同时用于 Remotion 渲染和 HTML Player；素材通过 props 传入，离线 HTML 内嵌原始截图和 WAV。所有路径动画由帧号计算，不依赖 CSS 动画时钟。

**Tech Stack:** Remotion 4.0.538、React 19.1、TypeScript、SVG Path、esbuild、Windows SAPI 普通话男声、Python PCM 音频合成。

**Spec:** 本轮用户完整 30 秒创作规范；素材对照 `转账前保镖-宣传片交付/转账前保镖-完整交付包/4-策划文档/转账前保镖-宣传片交接文档.md`。若冲突，以本轮要求为准，手机和审阅场景转译为 SVG 线条示意。

## Global Constraints

- 1920×1080、25fps、750帧；六段边界 0/100/175/300/450/600/750 帧。
- 六句口播原文一字不改；AI 按字母发音。
- 七角色固定 01特征官、02证据官、03反方官、04风险官、05合规官、06用户保护官、07审判官。
- rule_gate 和 human_confirm 独立于七角色，分别为确定性规则卡口与用户人工确认。
- 三张产品截图逐字节复制，不重绘、不覆盖、不对截图加光影；允许等比缩放与静态取景。
- 黑色纯底、统一 2.5px 细白线、#2B5CE6；红色只标识拒绝无据结论。不得暗示拦截支付、司法裁判或自动付款。
- 镜11主文案保持完整6秒，最后至少0.5秒完全静止；无虚构logo、网址、二维码。
- 1.5秒在25fps上为37.5帧；镜01/02切点按最近整数38帧（1.52秒），不改变任何六段锁定边界。

### Task 1: 帧表、分镜、音轨与素材

**Files:** `promo-remotion/src/timeline.ts`、`promo-remotion/STORYBOARD.md`、`promo-remotion/public/assets/*`、`promo-remotion/scripts/voice.ps1`、`promo-remotion/scripts/audio.py`。

**Interfaces:** 导出 FPS、DURATION、SHOTS、NARRATION、CAPTIONS；素材接口 `FilmAssets` 包含 live/gate/replay/sound。

- [ ] 固定11镜起止帧、六句原文、短句字幕；字幕连接后与口播逐字一致。
- [ ] 复制原图，保留 SHA256 作为验收依据。
- [ ] SAPI Kangkang 生成六个 WAV；用 PCM 重采样将过长音频限制在对应时段，原声正常长度保留；合成30秒48kHz配乐和旁白。

### Task 2: 同源 Remotion 与独立 HTML

**Files:** `promo-remotion/src/Film.tsx`、`src/Preview.tsx`、`src/preview.css`、`src/index.tsx`、`scripts/build.mjs`、`scripts/serve.mjs`。

**Interfaces:** `Film({assets}: {assets: FilmAssets})`；`window.__promo` 暴露播放器跳帧与帧号用于验证。Composition ID `TransferGuardian`。

- [ ] 实现手机悬停撤离、七节点汇流、规则拒绝、人工确认线条动画；原图用于镜04/05/08/10。
- [ ] Player 设置 `durationInFrames={750}`、`fps={25}`、`compositionWidth={1920}`、`compositionHeight={1080}`，提供播放、静音、拖动、逐帧、全屏和六段导航。
- [ ] esbuild 将React/Remotion Player/CSS内嵌到HTML，原PNG和音轨以data URL内嵌，断网直接打开；交付HTML不依赖后端或CDN。
- [ ] 注册同源 Composition，支持 `npm run studio` 与 `npm run render`。

### Task 3: 验收和交付

**Files:** `promo-remotion/scripts/verify.mjs`、`scripts/stills.mjs`、`promo-remotion/README.md`、`promo-remotion/delivery/转账前保镖-动画预览.html`。

- [ ] `npm run check` 检查750帧覆盖、六段边界、锁定原文、七角色顺序、字幕完整性、截图SHA256。
- [ ] `npm run build` 输出独立HTML。检查每镜关键帧、全片空白、字幕和构图边界。
- [ ] 浏览器校验播放/暂停、六段跳转、拖动、静音、全屏；核对30秒MP4音视频元数据。
- [ ] 比较600与749帧确保尾卡静止；只暂存本次目录与计划，提交本轮相关文件。
