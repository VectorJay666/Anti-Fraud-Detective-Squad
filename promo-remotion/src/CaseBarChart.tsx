import React from 'react';
import {Easing,interpolate} from 'remotion';
import {BLUE,MUTED,RED,WHITE} from './timeline';
import {PERSON,Svg,T,tween} from './Motion';
import {unit} from './Dust';
import stats from './fraud-stats.json';

const centers=[800,1190,1580];
const heights=stats.series.map(s=>s.value*3.6);
const rows=heights.map(h=>Math.round(h/23));
const selected={x:789,y:800-3*heights[0]/(rows[0]-1)};
export const OPENING_CASES=[
 {at:0,title:'长期投资骗局',message:'先小额获利，再加大投入',x:1380,y:350},
 {at:3.189,title:'刷单返利',message:'先垫付，做完任务就返佣',x:530,y:320},
 {at:4.252,title:'冒充客服',message:'账户异常，转账完成核验',x:450,y:570},
 {at:5.315,title:'冒充公检法',message:'涉嫌洗钱，转到安全账户',x:1460,y:590},
 {at:6.378,title:'熟人借款',message:'我换号了，急用钱',x:540,y:810},
 {at:7.441,title:'虚假理赔',message:'先转保证金，才能领理赔',x:1360,y:825},
];
const camera=(frame:number,values:number[])=>interpolate(frame,[9.3,11.45].map(t=>t*25),[values[0],values[values.length-1]],
 {extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.65,0,.2,1)});


