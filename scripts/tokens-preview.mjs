// Generate docs/ui-tokens-preview.html: every colour in the app's stylesheets beside the design token it would become
// (UI 01d; approval gate before UI 01e applies the tokens). Usage: node scripts/tokens-preview.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STYLESHEETS = ['src/app/styles.css', 'src/app/brand-mark.css', 'src/app/repository-link.css', 'src/light/light.css', 'src/electron/electron.css', 'src/casimir/casimir.css', 'src/van-der-waals/van-der-waals.css'];
const TOKENS_FILE = 'src/ui/tokens.css';

/** The screens shown before and after: a lab (by its test id) and optionally a scenario within it. */
export const SCREENS = [
  { name: 'medium', title: 'Medium · Balanced' },
  { name: 'light', title: 'Light · Induction sequence', lab: 'lab-light' },
  { name: 'electron-spin', title: 'Electron · Spin in the field', lab: 'lab-electron', scenario: 'scenario-spin' },
  { name: 'casimir', title: 'Extended Casimir · e⁻/e⁻', lab: 'lab-casimir' },
  { name: 'vdw-pressure', title: 'Van der Waals · Plate pressure', lab: 'lab-vdw', scenario: 'scenario-pressure' },
];

/** Parse #rgb, #rgba, #rrggbb or #rrggbbaa into [r, g, b, a] (0–255, alpha 0–1). */
export function parseHex(hex) {
  let h = hex.slice(1).toLowerCase();
  if (h.length <= 4) h = [...h].map(c => c + c).join('');
  const n = [0, 2, 4, 6].map(i => parseInt(h.slice(i, i + 2) || 'ff', 16));
  return [n[0], n[1], n[2], n[3] / 255];
}

