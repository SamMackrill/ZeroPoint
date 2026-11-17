// The book's structure: every chapter of The Zero-Point Universe with its PDF pages and figures, in order. Chapter
// pages load on demand. tests/book.test.tsx checks that each chapter's page carries exactly the figures listed here.
import type { ChapterMeta } from './types';

/** Figure numbers `chapter-1` … `chapter-count`. */
const figs = (chapter: number, count: number) => Array.from({ length: count }, (_, i) => `${chapter}-${i + 1}`);

/** The chapters in book order. Chapter 0 is the Introduction. */
export const CHAPTERS: ChapterMeta[] = [
  { n: 0, title: 'Introduction: The Genesis of a Physics Heretic', pages: [7, 10], figures: [], blurb: 'How Fleming came to the zero-point field, and what he asks of a theory.', load: () => import('./chapters/ch00') },
  { n: 1, title: 'The Philosophy of Science', pages: [11, 17], figures: [], blurb: 'The tests a physical theory must pass: a mechanical cause for every force.', load: () => import('./chapters/ch01') },
  { n: 2, title: 'The Zero-Point', pages: [18, 26], figures: [], blurb: 'Planck, Nernst and Heisenberg: the vacuum is full of energy, with a limit on each fluctuation.', load: () => import('./chapters/ch02') },
];

/** The chapter with a number, if the book has one. */
export const chapterMeta = (n: number) => CHAPTERS.find(c => c.n === n);

/** How a chapter is named in headings and links: "Introduction" or "Chapter 6". */
export const chapterLabel = (n: number) => (n === 0 ? 'Introduction' : `Chapter ${n}`);

/** A chapter's title without the "Introduction:" prefix. */
export const chapterTitle = (meta: ChapterMeta) => meta.title.replace(/^Introduction: /, '');

/** Every figure number in the book, in order. */
export const ALL_FIGURES = CHAPTERS.flatMap(c => c.figures);
