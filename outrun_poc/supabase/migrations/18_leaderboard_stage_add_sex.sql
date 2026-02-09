-- Add sex to leaderboard_stage view so Male/Female filter works on stage tabs.
create or replace view leaderboard_stage as
select
  sr.stage_number,
  u.id as user_id,
  u.full_name,
  u.sex,
  sr.best_time_seconds
from stage_results sr
join challenges c on c.id = sr.challenge_id and c.is_active = true
join users u on u.id = sr.user_id
join participants p on p.user_id = u.id and p.challenge_id = sr.challenge_id
where p.excluded = false;
