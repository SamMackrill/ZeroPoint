// @vitest-environment jsdom
// The book companion (book/index.html): every figure of the book has its item, in order, with its printed image; every
// link into the laboratories opens a scenario that exists with settings the laboratory accepts; every link between the
// companion's pages lands on an item. The numbers the diagrams compute are checked in book-numbers.test.ts.
import { act, render } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseRoute } from '../src/book/BookApp';
import { figureImage } from '../src/book/FigureCard';
import { FUTURE } from '../src/book/future';
import { BOOK_PDF, LABS, PAPERS, labHash } from '../src/book/labs';
import { ChapterPage } from '../src/book/pages/ChapterPage';
import { ContentsPage } from '../src/book/pages/ContentsPage';
import { FuturePage } from '../src/book/pages/FuturePage';
import { GuidePage } from '../src/book/pages/GuidePage';
import { IndexPage } from '../src/book/pages/IndexPage';
import { ReferencesPage } from '../src/book/pages/ReferencesPage';
import { ALL_FIGURES, CHAPTERS } from '../src/book/toc';
import type { ChapterContent, LabLink } from '../src/book/types';
import { EXPERIMENTS } from '../src/experiments';
import { decodeUrl, resolveUrl } from '../src/workbench/urlState';

const root = join(__dirname, '..');
/** The companion page sits in book/, so its relative links resolve from there. */
const fromBook = (href: string) => join(root, 'book', decodeURIComponent(href.split('#')[0]));

const loaded = new Map<number, ChapterContent>();
beforeAll(async () => {
  window.scrollTo = () => undefined; // jsdom has no layout; a chapter page scrolls to its top when it opens
  for (const meta of CHAPTERS) loaded.set(meta.n, (await meta.load()).default);
});

describe('book companion: structure', () => {
  it('lists the chapters in order, with the book’s 86 figures', () => {
    expect(CHAPTERS.map(c => c.n)).toEqual(Array.from({ length: 28 }, (_, i) => i));
    expect(ALL_FIGURES).toHaveLength(86);
    for (let i = 1; i < CHAPTERS.length; i++) expect(CHAPTERS[i].pages[0]).toBeGreaterThan(CHAPTERS[i - 1].pages[1]);
  });

  it('gives every chapter exactly its figures, in the book’s order, with explorers only beside them', () => {
    for (const meta of CHAPTERS) {
      const content = loaded.get(meta.n)!;
      expect(content.n, `chapter ${meta.n}`).toBe(meta.n);
      expect(content.items.filter(i => i.kind === 'figure').map(i => i.id), `chapter ${meta.n}`).toEqual(meta.figures);
      for (const item of content.items) {
        if (item.kind === 'explorer') expect(item.id, `chapter ${meta.n}`).toMatch(new RegExp(`^x${meta.n}-\\d+$`));
        expect(item.page, `${item.id} page`).toBeGreaterThanOrEqual(meta.pages[0]);
        expect(item.page, `${item.id} page`).toBeLessThanOrEqual(meta.pages[1]);
        expect(item.tryThis.length, `${item.id} has things to try`).toBeGreaterThan(0);
      }
      expect(new Set(content.items.map(i => i.id)).size, `chapter ${meta.n} ids`).toBe(content.items.length);
      if (!meta.figures.length) expect(content.items.length, `chapter ${meta.n} has an explorer`).toBeGreaterThan(0);
    }
  });

  it('has the printed image of every figure', () => {
    for (const id of ALL_FIGURES) expect(existsSync(fromBook(figureImage(id))), figureImage(id)).toBe(true);
  });

  it('links to the book and papers that are in the repository', () => {
    expect(existsSync(fromBook(BOOK_PDF))).toBe(true);
    for (const paper of Object.values(PAPERS)) expect(existsSync(join(root, 'docs', 'papers', decodeURIComponent(paper.file))), paper.title).toBe(true);
  });

  it('routes chapter, item, guide and future hashes, and sends anything else to the contents', () => {
    expect(parseRoute('#/ch/1/x1-2')).toEqual({ page: 'chapter', n: 1, item: 'x1-2' });
    expect(parseRoute('#/ch/0')).toEqual({ page: 'chapter', n: 0, item: undefined });
    expect(parseRoute('#/ch/99')).toEqual({ page: 'contents' });
    expect(parseRoute('#/guide')).toEqual({ page: 'guide' });
    expect(parseRoute('#/future/orbits')).toEqual({ page: 'future', id: 'orbits' });
    expect(parseRoute('#/electron/spin')).toEqual({ page: 'contents' });
  });

  it('files each future simulation under chapters of the book, once', () => {
    expect(new Set(FUTURE.map(f => f.id)).size).toBe(FUTURE.length);
    for (const f of FUTURE) for (const n of f.chapters) expect(Number.isInteger(n) && n >= 0 && n <= 27, `${f.id} chapter ${n}`).toBe(true);
  });
});

