import React from 'react';
import {Easing,interpolate} from 'remotion';
import {BLUE,MUTED,WHITE} from './timeline';
import {PERSON,Rise,Svg,T,Trace,tween} from './Motion';
import {unit} from './Dust';
import stats from './fraud-stats.json';

const centers=[800,1190,1580];
const heights=stats.series.map(s=>s.value*3.6);
const rows=heights.map(h=>Math.round(h/23));
const selected={x:789,y:800-3*heights[0]/(rows[0]-1)};
const camera=(frame:number,values:number[])=>interpolate(frame,[2.4,3.5,6.311,7.4].map(t=>t*25),values,
 {extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});

export function CaseBarChart({frame}:{frame:number}) {
 const risks=['长期投资骗局','刷单返利','冒充客服','冒充公检法','熟人借款','虚假理赔'];
 const activeRisk=Math.min(5,Math.max(0,Math.floor((frame/25-4)/(2.1333333333))));
 const morph=tween(frame,2.4*25,27);
 const scale=camera(frame,[4.4,2.5,1.15,1]);
 const sx=camera(frame,[1120,1080,820,selected.x]);
 const sy=camera(frame,[600,610,selected.y,selected.y]);
 const tx=sx-selected.x*scale,ty=sy-selected.y*scale;
 const caseFade=1-tween(frame,2.35*25,22);
 const avatarScale=.7+(.16-.7)*morph;
 return <>
  <div style={{position:'absolute',inset:0,opacity:caseFade}}>
   <T x={180} y={104} size={27} color={MUTED}>长期骗局 · 情境示意</T>
   <Rise frame={frame} delay={1}><T x={180} y={305} size={84} weight={600}>先养熟信任，<br/><span style={{color:BLUE}}>再诱导转账。</span></T></Rise>
   <Svg>
    <path d="M1260 290H1710V455H1370L1320 497V455H1260Z" stroke={WHITE} opacity={tween(frame,4,15)}/>
    <Trace d="M1222 546C1310 546 1275 483 1345 483" frame={frame} delay={8} duration={26} color={BLUE}/>
   </Svg>
   <Rise frame={frame} delay={5}><T x={1485} y={235} size={28} center color={MUTED}>所谓“投资导师”</T><T x={1485} y={348} size={31} center style={{whiteSpace:'nowrap'}}>{frame<31?'先小额获利，再加大投入':'再加一笔，才能提现'}</T></Rise>
   <Rise frame={frame} delay={32}><T x={1120} y={830} size={32} center style={{whiteSpace:'nowrap'}}>小额返利 → 诱导加码 → 继续索款</T></Rise>
  </div>
  <Svg>
   <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
    <g opacity={tween(frame,3.3*25,25)}>
     <path d="M660 305V822H1755" strokeWidth="1.2" strokeOpacity=".24"/>
     {centers.map((x,b)=>{
      const rise=tween(frame,(3.4+b*1.7)*25,70);
      const h=heights[b];
      return <g key={b}>
       <path d={`M${x-111} 800V${800-h*rise}H${x+111}V800`} strokeWidth="1" stroke={BLUE} opacity={.14*rise}/>
       {Array.from({length:rows[b]*10},(_,i)=>{
        const col=i%10,row=Math.floor(i/10),px=x-99+col*22,py=800-row*h/(rows[b]-1);
        if(b===0&&row===3&&col===4)return null;
        const appear=tween(frame,(3.6+b*2.1)*25+row*4+col*.75,22);
        return <g key={i} transform={`translate(${px+(unit(i+b*101)-.5)*65*(1-appear)} ${py-33*(1-appear)})`} opacity={appear*(.48+unit(i+b*99)*.47)}>
         <circle r="8" strokeWidth=".9" strokeOpacity=".16" fill="#000"/>
         <path d="M-2.3 -3A2.3 2.3 0 1 1 2.3 -3A2.3 2.3 0 1 1 -2.3 -3M-5.3 5.2C-5.1 -.2 5.1 -.2 5.3 5.2" strokeWidth="1.05"/>
        </g>;
       })}
      </g>;
     })}
    </g>
    <g transform={`translate(${selected.x} ${selected.y})`}>
     <g transform={`scale(${avatarScale})`} opacity={1-morph*.94}><path d={PERSON} stroke={WHITE} strokeWidth={2.5} strokeDasharray="400" strokeDashoffset={400*(1-tween(frame,0,17))}/></g>
     <circle r="2.8" fill={BLUE} stroke="none" opacity={morph}/>
     <circle r="9" stroke={BLUE} strokeOpacity={morph*.8} fill="none"/>
    </g>
   </g>
  </Svg>
  <div style={{opacity:tween(frame,3.8*25,18)}}>
   {risks.map((v,i)=>{const p=tween(frame,(3.8+i*.5333333333)*25,18);return <div key={v} style={{position:'absolute',left:180+i*263,top:192,opacity:p,color:i===activeRisk?WHITE:MUTED,transform:`translateY(${(1-p)*24}px)`,fontSize:26}}><span style={{color:BLUE,marginRight:10}}>·</span>{v}</div>;})}
  </div>
  <div style={{opacity:tween(frame,7.0*25,25)}}>
   <T x={180} y={104} size={27} color={MUTED}>美国 FTC · 消费者报告的诈骗损失</T>
   <T x={180} y={300} size={84} weight={500}>报告损失，<br/><span style={{color:BLUE}}>逐年增加。</span></T>
   <T x={180} y={575} size={28} color={MUTED}>2022—2024 年年度披露</T>
   <T x={180} y={630} size={27} color={MUTED}>单位：亿美元</T>
   <T x={180} y={735} size={27} color={BLUE}>{risks[activeRisk]}</T>
   {stats.series.map((v,i)=><React.Fragment key={v.year}>
    <T x={centers[i]} y={800-heights[i]-73} size={40} center color={i===2?BLUE:WHITE}>{v.display}</T>
    <T x={centers[i]} y={850} size={32} center color={MUTED}>{v.year}</T>
   </React.Fragment>)}
   <T x={647} y={806} size={21} color={MUTED}>0</T>
  </div>
  <div style={{opacity:tween(frame,12.4*25,28)}}>
   <T x={180} y={925} size={32}>长期布局，分次诱导。转账前，更需要核验。</T>
   <T x={180} y={980} size={21} color={MUTED}>人物为情境与金额的视觉示意，不对应真实人数；数据来源：FTC 年度发布</T>
  </div>
 </>;
}
