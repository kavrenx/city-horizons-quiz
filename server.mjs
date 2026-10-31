import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const argument = name => { const index=process.argv.indexOf(name); return index<0?undefined:process.argv[index+1]; };
const port = Number(argument('--port') || process.env.PORT || 4173);
const host = argument('--host') || process.env.HOST || '127.0.0.1';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
createServer(async (req,res) => {
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
  try {
    const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const filename = resolve(root, '.'+(path==='/'?'/index.html':path));
    if(!filename.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
    const info = await stat(filename);
    if(!info.isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Length':info.size});
    res.end(req.method==='HEAD'?undefined:await readFile(filename));
  } catch {res.writeHead(404).end('Not found');}
}).listen(port,host,()=>console.log(`City quiz: http://127.0.0.1:${port}\nListening on ${host}:${port}`));
