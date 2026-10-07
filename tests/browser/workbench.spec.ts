import { test, expect, type Page } from '@playwright/test';
import { tid } from './ids';

/** The current scenario in the header breadcrumb. */
const scenario = (page: Page) => page.locator('.workbench-breadcrumb [aria-current=page]').filter({ visible: true });
/** Open an inspector tab (Setup, View or Selection). */
const inspector = (page: Page, name: 'Setup' | 'View' | 'Selection') => page.getByRole('tab', { name, exact: true }).filter({ visible: true }).click();

test('controls, inspection, checkpoints, files and error handling work end to end', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled();
  await expect(page.getByTestId('tick')).toHaveText('Tick 0'); await page.waitForTimeout(300); await expect(page.getByTestId('tick')).toHaveText('Tick 0');
  await tid(page, 'transport-step').click(); await expect(page.getByTestId('tick')).toHaveText('Tick 1');
  await tid(page, 'transport-run').click(); await expect(tid(page, 'transport-run')).toContainText('Pause');
  await expect.poll(async () => +(await page.getByTestId('tick').innerText()).replace('Tick ', '')).toBeGreaterThan(3);
  await tid(page, 'transport-run').click(); await expect(tid(page, 'transport-run')).toContainText('Run');
  // The worker can finish an in-flight tick after Pause on a loaded machine: wait until the tick holds still (a pause that never takes effect still fails here).
  await expect.poll(async () => { const before = await page.getByTestId('tick').innerText(); await page.waitForTimeout(250); return before === await page.getByTestId('tick').innerText(); }).toBe(true);
  const paused = await page.getByTestId('tick').innerText(); await page.waitForTimeout(250); await expect(page.getByTestId('tick')).toHaveText(paused);
  await inspector(page, 'Selection'); await page.getByRole('button', { name: 'Select first active dipole' }).click(); await expect(page.locator('.dipole-inspector h2')).toContainText('Dipole ');
  await tid(page, 'capture').click(); await expect(page.locator('.timeline-marker')).toHaveCount(1);
  await tid(page, 'transport-step').click(); await page.locator('.timeline-marker').click(); await expect(page.getByTestId('tick')).toHaveText(paused);
  const downloadPromise = page.waitForEvent('download'); await tid(page, 'file-save').click(); const download = await downloadPromise; const path = await download.path(); expect(path).toBeTruthy();
  await tid(page, 'transport-reset').click(); await expect(page.getByTestId('tick')).toHaveText('Tick 0');
  await tid(page, 'file-input').setInputFiles(path!); await expect(page.getByTestId('tick')).toHaveText(paused);
  await tid(page, 'file-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"bad"}') }); await expect(tid(page, 'notice')).toContainText('Could not load file'); await expect(page.getByTestId('tick')).toHaveText(paused);
  await inspector(page, 'Setup'); const seed = page.getByRole('textbox', { name: /^Random seed/ }); await seed.fill('42'); await seed.press('Enter');
  await tid(page, 'params-apply').click(); await expect(page.getByTestId('tick')).toHaveText('Tick 0'); await expect(page.locator('.workbench-status')).toContainText('Seed 42');
  await tid(page, 'scenario-sparse').click(); await expect(scenario(page)).toHaveText('Sparse fluctuations');
  await inspector(page, 'View');
  await page.getByRole('radio', { name: 'Points', exact: true }).click(); await expect(page.getByRole('radio', { name: 'Points', exact: true })).toHaveAttribute('aria-checked', 'true');
  await tid(page, 'layer-slice').click(); await expect(tid(page, 'layer-slice')).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByRole('slider', { name: 'Slice Z' })).toBeVisible();
  await page.getByRole('button', { name: 'Help', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('What you are observing'); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('slider', { name: /Jitter/ })).toHaveCount(0);
  await inspector(page, 'Setup');
  await page.getByRole('slider', { name: /Peak pair separation/ }).press('End');
  await expect(page.getByRole('slider', { name: /Peak pair separation/ })).toHaveAttribute('aria-valuenow', '0.8');
  await expect(scenario(page)).toContainText('modified');
  await inspector(page, 'Selection'); await page.getByRole('button', { name: 'Select first active dipole' }).click();
  const centre = page.getByTestId('dipole-readouts').locator('.readout').filter({ has: page.locator('dt', { hasText: 'Fixed centre' }) }).locator('.readout-value');
  const position = await centre.innerText(); await tid(page, 'transport-step').click(); await expect(page.getByTestId('tick')).toHaveText('Tick 1'); await expect(centre).toHaveText(position);
  await page.getByRole('button', { name: 'Illustrative model' }).filter({ visible: true }).click(); await tid(page, 'about-sources').click(); await expect(page.getByRole('heading', { name: 'Van der Waals / Casimir pressure · available' })).toBeVisible();
  const casimirLink = page.getByRole('link', { name: 'Read experiment plan' });
  const response = await page.request.get((await casimirLink.getAttribute('href'))!); expect(response.ok()).toBe(true); expect(await response.text()).toContain('Status: analytic comparison implemented'); await page.keyboard.press('Escape');
  expect(errors).toEqual([]); await page.screenshot({ path: 'test-results/workbench-desktop.png', fullPage: true });
});
test('narrow layout provides working drawers and has no horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tid(page, 'nav-open').click(); await tid(page, 'scenario-slow').click(); await expect(scenario(page)).toHaveText('Slow oscillations');
  await page.getByRole('button', { name: 'Open inspector' }).click(); await expect(page.getByLabel('Creation rate').first()).toBeVisible(); await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.screenshot({ path: 'test-results/workbench-mobile.png', fullPage: true });
});

