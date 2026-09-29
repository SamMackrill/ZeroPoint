import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast, deltaE, nearest, parseHex, readTokens, readUses } from '../scripts/tokens-preview.mjs';

describe('tokens preview', () => {
  it('parses every hex form, keeping alpha', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255, 1]);
    expect(parseHex('#0009')).toEqual([0, 0, 0, 0x99 / 255]);
    expect(parseHex('#93dec0')).toEqual([0x93, 0xde, 0xc0, 1]);
    expect(parseHex('#f59e7150')).toEqual([0xf5, 0x9e, 0x71, 0x50 / 255]);
  });
  it('measures perceptual distance and WCAG contrast', () => {
    expect(deltaE([10, 20, 30, 1], [10, 20, 30, 1])).toBe(0);
    expect(deltaE([0, 0, 0, 1], [255, 255, 255, 1])).toBeGreaterThan(90);
    expect(contrast([255, 255, 255, 1], [0, 0, 0, 1])).toBeCloseTo(21, 5);
  });
  it('reads tokens with their groups, and colour uses with property and selector', () => {
    const tokens = readTokens(':root {\n  /* Surfaces */\n  --bg-0: #0a1017;\n  /* Data */\n  --data-e: #93dec0;\n}');
    expect(tokens.map(t => [t.name, t.group])).toEqual([['--bg-0', 'Surfaces'], ['--data-e', 'Data']]);
    const uses = readUses('.chip,\n.pill {\n  color: #8FE0C2;\n  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);\n}', 'x.css');
    expect(uses.map(u => [u.raw, u.property, u.selector])).toEqual([['#8fe0c2', 'color', '.pill'], ['rgba(0, 0, 0, 0.5)', 'box-shadow', '.pill']]);
    expect(uses[1].rgba).toEqual([0, 0, 0, 0.5]);
  });
  it('keeps chrome off data tokens when a chrome token is nearly as close', () => {
    const tokens = readTokens(readFileSync('src/ui/tokens.css', 'utf8'));
    expect(nearest(parseHex('#93dec0'), tokens).token.name).toBe('--accent');
    expect(nearest(parseHex('#f2a67f'), tokens).token.name).toBe('--data-pos');
  });
});
