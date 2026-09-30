// Report gzip sizes of the built assets against tests/fixtures/bundle-size.json as a Markdown table (for PR bodies
// and the CI step summary). Usage: npm run build && node scripts/bundle-size.mjs [--write]
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'dist', 'assets'), baselineFile = join(root, 'tests', 'fixtures', 'bundle-size.json');

/** Strip Vite's content hash so an asset keeps one name across builds (index-AbC123.js → index.js). */
export const stableName = file => file.replace(/-[\w-]{8}(\.\w+)$/, '$1');

/** Measure the gzip size of every JS and CSS asset, keyed by stable name. */
function measure() {
  const sizes = {};
  for (const file of readdirSync(assets).filter(name => /\.(js|css)$/.test(name)).sort()) {
    const name = stableName(file);
    sizes[name] = (sizes[name] ?? 0) + gzipSync(readFileSync(join(assets, file))).length;
  }
  return sizes;
}

/** Format bytes as kB with one decimal place. */
const kb = bytes => `${(bytes / 1024).toFixed(1)} kB`;

if (!existsSync(assets)) { console.error('Run `npm run build` first.'); process.exit(1); }
const sizes = measure();
if (process.argv.includes('--write')) { writeFileSync(baselineFile, JSON.stringify(sizes, null, 2) + '\n'); console.log(`Recorded ${Object.keys(sizes).length} assets.`); process.exit(0); }
const baseline = existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, 'utf8')) : {};
const names = [...new Set([...Object.keys(baseline), ...Object.keys(sizes)])].sort();
const total = map => Object.values(map).reduce((sum, value) => sum + value, 0);
/** Render a signed size change, or a dash when unchanged. */
const delta = (now = 0, before = 0) => now === before ? '—' : `${now > before ? '+' : '−'}${kb(Math.abs(now - before))}`;
console.log('| Asset (gzip) | Baseline | Now | Change |\n|---|---:|---:|---:|');
for (const name of names) console.log(`| ${name} | ${baseline[name] ? kb(baseline[name]) : '—'} | ${sizes[name] ? kb(sizes[name]) : '—'} | ${delta(sizes[name], baseline[name])} |`);
console.log(`| **Total** | ${kb(total(baseline))} | ${kb(total(sizes))} | ${delta(total(sizes), total(baseline))} |`);
