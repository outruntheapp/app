// supabase/functions/_shared/strava.ts
// Purpose: Hardened Strava token handling + API helpers

import { supabaseAdmin } from "./supabase.ts";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_URL = "https://www.strava.com/api/v3";

export async function getValidAccessToken(userId: string): Promise<string> {
  const { data: token } = await supabaseAdmin
    .from("strava_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!token) throw new Error("Missing Strava token");

  const expiresSoon =
    new Date(token.expires_at).getTime() < Date.now() + 5 * 60 * 1000;

  if (!expiresSoon) {
    return token.access_token;
  }

  const refreshed = await refreshToken(token.refresh_token);

  await supabaseAdmin.from("strava_tokens").update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return refreshed.access_token;
}

async function refreshToken(refreshToken: string) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Strava token");
  }

  return await res.json();
}

export async function fetchAthleteActivities(
  accessToken: string,
  after?: number
): Promise<any[]> {
  const url = new URL(`${STRAVA_API_URL}/athlete/activities`);
  if (after) {
    url.searchParams.set("after", after.toString());
  }
  url.searchParams.set("per_page", "200");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Strava API error: ${res.status}`);
  }

  return await res.json();
}
