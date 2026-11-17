// @vitest-environment jsdom
// The book companion's appendices: Fleming's endnotes gathered by chapter (scripts/book-references.py), and an index
// of the book built by searching its text (scripts/book-index.py).
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseRoute } from '../src/book/BookApp';
import { NOTES, citedPages, linkTarget, notesFor } from '../src/book/appendix/notes';
import { INDEX, chaptersOf, letterOf, pageRuns } from '../src/book/appendix/terms';
import { IndexPage } from '../src/book/pages/IndexPage';
import { ReferencesPage } from '../src/book/pages/ReferencesPage';
import { CHAPTERS } from '../src/book/toc';

beforeAll(() => { window.scrollTo = () => undefined; });

describe('book companion: references', () => {
  it('has all 133 notes, numbered through the book, each printed at the end of its own chapter', () => {
    expect(NOTES.map(n => n.n)).toEqual(Array.from({ length: 133 }, (_, i) => i + 1));
    for (const note of NOTES) {
      const meta = CHAPTERS.find(c => c.n === note.chapter)!;
      expect(note.notePage, `note ${note.n}`).toBeGreaterThanOrEqual(meta.pages[0]);
      expect(note.notePage, `note ${note.n}`).toBeLessThanOrEqual(meta.pages[1]);
      expect(note.text.length, `note ${note.n} has its text`).toBeGreaterThan(20);
    }
    // The chapters' notes run in order: no chapter's notes start before the previous chapter's end.
    for (let i = 1; i < NOTES.length; i++) expect(NOTES[i].chapter, `note ${NOTES[i].n}`).toBeGreaterThanOrEqual(NOTES[i - 1].chapter);
  });

  it('finds where the text cites every note, within the note’s chapter and before the note is printed', () => {
    for (const note of NOTES) {
      const pages = citedPages(note), meta = CHAPTERS.find(c => c.n === note.chapter)!;
      expect(pages.length, `note ${note.n} is cited`).toBeGreaterThan(0);
      for (const page of pages) {
        expect(page, `note ${note.n}`).toBeGreaterThanOrEqual(meta.pages[0]);
        expect(page, `note ${note.n}`).toBeLessThanOrEqual(note.notePage);
      }
    }
  });

  it('keeps the notes as printed: spot checks against the book', () => {
    expect(NOTES[29].text).toBe('P. Debye, “Die van der Waalsschen Kohäsionskräfte” Physikalische Zeitschrift, Vol. 21, pages 178-187, 1920.');
    expect(citedPages(NOTES[29])).toEqual([27]);
    expect(notesFor(3).map(n => n.n)).toEqual([26, 27, 28, 29, 30, 31]);
    // Superscripts after a digit are exponents (10¹⁴ on p. 18, 10⁹⁵ on p. 148), not callouts of notes 14 and 95.
    expect(citedPages(NOTES[13])).toEqual([19]);
    expect(citedPages(NOTES[94])).toEqual([144]);
    expect(NOTES[132].text).toMatch(/^H\.B\.G\. Casimir, Some remarks on the history of the so called Casimir effect/);
  });

  it('opens DOIs at doi.org and arXiv papers at their abstract', () => {
    expect(linkTarget('doi:10.1103/PhysRevLett.78.5.')).toBe('https://doi.org/10.1103/PhysRevLett.78.5');
    expect(linkTarget('DOI: 10.1016/S0031-8914(53)80095-9')).toBe('https://doi.org/10.1016/S0031-8914(53)80095-9');
    expect(linkTarget('arxiv.org/pdf/gr-qc/0610015')).toBe('https://arxiv.org/abs/gr-qc/0610015');
  });

  it('routes to the appendix and to one chapter’s notes', () => {
    expect(parseRoute('#/references')).toEqual({ page: 'references', chapter: undefined });
    expect(parseRoute('#/references/17')).toEqual({ page: 'references', chapter: 17 });
    expect(parseRoute('#/references/99')).toEqual({ page: 'references', chapter: undefined });
  });

  it('lists every note by chapter, and finds notes by author', () => {
    const { container } = render(<ReferencesPage/>);
    expect(container.querySelectorAll('.bk-ref-list > li')).toHaveLength(133);
    expect(container.querySelectorAll('.bk-appendix-section')).toHaveLength(new Set(NOTES.map(n => n.chapter)).size);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Shapiro' } });
    expect([...container.querySelectorAll('.bk-ref-list > li')].map(li => li.id)).toEqual(['note-121', 'note-122', 'note-123', 'note-124']);
    expect(screen.getByRole('status').textContent).toBe('4 of 133 notes');
  });
});

describe('book companion: index', () => {
  it('lists its entries alphabetically, each with pages of the text in order', () => {
    const key = (t: string) => t.toLowerCase().replace('æ', 'ae').replace(/[^a-z0-9 ]/g, '');
    expect(INDEX.map(e => key(e.term))).toEqual([...INDEX.map(e => key(e.term))].sort());
    for (const entry of INDEX) {
      expect(entry.pages.length, entry.term).toBeGreaterThan(0);
      expect(entry.pages, entry.term).toEqual([...new Set(entry.pages)].sort((a, b) => a - b));
      expect(entry.pages[0], entry.term).toBeGreaterThanOrEqual(7); // the contents (pp. 1–6) are not indexed
      expect(entry.pages.at(-1), entry.term).toBeLessThanOrEqual(209);
    }
  });

  it('finds the pages the text discusses each entry on, and not the endnotes', () => {
    const pages = (term: string) => INDEX.find(e => e.term === term)?.pages;
    expect(pages('Debye, Peter')).toEqual([27, 28]); // Figure 3-1 and its discussion
    expect(pages('Triacontahedron')).toEqual([126, 127, 194, 195]);
    expect(pages('Michelson-Morley experiment')).toEqual([21, 153, 154, 155, 156, 157, 158, 159, 160, 161]); // chapter 2's history, then chapter 21; p. 157 splits it across a line
    expect(pages('Riess, Adam')).toBeUndefined(); // named only in note 67
  });

  it('groups pages into runs and places them in chapters', () => {
    expect(pageRuns([48, 49, 50, 53, 55, 56])).toEqual([[48, 50], [53, 53], [55, 56]]);
    expect(chaptersOf([27, 28, 126, 195])).toEqual([3, 16, 25]);
    expect(letterOf('Æther')).toBe('A');
  });

  it('choosing a letter clears the search, even the letter already in the address', () => {
    const { container } = render(<IndexPage letter="m"/>);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'casimir' } });
    expect(container.querySelector('#index-M')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'M' }));
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
    expect(container.querySelector('#index-M')).not.toBeNull();
  });

  it('routes to the index and to a letter', () => {
    expect(parseRoute('#/index')).toEqual({ page: 'index', letter: undefined });
    expect(parseRoute('#/index/m')).toEqual({ page: 'index', letter: 'm' });
  });

  it('renders every entry under its letter, and finds entries by name', () => {
    const { container } = render(<IndexPage/>);
    expect(container.querySelectorAll('.bk-index-entry')).toHaveLength(INDEX.length);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'casimir' } });
    expect([...container.querySelectorAll('.bk-index-entry dt')].map(dt => dt.textContent)).toEqual(['Casimir effect', 'Casimir force', 'Casimir, Hendrik']);
  });
});
