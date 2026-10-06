import { expect, test } from '@playwright/test';
import { tid } from './ids';

test('tablets get the overlay rail and inspector, a full-height viewport and the dock collapsed to its strip', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/'); await expect(tid(page, 'transport-run').filter({ visible: true })).toBeEnabled();
  await expect(tid(page, 'nav-open').filter({ visible: true })).toBeVisible();
  await expect(page.locator('.medium-workbench .dock')).toHaveClass(/is-collapsed/);
  await expect(page.locator('.medium-workbench .dock-strip')).toBeVisible();
  const viewport = (await page.locator('.medium-workbench .workbench-viewport').boundingBox())!;
  expect(viewport.height).toBeGreaterThan(450);
  await expect(page.locator('.medium-workbench').getByTestId('split-toggle')).toBeVisible(); // tablets keep the split view
});

test('phones are a basic viewer: no split view, Compare or palette, and the inspector is a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await expect(tid(page, 'transport-run').filter({ visible: true })).toBeEnabled();
  const root = page.locator('.medium-workbench');
  await expect(root.getByTestId('split-toggle')).toHaveCount(0);
  await expect(root.getByTestId('dock-compare')).toHaveCount(0);
  await page.keyboard.press('Control+k'); await expect(page.getByRole('combobox', { name: 'Command palette' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open inspector' }).click();
  const sheet = (await page.getByRole('dialog', { name: 'Inspector' }).boundingBox())!;
  expect(Math.round(sheet.y + sheet.height)).toBe(844); // anchored to the bottom
  expect(sheet.width).toBe(390);
  await page.getByRole('button', { name: 'Close inspector' }).click();
  // Casimir's loupe has no split pane on a phone, so it stays in Selection.
  await tid(page, 'nav-open').filter({ visible: true }).click(); await tid(page, 'lab-casimir').filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Open inspector' }).filter({ visible: true }).click();
  await page.getByRole('tab', { name: 'Selection', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('.casimir-selection .casimir-loupe').filter({ visible: true })).toBeVisible();
});

test('from 1280 to 1439 px the rail starts collapsed to icons on the first visit', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled();
  await expect.poll(async () => (await page.locator('.medium-workbench .workbench-rail').boundingBox())?.width ?? 0).toBeLessThan(80);
});

test('below 851 px the camera presets collapse into a compact select that still switches the camera', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/'); await expect(tid(page, 'transport-run').filter({ visible: true })).toBeEnabled();
  const medium = page.locator('.medium-workbench');
  await expect(medium.getByTestId('camera')).toBeHidden();
  const select = medium.getByRole('combobox', { name: 'Camera' });
  await expect(select).toHaveValue('perspective');
  await select.click({ trial: true }); // it takes the pointer, though the top bar lets clicks through to the scene
  await select.selectOption('top');
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('cam=top');
  // Wider again, the segmented control shows the same preset.
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(medium.getByRole('radio', { name: 'Top', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(select).toBeHidden();
  // Light's top bar has its own rules; the select still shows, takes the pointer and switches the camera.
  await page.setViewportSize({ width: 800, height: 900 });
  await tid(page, 'nav-open').filter({ visible: true }).click(); await tid(page, 'lab-light').filter({ visible: true }).click();
  const light = page.locator('.light-workbench-root').getByRole('combobox', { name: 'Camera' });
  await light.click({ trial: true }); await light.selectOption({ index: 1 });
  await expect.poll(() => page.evaluate(() => location.hash)).toContain('cam=');
});
