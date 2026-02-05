-- Backfill participants: ensure every user in users has a participant record
-- for the active challenge (fixes auth users who completed Strava OAuth but
-- had no participant row created, e.g. due to timing or insert failure).
INSERT INTO participants (user_id, challenge_id, excluded)
SELECT u.id, c.id, false
FROM users u
CROSS JOIN challenges c
WHERE c.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM participants p
    WHERE p.user_id = u.id AND p.challenge_id = c.id
  );
