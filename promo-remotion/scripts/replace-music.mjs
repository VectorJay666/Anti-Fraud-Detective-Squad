import {copyFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const video='delivery/转账前保镖-90秒-45fps.mp4';
const temp='.cache/film-with-custom-score.mp4';
const bin='node_modules/@remotion/compositor-win32-x64-msvc/';
await mkdir('.cache',{recursive:true});
// Stream-copy the existing 4050 frames; replace the audio stream completely.
execFileSync(bin+'ffmpeg.exe',['-y','-hide_banner','-loglevel','error','-i',video,'-i','public/assets/soundtrack.m4a','-map','0:v:0','-map','1:a:0','-c','copy','-t','90','-movflags','+faststart',temp],{stdio:'inherit'});
const info=JSON.parse(execFileSync(bin+'ffprobe.exe',['-v','error','-show_entries','stream=codec_type,r_frame_rate,nb_frames,duration,channels','-of','json',temp],{encoding:'utf8'}));
assert.equal(info.streams.length,2);
const picture=info.streams.find(s=>s.codec_type==='video');
assert.equal(picture.r_frame_rate,'45/1');assert.equal(Number(picture.nb_frames),4050);assert.equal(Number(picture.duration),90);
assert.equal(info.streams.find(s=>s.codec_type==='audio').channels,2);
const packetHashes=(file,stream)=>JSON.parse(execFileSync(bin+'ffprobe.exe',['-v','error','-select_streams',stream,'-show_packets','-show_data_hash','sha256','-show_entries','packet=data_hash','-of','json',file],{encoding:'utf8',maxBuffer:8*1024*1024})).packets.map(p=>p.data_hash);
assert.deepEqual(packetHashes(video,'v:0'),packetHashes(temp,'v:0'));
assert.deepEqual(packetHashes('public/assets/soundtrack.m4a','a:0'),packetHashes(temp,'a:0'));
await copyFile(temp,video);
console.log('Music replaced: 4050 video frames preserved byte-for-byte; audio packets match the reference excerpt.');
