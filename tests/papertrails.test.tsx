// @vitest-environment jsdom
// Links to PaperTrails, the owner's timeline of scientists and papers: the hand-made maps from ZeroPoint's names and
// notes to PaperTrails ids, the reading of its live data, and the hover cards. The ids themselves are checked against
// the published data by scripts/check-papertrails.mjs, which needs the network.
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NOTES } from '../src/book/appendix/notes';
import { INDEX } from '../src/book/appendix/terms';
import { ChapterPage } from '../src/book/pages/ChapterPage';
import { IndexPage } from '../src/book/pages/IndexPage';
import { CHAPTERS } from '../src/book/toc';
import { ReferencesPage } from '../src/book/pages/ReferencesPage';
import { PAPERTRAILS, forgetPaperTrails, photoUrl, publicationHref, readScientists, scientistHref } from '../src/papertrails/data';
import { PublicationLink, ScientistLink, lifespan } from '../src/papertrails/PaperTrailsLink';
import { INDEX_PEOPLE, LAB_PEOPLE, NOTE_LINKS, PEOPLE } from '../src/papertrails/people';
import { AboutSheet } from '../src/workbench/AboutSheet';

beforeAll(() => { window.scrollTo = () => undefined; });
afterEach(() => { vi.unstubAllGlobals(); forgetPaperTrails(); });

const SAMPLE = `
maxwell:
  name: "James Clerk Maxwell"
  summary: "A Scottish physicist."
  nationality: "Scottish"
  photo: "images/maxwell.jpg"
  birth: 1831-06-13
  death: "1879-11-05"
  publications:
    - id: maxwell-work-01
      year: 1873
      title: "A Treatise on Electricity and Magnetism"
    - id: maxwell-work-00
      year: 1861
      title: "On Physical Lines of Force"
      abstract: "Molecular vortices."
`;

describe('PaperTrails: the maps', () => {
  it('links only Index entries the book has, each to a known person', () => {
    const terms = new Set(INDEX.map(e => e.term));
    for (const [term, id] of Object.entries(INDEX_PEOPLE)) {
      expect(terms.has(term), term).toBe(true);
      expect(PEOPLE[id], term).toBeTruthy();
    }
  });

  it('links only notes the book has, naming an author each, and papers by the note’s own authors', () => {
    const numbers = new Set(NOTES.map(n => n.n));
    for (const [n, links] of Object.entries(NOTE_LINKS)) {
      expect(numbers.has(Number(n)), `note ${n}`).toBe(true);
      expect(links.authors.length, `note ${n}`).toBeGreaterThan(0);
      if (links.paper) expect(links.authors.some(id => links.paper!.id.startsWith(`${id}-work-`)), `note ${n}`).toBe(true);
    }
  });

  it('builds PaperTrails addresses from ids', () => {
    expect(scientistHref('einstein')).toBe(`${PAPERTRAILS}#item=scientist:einstein`);
    expect(publicationHref('maxwell-work-00')).toBe(`${PAPERTRAILS}#item=publication:maxwell-work-00`);
  });
});

describe('PaperTrails: reading the live data', () => {
  it('keeps names, years, summaries and papers in date order', async () => {
    const yaml = await import('js-yaml');
    const data = readScientists(yaml.load(SAMPLE, { schema: yaml.CORE_SCHEMA }));
    const maxwell = data.scientists.get('maxwell')!;
    expect(maxwell).toMatchObject({ name: 'James Clerk Maxwell', born: 1831, died: 1879, nationality: 'Scottish', photo: `${PAPERTRAILS}images/maxwell.jpg` });
    expect(maxwell.publications.map(p => p.year)).toEqual([1861, 1873]);
    expect(data.publications.get('maxwell-work-00')?.scientist.name).toBe('James Clerk Maxwell');
    expect(lifespan(maxwell)).toBe('1831–1879');
    expect(lifespan({ born: 1949 })).toBe('born 1949');
  });

  it('drops what is malformed and portraits from elsewhere', () => {
    expect(photoUrl('https://example.com/x.jpg')).toBeUndefined();
    expect(photoUrl('javascript:alert(1)')).toBeUndefined();
    const data = readScientists({ 'bad id!': { name: 'X' }, noname: {}, ok: { name: 'Ok', publications: [{ id: 'ok-1' }, { id: 'a b', title: 'T' }, { id: 'ok-2', title: 'Kept' }] } });
    expect([...data.scientists.keys()]).toEqual(['ok']);
    expect([...data.publications.keys()]).toEqual(['ok-2']);
    expect(readScientists(null).scientists.size).toBe(0);
  });
});

