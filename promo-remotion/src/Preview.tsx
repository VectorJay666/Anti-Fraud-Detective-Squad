import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import {Film} from './Film';
import {BEATS, DURATION, FPS, FilmAssets, HEIGHT, SHOTS, WIDTH, shotAt} from './timeline';
import './preview.css';

declare global { interface Window {__FILM_ASSETS__: FilmAssets; __FILM_EXPORT_READY__: boolean; __promo: {seek:(frame:number)=>void; frame:()=>number; player:()=>PlayerRef|null}} }
const assets=window.__FILM_ASSETS__;
const Icon=({name}:{name:string})=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{
  name==='play'?<path d="M8 5L19 12L8 19Z" fill="currentColor" stroke="none"/>:
  name==='pause'?<><path d="M8 5V19M16 5V19" strokeWidth="2.6"/></>:
  name==='restart'?<><path d="M4 10A8 8 0 1 1 5 17M4 4V10H10"/></>:
  name==='full'?<path d="M8 3H3V8M16 3H21V8M3 16V21H8M21 16V21H16"/>:
  name==='muted'?<><path d="M10 5L5 9H2V15H5L10 19ZM16 9L22 15M22 9L16 15"/></>:
  <><path d="M10 5L5 9H2V15H5L10 19ZM15 8C18 10 18 14 15 16M18 5C23 9 23 15 18 19"/></>
}</svg>;
const time=(frame:number)=>`${String(Math.floor(frame/FPS/60)).padStart(2,'0')}:${String(Math.floor(frame/FPS)%60).padStart(2,'0')}`;

