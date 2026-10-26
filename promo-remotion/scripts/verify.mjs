import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const {outputFiles}=await build({entryPoints:['src/timeline.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {SHOTS,BEATS,NARRATION,CAPTIONS,ROLES,DURATION,FPS,STROKE}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
assert.equal(DURATION,2700);assert.equal(FPS,45);assert.equal(STROKE,2.5);
assert.equal(SHOTS.length,20);assert.equal(SHOTS[0].start,0);assert.equal(SHOTS.at(-1).end,2700);
SHOTS.forEach((s,i)=>{assert(Number.isInteger(s.start)&&Number.isInteger(s.end));assert(s.end>s.start);if(i)assert.equal(s.start,SHOTS[i-1].end);});
assert.deepEqual(BEATS.map(n=>n.start/FPS).concat(60),[0,8,14,24,36,48,60]);
assert.deepEqual(NARRATION.filter(n=>n.original).map(n=>n.text),['转账前，先别急。','先让保镖看一眼。','七个AI角色会商，只给建议，不越权拍板。','编造的证据，过不了确定性规则卡口。','人工确认，每步留痕，可回放。全部本机部署。','转账前保镖：把最后一道关，从运气变成流程。']);
assert.deepEqual(ROLES,['特征官','证据官','反方官','风险官','合规官','用户保护官','审判官']);
for(const n of NARRATION){assert.equal(CAPTIONS.filter(c=>c.copyId===n.id).map(c=>c.text).join(''),n.text);}
CAPTIONS.forEach((c,i)=>{assert(c.start<c.end);assert(c.text.length<=14);if(i)assert(c.start>=CAPTIONS[i-1].end);});
assert.equal(SHOTS.filter(s=>['live','gate-result','replay'].includes(s.kind)).reduce((n,s)=>n+s.end-s.start,0),6*FPS);
const hash=b=>createHash('sha256').update(b).digest('hex');
const provenance=JSON.parse(await readFile('public/assets/provenance.json','utf8'));
for(const f of ['project_live.png','project_gate_crop.png','project_replay.png']){
  const copy=await readFile(`public/assets/${f}`);
  assert.equal(hash(copy),provenance[f].sha256);console.log(`Original PNG intact: ${f} ${hash(copy).slice(0,12)}`);
}
const report=JSON.parse(await readFile('public/assets/audio-report.json','utf8'));
assert.equal(report.voice_tracks,0);assert.equal(report.type,'instrumental_music_only');assert.equal(report.seconds,60);assert.equal(report.channels,2);
const cues=JSON.parse(await readFile('src/music-cues.json','utf8'));
assert.equal(report.cue_count,cues.length);assert.equal(report.video_fps,FPS);
for(const cue of cues){const shot=SHOTS.find(s=>s.name===cue.scene);assert(shot);assert(cue.time>=shot.start/FPS&&cue.time<shot.end/FPS);}
for(const event of report.note_events){assert.equal(event.frame,Math.round(event.time*FPS));}
assert(report.note_events.some(e=>e.kind==='low_gate_closure'&&Math.abs(e.time-25.6)<1/FPS));
assert(report.note_events.every(e=>e.time<54));
const roleHits=report.note_events.filter(e=>e.kind==='soft_key'&&e.time>=18&&e.time<21);
assert.equal(roleHits.length,7);
[18,18.2,18.68,19.16,19.64,20.12,20.6].forEach((time,i)=>assert(Math.abs(roleHits[i].time-time)<=.5/FPS+.000001));
const media=JSON.parse(execFileSync('node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe',['-v','error','-show_entries','stream=codec_name,sample_rate,channels:format=duration','-of','json','public/assets/soundtrack.m4a'],{encoding:'utf8'}));
assert.equal(media.streams[0].channels,2);assert.equal(media.streams[0].sample_rate,'48000');assert(Math.abs(Number(media.format.duration)-60)<.03);
console.log('PASS: 2700 frames, 45fps, 20 shots, original copy, original PNGs, captions, 60s stereo score and 34 picture cues.');
