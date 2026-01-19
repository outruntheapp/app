-- Demo/Test route for active challenge
-- This route is used for testing route matching functionality
-- Simple LineString for demo purposes

-- Insert test route (only if it doesn't exist)
INSERT INTO routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
SELECT 
  id,
  99, -- Use stage 99 to mark as test route
  ST_GeogFromText('LINESTRING(18.4241 -33.9249, 18.426 -33.9235, 18.428 -33.922, 18.43 -33.921)'),
  30,
  0.8
FROM challenges 
WHERE is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM routes 
    WHERE challenge_id = challenges.id 
      AND stage_number = 99
  )
LIMIT 1;