test('parameter edits are acknowledged, hidden tabs pause, and a lost viewport recovers', async ({ page }) => {
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled(); await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('slider', { name: /Frequency centre/ }).press('End');
  await expect(page.getByRole('slider', { name: /Frequency centre/ })).toHaveAttribute('aria-valuenow', '3');
  // Parameter revisions are debug telemetry, in the status bar once Settings turns it on.
  await expect(tid(page, 'status-telemetry')).toHaveCount(0);
  await tid(page, 'settings').filter({ visible: true }).click(); await tid(page, 'setting-telemetry').check(); await page.keyboard.press('Escape');
  await expect(page.locator('.medium-workbench .workbench-status')).toContainText('Parameter revision 1');
  // Frame rate and WebGL for every lab; Medium adds its worker's step time.
  await expect(page.locator('.medium-workbench .workbench-status')).toContainText(/\d+ fps/);
  await expect(page.locator('.medium-workbench .workbench-status')).toContainText('WebGL 2');
  await expect(page.locator('.medium-workbench .workbench-status')).toContainText(/A \d+\.\d{3} ms\/step/);
  await tid(page, 'dock-events').click(); await expect(page.locator('.event-list')).toContainText('frequency 3 f₀');
  await tid(page, 'transport-run').click(); await expect(tid(page, 'transport-run')).toContainText('Pause');
  // Exercise the visibility handler deterministically; hardware tab scheduling varies in CI.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(tid(page, 'transport-run')).toContainText('Run');
  await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; });
  const before = await page.getByTestId('tick').innerText(); await page.waitForTimeout(250); await expect(page.getByTestId('tick')).toHaveText(before);
  await page.evaluate(() => { const gl = document.querySelector('canvas')!.getContext('webgl2')!; gl.getExtension('WEBGL_lose_context')!.loseContext(); });
  await expect(page.getByRole('heading', { name: 'Viewport needs attention' })).toBeVisible();
  await page.getByRole('button', { name: 'Recover viewport' }).click(); await expect(page.getByRole('heading', { name: 'Viewport needs attention' })).not.toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1); await expect(page.getByTestId('tick')).toHaveText(before);
  await tid(page, 'export-menu').click(); const image = page.waitForEvent('download'); await tid(page, 'export-png').click(); expect((await image).suggestedFilename()).toBe('zeropoint-field.png');
});

test('plot keys do not step the model, cameras stay selected, recovery holds Run, and the view survives a layout switch', async ({ page }) => {
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled(); await expect(page.locator('canvas')).toHaveCount(1);
  for (let i = 0; i < 3; i++) await tid(page, 'transport-step').click();
  await expect(page.getByTestId('tick')).toHaveText('Tick 3');
  const plot = page.getByTestId('medium-plot-population').getByRole('img');
  await plot.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200); await expect(page.getByTestId('tick')).toHaveText('Tick 3');
  await page.getByRole('radio', { name: 'Top', exact: true }).click(); await expect(page.getByRole('radio', { name: 'Top', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'Perspective', exact: true }).click(); await expect(page.getByRole('radio', { name: 'Perspective', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.evaluate(() => { const gl = document.querySelector('canvas')!.getContext('webgl2')!; gl.getExtension('WEBGL_lose_context')!.loseContext(); });
  await expect(page.getByRole('heading', { name: 'Viewport needs attention' })).toBeVisible();
  await expect(tid(page, 'transport-run')).toBeDisabled();
  await page.getByRole('button', { name: 'Recover viewport' }).click(); await expect(tid(page, 'transport-run')).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 }); await expect(page.locator('.workbench-viewport canvas').filter({ visible: true })).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 900 }); await expect(page.locator('.workbench-viewport canvas').filter({ visible: true })).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open inspector' }).click(); await expect(page.getByRole('dialog', { name: 'Inspector' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', { name: 'Inspector' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open inspector' })).toBeFocused();
});

