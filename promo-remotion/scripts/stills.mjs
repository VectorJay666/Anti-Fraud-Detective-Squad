import {bundle} from '@remotion/bundler';
import {openBrowser,renderStill,selectComposition} from '@remotion/renderer';
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const {outputFiles}=await build({entryPoints:['src/timeline.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {SHOTS,FPS,PIVOT_FRAME,DURATION}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
await mkdir('delivery/stills',{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/index.tsx'),publicDir:path.resolve('public')});
const browser=await openBrowser('chrome');
try{
  const composition=await selectComposition({serveUrl,id:'TransferGuardian',puppeteerInstance:browser});
  const shots=[];
  for(let i=0;i<SHOTS.length;i++){
    const s=SHOTS[i];
    const frame=s.kind==='pivot'?PIVOT_FRAME+10:s.kind==='end'?89*FPS:Math.min(s.end-1,s.start+Math.round((s.end-s.start)*.8));
    const file=`stills/music-${String(i+1).padStart(2,'0')}-${frame}.png`;
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:`delivery/${file}`,imageFormat:'png',logLevel:'error'});
    shots.push({file,frame,label:`${s.name} / ${(frame/FPS).toFixed(2)}s / ${s.title}`});
    console.log(`Still ${i+1}/${SHOTS.length}: ${frame}`);
  }
  const last='stills/music-tail-4049.png';
  await renderStill({serveUrl,composition,puppeteerInstance:browser,frame:DURATION-1,output:`delivery/${last}`,imageFormat:'png',logLevel:'error'});
  assert.deepEqual(await readFile(`delivery/${shots.at(-1).file}`),await readFile(`delivery/${last}`));
  console.log('PASS: final brand card is byte-identical at its first and last frames.');
  const cuts=[0,45,180,380,572,740,809,810,822,906,1002,1288,1481,1863,2150,2438,2724,2916,3203,3490,3776,3915,4005,4049,...SHOTS.filter(s=>s.kind==='flow').flatMap(s=>[s.start-1,s.start+12])];
  const transitions=[];
  for(const frame of [...new Set(cuts)].sort((a,b)=>a-b)){
    const file=`stills/music-transition-${frame}.png`;
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:`delivery/${file}`,imageFormat:'png',logLevel:'error'});
    transitions.push({file,frame,label:`${frame}f / ${(frame/FPS).toFixed(3)}s`});
  }
  await writeFile('delivery/stills/manifest.json',JSON.stringify({shots,transitions},null,2));
  console.log('Saved exact 18s pivot and phrase transition checkpoints.');
}finally{await browser.close({silent:true});}
