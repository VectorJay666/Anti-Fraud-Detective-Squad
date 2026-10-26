# 转账前保镖 · 60秒产品宣传片

**1920×1080 · 45fps · 2700帧 · 60秒 · 无旁白及逐句字幕**。

打开 `delivery/转账前保镖-60秒动画预览.html`。播放器下方可下载MP4或保存HTML；导出清单与当前MP4的SHA256一致后才启用视频下载。本机预览为 `http://127.0.0.1:4176/`。成片文件为 `delivery/转账前保镖-60秒-45fps.mp4`。

## 最终叙事

开场与音乐同步渐入：先呈现长期骗局“小额返利→诱导加码→继续索款”，2.4秒开始将个例头像缩为一个点，连续拉远，人物头像构成2022/2023/2024三根逐年增高的损失柱。美国FTC消费者报告损失口径见STATISTICS.md，人物不对应真实受害人数。

18秒鼓点配“但在转账前，还有核验这一步。”，文字强调与蓝色环形柔光，稳定镜头。22.267秒后三类具体场景：父母遇到安全账户电话、学生遇到返佣垫付、商户遇到订单异常理赔；随后七角色会商，展示高危/低危/证据不足、EV-001/EV-002和R-01/R-02依据。规则拒绝编造引用，用户自己决定下一步。

45.644—50.956秒展示PPT第11/13页的项目评测：66/84（78.6%）、0普通人误伤、0违规指认、18转人工。50.956—54.156秒展示第10/13页故障注入测试24/24无关引用打回。全部标明项目本地规则基线、私有合成评测、v0.3.1-r7、2026-10-04，不表述为七角色助手在真实用户中的防骗成功率。来源映射见EVIDENCE.md。

结尾删除粒子桥，品牌和公益目标分层入场，最后约1.84秒稳定定版。黑底、白色细线、#2B5CE6，尘埃仅用于开场与局部转折，不遍布主机制镜头。

音乐为用户指定[《千年之后》参考音源](https://www.bilibili.com/video/BV1uiHs63Ev6/)，全程原速，不使用atempo。前奏重复两拍乐句一次，对齐18秒鼓点；降低5dB，片尾1.1秒淡出，详见MUSIC.md。

## 开发与导出

需要Node.js及已安装的项目依赖：

```powershell
npm ci
npm run check
npm run build
npm run dev
npm run studio
```

导出和启用下载：

```powershell
npm run render
npm run finalize
```

finalize验证尺寸、45fps、2700帧及音视频均60秒，替换为当前AAC音轨，核对逐包哈希，生成export-manifest.json，再打包启用下载的HTML。MP4是本机生成文件，不纳入Git；HTML、源码、当前音乐、验收图与导出清单纳入Git。

```powershell
npm run stills
python scripts/contact_sheet.py
```

可使用 `python scripts/reference_music.py <reference.m4a>` 重做音乐处理，需要NumPy及本项目Remotion配套FFmpeg。当前交付已包含音乐，无需另行生成。

## 核心源码

- `src/timeline.ts`：60秒时间线、20个逻辑镜头、45fps、七角色顺序。
- `src/CaseBarChart.tsx`：长期骗局个例、头像收缩、连续拉远及年度统计柱。
- `src/ThreatScenes.tsx`：18秒完整转折文案、文字强调、环形光效。
- `src/CreativeTransitions.tsx`、`src/Dust.tsx`：局部尘埃聚合和跨镜头交接。
- `src/Film.tsx`、`src/AnimationScenes.tsx`、`src/Motion.tsx`：清晰的主机制动画和渐入。
- `src/OutcomeScenes.tsx`：成果与产品作用。
- `src/Preview.tsx`、`src/preview.css`：播放控制、六段跳转、保存入口。
- `src/fraud-stats.json`、STATISTICS.md：美国FTC数据及来源，不表达中国发案量。
- `scripts/finalize-export.mjs`、`scripts/build.mjs`、`scripts/serve.mjs`：导出验证、离线HTML和下载响应。

## 事实边界

七个AI角色只给建议。rule_gate和human_confirm是规则与人工流程节点，不是第八个角色。规则拒绝编造证据EV-FAB-TRANSFER、编造条款R-99及无据结论；最终动作等待用户本人确认。视频不展示银行接入、支付冻结或自动付款，不虚构成功率、已保护人数或挽损金额。评测数字沿用PPT的规则基线合成数据口径。原产品PNG保持不变，保留在素材目录。
