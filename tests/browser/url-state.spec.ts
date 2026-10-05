import { expect, test } from '@playwright/test';
import { tid } from './ids';

test('a link opens its lab at the scenario, tick, camera and layers it encodes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/#/electron/spin?axis=x&cam=orbit&t=120&L=%2Bradius');
  await expect(page.locator('.workbench-breadcrumb [aria-current=page]').filter({ visible: true })).toHaveText('Spin in the field');
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 120');
  await expect(page.getByRole('radio', { name: 'Orbit', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'X', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('tab', { name: 'View', exact: true }).filter({ visible: true }).click();
  await expect(tid(page, 'layer-radius')).toHaveAttribute('aria-pressed', 'true');
  // The address bar keeps the state it opened with (it is written back unchanged).
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/electron/spin?axis=x&cam=orbit&t=120&L=+radius');
  expect(errors).toEqual([]);
});

test('the address bar follows changes, Copy link writes it at once, and invalid link settings are dropped with a notice', async ({ page }) => {
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled();
  await page.getByRole('slider', { name: /Peak pair separation/ }).press('End');
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/medium/balanced?separation=0.8');
  await page.getByRole('radio', { name: 'Top', exact: true }).click();
  await page.keyboard.press('Control+Shift+c');
  await expect(tid(page, 'notice').filter({ visible: true })).toContainText(/Link copied|Copy this link/);
  expect(await page.evaluate(() => location.hash)).toBe('#/medium/balanced?separation=0.8&cam=top');
  await page.evaluate(() => { location.hash = '#/light?wavelength=9&bogus=1'; });
  await expect(page.getByTestId('light-tick')).toBeVisible();
  await expect(tid(page, 'notice').filter({ visible: true })).toContainText('Ignored link settings that don’t apply: wavelength, bogus');
});

test('a link can carry the selection: Light opens with its pair pinned', async ({ page }) => {
  await page.goto('/#/light?sel=3');
  await expect(page.getByTestId('light-tick')).toBeVisible();
  await page.getByRole('tab', { name: 'Selection', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('.light-selection-head h3')).toHaveText('Pair 4');
  await expect(page.getByRole('button', { name: 'Follow active', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/light?sel=3');
});
