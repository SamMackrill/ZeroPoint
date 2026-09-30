import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');

/** List every stylesheet under src/, recursively. */
function stylesheets(dir = join(root, 'src')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? stylesheets(join(dir, entry.name)) : entry.name.endsWith('.css') ? [join(dir, entry.name)] : []);
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
});
