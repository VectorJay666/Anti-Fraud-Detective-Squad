import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets={};
for(const [key,name,mime] of [['live','project_live.png','image/png'],['gate','project_gate_crop.png','image/png'],['replay','project_replay.png','image/png'],['sound','soundtrack.m4a','audio/mp4']]){
  assets[key]=`data:${mime};base64,${(await readFile(path.join(root,'public/assets',name))).toString('base64')}`;
}
const result=await build({entryPoints:[path.join(root,'src/Preview.tsx')],bundle:true,write:false,outdir:path.join(root,'.cache/bundle'),format:'iife',minify:true,define:{'process.env.NODE_ENV':'"production"'},target:'chrome100',legalComments:'none'});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
const html=`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="转账前保镖：把最后一道关，从运气变成流程。60秒产品宣传动画。"><title>转账前保镖 · 60秒产品短片</title><style>${css}</style></head><body><div id="root"></div><script>window.__FILM_ASSETS__=${JSON.stringify(assets)};<\/script><script>${js}<\/script></body></html>`;
await mkdir(path.join(root,'delivery'),{recursive:true});
await writeFile(path.join(root,'delivery/转账前保镖-60秒动画预览.html'),html.replace(/[ \t]+$/gm,''),'utf8');
console.log(`Built offline HTML: ${(Buffer.byteLength(html)/1048576).toFixed(2)} MB; all PNGs and audio embedded.`);
