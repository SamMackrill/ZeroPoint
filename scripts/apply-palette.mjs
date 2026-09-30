// UI 01h: move every colour literal in TypeScript sources onto src/ui/palette.ts. Colours become design tokens (nearest
// by OKLab ΔE, with no chrome preference because code colours are mostly data encodings, and a hue guard so a coloured
// source never lands on a grey token). Scene lighting and emissive glows become named scene constants.
// Usage: node scripts/apply-palette.mjs [--dry-run]   (idempotent: a second run finds nothing)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deltaE, oklab, parseHex, readTokens } from './tokens-preview.mjs';
import { paletteKey, SCENE } from './sync-palette.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LITERAL = /(=)?(['"])(#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{4}|#[0-9a-fA-F]{3})\2/g;
export const MAX_TOKEN_DELTA = 10;

/** List TypeScript sources under src/ (except the generated palette), in stable order. */
export function sources(dir = join(root, 'src')) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !path.endsWith(join('ui', 'palette.ts')) ? [path] : [];
  });
}

/** OKLab chroma: how coloured (as opposed to grey) a colour is. */
const chroma = rgba => { const [, a, b] = oklab(rgba); return Math.hypot(a, b); };

/**
 * Nearest token for a colour used in code. A clearly coloured source (chroma > 0.04) never maps to a near-grey token
 * (chroma < 0.02) unless the grey is more than 4 ΔE closer, so data colours keep their hue.
 */
export function nearestForCode(rgba, tokens) {
  const ranked = tokens.map(token => ({ token, d: deltaE(rgba, token.rgba) })).sort((a, b) => a.d - b.d);
  if (chroma(rgba) <= 0.04) return ranked[0];
  const coloured = ranked.find(r => chroma(r.token.rgba) >= 0.02);
  return coloured && coloured.d - ranked[0].d <= 4 ? coloured : ranked[0];
}

/** Decide how a literal is expressed: a named scene constant (lights, glows) or a palette token. */
export function classify(line, hex, tokens) {
  const lighting = /(AmbientLight|DirectionalLight|HemisphereLight|PointLight|SpotLight)\(/.test(line) && line.indexOf(hex) > line.search(/Light\(/);
  const glow = new RegExp(`emissive:\\s*['"]${hex}`, 'i').test(line);
  if (lighting || glow) {
    const name = Object.entries(SCENE).find(([, value]) => value === hex.toLowerCase())?.[0];
    if (!name) throw new Error(`Unnamed scene colour ${hex} in: ${line.trim()}`);
    return { kind: 'scene', expr: `scene.${name}` };
  }
  const rgba = parseHex(hex), best = nearestForCode(rgba, tokens);
  if (best.d > MAX_TOKEN_DELTA) throw new Error(`${hex} is ΔE ${best.d.toFixed(1)} from any token; name it in SCENE or extend the palette.`);
  const alpha = rgba[3] < 1 ? Math.round(rgba[3] * 255).toString(16).padStart(2, '0') : '';
  return { kind: 'token', token: best.token, d: best.d, expr: `palette.${paletteKey(best.token.name)}`, alpha };
}

/** Rewrite one file's literals; returns the new text and what was used. */
export function applyPalette(text, tokens) {
  const used = new Set();
  const out = text.split('\n').map(line => line.replace(LITERAL, (match, eq, quote, hex) => {
    const c = classify(line, hex, tokens);
    used.add(c.kind === 'scene' ? 'scene' : 'palette');
    const value = c.alpha ? `\`\${${c.expr}}${c.alpha}\`` : c.expr;
    return eq ? `={${value}}` : value;
  })).join('\n');
  return { text: out, used };
}

/** Add `import { palette, scene } from '<relative>/ui/palette';` after the last existing import. */
export function addImport(text, file, used) {
  if (!used.size) return text;
  const names = [...used].sort().join(', ');
  let spec = relative(dirname(file), join(root, 'src', 'ui', 'palette')).split('\\').join('/');
  if (!spec.startsWith('.')) spec = `./${spec}`;
  const lines = text.split('\n'), last = lines.reduce((at, line, i) => (line.startsWith('import ') ? i : at), -1);
  lines.splice(last + 1, 0, `import { ${names} } from '${spec}';`);
  return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tokens = readTokens(readFileSync(join(root, 'src', 'ui', 'tokens.css'), 'utf8'));
  let total = 0;
  for (const file of sources()) {
    const before = readFileSync(file, 'utf8'), { text, used } = applyPalette(before, tokens);
    if (text === before) continue;
    const count = (before.match(LITERAL) ?? []).length; total += count;
    console.log(`${relative(root, file)}: ${count} colour(s)`);
    if (!process.argv.includes('--dry-run')) writeFileSync(file, addImport(text, file, used));
  }
  console.log(`${total} colour literal(s) ${process.argv.includes('--dry-run') ? 'would move' : 'moved'} to the palette.`);
}
