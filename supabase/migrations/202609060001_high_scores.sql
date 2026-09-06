begin;

create table public.dog_tail_runs (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  started_at timestamptz not null default now()
);
create index dog_tail_runs_fingerprint_time on public.dog_tail_runs (fingerprint, started_at);
create index dog_tail_runs_time on public.dog_tail_runs (started_at);

create table public.dog_tail_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  player_name text not null check (char_length(player_name) between 2 and 20),
  score integer not null check (score between 0 and 22375),
  catches integer not null check (catches between 0 and 73),
  duration numeric not null check (duration between 0 and 180),
  reason text not null check (reason in ('time','health','anger')),
  input_mode text not null check (input_mode in ('touch','keyboard')),
  created_at timestamptz not null default now()
);
create index dog_tail_scores_ranking on public.dog_tail_scores (score desc, catches desc, created_at asc, id asc);

alter table public.dog_tail_runs enable row level security;
alter table public.dog_tail_scores enable row level security;
revoke all on public.dog_tail_runs, public.dog_tail_scores from public, anon, authenticated;
grant all on public.dog_tail_runs, public.dog_tail_scores to service_role;

-- Only the server may call these functions. No client write policies or keys.
create function public.dog_tail_start_run(p_fingerprint text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare result uuid;
begin
  if p_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'invalid_run'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint, 0));
  if (select count(*) from public.dog_tail_runs where fingerprint=p_fingerprint and started_at>now()-interval '10 minutes') >= 20 then
    raise exception 'rate_limit';
  end if;
  -- Expired run tokens and their salted network hashes are short lived.
  delete from public.dog_tail_runs where started_at<now()-interval '24 hours';
  insert into public.dog_tail_runs (fingerprint) values (p_fingerprint) returning id into result;
  return result;
end $$;

create function public.dog_tail_submit_score(p_run_id uuid,p_name text,p_score integer,p_catches integer,p_duration numeric,p_reason text,p_input text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare run public.dog_tail_runs; result uuid;
begin
  select * into run from public.dog_tail_runs where id=p_run_id for update;
  if not found or run.started_at<now()-interval '24 hours' then raise exception 'invalid_run'; end if;
  -- A retry after a lost response returns the original entry, never a duplicate.
  select id into result from public.dog_tail_scores where run_id=p_run_id;
  if found then return result; end if;
  if p_duration is null or p_duration<0 or p_duration>180 or extract(epoch from now()-run.started_at)+2<p_duration then raise exception 'round_too_short'; end if;
  if p_score is null or p_catches is null or p_name is null or p_reason is null or p_input is null
    or p_catches<0 or p_catches>floor(p_duration/2.5)+1
    or p_score<p_catches*100 or p_score>p_catches*300+(case when p_reason='time' then 475 else 0 end)
    or (p_reason='time' and p_duration<179.9)
    or char_length(trim(p_name)) not between 2 and 20 then raise exception 'invalid_score'; end if;
  insert into public.dog_tail_scores (run_id,player_name,score,catches,duration,reason,input_mode)
    values(p_run_id,trim(p_name),p_score,p_catches,p_duration,p_reason,p_input) returning id into result;
  return result;
end $$;

create function public.dog_tail_leaderboard()
returns table (id uuid,player_name text,score integer,catches integer,input_mode text)
language sql stable security invoker set search_path = '' as $$
  select id,player_name,score,catches,input_mode from public.dog_tail_scores
  order by score desc,catches desc,created_at asc,id asc limit 20;
$$;

revoke all on function public.dog_tail_start_run(text) from public, anon, authenticated;
revoke all on function public.dog_tail_submit_score(uuid,text,integer,integer,numeric,text,text) from public, anon, authenticated;
revoke all on function public.dog_tail_leaderboard() from public, anon, authenticated;
grant execute on function public.dog_tail_start_run(text) to service_role;
grant execute on function public.dog_tail_submit_score(uuid,text,integer,integer,numeric,text,text) to service_role;
grant execute on function public.dog_tail_leaderboard() to service_role;

commit;
