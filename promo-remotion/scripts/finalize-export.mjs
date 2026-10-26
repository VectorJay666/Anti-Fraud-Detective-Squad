import {copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';

const target='delivery/转账前保镖-60秒-45fps.mp4';
if(process.argv[2]&&path.resolve(process.argv[2])!==path.resolve(target))await copyFile(process.argv[2],target);
await import('./replace-music.mjs');
const probe=JSON.parse(execFileSync('node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe',
 ['-v','error','-show_entries','stream=codec_type,width,height,r_frame_rate,nb_frames,duration,channels,sample_rate','-of','json',target],{encoding:'utf8'}));
assert.equal(probe.streams.length,2);
const video=probe.streams.find(s=>s.codec_type==='video');
const audio=probe.streams.find(s=>s.codec_type==='audio');
assert.equal(video.width,1920);assert.equal(video.height,1080);
assert.equal(video.r_frame_rate,'45/1');assert.equal(Number(video.nb_frames),2700);
assert.equal(Number(video.duration),60);assert.equal(Number(audio.duration),60);
assert.equal(audio.channels,2);assert.equal(audio.sample_rate,'48000');
const bytes=await readFile(target);
await writeFile('delivery/export-manifest.json',JSON.stringify({
 style:'ppt-evidence-original-speed-v2',file:path.basename(target),sha256:createHash('sha256').update(bytes).digest('hex'),
 bytes:bytes.length,width:1920,height:1080,fps:45,frames:2700,seconds:60,
 pivot:'但在转账前，还有核验这一步',pivotFrame:810,music:'千年之后',
},null,2)+'\n');
await import('./build.mjs');
console.log('PASS: final video verified; matching MP4 download enabled in the offline HTML.');
