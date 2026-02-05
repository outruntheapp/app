-- Add slug to challenges, enforce single active challenge, filter leaderboard by active challenge.

-- 1) Add slug column (nullable first), backfill, then set not null
alter table challenges add column if not exists slug text;
-- Backfill: first row (or name containing challenge 1) -> challenge_1, rest -> challenge_2, challenge_3, ...
with ordered as (
  select id, row_number() over (order by created_at) as rn
  from challenges
  where slug is null
)
update challenges c set slug = 'challenge_' || o.rn
from ordered o where c.id = o.id;
-- If no rows were null, set challenge_1 for single row that might have been missed
update challenges set slug = 'challenge_1' where slug is null;
alter table challenges alter column slug set not null;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'challenges_slug_unique') then
  alter table challenges add constraint challenges_slug_unique unique (slug);
end if; end $$;

-- 2) Only one active challenge at a time (partial unique index)
create unique index if not exists challenges_one_active
  on challenges ((true)) where is_active = true;

-- 3) RLS on challenges: read for all, write only via service role
alter table challenges enable row level security;
drop policy if exists "challenges_select" on challenges;
create policy "challenges_select"
  on challenges for select
  using (true);

-- 4) Leaderboard views: only active challenge
create or replace view leaderboard_overall as
select
  u.id as user_id,
  u.full_name,
  u.sex,
  sum(sr.best_time_seconds) as total_time_seconds,
  count(sr.stage_number) as stages_completed
from stage_results sr
join challenges c on c.id = sr.challenge_id and c.is_active = true
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id and p.challenge_id = sr.challenge_id
where p.excluded = false
group by u.id, u.full_name, u.sex;

create or replace view leaderboard_stage as
select
  sr.stage_number,
  u.id as user_id,
  u.full_name,
  sr.best_time_seconds
from stage_results sr
join challenges c on c.id = sr.challenge_id and c.is_active = true
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id and p.challenge_id = sr.challenge_id
where p.excluded = false;
