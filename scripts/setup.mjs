import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('.env')) {
  const password = randomBytes(24).toString('hex');
  writeFileSync(
    '.env',
    `DATABASE_URL="postgresql://flowteam:${password}@127.0.0.1:55437/flowteam"\nBETTER_AUTH_SECRET="${randomBytes(40).toString('hex')}"\nBETTER_AUTH_URL="http://127.0.0.1:3000"\n`,
    { mode: 0o600 },
  );
  console.log('Created ignored local environment with random secrets.');
} else console.log('Existing .env preserved.');
