// Before/after screenshots of real screens for any visible change, for review and approval (the owner asks for these
// on every visual change). "Before" is another worktree (usually the layer below); "after" is this one. Both run their
// own dev server, and the same screens are captured in each.
// Usage: node scripts/compare-screens.mjs --before ../01f-remedial-tooling --out docs/ui-previews/type-scale --title "Type scale"
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { SCREENS } from './tokens-preview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), option = name => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; };

/** Start a dev server for a worktree on a free port chosen from a range, returning its URL and server. */
async function serve(worktree, port) {
  const server = await createServer({ root: worktree, configFile: join(worktree, 'vite.config.ts'), logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  return { server, url: `http://127.0.0.1:${port}/` };
}

/** Open one screen (lab and scenario by test id) and capture the viewport as a JPEG. */
async function capture(browser, url, screen, path) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url);
  await page.getByTestId('transport-run').filter({ visible: true }).first().waitFor();
  if (screen.lab) await page.getByTestId(screen.lab).filter({ visible: true }).click();
  if (screen.scenario) await page.getByTestId(screen.scenario).filter({ visible: true }).click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, type: 'jpeg', quality: 82 });
  await page.close();
}

/** Render the review page: each screen before and after, side by side. */
export function reviewPage(title, description, screens) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZeroPoint · ${title}: before and after</title>
<style>body{margin:0;background:#0c131b;color:#e3ebf1;font:14px/1.55 'DM Sans',system-ui,'Segoe UI',sans-serif}main{max-width:1400px;margin:auto;padding:36px 28px 70px}h1{font-size:30px;letter-spacing:-.8px;margin:0 0 8px}h2{font-size:16px;margin:26px 0 8px}p{color:#aebfcc;max-width:900px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{width:100%;display:block;border:1px solid #34495b;border-radius:8px}figcaption{font:600 11px ui-monospace,Consolas,monospace;letter-spacing:1px;text-transform:uppercase;color:#8397a8;margin-top:6px}</style></head>
<body><main><h1>${title}: before and after</h1><p>${description}</p><p>Real screens: "before" runs the layer below, and "after" runs this layer. Click an image to open it at full size. Regenerate with <code>node scripts/compare-screens.mjs</code>.</p>
${screens.map(s => `<h2>${s.title}</h2><div class="pair"><figure><a href="${s.name}-before.jpg"><img src="${s.name}-before.jpg" alt="${s.title}, before" loading="lazy"></a><figcaption>Before</figcaption></figure><figure><a href="${s.name}-after.jpg"><img src="${s.name}-after.jpg" alt="${s.title}, after" loading="lazy"></a><figcaption>After</figcaption></figure></div>`).join('\n')}
</main></body></html>
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const before = option('--before'), out = option('--out'), title = option('--title') ?? 'Change', description = option('--description') ?? '';
  if (!before || !out) throw new Error('Usage: compare-screens.mjs --before <worktree> --out <dir> [--title T] [--description D]');
  const target = resolve(root, out), port = 5700 + Math.floor(Math.random() * 200);
  mkdirSync(target, { recursive: true });
  const [a, b] = [await serve(resolve(root, before), port), await serve(root, port + 1)];
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const screen of SCREENS) {
      await capture(browser, a.url, screen, join(target, `${screen.name}-before.jpg`));
      await capture(browser, b.url, screen, join(target, `${screen.name}-after.jpg`));
      console.log(`compared: ${screen.name}`);
    }
  } finally { await browser.close(); await a.server.close(); await b.server.close(); }
  writeFileSync(join(target, 'index.html'), reviewPage(title, description, SCREENS));
  console.log(`Review page: ${relative(root, join(target, 'index.html'))}`);
}
