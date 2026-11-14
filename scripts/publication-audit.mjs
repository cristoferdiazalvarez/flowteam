import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const issues = [];
const forbidden =
  /^(?:\.env(?:$|\.(?!example$))|\.data\/|\.storage\/|\.vercel\/|node_modules\/|\.next\/|test-results\/|playwright-report\/)/;
let secrets = [];
try {
  secrets = readFileSync('.env', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)=["']?(.+?)["']?$/))
    .filter(Boolean)
    .filter((m) => /SECRET|DATABASE_URL|TOKEN|PASSWORD/.test(m[1]))
    .map((m) => ({ key: m[1], value: m[2] }))
    .filter((s) => s.value.length > 12);
} catch {}
for (const file of files) {
  if (forbidden.test(file)) issues.push(`Runtime/private path tracked: ${file}`);
  const data = readFileSync(file);
  for (const secret of secrets)
    if (data.includes(Buffer.from(secret.value)))
      issues.push(`Local ${secret.key} value present in ${file}`);
  if (!file.endsWith('.png')) {
    const text = data.toString('utf8');
    if (
      /(?:ghp_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{40,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)/.test(
        text,
      ) &&
      file !== 'scripts/publication-audit.mjs'
    )
      issues.push(`Credential pattern found in ${file}`);
  }
}
const identities = execFileSync('git', ['log', '--format=%ae%n%ce'], { encoding: 'utf8' })
  .trim()
  .split('\n');
if (identities.some((e) => !e.endsWith('@users.noreply.github.com')))
  issues.push('Git history contains a non-noreply author or committer email.');
if (issues.length) {
  for (const issue of issues) console.error(issue);
  process.exitCode = 1;
} else
  console.log(
    `PASS: ${files.length} tracked files; no runtime paths, local environment secret values, private keys, GitHub tokens or private Git email addresses found.`,
  );
