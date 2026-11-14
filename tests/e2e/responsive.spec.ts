import { test, expect } from '@playwright/test';
test.beforeEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 11000));
});
const SCREENSHOTS = process.env.E2E_SCREENSHOT_DIR || 'docs/screenshots';
test('tablet overview, board, theme and contained horizontal scrolling', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar demo' }).click();
  await expect(
    page.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }),
  ).toBeVisible({ timeout: 45000 });
  await page.screenshot({ path: `${SCREENSHOTS}/tablet-overview.png`, fullPage: true });
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Website redesign', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Website redesign', exact: true })).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOTS}/tablet-board.png`, fullPage: true });
  const viewport = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: innerWidth,
    board: document.querySelector('.kanban')!.scrollWidth,
    client: document.querySelector('.kanban')!.clientWidth,
  }));
  expect(viewport.scroll).toBeLessThanOrEqual(viewport.width);
  expect(viewport.board).toBeGreaterThan(viewport.client);
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: `${SCREENSHOTS}/tablet-light-board.png`, fullPage: true });
});
