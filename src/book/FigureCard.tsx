// One item of a chapter page: the figure's number and caption, the interactive diagram, what the text says, what to
// try, what is a display choice, Fleming's own figure for comparison, and links into the laboratories.
import { useEffect, useRef, useState } from 'react';
import { FigureVisible } from './kit/clock';
import { BOOK_PDF } from './labs';
import { LabLinks, Pg } from './prose';
import type { BookItem } from './types';

/** The element id of an item, for links and the chapter's jump list. */
export const itemAnchor = (id: string) => `fig-${id}`;

/** The cropped image of a book figure (docs/figures/book), relative to the companion page. */
export const figureImage = (id: string) => { const [c, n] = id.split('-'); return `../docs/figures/book/fig-${c.padStart(2, '0')}-${n.padStart(2, '0')}.png`; };

/** Track whether an element is near the viewport, so only figures the reader can see animate. */
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => setVisible(entries.some(e => e.isIntersecting)), { rootMargin: '120px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, visible] as const;
}

/** Render one figure or explorer of a chapter. */
export function FigureCard({ item, chapter }: { item: BookItem; chapter: number }) {
  const [ref, visible] = useOnScreen<HTMLElement>();
  const figure = item.kind === 'figure', { Diagram } = item;
  const name = figure ? `Figure ${item.id}` : 'Explorer';
  return <article ref={ref} id={itemAnchor(item.id)} className={`bk-card bk-card-${item.kind}`} aria-labelledby={`${itemAnchor(item.id)}-title`} data-testid={`item-${item.id}`}>
    <header className="bk-card-head">
      <p className="bk-card-kicker"><a href={`#/ch/${chapter}/${item.id}`} title="Link to this item">{name}</a><span aria-hidden="true"> · </span><Pg n={item.page}/></p>
      <h3 id={`${itemAnchor(item.id)}-title`}>{item.title}</h3>
      {item.caption && <blockquote className="bk-caption"><span className="bk-caption-label">Fleming’s caption</span>{item.caption}</blockquote>}
    </header>
    <FigureVisible.Provider value={visible}><Diagram/></FigureVisible.Provider>
    <div className="bk-card-body">
      <div className="bk-card-text">
        <section><h4>In the text</h4><div className="bk-prose">{item.text}</div></section>
        <section><h4>Try</h4><ul className="bk-try">{item.tryThis.map(line => <li key={line}>{line}</li>)}</ul></section>
        {item.notes && <section className="bk-notes"><h4>What is not Fleming’s here</h4><div className="bk-prose">{item.notes}</div></section>}
        {item.labs && <LabLinks links={item.labs}/>}
      </div>
      {figure && <figure className="bk-original">
        <a href={`${BOOK_PDF}#page=${item.page}`} target="_blank" rel="noreferrer" title={`Open the book at PDF page ${item.page}`}><img src={figureImage(item.id)} alt={`Fleming’s Figure ${item.id} as printed in the book`} loading="lazy"/></a>
        <figcaption>Figure {item.id} as printed, <Pg n={item.page}/></figcaption>
      </figure>}
    </div>
  </article>;
}
