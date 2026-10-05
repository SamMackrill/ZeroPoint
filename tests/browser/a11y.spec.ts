import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { tid } from './ids';

/** Run axe (WCAG 2.1 A and AA) on what is visible now; the WebGL canvas itself is out of scope. */
async function audit(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('canvas').analyze();
  return results.violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
}

const labs = [['medium', ''], ['light', 'lab-light'], ['electron', 'lab-electron'], ['casimir', 'lab-casimir'], ['vdw', 'lab-vdw']] as const;

for (const [name, lab] of labs) {
  test(`${name} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto('/'); await expect(page.locator('.workbench-status').filter({ visible: true })).toBeVisible();
    if (lab) await tid(page, lab).filter({ visible: true }).click();
    await page.waitForTimeout(500);
    expect(await audit(page)).toEqual([]);
  });
}

/** Press Tab until the focused element matches, as a keyboard-only user would. */
async function tabTo(page: Page, selector: string, max = 80) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(s => !!document.activeElement?.matches(s), selector)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${selector}`);
}

test('the core loop works from the keyboard alone, and the run state is announced', async ({ page }) => {
  await page.goto('/'); await expect(tid(page, 'transport-run')).toBeEnabled();
  const runState = page.locator('.medium-workbench').getByTestId('run-state');
  await expect(runState).toHaveAttribute('aria-live', 'polite');
  // Choose a scenario in the rail.
  await tabTo(page, '[data-testid="scenario-sparse"]'); await page.keyboard.press('Enter');
  await expect(page.locator('.workbench-breadcrumb [aria-current=page]').filter({ visible: true })).toContainText('Sparse fluctuations');
  // Run and pause from the Run button, then step with →.
  await tabTo(page, '[data-testid="transport-run"]'); await page.keyboard.press('Space');
  await expect(runState).toHaveText('Running');
  await page.keyboard.press('Space'); await expect(runState).toHaveText('Paused');
  const before = await page.getByTestId('tick').innerText();
  await page.keyboard.press('ArrowRight'); await expect(page.getByTestId('tick')).not.toHaveText(before);
  // Change a live parameter with its slider.
  await tabTo(page, '[role="slider"][aria-label^="Frequency centre"]');
  const value = await page.getByRole('slider', { name: /Frequency centre/ }).getAttribute('aria-valuenow');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('slider', { name: /Frequency centre/ })).not.toHaveAttribute('aria-valuenow', value!);
  // Help opens with ? and closes with Esc, returning to the workbench.
  await page.keyboard.press('Escape'); await page.locator('body').press('Shift+Slash');
  await expect(page.getByTestId('about-sheet')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByTestId('about-sheet')).toHaveCount(0);
});
