import { test, expect, type Page } from '@playwright/test';
import { tid } from './ids';
import { readFile } from 'node:fs/promises';
// Includes software WebGL startup, full-page exports and repeated viewport reconstruction.
test.describe.configure({ timeout: 60000 });

/** Whether the page is in the narrow (drawer) layout. */
const narrow = (page: Page) => page.viewportSize()!.width <= 850;
/** Open the electron laboratory. */
async function openElectron(page: Page) {
  await page.goto('/');
  if (narrow(page)) await tid(page, 'nav-open').click();
  await tid(page, 'lab-electron').click();
  await expect(tid(page, 'transport-run')).toBeEnabled();
}
/** Choose an electron scenario from the rail (through the drawer on narrow screens). */
async function scenario(page: Page, id: string) {
  if (narrow(page)) await tid(page, 'nav-open').click();
  await tid(page, `scenario-${id}`).click();
}
/** Open an inspector tab, through the drawer on narrow screens; returns a function that closes the drawer again. */
async function inspector(page: Page, name: 'Setup' | 'View' | 'Selection') {
  if (narrow(page)) await page.getByRole('button', { name: 'Open inspector' }).click();
  await page.getByRole('tab', { name, exact: true }).filter({ visible: true }).click();
  return async () => { if (narrow(page)) await page.getByRole('button', { name: 'Close inspector' }).click(); };
}
/** Stage a restart parameter: a segmented choice, or a typed value. */
async function choose(page: Page, name: string) { await page.getByRole('radio', { name, exact: true }).filter({ visible: true }).click(); }
async function type(page: Page, label: RegExp, value: string) { const field = page.getByRole('textbox', { name: label }).filter({ visible: true }); await field.fill(value); await field.press('Enter'); }

