import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, useCurrentFrame} from 'remotion';
import {BLUE, FPS, MOTION_FPS, FilmAssets, MUTED, RED, ROLES, ROLE_NOTES, SHOTS, STROKE, WHITE, progress} from './timeline';
import {Trace, tween, Rise} from './Motion';
import {Incoming, Masks, Pressure, Brink, Pivot} from './ThreatScenes';
import {CreativeTransitions} from './CreativeTransitions';
import {ContinuousStory,STORY_START} from './ContinuousStory';
import {CaseBarChart} from './CaseBarChart';
import {EvidenceCheck,RiskOutput,UseCases,ProductImpact,Results} from './OutcomeScenes';
import {Actions, Advice, Boundary, Intake, Journey, Local, Proof, Relay, Scenario} from './AnimationScenes';

const font = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
const mono = '"SFMono-Regular", Consolas, monospace';
const S: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{position:'absolute', inset:0, overflow:'visible', ...style}} fill="none" stroke={WHITE} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const Path: React.FC<{d: string; p?: number; color?: string; opacity?: number}> = ({d, p=1, color=WHITE, opacity=1}) => <path d={d} pathLength={1} stroke={color} opacity={opacity} strokeDasharray="1" strokeDashoffset={1-p}/>;
const Text: React.FC<{x:number; y:number; size?:number; color?:string; children:React.ReactNode; weight?:number; align?:'left'|'center'; style?:React.CSSProperties}> = ({x,y,size=32,color=WHITE,children,weight=400,align='left',style}) => <div style={{position:'absolute',left:x,top:y,fontSize:size,fontWeight:weight,color,lineHeight:1.35,letterSpacing: size > 60 ? '-0.04em':'0.01em',whiteSpace:'pre-line',textAlign:align,transform:align==='center'?'translateX(-50%)':undefined,...style}}>{children}</div>;
const Eyebrow: React.FC<{children: React.ReactNode}> = ({children}) => <Text x={180} y={105} size={27} color={MUTED} style={{letterSpacing:'.12em'}}>{children}</Text>;
const AccentLine: React.FC<{frame:number; y?:number; width?:number}> = ({frame,y=729,width=112}) => <S><Path d={`M180 ${y}H${180+width}`} p={progress(frame,3,26)} color={BLUE}/></S>;

function Phone({frame,close}:{frame:number;close:boolean}) {
  const retreat=progress(frame,21,26);
  const approach=progress(frame,0,18);
  const px=retreat*156-(1-retreat)*approach*70;
  const py=retreat*80-(1-retreat)*approach*20;
  const zoom=close?1.045:1+0.025*progress(frame,0,38);
  return <>
    <div style={{position:'absolute',inset:0,transform:`translate(0px,0px) scale(${zoom})`,transformOrigin:'1290px 540px'}}>
      <S>
        <Path d="M1152 174H1408Q1448 174 1448 214V796Q1448 836 1408 836H1152Q1112 836 1112 796V214Q1112 174 1152 174Z" p={0.7+0.3*progress(frame,0,30)}/>
        <Path d="M1230 198H1330M1230 810H1330" opacity={0.55}/>
        <Path d="M1140 294H1420M1140 406H1420" opacity={0.3}/>
        <Path d="M1158 680H1402V744H1158Z" color={BLUE}/>
        <Path d="M1112 501C1053 487 1024 520 1036 565L1061 667C1071 709 1082 743 1111 777M1112 559C1079 548 1068 560 1079 592L1112 680M1097 760L1063 832" opacity={0.7}/>
        <g transform={`translate(${px} ${py})`}>
          <Path d="M1748 885C1664 857 1620 819 1578 777L1479 702C1434 672 1402 658 1388 642C1375 627 1381 613 1396 614C1425 617 1462 643 1500 659L1587 695C1626 707 1659 726 1690 755L1754 815" p={progress(frame,-12,32)}/>
          <Path d="M1500 659C1522 634 1541 645 1565 670M1542 676C1565 655 1585 670 1604 697" opacity={0.6}/>
        </g>
        <Path d="M1023 898H1760" opacity={0.18}/>
      </S>
      <Text x={1280} y={235} size={26} align="center" color={MUTED}>客服</Text>
      <Text x={1149} y={328} size={25}>请转账完成核验</Text>
      <Text x={1280} y={694} size={26} align="center">确认转账</Text>
    </div>
    <Eyebrow>一次催促，一个停顿</Eyebrow>
    <div style={{opacity:0.7+0.3*progress(frame,0,20),transform:`translateY(${(1-progress(frame,0,32))*14}px)`}}>
      <Text x={178} y={315} size={115} weight={500}>转账前，</Text>
      <Text x={178} y={470} size={115} weight={500}>先别<TextBlue>急。</TextBlue></Text>
    </div>
    <AccentLine frame={frame}/>
    <Text x={180} y={773} size={26} color={MUTED}>{close?'把这一下，留给核验。':'越是催促，越该停一下。'}</Text>
    <Text x={1280} y={924} size={22} align="center" color={MUTED}>情境示意 · 非支付界面</Text>
  </>;
}
const TextBlue: React.FC<{children:React.ReactNode}> = ({children}) => <span style={{color:BLUE}}>{children}</span>;