export function CaseBarChart({frame}:{frame:number}) {
 const seconds=frame/25;
 const active=Math.max(0,OPENING_CASES.filter(c=>seconds>=c.at).length-1);
 const collapse=tween(frame,8.95*25,1.0*25);
 const focus=tween(frame,13.3*25,.85*25);
 const chartFade=1-tween(frame,13.3*25,.65*25);
 const morph=tween(frame,9.567*25,23);
 const scale=Math.exp(camera(frame,[Math.log(4.4),0]));
 const sx=camera(frame,[960,960,825,selected.x]);
 const sy=camera(frame,[600,640,selected.y,selected.y]);
 const tx=sx-selected.x*scale,ty=sy-selected.y*scale;
 const caseFade=1-tween(frame,9.35*25,.65*25);
 const avatarScale=.7+(.16-.7)*morph;
 return <>
  <div style={{position:'absolute',inset:0,opacity:caseFade}}>
   <T x={180} y={75} size={27} color={MUTED}>同一个人，可能面临的不同骗局 · 情境示意</T>
   <T x={960} y={140} size={57} center weight={500} style={{whiteSpace:'nowrap'}}>电话、群聊、私信，都可能是入口。</T>
   <Svg>
    <defs><linearGradient id="message-material" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#262b34"/><stop offset=".5" stopColor="#141820"/><stop offset="1" stopColor="#0b0e14"/></linearGradient><filter id="message-shadow" x="-30%" y="-60%" width="170%" height="250%"><feDropShadow dx="4" dy="14" stdDeviation="13" floodColor="#000" floodOpacity=".55"/></filter></defs>
    {OPENING_CASES.map((c,i)=>{
     const enter=tween(frame,c.at*25,.6*25);
     const settle=1-enter;
     const dim=i<OPENING_CASES.length-1?tween(frame,OPENING_CASES[i+1].at*25,.45*25):0;
     const relight=tween(frame,8.25*25,.65*25);
     const x=c.x+(960-c.x)*collapse+(c.x<960?-70:70)*settle,y=c.y+(600-c.y)*collapse+24*settle;
     const opacity=enter*(1-.57*dim*(1-relight))*(1-collapse);
     const msg=i===0&&seconds>1.2?'再加一笔，才能提现':c.message;
     return <g key={c.title} opacity={opacity}>
      <path d={`M${x} ${y}Q960 ${y} 960 600`} stroke={i===active?BLUE:'#777780'} strokeWidth={1.5} pathLength={1} strokeDasharray="1" strokeDashoffset={1-enter}/>
      <g transform={`translate(${x} ${y}) rotate(${(i%2?1:-1)*1.8*settle}) scale(${(1-.6*collapse)*(.96+.04*enter)})`}>
       <rect x={-278} y={-73} width={556} height={146} rx={12} fill="url(#message-material)" stroke={i===active?BLUE:'#727983'} filter="url(#message-shadow)"/>
       <text x={-242} y={-26} fill={i===active?BLUE:MUTED} stroke="none" fontSize={26}>{c.title}</text>
       {i===0?<><text x={-242} y={30} fill={WHITE} stroke="none" fontSize={30} opacity={1-tween(frame,1.2*25,.35*25)}>{c.message}</text><text x={-242} y={30} fill={WHITE} stroke="none" fontSize={30} opacity={tween(frame,1.2*25,.35*25)}>再加一笔，才能提现</text></>:<text x={-242} y={30} fill={WHITE} stroke="none" fontSize={30}>{msg}</text>}
      </g>
     </g>;
    })}
   </Svg>
  </div>
  <Svg>
   <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
    <defs><radialGradient id="person-head" cx=".3" cy=".2" r=".9"><stop stopColor="#ecf0f5"/><stop offset=".38" stopColor="#a5adbc"/><stop offset="1" stopColor="#303948"/></radialGradient><linearGradient id="person-body" x1="0" y1="0" x2="1" y2=".5"><stop stopColor="#c0c7d3"/><stop offset=".4" stopColor="#7e899b"/><stop offset="1" stopColor="#303846"/></linearGradient><linearGradient id="bar-material" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#101a2b"/><stop offset=".6" stopColor="#1d3153"/><stop offset="1" stopColor="#0b1221"/></linearGradient></defs>
    <g opacity={tween(frame,10.6*25,.35*25)*chartFade}>
     <path d="M660 305V822H1755" strokeWidth="1.2" strokeOpacity=".24"/>
     {centers.map((x,b)=>{
      const rise=tween(frame,(10.65+b*.35)*25,18);
      const h=heights[b];
      return <g key={b}>
       <path d={`M${x-111} 800V${800-h*rise}H${x+111}V800Z`} fill="url(#bar-material)" stroke="none" opacity={.7*rise}/>
       <path d={`M${x+111} 800L${x+126} 790V${790-h*rise}L${x+111} ${800-h*rise}Z`} fill="#19253a" stroke="none" opacity={rise}/>
       <path d={`M${x-111} ${800-h*rise}L${x-96} ${790-h*rise}H${x+126}L${x+111} ${800-h*rise}Z`} fill="#31415a" stroke="none" opacity={rise}/>
       <path d={`M${x-111} 800V${800-h*rise}H${x+111}V800`} strokeWidth="1" stroke={BLUE} opacity={.14*rise}/>
       {Array.from({length:rows[b]*10},(_,i)=>{
        const col=i%10,row=Math.floor(i/10),px=x-99+col*22,py=800-row*h/(rows[b]-1);
        if(b===0&&row===3&&col===4)return null;
        const appear=tween(frame,(10.65+b*.35)*25+row*.4+col*.16,8);
        return <g key={i} transform={`translate(${px+(unit(i+b*101)-.5)*65*(1-appear)} ${py-33*(1-appear)})`} opacity={appear*(.48+unit(i+b*99)*.47)}>
         <circle r="8" strokeWidth=".9" strokeOpacity=".16" fill="#000"/>
         <path d="M-2.3 -3A2.3 2.3 0 1 1 2.3 -3A2.3 2.3 0 1 1 -2.3 -3M-5.3 5.2C-5.1 -.2 5.1 -.2 5.3 5.2" strokeWidth="1.05"/>
        </g>;
       })}
      </g>;
     })}
    </g>
    <g opacity={chartFade} transform={`translate(${selected.x} ${selected.y})`}>
     <g transform={`scale(${avatarScale})`} opacity={1-morph*.94}><ellipse cx="4" cy="50" rx="46" ry="9" fill="#000" opacity=".4" stroke="none"/><circle cx="0" cy="-25" r="17" fill="url(#person-head)" stroke="none"/><path d="M-42 46C-41 0 41 0 42 46Q0 59 -42 46Z" fill="url(#person-body)" stroke="none"/></g>
     <circle r="2.8" fill={BLUE} stroke="none" opacity={morph}/>
     <circle r="9" stroke={BLUE} strokeOpacity={morph*.8} fill="none"/>
    </g>
   </g>
  </Svg>
  <div style={{opacity:tween(frame,11.45*25,9)*chartFade,transform:`translateY(${-18*focus}px)`}}>
   <T x={180} y={104} size={27} color={MUTED}>美国 FTC · 消费者报告的诈骗损失</T>
   <T x={180} y={300} size={84} weight={500}>报告损失，<br/><span style={{color:BLUE}}>逐年增加。</span></T>
   <T x={180} y={575} size={28} color={MUTED}>2022—2024 年年度披露</T>
   <T x={180} y={630} size={27} color={MUTED}>单位：亿美元</T>
   {stats.series.slice(0,2).map((v,i)=><div key={v.year} style={{opacity:tween(frame,(11.693+i*.5315)*25,8)}}>
    <T x={centers[i]} y={800-heights[i]-73} size={40} center color={i===2?BLUE:WHITE}>{v.display}</T>
    <T x={centers[i]} y={850} size={32} center color={MUTED}>{v.year}</T>
   </div>)}
   <T x={647} y={806} size={21} color={MUTED}>0</T>
  </div>
  <T x={1580+(960-1580)*focus} y={277+(350-277)*focus} size={40+94*focus} center weight={500} color={`rgb(${Math.round(43+(217-43)*focus)},${Math.round(92+(88-92)*focus)},${Math.round(230+(88-230)*focus)})`} style={{whiteSpace:'nowrap',opacity:tween(frame,12.05*25,8)}}>超125亿美元</T>
  <T x={1580} y={850} size={32} center color={MUTED} style={{opacity:tween(frame,12.05*25,8)*chartFade}}>2024</T>
  <div style={{opacity:tween(frame,13.75*25,.5*25)}}>
   <T x={960} y={548} size={32} center color={MUTED} style={{whiteSpace:'nowrap'}}>2024 年美国 FTC 消费者报告的诈骗损失</T>
   <T x={960} y={660} size={67} center weight={500} color={RED} style={{whiteSpace:'nowrap'}}>转账前，别跳过核验。</T>
   <T x={960} y={936} size={22} center color={MUTED} style={{whiteSpace:'nowrap'}}>2022—2024 年报告损失逐年增加 · 历史披露口径，非真实受害人数</T>
  </div>
 </>;
}
