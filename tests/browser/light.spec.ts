import { test, expect } from '@playwright/test';
import { tid } from './ids';

/** Open the light laboratory and wait for worker readiness. */
async function openLight(page: import('@playwright/test').Page) {
  await page.goto('/');
  if (page.viewportSize()!.width <= 850) await tid(page, 'nav-open').click();
  await tid(page, 'lab-light').click();
  await expect(tid(page, 'transport-run')).toBeEnabled();
}

test('light handoffs, fixed-centre inspection, replay, files and switching preserve state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openLight(page);
  await tid(page, 'transport-next').click();
  await expect(page.getByTestId('light-tick')).toContainText('Tick 120');
  await expect(page.getByTestId('light-rotation')).toHaveText('0.0° / -180°');
  await page.getByRole('tab', { name: 'Selection', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Pin pair', exact: true }).click();
  await page.getByRole('radio', { name: 'Pair close-up', exact: true }).click(); await expect(page.getByRole('radio', { name: 'Pair close-up', exact: true })).toHaveAttribute('aria-checked', 'true');
  const centre = await page.getByTestId('light-pair-centre').innerText();
  await tid(page, 'transport-step').click();
  await expect(page.getByTestId('light-pair-centre')).toHaveText(centre);
  await expect(page.getByTestId('light-rotation')).toHaveText('-1.5° / -180°');
  await page.keyboard.press('f'); await expect(page.getByRole('radio', { name: 'Pair close-up', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Pin pair', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pin pair', exact: true }).click();
  await tid(page, 'capture').click();
  const downloadPromise = page.waitForEvent('download'); await tid(page, 'file-save').click();
  const download = await downloadPromise, path = await download.path();
  await tid(page, 'transport-reset').click(); await expect(page.getByTestId('light-tick')).toContainText('Tick 0 ');
  await page.getByRole('button', { name: 'Restore tick 121' }).click(); await expect(page.getByTestId('light-tick')).toContainText('Tick 121');
  await tid(page, 'file-input').setInputFiles(path!); await expect(tid(page, 'notice')).toContainText('Loaded tick 121');
  await tid(page, 'file-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(tid(page, 'notice')).toContainText('Could not load'); await expect(page.getByTestId('light-tick')).toContainText('Tick 121');
  await tid(page, 'lab-medium').click();
  await tid(page, 'transport-step').click(); await expect(page.getByTestId('tick')).toHaveText('Tick 1');
  await tid(page, 'lab-light').click();
  await expect(page.getByTestId('light-tick')).toContainText('Tick 121');
  await tid(page, 'transport-run').click();
  await expect.poll(async () => parseInt((await page.getByTestId('light-tick').innerText()).split(' ')[1])).toBeGreaterThan(121);
  await tid(page, 'transport-run').click();
  await expect(tid(page, 'transport-run')).toContainText('Run');
  const paused = await page.getByTestId('light-tick').innerText(); await page.waitForTimeout(180); await expect(page.getByTestId('light-tick')).toHaveText(paused);
  await tid(page, 'export-menu').click(); const imagePromise = page.waitForEvent('download'); await tid(page, 'export-png').click(); expect((await imagePromise).suggestedFilename()).toBe('zeropoint-light.png');
  await tid(page, 'timeline').press('End');
  await expect(page.getByTestId('light-tick')).toContainText('Tick 1440'); await expect(tid(page, 'transport-run')).toBeDisabled();
  await tid(page, 'dock-ledger').click(); await expect(page.getByTestId('light-energy-residual')).toHaveText('0.0e+0 eV');
  expect(errors).toEqual([]);
});

test('light configuration, layers, mobile layout and exports work together', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await openLight(page);
  await page.getByRole('button', { name: 'Open inspector' }).click();
  await page.getByRole('slider', { name: 'Wavelength', exact: true }).press('End');
  const polarization = page.getByRole('textbox', { name: /^Polarization angle/ }); await polarization.fill('90'); await polarization.press('Enter');
  await page.getByRole('radio', { name: '−X', exact: true }).click();
  await tid(page, 'params-apply').click();
  await page.getByRole('tab', { name: 'View', exact: true }).click();
  await tid(page, 'layer-background').click(); await expect(tid(page, 'layer-background')).toHaveAttribute('aria-pressed', 'false');
  await tid(page, 'layer-fields').click();
  await tid(page, 'setting-reduced-motion').check();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await tid(page, 'transport-next').click();
  await expect(page.getByTestId('light-tick')).toContainText('Tick 240');
  await page.getByRole('button', { name: 'Open inspector' }).click(); await page.getByRole('tab', { name: 'Selection', exact: true }).click();
  await expect(page.getByTestId('light-pair-centre')).toHaveText('3.000 L'); await page.getByRole('button', { name: 'Close inspector' }).click();
  const before = await page.getByTestId('light-tick').innerText(); await page.waitForTimeout(200); await expect(page.getByTestId('light-tick')).toHaveText(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tid(page, 'export-menu').click(); const csv = page.waitForEvent('download'); await tid(page, 'export-csv').click(); expect((await csv).suggestedFilename()).toContain('illustrative-sequence.csv');
  const doc = await page.request.get('/docs/light-model.md'); expect(doc.ok()).toBe(true); expect(await doc.text()).toContain('light-induction/1');
  await page.screenshot({ path: 'test-results/light-mobile.png', fullPage: true });
});

test('light pauses when hidden and recovers graphics without losing its timeline', async ({ page }) => {
  await openLight(page);
  await tid(page, 'transport-run').click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(tid(page, 'transport-run')).toContainText('Run');
  await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; });
  // A tick can land between Run and the hidden-tab pause on a slow runner; restart so the next induction is tick 120.
  await tid(page, 'transport-reset').click(); await expect(page.getByTestId('light-tick')).toContainText('Tick 0 ');
  await tid(page, 'transport-next').click();
  await expect(page.getByTestId('light-tick')).toContainText('Tick 120');
  const before = await page.getByTestId('light-tick').innerText();
  await page.locator('.light-viewport canvas').evaluate((canvas: HTMLCanvasElement) => canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.getByRole('heading', { name: 'Light viewport needs attention' })).toBeVisible();
  await page.getByRole('button', { name: 'Recover light viewport' }).click();
  await expect(page.getByRole('heading', { name: 'Light viewport needs attention' })).not.toBeVisible();
  await expect(page.getByTestId('light-tick')).toHaveText(before);
  await tid(page, 'timeline').fill('780');
  await expect(page.getByTestId('light-tick')).toContainText('Tick 780');
  await page.screenshot({ path: 'test-results/light-desktop.png', fullPage: true });
});
