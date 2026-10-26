import React from 'react';
import {BLUE,SHOTS,WHITE} from './timeline';
import {clamp,unit} from './Dust';

type Point={x:number;y:number};
export const BRIDGES=[
 {kind:'bars-to-check',cut:18*45,lead:23,tail:20},
 {kind:'dossier-to-council',cut:SHOTS.find(s=>s.kind==='council')!.start,lead:23,tail:20},
];

export function CreativeTransitions({frame}:{frame:number}) {
 const bridge=BRIDGES.find(b=>frame>=b.cut-b.lead&&frame<b.cut+b.tail);
 if(!bridge)return null;
 const p=clamp((frame-(bridge.cut-bridge.lead))/(bridge.lead+Math.max(0,bridge.tail-8)));
 const eased=p*p*(3-2*p);
 const enter=clamp((frame-(bridge.cut-bridge.lead))/7);
 const leave=bridge.tail?1-clamp((frame-(bridge.cut+bridge.tail-8))/8):1;
 const points=Array.from({length:210},(_,i)=>{
  const u=i/209;
  let from:Point,to:Point;
  if(bridge.kind==='bars-to-check'){
   from={x:[800,1190,1580][i%3]+(unit(i+26)-.5)*200,y:350+unit(i+71)*450};
   const cluster=i%3,angle=unit(i+31)*Math.PI*2;
   to={x:620+cluster*340+Math.cos(angle)*34,y:785+Math.sin(angle)*34};
  }else if(bridge.kind==='dossier-to-council'){
   from={x:1265+unit(i+14)*250,y:410+unit(i+68)*320};
   const role=i%7,angle=unit(i+49)*Math.PI*2;
   to={x:180+role*260+Math.cos(angle)*28,y:368+Math.sin(angle)*28};
  }else{
   from={x:250+(i%5)*350+(unit(i+41)-.5)*70,y:568+(unit(i+85)-.5)*70};
   to={x:884+152*u,y:705};
  }
  const arc=Math.sin(Math.PI*eased)*(bridge.kind==='workflow-to-brand'?-90:-155);
  return <circle key={i} cx={from.x+(to.x-from.x)*eased} cy={from.y+(to.y-from.y)*eased+arc}
   r={.8+unit(i+500)*.9} fill={i%4===0?WHITE:BLUE} opacity={.35+unit(i+260)*.5}/>;
 });
 return <svg aria-hidden width="1920" height="1080" viewBox="0 0 1920 1080" style={{position:'absolute',inset:0,pointerEvents:'none',opacity:enter*leave}}>{points}</svg>;
}
