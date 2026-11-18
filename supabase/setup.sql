-- Close the Books: leaderboard setup for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, and click Run.
-- Safe to run again: it replaces the functions and keeps existing scores.

-- 1. Settings you can change later in Table Editor > settings
create table if not exists public.settings (
  key   text primary key,
  value text not null
);
insert into public.settings (key, value) values
  ('season_end', '2027-01-31T23:59:00+01:00'),   -- after this moment no new scores are accepted
  ('season_name', 'Close the Books 2026'),
  ('season', 's1')                                 -- 's1' = ESSA season; set to 's2' at the January event to unlock AI
on conflict (key) do nothing;

-- 2. One row per finished game
create table if not exists public.runs (
  id          bigint generated always as identity primary key,
  player_id   uuid        not null,               -- random id kept in the player's browser
  name        text        not null check (char_length(name) between 1 and 24),
  mode        text        not null check (char_length(mode) between 1 and 24),
  score       integer     not null check (score between 0 and 5000000),
  stats       jsonb       not null default '{}'::jsonb,  -- e.g. clean_ms, ai_share, caught, posted
  version     text,
  created_at  timestamptz not null default now()
);
create index if not exists runs_mode_score on public.runs (mode, score desc);
create index if not exists runs_player on public.runs (player_id, created_at desc);

-- Nobody reads or writes the tables directly from the website: only the two functions below.
alter table public.runs enable row level security;
alter table public.settings enable row level security;
revoke all on public.runs from anon, authenticated;
revoke all on public.settings from anon, authenticated;

-- 3. Submit a score, with plausibility checks
create or replace function public.submit_run(
  p_player uuid, p_name text, p_mode text, p_score integer, p_stats jsonb, p_version text
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_end timestamptz;
  v_season text;
  v_last timestamptz;
  v_dur numeric := coalesce((p_stats->>'duration_ms')::numeric, 0);
  v_posted numeric := coalesce((p_stats->>'posted')::numeric, 0);
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  -- only the active season (or the 'test' sandbox) accepts scores
  select value into v_season from settings where key = 'season';
  if p_mode is distinct from 'test' and p_mode is distinct from coalesce(v_season, 's1') then
    return json_build_object('ok', false, 'reason', 'wrong_season');
  end if;
  select value::timestamptz into v_end from settings where key = 'season_end';
  if p_mode <> 'test' and v_end is not null and now() > v_end then
    return json_build_object('ok', false, 'reason', 'season_closed');
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 24 then
    return json_build_object('ok', false, 'reason', 'bad_name');
  end if;
  -- a close fails at the first missed entry, so games can be short; at most 30 minutes
  if v_dur < 3000 or v_dur > 1800000 then
    return json_build_object('ok', false, 'reason', 'bad_duration');
  end if;
  -- no more than 25 entries per second played; max ~800 points per entry: 30 base x3 time x2 streak x1.5 clutch x1.5 flawless, plus spike bonuses
  if v_posted > v_dur / 1000 * 25 or p_score > greatest(v_posted, 1) * 800 + 20000 then
    return json_build_object('ok', false, 'reason', 'implausible');
  end if;
  -- one submission per player every 5 seconds (a game always takes longer than that)
  select max(created_at) into v_last from runs where player_id = p_player;
  if v_last is not null and now() - v_last < interval '5 seconds' then
    return json_build_object('ok', false, 'reason', 'too_fast');
  end if;
  insert into runs (player_id, name, mode, score, stats, version)
  values (p_player, v_name, p_mode, p_score, coalesce(p_stats, '{}'::jsonb), p_version);
  return json_build_object('ok', true);
end $$;

-- 4. Leaderboard: each player's best result for one metric.
--    p_metric 'score' uses the score column; anything else reads that key from stats.
create or replace function public.leaderboard(
  p_mode text, p_metric text default 'score', p_ascending boolean default false, p_limit integer default 50
) returns table (rank bigint, player_id uuid, name text, value numeric, achieved_at timestamptz)
language sql stable security definer set search_path = public as $$
  with vals as (
    select r.player_id, r.name, r.created_at,
           case when p_metric = 'score' then r.score::numeric else (r.stats->>p_metric)::numeric end as v
    from runs r
    where r.mode = p_mode
  ), best as (
    select distinct on (player_id) player_id, name, v, created_at
    from vals where v is not null
    order by player_id,
             case when p_ascending then v end asc,
             case when not p_ascending then v end desc,
             created_at asc
  )
  select row_number() over (order by case when p_ascending then v end asc, case when not p_ascending then v end desc, created_at asc),
         player_id, name, v, created_at
  from best
  order by 1
  limit least(greatest(p_limit, 1), 200);
$$;

-- 5. Season info for the website
create or replace function public.season() returns json
language sql stable security definer set search_path = public as $$
  select json_object_agg(key, value) from settings;
$$;

grant execute on function public.submit_run(uuid, text, text, integer, jsonb, text) to anon;
grant execute on function public.leaderboard(text, text, boolean, integer) to anon;
grant execute on function public.season() to anon;
