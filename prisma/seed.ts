export {};
process.loadEnvFile('.env');
const { db } = await import('../lib/db');
const { bootstrap } = await import('../lib/demo');
// Idempotent seed: no login credential is stored or advertised.
const id = 'flowteam-local-seed';
try {
  const user = await db.user.upsert({
    where: { id },
    create: { id, name: 'Local showcase', email: 'showcase@seed.invalid' },
    update: {},
  });
  const existing = await db.membership.findFirst({ where: { userId: id } });
  if (!existing) {
    const w = await bootstrap(user.id, 'FlowTeam Showcase', true);
    console.log(
      `Seeded showcase workspace ${w.id}. Use Explore demo for a fresh authenticated demo.`,
    );
  } else console.log('Seed already exists; preserved.');
} finally {
  await db.$disconnect();
}
