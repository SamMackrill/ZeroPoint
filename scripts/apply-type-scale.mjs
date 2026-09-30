// One-off source transformation for UI 01g: move every font size up to 15 px onto the type-scale tokens in
// src/ui/tokens.css, raising everything below 11 px to --fs-micro. Handles `font-size` and the `font` shorthand.
// Sizes of 16 px and above are legacy page headings and stay as they are. Usage: node scripts/apply-type-scale.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLESHEETS } from './tokens-preview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Map a pixel size to its type-scale token, or null for display sizes (16 px and above). */
export function typeToken(px) {
  if (px <= 11) return 'var(--fs-micro)';
  if (px <= 12) return 'var(--fs-ui)';
  if (px <= 13) return 'var(--fs-value)';
  if (px <= 14) return 'var(--fs-body)';
  if (px <= 15) return 'var(--fs-title)';
  return null;
}

/** Rewrite the size inside `font-size` and `font` declarations; other declarations are untouched. */
export function applyTypeScale(css) {
  return css.split('\n').map(line => {
    const decl = /^(\s*)(font-size|font):\s*(.+);\s*$/.exec(line);
    if (!decl) return line;
    // In `font`, the size is the first length before an optional /line-height; in `font-size` it is the whole value.
    const value = decl[3].replace(/(^|\s)(\d+(?:\.\d+)?)px(?=\s|\/|$)/, (match, lead, px) => { const token = typeToken(Number(px)); return token ? lead + token : match; });
    return `${decl[1]}${decl[2]}: ${value};`;
  }).join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const file of STYLESHEETS) {
    const path = join(root, file), before = readFileSync(path, 'utf8'), after = applyTypeScale(before);
    if (after !== before) writeFileSync(path, after);
    const count = text => (text.match(/var\(--fs-/g) ?? []).length;
    console.log(`${file}: ${count(after) - count(before)} size(s) moved to tokens`);
  }
}
