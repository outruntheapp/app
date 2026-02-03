-- Extend check_strava_connection_by_email to return hasToken; add get_strava_connection_status for signed-in user

create or replace function check_strava_connection_by_email(user_email text)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'hasStrava', (u.strava_athlete_id IS NOT NULL),
    'userId', u.id,
    'hasToken', exists(select 1 from strava_tokens st where st.user_id = u.id)
  ) into result
  from users u
  where u.email = lower(trim(user_email))
  limit 1;

  return coalesce(result, '{"hasStrava": false, "userId": null, "hasToken": false}'::jsonb);
end;
$$;

grant execute on function check_strava_connection_by_email(text) to anon, authenticated;

-- RPC for signed-in user: Strava connection and token status for auth.uid()
create or replace function get_strava_connection_status()
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'hasStrava', (select (strava_athlete_id IS NOT NULL) from users where id = auth.uid()),
    'hasToken', (select exists(select 1 from strava_tokens where user_id = auth.uid()))
  ) into result;

  return coalesce(result, '{"hasStrava": false, "hasToken": false}'::jsonb);
end;
$$;

grant execute on function get_strava_connection_status() to authenticated;
