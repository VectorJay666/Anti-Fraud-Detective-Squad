import script from './script.json';
export const FPS = 45;
export const DURATION = 90 * FPS;
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
// Cut points are measured from the reference track at original music playback speed.
// Frames remain the source of truth; no floating point boundaries in Remotion.
const cut = (seconds:number)=>Math.round(seconds*FPS);
export const MUSIC_OFFSET_FRAMES = 0;
export const PIVOT_FRAME = 18*FPS;
export const SHOTS = [
  {name:'镜01',title:'长期骗局的一个受骗个例',start:0,end:2.4,kind:'case-bars'},
  {name:'镜02',title:'人物头像快速缩为一个点',start:2.4,end:3.5,kind:'case-bars'},
  {name:'镜03',title:'镜头拉远，露出年度柱子',start:3.5,end:6.311,kind:'case-bars'},
  {name:'镜04',title:'头像逐步构成统计柱',start:6.311,end:8.444,kind:'case-bars'},
  {name:'镜05',title:'三年损失，一年比一年高',start:8.444,end:12.711,kind:'case-bars'},
  {name:'镜06',title:'长期布局，分次诱导',start:12.711,end:16.956,kind:'case-bars'},
  {name:'镜07',title:'转账前，更需要核验',start:16.956,end:18,kind:'case-bars'},
  {name:'镜08',title:'但在转账前，还有核验这一步',start:18,end:20.133,kind:'pivot'},
  {name:'镜09',title:'转账前保镖',start:20.133,end:22.267,kind:'title'},
  {name:'镜10',title:'三种话术轮转进入核验',start:22.272,end:28.65,kind:'flow'},
  {name:'镜11',title:'话术线索逐条落卷',start:28.65,end:32.902,kind:'flow'},
  {name:'镜12',title:'七角色连续交叉核验',start:32.902,end:41.406,kind:'flow'},
  {name:'镜13',title:'真实引用通过，编造引用打回',start:41.406,end:47.784,kind:'flow'},
  {name:'镜14',title:'三档结论流向本人确认',start:47.784,end:54.162,kind:'flow'},
  {name:'镜15',title:'案卷展开为四条行动建议',start:54.162,end:60.54,kind:'flow'},
  {name:'镜16',title:'84个样本从案卷中展开',start:60.54,end:64.792,kind:'flow'},
  {name:'镜17',title:'66名指认与18名转人工分流',start:64.792,end:71.17,kind:'flow'},
  {name:'镜18',title:'新旧管线：违规指认36降至0',start:71.17,end:77.548,kind:'flow'},
  {name:'镜19',title:'24次无关引用连续打回',start:77.548,end:83.926,kind:'flow'},
  {name:'镜20',title:'从运气变成流程',start:83.926,end:90,kind:'end'},
].map(s=>({...s,start:cut(s.start),end:cut(s.end)}));
export const BEATS = [
  {start:0,end:18,label:'多类骗局与年度损失'},
  {start:18,end:22.272,label:'转账前，还有核验'},
  {start:22.272,end:41.406,label:'材料与七角色会商'},
  {start:41.406,end:60.54,label:'规则核验与行动建议'},
  {start:60.54,end:77.548,label:'样本分流与管线提升'},
  {start:77.548,end:90,label:'注入测试与公益目标'},
].map(s=>({...s,start:cut(s.start),end:cut(s.end)}));
// Original narration is retained as a copy archive. The film has no voice or subtitle layer.
export const NARRATION = script;
export const CAPTIONS: {start:number;end:number;text:string}[] = [];
export type FilmAssets = {live:string;gate:string;replay:string;sound:string};
export const shotAt = (frame:number)=>SHOTS.findIndex(s=>frame>=s.start&&frame<s.end);
export const ease = (v:number)=>{const t=Math.min(1,Math.max(0,v));return t*t*t*(t*(t*6-15)+10);};
export const progress = (frame:number,start:number,duration:number)=>ease((frame-start)/duration);
