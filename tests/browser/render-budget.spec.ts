import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Render budget: with every lab mounted, step one lab ten times and count renders per profiled subtree (the
// development-only DevProfiler wrappers: "app" plus one per lab). The UI redesign moves every lab into one shell;
// per-tick data must not re-render other labs or the whole tree (docs/ui-redesign-plan.html, UI 06). Budgets live in
// tests/fixtures/render-budget.json; run with ZP_RECORD_BUDGET=1 to re-record them after an intentional change.
const BUDGET_FILE = new URL('../fixtures/render-budget.json', import.meta.url);
const STEPS = 10;
type Counts = Record<string, number>;
const budgets: Record<string, Counts> = existsSync(BUDGET_FILE) ? JSON.parse(readFileSync(BUDGET_FILE, 'utf8')) : {};
const LABS = { light: /Light through the zero-point field/, electron: /Electron in the zero-point field/, casimir: /Extended Casimir effect/, vdw: /Van der Waals & vacuum pressure/ };

/** Load the app and mount every lab (each mounts on first visit), ending back on Medium. */
async function mountAllLabs(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Run/ }).first()).toBeEnabled();
  for (const entry of Object.values(LABS)) {
    await page.getByRole('button', { name: entry }).click();
    await page.getByRole('button', { name: /Medium laboratory|Experiment library/ }).click();
  }
}

/** Step a lab STEPS times, waiting for each step to show, and return renders per profiler id. */
async function rendersForSteps(page: Page, step: Locator, progress: () => Promise<string>): Promise<Counts> {
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__zpRenders = {}; });
  for (let i = 0; i < STEPS; i++) {
    const before = await progress();
    await step.click();
    await expect.poll(progress).not.toBe(before);
  }
  await page.waitForTimeout(300);
  return page.evaluate(() => ({ ...window.__zpRenders }));
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
  checkBudget('medium', await rendersForSteps(page, page.getByRole('button', { name: 'Step', exact: true }), () => page.getByTestId('tick').innerText()));
});

test('light steps stay within the render budget', async ({ page }) => {
  await mountAllLabs(page);
  await page.getByRole('button', { name: LABS.light }).click();
  await expect(page.getByRole('button', { name: 'Run light', exact: true })).toBeEnabled();
  checkBudget('light', await rendersForSteps(page, page.getByRole('button', { name: 'Step', exact: true }), () => page.getByTestId('light-tick').innerText()));
});

test('electron steps stay within the render budget', async ({ page }) => {
  await mountAllLabs(page);
  await page.getByRole('button', { name: LABS.electron }).click();
  await expect(page.getByRole('button', { name: 'Run electron', exact: true })).toBeEnabled();
  checkBudget('electron', await rendersForSteps(page, page.getByRole('button', { name: 'Step', exact: true }), () => page.getByTestId('electron-tick').innerText()));
});

test('casimir steps stay within the render budget', async ({ page }) => {
  await mountAllLabs(page);
  await page.getByRole('button', { name: LABS.casimir }).click();
  checkBudget('casimir', await rendersForSteps(page, page.locator('.casimir-app').getByRole('button', { name: 'Step', exact: true }), () => page.getByTestId('casimir-time').innerText()));
});

test('van der Waals steps stay within the render budget', async ({ page }) => {
  await mountAllLabs(page);
  await page.getByRole('button', { name: LABS.vdw }).click();
  await page.getByRole('group', { name: 'Experiment stages' }).getByRole('button').nth(1).click();
  const diagram = page.locator('.vdw-diagram');
  checkBudget('vdw', await rendersForSteps(page, page.getByRole('button', { name: 'Step dipoles' }), () => diagram.innerHTML()));
});