function TitleCard({frame}:{frame:number}) {
  return <>
    <S><Path d="M880 305H1040" color={BLUE} p={progress(frame,0,22)}/></S>
    <Rise frame={frame} distance={22}><Text x={960} y={380} size={119} weight={500} align="center" style={{whiteSpace:'nowrap'}}>转账前保镖</Text></Rise>
    <Text x={960} y={565} size={47} align="center" color="#B4B4BB" style={{whiteSpace:'nowrap'}}>转账前的防骗核验助手</Text>
  </>;
}

function Screenshot({src,x,y,width,height,zoom=1,offsetX=0,offsetY=0,label}:{src:string;x:number;y:number;width:number;height:number;zoom?:number;offsetX?:number;offsetY?:number;label?:string}) {
  // The PNG is never filtered, overpainted, masked by effects or redrawn.
  // A rectangular viewport may select an existing region of the unchanged original.
  return <>
    <div style={{position:'absolute',left:x,top:y,width,height,overflow:'hidden',boxShadow:'0 24px 80px rgba(43,92,230,0.10)'}}>
      <Img src={src} style={{position:'absolute',width:width*zoom,maxWidth:'none',height:'auto',left:offsetX,top:offsetY}}/>
    </div>
    {label&&<Text x={x} y={y+height+24} size={23} color={MUTED}>{label}</Text>}
  </>;
}

function Live({frame,src,detail}:{frame:number;src:string;detail:boolean}) {
  const p=progress(frame,0,50);
  return <>
    <Eyebrow>{detail?'会商建议 · 真实界面':'基于 openJiuwen 的多智能体系统'}</Eyebrow>
    <Text x={180} y={300} size={detail?87:94} weight={500}>{detail?'只给建议，':'先让保镖'}<br/>{detail?<TextBlue>不越权拍板。</TextBlue>:<>看一<TextBlue>眼。</TextBlue></>}</Text>
    <AccentLine frame={frame} y={620}/>
    <Text x={180} y={670} size={28} color={MUTED}>{detail?'核验材料，听取不同意见。':'转账前防骗核验软件'}</Text>
    <div style={{transform:`scale(${1+0.006*p})`,transformOrigin:'1300px 520px'}}>
      {detail?<Screenshot src={src} x={800} y={155} width={945} height={730} zoom={2.29} offsetX={-133} offsetY={-343} label="原始截图 · 事件区域取景"/>:<Screenshot src={src} x={800} y={155} width={990} height={730} label="真实产品截图"/>}
    </div>
  </>;
}

