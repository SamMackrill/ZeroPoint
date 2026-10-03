import { expect, test } from '@playwright/test';
import { tid } from './ids';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

/** Whether the page is in the narrow (drawer) layout. */
const narrow = (page: Page) => page.viewportSize()!.width <= 850;
/** Navigate from the workbench to the van der Waals experiment. */
async function openExperiment(page: Page) {
  await page.goto('/');
  if (narrow(page)) await tid(page, 'nav-open').click();
  await tid(page, 'lab-vdw').click();
  await expect(page.locator('.workbench-breadcrumb [aria-current=page]').filter({ visible: true })).toHaveText('Induce a dipole');
}
/** Choose a stage from the rail. */
async function stage(page: Page, id: string) { if (narrow(page)) await tid(page, 'nav-open').click(); await tid(page, `scenario-${id}`).click(); }
/** Type a value into a Setup parameter (through the inspector drawer on narrow screens). */
async function set(page: Page, label: string, value: string) {
  if (narrow(page)) await page.getByRole('button', { name: 'Open inspector' }).click();
  await page.getByRole('tab', { name: 'Setup', exact: true }).filter({ visible: true }).click();
  const field = page.getByRole('textbox', { name: new RegExp(`^${label}`) }).filter({ visible: true }); await field.fill(value); await field.press('Enter');
  if (narrow(page)) await page.getByRole('button', { name: 'Close inspector' }).click();
}
const value = (page: Page, id: string) => tid(page, id);

test('dipole stages step, pause on navigation and retain independent state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openExperiment(page);
  // Off the plate-pressure stage the dock has no tabs, so only its readout strip shows, fixed under the stage.
  await expect(page.locator('.vdw-workbench-root .workbench-stage .dock-strip')).toBeVisible();
  await set(page, 'Applied field', '0');
  await expect(page.getByRole('slider', { name: 'Applied field' })).toHaveAttribute('aria-valuenow', '0');
  await expect(tid(page, 'transport-run')).toHaveCount(0);
  await stage(page, 'correlated');
  await set(page, 'Pair separation', '2');
  await expect(value(page, 'vdw-pair-energy')).toHaveText('-0.01563');
  for (let i = 0; i < 15; i++) await tid(page, 'transport-step').click();
  await expect(value(page, 'vdw-phase')).toContainText('Phase 45°');
  await page.screenshot({ path: 'test-results/van-der-waals-dipoles.png', fullPage: true });
  await tid(page, 'transport-run').click();
  await expect(value(page, 'vdw-phase')).not.toContainText('Phase 45°');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(tid(page, 'transport-run')).toContainText('Run');
  await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; });
  await tid(page, 'transport-run').click();
  await tid(page, 'lab-medium').click();
  await tid(page, 'lab-vdw').click();
  await expect(tid(page, 'transport-run')).toContainText('Run');
  await expect(page.getByRole('slider', { name: 'Pair separation' })).toHaveAttribute('aria-valuenow', '2');
  const phase = await value(page, 'vdw-phase').innerText();
  await page.waitForTimeout(180); await expect(value(page, 'vdw-phase')).toHaveText(phase);
  await page.getByRole('button', { name: 'Reset to scenario' }).click();
  await stage(page, 'induced');
  await expect(page.getByRole('slider', { name: 'Applied field' })).toHaveAttribute('aria-valuenow', '0.8');
  expect(errors).toEqual([]);
});

test('plate gap and area change pressure and force, with source figures, CSV and files', async ({ page }) => {
  await openExperiment(page);
  await stage(page, 'pressure');
  await expect(value(page, 'vdw-pressure')).toHaveText('-0.8126 Pa');
  // Plate pressure can set Fleming's figures beside the diagram; \ toggles the split.
  const root = page.locator('.vdw-workbench-root'), figure = root.locator('.vdw-figure-pane img');
  await root.getByTestId('split-toggle').click();
  await expect(figure).toHaveAttribute('src', /figure-3-3\.jpeg$/);
  await expect.poll(() => figure.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('radio', { name: 'Fig. 3-4', exact: true }).click();
  await expect(figure).toHaveAttribute('src', /figure-3-4\.jpeg$/);
  await page.keyboard.press('Backslash'); await expect(figure).toHaveCount(0);
  await page.getByRole('button', { name: '100 nm', exact: true }).click();
  await expect(value(page, 'vdw-pressure')).toHaveText('-13.00 Pa');
  await set(page, 'Plate area', '2');
  await expect(value(page, 'vdw-force')).toHaveText('-26.00 μN');
  await expect(value(page, 'vdw-pressure')).toHaveText('-13.00 Pa');
  await page.getByRole('tab', { name: 'View', exact: true }).click();
  await tid(page, 'layer-modes').click(); await expect(tid(page, 'layer-modes')).toHaveAttribute('aria-pressed', 'false');
  await expect(value(page, 'vdw-pressure')).toHaveText('-13.00 Pa');
  await set(page, 'Plate gap', '200');
  await expect(value(page, 'vdw-pressure')).toHaveText('-0.8126 Pa');
  await tid(page, 'export-menu').click(); const pending = page.waitForEvent('download'); await tid(page, 'export-csv').click();
  expect((await pending).suggestedFilename()).toBe('van-der-waals-pressure-sweep.csv');
  const saving = page.waitForEvent('download'); await tid(page, 'file-save').click(); const file = await (await saving).path();
  expect(JSON.parse(await readFile(file!, 'utf8'))).toMatchObject({ format: 'zeropoint-vdw', scenario: 'pressure', params: { gap: 200, area: 2 }, view: { modes: false } });
  await stage(page, 'induced');
  await tid(page, 'file-input').setInputFiles(file!);
  await expect(tid(page, 'notice')).toContainText('Loaded the reveal the pressure stage');
  await expect(value(page, 'vdw-force')).toHaveText('-1.625 μN');
  await tid(page, 'file-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"zeropoint-vdw","version":1,"scenario":"pressure","params":{"gap":5}}') });
  await expect(tid(page, 'notice')).toContainText('Could not load');
  // Chapter 3's context and source figures are in the About sheet (the header chip, ? or Shift ?).
  await page.keyboard.press('Shift+Slash');
  const about = page.getByTestId('about-sheet');
  await expect(about).toContainText('From molecular attraction to a field pressure');
  await about.getByRole('tab', { name: 'Sources' }).click();
  const figures = about.locator('.vdw-source-grid img');
  await expect(figures).toHaveCount(4);
  for (const img of await figures.all()) { await img.scrollIntoViewIfNeeded(); await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0); }
  const doc = await page.request.get('/docs/van-der-waals-model.md'); expect(doc.ok()).toBe(true);
  await page.screenshot({ path: 'test-results/van-der-waals-desktop.png', fullPage: true });
});

test('mobile stages and pressure controls remain accessible without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExperiment(page);
  await stage(page, 'pressure');
  await set(page, 'Plate gap', '1000');
  await expect(value(page, 'vdw-pressure')).toHaveText('-0.001300 Pa');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.vdw-diagram').filter({ visible: true }).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/van-der-waals-mobile.png', fullPage: true });
});
