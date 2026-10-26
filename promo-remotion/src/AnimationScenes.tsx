import React from 'react';
import {BLUE,MUTED,RED,WHITE} from './timeline';
import {CHAT,CLOCK,DOC,Glyph,Ink,Label,Line,MONO,PERSON,Rise,Svg,T,Trace,Underline,settle,tween} from './Motion';

const STORIES=[
 {title:'冒充客服。',note:'身份未核实，已经催你转账。',sender:'自称客服',message:'请转账，完成核验',icon:'M-48 10V-17A48 48 0 0 1 48 -17V10M-48 -5H-62V28H-42V-5M48 -5H62V28H42V-5M48 28C48 52 25 55 6 55H-7'},
 {title:'返利补款。',note:'要拿回钱，却要不断补款。',sender:'返利通知',message:'再补一笔，才能返还',icon:'M-39 -44A60 60 0 1 1 -56 28M-64 -46H-34V-76M0 -31V32M-25 -15H20M-25 13H20M-24 -37L0 -12L24 -37'},
 {title:'换号借钱。',note:'自称熟人，却拒绝电话核实。',sender:'自称熟人',message:'我换号了，急用钱',icon:'M-25 -30C-25 -61 25 -61 25 -30C25 2 -25 2 -25 -30ZM-63 65C-61 8 61 8 63 65M45 -63H81V-12H45ZM55 -24H71'},
];

export function Scenario({frame,variant}:{frame:number;variant:number}){
 const s=STORIES[variant];const p=settle(frame);
 return <>
  <Label>情境示意 · {String(variant+1).padStart(2,'0')}</Label>
  <Rise frame={frame}><T x={180} y={300} size={104} weight={600}>{s.title}</T><T x={180} y={469} size={31} color={MUTED}>{s.note}</T></Rise>
  <Svg>
   <Glyph d={s.icon} x={256} y={660} frame={frame} scale={1.1}/>
   <Trace d="M370 660H724C862 660 874 490 1049 490" frame={frame} delay={5} duration={40} color={BLUE}/>
   <g transform={`translate(${(1-p)*35} 0)`}>
    <Line d="M1145 175H1435Q1470 175 1470 210V822Q1470 857 1435 857H1145Q1110 857 1110 822V210Q1110 175 1145 175ZM1245 202H1335M1245 828H1335" p={tween(frame,-12,30)}/>
    <Line d="M1140 324H1440V461H1195L1160 493V461H1140Z" p={tween(frame,0,30)}/>
    <Line d="M1147 689H1433V753H1147Z" p={tween(frame,12,26)} opacity={.6}/>
    <Line d="M1522 698V746M1543 698V746" color={BLUE} p={tween(frame,22,18)}/>
   </g>
  </Svg>
  <Rise frame={frame} delay={5} distance={22}>
   <T x={1290} y={256} size={25} center color={MUTED}>{s.sender}</T>
   <T x={1290} y={373} size={26} center style={{whiteSpace:'nowrap'}}>{s.message}</T>
   <T x={1290} y={704} size={26} center color={MUTED}>确认转账</T>
  </Rise>
  <T x={1290} y={905} size={22} center color={MUTED}>情境示意 · 非支付界面</T>
 </>;
}

