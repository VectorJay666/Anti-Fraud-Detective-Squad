import React from 'react';
import {BLUE,RED} from './timeline';
import {clamp} from './Dust';
export const BRIDGES=[{kind:'warning-to-check',cut:18*45,lead:18,tail:20}];
export function CreativeTransitions({frame}:{frame:number}){
 const b=BRIDGES[0];if(frame<b.cut-b.lead||frame>=b.cut+b.tail)return null;
 const u=clamp((frame-(b.cut-b.lead))/(b.lead+b.tail));const p=u*u*(3-2*u);
 const opacity=Math.sin(Math.PI*u)*.65;
 const y=580+205*p;
 return <svg width={1920} height={1080} style={{position:'absolute',inset:0,pointerEvents:'none',opacity}}><path d={`M${690+70*p} ${y}H${1230-70*p}`} fill="none" stroke={p<.5?RED:BLUE} strokeWidth={2.5}/></svg>;
}
