import React from 'react';
import {Easing,interpolate} from 'remotion';
import {BLUE,MUTED,WHITE} from './timeline';
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
const camera=(frame:number,values:number[])=>interpolate(frame,[9.567,10.63,11.162,11.693].map(t=>t*25),values,
 {extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});

export function CaseBarChart({frame}:{frame:number}) {
 const seconds=frame/25;
 const active=Math.max(0,OPENING_CASES.filter(c=>seconds>=c.at).length-1);
 const collapse=tween(frame,9.15*25,.65*25);
 const morph=tween(frame,9.567*25,23);
 const scale=camera(frame,[4.4,2.5,1.2,1]);
 const sx=camera(frame,[960,960,825,selected.x]);
 const sy=camera(frame,[600,640,selected.y,selected.y]);
 const tx=sx-selected.x*scale,ty=sy-selected.y*scale;
 const caseFade=1-tween(frame,9.45*25,.55*25);
 const avatarScale=.7+(.16-.7)*morph;
 return <>
  <div style={{position:'absolute',inset:0,opacity:caseFade}}>
   <T x={180} y={75} size={27} color={MUTED}>同一个人，可能面临的不同骗局 · 情境示意</T>
   <T x={960} y={140} size={57} center weight={500} style={{whiteSpace:'nowrap'}}>电话、群聊、私信，都可能是入口。</T>
   <Svg>
    {OPENING_CASES.map((c,i)=>{
     const enter=tween(frame,c.at*25,.24*25);
     const x=c.x+(960-c.x)*collapse,y=c.y+(600-c.y)*collapse;
     const opacity=enter*(i===active||seconds>8.5?1:.32)*(1-collapse);
     const msg=i===0&&seconds>1.2?'再加一笔，才能提现':c.message;
     return <g key={c.title} opacity={opacity}>
      <path d={`M${x} ${y}Q960 ${y} 960 600`} stroke={i===active?BLUE:'#777780'} strokeWidth={1.5} strokeDasharray={i===active?'none':'4 9'}/>
      <g transform={`translate(${x} ${y}) scale(${1-.6*collapse})`}>
       <rect x={-278} y={-73} width={556} height={146} rx={12} fill="#06070a" stroke={i===active?BLUE:WHITE}/>
       <text x={-242} y={-26} fill={i===active?BLUE:MUTED} stroke="none" fontSize={26}>{c.title}</text>
       <text x={-242} y={30} fill={WHITE} stroke="none" fontSize={30}>{msg}</text>
      </g>
     </g>;
    })}
   </Svg>
  </div>
  <Svg>
   <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
    <g opacity={tween(frame,10.9*25,.4*25)}>
     <path d="M660 305V822H1755" strokeWidth="1.2" strokeOpacity=".24"/>
     {centers.map((x,b)=>{
      const rise=tween(frame,(11.05+b*.5315)*25,23);
      const h=heights[b];
      return <g key={b}>
       <path d={`M${x-111} 800V${800-h*rise}H${x+111}V800`} strokeWidth="1" stroke={BLUE} opacity={.14*rise}/>
       {Array.from({length:rows[b]*10},(_,i)=>{
        const col=i%10,row=Math.floor(i/10),px=x-99+col*22,py=800-row*h/(rows[b]-1);
        if(b===0&&row===3&&col===4)return null;
        const appear=tween(frame,(11.05+b*.5315)*25+row*.65+col*.2,8);
        return <g key={i} transform={`translate(${px+(unit(i+b*101)-.5)*65*(1-appear)} ${py-33*(1-appear)})`} opacity={appear*(.48+unit(i+b*99)*.47)}>
         <circle r="8" strokeWidth=".9" strokeOpacity=".16" fill="#000"/>
         <path d="M-2.3 -3A2.3 2.3 0 1 1 2.3 -3A2.3 2.3 0 1 1 -2.3 -3M-5.3 5.2C-5.1 -.2 5.1 -.2 5.3 5.2" strokeWidth="1.05"/>
        </g>;
       })}
      </g>;
     })}
    </g>
    <g transform={`translate(${selected.x} ${selected.y})`}>
     <g transform={`scale(${avatarScale})`} opacity={1-morph*.94}><path d={PERSON} stroke={WHITE} strokeWidth={2.5/(scale*avatarScale)} strokeDasharray="400" strokeDashoffset={400*(1-tween(frame,0,10))}/></g>
     <circle r="2.8" fill={BLUE} stroke="none" opacity={morph}/>
     <circle r="9" stroke={BLUE} strokeOpacity={morph*.8} fill="none"/>
    </g>
   </g>
  </Svg>
  <div style={{opacity:tween(frame,11.693*25,10)}}>
   <T x={180} y={104} size={27} color={MUTED}>美国 FTC · 消费者报告的诈骗损失</T>
   <T x={180} y={300} size={84} weight={500}>报告损失，<br/><span style={{color:BLUE}}>逐年增加。</span></T>
   <T x={180} y={575} size={28} color={MUTED}>2022—2024 年年度披露</T>
   <T x={180} y={630} size={27} color={MUTED}>单位：亿美元</T>
   {stats.series.map((v,i)=><div key={v.year} style={{opacity:tween(frame,(11.693+i*.5315)*25,8)}}>
    <T x={centers[i]} y={800-heights[i]-73} size={40} center color={i===2?BLUE:WHITE}>{v.display}</T>
    <T x={centers[i]} y={850} size={32} center color={MUTED}>{v.year}</T>
   </div>)}
   <T x={647} y={806} size={21} color={MUTED}>0</T>
  </div>
  <div style={{opacity:tween(frame,14.35*25,14)}}>
   <T x={180} y={925} size={32}>不同的骗局，都在把人推向转账。</T>
   <T x={180} y={980} size={21} color={MUTED}>人物为情境与金额的视觉示意，不对应真实人数；数据来源：FTC 年度发布</T>
  </div>
 </>;
}
