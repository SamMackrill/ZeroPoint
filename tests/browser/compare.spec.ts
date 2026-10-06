import { expect, test } from '@playwright/test';
import { tid } from './ids';

test('Light compares A with a pinned B: zero Δ when identical, a diff, dashed series and Δ when A changes, copy and clear', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/#/light'); await expect(page.getByTestId('light-tick')).toBeVisible();
  const root = page.locator('.light-workbench-root'), strip = root.locator('.dock-strip');
  await tid(page, 'transport-next').click(); await expect(page.getByTestId('light-tick')).toContainText('Tick 120');
  await root.getByTestId('dock-compare').click();
  await root.getByTestId('compare-pin').click();
  await expect(root.getByTestId('dock-compare')).toContainText('B');
  await expect(root.locator('.workbench-status')).toContainText('B');
  await expect(strip).toContainText('Δ 0.000'); // identical A and B
  // Change A's wavelength (a restart parameter), then step to the same tick: B follows A's tick.
  await page.getByRole('tab', { name: 'Setup', exact: true }).filter({ visible: true }).click();
  const field = page.getByRole('textbox', { name: /^Wavelength/ }).filter({ visible: true }); await field.fill('750'); await field.press('Enter');
  await tid(page, 'params-apply').click();
  await tid(page, 'transport-next').click(); await expect(page.getByTestId('light-tick')).not.toContainText('Tick 0 '); // the next induction, later at a longer wavelength
  await expect(root.getByTestId('compare-diff')).toContainText('Wavelength');
  await expect(root.getByTestId('compare-diff')).toContainText('750 nm');
  await expect(root.getByTestId('compare-diff')).toContainText('500 nm');
  await expect(strip.locator('.dock-delta').filter({ hasText: /Δ [+−]/ }).first()).toBeVisible();
  await root.getByTestId('dock-plots').click();
  await expect(root.getByText('E projection · B').first()).toBeVisible();
  await root.getByTestId('dock-compare').click();
  await root.getByTestId('compare-copy').click();
  await expect(root.getByText(/same parameters/)).toBeVisible();
  await root.getByTestId('compare-clear').click();
  await expect(root.getByTestId('compare-pin')).toBeVisible();
  await expect(strip.locator('.dock-delta')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Electron compares spin projections with B dashed in the probe history, and a scenario change clears B', async ({ page }) => {
  await page.goto('/#/electron/spin'); await expect(page.getByTestId('electron-tick')).toBeVisible();
  const root = page.locator('.electron-workbench-root');
  await root.getByTestId('dock-compare').click(); await root.getByTestId('compare-pin').click();
  await page.getByRole('tab', { name: 'Setup', exact: true }).filter({ visible: true }).click();
  await page.getByRole('radio', { name: 'spin down' }).filter({ visible: true }).click(); await tid(page, 'params-apply').click();
  await tid(page, 'transport-next').click();
  await expect(root.getByTestId('compare-diff')).toContainText('Spin projection');
  await root.getByTestId('dock-probe').click();
  await expect(root.getByText('Eᵧ/E₀ · B').first()).toBeVisible();
  await page.goto('/#/electron/moving');
  await root.getByTestId('dock-compare').click();
  await expect(root.getByTestId('compare-pin')).toBeVisible();
});
