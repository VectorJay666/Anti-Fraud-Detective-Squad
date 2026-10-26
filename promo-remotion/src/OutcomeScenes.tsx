import React from 'react';
import {BLUE,MUTED,RED,WHITE} from './timeline';
import {CHAT,DOC,Glyph,Ink,Label,Line,Rise,Svg,T,Trace,tween} from './Motion';
const scope='项目本地规则基线 · 私有合成评测 · v0.3.1-r7 · 2026-10-04';
const Tiny=({children}:{children:React.ReactNode})=><span style={{fontSize:29}}>{children}</span>;
export function UseCases({frame}:{frame:number}) {
 const cases=[['帮父母核实','“涉嫌洗钱，转到安全账户”','冒充公检法'],['帮同学辨别','“先垫付，做任务返佣”','刷单返利'],['帮商户查验','“订单异常，先转账再理赔”','冒充平台客服']];
 return <><Label>可疑短信 · 来电话术 · 聊天截图文字</Label><Rise frame={frame}><T x={180} y={185} size={77} weight={600}>这些话，<Ink>先核验再信。</Ink></T></Rise>
  <Svg>{cases.map((_,i)=><React.Fragment key={i}><Glyph d={CHAT} x={270+i*590} y={436} frame={frame} delay={i*8} scale={.8}/><Trace d={`M${200+i*590} 770H${580+i*590}`} frame={frame} delay={i*8+9} duration={29} color={BLUE}/></React.Fragment>)}</Svg>
  {cases.map((c,i)=><Rise key={c[0]} frame={frame} delay={i*8} distance={20}><T x={195+i*590} y={547} size={37}>{c[0]}</T><T x={195+i*590} y={623} size={28} color={MUTED}>{c[1]}</T><T x={195+i*590} y={813} size={33} color={BLUE}>{c[2]}</T></Rise>)}</>;
}
export function RiskOutput({frame}:{frame:number}) {
 return <><Label>建议输出 · 三档风险结论示意</Label><Rise frame={frame}><T x={180} y={208} size={77} weight={600}>不只说“危险”，<br/><Ink>还要列出依据。</Ink></T></Rise>
  <Svg><Glyph d={DOC} x={1030} y={530} frame={frame} scale={1.6}/><Trace d="M1140 440H1675M1140 555H1675M1140 670H1675" frame={frame} delay={6} duration={32}/></Svg>
  {['高危  /  低危  /  证据不足','引用编号：EV-001 · EV-002','命中规则：R-01 / R-02'].map((v,i)=><Rise key={v} frame={frame} delay={i*5}><T x={1185} y={377+i*116} size={i?29:34} color={i?MUTED:WHITE}>{v}</T></Rise>)}
  <T x={180} y={794} size={29} color={MUTED}>拿不准就明确提示证据不足，交由人判断</T></>;
}
export function EvidenceCheck({frame}:{frame:number}) {
 return <><Label>核验过程 · 编号逐条回查</Label><T x={180} y={190} size={77} weight={600}>已有证据可追溯。<Ink>编造引用被打回。</Ink></T>
  <Svg><Trace d="M670 440H1120M670 660H1120" frame={frame} duration={23}/><Line d="M1215 420L1238 443L1280 398" color={BLUE} p={tween(frame,9,14)}/><Line d="M1220 635L1270 685M1270 635L1220 685" color={RED} p={tween(frame,15,14)}/></Svg>
  <T x={220} y={398} size={35}>EV-001 · 催转账话术</T><T x={1340} y={398} size={34} color={BLUE}>案卷中存在</T><T x={220} y={618} size={32}>EV-FAB-TRANSFER</T><T x={1340} y={618} size={34} color={RED}>不存在，拒绝引用</T>
  <T x={220} y={828} size={29} color={MUTED}>规则拒绝的是无据结论；最终动作仍由用户本人确认</T></>;
}
export function Results({frame}:{frame:number}) {
 const n=Math.round(66*tween(frame,0,24));
 return <><Label>项目评测成果 · 团伙研判基线</Label><T x={180} y={185} size={69} weight={600}>84 名团伙成员，<Ink>正确指认 66 名</Ink></T>
  <Rise frame={frame} distance={20}><T x={180} y={306} size={150} weight={600}>{(n/84*100).toFixed(1)}<span style={{fontSize:65}}>%</span></T><T x={184} y={510} size={31} color={MUTED}>团伙成员正确指认比例 · 66 / 84</T></Rise>
  <Svg>{Array.from({length:84},(_,i)=>{const x=1055+(i%14)*43,y=367+Math.floor(i/14)*43;return <rect key={i} x={x} y={y} width={24} height={24} rx={3} stroke="none" fill={i<66?BLUE:'#55555f'} opacity={tween(frame,i*.25,8)}/>})}<Line d="M180 650H1740" opacity={.3}/></Svg>
  <Rise frame={frame} delay={20} distance={15}><T x={180} y={693} size={75}>0<Tiny> 普通人误伤</Tiny></T><T x={800} y={693} size={75}>0<Tiny> 违规指认</Tiny></T><T x={1380} y={693} size={75}>18<Tiny> 转人工</Tiny></T><T x={180} y={825} size={29} color={MUTED}>18 名证据不足者交人工复核，不硬判</T></Rise>
  <T x={180} y={955} size={23} color={MUTED}>{scope}；不代表真实用户防骗成功率</T></>;
}
export function ProductImpact({frame}:{frame:number}) {
 return <><Label>故障注入测试 · 无关引用</Label><Rise frame={frame}><T x={180} y={193} size={74} weight={600}>故意给错证据。<Ink>规则照样打回。</Ink></T></Rise>
  <T x={180} y={357} size={160} weight={600}>24<Tiny> / 24</Tiny></T><T x={180} y={588} size={35}>无关引用全部被打回</T>
  <Svg>{Array.from({length:24},(_,i)=>{const x=1130+(i%6)*95,y=407+Math.floor(i/6)*95;return <g key={i} opacity={tween(frame,i*.8,9)}><path d={`M${x} ${y}l25 25m0 -25l-25 25`} stroke={RED}/></g>})}<Trace d="M180 770H1740" frame={frame} delay={9} duration={36} color={BLUE}/></Svg>
  <Rise frame={frame} delay={9}><T x={180} y={820} size={31}>每条引用必须真实存在，并与当事人直接相关</T></Rise><T x={180} y={955} size={23} color={MUTED}>{scope} · NOT_DIRECT 打回；合成数据</T></>;
}
