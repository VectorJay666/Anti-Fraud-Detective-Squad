# 转账前保镖 · 60秒动画

当前交付：**60秒 · 1920×1080 · 45fps · 2700帧 · 无人声 · 立体声背景音乐**。

直接打开 `delivery/转账前保镖-60秒动画预览.html`，点击播放。全部图片、音乐及Remotion Player内嵌在HTML中，断网可用，无需启动项目后端。

同源视频：`delivery/转账前保镖-60秒-45fps.mp4`。独立配乐：`delivery/转账前保镖-背景音乐.m4a`。视频为本机生成文件，不纳入Git；HTML、源码、截图、字幕和配乐纳入版本记录。

## 内容与动效

20镜覆盖三种催转场景、材料提交、七角色接力、建议卷宗、引用核对、确定性规则、用户确认、行动清单与记录回放。原始截图只有三个短镜头，标称时长各2秒，转场交叠另计。其余为SVG路径与文字动画，品牌尾卡保持完整6秒静止。

- Remotion `Sequence`：镜头编排、预挂载和约0.49秒交叠转场。
- Remotion `spring`、`interpolate`、`Easing`：人物和材料入场、节奏、位移与收束。
- `@remotion/paths`：读取路径长度与曲线位置，游标随实际贝塞尔曲线运动。
- `strokeDashoffset`：细线逐段绘制；所有动效都由帧号计算，45fps直接采样，不使用视频补帧。
- 真实PNG直接使用，无改绘、滤镜、模拟点击或滚动。近景为原图的固定视窗取景，光影只在图外。

产品输入说明核对自 `openjiuwen-demo-replay/src/components/LiveForm.tsx`：聊天原文、拟转金额、收款方、补充说明。不展示不存在的上传或支付功能。

## 声音与字幕

没有旁白、没有人声采样。原创专属配乐《留一步 · 逐镜配乐》沿用柔和电子脉冲、轻键音与温暖铺底，按20镜设置34个画面提示点。120BPM底层网格以60BPM的舒缓脉冲呈现：七角色对应七个轻音，25.6秒闸线落定配主落锁声，31秒真实结果留低音回声，36秒撤去鼓点，54秒进入稳定和弦。48kHz立体声，以192kbps AAC内嵌。

可单独试听 `delivery/转账前保镖-专属配乐.mp3`。`MUSIC.md`说明音乐结构，`src/music-cues.json`记录画面时点，`public/assets/audio-report.json`记录对齐后的45fps帧号、音符事件与响度。

字幕保留六句原文并补充使用说明；每条不超过14字，品牌尾卡承载最后一句全文。可选导入剪辑软件的字幕为 `delivery/转账前保镖-60秒字幕.srt`。

## 播放

支持播放／暂停、静音、拖动、六段跳转、全屏。空格播放；左右键逐帧；M切换音乐；F进入或退出全屏。打开时等待点击，结束后停在品牌卡。

## 开发与导出

需要Node.js 20或更高版本。在本目录执行：

```powershell
npm ci
npm run check
npm run build
npm run dev
```

本机预览地址 `http://127.0.0.1:4176`。用 `PROMO_PORT` 改端口。

```powershell
npm run studio
npm run render
npm run stills
```

`build`输出单文件HTML；`render`从Remotion直接导出2700帧H.264视频；首次渲染会下载Remotion官方Chrome Headless Shell。`stills`导出20镜关键帧、20个转场检查点，并比较尾卡首末帧。

重建原创配乐需要Python和NumPy：

```powershell
python scripts/audio.py
```

只改音乐时，可直接替换已有视频的音轨，保留2700帧原画面：

```powershell
npm run replace-music
npm run build
```

`audio.py`调用当前平台的Remotion配套FFmpeg编码AAC；本交付已包含音乐，无需重新生成。Windows下生成分镜总览需Pillow：

```powershell
python scripts/contact_sheet.py
```

## 文件索引

- `STORYBOARD.md`：20镜的叙事、运镜、机制边界与音乐安排。
- `src/timeline.ts`：45fps输出配置、20镜时码、六段章节、字幕与七角色顺序。
- `src/script.json`：屏幕文案来源；原六句逐字保留，不作为音轨播放。
- `src/Film.tsx`：Remotion影片与镜头衔接。
- `src/Motion.tsx`：路径、曲线游标、spring和入场动效。
- `src/AnimationScenes.tsx`：三种使用场景、材料归档、会商接力、规则与人工边界、行动清单、本机链路。
- `src/Preview.tsx`、`src/preview.css`：HTML预览播放器。
- `src/music-cues.json`、`MUSIC.md`：专属配乐的画面提示点与音乐结构。
- `scripts/build.mjs`、`scripts/serve.mjs`：离线HTML打包与本机服务。
- `scripts/verify.mjs`、`scripts/stills.mjs`：内容、原图、音乐、帧表和尾卡验证。
- `delivery/60秒分镜总览.jpg`、`delivery/60秒转场校验.jpg`：画面检查图。

## 事实边界

七个AI角色只给建议。rule_gate为确定性规则卡口，human_confirm为用户本人确认，均不属于七角色。拒绝对象是编造证据EV-FAB-TRANSFER、编造条款R-99和无据结论。画面没有银行接入、冻结、支付拦截、自动付款、司法裁判或防骗成功率承诺。手机、材料流转和本机链路标明示意；产品截图保留原文。

接口参考：[Remotion Composition](https://www.remotion.dev/docs/composition)、[Remotion Player](https://www.remotion.dev/docs/player/player)。
