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
