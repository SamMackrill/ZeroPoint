// Check every PaperTrails id ZeroPoint links to against the published PaperTrails data, so a renamed or removed
// scientist or paper, or a moved brand mark, is caught before readers find a link that opens nothing. Run: node scripts/check-papertrails.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(`${root}src/papertrails/data.ts`, 'utf8');
const base = /export const PAPERTRAILS = '([^']+)'/.exec(source)?.[1];
if (!base) throw new Error('PAPERTRAILS address not found in src/papertrails/data.ts');

const people = readFileSync(`${root}src/papertrails/people.ts`, 'utf8');
const peopleBlock = /export const PEOPLE = \{([\s\S]*?)\} as const;/.exec(people)?.[1] ?? '';
const scientistIds = [...peopleBlock.matchAll(/^\s*([a-z_]+):/gm)].map(m => m[1]);
const paperIds = [...new Set([...people.matchAll(/id: '([\w-]+-work-\d+)'/g)].map(m => m[1]))];

const mark = await fetch(`${base}images/icon.svg`, { method: 'HEAD' });
if (!mark.ok) throw new Error(`PaperTrails' mark (images/icon.svg) answered ${mark.status}`);
const response = await fetch(`${base}data/scientists.yaml`);
if (!response.ok) throw new Error(`PaperTrails answered ${response.status}`);
const data = yaml.load(await response.text(), { schema: yaml.CORE_SCHEMA });
const papers = new Set(Object.values(data).flatMap(s => (s.publications ?? []).map(p => p.id)));

const missing = [
  ...scientistIds.filter(id => !data[id]).map(id => `scientist:${id}`),
  ...paperIds.filter(id => !papers.has(id)).map(id => `publication:${id}`),
];
console.log(`Checked the mark, ${scientistIds.length} scientists and ${paperIds.length} papers against ${base}`);
if (missing.length) {
  console.error(`Not on PaperTrails: ${missing.join(', ')}`);
  process.exit(1);
}
