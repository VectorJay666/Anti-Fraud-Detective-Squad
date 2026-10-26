import React from 'react';
import {interpolate,Easing} from 'remotion';
import {BLUE,MUTED,RED,WHITE,ROLES,ROLE_NOTES} from './timeline';
import {CHAT,DOC,PERSON,CLOCK,FONT} from './Motion';

// One uninterrupted stage. All chapter times address the same document and evidence objects.
export const STORY_START=22.272;
export const STORY_CUTS=[22.272,28.65,32.902,41.406,47.784,54.162,60.54,64.792,71.17,77.548,83.926];
const B=.5315;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(t:number,a:number,d=.65)=>{const p=clamp((t-a)/d);return p*p*(3-2*p);};
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
const lerp=(t:number,knots:number[],values:number[])=>interpolate(t,knots,values,{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
const point=(p:number,a:{x:number;y:number},b:{x:number;y:number},arc=0)=>({x:mix(a.x,b.x,p),y:mix(a.y,b.y,p)-Math.sin(p*Math.PI)*arc});
const scope='项目本地规则基线 · 私有合成评测 · v0.3.1-r7 · 2026-10-04';
const icon=(d:string,x:number,y:number,s=1,color=WHITE)=><g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth={2.5/s} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></g>;
function Txt({x,y,size=30,color=WHITE,anchor='start',children,weight=400}:{x:number;y:number;size?:number;color?:string;anchor?:'start'|'middle'|'end';children:React.ReactNode;weight?:number}){return <text x={x} y={y} fill={color} stroke="none" fontSize={size} fontWeight={weight} textAnchor={anchor}>{children}</text>;}
function Layer({t,a,b,children}:{t:number;a:number;b:number;children:React.ReactNode}){const p=smooth(t,a)* (1-smooth(t,b-.65));return <g opacity={p} transform={`translate(0 ${18*(1-smooth(t,a))})`}>{children}</g>;}
function Packet({x,y,label,color=BLUE,scale=1}:{x:number;y:number;label?:string;color?:string;scale?:number}){return <g transform={`translate(${x} ${y}) scale(${scale})`}><rect x={-60} y={-24} width={120} height={48} rx={5} fill="#07090f" stroke={color} strokeWidth={1.8}/>{label&&<Txt x={0} y={7} size={18} color={color} anchor="middle">{label}</Txt>}</g>;}

export function ContinuousStory({seconds:t}:{seconds:number}) {
 const c=STORY_CUTS;
 const docX=lerp(t,[c[0],c[1],c[2],c[2]+.8,c[3],c[3]+.8,c[4],c[4]+.8,c[5],c[5]+.8,c[6],c[6]+1],[1480,1380,960,960,960,530,530,610,610,960,960,960]);
 const docY=lerp(t,[c[0],c[1],c[2],c[3],c[4],c[5],c[6]],[570,570,660,660,550,550,540]);
 const docScale=lerp(t,[c[0],c[1],c[2],c[3],c[4],c[5],c[6],c[6]+1],[.7,1.65,1.1,1.1,1.1,.85,.85,.08]);
 const docOpacity=smooth(t,c[0]+.3)*(1-smooth(t,c[6]+.4,.9));
 const beat=Math.floor((t-c[0])/B);
 const pulse=1-clamp(((t-c[0])%B)/B);
 const cardTypes=[['家人来电','“涉嫌洗钱，转到安全账户”','冒充公检法'],['任务返佣','“先垫付，做完这单就返现”','刷单返利'],['商户理赔','“订单异常，先转账再理赔”','冒充平台客服']];
 const cardIndex=Math.min(2,Math.max(0,Math.floor((t-c[0])/(4*B))));
 const roleIndex=Math.min(6,Math.max(0,Math.floor((t-c[2])/(2*B))));
 const evalProgress=smooth(t,c[7],3.2);
 const injectCount=Math.min(24,Math.max(0,Math.floor((t-c[9])/(B/3))));
 return <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position:'absolute',inset:0,fontFamily:FONT}} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
  {/* The transport rail stays on screen across every internal cut. */}
  <path d="M180 900H1740" stroke="#33343c" strokeWidth={1}/>
  <path d={`M180 900H${180+1560*clamp((t-c[0])/(c[10]-c[0]))}`} stroke={BLUE} strokeWidth={2}/>
  <circle cx={180+1560*clamp((t-c[0])/(c[10]-c[0]))} cy={900} r={4+pulse*2} fill={BLUE}/>
  <g opacity={docOpacity} transform={`translate(${docX} ${docY}) scale(${docScale})`}>
   <path d="M-108 -142H58L108 -92V142H-108ZM58 -142V-92H108" stroke={WHITE} fill="#000"/>
   <path d="M-66 -45H66M-66 1H66M-66 47H28" stroke={BLUE}/>
   <circle cx={78} cy={109} r={7+pulse*4} stroke={BLUE} opacity={.5+.5*pulse}/>
  </g>
  <Layer t={t} a={c[0]} b={c[1]+.6}>
   <Txt x={180} y={135} size={27} color={MUTED}>同样的核验，进入不同的生活场景</Txt>
   <Txt x={180} y={258} size={72} weight={600}>一句可疑话术，先交给保镖。</Txt>
   {cardTypes.map((v,i)=>{
    const active=cardIndex===i;
    const age=(t-c[0])-i*4*B;
    const p=smooth(age,0,.45);
    const exit=smooth(age,4*B-.5,.65);
    const x=660+mix(330,0,p)-exit*420;
    return <g key={v[0]} opacity={p*(1-exit)} transform={`translate(${x} 535) rotate(${-3*(1-p)-exit*3})`}>
     <rect x={-470} y={-130} width={940} height={260} rx={18} stroke={active?BLUE:WHITE} fill="#08090c"/>
     {icon(CHAT,-360,-18,.8)}<Txt x={-270} y={-51} size={26} color={MUTED}>{v[0]}</Txt>
     <Txt x={-270} y={24} size={37}>{v[1]}</Txt><Txt x={-270} y={91} size={28} color={BLUE}>{v[2]}</Txt>
    </g>;
   })}
   <path d="M1090 550C1210 550 1160 570 1360 570" stroke={BLUE} strokeDasharray="5 10"/>
   <Txt x={1380} y={850} size={30} anchor="middle">贴入原文</Txt>
   <Txt x={180} y={831} size={27} color={MUTED}>可疑短信 / 来电话术 / 聊天截图文字 · 情境示意</Txt>
  </Layer>
  <Layer t={t} a={c[1]} b={c[2]+.7}>
   <Txt x={180} y={135} size={27} color={MUTED}>从原文里抽取线索，不补写不存在的事实</Txt>
   <Txt x={180} y={258} size={75} weight={600}>话术变线索。线索进案卷。</Txt>
   {['催转账话术  EV-001','限时压迫  EV-002','核验条款  R-01 / R-02'].map((v,i)=>{
    const p=smooth(t,c[1]+i*B,.7); const end=smooth(t,c[2]-.7+i*.1,.9);
    return <g key={v} opacity={p*(1-end)} transform={`translate(${mix(260,docX-40,end)} ${mix(432+i*129,docY,end)}) scale(${1-.72*end})`}>
     <rect x={0} y={-40} width={720} height={80} rx={4} stroke={i===2?BLUE:'#777780'} fill="#050508"/>
     <Txt x={32} y={11} size={32}>{v}</Txt>
    </g>;
   })}
   <Txt x={1420} y={823} size={29} anchor="middle">待核验案卷</Txt>
  </Layer>
  <Layer t={t} a={c[2]} b={c[3]+.6}>
   <Txt x={180} y={135} size={27} color={MUTED}>七角色会商建议 · 不是七个自动决策者</Txt>
   <Txt x={180} y={245} size={72} weight={600}>同一份材料，交叉核验。</Txt>
   {ROLES.map((r,i)=>{
    const x=210+i*250; const p=smooth(t,c[2]+i*.09,.55); const active=i===roleIndex;
    const travel=clamp((t-(c[2]+i*2*B))/1.05);
    const q=point(travel,{x,y:445},{x:960,y:620},-50);
    return <g key={r} opacity={p}>
     <path d={`M${x} 451C${x} 570 960 535 960 620`} stroke={active?BLUE:'#45454e'} strokeWidth={active?2.5:1.3}/>
     {icon(PERSON,x,355,.75,active?BLUE:WHITE)}<Txt x={x} y={301} size={22} anchor="middle" color={MUTED}>0{i+1}</Txt>
     <Txt x={x} y={425} size={29} anchor="middle">{r}</Txt>
     {travel>0&&travel<1&&<circle cx={q.x} cy={q.y} r={7} fill={BLUE}/>}
    </g>;
   })}
   <Txt x={960} y={858} size={32} anchor="middle" color={BLUE}>{ROLES[roleIndex]} · {ROLE_NOTES[roleIndex]}</Txt>
  </Layer>
  <Layer t={t} a={c[3]} b={c[4]+.65}>
   <Txt x={180} y={135} size={27} color={MUTED}>确定性规则卡口 · 拒绝无据结论</Txt>
   <Txt x={180} y={252} size={72} weight={600}>建议在流动，依据逐条查。</Txt>
   <path d="M700 550H1490M1060 350V750M1170 350V750M1040 350H1190" stroke={WHITE}/>
   <Txt x={1115} y={809} size={29} anchor="middle" color={BLUE}>rule_gate</Txt>
   {['EV-001','EV-002','EV-FAB','R-99'].map((v,i)=>{
    const age=t-(c[3]+.6+i*1.05);
    const p=clamp(age/.8); const reject=i>1; const returning=smooth(age,.8,.8);
    const x=reject?mix(1115,760,returning):mix(1115,1510,smooth(age,.8,.8));
    const pos=age<.8?mix(720,1115,p):x;
    const y=reject?550+Math.sin(returning*Math.PI)*115:550;
    return <g key={v} opacity={smooth(age,0,.15)*(1-smooth(age,1.65,.35))}><Packet x={pos} y={y} label={v} color={reject&&age>.8?RED:BLUE}/>{reject&&age>.8&&<path d="M1090 515l50 70m0 -70l-50 70" stroke={RED}/>}</g>;
   })}
   <Txt x={1520} y={462} size={29} anchor="middle" color={BLUE}>已有证据</Txt>
   <Txt x={750} y={737} size={28} color={RED}>编造证据 / 编造条款 → 打回</Txt>
   <Txt x={180} y={835} size={26} color={MUTED}>EV-FAB-TRANSFER 与 R-99 不在案卷或条款库，不得作为结论依据</Txt>
  </Layer>
  <Layer t={t} a={c[4]} b={c[5]+.65}>
   <Txt x={180} y={135} size={27} color={MUTED}>核验输出 · 由用户本人决定下一步</Txt>
   <Txt x={180} y={252} size={72} weight={600}>风险有分档，建议有依据。</Txt>
   {['高危','低危','证据不足'].map((v,i)=>{
    const p=smooth(t,c[4]+i*B,.65);return <g key={v} opacity={p} transform={`translate(${mix(680,1130,p)} ${mix(550,416+i*126,p)})`}>
     <path d="M-70 0H100" stroke={i===0?RED:i===1?BLUE:MUTED}/><Txt x={127} y={10} size={36} color={i===0?RED:WHITE}>{v}</Txt>
    </g>;
   })}
   {icon(PERSON,1650,582,1.6)}<path d="M1440 556H1550" stroke={BLUE}/>
   <Txt x={610} y={756} size={29} anchor="middle">证据编号 + 条款依据</Txt>
   <Txt x={1625} y={775} size={29} anchor="middle" color={BLUE}>本人确认</Txt>
   <Txt x={180} y={837} size={27} color={MUTED}>拿不准就明确提示证据不足 · 不碰账户，不代替用户操作</Txt>
  </Layer>
  <Layer t={t} a={c[5]} b={c[6]+.7}>
   <Txt x={180} y={135} size={27} color={MUTED}>把核验结果变成可以执行的下一步</Txt>
   <Txt x={180} y={252} size={72} weight={600}>先停一下，再做这四件事。</Txt>
   {['暂停转账','官方核实','不点陌生链接','保留聊天记录'].map((v,i)=>{
    const p=smooth(t,c[5]+i*2*B,.7);const x=300+i*440;const y=548;
    return <g key={v} opacity={p}>
     <path d={`M960 570Q${x} 740 ${x} ${y}`} stroke={BLUE} opacity={.5}/>
     <g transform={`translate(${mix(960,x,p)} ${mix(570,y,p)}) scale(${mix(.15,1,p)})`}>
      <circle r={77} stroke={WHITE} fill="#000"/>{icon(i===3?CLOCK:i===2?'M-30 -30L30 30M30 -30L-30 30':i===1?'M-30 -40Q-60 0 30 40L45 20L20 2L3 13Q-15 0 -17 -15L-5 -25Z':'M-17 -34V34M17 -34V34',0,0,.7)}
     </g><Txt x={x} y={726} size={35} anchor="middle">{v}</Txt>
    </g>;
   })}
   <Txt x={960} y={832} size={28} color={MUTED} anchor="middle">每一步留痕，可回放；最终动作由本人确认</Txt>
  </Layer>
  <Layer t={t} a={c[6]} b={c[7]+.5}>
   <Txt x={180} y={135} size={27} color={MUTED}>让结果接受可复现的评测</Txt>
   <Txt x={180} y={255} size={72} weight={600}>不是一句“有效”。逐人对照真相。</Txt>
   <Txt x={180} y={808} size={31} color={MUTED}>私有合成城市 · 3000 居民 · 4 团伙 · 12 报案</Txt>
   <Txt x={1740} y={808} size={29} color={BLUE} anchor="end">84 名团伙成员</Txt>
  </Layer>
  {/* These 84 persistent squares leave the dossier, form the sample, then split 66/18. */}
  <g opacity={smooth(t,c[6]+.3,.4)*(1-smooth(t,c[9]-.3,.6))}>
   {Array.from({length:84},(_,i)=>{
    const build=smooth(t,c[6]+(i%14)*.11+Math.floor(i/14)*.1,1.2);
    const origin={x:960+(i%7-3)*5,y:540+Math.floor(i/7)*2};
    const grid={x:605+(i%14)*55,y:420+Math.floor(i/14)*55};
    const split=i<66?{x:250+(i%11)*65,y:410+Math.floor(i/11)*55}:{x:1325+(i-66)%6*55,y:465+Math.floor((i-66)/6)*70};
    const pos=point(build,origin,grid,Math.sin(i)*95);
    const divide=smooth(t,c[7]+(i%11)*.035,1.6);
    const join=smooth(t,c[8]-.45,1.1);
    const revise=smooth(t,c[8]+1.6,2.1);
    const oldBar=i<48?{x:480+i*14,y:440}:{x:480+(i-48)*14,y:632};
    const newBar=i<66?{x:480+i*14,y:440}:{x:550+(i-66)*20,y:790};
    const bar={x:mix(oldBar.x,newBar.x,revise),y:mix(oldBar.y,newBar.y,revise)};
    const base={x:mix(pos.x,split.x,divide),y:mix(pos.y,split.y,divide)};
    const color=join>.1?(revise>.5?(i<66?BLUE:'#777780'):(i<48?BLUE:RED)):(i<66?BLUE:mixColor(divide));
    return <rect key={i} x={mix(base.x,bar.x,join)} y={mix(base.y,bar.y,join)} width={mix(26,i<66?12:16,join)} height={mix(26,33,join)} rx={3} fill={color} opacity={build}/>;
   })}
  </g>
  <Layer t={t} a={c[7]} b={c[8]+.45}>
   <Txt x={180} y={135} size={27} color={MUTED}>项目团伙研判基线 · 对照隐藏真相</Txt>
   <Txt x={180} y={255} size={68} weight={600}>66 人有据指认。18 人交人工复核。</Txt>
   <Txt x={235} y={365} size={34} color={BLUE}>正确指认 66 / 84</Txt><Txt x={1325} y={380} size={34} color={MUTED}>证据不足 18</Txt>
   <Txt x={1120} y={575} size={82} anchor="middle" weight={600}>{(78.5714286*evalProgress).toFixed(1)}%</Txt>
   <Txt x={240} y={819} size={34}>0 普通人误伤</Txt><Txt x={760} y={819} size={34}>0 违规指认</Txt><Txt x={1325} y={819} size={29} color={MUTED}>不硬判，交给人</Txt>
  </Layer>
  <Layer t={t} a={c[8]} b={c[9]+.5}>
   <Txt x={180} y={135} size={27} color={MUTED}>同一座合成评测城 · 新旧规则管线对照</Txt>
   <Txt x={180} y={255} size={70} weight={600}>收紧证据标准，违规指认降为零。</Txt>
   {['合规指认','违规指认'].map((v,i)=>{
    const p=smooth(t,c[8]+1.6,2.1);const old=i===0?48:36;const now=i===0?66:0;
    return <g key={v}><Txt x={180} y={453+i*192} size={35}>{v}</Txt>
     <rect x={480} y={395+i*192} width={old*14} height={18} rx={3} fill={i?RED:BLUE} opacity={.25}/>

     <Txt x={1550} y={473+i*192} size={65} color={i?WHITE:BLUE}>{Math.round(mix(old,now,p))}</Txt>
     <Txt x={480+old*14+25} y={413+i*192} size={25} color={MUTED}>旧 {old}</Txt>
    </g>;
   })}
   <Txt x={180} y={812} size={27} color={MUTED}>18 人转人工</Txt><Txt x={1000} y={812} size={27} color={MUTED}>v0.3 旧管线 → r7 现行版</Txt>
  </Layer>
  <Layer t={t} a={c[9]} b={c[10]+.5}>
   <Txt x={180} y={135} size={27} color={MUTED}>把错误引用主动送进来，检验规则会不会放过</Txt>
   <Txt x={180} y={255} size={71} weight={600}>24 次无关引用，24 次打回。</Txt>
   <path d="M960 377V720M1070 377V720M940 377H1090" stroke={WHITE}/>
   {Array.from({length:24},(_,i)=>{
    const age=t-c[9]-i*B/3; const p=clamp(age/.5);const ret=clamp((age-.5)/.6);
    const x=age<.5?mix(310,1015,p):mix(1015,500,ret);
    return age>=0&&age<1.1?<g key={i}><Packet x={x} y={mix(520,690,ret)} color={ret>0?RED:BLUE} scale={.65}/></g>:null;
   })}
   <path d="M990 480L1040 560M1040 480L990 560" stroke={RED}/>
   <Txt x={1320} y={519} size={114} weight={600}>{injectCount}<tspan fontSize={46}> / 24</tspan></Txt>
   <Txt x={1320} y={605} size={34} color={RED}>NOT_DIRECT 打回</Txt>
   <Txt x={180} y={811} size={29} color={MUTED}>每条引用真实存在，并与当事人直接相关；拒绝的是无据结论</Txt>
  </Layer>
  <g opacity={smooth(t,c[6],.5)}><Txt x={180} y={973} size={22} color={MUTED}>{scope} · 不代表真实用户防骗成功率</Txt></g>
 </svg>;
}
function mixColor(p:number){const v=Math.round(mix(43,112,p));return `rgb(${v},${Math.round(mix(92,113,p))},${Math.round(mix(230,123,p))})`;}
