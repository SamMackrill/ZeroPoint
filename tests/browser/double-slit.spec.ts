import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { tid } from './ids';

/** Whether the page is in the narrow (drawer) layout. */
const narrow = (page: Page) => page.viewportSize()!.width <= 1279;
/** Navigate from the workbench to the double-slit experiment. */
async function openExperiment(page: Page) {
  await page.goto('/');
  if (narrow(page)) await tid(page, 'nav-open').click();
  await tid(page, 'lab-double-slit').click();
  await expect(page.locator('.workbench-breadcrumb [aria-current=page]').filter({ visible: true })).toHaveText('Two slits');
}
/** Choose a scenario from the rail. */
async function scenario(page: Page, id: string) { if (narrow(page)) await tid(page, 'nav-open').click(); await tid(page, `scenario-${id}`).click(); }
/** Type a value into a Setup parameter. */
async function set(page: Page, label: string, value: string) {
  await page.getByRole('tab', { name: 'Setup', exact: true }).filter({ visible: true }).click();
  const field = page.getByRole('textbox', { name: new RegExp(`^${label}`) }).filter({ visible: true }); await field.fill(value); await field.press('Enter');
}

test('the photon reaches B in the straight-line time through two slits, and never when its fields are held to light speed', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openExperiment(page);
  const state = page.getByTestId('slit-state'), tick = page.getByTestId('slit-tick');
  await expect(tid(page, 'slit-arrival')).toHaveText('8.00 τ');
  await expect(tid(page, 'slit-edge')).toHaveText('2.50');
  await expect(page.getByTestId('slit-wall').locator('line')).toHaveCount(3);
  // Step into the first pair's life: its field reaches B through both slits.
  for (let i = 0; i < 15; i++) await tid(page, 'transport-step').click();
  await expect(tick).toContainText('Tick 15');
  await expect(state).toHaveText('Pair 1 of 16 · its field reaches B through both slits');
  await expect(page.getByTestId('slit-routes').locator('polyline')).toHaveCount(2);
  await expect(tid(page, 'slit-field-b')).not.toHaveText('0.00');
  // Next goes to the hand-off at the wall, then to the arrival.
  await tid(page, 'transport-next').click();
  await expect(tick).toContainText('Tick 240');
  await expect(state).toHaveText('Pair 9 of 16 · beyond the wall');
  await tid(page, 'transport-next').click();
  await expect(state).toHaveText('Absorbed at B at 8.00 τ, the straight-line time');
  await expect(tid(page, 'slit-photon')).toHaveText('Absorbed at B');
  await expect(tid(page, 'transport-run')).toBeDisabled();
  // The slit geometry is live: the reach comparison follows it.
  await set(page, 'Slit distance from path', '4');
  await expect(tid(page, 'slit-edge')).toHaveText('3.50');
  await tid(page, 'dock-reach').click();
  await expect(tid(page, 'slit-speed')).toHaveText('≥ 7.0');
  await expect(tid(page, 'slit-route')).toContainText('11.31 λ');
  // Held to light speed the same slits are never reached: the photon halts at the wall and nothing arrives.
  await scenario(page, 'light-speed');
  await expect(tick).toContainText('Tick 0');
  await expect(tid(page, 'slit-arrival')).toHaveText('Never');
  await expect(page.getByRole('slider', { name: 'Slit distance from path' })).toHaveAttribute('aria-valuenow', '4');
  await expect(page.getByTestId('slit-reach')).toBeVisible();
  await tid(page, 'transport-next').click();
  await expect(tick).toContainText('Tick 240');
  await expect(state).toHaveText('Halted at the wall · no field reached a slit');
  await tid(page, 'dock-plots').click();
  await expect(page.getByTestId('slit-arrival-plot')).toHaveText('No field reaches B at any time in this run.');
  // With nothing in the way there is no wall and no slit geometry to set.
  await scenario(page, 'open');
  await expect(page.getByTestId('slit-wall')).toHaveCount(0);
  await expect(page.getByText('This scenario has no parameters.').filter({ visible: true })).toBeVisible();
  await expect(tid(page, 'slit-arrival')).toHaveText('8.00 τ');
  expect(errors).toEqual([]);
});

