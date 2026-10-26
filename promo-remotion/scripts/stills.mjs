import {bundle} from '@remotion/bundler';
import {openBrowser,renderStill,selectComposition} from '@remotion/renderer';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
await mkdir('delivery/stills',{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/index.tsx'),publicDir:path.resolve('public')});
const browser=await openBrowser('chrome');
try{
  const composition=await selectComposition({serveUrl,id:'TransferGuardian',puppeteerInstance:browser});
  const frames=[32,84,134,184,214,280,330,430,532,580,681,762,810,881,953,1035,1132,1180,1322,1350].map(f=>Math.round(f*composition.fps/25)).concat(composition.durationInFrames-1);
  for(let i=0;i<frames.length;i++){
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame:frames[i],output:`delivery/stills/${String(i+1).padStart(2,'0')}-${frames[i]}.png`,imageFormat:'png',logLevel:'error'});
    console.log(`Still ${i+1}/${frames.length}: ${frames[i]}`);
  }
  assert.deepEqual(await readFile(`delivery/stills/20-${54*composition.fps}.png`),await readFile(`delivery/stills/21-${composition.durationInFrames-1}.png`));
  console.log('PASS: first and last frames of final 6s card are byte-identical PNGs.');
  const transitions=[94,99,100,106,294,299,300,306,544,549,550,556,769,774,775,781,1344,1349,1350,1356].map(f=>Math.round(f*composition.fps/25));
  for(const frame of transitions){
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:`delivery/stills/transition-${frame}.png`,imageFormat:'png',logLevel:'error'});
  }
  console.log('Saved 20 transition checkpoints.');
}finally{await browser.close({silent:true});}
