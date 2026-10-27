import React from 'react';
import {BLUE} from './timeline';

// Physical props only: these are explanatory materials, never a redraw of product screenshots.
export function PhysicalDossier({x,y,scale,opacity,seconds}:{x:number;y:number;scale:number;opacity:number;seconds:number}) {
 const turn=-10+Math.sin(seconds*.32)*2.4;
 return <div aria-hidden style={{position:'absolute',left:x,top:y,width:216,height:284,opacity,pointerEvents:'none',transform:`translate(-50%,-50%) scale(${scale})`,transformOrigin:'center'}}>
  <div style={{position:'absolute',left:-75,top:259,width:390,height:68,background:'radial-gradient(ellipse,rgba(0,0,0,.7),transparent 70%)',filter:'blur(12px)',transform:'rotate(-5deg)'}}/>
  <div style={{position:'absolute',inset:0,transformStyle:'preserve-3d',transform:`perspective(1400px) rotateX(7deg) rotateY(${turn}deg) rotateZ(-1.2deg)`}}>
   {[3,2,1].map(i=><div key={i} style={{position:'absolute',inset:0,background:i===3?'#7c818b':'#b3b8c1',borderRadius:5,transform:`translate3d(${i*2.5}px,${i*2.8}px,${-i*2}px)`,boxShadow:'2px 4px 8px rgba(0,0,0,.35)'}}/>)}
   <div style={{position:'absolute',inset:0,background:'linear-gradient(115deg,#f4f5f7 0%,#d6dae2 65%,#aeb5c1 100%)',borderRadius:5,transform:'translateZ(3px)',boxShadow:'inset 1px 1px 1px rgba(255,255,255,.95),inset -1px -1px 1px rgba(0,0,0,.18),8px 17px 32px rgba(0,0,0,.35)',overflow:'hidden'}}>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(130deg,rgba(255,255,255,.38),transparent 48%,rgba(0,0,0,.07))'}}/>
    <div style={{position:'absolute',left:28,top:32,fontSize:17,fontWeight:600,letterSpacing:'.05em',color:'#333c4f'}}>核验材料</div>
    <div style={{position:'absolute',left:29,right:28,top:77,height:2,background:'#939dab'}}/>
    {['EV-001','EV-002','R-01 / R-02'].map((s,i)=><div key={s} style={{position:'absolute',left:30,top:103+i*39,fontSize:15,color:i===2?BLUE:'#525f74',fontFamily:'Consolas, sans-serif'}}>{s}<div style={{width:i===2?92:143,height:2,background:'#a1aab9',marginTop:9}}/></div>)}
    <div style={{position:'absolute',right:23,bottom:21,width:27,height:27,border:`1px solid ${BLUE}`,borderRadius:'50%',opacity:.55}}/>
   </div>
  </div>
 </div>;
}

export function StageLighting(){return <div aria-hidden style={{position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(ellipse at 63% 37%,rgba(131,145,173,.075),transparent 62%),linear-gradient(180deg,#030405,#07090d 72%,#020304)'}}><div style={{position:'absolute',left:'18%',right:'7%',top:'75%',height:'19%',background:'radial-gradient(ellipse,rgba(110,122,150,.065),transparent 70%)',filter:'blur(20px)'}}/></div>;}
