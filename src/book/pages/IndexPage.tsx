// Appendix: an index of the book. People, ideas, experiments and effects, each with the PDF pages whose text uses it
// and the chapters of this companion that cover them.
import { Fragment, useEffect, useMemo, useState } from 'react';
import { INDEX, chaptersOf, letterOf, pageRuns } from '../appendix/terms';
import { BOOK_PDF } from '../labs';
import { chapterLabel } from '../toc';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** The Index appendix. `letter` scrolls to the entries under that letter. */
export function IndexPage({ letter }: { letter?: string }) {
  const [query, setQuery] = useState('');
  // A letter chosen from the bar: the search is cleared so its section is shown, then the page scrolls to it once it
  // has rendered. This also covers choosing the letter already in the address, which fires no hashchange.
  const [jump, setJump] = useState<string | null>(null);
  useEffect(() => {
    const target = letter ? document.getElementById(`index-${letter.toUpperCase()}`) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo?.(0, 0);
  }, [letter]);
  const needle = query.trim().toLowerCase();
  const shown = useMemo(() => INDEX.filter(e => !needle || e.term.toLowerCase().includes(needle)), [needle]);
  const groups = useMemo(() => LETTERS.map(l => ({ letter: l, entries: shown.filter(e => letterOf(e.term) === l) })).filter(g => g.entries.length), [shown]);
  useEffect(() => {
    if (!jump) return;
    const target = document.getElementById(`index-${jump}`);
    if (target) { target.scrollIntoView({ block: 'start' }); setJump(null); }
  }, [jump, groups]);
  const present = new Set(INDEX.map(e => letterOf(e.term)));
  return <article className="bk-appendix" data-testid="index">
    <header className="bk-chapter-head">
      <p className="bk-kicker">Appendix</p>
      <h1>Index</h1>
      <p className="bk-lede">The book has no index, so this one is made for the companion. The {INDEX.length} entries were chosen; their pages were not. Each page listed is one whose text uses the term, found by searching the book. The endnotes are left out, as the References appendix lists them. Page numbers open the book; the chapter links open these pages.</p>
    </header>
    <nav className="bk-letters" aria-label="Index letters">
      {LETTERS.map(l => present.has(l) ? <a key={l} href={`#/index/${l.toLowerCase()}`} onClick={() => { setQuery(''); setJump(l); }}>{l}</a> : <span key={l} aria-hidden="true">{l}</span>)}
    </nav>
    <div className="bk-appendix-tools">
      <label className="bk-search"><span>Find</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="A name or an idea" aria-describedby="index-count"/></label>
      <p id="index-count" className="bk-appendix-count" role="status">{needle ? `${shown.length} of ${INDEX.length} entries` : `${INDEX.length} entries`}</p>
    </div>
    {groups.map(g => <section key={g.letter} id={`index-${g.letter}`} className="bk-appendix-section" aria-labelledby={`index-${g.letter}-title`}>
      <h2 id={`index-${g.letter}-title`} className="bk-index-letter">{g.letter}</h2>
      <dl className="bk-index">
        {g.entries.map(entry => <div key={entry.term} className="bk-index-entry">
          <dt>{entry.term}</dt>
          <dd>
            <span className="bk-index-pages">{pageRuns(entry.pages).map(([a, b], i) => <Fragment key={a}>{i > 0 && ', '}<a className="bk-pg" href={`${BOOK_PDF}#page=${a}`} target="_blank" rel="noreferrer" title={`Open the book at PDF page ${a}`}>{a === b ? a : `${a}–${b}`}</a></Fragment>)}</span>
            <span className="bk-index-chapters">{chaptersOf(entry.pages).map((n, i) => <Fragment key={n}>{i > 0 && ' · '}<a href={`#/ch/${n}`} aria-label={chapterLabel(n)}>{n === 0 ? 'Intro' : `Ch. ${n}`}</a></Fragment>)}</span>
          </dd>
        </div>)}
      </dl>
    </section>)}
    {needle && !shown.length && <p className="bk-appendix-empty">No entry matches “{query.trim()}”.</p>}
  </article>;
}
