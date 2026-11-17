// The companion's shell: the book's contents down the side, one page per chapter, and pages for the reading guide
// and for proposed simulations. Routes are hashes, as in the laboratory, so any static host can serve them:
//   #/            contents          #/ch/6        chapter 6          #/ch/6/6-10   chapter 6 at Figure 6-10
//   #/guide       how to read       #/future      future simulations
import { useEffect, useState } from 'react';
import { ChapterPage } from './pages/ChapterPage';
import { ContentsPage } from './pages/ContentsPage';
import { FuturePage } from './pages/FuturePage';
import { GuidePage } from './pages/GuidePage';
import { BOOK_PDF, LAB_APP } from './labs';
import { CHAPTERS, chapterLabel, chapterMeta, chapterTitle } from './toc';

/** A decoded companion route. */
export type BookRoute = { page: 'contents' } | { page: 'guide' } | { page: 'future'; id?: string } | { page: 'chapter'; n: number; item?: string };

/** Decode a hash into a route; anything unrecognised is the contents page. */
export function parseRoute(hash: string): BookRoute {
  const chapter = /^#\/ch\/(\d+)(?:\/([\w-]+))?$/.exec(hash);
  if (chapter && chapterMeta(Number(chapter[1]))) return { page: 'chapter', n: Number(chapter[1]), item: chapter[2] };
  if (hash === '#/guide') return { page: 'guide' };
  const future = /^#\/future(?:\/([\w-]+))?$/.exec(hash);
  if (future) return { page: 'future', id: future[1] };
  return { page: 'contents' };
}

/** The current route, following the address bar. */
function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

/** The book's contents as navigation: every chapter, with its figure count. */
function ChapterNav({ current, onNavigate }: { current?: number; onNavigate?(): void }) {
  return <nav className="bk-nav" aria-label="Chapters">
    <ol>
      {CHAPTERS.map(c => <li key={c.n}>
        <a href={`#/ch/${c.n}`} aria-current={current === c.n ? 'page' : undefined} onClick={onNavigate}>
          <span className="bk-nav-n">{c.n === 0 ? '·' : c.n}</span>
          <span className="bk-nav-title">{chapterTitle(c)}</span>
          {c.figures.length > 0 && <span className="bk-nav-count" title={`${c.figures.length} figures`}>{c.figures.length}</span>}
        </a>
      </li>)}
    </ol>
  </nav>;
}

/** The interactive companion to The Zero-Point Universe. */
export function BookApp() {
  const route = useRoute();
  const [menu, setMenu] = useState(false);
  const chapter = route.page === 'chapter' ? route.n : undefined;
  // The document title follows the page, so browser history and tabs read like the book.
  useEffect(() => {
    const meta = chapter !== undefined ? chapterMeta(chapter) : undefined;
    const name = meta ? `${chapterLabel(meta.n)}: ${chapterTitle(meta)}` : route.page === 'guide' ? 'How to read' : route.page === 'future' ? 'Future simulations' : 'Contents';
    document.title = `${name} — The Zero-Point Universe, interactive companion`;
  }, [route.page, chapter]);
  return <div className="bk-shell">
    <header className="bk-top">
      <a className="bk-brand" href="#/"><span className="bk-brand-book">The Zero-Point Universe</span><span className="bk-brand-sub">interactive companion</span></a>
      <nav className="bk-top-links" aria-label="Companion">
        <a href="#/" aria-current={route.page === 'contents' ? 'page' : undefined}>Contents</a>
        <a href="#/guide" aria-current={route.page === 'guide' ? 'page' : undefined}>How to read</a>
        <a href="#/future" aria-current={route.page === 'future' ? 'page' : undefined}>Future simulations</a>
        <a href={BOOK_PDF} target="_blank" rel="noreferrer">The book (PDF)</a>
        <a className="bk-top-lab" href={LAB_APP}>Laboratory</a>
      </nav>
      <button type="button" className="bk-menu-button" aria-expanded={menu} aria-controls="bk-side" onClick={() => setMenu(m => !m)}>Chapters</button>
    </header>
    <div className="bk-layout">
      <aside id="bk-side" className={`bk-side${menu ? ' bk-side-open' : ''}`}><ChapterNav current={chapter} onNavigate={() => setMenu(false)}/></aside>
      <main className="bk-main" id="bk-main">
        {route.page === 'chapter' ? <ChapterPage key={route.n} n={route.n} item={route.item}/>
          : route.page === 'guide' ? <GuidePage/>
          : route.page === 'future' ? <FuturePage id={route.id}/>
          : <ContentsPage/>}
      </main>
    </div>
  </div>;
}
