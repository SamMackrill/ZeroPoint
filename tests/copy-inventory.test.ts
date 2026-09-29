import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INVENTORY, inventory, normalize } from '../scripts/copy-inventory.mjs';

/** Concatenate every source file under src/ (any extension), whitespace-normalised, as the search corpus. */
function corpus(dir = join(__dirname, '..', 'src')): string {
  return readdirSync(dir, { withFileTypes: true }).map(entry => entry.isDirectory() ? corpus(join(dir, entry.name)) : normalize(readFileSync(join(dir, entry.name), 'utf8'))).join('\n');
}

// Every explanatory or caveat string recorded in the inventory must survive the redesign somewhere in src/ —
// moved into the About layer is fine, deleted or reworded is not (docs/ui-redesign-plan.html §10).
describe('UI copy inventory', () => {
  const entries: { file: string; text: string }[] = JSON.parse(readFileSync(INVENTORY, 'utf8'));
  const text = corpus();
  it('is non-trivial', () => expect(entries.length).toBeGreaterThan(50));
  it.each(entries.map(entry => [entry.file, entry.text]))('keeps %s: %s', (_file, prose) => expect(text).toContain(prose));
  it('records all current prose (run `node scripts/copy-inventory.mjs --write` after intentional additions)', () => {
    const known = new Set(entries.map(entry => entry.text));
    expect(inventory().filter(entry => !known.has(entry.text)).map(entry => entry.text)).toEqual([]);
  });
});