export function Intake({frame}:{frame:number}){
 const p=settle(frame,30);
 return <>
  <Label>从一份聊天材料开始 · 填写材料示意</Label>
  <Rise frame={frame}><T x={180} y={185} size={83} weight={600}>贴入聊天，<Ink>开始核验。</Ink></T></Rise>
  <Svg>
   <Glyph d={CHAT} x={340} y={475} frame={frame}/>
   <Glyph d="M-66 -40H66V40H-66ZM-35 0H35M0 -22V22" x={340} y={710} frame={frame} delay={7}/>
   <Trace d="M475 475H780C940 475 920 594 1140 594" frame={frame} delay={7} duration={43}/>
   <Trace d="M475 710H780C940 710 920 594 1140 594" frame={frame} delay={16} duration={43}/>
   <g transform={`translate(1390 ${570+(1-p)*50}) scale(${1+.08*(1-p)})`}><Line d="M-125 -160H70L125 -105V160H-125ZM70 -160V-105H125M-75 -42H75M-75 13H75M-75 68H24" p={tween(frame,20,37)}/></g>
  </Svg>
  <Rise frame={frame} delay={6}><T x={475} y={403} size={36}>聊天原文</T><T x={475} y={506} size={27} color={MUTED}>先打码卡号等敏感信息</T></Rise>
  <Rise frame={frame} delay={13}><T x={475} y={641} size={36}>转账背景</T><T x={475} y={744} size={27} color={MUTED}>拟转金额 · 收款方 · 补充说明</T></Rise>
  <Rise frame={frame} delay={34}><T x={1390} y={798} size={34} center>待核验案卷</T></Rise>
 </>;
}

export function Relay({frame}:{frame:number}){
 const rows=[{name:'特征官',question:'有没有催促、冒充的信号？'},{name:'证据官',question:'引用的证据，真的在案卷里吗？'},{name:'反方官',question:'也可能只是正常咨询？'}];
 return <>
  <Label>会商接力 · 机制示意</Label>
  <Rise frame={frame}><T x={180} y={287} size={91} weight={500}>同一份材料，<br/><Ink>多角度核验。</Ink></T></Rise>
  <Underline frame={frame} y={650}/><T x={180} y={702} size={30} color={MUTED}>交叉核验，不靠单一回答。</T>
  <Svg>
   {rows.map((_,i)=><React.Fragment key={i}>
    <Glyph d={PERSON} x={901} y={300+i*227} frame={frame} delay={i*18} scale={.85}/>
    <Trace d={`M965 ${305+i*227}H1710`} frame={frame} delay={8+i*18} duration={38} color={i===Math.min(2,Math.floor(frame/25))?BLUE:WHITE}/>
    {i<2&&<Line d={`M901 ${363+i*227}V${453+i*227}`} p={tween(frame,15+i*18,26)} opacity={.35}/>}
   </React.Fragment>)}
  </Svg>
  {rows.map((r,i)=><Rise frame={frame} delay={i*18+3} key={r.name}><T x={1000} y={233+i*227} size={29} color={MUTED}>0{i+1}  {r.name}</T><T x={1000} y={326+i*227} size={34}>{r.question}</T></Rise>)}
 </>;
}

export function Advice({frame}:{frame:number}){
 const items=['风险等级','证据与条款依据','可执行的核验清单'];
 return <>
  <Label>会商输出 · 机制示意</Label>
  <Rise frame={frame}><T x={180} y={280} size={93} weight={600}>给出建议，<br/><Ink>等你确认。</Ink></T></Rise>
  <T x={180} y={702} size={29} color={MUTED}>最终动作仍由用户本人确认</T>
  <Svg>
   <Glyph d="M-130 -197H74L130 -141V197H-130ZM74 -197V-141H130" x={1165} y={530} frame={frame}/>
   {items.map((_,i)=><Trace key={i} d={`M1085 ${440+i*90}H1247C1316 ${440+i*90} 1316 ${440+i*90} 1380 ${440+i*90}`} frame={frame} delay={8+i*8} duration={25} color={i===2?BLUE:WHITE}/>)}
  </Svg>
  {items.map((v,i)=><Rise frame={frame} delay={12+i*8} key={v}><T x={1410} y={416+i*90} size={32}>{v}</T></Rise>)}
  <T x={1165} y={791} size={28} center color={MUTED}>建议卷宗</T>
 </>;
}

