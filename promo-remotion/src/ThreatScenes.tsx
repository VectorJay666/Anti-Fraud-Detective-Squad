import React from 'react';
import {interpolate} from 'remotion';
import {BLUE, MUTED, WHITE} from './timeline';
import {DustOrb, DustStroke} from './Dust';
import {CHAT, PERSON, Glyph, Ink, Label, Line, Rise, Svg, T, Trace, tween} from './Motion';

const PHONE='M-138 -320H138Q170 -320 170 -288V288Q170 320 138 320H-138Q-170 320 -170 288V-288Q-170 -320 -138 -320ZM-45 -293H45M-45 293H45';

export function Incoming({frame}:{frame:number}) {
 const hit=tween(frame,25,16);
 return <>
  <Label>情境示意</Label>
  <Rise frame={frame} delay={3}><T x={180} y={323} size={104} weight={600}>对方催你</T></Rise>
  <Rise frame={frame} delay={25} distance={20}><T x={180} y={470} size={114} weight={600}><Ink>立刻转账。</Ink></T></Rise>
  <Svg>
   <Glyph d={PHONE} x={1315} y={532} frame={frame} scale={1}/>
   <g transform={`translate(1315 ${470+(1-hit)*30})`} opacity={hit}>
    <Line d="M-137 -62H137V47H-64L-96 73V47H-137Z"/>
   </g>
   <Trace d="M340 745H790C1000 745 998 532 1132 532" frame={frame} delay={25} duration={43} color={BLUE}/>
   <Line d="M1180 706H1450V770H1180Z" p={tween(frame,41,24)} opacity={.5}/>
  </Svg>
  <Rise frame={frame} delay={28}><T x={1315} y={449} size={26} center style={{whiteSpace:'nowrap'}}>请立即完成核验</T></Rise>
  <Rise frame={frame} delay={43}><T x={1315} y={720} size={25} center color={MUTED}>确认转账</T></Rise>
  <T x={1315} y={923} size={22} center color={MUTED}>非支付界面</T>
 </>;
}

export function Masks({frame}:{frame:number}) {
 const nodes=[{x:1050,y:300,d:PERSON,label:'冒充身份'},
  {x:1500,y:300,d:'M-51 -12C-51 -60 51 -60 51 -12V30M-51 0H-64V34H-44V0M51 0H64V34H44V0',label:'虚假客服'},
  {x:1050,y:690,d:'M-60 45L-20 5L12 22L65 -44M31 -44H65V-10',label:'高额回报'},
  {x:1500,y:690,d:CHAT,label:'伪造话术'}];
 return <>
  <Label>同样的催促，不同的包装</Label>
  <Rise frame={frame}><T x={180} y={327} size={104} weight={600}>假身份。<br/><Ink>假承诺。</Ink></T></Rise>
  <Svg>
   <Trace d="M1050 405C1050 505 1500 495 1500 585M1500 405C1500 505 1050 495 1050 585" frame={frame} delay={10} duration={56} color={WHITE}/>
   {nodes.map((n,i)=><g key={n.label}>
    <circle cx={n.x} cy={n.y} r={100} strokeOpacity={.16} strokeDasharray="630" strokeDashoffset={630*(1-tween(frame,i*10,35))}/>
    <Glyph d={n.d} x={n.x} y={n.y} frame={frame} delay={i*10} scale={.8}/>
   </g>)}
   <Trace d="M1180 500H1370" frame={frame} delay={41} duration={30} color={BLUE}/>
  </Svg>
  {nodes.map((n,i)=><Rise frame={frame} delay={i*10+5} key={n.label}><T x={n.x} y={n.y+125} size={29} center>{n.label}</T></Rise>)}
 </>;
}

