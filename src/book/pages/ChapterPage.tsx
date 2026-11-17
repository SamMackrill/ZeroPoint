// A chapter of the book as a page: what it argues, then an interactive item for each figure in the order Fleming
// prints them, with the laboratories and the proposed simulations that belong to it.
import { Fragment, useEffect, useState } from 'react';
import { FigureCard, itemAnchor } from '../FigureCard';
import { FUTURE } from '../future';
import { BOOK_PDF } from '../labs';
import { LabLinks, Pg } from '../prose';
import { CHAPTERS, chapterLabel, chapterMeta, chapterTitle } from '../toc';
import type { ChapterContent } from '../types';

/** Load a chapter's content on demand; null while loading, an Error when the page cannot be fetched. */
function useChapter(n: number) {
  const [content, setContent] = useState<ChapterContent | Error | null>(null);
  useEffect(() => {
    let live = true;
    setContent(null);
    chapterMeta(n)!.load().then(m => { if (live) setContent(m.default); }, e => { if (live) setContent(e instanceof Error ? e : new Error(String(e))); });
    return () => { live = false; };
  }, [n]);
  return content;
}

/** Links to the chapters before and after. */
function PrevNext({ n }: { n: number }) {
  const index = CHAPTERS.findIndex(c => c.n === n), prev = CHAPTERS[index - 1], next = CHAPTERS[index + 1];
  return <nav className="bk-prevnext" aria-label="Previous and next chapter">
    {prev ? <a href={`#/ch/${prev.n}`} rel="prev"><span>← {chapterLabel(prev.n)}</span><strong>{chapterTitle(prev)}</strong></a> : <span/>}
    {next ? <a href={`#/ch/${next.n}`} rel="next"><span>{chapterLabel(next.n)} →</span><strong>{chapterTitle(next)}</strong></a> : <span/>}
  </nav>;
}

/** One chapter's page. `item` scrolls to a figure once the chapter has loaded. */
export function ChapterPage({ n, item }: { n: number; item?: string }) {
  const meta = chapterMeta(n)!, content = useChapter(n);
  const ready = content !== null && !(content instanceof Error);
  useEffect(() => {
    if (!ready) return;
    const target = item ? document.getElementById(itemAnchor(item)) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo?.(0, 0);
  }, [ready, item, n]);
  const proposals = FUTURE.filter(f => f.chapters.includes(n));
  let section: string | undefined;
  return <article className="bk-chapter" data-testid={`chapter-${n}`}>
    <header className="bk-chapter-head">
      <p className="bk-kicker">{chapterLabel(n)}</p>
      <h1>{chapterTitle(meta)}</h1>
      <p className="bk-chapter-meta"><Pg n={meta.pages[0]} to={meta.pages[1]}/><span aria-hidden="true"> · </span>{meta.figures.length ? `${meta.figures.length} figure${meta.figures.length > 1 ? 's' : ''}` : 'no figures'}<span aria-hidden="true"> · </span><a href={`${BOOK_PDF}#page=${meta.pages[0]}`} target="_blank" rel="noreferrer">Open the chapter in the book</a></p>
    </header>
    {content === null && <p className="bk-loading" role="status">Loading the chapter…</p>}
    {content instanceof Error && <p className="bk-loading" role="alert">This chapter could not be loaded. Check your connection and reload the page.</p>}
    {ready && <>
      <section className="bk-summary bk-prose" aria-label="What the chapter argues">{content.summary}</section>
      {content.items.length > 1 && <nav className="bk-jump" aria-label="Items in this chapter">
        {content.items.map(it => <a key={it.id} href={`#/ch/${n}/${it.id}`}>{it.kind === 'figure' ? it.id : it.title}</a>)}
      </nav>}
      {content.items.map(it => {
        const heading = it.section && it.section !== section ? it.section : undefined;
        section = it.section ?? section;
        return <Fragment key={it.id}>{heading && <h2 className="bk-section">{heading}</h2>}<FigureCard item={it} chapter={n}/></Fragment>;
      })}
      {content.labs && <section className="bk-chapter-labs"><LabLinks links={content.labs} heading="Laboratories for this chapter"/></section>}
      {proposals.length > 0 && <section className="bk-chapter-future">
        <h2 className="bk-section">Simulations this chapter could have</h2>
        <ul>{proposals.map(p => <li key={p.id}><a href={`#/future/${p.id}`}>{p.title}</a><span>{p.idea}</span></li>)}</ul>
      </section>}
    </>}
    <PrevNext n={n}/>
  </article>;
}