describe('book companion: links into the laboratories', () => {
  it('names each laboratory and scenario as the workbench does', () => {
    expect(Object.keys(LABS).sort()).toEqual(EXPERIMENTS.map(d => d.id).sort());
    for (const definition of EXPERIMENTS) {
      expect(LABS[definition.id as keyof typeof LABS].title).toBe(definition.title);
      expect(LABS[definition.id as keyof typeof LABS].scenarios).toEqual(Object.fromEntries(definition.scenarios.map(s => [s.id, s.title])));
    }
  });

  it('opens every linked scenario with settings the laboratory accepts', () => {
    const links: [string, LabLink][] = [];
    for (const content of loaded.values()) {
      for (const link of content.labs ?? []) links.push([`chapter ${content.n}`, link]);
      for (const item of content.items) for (const link of item.labs ?? []) links.push([item.id, link]);
    }
    expect(links.length).toBeGreaterThan(40);
    for (const [where, link] of links) {
      const definition = EXPERIMENTS.find(d => d.id === link.lab)!;
      const resolved = resolveUrl(definition, decodeUrl(labHash(link))!);
      expect({ where, scenario: resolved.scenario, dropped: resolved.dropped }).toEqual({ where, scenario: link.scenario, dropped: [] });
      expect(link.why.length, `${where} says why`).toBeGreaterThan(10);
    }
  });
});

describe('book companion: pages', () => {
  /** Every in-page route a rendered page links to. */
  const routes = (container: HTMLElement) => [...container.querySelectorAll('a[href^="#/"]')].map(a => a.getAttribute('href')!);
  const valid = (hash: string) => {
    const route = parseRoute(hash);
    if (route.page === 'chapter') return !route.item || loaded.get(route.n)!.items.some(i => i.id === route.item);
    if (route.page === 'future') return !route.id || FUTURE.some(f => f.id === route.id);
    if (route.page === 'references') return hash === '#/references' || route.chapter !== undefined;
    if (route.page === 'index') return true;
    return route.page !== 'contents' || hash === '#/';
  };

  it('renders every chapter, and every link between pages lands on a page or an item', async () => {
    const seen = new Set<string>();
    for (const meta of CHAPTERS) {
      const { container, unmount, findByTestId } = render(<ChapterPage n={meta.n}/>);
      await findByTestId(`chapter-${meta.n}`);
      await act(async () => { await meta.load(); });
      expect(container.querySelectorAll('.bk-card').length, `chapter ${meta.n}`).toBe(loaded.get(meta.n)!.items.length);
      for (const hash of routes(container)) seen.add(hash);
      unmount();
    }
    for (const Page of [ContentsPage, GuidePage, () => <FuturePage/>, () => <ReferencesPage/>, () => <IndexPage/>]) {
      const { container, unmount } = render(<Page/>);
      for (const hash of routes(container)) seen.add(hash);
      unmount();
    }
    expect(seen.size).toBeGreaterThan(100);
    expect([...seen].filter(h => !valid(h))).toEqual([]);
  });
});
