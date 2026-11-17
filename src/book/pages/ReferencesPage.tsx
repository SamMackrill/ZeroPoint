// Appendix: Fleming's references, chapter by chapter. The book prints each chapter's notes at its end; here they are
// together, searchable, with the pages that cite each one and links where a note gives a DOI or an address.
import { useEffect, useMemo, useState } from 'react';
import { NOTES, NoteList } from '../appendix/notes';
import { CHAPTERS, chapterLabel, chapterTitle } from '../toc';

/** The References appendix. `chapter` scrolls to that chapter's notes. */
export function ReferencesPage({ chapter }: { chapter?: number }) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    const target = chapter !== undefined ? document.getElementById(`refs-ch-${chapter}`) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo?.(0, 0);
  }, [chapter]);
  const needle = query.trim().toLowerCase();
  const shown = useMemo(() => NOTES.filter(note => !needle || note.text.toLowerCase().includes(needle) || String(note.n) === needle), [needle]);
  return <article className="bk-appendix" data-testid="references">
    <header className="bk-chapter-head">
      <p className="bk-kicker">Appendix</p>
      <h1>References by chapter</h1>
      <p className="bk-lede">Fleming’s {NOTES.length} notes, gathered from the ends of the chapters where the book prints them. Each gives the pages whose text cites it. The wording is his, including its slips; where a note gives a DOI or a web address it is a link, though some addresses from 2012 no longer answer.</p>
    </header>
    <div className="bk-appendix-tools">
      <label className="bk-search"><span>Find</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Author, title, year or note" aria-describedby="refs-count"/></label>
      <p id="refs-count" className="bk-appendix-count" role="status">{needle ? `${shown.length} of ${NOTES.length} notes` : `${NOTES.length} notes in ${new Set(NOTES.map(n => n.chapter)).size} chapters`}</p>
    </div>
    {CHAPTERS.map(meta => {
      const notes = shown.filter(note => note.chapter === meta.n);
      if (!notes.length) return null;
      return <section key={meta.n} id={`refs-ch-${meta.n}`} className="bk-appendix-section" aria-labelledby={`refs-ch-${meta.n}-title`}>
        <h2 id={`refs-ch-${meta.n}-title`}><a href={`#/ch/${meta.n}`}><span className="bk-appendix-label">{chapterLabel(meta.n)}</span> {chapterTitle(meta)}</a></h2>
        <NoteList notes={notes}/>
      </section>;
    })}
    {needle && !shown.length && <p className="bk-appendix-empty">No note mentions “{query.trim()}”.</p>}
  </article>;
}
