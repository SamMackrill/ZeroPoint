import { expect, test, type Page } from '@playwright/test';
import { tid } from './ids';

// The main-thread model advances at most 0.1 s × speed per animation frame, so slow software-rendered CI needs longer than the 5 s default.
const SIM_TIMEOUT = 30_000;

/** Open the Casimir laboratory and return its application container. */
async function openExperiment(page: Page) {
  await page.goto('/');
  if (page.viewportSize()!.width < 850) await tid(page, 'nav-open').click();
  await tid(page, 'lab-casimir').click();
  await expect(page.getByRole('heading', { name: 'Motion from the vacuum' })).toBeVisible();
  return page.locator('.casimir-app');
}

test('charge modes, pressure, transport and retained paused navigation', async ({ page }) => {
  test.slow(); // Runs the simulation past 5 τ twice; on software-rendered CI that alone can exceed the 30 s default.
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const app = await openExperiment(page);
  await expect(page.getByTestId('casimir-time')).toHaveText('0.00 τ');
  await app.getByTestId('transport-step').click();
  await expect(page.getByTestId('casimir-time')).toHaveText('0.03 τ');
  await app.getByTestId('transport-speed').selectOption('2');
  await app.getByTestId('transport-run').click();
  await expect.poll(async () => Number.parseFloat(await page.getByTestId('casimir-time').innerText()), { timeout: SIM_TIMEOUT }).toBeGreaterThan(5);
  await app.getByTestId('transport-run').click();
  await expect(page.getByTestId('motion-tendency')).toHaveText('Apart');
  expect(Number(await page.getByTestId('pressure-difference').innerText().then(t => t.split(' ')[0]))).toBeGreaterThan(0);
  await app.screenshot({ path: 'test-results/casimir-repulsion.png' });
  await app.getByTestId('scenario-electron-proton').click();
  await expect(page.getByTestId('casimir-time')).toHaveText('0.00 τ');
  await app.getByTestId('transport-run').click();
  await expect.poll(async () => Number.parseFloat(await page.getByTestId('casimir-time').innerText()), { timeout: SIM_TIMEOUT }).toBeGreaterThan(5);
  await app.getByTestId('transport-run').click();
  await expect(page.getByTestId('motion-tendency')).toHaveText('Together');
  await app.screenshot({ path: 'test-results/casimir-attraction.png' });
  await app.getByTestId('layer-pressure').uncheck();
  await app.getByTestId('layer-interactions').uncheck();
  await app.getByTestId('layer-zeptons').uncheck();
  await expect(app.getByTestId('layer-pressure')).not.toBeChecked();
  await app.getByRole('button', { name: 'Release charges' }).click();
  await expect(app.getByRole('button', { name: 'Hold charges' })).toBeVisible();
  await app.getByRole('button', { name: 'Hold charges' }).click();
  const time = await page.getByTestId('casimir-time').innerText();
  await app.getByTestId('transport-run').click();
  await tid(page, 'lab-medium').click();
  await tid(page, 'lab-casimir').click();
  await expect(app.getByTestId('transport-run')).toContainText('Run');
  const held = await page.getByTestId('casimir-time').innerText();
  expect(Number.parseFloat(held)).toBeGreaterThanOrEqual(Number.parseFloat(time));
  await page.waitForTimeout(200);
  await expect(page.getByTestId('casimir-time')).toHaveText(held);
  await app.getByTestId('transport-reset').click();
  await expect(page.getByTestId('casimir-time')).toHaveText('0.00 τ');
  expect(errors).toEqual([]);
});

test('pinned Zepton finishes its own lifetime and does not inherit a new identity', async ({ page }) => {
  const app = await openExperiment(page);
  await app.getByRole('button', { name: 'Inspect newest Zepton' }).click();
  const identity = await app.locator('.casimir-life-heading strong').innerText();
  await expect(app.getByLabel('Follow next birth after annihilation')).not.toBeChecked();
  await app.getByTestId('transport-speed').selectOption('2');
  await app.getByTestId('transport-run').click();
  await expect(app.getByText('Lifetime complete', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(app.locator('.casimir-life-heading strong')).toHaveText(identity);
  await expect(app.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await app.getByLabel('Follow next birth after annihilation').check();
  await expect(app.locator('.casimir-life-heading strong')).not.toHaveText(identity);
  await app.getByTestId('transport-run').click();
});

test('mobile controls and source notes fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const app = await openExperiment(page);
  await app.getByTestId('scenario-electron-proton').click();
  await app.getByLabel('Initial charge separation').fill('4');
  await app.getByTestId('transport-step').click();
  await app.getByRole('button', { name: 'Illustrative model' }).click();
  await expect(app.getByText(/Section 5 leaves the quantitative force law unresolved/)).toBeVisible();
  const link = app.getByRole('link', { name: 'Read Section 4' });
  const response = await page.request.get((await link.getAttribute('href'))!.split('#')[0]);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('pdf');
  await app.screenshot({ path: 'test-results/casimir-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