function Council({frame}:{frame:number}) {
  const active=Math.min(6,Math.max(0,Math.floor(frame/(25*8/15))));
  return <>
    <Eyebrow>会商机制示意</Eyebrow>
    <Text x={180} y={173} size={78} weight={500}>七个角色。<TextBlue>一份建议。</TextBlue></Text>
    <Text x={180} y={818} size={27} color={MUTED}>{ROLES[active]} · {ROLE_NOTES[active]}</Text>
    <S>
      {ROLES.map((_,i)=>{const x=180+i*260;return <g key={i}>
        <Path d={`M${x-15} 347C${x-15} 326 ${x+15} 326 ${x+15} 347C${x+15} 367 ${x-15} 367 ${x-15} 347ZM${x-35} 407C${x-34} 369 ${x+34} 369 ${x+35} 407`} p={progress(frame,-5+i*2,22)} color={i===active?BLUE:WHITE}/>
        <Trace d={`M${x} 520C${x} 625 960 580 960 674`} frame={frame} delay={i*(25*8/15)} duration={23} color={i===active?BLUE:'#808088'}/>
      </g>})}
      <Path d="M892 688H998L1028 718V802H892ZM998 688V718H1028M914 740H1004M914 766H975" p={progress(frame,52,23)}/>
      <Trace d="M1056 746H1310" color={BLUE} frame={frame} delay={78} duration={22}/>
      <Path d="M1298 735L1310 746L1298 757M1363 705V790M1542 705V790" p={progress(frame,85,20)}/>
    </S>
    {ROLES.map((r,i)=><React.Fragment key={r}>
      <Text x={180+i*260} y={281} size={23} color={MUTED} align="center" style={{fontFamily:mono}}>0{i+1}</Text>
      <Text x={180+i*260} y={444} size={31} align="center" style={{whiteSpace:'nowrap'}}>{r}</Text>
    </React.Fragment>)}
    <Text x={960} y={830} size={30} align="center">建议卷宗</Text>
    <Text x={1452} y={707} size={31} align="center" style={{fontFamily:mono,whiteSpace:'nowrap'}}>rule_gate</Text>
    <Text x={1452} y={756} size={23} align="center" color={MUTED} style={{whiteSpace:'nowrap'}}>本机规则盖章</Text>
  </>;
}

function Gate({frame}:{frame:number}) {
  const close=progress(frame,39.3,14);
  return <>
    <Eyebrow>确定性规则 · 机制示意</Eyebrow>
    <Text x={180} y={178} size={84} weight={500}>证据，<TextBlue>必须有据。</TextBlue></Text>
    <S>
      <Trace d="M603 421H710C844 421 818 572 1008 572" frame={frame} duration={41} color={WHITE}/>
      <Trace d="M603 681H710C844 681 818 572 1008 572" frame={frame} delay={8} duration={41} color={WHITE}/>
      <Path d="M1020 355V755M1125 355V755M1010 355H1135" p={progress(frame,-8,20)}/>
      <Path d="M1155 572H1254M1242 561L1254 572L1242 583" color={RED} p={progress(frame,53,18)}/>
      <g transform={`translate(0 ${-290*(1-close)})`} opacity={close}>
        <path d="M1072 398V736" stroke={RED}/>
        <path d="M1052 540L1092 580M1092 540L1052 580" stroke={RED}/>
      </g>
    </S>
    <Text x={180} y={366} size={42}>编造证据</Text>
    <Text x={180} y={430} size={26} color={MUTED} style={{fontFamily:mono}}>EV-FAB-TRANSFER</Text>
    <Text x={180} y={625} size={42}>编造条款</Text>
    <Text x={180} y={689} size={26} color={MUTED} style={{fontFamily:mono}}>R-99</Text>
    <Text x={1072} y={805} size={30} align="center" style={{fontFamily:mono}}>rule_gate</Text>
    <Text x={1072} y={853} size={25} align="center" color={MUTED} style={{whiteSpace:'nowrap'}}>确定性规则卡口</Text>
    <div style={{opacity:progress(frame,50,17)}}>
      <Text x={1320} y={443} size={67} weight={500} color={RED}>拒绝<br/>无据结论</Text>
    </div>
  </>;
}

