import { test, expect } from '@playwright/test';

/** Open the light laboratory and wait for worker readiness. */
async function openLight(page: import('@playwright/test').Page) {
  await page.goto('/');
  if (page.viewportSize()!.width < 850) await page.getByRole('button', { name: 'Open experiment library' }).click();
  await page.getByRole('button', { name: /Light through the zero-point field Explore/ }).click();
  await expect(page.getByRole('button', { name: 'Run light', exact: true })).toBeEnabled();
}

test('light handoffs, fixed-centre inspection, replay, files and switching preserve state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openLight(page);
  await page.getByRole('button', { name: 'Next induction', exact: true }).click();
  await expect(page.getByTestId('light-tick')).toContainText('Tick 120');
  await expect(page.getByTestId('light-rotation')).toHaveText('0.0° / -180°');
  await page.getByRole('button', { name: 'Pin pair', exact: true }).click();
  const centre = await page.getByTestId('light-pair-centre').innerText();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByTestId('light-pair-centre')).toHaveText(centre);
  await expect(page.getByTestId('light-rotation')).toHaveText('-1.5° / -180°');
  await page.getByRole('button', { name: 'Capture checkpoint' }).click();
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save light', exact: true }).click();
  const download = await downloadPromise, path = await download.path();
  await page.getByRole('button', { name: 'Reset', exact: true }).click(); await expect(page.getByTestId('light-tick')).toContainText('Tick 0 ');
  await page.getByRole('button', { name: 'Restore tick 121' }).click(); await expect(page.getByTestId('light-tick')).toContainText('Tick 121');
  await page.getByLabel('Import light experiment').setInputFiles(path!); await expect(page.getByRole('status', { name: 'Light experiment status' })).toContainText('Loaded tick 121');
  await page.getByLabel('Import light experiment').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByRole('status', { name: 'Light experiment status' })).toContainText('Could not load'); await expect(page.getByTestId('light-tick')).toContainText('Tick 121');
  await page.getByRole('button', { name: 'Medium laboratory', exact: true }).click();
  await page.getByRole('button', { name: 'Step', exact: true }).click(); await expect(page.getByTestId('tick')).toHaveText('Tick 1');
  await page.getByRole('button', { name: /Light through the zero-point field Explore/ }).click();
  await expect(page.getByTestId('light-tick')).toContainText('Tick 121');
  await page.getByRole('button', { name: 'Run light', exact: true }).click();
  await expect.poll(async () => parseInt((await page.getByTestId('light-tick').innerText()).split(' ')[1])).toBeGreaterThan(121);
  await page.getByRole('button', { name: 'Pause light', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run light', exact: true })).toBeVisible();
  const paused = await page.getByTestId('light-tick').innerText(); await page.waitForTimeout(180); await expect(page.getByTestId('light-tick')).toHaveText(paused);
  const imagePromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export light image' }).click(); expect((await imagePromise).suggestedFilename()).toBe('zeropoint-light.png');
  await page.getByRole('slider', { name: 'Light timeline' }).press('End');
  await expect(page.getByTestId('light-tick')).toContainText('Tick 1440'); await expect(page.getByRole('button', { name: 'Run light', exact: true })).toBeDisabled();
  await expect(page.getByTestId('light-energy-residual')).toHaveText('0.0e+0 eV');
  expect(errors).toEqual([]);
});

test('light configuration, layers, mobile layout and exports work together', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await openLight(page);
  await page.getByRole('slider', { name: 'Wavelength', exact: true }).press('End');
  await page.getByRole('slider', { name: 'Polarization angle' }).fill('90');
  await page.getByLabel('Travel direction', { exact: true }).selectOption('-1');
  await page.getByRole('button', { name: 'Apply and restart sequence' }).click();
  await page.getByRole('button', { name: 'Next induction', exact: true }).click();
  await expect(page.getByTestId('light-tick')).toContainText('Tick 240'); await expect(page.getByTestId('light-pair-centre')).toHaveText('3.000 L');
  await page.getByLabel('Background pairs', { exact: true }).uncheck(); await page.getByLabel('E / B wave and arrows').uncheck();
  await page.getByRole('button', { name: 'Pair close-up', exact: true }).click();
  const before = await page.getByTestId('light-tick').innerText();
  await page.getByLabel('Reduced flashing & camera motion').check(); await expect(page.getByTestId('light-tick')).toHaveText(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const csv = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export sequence CSV' }).click(); expect((await csv).suggestedFilename()).toContain('illustrative-sequence.csv');
  const doc = await page.request.get('/docs/light-model.md'); expect(doc.ok()).toBe(true); expect(await doc.text()).toContain('light-induction/1');
  await page.screenshot({ path: 'test-results/light-mobile.png', fullPage: true });
});

test('light pauses when hidden and recovers graphics without losing its timeline', async ({ page }) => {
  await openLight(page);
  await page.getByRole('button', { name: 'Run light', exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('button', { name: 'Run light', exact: true })).toBeVisible();
  await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; });
  await page.getByRole('button', { name: 'Next induction', exact: true }).click();
  await expect(page.getByTestId('light-tick')).toContainText('Tick 120');
  const before = await page.getByTestId('light-tick').innerText();
  await page.locator('.light-viewport canvas').evaluate((canvas: HTMLCanvasElement) => canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.getByRole('heading', { name: 'Light viewport needs attention' })).toBeVisible();
  await page.getByRole('button', { name: 'Recover light viewport' }).click();
  await expect(page.getByRole('heading', { name: 'Light viewport needs attention' })).not.toBeVisible();
  await expect(page.getByTestId('light-tick')).toHaveText(before);
  await page.getByRole('slider', { name: 'Light timeline' }).fill('780');
  await expect(page.getByTestId('light-tick')).toContainText('Tick 780');
  await page.screenshot({ path: 'test-results/light-desktop.png', fullPage: true });
});
