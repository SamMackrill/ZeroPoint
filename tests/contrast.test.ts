import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Plan §13 accessibility checklist: text tokens meet WCAG AA (4.5 : 1) on the surfaces text sits on, and --text-3 is
// the floor for readable text. --text-4 is for disabled or decorative marks only.
const css = readFileSync(new URL('../src/ui/tokens.css', import.meta.url), 'utf8');
const token = (name: string) => {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match) throw new Error(`No --${name} in tokens.css`);
  return match[1];
};

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio between two colours. */
const contrast = (a: string, b: string) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

describe('token contrast', () => {
  const surfaces = ['bg-0', 'bg-1', 'bg-2', 'bg-3'];
  for (const text of ['text', 'text-2', 'text-3', 'accent', 'accent-2', 'danger']) {
    it(`--${text} meets WCAG AA on every surface`, () => {
      for (const surface of surfaces) expect(contrast(token(text), token(surface)), `--${text} on --${surface}`).toBeGreaterThanOrEqual(4.5);
    });
  }
  it('--text-4 is below AA, so it stays decorative (the token comment says so)', () => {
    expect(contrast(token('text-4'), token('bg-1'))).toBeLessThan(4.5);
    expect(css).toMatch(/--text-4:[^;]+;\s*\/\*[^*]*decorative/);
  });
});
