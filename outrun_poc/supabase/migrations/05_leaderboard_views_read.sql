-- Allow authenticated users (including demo) to read leaderboard views.
-- Views leaderboard_overall and leaderboard_stage select from users, stage_results, participants.
-- Without these policies, RLS restricts view rows to the current user only.

-- Users: allow any authenticated user to read (for leaderboard display names)
create policy "users_read_leaderboard"
on users for select
to authenticated
using (true);

-- Participants: allow any authenticated user to read (for leaderboard join)
create policy "participants_read_leaderboard"
on participants for select
to authenticated
using (true);

-- Stage results: allow any authenticated user to read (for leaderboard times)
create policy "stage_results_read_leaderboard"
on stage_results for select
to authenticated
using (true);
