// PaperTrails, the owner's timeline of scientists and their papers, published separately. ZeroPoint links to its people
// and papers and, for the hover cards, reads its scientist data live from the published site, so the cards follow
// PaperTrails as it grows. Links work without that data: they are built from ids alone.

/** The published PaperTrails timeline. Its hash takes `item=scientist:<id>` or `item=publication:<id>`. */
export const PAPERTRAILS = 'https://orchid-plover-v4vj.here.now/';

/** The address of a scientist on PaperTrails, which opens the timeline centred on them with their details shown. */
export const scientistHref = (id: string) => `${PAPERTRAILS}#item=scientist:${id}`;

/** The address of one paper on PaperTrails. */
export const publicationHref = (id: string) => `${PAPERTRAILS}#item=publication:${id}`;

/** One paper as PaperTrails lists it. */
export interface PtPublication { id: string; year?: number; title: string; abstract?: string }

/** One scientist as PaperTrails lists them, reduced to what a card shows. */
export interface PtScientist {
  id: string;
  name: string;
  summary?: string;
  nationality?: string;
  /** Years only: PaperTrails gives full dates, but a card shows the span. */
  born?: number;
  died?: number;
  /** An absolute https address on the PaperTrails site. */
  photo?: string;
  publications: PtPublication[];
}

/** Everything a card needs: scientists by id, and each paper with its scientist. */
export interface PtData {
  scientists: ReadonlyMap<string, PtScientist>;
  publications: ReadonlyMap<string, { publication: PtPublication; scientist: PtScientist }>;
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const year = (v: unknown) => {
  const m = /^(-?\d{1,4})/.exec(typeof v === 'number' ? String(v) : text(v) ?? '');
  return m ? Number(m[1]) : undefined;
};
const ID = /^[\w-]+$/;

/** A portrait path from the data, made absolute; only images served by PaperTrails itself are kept. */
export function photoUrl(path: unknown) {
  const p = text(path);
  if (!p) return undefined;
  try {
    const url = new URL(p, PAPERTRAILS);
    return url.origin === new URL(PAPERTRAILS).origin ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reduce PaperTrails' parsed `scientists.yaml` to the card data. The file is someone else's data at run time, so every
 * field is checked: anything malformed is left out rather than shown.
 */
export function readScientists(raw: unknown): PtData {
  const scientists = new Map<string, PtScientist>();
  const publications = new Map<string, { publication: PtPublication; scientist: PtScientist }>();
  if (!raw || typeof raw !== 'object') return { scientists, publications };
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!ID.test(id) || !value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    const name = text(v.name);
    if (!name) continue;
    const scientist: PtScientist = {
      id, name, summary: text(v.summary), nationality: text(v.nationality), born: year(v.birth), died: year(v.death), photo: photoUrl(v.photo),
      publications: [],
    };
    for (const p of Array.isArray(v.publications) ? v.publications : []) {
      const pub = p as Record<string, unknown>, pid = text(pub?.id), title = text(pub?.title);
      if (!pid || !ID.test(pid) || !title) continue;
      const publication = { id: pid, title, year: year(pub.year), abstract: text(pub.abstract) };
      scientist.publications.push(publication);
      publications.set(pid, { publication, scientist });
    }
    scientist.publications.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    scientists.set(id, scientist);
  }
  return { scientists, publications };
}

let pending: Promise<PtData> | null = null;

/**
 * Fetch and read PaperTrails' scientists once per page load. The YAML parser is loaded only now, when a card first
 * opens. A failure is not cached, so a later card tries again.
 */
export function loadPaperTrails(): Promise<PtData> {
  pending ??= (async () => {
    const [response, yaml] = await Promise.all([fetch(`${PAPERTRAILS}data/scientists.yaml`), import('js-yaml')]);
    if (!response.ok) throw new Error(`PaperTrails answered ${response.status}`);
    // The core schema reads dates as text, not Date objects.
    return readScientists(yaml.load(await response.text(), { schema: yaml.CORE_SCHEMA }));
  })().catch(error => {
    pending = null;
    throw error;
  });
  return pending;
}

/** Forget the loaded data, so the next card fetches again. For tests. */
export function forgetPaperTrails() {
  pending = null;
}
