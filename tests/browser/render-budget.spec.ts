import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { tid } from './ids';

// Render budget: with every lab mounted, step one lab ten times and count renders per profiled subtree beyond its idle rate (the
// development-only DevProfiler wrappers: "app" plus one per lab). The UI redesign moves every lab into one shell;
// per-tick data must not re-render other labs or the whole tree (docs/ui-redesign-plan.html, UI 06). Budgets live in
// tests/fixtures/render-budget.json; run with ZP_RECORD_BUDGET=1 to re-record them after an intentional change.
const BUDGET_FILE = new URL('../fixtures/render-budget.json', import.meta.url);
const STEPS = 10;
type Counts = Record<string, number>;
const budgets: Record<string, Counts> = existsSync(BUDGET_FILE) ? JSON.parse(readFileSync(BUDGET_FILE, 'utf8')) : {};
const LABS = { light: 'lab-light', electron: 'lab-electron', casimir: 'lab-casimir', vdw: 'lab-vdw' };

/** Load the app and mount every lab (each mounts on first visit), ending back on Medium. */
async function mountAllLabs(page: Page) {
  await page.goto('/');
  await expect(tid(page, 'transport-run')).toBeEnabled();
  for (const entry of Object.values(LABS)) {
    await tid(page, entry).click();
    await tid(page, 'lab-medium').click();
  }
}

const IDLE_MS = 3000;

/** Reset the render tally, wait, and return renders per profiler id: background work that stepping must not be blamed for. */
async function idleRenders(page: Page): Promise<Counts> {
  await page.evaluate(() => { window.__zpRenders = {}; });
  await page.waitForTimeout(IDLE_MS);
  return page.evaluate(() => ({ ...window.__zpRenders }));
}

/**
 * Step a lab STEPS times, waiting for each step to show, and return the renders per profiler id that the steps caused:
 * the count minus each subtree's idle render rate over the same time. (A hidden lab can render on its own timers, e.g.
 * Medium at about 4/s today; that is background load, not a per-tick cost, so it would otherwise make budgets depend
 * on how fast the machine steps.)
 */
async function rendersForSteps(page: Page, step: Locator, progress: () => Promise<string>): Promise<Counts> {
  await page.waitForTimeout(300);
  const idle = await idleRenders(page);
  await page.evaluate(() => { window.__zpRenders = {}; });
  const start = Date.now();
  for (let i = 0; i < STEPS; i++) {
    const before = await progress();
    await step.click();
    await expect.poll(progress).not.toBe(before);
  }
  await page.waitForTimeout(300);
  const elapsed = Date.now() - start, counts: Counts = await page.evaluate(() => ({ ...window.__zpRenders }));
  return Object.fromEntries(Object.entries(counts).map(([id, n]) => [id, Math.max(0, Math.round(n - (idle[id] ?? 0) * elapsed / IDLE_MS))]));
}

/** Compare render counts with the recorded budget for a lab, or record them when ZP_RECORD_BUDGET=1. */
function checkBudget(lab: string, counts: Counts) {
  if (process.env.ZP_RECORD_BUDGET === '1') {
    const current = existsSync(BUDGET_FILE) ? JSON.parse(readFileSync(BUDGET_FILE, 'utf8')) : {};
    writeFileSync(BUDGET_FILE, JSON.stringify({ ...current, [lab]: counts }, null, 2) + '\n');
    return;
  }
  const budget = budgets[lab];
  expect(budget, `No render budget recorded for ${lab}; run with ZP_RECORD_BUDGET=1.`).toBeDefined();
  // Headroom absorbs scheduler batching; a structural regression (another lab or the whole tree per tick) far exceeds it.
  for (const id of new Set([...Object.keys(budget), ...Object.keys(counts)])) {
    expect(counts[id] ?? 0, `${lab} steps: "${id}" rendered ${counts[id] ?? 0}× (budget ${budget[id] ?? 0})`).toBeLessThanOrEqual(Math.ceil((budget[id] ?? 0) * 1.5) + 2);
  }
}

test('medium steps stay within the render budget', async ({ page }) => {
  await mountAllLabs(page);
  checkBudget('medium', await rendersForSteps(page, tid(page, 'transport-step'), () => page.getByTestId('tick').innerText()));
});

test('light steps stay within the render budget', async ({ page }) => {
  await mountAllLabs(page);
  await tid(page, LABS.light).click();
  await expect(tid(page, 'transport-run')).toBeEnabled();
  checkBudget('light', await rendersForSteps(page, tid(page, 'transport-step'), () => page.getByTestId('light-tick').innerText()));
});

test('electron steps stay within the render budget', async ({ page }) => {
  await mountAllLabs(page);
  await tid(page, LABS.electron).click();
  await expect(tid(page, 'transport-run')).toBeEnabled();
  checkBudget('electron', await rendersForSteps(page, tid(page, 'transport-step'), () => page.getByTestId('electron-tick').innerText()));
});

test('casimir steps stay within the render budget', async ({ page }) => {
  await mountAllLabs(page);
  await tid(page, LABS.casimir).click();
  checkBudget('casimir', await rendersForSteps(page, tid(page, 'transport-step'), () => page.getByTestId('casimir-time').innerText()));
});

test('van der Waals steps stay within the render budget', async ({ page }) => {
  await mountAllLabs(page);
  await tid(page, LABS.vdw).click();
  await tid(page, 'scenario-correlated').click();
  const diagram = page.locator('.vdw-diagram');
  checkBudget('vdw', await rendersForSteps(page, tid(page, 'transport-step'), () => diagram.innerHTML()));
});