function GateResult({src}:{src:string}) {
  return <>
    <Eyebrow>规则结果 · 真实界面</Eyebrow>
    <Text x={180} y={327} size={84} weight={500}>无据结论，<br/><TextBlue>不盖章。</TextBlue></Text>
    <AccentLine frame={45} y={651}/>
    <Text x={180} y={702} size={28} color={MUTED}>证据与条款必须有据</Text>
    <Screenshot src={src} x={795} y={190} width={1055} height={652} zoom={1580*1.7/1055} offsetX={-800*1.7} offsetY={-530*1.7} label="原始截图 · 规则结果区域取景"/>
  </>;
}

function Human({frame}:{frame:number}) {
  const p=progress(frame,5,35);
  return <>
    <Eyebrow>人工确认 · 本机审阅示意</Eyebrow>
    <Text x={180} y={312} size={76} weight={500}>贴入可疑话术，<br/><TextBlue>查看核验结果。</TextBlue></Text>
    <AccentLine frame={frame} y={643}/>
    <Text x={180} y={700} size={30} color={MUTED} style={{fontFamily:mono}}>风险结论 + 证据编号 + 行动建议</Text>
    <S>
      <Path d="M920 266H1438V590H920ZM1179 590V714M1088 714H1270M920 551H1438" p={progress(frame,-10,25)}/>
      <Path d="M1037 384H1307M1037 428H1243" opacity={0.32}/>
      <Path d="M867 800H1767M988 751H1387L1420 782H965ZM1481 752C1481 719 1529 719 1529 752V777H1481Z" opacity={0.7}/>
      <Path d="M1655 370C1610 370 1584 410 1592 450C1598 485 1620 506 1652 506C1684 506 1705 484 1706 450C1708 410 1699 370 1655 370ZM1652 506C1579 524 1540 578 1540 646L1565 704M1686 524C1748 550 1770 606 1775 714V846" p={progress(frame,-8,25)}/>
      <g transform={`translate(${p*52} ${p*24})`}>
        <Path d="M1628 667C1589 665 1559 681 1538 702L1510 728C1502 738 1507 747 1521 744L1550 727C1557 735 1551 748 1537 758C1523 768 1530 779 1550 770L1610 744C1650 733 1676 721 1693 699"/>
      </g>
      <Path d="M1620 832H1772" opacity={0.3}/>
    </S>
    <Text x={1179} y={856} size={25} color={MUTED} align="center" style={{whiteSpace:'nowrap'}}>不碰账户，不代替用户操作</Text>
  </>;
}

function Replay({frame,src}:{frame:number;src:string}) {
  return <>
    <Eyebrow>可追溯 · 真实界面</Eyebrow>
    <Text x={180} y={286} size={91} weight={500}>每步留痕。<br/><TextBlue>随时回放。</TextBlue></Text>
    <AccentLine frame={frame} y={621}/>
    <Text x={180} y={676} size={30} color={MUTED}>每步留痕，可回放</Text>
    <div style={{transform:`scale(${1+0.006*progress(frame,0,99)})`,transformOrigin:'1300px 520px'}}>
      <Screenshot src={src} x={800} y={155} width={990} height={730} label="原始截图 · 保留原始按钮与 5/5 进度"/>
    </div>
  </>;
}

function EndCard({frame}:{frame:number}) {
  // Assemble the brand and public-interest mission, then hold the final 1.84s still.
  const f=Math.min(frame,100);
  return <>
    <Text x={960} y={175} size={43} align="center" style={{whiteSpace:'nowrap'}}>转账前保镖</Text>
    <Rise frame={f} delay={11} distance={24}><Text x={960} y={320} size={106} weight={500} align="center" style={{whiteSpace:'nowrap'}}>把最后一道关，</Text></Rise>
    <Rise frame={f} delay={27} distance={24}><Text x={960} y={470} size={118} weight={500} align="center" style={{whiteSpace:'nowrap'}}>从运气变成<TextBlue>流程。</TextBlue></Text></Rise>
    <S><Path d="M884 687H1036" color={BLUE} p={progress(f,35,30)}/></S>
    <Rise frame={f} delay={52} distance={15}><Text x={960} y={751} size={29} align="center" color="#A4A4AC" style={{whiteSpace:'nowrap'}}>七角色会商建议 + rule_gate规则核验 + 人工确认</Text></Rise>
    <Rise frame={f} delay={74} distance={18}><Text x={960} y={856} size={35} align="center" style={{whiteSpace:'nowrap'}}>致力于打造造福人民的反诈产品。</Text></Rise>
  </>;

}