test('stationary electron begins absent in a cube, resolving 3D lines, with click-to-select', async ({ page }) => {
  await openElectron(page);
  const close = await inspector(page, 'View'); await expect(tid(page, 'layer-cutaway')).toHaveAttribute('aria-pressed', 'false'); await close();
  await expect(page.getByText('Unpolarized ZPF · electron not yet introduced', { exact: false })).toBeVisible();
  await page.locator('.light-viewport-shell').screenshot({ path: 'test-results/electron-cube-initial.png' });
  await tid(page, 'timeline').fill('80');
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 80');
  await tid(page, 'event-aligned').click();
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 360');
  await page.locator('.light-viewport-shell').screenshot({ path: 'test-results/electron-cube-aligned.png' });
  await inspector(page, 'Selection');
  await expect(page.getByTestId('electron-pair-centre')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nearest to probe', exact: true }).click();
  await expect(page.getByTestId('electron-pair-centre')).toBeVisible();
  await page.getByRole('button', { name: /^Clear/ }).click();
  await expect(page.getByTestId('electron-pair-centre')).toHaveCount(0);
  await tid(page, 'transport-reset').click();
  await expect(page.getByText('Unpolarized ZPF · electron not yet introduced', { exact: false })).toBeVisible();
});

test('the static studies compare flux and rate limits, and the spin scenario links charge currents', async ({ page }) => {
  await openElectron(page);
  await scenario(page, 'charge-flux');
  await expect(tid(page, 'transport-run')).toHaveCount(0);
  await page.getByLabel('Gauss sphere radius', { exact: true }).fill('2');
  await expect(page.getByTestId('property-field')).toHaveText('0.2500');
  await expect(page.getByTestId('property-area')).toHaveText('4.0000');
  await expect(page.getByTestId('property-flux')).toHaveText('-1.0000');
  await scenario(page, 'radius-limit');
  await expect(page.getByTestId('property-limit-status')).toContainText('At the proposed limit');
  await page.getByLabel('Trial shell radius', { exact: true }).fill('1.5');
  await expect(page.getByTestId('property-speed')).toHaveText('1.500');
  await expect(page.getByTestId('property-limit-status')).toContainText('Above the proposed limit');
  await page.getByLabel('Effective pattern rate', { exact: true }).fill('0.5');
  await expect(page.getByTestId('property-limit')).toHaveText('2.000');
  await expect(page.getByTestId('property-limit-status')).toContainText('Below the proposed limit');
  await page.getByLabel('Electron property investigations', { exact: true }).screenshot({ path: 'test-results/electron-property-rate.png' });
  await scenario(page, 'spin');
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 0');
  // The video's shared rotation is a saved view in Help: a link that sets Shared, opens Charge motion and selects a pair.
  await page.getByRole('button', { name: 'Help', exact: true }).filter({ visible: true }).click();
  await tid(page, 'about-views').click();
  await page.getByRole('link', { name: 'The video’s shared rotation (4:44)' }).click();
  await expect(page.getByTestId('about-sheet')).toHaveCount(0);
  await inspector(page, 'Setup'); await expect(page.getByRole('radio', { name: 'Shared', exact: true })).toHaveAttribute('aria-checked', 'true');
  // The shared rotation opens the split's Charge motion pane; the picker swaps it for the equatorial section.
  const closeup = page.getByLabel('Local charge motion close-up', { exact: true });
  await expect(closeup).toContainText('Sample 2231');
  await page.getByRole('button', { name: 'Conventional current qv', exact: true }).click();
  await expect(page.getByTestId('charge-motion-explanation')).toContainText('point together');
  await tid(page, 'transport-next').click();
  await expect(closeup).toContainText('tick 120');
  await choose(page, 'Equatorial section');
  await page.getByRole('button', { name: 'Inspect section pair 2229', exact: true }).click();
  await choose(page, 'Charge motion');
  await expect(closeup).toContainText('Sample 2229');
  await closeup.screenshot({ path: 'test-results/electron-charge-current.png' });
  await page.keyboard.press('Escape'); // clearing the selection empties the pane rather than showing a stand-in pair
  await expect(closeup).toHaveCount(0);
  await expect(page.getByText('Select a pair on a shell', { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await scenario(page, 'charge-flux');
  await page.getByLabel('Electron property investigations', { exact: true }).screenshot({ path: 'test-results/electron-property-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('spin shells link 2D and 3D, alternate local turns and preserve display controls', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openElectron(page); await scenario(page, 'spin');
  await expect(page.getByLabel('Linked 2D spin section')).toBeVisible();
  await expect(page.locator('[data-testid="spin-section"] [data-sample]')).toHaveCount(32);
  await page.getByRole('button', { name: 'Inspect section pair 2229', exact: true }).click();
  await expect(page.getByTestId('electron-pair-centre')).toHaveText('0.6000, 0, 0');
  await tid(page, 'transport-next').click();
  await expect(page.locator('.electron-section header')).toContainText('tick 120');
  await expect(page.getByTestId('electron-pair-centre')).toHaveText('0.6000, 0, 0');
  await inspector(page, 'Setup'); await choose(page, '1×');
  await tid(page, 'transport-next').click();
  await tid(page, 'dock-shells').click();
  await page.getByRole('button', { name: 'Inspect spin band at 0.6 R', exact: true }).click();
  await expect(page.getByTestId('electron-spin-rate')).toHaveText('19.10° / τ');
  const centre = await page.getByTestId('electron-pair-centre').innerText();
  await tid(page, 'transport-next').click();
  await expect(page.getByTestId('electron-pair-centre')).toHaveText(centre);
  await page.locator('.electron-workbench-root .split-view').screenshot({ path: 'test-results/spin-linked-views.png' });
  await inspector(page, 'View'); await tid(page, 'layer-cutaway').click();
  await page.locator('.light-viewport-shell').screenshot({ path: 'test-results/spin-shells-cutaway.png' });
  await inspector(page, 'Setup'); await choose(page, '4');
  await expect(page.locator('[data-testid="spin-section"] [data-sample]')).toHaveCount(64);
  await page.getByRole('button', { name: 'Inspect spin band at 2.8 R', exact: true }).click();
  await expect(page.getByTestId('electron-spin-rate')).toHaveText('-0.88° / τ');
  await inspector(page, 'View'); await tid(page, 'layer-cutaway').click(); await expect(tid(page, 'layer-cutaway')).toHaveAttribute('aria-pressed', 'false');
  await inspector(page, 'Setup'); await choose(page, 'spin down');
  await tid(page, 'params-apply').click();
  await inspector(page, 'Selection'); await expect(page.getByTestId('electron-spin-rate')).toHaveText('0.88° / τ');
  await expect(page.locator('.electron-section-key')).toContainText('↻ Shell 1');
  await expect(page.locator('.electron-section-key')).toContainText('↺ Shell 2');
  await inspector(page, 'Setup'); await choose(page, 'Shared');
  await inspector(page, 'Selection'); await expect(page.getByTestId('electron-spin-rate')).toHaveText('-0.88° / τ');
  await inspector(page, 'Setup'); await choose(page, 'X'); await tid(page, 'params-apply').click();
  await expect(page.locator('.electron-section header')).toContainText('Looking from +X');
  await inspector(page, 'View'); await page.getByLabel('Linked 2D section', { exact: true }).uncheck();
  await expect(page.getByLabel('Linked 2D spin section')).toHaveCount(0);
  const toggle = page.locator('.electron-workbench-root').getByTestId('split-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click(); // the split toggle and the View checkbox are one setting
  await expect(page.getByLabel('Linked 2D section', { exact: true })).toBeChecked();
  await page.keyboard.press('Backslash'); await expect(page.getByLabel('Linked 2D spin section')).toHaveCount(0);
  await page.getByLabel('Linked 2D section', { exact: true }).check();
  await expect(page.getByLabel('Linked 2D spin section')).toBeVisible();
  const download = page.waitForEvent('download'); await tid(page, 'file-save').click();
  const saved = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(saved.view.spinDisplay).toEqual({ count: 4, gain: 1, alternating: false, section: true, guides: true });
  expect(saved.version).toBe(3); expect(saved.state.model).toBe('electron-polarization/3');
  saved.version = 1; saved.state.model = 'electron-polarization/1'; delete saved.view.shells;
  await tid(page, 'file-input').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await expect(tid(page, 'notice')).toContainText('Updated an older experiment');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const close = await inspector(page, 'Setup'); await choose(page, '2'); await close();
  await page.locator('.electron-workbench-root .split-view').screenshot({ path: 'test-results/spin-shells-mobile.png' });
  const closeView = await inspector(page, 'View'); await tid(page, 'layer-rotation').click(); await expect(tid(page, 'layer-rotation')).toHaveAttribute('aria-pressed', 'false'); await closeView();
  expect(errors).toEqual([]);
});

test('electron stages, Faraday layers, replay and files preserve fixed centres', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await openElectron(page);
  await inspector(page, 'View'); await expect(tid(page, 'layer-faraday')).toHaveAttribute('aria-pressed', 'true');
  await tid(page, 'event-aligned').click();
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 360');
  await inspector(page, 'Selection'); await page.getByRole('button', { name: 'Nearest to probe', exact: true }).click();
  const centre = await page.getByTestId('electron-pair-centre').innerText();
  await page.screenshot({ path: 'test-results/electron-electric.png', fullPage: true });
  await scenario(page, 'spin');
  await tid(page, 'transport-next').click();
  await expect(page.getByTestId('electron-position')).toHaveText('0.000');
  await inspector(page, 'Selection'); await page.getByRole('button', { name: 'Nearest to probe', exact: true }).click();
  await scenario(page, 'stationary'); await tid(page, 'event-aligned').click(); await page.getByRole('button', { name: 'Nearest to probe', exact: true }).click();
  await expect(page.getByTestId('electron-pair-centre')).toHaveText(centre);
  await scenario(page, 'moving');
  await tid(page, 'event-path-centre').click();
  await expect(page.getByTestId('electron-B-motion')).toContainText('-0.0468');
  await inspector(page, 'Setup'); await type(page, /^Velocity/, '-0.15');
  await tid(page, 'params-apply').click();
  await tid(page, 'event-path-centre').click();
  await expect(page.getByTestId('electron-B-motion')).toHaveText('0, 0, 0.0468');
  await inspector(page, 'View'); await tid(page, 'layer-faraday').click();
  await tid(page, 'capture').click();
  const download = page.waitForEvent('download'); await tid(page, 'file-save').click(); const file = await (await download).path();
  await tid(page, 'transport-reset').click();
  await page.getByRole('button', { name: 'Restore electron tick 2880' }).click();
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 2880');
  await tid(page, 'file-input').setInputFiles(file!);
  await expect(tid(page, 'notice')).toContainText('Loaded electron tick 2880');
  await expect(tid(page, 'layer-faraday')).toHaveAttribute('aria-pressed', 'false');
  await tid(page, 'file-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(tid(page, 'notice')).toContainText('Could not load');
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 2880');
  await tid(page, 'lab-medium').click();
  await tid(page, 'lab-electron').click();
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 2880');
  await page.screenshot({ path: 'test-results/electron-moving.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('electron mobile layers, masked probe and exports work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await openElectron(page);
  await tid(page, 'event-aligned').click();
  let close = await inspector(page, 'View');
  await expect(tid(page, 'layer-cutaway')).toHaveAttribute('aria-pressed', 'false');
  await close();
  await tid(page, 'settings').filter({ visible: true }).click(); await tid(page, 'setting-reduced-motion').check(); await page.keyboard.press('Escape'); // a global setting, in the header
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 360');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tid(page, 'export-menu').click(); const image = page.waitForEvent('download'); await tid(page, 'export-png').click(); expect((await image).suggestedFilename()).toBe('zeropoint-electron.png');
  await tid(page, 'export-menu').click(); const csv = page.waitForEvent('download'); await tid(page, 'export-csv').click(); expect((await csv).suggestedFilename()).toContain('reference-sequence.csv');
  close = await inspector(page, 'Setup'); await type(page, /^Probe Y/, '0'); await tid(page, 'params-apply').click(); await close();
  await expect(page.getByText('Probe lies inside the 0.3 R numerical mask. Field values are excluded.')).toBeVisible();
  expect((await page.request.get('/docs/Polarization-Notes.md')).ok()).toBe(true);
  await page.screenshot({ path: 'test-results/electron-mobile.png', fullPage: true });
});

test('electron pauses when hidden and recovers actual WebGL loss', async ({ page }) => {
  await openElectron(page); await tid(page, 'transport-run').click();
  await expect.poll(async () => parseInt((await page.getByTestId('electron-tick').innerText()).split(' ')[1])).toBeGreaterThan(0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(tid(page, 'transport-run')).toContainText('Run');
  await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; });
  await tid(page, 'event-aligned').click();
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 360');
  await page.locator('.electron-viewport canvas').evaluate((canvas: HTMLCanvasElement) => canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.getByRole('heading', { name: 'Electron viewport needs attention' })).toBeVisible();
  await expect(tid(page, 'transport-run')).toBeDisabled();
  await page.getByRole('button', { name: 'Recover electron viewport' }).click();
  await expect(page.getByRole('heading', { name: 'Electron viewport needs attention' })).not.toBeVisible();
  await expect(page.getByTestId('electron-tick')).toContainText('Tick 360');
  await tid(page, 'timeline').press('End');
  await expect(tid(page, 'transport-run')).toBeDisabled();
});
