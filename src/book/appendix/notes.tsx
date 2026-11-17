// Fleming's endnotes, gathered from the ends of the chapters by scripts/book-references.py. The numbering runs through
// the book (1 to 133); each note keeps the PDF page it is printed on and the pages whose text cites it.
import { Fragment, type ReactNode } from 'react';
import data from './references.json';
import { Pg } from '../prose';

/** One endnote: its number, chapter, where it is printed, its text as printed, and where the text cites it. */
export interface Note { n: number; chapter: number; notePage: number; text: string; cited: { page: number; before: string }[] }

/** Every note, in the book's order. */
export const NOTES: readonly Note[] = data;

/** The notes printed at the end of one chapter. */
export const notesFor = (chapter: number) => NOTES.filter(note => note.chapter === chapter);

/** The distinct pages that cite a note, in order. */
export const citedPages = (note: Note) => [...new Set(note.cited.map(c => c.page))].sort((a, b) => a - b);

// DOIs, web addresses and arXiv paths as printed; trailing punctuation belongs to the sentence, not the address.
const LINK = /(doi:\s*10\.[^\s,;]+|DOI:\s*10\.[^\s,;]+|https?:\/\/\S+|arxiv\.org\/\S+)/g;

/** The address a printed DOI, URL or arXiv path opens. */
export function linkTarget(printed: string) {
  const bare = printed.replace(/[.,;)]+$/, '');
  if (/^doi:/i.test(bare)) return `https://doi.org/${bare.replace(/^doi:\s*/i, '')}`;
  if (/^arxiv\.org\//.test(bare)) return `https://${bare.replace('/pdf/', '/abs/')}`;
  return bare;
}

/** A note's text with its DOIs, addresses and arXiv paths made into links. */
export function NoteText({ text }: { text: string }) {
  const parts = text.split(LINK);
  return <>{parts.map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const bare = part.replace(/[.,;)]+$/, ''), rest = part.slice(bare.length);
    return <Fragment key={i}><a href={linkTarget(bare)} target="_blank" rel="noreferrer">{bare}</a>{rest}</Fragment>;
  })}</>;
}

/** One chapter's notes as a numbered list, each with the pages that cite it. */
export function NoteList({ notes, empty }: { notes: readonly Note[]; empty?: ReactNode }) {
  if (!notes.length) return <>{empty ?? null}</>;
  return <ol className="bk-ref-list">
    {notes.map(note => <li key={note.n} id={`note-${note.n}`}>
      <span className="bk-ref-n" aria-hidden="true">{note.n}</span>
      <div>
        <p className="bk-ref-text"><span className="bk-visually-hidden">Note {note.n}: </span><NoteText text={note.text}/></p>
        <p className="bk-ref-cited">Cited on {citedPages(note).map((page, i) => <Fragment key={page}>{i > 0 && ', '}<Pg n={page}/></Fragment>)}</p>
      </div>
    </li>)}
  </ol>;
}
