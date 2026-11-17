// Capture companion pages for review: one image per figure card of a chapter, or a whole page.
// Usage: node scripts/book-shots.mjs <outDir> <route> [--cards] [--t=seconds] [--width=1280]
// The dev server must be running (ZP_PORT, default 5174). Routes are companion routes: "ch/6", "guide", "future", "" (contents).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { devPort } from './dev-port.mjs';

const [out, where = '', ...flags] = process.argv.slice(2);
// The route is given without its leading #/ ("ch/6"), because Git Bash rewrites arguments that look like paths.
const route = `#/${where.replace(/^#?\/?/, '')}`;
if (!out) { console.error('Usage: node scripts/book-shots.mjs <outDir> <route> [--cards] [--t=seconds] [--width=1280]'); process.exit(1); }
/** Read a --name=value flag as a number. */
const flag = (name, fallback) => Number(flags.find(f => f.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: flag('width', 1280), height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${devPort()}/book/${route}`);
await page.waitForSelector('.bk-main h1');
if (flags.includes('--cards')) await page.waitForSelector('.bk-card');
await page.waitForTimeout(600);
const name = route.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'contents';
if (flags.includes('--cards')) {
  for (const card of await page.locator('.bk-card').all()) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(flag('t', 0.7) * 1000);
    const id = await card.getAttribute('data-testid');
    await card.screenshot({ path: join(out, `${name}-${id}.png`) });
  }
} else {
  await page.waitForTimeout(flag('t', 0.7) * 1000);
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
else console.log('no page errors');
await browser.close();
