import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
process.loadEnvFile('.env');
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55437')
  throw new Error('Local helper only supports isolated 127.0.0.1:55437.');
const pg = new EmbeddedPostgres({
  databaseDir: resolve('.data/postgres'),
  user: url.username,
  password: url.password,
  port: 55437,
  persistent: true,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: console.error,
});
if (!existsSync('.data/postgres/PG_VERSION')) await pg.initialise();
await pg.start();
// The package's createDatabase helper leaves a connection open when the database
// already exists. Check explicitly and always close our bootstrap connection.
const client = new Client({
  host: '127.0.0.1',
  port: 55437,
  user: url.username,
  password: url.password,
  database: 'postgres',
});
try {
  await client.connect();
  const found = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', ['flowteam']);
  if (!found.rowCount) await client.query('CREATE DATABASE flowteam');
} catch (error) {
  await pg.stop();
  throw error;
} finally {
  await client.end();
}
console.log('FlowTeam PostgreSQL ready on 127.0.0.1:55437. Ctrl+C stops this isolated database.');
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 60000);
