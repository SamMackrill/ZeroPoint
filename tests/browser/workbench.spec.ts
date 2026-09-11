import { test, expect } from '@playwright/test';
test('controls, inspection, checkpoints, files and error handling work end to end', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.getByRole('button', { name: /^Run/ })).toBeEnabled();
  await expect(page.getByTestId('tick')).toHaveText('Tick 0'); await page.waitForTimeout(300); await expect(page.getByTestId('tick')).toHaveText('Tick 0');
  await page.getByRole('button', { name: 'Step', exact: true }).click(); await expect(page.getByTestId('tick')).toHaveText('Tick 1');
  await page.getByRole('button', { name: /^Run/ }).click(); await expect(page.getByRole('button', { name: /^Pause/ })).toBeVisible();
  await expect.poll(async () => +(await page.getByTestId('tick').innerText()).replace('Tick ', '')).toBeGreaterThan(3);
  await page.getByRole('button', { name: /^Pause/ }).click(); await page.waitForTimeout(150); const paused = await page.getByTestId('tick').innerText(); await page.waitForTimeout(250); await expect(page.getByTestId('tick')).toHaveText(paused);
  await page.getByRole('button', { name: 'Dipole', exact: true }).click(); await page.getByRole('button', { name: 'Inspect first active dipole' }).click(); await expect(page.locator('.dipole-inspector h2')).toContainText('Dipole ');
  await page.getByRole('button', { name: 'Capture', exact: true }).click(); await expect(page.locator('.checkpoint-items button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Step', exact: true }).click(); await page.locator('.checkpoint-items button').click(); await expect(page.getByTestId('tick')).toHaveText(paused);
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save experiment' }).click(); const download = await downloadPromise; const path = await download.path(); expect(path).toBeTruthy();
  await page.getByRole('button', { name: 'Reset', exact: true }).click(); await expect(page.getByTestId('tick')).toHaveText('Tick 0');
  await page.getByLabel('Import experiment file').setInputFiles(path!); await expect(page.getByTestId('tick')).toHaveText(paused);
  await page.getByLabel('Import experiment file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"bad"}') }); await expect(page.getByRole('status')).toContainText('Could not load file'); await expect(page.getByTestId('tick')).toHaveText(paused);
  await page.getByRole('button', { name: 'Parameters', exact: true }).click(); await page.getByLabel('Random seed').fill('42'); await page.getByRole('button', { name: 'Apply seed and reset' }).click(); await expect(page.getByTestId('tick')).toHaveText('Tick 0'); await expect(page.locator('.statusbar')).toContainText('Seed 42');
  await page.getByRole('button', { name: /Sparse fluctuations/ }).click(); await expect(page.locator('h1')).toHaveText('Sparse fluctuations');
  await page.getByRole('button', { name: 'Points', exact: true }).click(); await expect(page.getByRole('button', { name: 'Points', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Energy density slice', { exact: true }).check(); await expect(page.getByRole('slider', { name: 'Slice Z' })).toBeVisible();
  await page.getByRole('button', { name: 'About the model' }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('slider', { name: /Jitter/ })).toHaveCount(0);
  await page.getByRole('slider', { name: /Peak pair separation/ }).press('End');
  await expect(page.getByRole('slider', { name: /Peak pair separation/ })).toHaveValue('0.8');
  await page.getByRole('button', { name: 'Dipole', exact: true }).click(); await page.getByRole('button', { name: 'Inspect first active dipole' }).click();
  const centre = page.locator('.readout-list div').filter({ has: page.locator('dt', { hasText: 'Fixed centre' }) }).locator('dd');
  const position = await centre.innerText(); await page.getByRole('button', { name: 'Step', exact: true }).click(); await expect(page.getByTestId('tick')).toHaveText('Tick 1'); await expect(centre).toHaveText(position);
  await page.getByRole('button', { name: /Beyond the medium/ }).click(); await expect(page.getByRole('heading', { name: 'Casimir effect · planned' })).toBeVisible();
  const casimirLink = page.getByRole('link', { name: 'Read experiment plan' });
  const response = await page.request.get((await casimirLink.getAttribute('href'))!); expect(response.ok()).toBe(true); expect(await response.text()).toContain('Status: planned, not implemented'); await page.keyboard.press('Escape');
  expect(errors).toEqual([]); await page.screenshot({ path: 'test-results/workbench-desktop.png', fullPage: true });
});
test('narrow layout provides working drawers and has no horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/'); await expect(page.getByRole('button', { name: /^Run/ })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open experiment library' }).click(); await page.getByRole('button', { name: /Slow oscillations/ }).click(); await expect(page.locator('h1')).toHaveText('Slow oscillations');
  await page.getByRole('button', { name: 'Open inspector' }).click(); await expect(page.getByLabel('Creation rate')).toBeVisible(); await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.screenshot({ path: 'test-results/workbench-mobile.png', fullPage: true });
});

test('parameter edits are acknowledged, hidden tabs pause, and a lost viewport recovers', async ({ page }) => {
  await page.goto('/'); await expect(page.getByRole('button', { name: /^Run/ })).toBeEnabled(); await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('slider', { name: /Frequency centre/ }).press('End');
  await expect(page.getByRole('slider', { name: /Frequency centre/ })).toHaveValue('3');
  await expect(page.locator('.reservoir-readout')).toContainText('Parameter revision: 1');
  await page.getByRole('button', { name: 'Event log', exact: true }).click(); await expect(page.locator('.event-list')).toContainText('frequency 3 f₀');
  await page.getByRole('button', { name: /^Run/ }).click(); await expect(page.getByRole('button', { name: /^Pause/ })).toBeVisible();
  // Exercise the visibility handler deterministically; hardware tab scheduling varies in CI.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('button', { name: /^Run/ })).toBeVisible();
  await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; });
  const before = await page.getByTestId('tick').innerText(); await page.waitForTimeout(250); await expect(page.getByTestId('tick')).toHaveText(before);
  await page.evaluate(() => { const gl = document.querySelector('canvas')!.getContext('webgl2')!; gl.getExtension('WEBGL_lose_context')!.loseContext(); });
  await expect(page.getByRole('heading', { name: 'Viewport needs attention' })).toBeVisible();
  await page.getByRole('button', { name: 'Recover viewport' }).click(); await expect(page.getByRole('heading', { name: 'Viewport needs attention' })).not.toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1); await expect(page.getByTestId('tick')).toHaveText(before);
  const image = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export field image' }).click(); expect((await image).suggestedFilename()).toBe('zeropoint-field.png');
});