test('playback runs to the end, pauses on navigation, and the timeline scrubs', async ({ page }) => {
  await openExperiment(page);
  const tick = page.getByTestId('slit-tick');
  await tid(page, 'transport-run').click();
  await expect(tick).not.toContainText('Tick 0 ');
  await tid(page, 'lab-medium').click();
  await tid(page, 'lab-double-slit').click();
  await expect(tid(page, 'transport-run')).toContainText('Run');
  const held = await tick.innerText();
  await page.waitForTimeout(180); await expect(tick).toHaveText(held);
  await tid(page, 'timeline').fill('300');
  await expect(tick).toContainText('Tick 300');
  await tid(page, 'event-wall').click();
  await expect(tick).toContainText('Tick 240');
  await page.keyboard.press('Home');
  await expect(tick).toContainText('Tick 0');
});

test('layers, the source figure, links, files and CSV', async ({ page }) => {
  await page.goto('/#/double-slit/light-speed?slitWidth=2&t=100&L=-zeptons');
  const tick = page.getByTestId('slit-tick');
  await expect(tick).toContainText('Tick 100');
  await expect(page.locator('.workbench-breadcrumb [aria-current=page]').filter({ visible: true })).toHaveText('Fields at light speed');
  await expect(page.getByRole('slider', { name: 'Slit width' })).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByTestId('slit-zeptons')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/double-slit/light-speed?slitWidth=2&t=100&L=-zeptons');
  await page.getByRole('tab', { name: 'View', exact: true }).click();
  await tid(page, 'layer-zeptons').click();
  await expect(page.getByTestId('slit-zeptons').locator('g')).toHaveCount(558);
  await tid(page, 'layer-reach').click();
  await expect(page.getByTestId('slit-reach')).toHaveCount(0);
  // Fleming's figure sits beside the diagram in the split view.
  const figure = page.locator('.slit-figure-pane img');
  await page.locator('.slit-workbench-root').getByTestId('split-toggle').click();
  await expect(figure).toHaveAttribute('src', /figure-19-3\.jpeg$/);
  await expect.poll(() => figure.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press('Backslash'); await expect(figure).toHaveCount(0);
  // Save, change scenario, and load the file back.
  const saving = page.waitForEvent('download'); await tid(page, 'file-save').click(); const file = await (await saving).path();
  expect(JSON.parse(await readFile(file!, 'utf8'))).toMatchObject({ format: 'zeropoint-double-slit', model: 'double-slit/1', scenario: 'light-speed', tick: 100, params: { slitWidth: 2, fields: 'light' }, view: { reach: false } });
  await tid(page, 'scenario-slits').click();
  await expect(tick).toContainText('Tick 0');
  await tid(page, 'file-input').setInputFiles(file!);
  await expect(tid(page, 'notice')).toContainText('Loaded “Fields at light speed” at tick 100');
  await expect(tick).toContainText('Tick 100');
  await expect(tid(page, 'slit-arrival')).toHaveText('Never');
  await tid(page, 'file-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"zeropoint-double-slit","version":1,"model":"double-slit/1","scenario":"slits","params":{"slitOffset":9}}') });
  await expect(tid(page, 'notice')).toContainText('Could not load: Slit distance from path must be a number from 2 to 5.');
  await tid(page, 'export-menu').click(); const pending = page.waitForEvent('download'); await tid(page, 'export-csv').click();
  expect((await pending).suggestedFilename()).toBe('double-slit-light-speed.csv');
  // Chapter 19's figures and what Fleming leaves open are in the About sheet.
  await page.keyboard.press('Shift+Slash');
  const about = page.getByTestId('about-sheet');
  await expect(about).toContainText('What Fleming leaves open');
  await about.getByRole('tab', { name: 'Sources' }).click();
  const figures = about.locator('.slit-source-grid img');
  await expect(figures).toHaveCount(2);
  for (const img of await figures.all()) { await img.scrollIntoViewIfNeeded(); await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0); }
  const doc = await page.request.get('/docs/double-slit-model.md'); expect(doc.ok()).toBe(true);
});

test('the lab fits a phone without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExperiment(page);
  await expect(page.getByTestId('slit-diagram').filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.slit-diagram').filter({ visible: true }).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});
