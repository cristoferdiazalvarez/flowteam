import { test, expect, type Page, type Browser } from '@playwright/test';
const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const SCREENSHOTS = process.env.E2E_SCREENSHOT_DIR || 'docs/screenshots';
async function contextFor(browser: Browser, page: Page) {
  return browser.newContext({
    baseURL: BASE,
    viewport: page.viewportSize()!,
    hasTouch: page.viewportSize()!.width <= 700,
    isMobile: page.viewportSize()!.width <= 700,
  });
}
// Respect Better Auth's default 3 sign-ups / 10 seconds per origin/IP bucket.
test.beforeEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 11000));
});
async function demo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar demo' }).click();
  await expect(
    page.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }),
  ).toBeVisible({ timeout: 45000 });
}
async function nav(page: Page, name: string) {
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  if ((page.viewportSize()?.width || 1440) <= 700) {
    await toggle.waitFor({ state: 'visible' });
    await toggle.click();
  }
  await page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
}
test('private demo, projects, tasks, edit, comments, filters, views and logout', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.screenshot({
    path: `${SCREENSHOTS}/${info.project.name}-welcome.png`,
    fullPage: true,
  });
  await demo(page);
  await page.screenshot({
    path: `${SCREENSHOTS}/${info.project.name}-overview.png`,
    fullPage: true,
  });
  await nav(page, 'Website redesign');
  await expect(page.getByRole('heading', { name: 'Website redesign', exact: true })).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOTS}/${info.project.name}-board.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByLabel('Task title').fill('Ship the portfolio case study');
  await page
    .getByLabel('Description')
    .fill('## Outcome\nA thoughtful case study with real evidence.');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ship the portfolio case study', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ship the portfolio case study', exact: true }).click();
  await page.getByRole('button', { name: 'Edit task', exact: true }).click();
  await page.getByLabel('Task title').fill('Ship the verified case study');
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('High');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Ship the verified case study', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Comment', exact: true })
    .fill('Reviewed together — ready for the next chapter.');
  await page.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(
    page.getByText('Reviewed together — ready for the next chapter.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'New checklist item' }).fill('Capture real screenshots');
  await page.getByRole('button', { name: 'Add checklist item' }).click();
  await page.getByLabel('Capture real screenshots', { exact: true }).check();
  await expect(page.getByLabel('Capture real screenshots', { exact: true })).toBeChecked();
  await page.screenshot({ path: `${SCREENSHOTS}/${info.project.name}-task.png`, fullPage: true });
  await page.getByRole('button', { name: 'Close dialog' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('dialog').locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search tasks' }).fill('verified case study');
  await expect(page.locator('.task-card')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Search tasks' }).fill('');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByLabel('Filter priority').selectOption('Urgent');
  await expect(page.locator('.task-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('.task-list')).toBeVisible();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.locator('.calendar-grid')).toBeVisible();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project name').fill('A thoughtful launch');
  await page.getByLabel('Description', { exact: true }).fill('From idea to a meaningful release.');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create project', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'A thoughtful launch', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('Project name').fill('A considered launch');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A considered launch', exact: true }),
  ).toBeVisible();
  await page.reload();
  await nav(page, 'A considered launch');
  await expect(
    page.getByRole('heading', { name: 'A considered launch', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await nav(page, 'Overview');
  await page.screenshot({
    path: `${SCREENSHOTS}/${info.project.name}-light.png`,
    fullPage: true,
  });
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: innerWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.width);
  expect(errors).toEqual([]);
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  if ((page.viewportSize()?.width || 1440) <= 700) {
    await toggle.waitFor({ state: 'visible' });
    await toggle.click();
  }
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Great work. Better together.' })).toBeVisible();
});
test('register, onboarding, logout and login', async ({ page }) => {
  const email = `browser.${crypto.randomUUID()}@test.invalid`;
  const password = crypto.randomUUID() + crypto.randomUUID();
  await page.goto('/');
  await page.getByRole('button', { name: 'Start your workspace' }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Taylor Rivera');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Let’s bring your team together.' }),
  ).toBeVisible();
  await page.getByLabel('Workspace name').fill('Rivera Studio');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }),
  ).toBeVisible();
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  if ((page.viewportSize()?.width || 1440) <= 700) {
    await toggle.waitFor({ state: 'visible' });
    await toggle.click();
  }
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
  await expect(
    page.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }),
  ).toBeVisible();
});
test('real pointer drag persists after reload', async ({ page }, info) => {
  await demo(page);
  await nav(page, 'Website redesign');
  const card = page
    .locator('.task-card')
    .filter({ has: page.getByRole('button', { name: 'Map the onboarding journey', exact: true }) });
  const handle = card.getByRole('button', { name: 'Move Map the onboarding journey' });
  const target = page.getByRole('region', { name: 'In progress', exact: true });
  const a = await handle.boundingBox();
  const b = await target.boundingBox();
  expect(a).toBeTruthy();
  expect(b).toBeTruthy();
  const moved = page.waitForResponse(
    (r) => r.url().endsWith('/api/data') && r.request().method() === 'POST',
    { timeout: 15000 },
  );
  if (info.project.name === 'mobile') {
    const cdp = await page.context().newCDPSession(page);
    const start = { x: a!.x + a!.width / 2, y: a!.y + a!.height / 2 };
    const end = {
      x: Math.min(b!.x + b!.width - 30, page.viewportSize()!.width - 35),
      y: b!.y + 100,
    };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    for (let i = 1; i <= 16; i++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: start.x + ((end.x - start.x) * i) / 16, y: start.y + ((end.y - start.y) * i) / 16 },
        ],
      });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
    await page.mouse.down();
    await page.mouse.move(a!.x + a!.width / 2 + 10, a!.y + a!.height / 2, { steps: 4 });
    await page.mouse.move(b!.x + b!.width - 30, b!.y + 100, { steps: 25 });
    await page.mouse.up();
  }
  expect((await moved).status()).toBe(200);
  await expect(
    target.getByRole('button', { name: 'Map the onboarding journey', exact: true }),
  ).toBeVisible();
  await page.reload();
  await nav(page, 'Website redesign');
  await expect(
    page
      .getByRole('region', { name: 'In progress', exact: true })
      .getByRole('button', { name: 'Map the onboarding journey', exact: true }),
  ).toBeVisible();
});
test('two independent browser sessions see task and comment updates; demo visitors stay isolated', async ({
  browser,
  page,
}, info) => {
  await demo(page);
  const storage = await page.context().storageState();
  const teammate = await browser.newContext({
    baseURL: BASE,
    storageState: storage,
    viewport: page.viewportSize()!,
    isMobile: info.project.name === 'mobile',
    hasTouch: info.project.name === 'mobile',
  });
  const second = await teammate.newPage();
  await second.goto('/');
  await nav(page, 'Website redesign');
  await nav(second, 'Website redesign');
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByLabel('Task title').fill('Cross-session collaboration proof');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(
    second.getByRole('button', { name: 'Cross-session collaboration proof', exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await second
    .getByRole('button', { name: 'Cross-session collaboration proof', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Cross-session collaboration proof', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Comment', exact: true })
    .fill('Hello from the first browser session');
  await page.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(
    second.getByText('Hello from the first browser session', { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await second.screenshot({
    path: `${SCREENSHOTS}/${info.project.name}-collaboration-session-two.png`,
    fullPage: true,
  });
  const visitor = await contextFor(browser, page);
  const third = await visitor.newPage();
  await demo(third);
  await nav(third, 'Website redesign');
  await third
    .getByRole('textbox', { name: 'Search tasks' })
    .fill('Cross-session collaboration proof');
  await expect(third.locator('.task-card')).toHaveCount(0);
  await visitor.close();
  await teammate.close();
});
test('invited member permissions, owner role changes and private attachments', async ({
  browser,
  page,
}) => {
  await demo(page);
  await nav(page, 'Settings & members');
  await page.getByRole('button', { name: 'Create invite link', exact: true }).click();
  const link = await page.getByRole('textbox', { name: 'Invitation link' }).inputValue();
  const context = await contextFor(browser, page);
  const member = await context.newPage();
  const email = `member.${crypto.randomUUID()}@test.invalid`;
  const signup = await context.request.post('/api/auth/sign-up/email', {
    headers: { Origin: BASE },
    data: { name: 'E2E Member', email, password: crypto.randomUUID() + crypto.randomUUID() },
  });
  expect(signup.status()).toBe(200);
  await member.goto(link);
  await member.getByRole('button', { name: 'Join workspace', exact: true }).click();
  await expect(
    member.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }),
  ).toBeVisible();
  await nav(member, 'Projects');
  await expect(member.getByRole('button', { name: 'New project', exact: true })).toHaveCount(0);
  const data = await (await context.request.get('/api/data')).json();
  const denied = await context.request.post('/api/data', {
    headers: { Origin: BASE },
    data: { action: 'createProject', workspaceId: data.workspace.id, name: 'Forbidden' },
  });
  expect(denied.status()).toBe(403);
  await expect(page.getByRole('combobox', { name: 'Role for E2E Member' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Role for E2E Member' }).selectOption('ADMIN');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(member.getByRole('button', { name: 'New project', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await nav(member, 'Website redesign');
  await member.getByRole('button', { name: 'Map the onboarding journey', exact: true }).click();
  await member.locator('input[type=file]').setInputFiles({
    name: 'review-notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Private notes shared only with workspace members.'),
  });
  const attachment = member.getByRole('link', { name: /review-notes.txt/ });
  await expect(attachment).toBeVisible();
  const href = await attachment.getAttribute('href');
  const download = await context.request.get(href!);
  expect(download.status()).toBe(200);
  expect(await download.text()).toContain('Private notes');
  expect(download.headers()['content-disposition']).toContain('attachment;');
  const outsider = await browser.newContext();
  expect((await outsider.request.get(BASE + href)).status()).toBe(401);
  await outsider.close();
  await context.close();
});
