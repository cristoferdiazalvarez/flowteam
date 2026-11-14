import './setup.mjs';
import { spawn } from 'node:child_process';
process.loadEnvFile('.env');
const children = new Set();
let stopping = false;
let databaseProcess;
function child(command, args) {
  const p = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    detached: process.platform !== 'win32',
  });
  children.add(p);
  p.stdout.on('data', (d) => process.stdout.write(d));
  p.stderr.on('data', (d) => process.stderr.write(d));
  p.on('exit', () => children.delete(p));
  return p;
}
function signalOwned(p, signal = 'SIGINT') {
  try {
    if (process.platform === 'win32') p.kill(signal);
    else process.kill(-p.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') console.error(error.message);
  }
}
async function endOwned(p) {
  if (!p || p.exitCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      signalOwned(p, 'SIGTERM');
      resolve();
    }, 2500);
    p.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    signalOwned(p);
  });
}
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  // Stop only process groups launched here; let the application close its pool before PostgreSQL.
  await Promise.all([...children].filter((p) => p !== databaseProcess).map(endOwned));
  await new Promise((resolve) => setTimeout(resolve, 500));
  await endOwned(databaseProcess);
  process.exit(code);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
try {
  const database = child(process.execPath, ['scripts/database.mjs']);
  databaseProcess = database;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Database startup timed out. Is port 55437 already in use?')),
      30000,
    );
    database.stdout.on('data', (d) => {
      if (String(d).includes('PostgreSQL ready')) {
        clearTimeout(timer);
        resolve();
      }
    });
    database.on('exit', (code) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Local database exited (${code}). Stop any existing FlowTeam database before using npm run local.`,
        ),
      );
    });
  });
  for (const args of [
    ['exec', 'prisma', 'generate'],
    ['exec', 'prisma', 'migrate', 'deploy'],
    ['run', 'db:seed'],
  ]) {
    const p = child('npm', args);
    await new Promise((resolve, reject) =>
      p.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`npm ${args.join(' ')} failed`)),
      ),
    );
  }
  const app = child('npm', ['run', 'dev']);
  app.on('exit', (code) => stop(code || 0));
} catch (e) {
  console.error(e.message);
  await stop(1);
}
