import script from './script.json';
import captions from './captions.json';
export const FPS = 45;
export const DURATION = 60 * FPS;
// Storyboard motion uses a stable time base; 45fps samples every curve directly.
export const MOTION_FPS = 25;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BLUE = '#2B5CE6';
export const WHITE = '#F4F4F5';
export const MUTED = '#96969E';
export const RED = '#D95858';
export const STROKE = 2.5;
export const ROLES = ['特征官', '证据官', '反方官', '风险官', '合规官', '用户保护官', '审判官'];
export const ROLE_NOTES = ['识别催促与冒充','核对已有证据','提出反方意见','评估风险等级','核实条款依据','给出行动清单','汇总建议卷宗'];
export const SHOTS = [
  {name:'镜01',title:'转账前，先停一下',start:0,end:50,kind:'phone'},
  {name:'镜02',title:'客服催核验',start:50,end:100,kind:'scenario',variant:0},
  {name:'镜03',title:'返利要补款',start:100,end:150,kind:'scenario',variant:1},
  {name:'镜04',title:'熟人换号借钱',start:150,end:200,kind:'scenario',variant:2},
  {name:'镜05',title:'保镖登场',start:200,end:225,kind:'title'},
  {name:'镜06',title:'提交材料',start:225,end:300,kind:'intake'},
  {name:'镜07',title:'真实工具',start:300,end:350,kind:'live'},
  {name:'镜08',title:'会商接力',start:350,end:450,kind:'relay'},
  {name:'镜09',title:'七角色会商',start:450,end:550,kind:'council'},
  {name:'镜10',title:'把建议变成下一步',start:550,end:600,kind:'advice'},
  {name:'镜11',title:'确定性规则卡口',start:600,end:700,kind:'gate'},
  {name:'镜12',title:'每一条引用，都要有据',start:700,end:775,kind:'proof'},
  {name:'镜13',title:'真实规则结果',start:775,end:825,kind:'gate-result'},
  {name:'镜14',title:'规则与人工各守一关',start:825,end:900,kind:'boundary'},
  {name:'镜15',title:'最终由你确认',start:900,end:975,kind:'human'},
  {name:'镜16',title:'本机部署与留痕',start:975,end:1050,kind:'local'},
  {name:'镜17',title:'可执行的核验清单',start:1050,end:1150,kind:'actions'},
  {name:'镜18',title:'真实回放记录',start:1150,end:1200,kind:'replay'},
  {name:'镜19',title:'把核验变成流程',start:1200,end:1350,kind:'journey'},
  {name:'镜20',title:'从运气变成流程',start:1350,end:1500,kind:'end'},
].map(s=>({...s,start:Math.round(s.start*FPS/MOTION_FPS),end:Math.round(s.end*FPS/MOTION_FPS)}));
export const BEATS = [
  {start:0,end:200,label:'三种使用场景'},
  {start:200,end:350,label:'怎么开始使用'},
  {start:350,end:600,label:'七角色如何会商'},
  {start:600,end:900,label:'为什么需要规则'},
  {start:900,end:1200,label:'建议如何落地'},
  {start:1200,end:1500,label:'把核验变成流程'},
].map(s=>({...s,start:Math.round(s.start*FPS/MOTION_FPS),end:Math.round(s.end*FPS/MOTION_FPS)}));
export const NARRATION = script;
export const CAPTIONS = captions.map(c=>({...c,start:Math.round(c.start*FPS/MOTION_FPS),end:Math.round(c.end*FPS/MOTION_FPS)}));
export type FilmAssets = {live:string;gate:string;replay:string;sound:string};
export const shotAt = (frame:number)=>SHOTS.findIndex(s=>frame>=s.start&&frame<s.end);
export const ease = (v:number)=>{const t=Math.min(1,Math.max(0,v));return t*t*t*(t*(t*6-15)+10);};
export const progress = (frame:number,start:number,duration:number)=>ease((frame-start)/duration);
