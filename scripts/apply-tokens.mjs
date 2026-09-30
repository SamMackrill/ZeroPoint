// One-off source transformation for UI 01e: replace every colour in the app's stylesheets with its approved design
// token, using the same nearest-token mapping as docs/ui-tokens-preview.html (approved 29 Sep 2026). Opaque colours
// become var(--token); translucent ones become color-mix(in srgb, var(--token) N%, transparent). The legacy :root
// variables --mint, --muted and --line are retired in favour of --accent, --text-3 and the --line token.
// Usage: node scripts/apply-tokens.mjs  (idempotent: a second run finds no colours to replace)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nearest, parseHex, readTokens, STYLESHEETS } from './tokens-preview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(([^)]*)\)/gi;
const LEGACY = [[/^\s*--(mint|muted|line):[^;]*;\n/gm, ''], [/var\(--mint\)/g, 'var(--accent)'], [/var\(--muted\)/g, 'var(--text-3)']];

/** Replace one colour literal with its token expression, keeping its alpha. */
export function tokenFor(literal, inner, tokens) {
  const rgba = literal.startsWith('#') ? parseHex(literal) : (p => [p[0], p[1], p[2], p[3] ?? 1])(inner.split(/[\s,/]+/).filter(Boolean).map(Number));
  const { token } = nearest(rgba, tokens);
  return rgba[3] >= 0.995 ? `var(${token.name})` : `color-mix(in srgb, var(${token.name}) ${Math.round(rgba[3] * 100)}%, transparent)`;
}

/** Rewrite a stylesheet: colours in declarations become tokens; legacy variables are retired. */
export function applyTokens(css, tokens) {
  let out = css;
  for (const [pattern, replacement] of LEGACY) out = out.replace(pattern, replacement);
  return out.split('\n').map(line => /^\s*[\w-]+:\s*.+;\s*$/.test(line) ? line.replace(COLOUR, (literal, inner) => tokenFor(literal, inner, tokens)) : line).join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tokens = readTokens(readFileSync(join(root, 'src', 'ui', 'tokens.css'), 'utf8'));
  for (const file of STYLESHEETS) {
    const path = join(root, file), before = readFileSync(path, 'utf8'), after = applyTokens(before, tokens);
    if (after !== before) writeFileSync(path, after);
    console.log(`${file}: ${(before.match(COLOUR) ?? []).length} colour literal(s) → ${(after.match(COLOUR) ?? []).length}`);
  }
}