test('a selected dipole does not pull the inspector back to Selection while the model runs', async ({ page }) => {
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled();
  await page.getByRole('tab', { name: 'Selection', exact: true }).click(); await page.getByRole('button', { name: 'Select first active dipole' }).click();
  await expect(page.locator('.dipole-inspector h2')).toContainText('Dipole ');
  await page.getByRole('tab', { name: 'Setup', exact: true }).click();
  for (let i = 0; i < 3; i++) await tid(page, 'transport-step').click();
  await expect(page.getByTestId('tick')).toHaveText('Tick 3');
  await expect(page.getByRole('tab', { name: 'Setup', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('Esc clears and F focuses the selection, and a click on the field selects', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled(); await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('tab', { name: 'Selection', exact: true }).click();
  await page.getByRole('button', { name: 'Select first active dipole' }).click();
  await expect(page.locator('.dipole-inspector h2')).toContainText('Dipole ');
  await page.locator('canvas').click({ position: { x: 5, y: 5 } }); // a click on empty space clears the selection
  await expect(page.getByText('No active selection')).toBeVisible();
  await page.getByRole('button', { name: 'Select first active dipole' }).click();
  await page.keyboard.press('f');
  await expect(page.locator('.dipole-inspector h2')).toContainText('Dipole ');
  // The split pane (\) follows the same selection.
  await page.keyboard.press('Backslash');
  const pane = page.getByRole('region', { name: 'Dipole close-up' });
  await expect(pane.locator('figcaption strong')).toContainText('Dipole ');
  await page.keyboard.press('Escape');
  await expect(page.getByText('No active selection')).toBeVisible();
  await expect(pane).toContainText('Select a dipole');
  await page.locator('.medium-workbench').getByTestId('split-toggle').click(); await expect(pane).toHaveCount(0);
  // F zoomed in on that dipole, by an amount that depends on the camera animation's timing; return to the overview
  // (Top, then Perspective re-applies the preset) so the sweep below crosses the same field on every run.
  await page.getByRole('radio', { name: 'Top', exact: true }).click(); await page.getByRole('radio', { name: 'Perspective', exact: true }).click();
  const canvas = page.locator('canvas'), box = (await canvas.boundingBox())!;
  for (const y of [0.5, 0.45, 0.55]) for (let x = 0.3; x <= 0.7 && await page.getByText('No active selection').isVisible(); x += 0.02) await canvas.click({ position: { x: box.width * x, y: box.height * y } });
  await expect(page.locator('.dipole-inspector h2')).toContainText('Dipole ');
  expect(errors).toEqual([]);
});

test('keyboard shortcuts run the registry\'s actions and are listed in Help › Shortcuts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled(); await expect(page.locator('canvas')).toBeVisible();
  await page.keyboard.press('2'); await expect(page.getByRole('radio', { name: 'Top', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowRight'); await expect(page.getByTestId('tick')).toHaveText('Tick 1');
  await page.keyboard.press('Shift+ArrowRight'); await expect(page.getByTestId('tick')).toHaveText('Tick 121');
  await page.keyboard.press('>'); await expect(page.getByRole('radio', { name: '2× speed' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('<'); await expect(page.getByRole('radio', { name: '1× speed' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('c'); await expect(tid(page, 'notice')).toContainText('Checkpoint captured at tick 121');
  await page.keyboard.press('l'); await expect(page.getByRole('tab', { name: 'View', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('r'); await expect(page.getByRole('radio', { name: 'Points', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Home'); await expect(page.getByTestId('tick')).toHaveText('Tick 0');
  await page.keyboard.press('Shift+Slash');
  const help = page.getByTestId('about-sheet'); await tid(page, 'about-shortcuts').click();
  await expect(help.getByRole('region', { name: 'Transport shortcuts' })).toContainText('Capture checkpoint');
  await expect(help.getByRole('region', { name: 'View shortcuts' })).toContainText('Focus mode');
  await page.keyboard.press('Space'); await expect(tid(page, 'transport-run')).toContainText('Run'); // not while the sheet is open
  await page.keyboard.press('Escape'); await expect(help).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the command palette jumps to parameters, toggles layers by name and switches experiments', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled();
  const palette = async (search: string) => {
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Command palette' }).fill(search);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('combobox', { name: 'Command palette' })).toHaveCount(0);
  };
  await palette('frequency centre');
  await expect(page.locator('[data-testid="param-frequency"] input').filter({ visible: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await palette('hide cell boundaries');
  await page.getByRole('tab', { name: 'View', exact: true }).click();
  await expect(tid(page, 'layer-bounds')).toHaveAttribute('aria-pressed', 'false');
  await palette('sparse fluctuations');
  await expect(page.locator('.workbench-breadcrumb [aria-current=page]').filter({ visible: true })).toContainText('Sparse fluctuations');
  await palette('light through');
  await expect(page.getByTestId('light-tick')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the header’s search opens the command palette, and returns focus to it on Esc', async ({ page }) => {
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled();
  const search = tid(page, 'header-search').filter({ visible: true });
  await expect(search).toContainText('Search or jump to…');
  await search.click();
  const input = page.getByRole('combobox', { name: 'Command palette' });
  await expect(input).toBeFocused();
  await input.fill('Top camera'); await expect(page.getByRole('option', { name: /Top camera/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(input).toHaveCount(0); await expect(search).toBeFocused();
  // Narrow layouts have no room for it (tablets keep Ctrl K; phones have no palette).
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(tid(page, 'header-search').filter({ visible: true })).toHaveCount(0);
});
