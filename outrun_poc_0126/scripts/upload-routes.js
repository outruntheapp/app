// scripts/upload-routes.js
// Purpose: Read GPX files from routes/{challenge_name}/ and upload to Supabase.
// Reason: Route geometry in the DB must match the GPX files used for display and
// for Strava activity matching; this script generates SQL (or guides upload) so
// routes.gpx_geo is populated from stage-*.gpx.

const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js');
const { createClient } = require('@supabase/supabase-js');

// Configuration: routes live under public/routes/<challenge_name>/stage-N.gpx
const ROUTES_DIR = path.join(__dirname, '..', 'public', 'routes');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

// Parse GPX file and extract coordinates (from <trkpt lat="" lon="">).
// Returns array of [lon, lat] for PostGIS LINESTRING order.
function parseGPXFile(filePath) {
  return new Promise((resolve, reject) => {
    const gpxContent = fs.readFileSync(filePath, 'utf8');
    
    parseString(gpxContent, (err, result) => {
      if (err) {
        reject(new Error(`Failed to parse GPX file: ${err.message}`));
        return;
      }

      try {
        const coordinates = [];
        const trkpts = result.gpx?.trk?.[0]?.trkseg?.[0]?.trkpt || [];
        
        for (const trkpt of trkpts) {
          const lat = parseFloat(trkpt.$.lat);
          const lon = parseFloat(trkpt.$.lon);
          
          if (!isNaN(lat) && !isNaN(lon)) {
            coordinates.push([lon, lat]); // PostGIS uses lon, lat order
          }
        }

        if (coordinates.length === 0) {
          reject(new Error(`No valid coordinates found in ${filePath}`));
          return;
        }

        resolve(coordinates);
      } catch (error) {
        reject(new Error(`Error extracting coordinates: ${error.message}`));
      }
    });
  });
}

// Convert coordinates to PostGIS LineString WKT format
function coordinatesToLineString(coordinates) {
  const points = coordinates.map(([lon, lat]) => `${lon} ${lat}`).join(', ');
  return `LINESTRING(${points})`;
}