export function Pressure({frame}:{frame:number}) {
 const items=[{x:220,y:290,text:'立即核验',d:0},{x:1250,y:240,text:'再补一笔',d:13.333},
 {x:320,y:705,text:'别告诉别人',d:26.667},{x:1270,y:735,text:'机会快没了',d:40}];
 const squeeze=tween(frame,0,66);
 return <>
  <Label>催促越密，判断空间越小</Label>
  <Svg>
   {items.map((m,i)=>{
    const x=m.x+(960-m.x)*squeeze*.1, y=m.y;
    return <g key={m.text}>
     <Line d={`M${x-30} ${y-15}H${x+320}V${y+90}H${x+35}L${x+5} ${y+116}V${y+90}H${x-30}Z`} p={tween(frame,m.d,24)} opacity={.65}/>
     <Trace d={`M${x+(i%2?0:320)} ${y+50}C960 ${y+50} 960 500 960 535`} frame={frame} delay={m.d+12} duration={35} color={i===3?BLUE:'#92929B'}/>
    </g>;
   })}
   <circle cx="960" cy="535" r={110-squeeze*30} strokeOpacity={.6}/>
   <Line d={`M${760+65*squeeze} 413V389H${784+65*squeeze}M${1160-65*squeeze} 413V389H${1136-65*squeeze}M${760+65*squeeze} 657V681H${784+65*squeeze}M${1160-65*squeeze} 657V681H${1136-65*squeeze}`} color={BLUE} p={tween(frame,12,25)}/>
   <Glyph d={PERSON} x={960} y={535} frame={frame} scale={.9}/>
  </Svg>
  {items.map(m=><Rise frame={frame} delay={m.d+3} key={m.text}><T x={m.x+(960-m.x)*squeeze*.1+145} y={m.y+15} size={34} center style={{whiteSpace:'nowrap'}}>{m.text}</T></Rise>)}
  <Rise frame={frame} delay={25}><T x={960} y={922} size={48} center weight={600} style={{whiteSpace:'nowrap'}}>催得越急，越要警惕。</T></Rise>
 </>;
}

export function Brink({frame}:{frame:number}) {
 const p=tween(frame,0,24);
 return <>
  <T x={960} y={220} size={76} center weight={600} style={{whiteSpace:'nowrap'}}>钱转出去，<Ink>难追回。</Ink></T>
  <Svg>
   <Line d="M570 461H1350V607H570Z" color={WHITE}/>
   <g transform={`translate(${-100*p} ${-55*p})`}>
    <Line d="M1530 950C1460 884 1403 824 1325 779L1138 665C1085 630 1070 602 1087 590C1100 578 1124 592 1150 608L1297 686C1327 700 1348 699 1370 700L1460 735"/>
   </g>
   <Line d="M800 809H1120" color={BLUE} p={tween(frame,0,18)}/>
  </Svg>
  <T x={960} y={499} size={48} center style={{whiteSpace:'nowrap'}}>确认转账</T>
  <T x={960} y={943} size={22} center color={MUTED}>情境示意 · 非支付界面</T>
 </>;
}

export function Pivot({frame}:{frame:number}) {
 const punch=interpolate(frame,[0,6,13,22],[1.12,.977,1.013,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const halo=tween(frame,0,18);
 const exit=1-tween(frame,44,9);
 return <>
  <svg width="1920" height="1080" style={{position:'absolute',inset:0,opacity:exit}}>
   <defs>
    <radialGradient id="pivot-halo"><stop offset=".55" stopColor={BLUE} stopOpacity="0"/><stop offset=".81" stopColor={BLUE} stopOpacity=".19"/><stop offset="1" stopColor={BLUE} stopOpacity="0"/></radialGradient>
    <filter id="pivot-soft"><feGaussianBlur stdDeviation="13"/></filter>
   </defs>
   <ellipse cx="960" cy="470" rx={590+100*halo} ry={185+36*halo} fill="url(#pivot-halo)"/>
   <ellipse cx="960" cy="470" rx={565+105*halo} ry={175+35*halo} fill="none" stroke={BLUE} strokeWidth="4" opacity={.72*(1-.55*halo)} filter="url(#pivot-soft)"/>
   <ellipse cx="960" cy="470" rx={565+105*halo} ry={175+35*halo} fill="none" stroke={BLUE} strokeWidth="1.4" opacity={.55*(1-.65*halo)}/>
  </svg>
  <div style={{position:'absolute',inset:0,opacity:exit,transform:`scale(${punch})`,transformOrigin:'960px 470px'}}>
   <T x={960} y={290} size={72} center weight={500} style={{whiteSpace:'nowrap'}}>但在转账前，</T>
   <T x={960} y={426} size={116} center weight={600} style={{whiteSpace:'nowrap',textShadow:`0 0 ${20*(1-halo)}px rgba(43,92,230,.4)`}}>还有<Ink>核验</Ink>这一步。</T>
  </div>
  <Svg>
   {[0,1,2].map(i=><DustOrb key={i} x={620+i*340} y={785} radius={34} frame={frame} delay={i*3-3} color={i===1?BLUE:WHITE}/>)}
   <DustStroke d="M665 785H915M1005 785H1255" p={tween(frame,18,32)} color={BLUE}/>
  </Svg>
  {['核验材料','形成建议','本人确认'].map((v,i)=><Rise key={v} frame={frame} delay={16+i*4} distance={12}>
   <T x={620+i*340} y={864} size={29} center color={MUTED}>{v}</T>
  </Rise>)}
 </>;
}
