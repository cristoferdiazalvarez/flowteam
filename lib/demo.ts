import { db } from './db';
const titles = [
  [
    'Map the onboarding journey',
    'Design a calmer first impression',
    'Define the workspace permission model',
    'Explore navigation concepts',
  ],
  [
    'Build the component library',
    'Design project overview',
    'Implement secure invitations',
    'Connect task activity feed',
  ],
  ['Review keyboard navigation', 'Polish empty states', 'Test responsive board layout'],
  ['Set up the project foundation', 'Create the FlowTeam identity', 'Document design principles'],
];
export async function bootstrap(userId: string, name: string, demo = false) {
  return db.$transaction(
    async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name, demo, memberships: { create: { userId, role: 'OWNER' } } },
      });
      const membership = await tx.membership.findUniqueOrThrow({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
      });
      const team = await tx.team.create({
        data: {
          name: 'Product & Engineering',
          workspaceId: workspace.id,
          members: { create: { membershipId: membership.id } },
        },
      });
      void team;
      if (!demo) return workspace;
      const people = [
        { name: 'Sofia Chen', email: `sofia.${workspace.id}@demo.invalid` },
        { name: 'Alex Morgan', email: `alex.${workspace.id}@demo.invalid` },
        { name: 'James Wilson', email: `james.${workspace.id}@demo.invalid` },
      ];
      const users = [userId];
      for (const p of people) {
        const u = await tx.user.create({ data: { id: crypto.randomUUID(), ...p } });
        users.push(u.id);
        await tx.membership.create({
          data: { workspaceId: workspace.id, userId: u.id, role: 'MEMBER' },
        });
      }
      const allMembers = await tx.membership.findMany({ where: { workspaceId: workspace.id } });
      for (const [pi, p] of [
        {
          name: 'Website redesign',
          description:
            'A thoughtful new home for our next chapter. From the first impression to the finest detail.',
          color: '#a498ff',
          icon: 'Compass',
        },
        {
          name: 'FlowTeam platform',
          description: 'Make meaningful work feel effortless. Our product roadmap, in one place.',
          color: '#6aafff',
          icon: 'Layers',
        },
        {
          name: 'Brand & identity',
          description: 'An identity that feels distinctly us.',
          color: '#efaf7d',
          icon: 'Rocket',
        },
      ].entries()) {
        const project = await tx.project.create({
          data: {
            workspaceId: workspace.id,
            ...p,
            dueDate: new Date(Date.now() + 21 * 86400000),
            members: { create: allMembers.map((m) => ({ membershipId: m.id })) },
            columns: {
              create: [
                { name: 'Backlog', position: 0 },
                { name: 'In progress', position: 1 },
                { name: 'In review', position: 2 },
                { name: 'Done', position: 3, done: true },
              ],
            },
            labels: {
              create: [
                { name: 'Design', color: '#b7a6ff' },
                { name: 'Engineering', color: '#77b6ed' },
                { name: 'Research', color: '#e7b97e' },
              ],
            },
          },
          include: { columns: { orderBy: { position: 'asc' } }, labels: true },
        });
        for (let ci = 0; ci < 4; ci++)
          for (let ti = 0; ti < (pi === 0 ? titles[ci].length : 2); ti++) {
            const t = await tx.task.create({
              data: {
                projectId: project.id,
                columnId: project.columns[ci].id,
                title:
                  pi === 0
                    ? titles[ci][ti]
                    : [pi === 1 ? 'Implement' : 'Explore', titles[ci][ti].toLowerCase()].join(' '),
                description:
                  '## The goal\nMake the experience clear, considered, and easy to use.\n\n### Acceptance criteria\n- Works on desktop and mobile\n- Accessible with keyboard\n- Reviewed with the team',
                priority: ['High', 'Medium', 'Low'][ti % 3],
                position: (ti + 1) * 1024,
                createdById: userId,
                dueDate: new Date(Date.now() + (ti === 0 && ci === 1 ? -2 : ti + 4) * 86400000),
                assignments: { create: { userId: users[(ci + ti) % users.length] } },
                labels: { create: { labelId: project.labels[ti % 3].id } },
                subtasks: {
                  create: [
                    { title: 'Explore the direction', done: ci > 1 },
                    { title: 'Review with the team', done: ci === 3 },
                  ],
                },
                comments: {
                  create: {
                    authorId: users[1],
                    body: 'Love this direction. Let’s keep the experience simple and focus on the details.',
                  },
                },
              },
            });
            if (ci === 1)
              await tx.activity.create({
                data: {
                  workspaceId: workspace.id,
                  actorId: users[1],
                  text: `started working on “${t.title}”`,
                  taskId: t.id,
                },
              });
          }
      }
      await tx.notification.create({
        data: {
          workspaceId: workspace.id,
          userId,
          text: 'Welcome to your private demo. Everything here is yours to explore.',
        },
      });
      return workspace;
    },
    { timeout: 30000 },
  );
}
