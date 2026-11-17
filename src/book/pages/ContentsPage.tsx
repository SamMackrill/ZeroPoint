// The companion's front page: what it is, and the book's contents with the figures each chapter carries.
import { BOOK_PDF, LAB_APP } from '../labs';
import { ALL_FIGURES, CHAPTERS, chapterLabel, chapterTitle } from '../toc';

/** The contents of the book, as the entry to the companion. */
export function ContentsPage() {
  return <div className="bk-contents" data-testid="contents">
    <header className="bk-hero">
      <p className="bk-kicker">An interactive companion to</p>
      <h1>The Zero-Point Universe</h1>
      <p className="bk-hero-by">by Ray Fleming</p>
      <p className="bk-lede">Read the book with this page open beside it. Every one of its {ALL_FIGURES.length} figures has a diagram here that you can run, drag and change, built to behave as Fleming describes in the text around the figure. Where a laboratory takes the idea further, the figure links to it.</p>
      <p className="bk-hero-links"><a className="bk-cta" href={`#/ch/${(CHAPTERS.find(c => c.figures.length) ?? CHAPTERS[0]).n}`}>Start at the first figure</a><a href={BOOK_PDF} target="_blank" rel="noreferrer">Open the book (PDF)</a><a href="#/guide">How to read these pages</a><a href={LAB_APP}>The laboratory</a></p>
    </header>
    <ol className="bk-toc">
      {CHAPTERS.map(c => <li key={c.n}>
        <a className="bk-toc-row" href={`#/ch/${c.n}`}>
          <span className="bk-toc-n">{c.n === 0 ? 'Intro' : c.n}</span>
          <span className="bk-toc-main"><strong>{chapterTitle(c)}</strong><span>{c.blurb}</span></span>
          <span className="bk-toc-meta">{c.figures.length ? `${c.figures.length} figure${c.figures.length > 1 ? 's' : ''}` : 'text'}<span>pp. {c.pages[0]}–{c.pages[1]}</span></span>
        </a>
        {c.figures.length > 0 && <p className="bk-toc-figs" aria-label={`Figures of ${chapterLabel(c.n)}`}>{c.figures.map(id => <a key={id} href={`#/ch/${c.n}/${id}`}>{id}</a>)}</p>}
      </li>)}
      <li>
        <a className="bk-toc-row" href="#/references">
          <span className="bk-toc-n">App.</span>
          <span className="bk-toc-main"><strong>References by chapter</strong><span>Fleming’s 133 notes, gathered from the ends of the chapters, each with the pages that cite it.</span></span>
          <span className="bk-toc-meta">appendix</span>
        </a>
      </li>
      <li>
        <a className="bk-toc-row" href="#/index">
          <span className="bk-toc-n">App.</span>
          <span className="bk-toc-main"><strong>Index</strong><span>People, ideas, experiments and effects, with every page whose text uses them.</span></span>
          <span className="bk-toc-meta">appendix</span>
        </a>
      </li>
    </ol>
    <p className="bk-footnote">Ray Fleming died in 2024. These pages follow his text and figures as closely as they can; they are a study aid, not a statement of established physics, and where a diagram has to choose something he does not give, it says so.</p>
  </div>;
}
