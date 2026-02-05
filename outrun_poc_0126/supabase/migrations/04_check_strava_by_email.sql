-- Migration: Create secure RPC function for checking Strava connection by email
-- Purpose: Allow email lookup without RLS violations
-- Security: Uses SECURITY DEFINER to bypass RLS for this specific query

create or replace function check_strava_connection_by_email(user_email text)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  -- Look up user by email and return Strava connection status
  select jsonb_build_object(
    'hasStrava', (strava_athlete_id IS NOT NULL),
    'userId', id
  ) into result
  from users
  where email = lower(trim(user_email))
  limit 1;
  
  -- Return default if no user found
  return coalesce(result, '{"hasStrava": false, "userId": null}'::jsonb);
end;
$$;

-- Grant execute permission to anon and authenticated users
grant execute on function check_strava_connection_by_email(text) to anon, authenticated;