describe('PaperTrails: links and cards', () => {
  it('links a name to PaperTrails, and its card shows the life and papers once loaded', async () => {
    const fetch = vi.fn(async () => new Response(SAMPLE));
    vi.stubGlobal('fetch', fetch);
    render(<p><ScientistLink id="maxwell">Maxwell</ScientistLink></p>);
    const link = screen.getByRole('link', { name: 'Maxwell' });
    expect(link.getAttribute('href')).toBe(scientistHref('maxwell'));
    expect(link.getAttribute('target')).toBe('_blank');
    await act(async () => { link.focus(); });
    expect(await screen.findByText('1831–1879 · Scottish')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'On Physical Lines of Force' }).getAttribute('href')).toBe(publicationHref('maxwell-work-00'));
    expect(screen.getByRole('link', { name: 'Open in PaperTrails ↗' }).getAttribute('href')).toBe(scientistHref('maxwell'));
    expect(fetch).toHaveBeenCalledWith(`${PAPERTRAILS}data/scientists.yaml`);
  });

  it('says so when PaperTrails cannot be reached, and the link still works', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    render(<PublicationLink id="maxwell-work-00" title="On Physical Lines of Force"/>);
    const link = screen.getByRole('link', { name: 'On Physical Lines of Force' });
    await userEvent.hover(link);
    await waitFor(() => expect(screen.getByText(/could not be reached/)).toBeTruthy(), { timeout: 2000 });
    expect(link.getAttribute('href')).toBe(publicationHref('maxwell-work-00'));
  });

  it('links people in the Index and authors and papers in the References', () => {
    const { unmount } = render(<IndexPage/>);
    expect(screen.getByRole('link', { name: 'Maxwell, James Clerk' }).getAttribute('href')).toBe(scientistHref('maxwell'));
    expect(screen.queryByRole('link', { name: 'Puthoff, Harold' })).toBeNull();
    unmount();
    render(<ReferencesPage/>);
    const note41 = document.getElementById('note-41')!;
    const links = [...note41.querySelectorAll('a.pt-link')].map(a => a.getAttribute('href'));
    expect(links).toEqual([scientistHref('maxwell'), publicationHref('maxwell-work-00')]);
    expect(document.getElementById('note-3')!.querySelector('.bk-ref-pt')).toBeNull();
  });

  it('links people where the chapters’ prose first names them, at most once each per chapter (endnotes aside)', async () => {
    const linked = new Map<number, string[]>();
    for (const meta of CHAPTERS) {
      const { container, unmount, findByTestId } = render(<ChapterPage n={meta.n}/>);
      await findByTestId(`chapter-${meta.n}`);
      await act(async () => { await meta.load(); });
      const hrefs = [...container.querySelectorAll('a.pt-link')].filter(a => !a.closest('.bk-ref-pt')).map(a => a.getAttribute('href')!.replace(/^.*scientist:/, ''));
      expect(new Set(hrefs).size, `chapter ${meta.n} links each person once`).toBe(hrefs.length);
      if (hrefs.length) linked.set(meta.n, hrefs);
      unmount();
    }
    expect(linked.get(7)).toEqual(['maxwell']);
    expect(linked.get(2)).toEqual(['planck', 'einstein', 'stern', 'nernst', 'heisenberg']);
    expect(linked.get(27)).toEqual(['bohr', 'casimir']);
  });

  it('lists the people behind a lab at the end of its Help › Sources', () => {
    for (const ids of Object.values(LAB_PEOPLE)) for (const id of ids) expect(PEOPLE[id], id).toBeTruthy();
    render(<AboutSheet open active section="sources" onOpenChange={() => undefined} onSection={() => undefined} experiment="Electron in the ZPF" sections={[{ id: 'sources', content: <p>Notes</p> }]} people={LAB_PEOPLE.electron}/>);
    const people = screen.getByTestId('about-people');
    expect([...people.querySelectorAll('a.pt-link')].map(a => a.textContent)).toEqual(['Michael Faraday', 'James Clerk Maxwell', 'Hendrik Lorentz', 'Paul Dirac', 'Carl D. Anderson']);
    expect(people.querySelector('img')?.getAttribute('alt')).toBe('People on PaperTrails');
    expect(people.querySelector('img')?.getAttribute('src')).toBe(`${PAPERTRAILS}images/brand-mark.png`);
  });
});
