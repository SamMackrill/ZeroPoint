import { expect, test, type Page } from '@playwright/test';
import { tid } from './ids';

// The main-thread model advances at most 0.1 s × speed per animation frame, so slow software-rendered CI needs longer than the 5 s default.
const SIM_TIMEOUT = 30_000;

/** Whether the page is in the narrow (drawer) layout. */
const narrow = (page: Page) => page.viewportSize()!.width <= 850;
/** Open the Casimir laboratory and return its workbench container. */
async function openExperiment(page: Page) {
  await page.goto('/');
  if (narrow(page)) await tid(page, 'nav-open').click();
  await tid(page, 'lab-casimir').click();
  await expect(page.getByTestId('casimir-time')).toBeVisible();
  return page.locator('.casimir-workbench-root');
}
/** Choose a pairing from the rail. */
async function pairing(page: Page, id: string) { if (narrow(page)) await tid(page, 'nav-open').click(); await tid(page, `scenario-${id}`).click(); }
/** Open an inspector tab (through the drawer on narrow screens). */
async function inspector(page: Page, name: 'Setup' | 'View' | 'Selection') {
  if (narrow(page)) await page.getByRole('button', { name: 'Open inspector' }).click();
  await page.getByRole('tab', { name, exact: true }).filter({ visible: true }).click();
}
const time = (page: Page) => page.getByTestId('casimir-time').filter({ visible: true });

test('charge modes, pressure, transport and retained paused navigation', async ({ page }) => {
  test.slow(); // Runs the simulation past 5 τ twice; on software-rendered CI that alone can exceed the 30 s default.
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const app = await openExperiment(page);
  await expect(time(page)).toHaveText('0.00 τ');
  await tid(page, 'transport-step').click();
  await expect(time(page)).toHaveText('0.03 τ');
  await page.getByRole('radio', { name: '2× speed' }).filter({ visible: true }).click();
  await tid(page, 'transport-run').click();
  await expect.poll(async () => Number.parseFloat(await time(page).innerText()), { timeout: SIM_TIMEOUT }).toBeGreaterThan(5);
  await tid(page, 'transport-run').click();
  await expect(tid(page, 'motion-tendency')).toHaveText('Apart');
  expect(Number(await tid(page, 'pressure-difference').innerText())).toBeGreaterThan(0);
  await app.screenshot({ path: 'test-results/casimir-repulsion.png' });
  await pairing(page, 'electron-proton');
  await expect(time(page)).toHaveText('0.00 τ');
  await tid(page, 'transport-run').click();
  await expect.poll(async () => Number.parseFloat(await time(page).innerText()), { timeout: SIM_TIMEOUT }).toBeGreaterThan(5);
  await tid(page, 'transport-run').click();
  await expect(tid(page, 'motion-tendency')).toHaveText('Together');
  await app.screenshot({ path: 'test-results/casimir-attraction.png' });
  await inspector(page, 'View');
  for (const key of ['pressure', 'interactions', 'zeptons']) await tid(page, `layer-${key}`).click();
  await expect(tid(page, 'layer-pressure')).toHaveAttribute('aria-pressed', 'false');
  await inspector(page, 'Setup');
  await page.getByRole('radio', { name: 'Released', exact: true }).click();
  await expect(page.getByText('Charges respond to the measured pressure difference.')).toBeVisible();
  await page.getByRole('radio', { name: 'Held', exact: true }).click();
  const held = await time(page).innerText();
  await tid(page, 'transport-run').click();
  await tid(page, 'lab-medium').click();
  await tid(page, 'lab-casimir').click();
  await expect(tid(page, 'transport-run')).toContainText('Run');
  const after = await time(page).innerText();
  expect(Number.parseFloat(after)).toBeGreaterThanOrEqual(Number.parseFloat(held));
  await page.waitForTimeout(200);
  await expect(time(page)).toHaveText(after);
  await tid(page, 'transport-reset').click();
  await expect(time(page)).toHaveText('0.00 τ');
  expect(errors).toEqual([]);
});

test('pinned Zepton finishes its own lifetime and does not inherit a new identity', async ({ page }) => {
  const app = await openExperiment(page);
  await inspector(page, 'Selection');
  await app.getByRole('button', { name: 'Inspect newest Zepton' }).click();
  const identity = await app.locator('.casimir-life-heading strong').innerText();
  await expect(app.getByLabel('Follow next birth after annihilation')).not.toBeChecked();
  await page.getByRole('radio', { name: '2× speed' }).click();
  await tid(page, 'transport-run').click();
  await expect(app.getByText('Lifetime complete', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(app.locator('.casimir-life-heading strong')).toHaveText(identity);
  await expect(app.getByRole('progressbar', { name: 'Zepton lifetime' })).toHaveAttribute('aria-valuenow', '100');
  await app.getByLabel('Follow next birth after annihilation').check();
  await expect(app.locator('.casimir-life-heading strong')).not.toHaveText(identity);
  await tid(page, 'transport-run').click();
  // The loupe opens 2-up beside the scene; 1-up returns it to the Selection tab.
  await expect(app.getByRole('region', { name: 'Lifetime loupe' }).locator('.casimir-loupe')).toBeVisible();
  await expect(app.locator('.casimir-selection .casimir-loupe')).toHaveCount(0);
  await app.getByTestId('split-toggle').click();
  await expect(app.getByRole('region', { name: 'Lifetime loupe' })).toHaveCount(0);
  await expect(app.locator('.casimir-selection .casimir-loupe')).toBeVisible();
});

test('mobile controls and source notes fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const app = await openExperiment(page);
  await pairing(page, 'electron-proton');
  await inspector(page, 'Setup');
  const separation = page.getByRole('textbox', { name: /^Initial separation/ }); await separation.fill('4'); await separation.press('Enter');
  await tid(page, 'params-apply').click();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await tid(page, 'transport-step').click();
  await page.getByRole('button', { name: 'Illustrative model' }).click();
  await expect(app.getByText(/Section 5 leaves the quantitative force law unresolved/)).toBeVisible();
  const link = app.getByRole('link', { name: 'Read Section 4' });
  const response = await page.request.get((await link.getAttribute('href'))!.split('#')[0]);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('pdf');
  await app.screenshot({ path: 'test-results/casimir-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
