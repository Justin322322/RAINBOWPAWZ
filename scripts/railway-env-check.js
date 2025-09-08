#!/usr/bin/env node
/*
  Usage:
    node scripts/railway-env-check.js               // uses current Railway context
    node scripts/railway-env-check.js --json        // raw JSON output
    node scripts/railway-env-check.js --project <id-or-name> --environment <id-or-name>

  Requires: Railway CLI installed and logged in (`railway login`).
*/

const { exec } = require('child_process');

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout.trim());
    });
  });
}

function pickDbVars(vars) {
  const keys = Object.keys(vars);
  const wanted = [
    // Generic
    'DATABASE_URL', 'DB_URL', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_USERNAME', 'DB_PASSWORD',
    // MySQL/MariaDB
    'MYSQL_URL', 'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DB', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_USERNAME', 'MYSQL_PASSWORD',
    // Postgres
    'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DB', 'POSTGRES_DATABASE', 'POSTGRES_USER', 'POSTGRES_PASSWORD',
    // PlanetScale / Neon / Railway conventionals
    'PLANETSCALE_URL', 'NEON_DATABASE_URL', 'RAILWAY_DATABASE_URL'
  ];
  const out = {};
  for (const k of wanted) {
    if (keys.includes(k) && vars[k] != null) out[k] = vars[k];
  }
  // Heuristic fallback: include anything containing DB or DATABASE
  for (const k of keys) {
    if (!out[k] && /DB|DATABASE|MYSQL|POSTGRES|PSCALE|NEON/i.test(k)) {
      out[k] = vars[k];
    }
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const ixProj = args.indexOf('--project');
  const ixEnv = args.indexOf('--environment');
  const proj = ixProj !== -1 ? args[ixProj + 1] : undefined;
  const env = ixEnv !== -1 ? args[ixEnv + 1] : undefined;

  let cmd = 'railway variables --json';
  if (proj) cmd += ` --project ${proj}`;
  if (env) cmd += ` --environment ${env}`;

  try {
    const raw = await run(cmd);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Failed to parse Railway variables JSON. Raw output:\n${raw}`);
    }

    if (isJson) {
      console.log(JSON.stringify(parsed, null, 2));
      return;
    }

    const dbVars = pickDbVars(parsed);
    console.log('\n=== Railway Variables (DB-related) ===');
    if (Object.keys(dbVars).length === 0) {
      console.log('No explicit DB variables detected. Full keys available:');
      console.log(Object.keys(parsed).sort().join(', '));
    } else {
      for (const [k, v] of Object.entries(dbVars)) {
        console.log(`${k}=${v}`);
      }
    }

    console.log('\n=== Hints ===');
    console.log('- Use --json to see all variables as JSON');
    console.log('- Use --project <id|name> --environment <id|name> to target explicitly');
    console.log('- Example: node scripts/railway-env-check.js --project myproj --environment production');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();


