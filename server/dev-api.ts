import type { Plugin, ViteDevServer } from 'vite';
import { Readable } from 'node:stream';
import { handleLeaderboard } from './leaderboard';

export function leaderboardApi(env:Record<string,string>):Plugin {
  const attach=(server:Pick<ViteDevServer,'middlewares'>)=>{
    server.middlewares.use('/api/leaderboard',(req,res)=>{
      const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
      const init:RequestInit&{duplex?:'half'}={method:req.method,headers};
      if(req.method!=='GET'&&req.method!=='HEAD'){init.body=Readable.toWeb(req) as ReadableStream<Uint8Array>;init.duplex='half';}
      const request=new Request(`http://${req.headers.host||'localhost:5173'}/api/leaderboard`,init);
      void handleLeaderboard(request,env).then(async response=>{res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));res.end(await response.text());}).catch(()=>{res.statusCode=503;res.end('{"error":"Online scores are unavailable."}');});
    });
  };
  return {name:'dog-tail-local-api',configureServer:attach,configurePreviewServer:attach};
}
