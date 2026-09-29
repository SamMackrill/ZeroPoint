import { expect, test } from '@playwright/test';
import { tid } from './ids';
import type { Page } from '@playwright/test';

/** Navigate from the workbench to the van der Waals experiment. */
async function openExperiment(page: Page) {
  await page.goto('/');
  if (page.viewportSize()!.width <= 850) await tid(page, 'nav-open').click();
  await tid(page, 'lab-vdw').click();
  await expect(page.getByRole('heading', { name: 'Van der Waals & vacuum pressure', exact: true })).toBeVisible();
}

test('dipole stages step, pause on navigation and retain independent state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openExperiment(page);
  await page.getByRole('slider', { name: 'Applied field' }).fill('0');
  await expect(page.getByRole('slider', { name: 'Applied field' })).toHaveValue('0');
  await page.getByRole('button', { name: 'Connect two dipoles' }).click();
  await page.getByRole('slider', { name: 'Pair separation' }).fill('2');
  await expect(page.getByTestId('vdw-pair-energy')).toHaveText('-0.01563');
  await tid(page, 'transport-step').click();
  await expect(page.getByTestId('vdw-phase')).toContainText('Phase 45°');
  await page.screenshot({ path: 'test-results/van-der-waals-dipoles.png', fullPage: true });
  await tid(page, 'transport-run').click();
  await expect(page.getByTestId('vdw-phase')).not.toContainText('Phase 45°');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(tid(page, 'transport-run')).toContainText('Run');
  await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; });
  await tid(page, 'transport-run').click();
  await tid(page, 'lab-medium').click();
  await tid(page, 'lab-vdw').click();
  await expect(tid(page, 'transport-run')).toContainText('Run');
  await expect(page.getByRole('slider', { name: 'Pair separation' })).toHaveValue('2');
  const phase = await page.getByTestId('vdw-phase').innerText();
  await page.waitForTimeout(180); await expect(page.getByTestId('vdw-phase')).toHaveText(phase);
  await tid(page, 'transport-reset').click();
  await expect(page.getByRole('slider', { name: 'Applied field' })).toHaveValue('0.8');
  expect(errors).toEqual([]);
});

test('plate gap and area change pressure and force, with source figures and CSV', async ({ page }) => {
  await openExperiment(page);
  await tid(page, 'scenario-pressure').click();
  await expect(page.getByTestId('vdw-pressure')).toHaveText('-0.8126 Pa');
  await page.getByRole('button', { name: '100 nm', exact: true }).click();
  await expect(page.getByTestId('vdw-pressure')).toHaveText('-13.00 Pa');
  await page.getByRole('slider', { name: 'Plate area' }).fill('2');
  await expect(page.getByTestId('vdw-force')).toHaveText('-26.00 μN');
  await expect(page.getByTestId('vdw-pressure')).toHaveText('-13.00 Pa');
  await tid(page, 'layer-modes').uncheck();
  await expect(page.getByTestId('vdw-pressure')).toHaveText('-13.00 Pa');
  await page.getByRole('slider', { name: 'Plate gap' }).fill('200');
  await expect(page.getByTestId('vdw-pressure')).toHaveText('-0.8126 Pa');
  const pending = page.waitForEvent('download');
  await tid(page, 'export-csv').click();
  expect((await pending).suggestedFilename()).toBe('van-der-waals-pressure-sweep.csv');
  await page.locator('.vdw-sources summary').click();
  const figures = page.locator('.vdw-source-grid img');
  await expect(figures).toHaveCount(4);
  for (const img of await figures.all()) { await img.scrollIntoViewIfNeeded(); await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0); }
  const doc = await page.request.get('/docs/van-der-waals-model.md'); expect(doc.ok()).toBe(true);
  await page.locator('.vdw-sources summary').click();
  await tid(page, 'layer-modes').check();
  await page.screenshot({ path: 'test-results/van-der-waals-desktop.png', fullPage: true });
});

test('mobile stages and pressure controls remain accessible without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExperiment(page);
  await tid(page, 'scenario-pressure').click();
  await page.getByRole('slider', { name: 'Plate gap' }).fill('1000');
  await expect(page.getByTestId('vdw-pressure')).toHaveText('-0.001300 Pa');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.vdw-diagram').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/van-der-waals-mobile.png', fullPage: true });
});