// Find all challenge directories under ROUTES_DIR (e.g. challenge_1).
// Used when no <challenge_name> arg is given, to list available challenges.
function findChallengeDirectories() {
  if (!fs.existsSync(ROUTES_DIR)) {
    throw new Error(`Routes directory not found: ${ROUTES_DIR}`);
  }

  const entries = fs.readdirSync(ROUTES_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

// Read GPX files for a challenge
async function readChallengeRoutes(challengeName) {
  const challengeDir = path.join(ROUTES_DIR, challengeName);
  
  if (!fs.existsSync(challengeDir)) {
    throw new Error(`Challenge directory not found: ${challengeDir}`);
  }

  const routes = {};
  
  for (let stage = 1; stage <= 3; stage++) {
    const gpxFile = path.join(challengeDir, `stage-${stage}.gpx`);
    
    if (!fs.existsSync(gpxFile)) {
      console.warn(`⚠️  GPX file not found: ${gpxFile}`);
      continue;
    }

    try {
      const coordinates = await parseGPXFile(gpxFile);
      const lineString = coordinatesToLineString(coordinates);
      routes[stage] = {
        stageNumber: stage,
        coordinates,
        lineString,
        pointCount: coordinates.length,
      };
      console.log(`✅ Parsed stage-${stage}.gpx: ${coordinates.length} points`);
    } catch (error) {
      console.error(`❌ Error parsing stage-${stage}.gpx: ${error.message}`);
      throw error;
    }
  }

  return routes;
}

// Generate SQL INSERT statements for routes table.
// If challengeId is provided, INSERT uses it; otherwise SELECT from active challenge.
// Output is suitable for Supabase SQL Editor or migrations.
function generateSQL(challengeName, routes, challengeId = null) {
  const sqlStatements = [];
  
  for (const [stageNum, route] of Object.entries(routes)) {
    const stageNumber = parseInt(stageNum);
    
    if (challengeId) {
      // Direct INSERT with challenge_id
      sqlStatements.push(`
-- Stage ${stageNumber} for ${challengeName}
INSERT INTO routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
VALUES (
  '${challengeId}',
  ${stageNumber},
  ST_GeogFromText('${route.lineString}'),
  30,
  0.8
);`);
    } else {
      // SELECT from active challenge
      sqlStatements.push(`
-- Stage ${stageNumber} for ${challengeName}
INSERT INTO routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
SELECT 
  id,
  ${stageNumber},
  ST_GeogFromText('${route.lineString}'),
  30,
  0.8
FROM challenges 
WHERE is_active = true
LIMIT 1;`);
    }
  }
  
  return sqlStatements.join('\n\n');
}

// Prepare upload: resolve active challenge, generate SQL, write to migrations folder.
// Does not execute SQL (PostGIS geography requires SQL Editor or migration runner).
async function uploadToSupabase(challengeName, routes) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get active challenge
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('id, name')
    .eq('is_active', true)
    .single();

  if (challengeError || !challenge) {
    throw new Error(`No active challenge found. Error: ${challengeError?.message || 'No challenge'}`);
  }

  console.log(`\n📦 Generating SQL for challenge: ${challenge.name} (${challenge.id})`);
  console.log(`\n⚠️  Note: PostGIS geography types require SQL execution.`);
  console.log(`   The script will generate SQL that you can run in Supabase SQL Editor.\n`);

  // Generate SQL with challenge ID
  const sql = generateSQL(challengeName, routes, challenge.id);
  const outputFile = path.join(__dirname, '..', 'supabase', 'migrations', `02_insert_routes_${challengeName}.sql`);
  
  fs.writeFileSync(outputFile, `-- Routes for ${challengeName}\n-- Challenge: ${challenge.name} (${challenge.id})\n-- Generated from GPX files\n\n${sql}\n`);
  
  console.log(`✅ Generated SQL file: ${outputFile}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Open Supabase Dashboard → SQL Editor`);
  console.log(`   2. Copy and paste the contents of: ${outputFile}`);
  console.log(`   3. Click "Run" to insert routes into database`);
  console.log(`\n   Or use Supabase CLI: supabase db push`);
}

// Main: list challenges, or read GPX for given challenge and generate SQL / run upload step.
// Usage: node scripts/upload-routes.js [challenge_name] [sql|upload]
async function main() {
  const args = process.argv.slice(2);
  const challengeName = args[0];
  const outputMode = args[1] || 'sql'; // 'sql' or 'upload'

  try {
    if (!challengeName) {
      // List available challenges
      const challenges = findChallengeDirectories();
      console.log('Available challenge directories:');
      challenges.forEach(ch => console.log(`  - ${ch}`));
      console.log('\nUsage: node scripts/upload-routes.js <challenge_name> [sql|upload]');
      console.log('Example: node scripts/upload-routes.js challenge_1 upload');
      process.exit(1);
    }

    console.log(`\n📂 Reading GPX files for: ${challengeName}\n`);
    const routes = await readChallengeRoutes(challengeName);

    if (Object.keys(routes).length === 0) {
      throw new Error('No valid routes found');
    }

    if (outputMode === 'upload') {
      await uploadToSupabase(challengeName, routes);
    } else {
      // Generate SQL file
      const sql = generateSQL(challengeName, routes);
      const outputFile = path.join(__dirname, '..', 'supabase', 'migrations', `02_insert_routes_${challengeName}.sql`);
      
      fs.writeFileSync(outputFile, `-- Routes for ${challengeName}\n-- Generated from GPX files\n\n${sql}\n`);
      console.log(`\n✅ Generated SQL file: ${outputFile}`);
      console.log('\nTo apply, run this SQL in Supabase SQL Editor or via migration.');
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { parseGPXFile, readChallengeRoutes, generateSQL, uploadToSupabase };
