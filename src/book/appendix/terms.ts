// The companion's index of the book, built by scripts/book-index.py: chosen entries, with every PDF page whose text
// uses each one. The book has no index of its own.
import data from './index.json';
import { CHAPTERS } from '../toc';

/** One index entry: its heading and the pages that discuss it, in order. */
export interface IndexEntry { term: string; pages: number[] }

/** Every entry, alphabetically. */
export const INDEX: readonly IndexEntry[] = data;

/** The letter an entry files under: its first letter, with Æ under A. */
export const letterOf = (term: string) => term.normalize('NFD').replace(/^Æ/, 'A').charAt(0).toUpperCase();

/** Pages as runs of consecutive pages: [48, 49, 50, 53] becomes [[48, 50], [53, 53]]. */
export function pageRuns(pages: readonly number[]): [number, number][] {
  const runs: [number, number][] = [];
  for (const page of pages) {
    const last = runs.at(-1);
    if (last && page === last[1] + 1) last[1] = page; else runs.push([page, page]);
  }
  return runs;
}

/** The chapters a set of pages falls in, in order. */
export const chaptersOf = (pages: readonly number[]) => CHAPTERS.filter(c => pages.some(p => p >= c.pages[0] && p <= c.pages[1])).map(c => c.n);