export function Proof({frame}:{frame:number}){
 return <>
  <Label>核对引用 · 机制示意</Label>
  <Rise frame={frame}><T x={180} y={290} size={91} weight={500}>说得像，<br/><Ink>也要查得到。</Ink></T></Rise>
  <Underline frame={frame} y={650}/><T x={180} y={702} size={30} color={MUTED}>每一条引用，都要回到原始依据。</T>
  <Svg>
   {[0,1].map(i=><React.Fragment key={i}>
    <Glyph d={DOC} x={928} y={360+i*340} frame={frame} delay={i*13} scale={.72}/>
    <Trace d={`M1000 ${360+i*340}H1260`} frame={frame} delay={7+i*14} duration={35} color={WHITE}/>
    <Glyph d="M-24 -24A34 34 0 1 1 -25 -24M23 23L54 54" x={1325} y={350+i*340} frame={frame} delay={15+i*14} scale={.85}/>
    <Line d={`M1430 ${346+i*340}L1458 ${374+i*340}M1458 ${346+i*340}L1430 ${374+i*340}`} color={RED} p={tween(frame,34+i*15,18)}/>
   </React.Fragment>)}
  </Svg>
  <Rise frame={frame} delay={3}><T x={1040} y={247} size={28} color={MUTED}>证据台账</T><T x={1040} y={288} size={29} style={{fontFamily:MONO}}>EV-FAB-TRANSFER</T></Rise>
  <Rise frame={frame} delay={17}><T x={1040} y={586} size={28} color={MUTED}>条款库</T><T x={1040} y={628} size={29} style={{fontFamily:MONO}}>R-99</T></Rise>
  <Rise frame={frame} delay={34}><T x={1494} y={341} size={31} color={RED}>编造证据</T></Rise>
  <Rise frame={frame} delay={49}><T x={1494} y={682} size={31} color={RED}>编造条款</T></Rise>
 </>;
}

export function Boundary({frame}:{frame:number}){
 const nodes=[{x:350,name:'AI 会商',sub:'汇总建议',d:PERSON},{x:960,name:'rule_gate',sub:'确定性规则核验',d:'M-48 -63V63M48 -63V63M-59 -63H59M0 -38V38'},{x:1570,name:'human_confirm',sub:'用户本人确认',d:'M-30 -50V24C-30 48 30 48 30 24V-30M-30 -16V-72C-30 -90 -7 -90 -7 -72V-24M-7 -48C-7 -70 16 -70 16 -48V-14M16 -35C16 -56 39 -56 39 -35V20'}];
 return <>
  <Label>规则与人工，各守一关 · 机制示意</Label>
  <Rise frame={frame}><T x={180} y={185} size={83} weight={500}>建议之后，<Ink>还有两道确认。</Ink></T></Rise>
  <Svg>
   <Trace d="M465 548H832" frame={frame} delay={5} duration={28}/>
   <Trace d="M1088 548H1448" frame={frame} delay={28} duration={28}/>
   {nodes.map((n,i)=><Glyph key={n.name} d={n.d} x={n.x} y={545} frame={frame} delay={i*14} scale={1.05}/>)}
  </Svg>
  {nodes.map((n,i)=><Rise frame={frame} delay={i*14+4} key={n.name}><T x={n.x} y={687} size={35} center style={{whiteSpace:'nowrap',fontFamily:i?MONO:undefined}}>{n.name}</T><T x={n.x} y={752} size={28} center color={MUTED}>{n.sub}</T></Rise>)}
 </>;
}

