import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderPalette } from '../scripts/sync-palette.mjs';
import { readTokens } from '../scripts/tokens-preview.mjs';

const root = join(__dirname, '..');

/** List every stylesheet under src/, recursively. */
function stylesheets(dir = join(root, 'src')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? stylesheets(join(dir, entry.name)) : entry.name.endsWith('.css') ? [join(dir, entry.name)] : []);
}

/** Split a selector at characters matching `at`, but only outside parentheses and brackets (:is(.a, .b), [x="a b"]). */
function splitTopLevel(text: string, at: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0, current = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if ((ch === ')' || ch === ']') && depth > 0) depth--;
    if (depth === 0 && at.test(ch)) { parts.push(current); current = ''; } else current += ch;
  }
  return [...parts, current].map(p => p.trim()).filter(Boolean);
}

/**
 * Selectors of rules that colour text with --text-4. Only svg selectors are exempt, and a rule qualifies only when every
 * selector in its (possibly multi-line) selector list ends in svg.
 */
function text4Offenders(css: string): string[] {
  let selector = '', pending: string[] = [];
  return css.split('\n').flatMap(line => {
    const trimmed = line.trim();
    if (trimmed.endsWith('{')) { selector = [...pending, trimmed.slice(0, -1).trim()].join(' '); pending = []; }
    else if (trimmed.endsWith(',')) pending.push(trimmed);
    else pending = [];
    // The last compound of each selector must be the svg type selector (svg, svg.icon, svg:hover), not .caption-svg.
    const svgOnly = splitTopLevel(selector, /,/).every(part => /^svg(?![\w-])/.test(splitTopLevel(part, /[\s>+~]/).pop() ?? ''));
    return /^\s*color:\s*var\(--text-4\)/.test(line) && !svgOnly ? [selector] : [];
  });
}

// Colours are design tokens (src/ui/tokens.css, approved in UI 01d). Component stylesheets refer to them with var() or
// color-mix(); a raw colour literal anywhere else would reintroduce the one-off palette the redesign removed.
describe('colour tokens', () => {
  const tokensFile = join(root, 'src', 'ui', 'tokens.css');
  const defined = new Set([...readFileSync(tokensFile, 'utf8').matchAll(/^\s*(--[\w-]+):/gm)].map(m => m[1]));
  const files = stylesheets().filter(file => file !== tokensFile).map(file => [relative(root, file).split(sep).join('/'), file]);
  it.each(files)('%s uses tokens, not colour literals', (_name, file) => {
    const css = readFileSync(file, 'utf8');
    expect(css.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi) ?? []).toEqual([]);
    const used = [...css.matchAll(/var\((--[\w-]+)\)/g)].map(m => m[1]).filter(name => name !== '--mono');
    expect(used.filter(name => !defined.has(name))).toEqual([]);
  });
  // --text-4 is below AA contrast: disabled or decorative only. As a text colour it may only colour icons.
  it.each(files)('%s keeps readable text off --text-4', (_name, file) => {
    expect(text4Offenders(readFileSync(file, 'utf8'))).toEqual([]);
  });
  it('flags a readable selector grouped with an svg one', () => {
    expect(text4Offenders('.caption, svg {\n  color: var(--text-4);\n}\n')).toEqual(['.caption, svg']);
    expect(text4Offenders('.caption,\nsvg {\n  color: var(--text-4);\n}\n')).toEqual(['.caption, svg']);
    expect(text4Offenders('.a svg,\n.b svg {\n  color: var(--text-4);\n}\n')).toEqual([]);
    expect(text4Offenders('.caption-svg {\n  color: var(--text-4);\n}\n')).toEqual(['.caption-svg']);
    expect(text4Offenders('.svg {\n  color: var(--text-4);\n}\n')).toEqual(['.svg']);
    expect(text4Offenders('.panel > svg.icon {\n  color: var(--text-4);\n}\n')).toEqual([]);
    expect(text4Offenders('svg:is(.icon, .active) {\n  color: var(--text-4);\n}\n')).toEqual([]);
    expect(text4Offenders('.caption:is(.a, svg) {\n  color: var(--text-4);\n}\n')).toEqual(['.caption:is(.a, svg)']);
  });
  // Type scale (UI 01g): nothing below 11 px, and every size up to 15 px comes from a --fs-* token. Literal sizes of
  // 16 px and above are legacy page headings that the shell replaces.
  it.each(files)('%s uses the type scale', (_name, file) => {
    const sizes = [...readFileSync(file, 'utf8').matchAll(/^\s*(?:font-size|font):[^;]*?(?:^|\s|:)(\d+(?:\.\d+)?)px/gm)].map(m => Number(m[1]));
    expect(sizes.filter(px => px < 16)).toEqual([]);
  });
});

/** List every TypeScript source under src/, recursively. */
function codeFiles(dir = join(root, 'src')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? codeFiles(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : []);
}

// Code colours (Three.js, canvas, generated SVG) come from src/ui/palette.ts, generated from the same tokens (UI 01h).
describe('palette in code', () => {
  const paletteFile = join(root, 'src', 'ui', 'palette.ts');
  it('palette.ts is generated from tokens.css (run node scripts/sync-palette.mjs)', () => {
    const tokens = readTokens(readFileSync(join(root, 'src', 'ui', 'tokens.css'), 'utf8'));
    expect(readFileSync(paletteFile, 'utf8')).toBe(renderPalette(tokens));
  });
  const files = codeFiles().filter(file => file !== paletteFile).map(file => [relative(root, file).split(sep).join('/'), file]);
  it.each(files)('%s takes colours from the palette, not literals', (_name, file) => {
    expect(readFileSync(file, 'utf8').match(/['"`]#[0-9a-f]{3,8}['"`]/gi) ?? []).toEqual([]);
  });
});
