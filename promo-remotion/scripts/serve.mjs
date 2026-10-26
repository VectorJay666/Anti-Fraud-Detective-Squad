import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../delivery');
const port=Number(process.env.PROMO_PORT||4176);
const types={'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.png':'image/png'};
createServer(async(req,res)=>{
  try{
    const requestUrl=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(requestUrl.pathname);
    const name=pathname==='/'?'转账前保镖-90秒动画预览.html':pathname.replace(/^\//,'');
    const target=path.resolve(root,name);
    if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(target);
    const headers={'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'};
    if(requestUrl.searchParams.get('download')==='1')headers['Content-Disposition']="attachment; filename*=UTF-8''"+encodeURIComponent(name);
    res.writeHead(200,headers);res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Animation preview: http://127.0.0.1:${port}`));