export function Actions({frame}:{frame:number}){
 const actions=[{title:'先别转',sub:'暂停，给核验留时间',d:'M-22 -52V52M22 -52V52'},{title:'官方核实',sub:'自己查找官方客服',d:'M-48 -50L-24 -64L3 -23L-15 -5C-3 15 11 28 30 37L46 18L77 47L62 67C24 77 -56 -5 -48 -50'},{title:'勿点陌生链接',sub:'不跟着对方的入口走',d:'M-14 22L-33 41A24 24 0 0 1 -67 7L-39 -21A24 24 0 0 1 -5 -21M14 -22L33 -41A24 24 0 0 1 67 -7L39 21A24 24 0 0 1 5 21M-31 0H31'},{title:'保留记录',sub:'留存聊天与核验结果',d:DOC}];
 return <>
  <Label>建议的实用价值 · 行动清单示意</Label>
  <Rise frame={frame}><T x={180} y={184} size={83} weight={600}>四条<Ink>行动建议。</Ink></T></Rise>
  <Svg>
   <Line d="M300 545H1620" p={tween(frame,6,70)} opacity={.22}/>
   {actions.map((a,i)=><g key={a.title}><Glyph d={a.d} x={300+i*440} y={494} frame={frame} delay={i*12} scale={.85}/><Trace d={`M${250+i*440} 809H${350+i*440}`} frame={frame} delay={i*12+20} duration={27} color={BLUE} trail={false}/></g>)}
  </Svg>
  {actions.map((a,i)=><Rise key={a.title} frame={frame} delay={i*12+5}><T x={300+i*440} y={626} size={43} center style={{whiteSpace:'nowrap'}}>{a.title}</T><T x={300+i*440} y={707} size={25} center color={MUTED} style={{whiteSpace:'nowrap'}}>{a.sub}</T></Rise>)}
 </>;
}

export function Local({frame}:{frame:number}){
 return <>
  <Label>本机部署 · 流程示意</Label>
  <Rise frame={frame}><T x={180} y={290} size={91} weight={500}>全部部署，<br/><Ink>就在本机。</Ink></T></Rise>
  <Underline frame={frame} y={647}/><T x={180} y={700} size={30} color={MUTED}>界面、规则、记录，有序衔接。</T>
  <Svg>
   <Line d="M916 251H1716V741H916ZM916 693H1716M1316 741V819M1195 819H1437" p={tween(frame,-5,38)}/>
   <Trace d="M1074 486H1555" frame={frame} delay={15} duration={45}/>
   {[1074,1316,1555].map((x,i)=><g key={x}><circle cx={x} cy={486} r={37} fill="#000"/><Glyph d={i===0?CHAT:i===1?'M-18 -25V25M18 -25V25M-22 -25H22M0 -15V15':CLOCK} x={x} y={486} frame={frame} delay={i*12+12} scale={.38}/></g>)}
  </Svg>
  {['核验界面','规则卡口','回放记录'].map((v,i)=><Rise frame={frame} delay={i*12+13} key={v}><T x={1074+i*242} y={581} size={27} center>{v}</T></Rise>)}
 </>;
}

export function Journey({frame}:{frame:number}){
 const stages=[{name:'提交材料',d:CHAT},{name:'会商建议',d:PERSON},{name:'规则核验',d:'M-34 -46V46M34 -46V46M-43 -46H43M0 -25V25'},{name:'本人确认',d:'M-18 -37V15C-18 44 33 44 33 15V-16M-18 -9V-53C-18 -72 7 -72 7 -53V-17'},{name:'留痕回放',d:CLOCK}];
 const path='M250 568C425 568 425 568 600 568S775 568 950 568S1125 568 1300 568S1475 568 1650 568';
 return <>
  <Label>转账前，多一次有据可查的核验</Label>
  <Rise frame={frame}><T x={180} y={175} size={83} weight={600}>转账前，先核验。<br/><Ink>全程留痕，可回放。</Ink></T></Rise>
  <Svg>
   <Line d={path} opacity={.2}/><Trace d={path} frame={frame} delay={10} duration={104}/>
   {stages.map((s,i)=><g key={s.name}><circle cx={250+i*350} cy={568} r={70} fill="#000" strokeOpacity={.3}/><Glyph d={s.d} x={250+i*350} y={568} frame={frame} delay={i*20} scale={.65}/></g>)}
   <Line d="M250 835H1650" p={tween(frame,55,58)} opacity={.2}/>
  </Svg>
  {stages.map((s,i)=><Rise frame={frame} delay={i*20+8} key={s.name}><T x={250+i*350} y={708} size={31} center style={{whiteSpace:'nowrap'}}>{s.name}</T></Rise>)}
  <Rise frame={frame} delay={86}><T x={960} y={865} size={31} center color={MUTED} style={{whiteSpace:'nowrap'}}>看风险 · 核证据 · 留记录</T></Rise>
 </>;
}
