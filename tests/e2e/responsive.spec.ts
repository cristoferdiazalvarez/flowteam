import { test, expect } from '@playwright/test';
test('tablet overview, board, theme and contained horizontal scrolling', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar demo' }).click();
  await expect(
    page.getByRole('heading', { name: 'A little clarity. A lot of possibility.' }),
  ).toBeVisible({ timeout: 45000 });
  await page.screenshot({ path: 'docs/screenshots/tablet-overview.png', fullPage: true });
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Website redesign', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Website redesign', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/tablet-board.png', fullPage: true });
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
  await page.screenshot({ path: 'docs/screenshots/tablet-light-board.png', fullPage: true });
});
