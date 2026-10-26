import React, {useMemo} from 'react';
import {Easing, interpolate, spring} from 'remotion';
import {getLength,getPointAtLength} from '@remotion/paths';
import {BLUE,MOTION_FPS,MUTED,STROKE,WHITE} from './timeline';
export const FONT='"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
export const MONO='"SFMono-Regular", Consolas, monospace';
export const tween=(frame:number,start=0,duration=24)=>interpolate(frame,[start,start+duration],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.22,1,.36,1)});
export const settle=(frame:number,delay=0)=>spring({frame:Math.max(0,frame-delay),fps:MOTION_FPS,config:{damping:200,stiffness:95,mass:1.05}});
export const Svg:React.FC<{children:React.ReactNode;style?:React.CSSProperties}>=({children,style})=><svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position:'absolute',inset:0,overflow:'visible',...style}} fill="none" stroke={WHITE} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
export const Line:React.FC<{d:string;p?:number;color?:string;opacity?:number}>=({d,p=1,color=WHITE,opacity=1})=><path d={d} pathLength={1} stroke={color} opacity={opacity} strokeDasharray="1" strokeDashoffset={1-Math.max(0,Math.min(1,p))}/>;
export function Trace({d,frame,delay=0,duration=36,color=BLUE,trail=true}:{d:string;frame:number;delay?:number;duration?:number;color?:string;trail?:boolean}){
 const p=tween(frame,delay,duration);const length=useMemo(()=>getLength(d),[d]);const point=getPointAtLength(d,length*p);
 return <><Line d={d} p={p} color={color}/>{trail&&point&&p>0&&p<1&&<circle cx={point.x} cy={point.y} r={4} fill={WHITE} stroke="none"/>}</>;
}
export const T:React.FC<{x:number;y:number;size?:number;color?:string;weight?:number;center?:boolean;children:React.ReactNode;style?:React.CSSProperties}>=({x,y,size=32,color=WHITE,weight=400,center=false,children,style})=><div style={{position:'absolute',left:x,top:y,fontFamily:FONT,fontSize:size,fontWeight:weight,color,lineHeight:1.35,letterSpacing:size>60?'-.04em':'.01em',whiteSpace:'pre-line',textAlign:center?'center':'left',transform:center?'translateX(-50%)':undefined,...style}}>{children}</div>;
export const Ink:React.FC<{children:React.ReactNode}>=({children})=><span style={{color:BLUE}}>{children}</span>;
export const Label:React.FC<{children:React.ReactNode}>=({children})=><T x={180} y={103} size={27} color={MUTED} style={{letterSpacing:'.1em'}}>{children}</T>;
export const Rise:React.FC<{frame:number;delay?:number;distance?:number;children:React.ReactNode}>=({frame,delay=0,distance=40,children})=>{const p=settle(frame,delay);return <div style={{position:'absolute',inset:0,opacity:tween(frame,delay,15),transform:`translateY(${(1-p)*distance}px)`}}>{children}</div>;};
export const Underline=({frame,y=727}:{frame:number;y?:number})=><Svg><Line d={`M180 ${y}H304`} color={BLUE} p={tween(frame,10,30)}/></Svg>;
export const DOC='M-55 -76H27L55 -48V76H-55ZM27 -76V-48H55M-31 -16H31M-31 12H31M-31 40H9';
export const CHAT='M-67 -45H67V35H-5L-38 63V35H-67ZM-42 -18H42M-42 7H18';
export const PERSON='M-17 -25C-17 -48 17 -48 17 -25C17 -1 -17 -1 -17 -25ZM-42 46C-41 0 41 0 42 46';
export const CLOCK='M0 -62A62 62 0 1 1 -1 -62M0 -35V0L27 18';
export function Glyph({d,x,y,frame,delay=0,scale=1,color=WHITE}:{d:string;x:number;y:number;frame:number;delay?:number;scale?:number;color?:string}){
 return <g transform={`translate(${x} ${y+(1-settle(frame,delay))*32}) scale(${scale})`}><Line d={d} p={tween(frame,delay,32)} color={color}/></g>;
}
