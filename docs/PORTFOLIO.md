# Portfolio and LinkedIn material

Use the final verification record when choosing numeric test claims. Verified live demo: https://flowteam-ten.vercel.app · Source: https://github.com/cristoferdiazalvarez/flowteam · CI: https://github.com/cristoferdiazalvarez/flowteam/actions/workflows/ci.yml

## Portfolio card (English)

**FlowTeam — a little more flow.**

A collaborative project workspace built with Next.js, TypeScript, PostgreSQL and Prisma. Includes private interactive demos, a persistent Kanban board, task conversations, role-based access, real workload metrics and responsive light/dark interfaces.

Tags: Next.js · React · TypeScript · PostgreSQL · Prisma · Better Auth · TanStack Query · dnd-kit · Playwright

Suggested lead image: `screenshots/production/desktop-overview.png`.
Suggested supporting images: `desktop-board.png`, `mobile-overview.png`, `desktop-task.png` and `collaboration-session-two.png`.

## Portfolio card (Spanish)

**FlowTeam — colaboración con foco.**

Plataforma de proyectos con demo privada por visitante, Kanban persistente, comentarios, equipos y permisos comprobados en servidor. Desarrollada con Next.js, TypeScript, PostgreSQL y Prisma, con pruebas de integración y recorridos de navegador reales.

## LinkedIn draft (Spanish — do not post automatically)

He creado FlowTeam, una plataforma colaborativa para organizar proyectos y tareas.

Quería ir más allá de una interfaz: cada visitante tiene una demo independiente, las métricas salen de PostgreSQL y las ediciones concurrentes detectan conflictos para evitar sobrescribir el trabajo de otra sesión.

He trabajado autenticación con sesiones, autorización por workspace, Kanban con persistencia y rollback, comentarios, adjuntos privados y una interfaz responsive con dos temas. También he preparado pruebas con Vitest y Playwright, documentación de arquitectura y un pipeline de CI.

Uno de los aprendizajes más útiles ha sido pensar en los límites operativos: una sincronización por polling funciona en serverless, pero consume peticiones y puede mantener la base de datos activa. Elegir una arquitectura incluye explicar sus costes y sus límites.

Demo: https://flowteam-ten.vercel.app
Repositorio: https://github.com/cristoferdiazalvarez/flowteam

Verificación: 6 pruebas unitarias, 12 de integración y 11 escenarios E2E sin omisiones; los 11 escenarios también pasan contra la demo HTTPS. GitHub Actions verificado en verde.

#FullStack #Nextjs #TypeScript #PostgreSQL #WebDevelopment

## Short interview introduction

“I built FlowTeam to practice the parts of collaboration apps that screenshots don't prove: tenant isolation, role checks, persistent ordering and concurrent edits. I chose session auth and PostgreSQL transactions, and used polling to keep the first deployment architecture simple. The demo creates private workspaces, so visitors can use the product without corrupting shared data. I can show the tests and explain what remains before broader production use.”

## 90-second walkthrough

1. Open “Explorar demo”: explain private fictional data and show computed overview metrics.
2. Open Website redesign, create and edit a task, move it and reload.
3. Open a second authenticated browser context; observe a task/comment from the first context.
4. Show checklist, private attachment, filters, list/calendar, theme and mobile navigation.
5. Open members: discuss single-use expiring invite links, owner/admin/member boundaries and server checks.
6. Finish with tests, architecture decisions and the explicit deployment prerequisites.
