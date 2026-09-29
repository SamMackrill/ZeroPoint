// Extract every prose string (8+ words) from the UI source into tests/fixtures/copy-inventory.json.
// The UI redesign promises to move scientific caveats and explanations verbatim into an About layer rather than
// delete them (docs/ui-redesign-plan.html §10); tests/copy-inventory.test.ts checks every entry still exists in src/.
// Usage: node scripts/copy-inventory.mjs [--write]. Without --write it lists entries missing from the fixture.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const INVENTORY = join(root, 'tests', 'fixtures', 'copy-inventory.json');
const MIN_WORDS = 8;

/** List TSX sources under a directory, recursively and in stable order. */
export function sources(dir = join(root, 'src')) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sources(path) : entry.name.endsWith('.tsx') ? [path] : [];
  });
}

/** Collapse whitespace so JSX line wrapping never affects matching. */
export const normalize = text => text.replace(/\s+/g, ' ').trim();

/** Reject runs that are code rather than prose: identifier lists, camelCase names, calls, arithmetic, keywords. */
function isCode(text) {
  const items = text.split(', ');
  if (items.length >= 4 && items.every(item => item.split(' ').length <= 2)) return true;
  return /[=;]|=>|&&|\|\||\b(const|let|return|import|export|function|type|async)\b|\w\.\w+\(|\b[a-z]+[A-Z]\w*\b|\b[A-Z][A-Z_]{3,}\b|[*/] ?[\d(]|[\d)] ?[*/+-] ?[\d(]/.test(text);
}

/** Split source (comments removed) at JSX and string delimiters and keep prose runs of 8+ words. */
export function prose(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return code.split(/[<>{}`"]|'(?![a-z])|(?<![a-z])'/i).map(normalize).filter(text => text.split(' ').length >= MIN_WORDS && /[a-z]{3}/i.test(text) && !isCode(text));
}

/** Build the inventory: unique prose entries with the file each came from. */
export function inventory() {
  const seen = new Set(), entries = [];
  for (const file of sources()) for (const text of prose(readFileSync(file, 'utf8'))) {
    if (seen.has(text)) continue;
    seen.add(text); entries.push({ file: relative(root, file).replaceAll('\\', '/'), text });
  }
  return entries;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const entries = inventory();
  if (process.argv.includes('--write')) {
    writeFileSync(INVENTORY, JSON.stringify(entries, null, 2) + '\n');
    console.log(`Wrote ${entries.length} entries to ${relative(root, INVENTORY)}.`);
  } else {
    const known = new Set(JSON.parse(readFileSync(INVENTORY, 'utf8')).map(entry => entry.text));
    const added = entries.filter(entry => !known.has(entry.text));
    console.log(added.length ? added.map(entry => `+ ${entry.file}: ${entry.text}`).join('\n') : 'No new prose outside the inventory.');
  }
}
