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

/** A square root as in print: the radical sign drawn to the height of what it covers, its bar over all of it. */
export function Sqrt({ children }: { children: ReactNode }) {
  return <span className="bk-sqrt"><span className="bk-sqrt-sign" aria-hidden="true"><svg viewBox="0 0 10 20" preserveAspectRatio="none"><path d="M0 12.5 L2.6 11 L5.6 19.4 L9.6 0.6 L10 0.6" vectorEffect="non-scaling-stroke"/></svg></span><span className="bk-sqrt-body"><span className="bk-visually-hidden">square root of </span>{children}</span></span>;
}

/**
 * A fraction set as in print, its numerator over its denominator. Unseen words tell a screen reader where it starts, where
 * the division falls and where it ends, so that fractions inside fractions or roots still read correctly.
 */
export function Frac({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  const say = (words: string) => <span className="bk-visually-hidden">{words}</span>;
  return <span className="bk-frac"><span>{say('fraction: ')}{top}{say(' over ')}</span><span>{bottom}{say(', end of fraction')}</span></span>;
}

/** The links from an item or a chapter into the laboratories. */
export function LabLinks({ links, heading = 'Explore further in the laboratory' }: { links: readonly LabLink[]; heading?: string }) {
  if (!links.length) return null;
  return <div className="bk-labs">
    <h4>{heading}</h4>
    <ul>{links.map(link => <li key={`${link.lab}/${link.scenario}/${link.query ?? ''}`}><a className="bk-lab-link" href={labHref(link)}>{labName(link)}</a><span>{link.why}</span></li>)}</ul>
  </div>;
}
