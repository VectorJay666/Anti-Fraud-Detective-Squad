import React, {useMemo} from 'react';
import {getLength, getPointAtLength} from '@remotion/paths';
import {STROKE, WHITE} from './timeline';

export const unit=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453123;return v-Math.floor(v);};
export const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const smooth=(v:number)=>{const x=clamp(v);return x*x*(3-2*x);};

// The same path samples first arrive as loose dust, then settle into a dotted contour.
// Completed paths use one SVG element, keeping the 45fps preview inexpensive.
export function DustStroke({d,p=1,color=WHITE,opacity=1}:{d:string;p?:number;color?:string;opacity?:number}) {
 const path=useMemo(()=>{
  const length=getLength(d);const count=Math.max(2,Math.min(260,Math.ceil(length/6.5)));
  return {length,count,points:Array.from({length:count},(_,i)=>getPointAtLength(d,length*i/count))};
 },[d]);
 const progress=clamp(p);
 if(progress>=.999)return <path d={d} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`0.01 ${path.length/path.count}`} opacity={opacity}/>;
 return <g fill={color} stroke="none" opacity={opacity}>{path.points.map((target,i)=>{
  if(!target)return null;
  const phase=i/path.count;
  const settled=smooth((progress-phase*.58)/.42);
  const distance=(1-settled)*(1-settled);
  const x=target.x+(unit(i+path.length)*2-1)*240*distance;
  const y=target.y+(unit(i+path.length+81)*2-1)*160*distance;
  const visible=clamp(progress*4-phase*.7);
  return <circle key={i} cx={x} cy={y} r={STROKE/2} opacity={visible*(.18+.82*settled)}/>;
 })}</g>;
}

export function DustOrb({x,y,radius,frame,delay=0,color=WHITE}:{x:number;y:number;radius:number;frame:number;delay?:number;color?:string}) {
 const gather=smooth((frame-delay)/29);
 const points=Array.from({length:160},(_,i)=>{
  const yy=1-2*(i+.5)/160;
  const ring=Math.sqrt(1-yy*yy);
  const angle=i*2.399963+(frame-delay)*.009;
  const zz=Math.sin(angle)*ring,xx=Math.cos(angle)*ring;
  const perspective=1+.15*zz;
  const tx=x+xx*radius*perspective,ty=y+yy*radius*perspective;
  return {i,z:zz,x:tx+(unit(i+300)*2-1)*radius*4*(1-gather),
   y:ty+(unit(i+900)*2-1)*radius*3*(1-gather)};
 }).sort((a,b)=>a.z-b.z);
 return <g stroke="none" fill={color} opacity={clamp((frame-delay)/12)}>{points.map(point=>
  <circle key={point.i} cx={point.x} cy={point.y} r={.55+(point.z+1)*.55} opacity={.18+(point.z+1)*.37}/>
 )}</g>;
}
