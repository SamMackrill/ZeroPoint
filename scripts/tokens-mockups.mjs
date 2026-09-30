// Before/after mockups for the colour tokens (UI 01d): screenshot representative screens, then apply the token mapping
// to the live CSSOM (the same substitution UI 01e makes in source) and screenshot again. Output:
// docs/ui-tokens-preview/<screen>-before.jpg and -after.jpg, shown by docs/ui-tokens-preview.html.
// Usage: node scripts/tokens-mockups.mjs && node scripts/tokens-preview.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { nearest, readTokens, readUses, SCREENS, STYLESHEETS } from './tokens-preview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MOCKUP_DIR = join(root, 'docs', 'ui-tokens-preview');


/** Key a colour the way the browser's CSSOM serialises it: rgb channels plus alpha to two decimals. */
export const colourKey = ([r, g, b, a]) => `${r},${g},${b},${(a ?? 1).toFixed(2)}`;

/** Build the substitution table: every stylesheet colour → its token colour with the original alpha (as rgba()). */
export function tokenMapping(tokens, uses) {
  const table = {};
  for (const use of uses) {
    const token = nearest(use.rgba, tokens).token;
    table[colourKey(use.rgba)] = `rgba(${token.rgba.slice(0, 3).join(', ')}, ${+use.rgba[3].toFixed(3)})`;
  }
  return table;
}

/**
 * In the page: rewrite every rgb()/rgba() and hex colour in every rule to its token colour (runs inside the browser).
 * The CSSOM serialises ordinary properties as rgb(), but keeps custom property values (--mint: #…) as written.
 */
function applyMapping(table) {
  const key = inner => { const p = inner.split(/[\s,/]+/).filter(Boolean).map(Number); return `${p[0]},${p[1]},${p[2]},${(p[3] ?? 1).toFixed(2)}`; };
  const hexKey = hex => {
    let h = hex.slice(1).toLowerCase();
    if (h.length <= 4) h = [...h].map(c => c + c).join('');
    const n = [0, 2, 4, 6].map(i => parseInt(h.slice(i, i + 2) || 'ff', 16));
    return `${n[0]},${n[1]},${n[2]},${(n[3] / 255).toFixed(2)}`;
  };
  const rewrite = rules => {
    for (const rule of rules) {
      if (rule.cssRules) rewrite(rule.cssRules);
      if (!rule.style) continue;
      for (let i = 0; i < rule.style.length; i++) {
        const property = rule.style[i], value = rule.style.getPropertyValue(property);
        const next = value.replace(/rgba?\(([^)]+)\)/g, (match, inner) => table[key(inner)] ?? match)
          .replace(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi, match => table[hexKey(match)] ?? match);
        if (next !== value) rule.style.setProperty(property, next, rule.style.getPropertyPriority(property));
      }
    }
  };
  for (const sheet of document.styleSheets) rewrite(sheet.cssRules);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tokens = readTokens(readFileSync(join(root, 'src', 'ui', 'tokens.css'), 'utf8'));
  const table = tokenMapping(tokens, STYLESHEETS.flatMap(file => readUses(readFileSync(join(root, file), 'utf8'), file)));
  mkdirSync(MOCKUP_DIR, { recursive: true });
  const port = 5600 + Math.floor(Math.random() * 300);
  const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  // Launch the browser inside the server's cleanup scope, so a failed launch still stops Vite.
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    try {
      for (const screen of SCREENS) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.goto(`http://127.0.0.1:${port}/`);
        await page.getByTestId('transport-run').filter({ visible: true }).first().waitFor();
        if (screen.lab) await page.getByTestId(screen.lab).filter({ visible: true }).click();
        if (screen.scenario) await page.getByTestId(screen.scenario).filter({ visible: true }).click();
        await page.waitForTimeout(1200);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: join(MOCKUP_DIR, `${screen.name}-before.jpg`), type: 'jpeg', quality: 82 });
        await page.evaluate(applyMapping, table);
        await page.waitForTimeout(300);
        await page.screenshot({ path: join(MOCKUP_DIR, `${screen.name}-after.jpg`), type: 'jpeg', quality: 82 });
        await page.close();
        console.log(`mockups: ${screen.name}`);
      }
    } finally { await browser.close(); }
  } finally { await server.close(); }
}