/** Convert an sRGB colour to OKLab ([L, a, b]); distances there track perceived difference. */
export function oklab([r, g, b]) {
  const lin = c => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** Perceptual distance (ΔE in OKLab, ×100 so 1 ≈ just noticeable, 5+ clearly different). */
export function deltaE(x, y) {
  const [a, b] = [oklab(x), oklab(y)];
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** WCAG contrast ratio between two opaque colours. */
export function contrast(x, y) {
  const lum = ([r, g, b]) => { const f = c => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const [hi, lo] = [lum(x), lum(y)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/** Read the proposed tokens: `--name: #hex;` lines, each group introduced by a one-line block comment naming it. */
export function readTokens(css) {
  const tokens = []; let group = '';
  for (const line of css.split('\n')) {
    const heading = /^\s*\/\* (.+?) \*\//.exec(line);
    if (heading && !line.includes('--')) group = heading[1];
    const token = /^\s*(--[\w-]+):\s*(#[0-9a-f]{3,8})\s*;/i.exec(line);
    if (token) tokens.push({ name: token[1], hex: token[2].toLowerCase(), rgba: parseHex(token[2]), group });
  }
  return tokens;
}

/** Find every hex or rgb()/rgba() colour in formatted CSS, with its selector, property and file. */
export function readUses(css, file) {
  const uses = []; let selector = '';
  for (const line of css.split('\n')) {
    if (line.trim().endsWith('{')) selector = line.trim().slice(0, -1).trim();
    const decl = /^\s*([\w-]+):\s*(.+);\s*$/.exec(line);
    if (!decl) continue;
    for (const m of decl[2].matchAll(/#[0-9a-f]{3,8}\b|rgba?\(([^)]*)\)/gi)) {
      let rgba;
      if (m[0].startsWith('#')) rgba = parseHex(m[0]);
      else { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); rgba = [p[0], p[1], p[2], p[3] ?? 1]; }
      uses.push({ raw: m[0].toLowerCase(), rgba, property: decl[1], selector, file });
    }
  }
  return uses;
}

/**
 * Map a colour to its perceptually nearest token (alpha is kept as a mix with transparent). Stylesheet colours are
 * chrome, so a chrome token within CHROME_MARGIN of the best data token wins: accent and electric-field mint are nearly
 * identical, and chrome must never borrow data colours.
 */
export const CHROME_MARGIN = 1;
export function nearest(rgba, tokens) {
  const ranked = tokens.map(token => ({ token, d: deltaE(rgba, token.rgba) })).sort((a, b) => a.d - b.d);
  const best = ranked[0], chrome = ranked.find(r => !r.token.group.startsWith('Data'));
  return best.token.group.startsWith('Data') && chrome && chrome.d - best.d <= CHROME_MARGIN ? chrome : best;
}

const swatch = (rgba, title) => `<i class="sw" title="${title}" style="background:rgba(${rgba.slice(0, 3).join(',')},${rgba[3].toFixed(3)})"></i>`;
const hexOf = rgba => '#' + rgba.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tokens = readTokens(readFileSync(join(root, TOKENS_FILE), 'utf8'));
  const uses = STYLESHEETS.flatMap(file => readUses(readFileSync(join(root, file), 'utf8'), file));
  const colours = new Map();
  for (const use of uses) {
    const key = hexOf(use.rgba) + (use.rgba[3] < 1 ? `@${use.rgba[3].toFixed(2)}` : '');
    const entry = colours.get(key) ?? { key, rgba: use.rgba, uses: [] };
    entry.uses.push(use); colours.set(key, entry);
  }
  const mapped = [...colours.values()].map(c => ({ ...c, ...nearest(c.rgba, tokens) }));
  const byToken = new Map(tokens.map(t => [t.name, []]));
  for (const c of mapped) byToken.get(c.token.name).push(c);
  const within = limit => mapped.filter(c => c.d <= limit).length;
  const bands = [[2, 'imperceptible'], [5, 'subtle'], [10, 'noticeable'], [Infinity, 'large']];
  const band = d => bands.find(([limit]) => d <= limit)[1];
  const text = tokens.filter(t => t.group.startsWith('Text')), surfaces = tokens.filter(t => t.group.startsWith('Surface'));
  const row = c => `<tr class="${band(c.d)}"><td>${swatch(c.rgba, c.key)}<code>${c.key}</code></td><td>${swatch(c.token.rgba, c.token.name)}<code>${c.token.name}</code>${c.rgba[3] < 1 ? ` <small>at ${Math.round(c.rgba[3] * 100)}%</small>` : ''}</td><td class="num">${c.d.toFixed(1)}</td><td>${band(c.d)}</td><td class="num">${c.uses.length}</td><td><small>${[...new Set(c.uses.map(u => `${u.property} · ${relative('src', u.file).replaceAll('\\', '/')}`))].slice(0, 3).join('<br>')}</small></td></tr>`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZeroPoint · Proposed colour tokens</title>
<style>
body{margin:0;background:#0c131b;color:#e3ebf1;font:14px/1.55 'DM Sans',system-ui,'Segoe UI',sans-serif}main{max-width:1280px;margin:auto;padding:40px 32px 80px}
h1{font-size:34px;letter-spacing:-1px;margin:0 0 10px}h2{font-size:22px;margin:40px 0 12px}p{max-width:900px;color:#aebfcc}code{font-family:ui-monospace,'IBM Plex Mono',Consolas,monospace;font-size:12px}
.sw{display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid #ffffff33;vertical-align:-4px;margin-right:7px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}.tok{background:#101a24;border:1px solid #253646;border-radius:8px;padding:10px 12px}.tok .big{height:44px;border-radius:6px;border:1px solid #ffffff22;margin-bottom:8px}.tok small{color:#8397a8;display:block}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.stat{background:#101a24;border:1px solid #253646;border-radius:8px;padding:10px 14px}.stat b{display:block;font-size:22px;font-family:ui-monospace,Consolas,monospace}.stat span{color:#8397a8;font-size:12px}
table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0 20px}th{text-align:left;color:#8397a8;font:600 11px ui-monospace,Consolas,monospace;text-transform:uppercase;letter-spacing:.8px;padding:6px 8px;border-bottom:1px solid #34495b}td{padding:5px 8px;border-bottom:1px solid #1b2b3a;vertical-align:top}.num{text-align:right;font-family:ui-monospace,Consolas,monospace}
tr.noticeable td:nth-child(4){color:#f0c98a}tr.large td:nth-child(4){color:#f39a82;font-weight:600}.pair{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;margin:3px}
details{background:#101a24;border:1px solid #253646;border-radius:8px;margin:8px 0}summary{cursor:pointer;padding:10px 14px;font-weight:600}details>div{padding:0 14px 10px}
.pair2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pair2 figure{margin:0}.pair2 img{width:100%;display:block;border:1px solid #34495b;border-radius:8px}.pair2 figcaption{font:600 11px ui-monospace,Consolas,monospace;letter-spacing:1px;text-transform:uppercase;color:#8397a8;margin-top:6px}
.callout{border-left:3px solid #f0c98a;background:#101a24;padding:12px 16px;border-radius:0 8px 8px 0;max-width:960px}
</style></head><body><main>
<p style="font:600 11px ui-monospace,monospace;letter-spacing:1.6px;color:#8fe0c2;text-transform:uppercase">UI 01d · approval gate · generated by scripts/tokens-preview.mjs</p>
<h1>Proposed colour tokens</h1>
<p>This page shows every colour in today's seven stylesheets next to the token it becomes in UI 01e. The distance ΔE is perceptual (OKLab ×100): below 2 is imperceptible, 2–5 subtle, 5–10 noticeable, and above 10 large. Semi-transparent colours keep their transparency as a mix with the token. The palette is defined in <code>${TOKENS_FILE}</code>.</p>
<div class="callout"><b>Approved</b> by the owner on 29 September 2026. UI 01e applies this palette. To propose a change later, edit <code>${TOKENS_FILE}</code> and regenerate this page (and its before/after mockups) for review.</div>
<div class="stats"><div class="stat"><b>${colours.size} → ${tokens.length}</b><span>distinct colours → tokens</span></div><div class="stat"><b>${uses.length}</b><span>colour uses in CSS</span></div>${bands.map(([limit, name], i) => `<div class="stat"><b>${mapped.filter(c => band(c.d) === name).length}</b><span>${name} (ΔE ${limit === Infinity ? `over ${bands[i - 1][0]}` : i ? `${bands[i - 1][0]}–${limit}` : `≤ ${limit}`})</span></div>`).join('')}<div class="stat"><b>${Math.round(100 * within(5) / mapped.length)}%</b><span>within ΔE 5</span></div></div>
${SCREENS.some(s => existsSync(join(root, 'docs', 'ui-tokens-preview', `${s.name}-after.jpg`))) ? `<h2>Before and after</h2>
<p>These are real screens. Each "after" applies this exact mapping to the running app's stylesheets, as UI 01e will in source. Colours set inline in components and the WebGL canvases change in later layers (UI 01g), so they look the same here. Click an image to open it at full size. Regenerate with <code>node scripts/tokens-mockups.mjs</code>.</p>
${SCREENS.map(s => `<h3 style="margin:22px 0 8px;font-size:15px">${s.title}</h3><div class="pair2"><figure><a href="ui-tokens-preview/${s.name}-before.jpg"><img src="ui-tokens-preview/${s.name}-before.jpg" alt="${s.title}, current colours" loading="lazy"></a><figcaption>Now</figcaption></figure><figure><a href="ui-tokens-preview/${s.name}-after.jpg"><img src="ui-tokens-preview/${s.name}-after.jpg" alt="${s.title}, with tokens" loading="lazy"></a><figcaption>With tokens</figcaption></figure></div>`).join('')}` : ''}
<h2>The palette</h2>
${[...new Set(tokens.map(t => t.group))].map(group => `<h3 style="margin:18px 0 8px;font-size:14px;color:#aebfcc">${group}</h3><div class="grid">${tokens.filter(t => t.group === group).map(t => `<div class="tok"><div class="big" style="background:${t.hex}"></div><code>${t.name}</code><small>${t.hex} · replaces ${byToken.get(t.name).length} colour(s), ${byToken.get(t.name).reduce((n, c) => n + c.uses.length, 0)} use(s)</small></div>`).join('')}</div>`).join('')}
<h2>Text contrast (WCAG AA needs 4.5 for body text)</h2>
<table><thead><tr><th>Text \\ surface</th>${surfaces.map(s => `<th>${swatch(s.rgba, s.name)}${s.name}</th>`).join('')}</tr></thead><tbody>${text.map(t => `<tr><td>${swatch(t.rgba, t.name)}<code>${t.name}</code></td>${surfaces.map(s => { const r = contrast(t.rgba, s.rgba); return `<td class="num" style="color:${r >= 4.5 ? '#8fe0c2' : '#f39a82'}">${r.toFixed(1)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>
<h2>Largest changes first</h2>
<p>These are the colours that move furthest. Check that each still makes sense for its role (the property and file show where it's used).</p>
<table><thead><tr><th>Now</th><th>Becomes</th><th class="num">ΔE</th><th>Change</th><th class="num">Uses</th><th>Where</th></tr></thead><tbody>${mapped.filter(c => c.d > 5).sort((a, b) => b.d - a.d).map(row).join('')}</tbody></table>
<h2>Every colour, by token</h2>
${tokens.map(t => `<details><summary>${swatch(t.rgba, t.name)}${t.name} <small style="color:#8397a8">${t.hex} · ${byToken.get(t.name).length} colour(s)</small></summary><div><table><thead><tr><th>Now</th><th>Becomes</th><th class="num">ΔE</th><th>Change</th><th class="num">Uses</th><th>Where</th></tr></thead><tbody>${byToken.get(t.name).sort((a, b) => b.d - a.d).map(row).join('')}</tbody></table></div></details>`).join('')}
</main></body></html>
`;
  writeFileSync(join(root, 'docs', 'ui-tokens-preview.html'), html);
  console.log(`${colours.size} colours, ${uses.length} uses → ${tokens.length} tokens; within ΔE 2: ${within(2)}, ΔE 5: ${within(5)}, ΔE 10: ${within(10)}; max ΔE ${Math.max(...mapped.map(c => c.d)).toFixed(1)}`);
}
