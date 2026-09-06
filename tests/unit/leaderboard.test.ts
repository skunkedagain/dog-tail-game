import { beforeAll,afterAll,beforeEach,it,expect,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { handleLeaderboard,validateScore } from '../../server/leaderboard';

let db:PGlite;
beforeAll(async()=>{
  db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('../../supabase/migrations/202609060001_high_scores.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{await db.exec('reset role; truncate public.dog_tail_runs,public.dog_tail_scores;');});
const fingerprint='a'.repeat(64);
async function run(){const r=await db.query<{id:string}>('select public.dog_tail_start_run($1) as id',[fingerprint]);return r.rows[0].id;}
const submit=(id:string,score=120,duration=10)=>db.query<{id:string}>("select public.dog_tail_submit_score($1,'Little Legs',$2,1,$3,'health','touch') as id",[id,score,duration]);

it('installs the migration and keeps tables and RPCs private to the server',async()=>{
  for(const role of ['anon','authenticated']){
    await db.exec(`set role ${role}`);
    await expect(db.query('select * from public.dog_tail_scores')).rejects.toThrow(/permission denied/);
    await expect(db.query('select public.dog_tail_start_run($1)',[fingerprint])).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from public.dog_tail_leaderboard()')).rejects.toThrow(/permission denied/);
    await db.exec('reset role');
  }
  await db.exec('set role service_role');expect(await run()).toMatch(/^[a-f0-9-]{36}$/);
});
it('validates elapsed time, makes submission retries idempotent, and exposes only public fields',async()=>{
  const id=await run();await expect(submit(id)).rejects.toThrow('round_too_short');
  await db.query("update public.dog_tail_runs set started_at=now()-interval '12 seconds' where id=$1",[id]);
  const first=await submit(id),retry=await submit(id,200);expect(retry.rows[0].id).toBe(first.rows[0].id);
  const scores=await db.query('select * from public.dog_tail_leaderboard()');expect(scores.rows).toEqual([{id:first.rows[0].id,player_name:'Little Legs',score:120,catches:1,input_mode:'touch'}]);
});
it('rejects expired tokens and applies a persistent round-start rate limit',async()=>{
  const id=await run();await db.query("update public.dog_tail_runs set started_at=now()-interval '25 hours' where id=$1",[id]);await expect(submit(id)).rejects.toThrow('invalid_run');
  for(let i=0;i<20;i++)await run();await expect(run()).rejects.toThrow('rate_limit');
});
it('rejects impossible scores in both the API and database',async()=>{
  const score={name:'  Little   Legs ',score:120,catches:1,duration:10,reason:'health',input:'touch'};
  expect(validateScore(score).name).toBe('Little Legs');
  for(const patch of [{score:999999},{score:-1},{duration:NaN},{catches:30},{name:'<script>alert(1)</script>'},{reason:'time'}])expect(()=>validateScore({...score,...patch})).toThrow();
  const id=await run();await db.query("update public.dog_tail_runs set started_at=now()-interval '12 seconds' where id=$1",[id]);await expect(submit(id,9999)).rejects.toThrow('invalid_score');
});

const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_test-only',VERCEL:'1'};
const request=(body:unknown,headers:Record<string,string>={})=>new Request('https://game.example/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json','x-vercel-forwarded-for':'203.0.113.5',...headers},body:JSON.stringify(body)});
it('uses the server key only upstream, hashes the network address, and fails safely without configuration',async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json('baf96e52-d9ad-4cbb-a4ce-45bd48f6e373'));
  const response=await handleLeaderboard(request({action:'start'}),env,fetcher);
  expect(response.status).toBe(200);const output=await response.text();expect(output).not.toContain(env.SUPABASE_SECRET_KEY);
  const [,options]=fetcher.mock.calls[0];expect(options.headers).toMatchObject({apikey:env.SUPABASE_SECRET_KEY});expect(options.headers.Authorization).toBeUndefined();expect(options.body).not.toContain('203.0.113.5');expect(JSON.parse(options.body).p_fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect((await handleLeaderboard(request({action:'start'}),{},fetcher)).status).toBe(503);
});
it('rejects cross-site posts and oversized payloads before contacting Supabase',async()=>{
  const fetcher=vi.fn();expect((await handleLeaderboard(request({action:'start'},{origin:'https://other.example'}),env,fetcher)).status).toBe(403);
  expect((await handleLeaderboard(request({action:'submit',name:'x'.repeat(5000)}),env,fetcher)).status).toBe(413);expect(fetcher).not.toHaveBeenCalled();
});
it('returns a helpful retry error without leaking upstream database details',async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json({message:'secret table details'},{status:500}));
  const response=await handleLeaderboard(request({action:'start'}),env,fetcher);expect(response.status).toBe(503);expect(await response.text()).not.toContain('secret table details');
});
it('connects the API start, submit, retry and leaderboard flows to the actual SQL functions',async()=>{
  const transport:typeof fetch=async(url,options)=>{
    const name=new URL(String(url)).pathname.split('/').at(-1)!,args=JSON.parse(String(options?.body));
    const names=Object.keys(args),placeholders=names.map((key,i)=>`${key} => $${i+1}`).join(',');
    try{
      if(name==='dog_tail_leaderboard')return Response.json((await db.query('select * from public.dog_tail_leaderboard()')).rows);
      const result=await db.query<{value:string}>(`select public.${name}(${placeholders}) as value`,Object.values(args));return Response.json(result.rows[0].value);
    }catch(error){return Response.json({message:(error as Error).message},{status:400});}
  };
  const started=await (await handleLeaderboard(request({action:'start'}),env,transport)).json();
  await db.query("update public.dog_tail_runs set started_at=now()-interval '12 seconds' where id=$1",[started.runId]);
  const body={action:'submit',runId:started.runId,name:'Little Legs',score:120,catches:1,duration:10,reason:'health',input:'touch'};
  const posted=await (await handleLeaderboard(request(body),env,transport)).json();
  expect(await (await handleLeaderboard(request(body),env,transport)).json()).toEqual(posted);
  const scores=await (await handleLeaderboard(new Request('https://game.example/api/leaderboard'),env,transport)).json();
  expect(scores.scores).toEqual([{id:posted.id,player_name:'Little Legs',score:120,catches:1,input_mode:'touch'}]);
});
