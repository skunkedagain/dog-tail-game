import { createHmac } from 'node:crypto';

type Environment = { SUPABASE_URL?:string; SUPABASE_SECRET_KEY?:string; SUPABASE_SERVICE_ROLE_KEY?:string; VERCEL?:string };
type Score = { name:string; score:number; catches:number; duration:number; reason:'time'|'health'|'anger'; input:'touch'|'keyboard' };
export class ApiError extends Error { constructor(readonly status:number,message:string){super(message);} }

export function validateScore(value:unknown):Score {
  if(!value||typeof value!=='object')throw new ApiError(400,'Invalid score.');
  const s=value as Record<string,unknown>;
  const name=typeof s.name==='string'?s.name.normalize('NFKC').trim().replace(/\s+/g,' '):'';
  if(!/^[\p{L}\p{N} _.'-]{2,20}$/u.test(name))throw new ApiError(400,'Use 2–20 letters, numbers, spaces, or simple punctuation for your name.');
  if(!Number.isInteger(s.score)||!Number.isInteger(s.catches)||typeof s.duration!=='number'||!Number.isFinite(s.duration))throw new ApiError(400,'Invalid score.');
  const score=s.score as number,catches=s.catches as number,duration=s.duration;
  if(duration<0||duration>180||catches<0||catches>Math.floor(duration/2.5)+1||score<0||score>catches*300+475||score<catches*100)throw new ApiError(400,'This score is outside the round limits.');
  if(!['time','health','anger'].includes(String(s.reason))||!['touch','keyboard'].includes(String(s.input)))throw new ApiError(400,'Invalid round.');
  if(s.reason==='time'&&duration<179.9)throw new ApiError(400,'The round has not finished.');
  if(s.reason!=='time'&&score>catches*300)throw new ApiError(400,'Invalid finish bonus.');
  return {name,score,catches,duration,reason:s.reason as Score['reason'],input:s.input as Score['input']};
}

const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleLeaderboard(request:Request,env:Environment=process.env,send:typeof fetch=fetch):Promise<Response> {
  try {
    if(!['GET','POST'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
    const key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
    if(!env.SUPABASE_URL||!key)throw new ApiError(503,'Online scores are unavailable. Your personal best is still saved on this device.');
    const base=new URL(env.SUPABASE_URL);
    if(base.protocol!=='https:'&&base.hostname!=='127.0.0.1'&&base.hostname!=='localhost')throw new ApiError(503,'Online scores are unavailable.');
    const rpc=async(name:string,body:object)=>{
      const headers:Record<string,string>={apikey:key,'Content-Type':'application/json'};
      // New secret keys use apikey alone. Legacy service_role JWTs also use Authorization.
      if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
      const response=await send(new URL(`/rest/v1/rpc/${name}`,base),{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
      if(!response.ok){
        const error=await response.json().catch(()=>({}));
        const known:Record<string,[number,string]>={rate_limit:[429,'Too many new rounds. Try online scores again in a few minutes.'],invalid_run:[400,'This round is no longer eligible for online scores.'],round_too_short:[400,'The round could not be verified.'],invalid_score:[400,'Invalid score.']};
        const match=known[error.message];
        if(match)throw new ApiError(...match);
        throw new ApiError(503,'Online scores are temporarily unavailable. Please try again.');
      }
      return response.json();
    };
    if(request.method==='GET')return json({scores:await rpc('dog_tail_leaderboard',{})});
    const origin=request.headers.get('origin');
    if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'Please submit from the game.');
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'Expected JSON.');
    // Bound the stream too, rather than trusting Content-Length.
    const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'Missing request.');
    let text='',size=0;const decoder=new TextDecoder();
    while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>4096){await reader.cancel();throw new ApiError(413,'Request too large.');}text+=decoder.decode(chunk.value,{stream:true});}
    let body:Record<string,unknown>;try{body=JSON.parse(text+decoder.decode());}catch{throw new ApiError(400,'Invalid JSON.');}
    if(!body||typeof body!=='object')throw new ApiError(400,'Invalid request.');
    if(body.action==='start'){
      // Vercel sets this header; arbitrary client IP headers are never trusted.
      const ip=env.VERCEL?request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim(): 'local-development';
      if(!ip)throw new ApiError(503,'Online scores are temporarily unavailable.');
      const fingerprint=createHmac('sha256',key).update(`dog-tail:${ip}`).digest('hex');
      return json({runId:await rpc('dog_tail_start_run',{p_fingerprint:fingerprint})});
    }
    if(body.action==='submit'){
      if(typeof body.runId!=='string'||!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(body.runId))throw new ApiError(400,'Invalid round.');
      const s=validateScore(body);
      const id=await rpc('dog_tail_submit_score',{p_run_id:body.runId,p_name:s.name,p_score:s.score,p_catches:s.catches,p_duration:s.duration,p_reason:s.reason,p_input:s.input});
      return json({id});
    }
    throw new ApiError(400,'Unknown action.');
  }catch(error){return json({error:error instanceof ApiError?error.message:'Online scores are temporarily unavailable. Please try again.'},error instanceof ApiError?error.status:503);}
}
