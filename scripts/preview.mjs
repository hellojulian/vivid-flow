import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('site');
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.mp4':'video/mp4','.webm':'video/webm'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');let local=decodeURIComponent(url.pathname);
 if(local==='/'){res.writeHead(302,{Location:'/vivid-flow/'});res.end();return;}
 if(local.startsWith('/vivid-flow/'))local=local.slice('/vivid-flow/'.length);else{res.writeHead(404);res.end('Not found');return;}
 const file=path.resolve(root,local||'index.html');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);
}).listen(3320,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:3320/vivid-flow/'));
