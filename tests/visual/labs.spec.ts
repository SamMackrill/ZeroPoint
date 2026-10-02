import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { tid } from '../browser/ids';

// Visual baselines for every lab and scenario in its initial, paused state. They guard the UI redesign against
// unintended visual change (docs/ui-redesign-plan.html §16). Baselines are recorded on Linux CI only, because font
// rasterisation differs between operating systems. A missing baseline is recorded (and the test passes with an
// annotation) rather than failing; CI uploads the `visual-snapshots` artifact and `node scripts/stack.mjs snapshots`
// commits it. WebGL canvases and live telemetry are hidden by screenshot.css.
test.skip(process.platform !== 'linux', 'Visual baselines are recorded and compared on Linux CI.');

const STYLE = fileURLToPath(new URL('./screenshot.css', import.meta.url));
const BASELINES = fileURLToPath(new URL('./__screenshots__/', import.meta.url));

/** Wait for fonts, then compare with the stored baseline, or record it when none exists yet. */
async function snapshot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const baseline = `${BASELINES}${name}.png`;
  if (!existsSync(baseline)) {
    mkdirSync(BASELINES, { recursive: true });
    await page.screenshot({ path: baseline, fullPage: true, animations: 'disabled', caret: 'hide', style: readFileSync(STYLE, 'utf8') });
    test.info().annotations.push({ type: 'baseline recorded', description: name });
    return;
  }
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, stylePath: STYLE });
}

/** Load the app and open a laboratory by its lab test id. */
async function openLab(page: Page, lab?: string) {
  await page.goto('/');
  await expect(tid(page, 'transport-run')).toBeEnabled();
  if (lab) await tid(page, lab).click();
}

test('medium lifecycle', async ({ page }) => {
  await openLab(page);
  await snapshot(page, 'medium-balanced');
  await tid(page, 'scenario-sparse').click();
  await expect(page.locator('.workbench-breadcrumb [aria-current=page]').filter({ visible: true })).toHaveText('Sparse fluctuations');
  await snapshot(page, 'medium-sparse');
});

test('medium lifecycle, narrow layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLab(page);
  await snapshot(page, 'medium-narrow');
});

test('light through the zero-point field', async ({ page }) => {
  await openLab(page, 'lab-light');
  await expect(tid(page, 'transport-run')).toBeEnabled();
  await snapshot(page, 'light');
});

test('electron scenarios', async ({ page }) => {
  await openLab(page, 'lab-electron');
  await expect(tid(page, 'transport-run')).toBeEnabled();
  await snapshot(page, 'electron-stationary');
  for (const [scenario, name] of [['scenario-spin', 'electron-spin'], ['scenario-moving', 'electron-moving']] as const) {
    await tid(page, scenario).click();
    await expect(tid(page, scenario)).toHaveAttribute('aria-current', 'true');
    await snapshot(page, name);
  }
});

test('extended Casimir pairings', async ({ page }) => {
  await openLab(page, 'lab-casimir');
  await expect(page.getByTestId('casimir-time')).toHaveText('0.00 τ');
  await snapshot(page, 'casimir-electron-electron');
  await tid(page, 'scenario-electron-proton').click();
  await expect(tid(page, 'scenario-electron-proton')).toHaveAttribute('aria-pressed', 'true');
  await snapshot(page, 'casimir-electron-proton');
});

test('van der Waals stages', async ({ page }) => {
  await openLab(page, 'lab-vdw');
  for (const stage of ['induced', 'correlated', 'pressure']) {
    await tid(page, `scenario-${stage}`).click();
    await expect(tid(page, `scenario-${stage}`)).toHaveAttribute('aria-pressed', 'true');
    await snapshot(page, `vdw-${stage}`);
  }
});
