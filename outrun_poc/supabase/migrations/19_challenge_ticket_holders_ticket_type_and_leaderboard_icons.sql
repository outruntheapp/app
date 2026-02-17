-- Add ticket_type to challenge_ticket_holders and expose it in leaderboard views.

alter table public.challenge_ticket_holders
  add column if not exists ticket_type text not null default 'basic';

comment on column public.challenge_ticket_holders.ticket_type is
  'Ticket tier (basic, premium, apex). Used for UI icon display; not used for gating.';

-- Overall Leaderboard (active challenge only) + ticket type
create or replace view leaderboard_overall as
select
  u.id as user_id,
  u.full_name,
  u.sex,
  sum(sr.best_time_seconds) as total_time_seconds,
  count(sr.stage_number) as stages_completed,
  th.ticket_type
from stage_results sr
join challenges c on c.id = sr.challenge_id and c.is_active = true
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id and p.challenge_id = sr.challenge_id
left join public.challenge_ticket_holders th
  on th.challenge_id = sr.challenge_id
 and lower(th.email) = lower(u.email)
where p.excluded = false
group by u.id, u.full_name, u.sex, th.ticket_type;

-- Per-Stage Leaderboard (active challenge only) + sex + ticket type
-- NOTE: Preserve existing column order to avoid 42P16 errors on CREATE OR REPLACE VIEW.
create or replace view leaderboard_stage as
select
  sr.stage_number,
  u.id as user_id,
  u.full_name,
  sr.best_time_seconds,
  u.sex,
  th.ticket_type
from stage_results sr
join challenges c on c.id = sr.challenge_id and c.is_active = true
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id and p.challenge_id = sr.challenge_id
left join public.challenge_ticket_holders th
  on th.challenge_id = sr.challenge_id
 and lower(th.email) = lower(u.email)
where p.excluded = false;

