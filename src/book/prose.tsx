// Small pieces of prose used across chapter pages: page references into the book and papers, and quotations.
import type { ReactNode } from 'react';
import { BOOK_PDF, PAPERS, labHref, labName, paperHref, type PaperId } from './labs';
import type { LabLink } from './types';

/** A page reference that opens the book's PDF at that page. Pages are PDF pages: the book prints no page numbers. */
export function Pg({ n, to }: { n: number; to?: number }) {
  return <a className="bk-pg" href={`${BOOK_PDF}#page=${n}`} target="_blank" rel="noreferrer" title={`Open the book at PDF page ${n}`}>{to ? `pp. ${n}–${to}` : `p. ${n}`}</a>;
}

/** A short quotation from Fleming, in his words. */
export function Q({ children }: { children: ReactNode }) {
  return <q className="bk-q">{children}</q>;
}

/** A reference to one of Fleming's papers, optionally at a page. */
export function Paper({ id, page, children }: { id: PaperId; page?: number; children?: ReactNode }) {
  return <a className="bk-paper" href={paperHref(id, page)} target="_blank" rel="noreferrer" title={PAPERS[id].title}>{children ?? <cite>{PAPERS[id].title}</cite>}{page ? `, p. ${page}` : ''}</a>;
}

/** An inline variable or symbol. */
export function V({ children }: { children: ReactNode }) {
  return <var className="bk-var">{children}</var>;
}

/** A displayed equation, with the number Fleming gives it. */
export function Eq({ n, children }: { n?: string; children: ReactNode }) {
  return <div className="bk-eq" role="math"><span className="bk-eq-body">{children}</span>{n && <span className="bk-eq-n">Eq. {n}</span>}</div>;
}

/** A fraction for displayed equations. */
export function Frac({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return <span className="bk-frac"><span>{top}</span><span>{bottom}</span></span>;
}

/** The links from an item or a chapter into the laboratories. */
export function LabLinks({ links, heading = 'Explore further in the laboratory' }: { links: readonly LabLink[]; heading?: string }) {
  if (!links.length) return null;
  return <div className="bk-labs">
    <h4>{heading}</h4>
    <ul>{links.map(link => <li key={`${link.lab}/${link.scenario}/${link.query ?? ''}`}><a className="bk-lab-link" href={labHref(link)}>{labName(link)}</a><span>{link.why}</span></li>)}</ul>
  </div>;
}