function App(){
  const ref=useRef<PlayerRef>(null);
  const [frame,setFrame]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [muted,setMuted]=useState(false);
  const [error,setError]=useState('');
  const index=Math.max(0,shotAt(frame));
  const seek=(f:number)=>ref.current?.seekTo(Math.max(0,Math.min(DURATION-1,f)));
  const toggle=()=>{if(ref.current?.getCurrentFrame()===DURATION-1)seek(0);ref.current?.toggle();};
  const mute=()=>{if(ref.current?.isMuted())ref.current.unmute();else ref.current?.mute();};

  useEffect(()=>{
    const p=ref.current;if(!p)return;
    const onFrame=({detail}:{detail:{frame:number}})=>setFrame(detail.frame);
    const onPlay=()=>setPlaying(true); const onPause=()=>setPlaying(false);
    const onMute=({detail}:{detail:{isMuted:boolean}})=>setMuted(detail.isMuted);
    const onError=()=>setError('音频或图片载入失败，请重新打开此文件。');
    p.addEventListener('frameupdate',onFrame);p.addEventListener('play',onPlay);p.addEventListener('pause',onPause);p.addEventListener('ended',onPause);p.addEventListener('mutechange',onMute);p.addEventListener('error',onError);
    window.__promo={seek,frame:()=>p.getCurrentFrame(),player:()=>p};
    const key=(e:KeyboardEvent)=>{
      if((e.target as HTMLElement).matches('input'))return;
      if((e.target as HTMLElement).matches('button')&&e.code==='Space')return;
      if(e.code==='Space'){e.preventDefault();toggle();}
      if(e.code==='ArrowRight'){e.preventDefault();seek(p.getCurrentFrame()+1);}
      if(e.code==='ArrowLeft'){e.preventDefault();seek(p.getCurrentFrame()-1);}
      if(e.code==='Home'){e.preventDefault();seek(0);}
      if(e.key==='m'||e.key==='M')mute();
      if(e.key==='f'||e.key==='F'){if(p.isFullscreen())p.exitFullscreen();else p.requestFullscreen();}
    };
    window.addEventListener('keydown',key);
    return()=>{p.removeEventListener('frameupdate',onFrame);p.removeEventListener('play',onPlay);p.removeEventListener('pause',onPause);p.removeEventListener('ended',onPause);p.removeEventListener('mutechange',onMute);p.removeEventListener('error',onError);window.removeEventListener('keydown',key);};
  },[]);

  return <div className="workspace">
    <header className="masthead">
      <div className="identity"><span className="brand">转账前保镖</span><span className="divider"/><span className="edition">60 秒产品短片</span></div>
      <div className="spec">1920 × 1080 <span> / </span> 45 FPS <span> / </span> 16:9</div>
    </header>
    <main>
      <div className="screen-wrap">
        <Player ref={ref} component={Film} inputProps={{assets}} durationInFrames={DURATION} fps={FPS} compositionWidth={WIDTH} compositionHeight={HEIGHT} style={{width:'100%',aspectRatio:'16/9'}} controls={false} clickToPlay doubleClickToFullscreen spaceKeyToPlayOrPause={false} moveToBeginningWhenEnded={false} acknowledgeRemotionLicense/>
      </div>
      <div className="film-meta"><div><span className="live-dot"/>{SHOTS[index].name}<span className="slash"> / </span>{SHOTS[index].title}</div><span className="frame-label">{String(frame).padStart(4,'0')} <span>/ {DURATION} FRAMES</span></span></div>
      <div className="transport" aria-label="影片播放控制">
        <button className="play-button" onClick={toggle} aria-label={playing?'暂停影片':'播放影片'} title="空格：播放 / 暂停"><Icon name={playing?'pause':'play'}/></button>
        <button className="icon-button" onClick={()=>{seek(0);ref.current?.play();}} aria-label="从头播放" title="从头播放"><Icon name="restart"/></button>
        <div className="scrub"><input type="range" min="0" max={DURATION-1} step="1" value={frame} onChange={e=>seek(Number(e.target.value))} aria-label="影片进度" style={{'--progress':`${frame/(DURATION-1)*100}%`} as React.CSSProperties}/></div>
        <div className="timecode">{frame===DURATION-1?'01:00':time(frame)} <span>/ 01:00</span></div>
        <button className="icon-button" onClick={mute} aria-label={muted?'打开声音':'静音'} title="M：声音"><Icon name={muted?'muted':'sound'}/></button>
        <button className="icon-button" onClick={()=>ref.current?.requestFullscreen()} aria-label="全屏播放" title="F：全屏"><Icon name="full"/></button>
      </div>
      <div className="downloads" aria-label="保存影片">
        <span>保存到电脑</span>
        <div>{window.__FILM_EXPORT_READY__?<a href="./转账前保镖-60秒-45fps.mp4?download=1" download="转账前保镖-60秒-45fps.mp4">下载 MP4 视频</a>:<span className="export-pending">MP4 正在导出</span>}
        <a href="./转账前保镖-60秒动画预览.html?download=1" download="转账前保镖-60秒动画预览.html">保存 HTML 预览</a></div>
      </div>
      <nav className="chapters" aria-label="六段叙事">
        {BEATS.map((s,i)=><button key={s.start} className={`chapter ${frame>=s.start&&frame<s.end?'active':''}`} onClick={()=>seek(s.start)} aria-label={`跳转至${s.label}`} aria-current={frame>=s.start&&frame<s.end?'step':undefined}>
          <span className="chapter-top"><span>{String(i+1).padStart(2,'0')}</span><span>{String(Math.round(s.start/FPS)).padStart(2,'0')}—{String(Math.round(s.end/FPS)).padStart(2,'0')}s</span></span>
          <span className="chapter-title">{s.label}</span>
        </button>)}
      </nav>
      {error&&<p role="alert" className="error">{error}</p>}
    </main>
    <footer><span>七角色会商建议 <span className="footer-dot">·</span> 确定性规则卡口 <span className="footer-dot">·</span> 人工确认</span><span className="shortcuts">空格 播放 <span> / </span> ← → 逐帧 <span> / </span> F 全屏</span></footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
