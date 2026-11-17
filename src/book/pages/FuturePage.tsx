// Proposed simulations: what the book describes that the laboratories do not yet let a reader run.
import { useEffect } from 'react';
import { FUTURE } from '../future';
import { chapterLabel } from '../toc';

/** The list of proposed simulations. `id` scrolls to one of them. */
export function FuturePage({ id }: { id?: string }) {
  useEffect(() => {
    const target = id ? document.getElementById(`future-${id}`) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo?.(0, 0);
  }, [id]);
  return <article className="bk-future" data-testid="future">
    <header className="bk-chapter-head">
      <p className="bk-kicker">Future work</p>
      <h1>Simulations the book still asks for</h1>
      <p className="bk-lede">The diagrams on these pages each follow one figure. A simulation goes further: it lets the mechanism run and be measured. These are the ones the book’s later chapters would most reward, in the order of the book, with what each could start from and what Fleming leaves open.</p>
    </header>
    <ol className="bk-future-list">
      {FUTURE.map(f => <li key={f.id} id={`future-${f.id}`}>
        <h2>{f.title}</h2>
        <p className="bk-future-src">{f.chapters.map((n, i) => <span key={n}>{i > 0 && ', '}<a href={`#/ch/${n}`}>{chapterLabel(n)}</a></span>)}<span aria-hidden="true"> · </span>{f.sources}</p>
        <dl>
          <dt>What you would do</dt><dd>{f.idea}</dd>
          <dt>What it can start from</dt><dd>{f.basis}</dd>
          <dt>What Fleming leaves open</dt><dd>{f.open}</dd>
        </dl>
      </li>)}
    </ol>
  </article>;
}
