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

test('Medium\'s B is a second simulation: the same state gives zero Δ, a different seed a non-zero Δ, and ◆ right-click pins B', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled();
  const root = page.locator('.medium-workbench'), deltas = root.locator('.dock-strip .dock-delta');
  await root.getByTestId('dock-compare').click(); await root.getByTestId('compare-pin').click();
  await expect(root.getByTestId('dock-compare')).toContainText('B');
  for (let i = 0; i < 20; i++) await tid(page, 'transport-step').click();
  await expect(page.getByTestId('tick')).toHaveText('Tick 20');
  // Deterministic: B continues identically from the pinned state, so every Δ is zero.
  await expect(deltas).toHaveCount(4);
  await expect.poll(async () => (await deltas.allInnerTexts()).every(text => /^Δ 0(\.0+)?$/.test(text.trim()))).toBe(true);
  // A different seed restarts A from tick 0; B re-runs from its pin, so the same ticks now differ.
  await page.getByRole('tab', { name: 'Setup', exact: true }).filter({ visible: true }).click();
  const seed = page.getByRole('textbox', { name: /^Random seed/ }).filter({ visible: true }); await seed.fill('7'); await seed.press('Enter');
  await tid(page, 'params-apply').click(); await expect(page.getByTestId('tick')).toHaveText('Tick 0');
  for (let i = 0; i < 20; i++) await tid(page, 'transport-step').click();
  await expect(root.getByTestId('compare-diff')).toContainText('Random seed');
  await expect.poll(async () => (await deltas.allInnerTexts()).some(text => /Δ [+−]/.test(text))).toBe(true);
  // A ◆ checkpoint pins B from its right-click menu.
  await page.keyboard.press('c'); await expect(root.locator('.timeline-marker')).toHaveCount(1);
  await root.locator('.timeline-marker').click({ button: 'right' });
  await expect(tid(page, 'notice').filter({ visible: true })).toContainText('Pinned the checkpoint at tick 20 as B');
  await expect.poll(async () => (await deltas.allInnerTexts()).every(text => /^Δ 0(\.0+)?$/.test(text.trim()))).toBe(true);
  expect(errors).toEqual([]);
});
