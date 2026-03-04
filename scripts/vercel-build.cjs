#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const npxCmd = 'npx';

function runNpx(args, { allowFailure = false } = {}) {
  const commandLine = [npxCmd, ...args.map((value) => `"${value.replace(/"/g, '\\"')}"`)].join(' ');
  const result = spawnSync(commandLine, {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  if (result.error) {
    console.error(`[vercel-build] Failed to execute "${npxCmd} ${args.join(' ')}"`, result.error);
    if (!allowFailure) {
      process.exit(1);
    }
    return false;
  }

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }

  return result.status === 0;
}

console.log('[vercel-build] Running prisma generate...');
runNpx(['prisma', 'generate']);

if (process.env.DATABASE_URL) {
  console.log('[vercel-build] Running prisma migrate deploy...');
  const migrateOk = runNpx(['prisma', 'migrate', 'deploy'], { allowFailure: true });
  if (!migrateOk) {
    console.warn(
      '[vercel-build] prisma migrate deploy failed. Continuing deployment with current schema.'
    );
  }
} else {
  console.warn('[vercel-build] DATABASE_URL not set. Skipping prisma migrate deploy.');
}

console.log('[vercel-build] Running next build...');
runNpx(['next', 'build']);