export const Film: React.FC<{assets:FilmAssets}> = ({assets}) => {
  const f=useCurrentFrame();
  const transition=Math.round(.36*FPS);
  const scene=(kind:string,local:number,variant=0)=>{
    switch(kind){
      case 'phone':return <Phone frame={local} close={false}/>;
      case 'scenario':return <Scenario frame={local} variant={variant}/>;
      case 'case-bars':return <CaseBarChart frame={f*MOTION_FPS/FPS}/>;
      case 'incoming':return <Incoming frame={local}/>;
      case 'masks':return <Masks frame={local}/>;
      case 'pressure':return <Pressure frame={local}/>;
      case 'brink':return <Brink frame={local}/>;
      case 'pivot':return <Pivot frame={local}/>;
      case 'title':return <TitleCard frame={local}/>;
      case 'intake':return <UseCases frame={local}/>;
      case 'live':return <Live frame={local} src={assets.live} detail={false}/>;
      case 'relay':return <Relay frame={local}/>;
      case 'council':return <Council frame={local}/>;
      case 'advice':return <RiskOutput frame={local}/>;
      case 'gate':return <Gate frame={local}/>;
      case 'proof':return <Proof frame={local}/>;
      case 'gate-result':return <GateResult src={assets.gate}/>;
      case 'boundary':return <EvidenceCheck frame={local}/>;
      case 'human':return <Human frame={local}/>;
      case 'actions':return <Actions frame={local}/>;
      case 'replay':return <Replay frame={local} src={assets.replay}/>;
      case 'results':return <Results frame={local}/>;
      case 'product-impact':return <ProductImpact frame={local}/>;
      case 'local':return <Local frame={local*1.2}/>;
      case 'journey':return <Journey frame={local*1.5}/>;
      default:return <EndCard frame={local}/>;
    }
  };
  return <AbsoluteFill style={{background:'#000',fontFamily:font,color:WHITE,overflow:'hidden',opacity:tween(f,0,Math.round(.65*FPS))}}>
    <Audio src={assets.sound} volume={1}/>
    <AbsoluteFill>{SHOTS.map((s,i)=>{
      if(s.kind==='flow')return null;
      const impact=s.kind==='pivot'||s.kind==='end'||s.kind==='case-bars'||s.kind==='results';
      const nextImpact=SHOTS[i+1]?.kind==='pivot'||SHOTS[i+1]?.kind==='end'||SHOTS[i+1]?.kind==='case-bars'||SHOTS[i+1]?.kind==='results';
      const enter=i===0||impact?1:tween(f,s.start,transition);
      const leave=tween(f,s.end,transition);
      const end=s.end+(nextImpact||i===SHOTS.length-1?0:transition);
      return <Sequence key={s.name} name={`${s.name} ${s.title}`} from={s.start} durationInFrames={end-s.start} premountFor={transition}>
        <AbsoluteFill style={{background:'#000',opacity:enter,transform:impact?'none':`translateX(${24*(1-enter)-16*leave}px)`}}>
          {scene(s.kind,(f-s.start)*MOTION_FPS/FPS)}
        </AbsoluteFill>
      </Sequence>;
    })}<Sequence from={Math.round(STORY_START*FPS)} durationInFrames={SHOTS.at(-1)!.start-Math.round(STORY_START*FPS)} name="连续案卷与评测叙事"><ContinuousStory seconds={f/FPS}/></Sequence></AbsoluteFill>
    <CreativeTransitions frame={f}/>
  </AbsoluteFill>;
};
