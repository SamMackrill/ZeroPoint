// The companion's content model: the book's chapters, and one interactive item per figure (docs/book-companion.md).
import type { ComponentType, ReactNode } from 'react';

/** The laboratories a companion page can link into, by the experiment id their routes use. */
export type LabId = 'medium' | 'light' | 'double-slit' | 'electron' | 'casimir' | 'vdw';

/** A deep link into a laboratory scenario, with the reason a reader would follow it from here. */
export interface LabLink {
  lab: LabId;
  scenario: string;
  /** Extra route query in the lab's own URL form (`spinDisplay.count=4&L=+radius`); validated by tests/book.test.tsx. */
  query?: string;
  /** What the lab adds to the figure: one sentence. */
  why: string;
}

/** One interactive item on a chapter page: a figure of the book, or an explorer for a chapter that has none. */
export interface BookItem {
  /** `figure` follows a numbered figure of the book; `explorer` illustrates text or an equation that has no figure. */
  kind: 'figure' | 'explorer';
  /** The figure number as Fleming prints it (`6-10`), or `x2-1` for the first explorer of chapter 2. */
  id: string;
  /** PDF page of the figure, or of the passage an explorer follows. */
  page: number;
  /** A short name for what the reader can do. */
  title: string;
  /** Fleming's caption, in his words (figures only). */
  caption?: string;
  /** The book section the item sits under, as Fleming titles it. */
  section?: string;
  /** What the text says about the figure: a close paraphrase, with page references and short quotations. */
  text: ReactNode;
  /** The interactive diagram. */
  Diagram: ComponentType;
  /** Things to try, each tied to a statement in the text. */
  tryThis: string[];
  /** What in the diagram is not Fleming's: display choices, magnifications and readings of a figure, named as such. */
  notes?: ReactNode;
  labs?: LabLink[];
}

/** A chapter page. */
export interface ChapterContent {
  n: number;
  /** What the chapter argues, in a few sentences. */
  summary: ReactNode;
  items: BookItem[];
  /** Laboratories that belong to the chapter as a whole. */
  labs?: LabLink[];
}

/** A chapter's entry in the contents: enough to list it without loading its page. */
export interface ChapterMeta {
  n: number;
  title: string;
  /** First and last PDF page. */
  pages: [number, number];
  /** The figure numbers the chapter contains, in order. */
  figures: string[];
  /** One line for the contents page. */
  blurb: string;
  load(): Promise<{ default: ChapterContent }>;
}

/** A proposed simulation for future work. */
export interface FutureSim {
  id: string;
  title: string;
  /** Chapters the proposal draws on. */
  chapters: number[];
  /** Figures and pages it would bring to life. */
  sources: string;
  /** What the reader would see and control. */
  idea: string;
  /** What it could start from in the present laboratories. */
  basis: string;
  /** What Fleming leaves open, which the simulation would have to choose or expose as a control. */
  open: string;
}
