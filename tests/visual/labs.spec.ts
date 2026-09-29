import { expect, test, type Page } from '@playwright/test';

// Visual baselines for every lab and scenario in its initial, paused state. They guard the UI redesign against
// unintended visual change (docs/ui-redesign-plan.html §16). Baselines are recorded on Linux CI only, because font
// rasterisation differs between operating systems; CI writes missing baselines and uploads them as the
// `visual-snapshots` artifact, and `node scripts/stack.mjs snapshots` commits them. WebGL canvases and live
// telemetry are masked because software rendering and frame timing are not deterministic.
test.skip(process.platform !== 'linux', 'Visual baselines are recorded and compared on Linux CI.');

/** Wait for fonts and layout to settle, then compare a full-page screenshot with live regions masked. */
async function snapshot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, mask: [page.locator('canvas'), page.locator('.statusbar')] });
}

/** Load the app and open a laboratory from the Medium sidebar. */
async function openLab(page: Page, entry?: RegExp) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Run/ }).first()).toBeEnabled();
  if (entry) await page.getByRole('button', { name: entry }).click();
}

test('medium lifecycle', async ({ page }) => {
  await openLab(page);
  await snapshot(page, 'medium-balanced');
  await page.getByRole('button', { name: /Sparse fluctuations/ }).click();
  await expect(page.locator('h1')).toHaveText('Sparse fluctuations');
  await snapshot(page, 'medium-sparse');
});

test('medium lifecycle, narrow layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLab(page);
  await snapshot(page, 'medium-narrow');
});

test('light through the zero-point field', async ({ page }) => {
  await openLab(page, /Light through the zero-point field/);
  await expect(page.getByRole('button', { name: 'Run light', exact: true })).toBeEnabled();
  await snapshot(page, 'light');
});

test('electron scenarios', async ({ page }) => {
  await openLab(page, /Electron in the zero-point field/);
  await expect(page.getByRole('button', { name: 'Run electron', exact: true })).toBeEnabled();
  await snapshot(page, 'electron-stationary');
  for (const [mode, name] of [[/Spin in the surrounding field/, 'electron-spin'], [/Moving electron/, 'electron-moving']] as const) {
    await page.getByRole('button', { name: mode }).click();
    await expect(page.getByRole('button', { name: mode })).toHaveAttribute('aria-pressed', 'true');
    await snapshot(page, name);
  }
});

test('extended Casimir pairings', async ({ page }) => {
  await openLab(page, /Extended Casimir effect/);
  await expect(page.getByTestId('casimir-time')).toHaveText('0.00 τ');
  await snapshot(page, 'casimir-electron-electron');
  await page.getByRole('button', { name: /Electron \/ proton/ }).click();
  await expect(page.getByRole('button', { name: /Electron \/ proton/ })).toHaveAttribute('aria-pressed', 'true');
  await snapshot(page, 'casimir-electron-proton');
});

test('van der Waals stages', async ({ page }) => {
  await openLab(page, /Van der Waals & vacuum pressure/);
  const stages = page.getByRole('group', { name: 'Experiment stages' }).getByRole('button');
  for (const [index, name] of ['vdw-induced', 'vdw-correlated', 'vdw-pressure'].entries()) {
    await stages.nth(index).click();
    await expect(stages.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await snapshot(page, name);
  }
});
