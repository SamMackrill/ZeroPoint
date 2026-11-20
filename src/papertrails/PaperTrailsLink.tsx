// Links to PaperTrails, each with a hover card read live from the published timeline: a scientist's portrait, dates,
// summary and papers, or a paper's year, abstract and author. The link itself always works, card or no card; on a
// touch screen, where there is no hover, it simply opens PaperTrails.
import * as HoverCard from '@radix-ui/react-hover-card';
import { useEffect, useState, type ReactNode } from 'react';
import { PAPERTRAILS, loadPaperTrails, publicationHref, scientistHref, type PtData, type PtScientist } from './data';
import { PEOPLE, type PersonId } from './people';
import './papertrails.css';

type Loaded = { state: 'loading' } | { state: 'ready'; data: PtData } | { state: 'failed' };

/** PaperTrails' data, fetched the first time a card opens and shared by every card after. */
function usePaperTrails(open: boolean): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });
  useEffect(() => {
    if (!open || loaded.state === 'ready') return;
    let live = true;
    loadPaperTrails().then(data => live && setLoaded({ state: 'ready', data }), () => live && setLoaded({ state: 'failed' }));
    return () => { live = false; };
  }, [open, loaded.state]);
  return loaded;
}

/** A life as years: “1831–1879”, or “born 1949”. */
export function lifespan(s: Pick<PtScientist, 'born' | 'died'>) {
  if (s.born === undefined) return s.died === undefined ? '' : `died ${s.died}`;
  return s.died === undefined ? `born ${s.born}` : `${s.born}–${s.died}`;
}

/** The card's frame, shared by scientists and papers: the content, then the way out to PaperTrails. */
function Card({ href, children }: { href: string; children: ReactNode }) {
  return <HoverCard.Portal>
    <HoverCard.Content className="pt-card" side="bottom" align="start" sideOffset={6} collisionPadding={12}>
      {children}
      <a className="pt-card-open" href={href} target="_blank" rel="noreferrer">Open in PaperTrails ↗</a>
      <HoverCard.Arrow className="pt-card-arrow" width={12} height={6}/>
    </HoverCard.Content>
  </HoverCard.Portal>;
}

/** What a card shows while PaperTrails is loading or could not be reached. */
function Pending({ loaded }: { loaded: Loaded }) {
  return <p className="pt-card-note" role="status">{loaded.state === 'failed' ? 'PaperTrails could not be reached. The link still opens it.' : 'Loading from PaperTrails…'}</p>;
}

/** A scientist's portrait, name, life, summary and papers. */
function ScientistCard({ scientist, fallback }: { scientist?: PtScientist; fallback: string }) {
  if (!scientist) return <p className="pt-card-note">{fallback} is not on PaperTrails yet.</p>;
  const life = [lifespan(scientist), scientist.nationality].filter(Boolean).join(' · ');
  return <>
    <div className="pt-card-head">
      {scientist.photo && <img className="pt-card-photo" src={scientist.photo} alt="" loading="lazy" width={56} height={56}/>}
      <div>
        <p className="pt-card-name">{scientist.name}</p>
        {life && <p className="pt-card-life">{life}</p>}
      </div>
    </div>
    {scientist.summary && <p className="pt-card-summary">{scientist.summary}</p>}
    {scientist.publications.length > 0 && <>
      <p className="pt-card-label">Papers on PaperTrails</p>
      <ul className="pt-card-papers">
        {scientist.publications.map(p => <li key={p.id}><span className="pt-card-year">{p.year ?? ''}</span><a href={publicationHref(p.id)} target="_blank" rel="noreferrer">{p.title}</a></li>)}
      </ul>
    </>}
  </>;
}

/** The trigger every PaperTrails link shares: a link out, opening its card on hover or keyboard focus. */
function Trigger({ href, label, open, onOpenChange, children, card }: { href: string; label: string; open: boolean; onOpenChange(open: boolean): void; children: ReactNode; card: ReactNode }) {
  return <HoverCard.Root open={open} onOpenChange={onOpenChange} openDelay={350} closeDelay={150}>
    <HoverCard.Trigger asChild>
      <a className="pt-link" href={href} target="_blank" rel="noreferrer" title={label}>{children}</a>
    </HoverCard.Trigger>
    <Card href={href}>{card}</Card>
  </HoverCard.Root>;
}

/** A person's name linked to them on PaperTrails, with a card of their life and papers. `children` defaults to the name. */
export function ScientistLink({ id, children }: { id: PersonId; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const loaded = usePaperTrails(open);
  const name = PEOPLE[id];
  return <Trigger href={scientistHref(id)} label={`${name} on PaperTrails`} open={open} onOpenChange={setOpen}
    card={loaded.state === 'ready' ? <ScientistCard scientist={loaded.data.scientists.get(id)} fallback={name}/> : <Pending loaded={loaded}/>}>
    {children ?? name}
  </Trigger>;
}

/** A paper linked to it on PaperTrails, with a card of its year, author and abstract. `children` defaults to the title. */
export function PublicationLink({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const loaded = usePaperTrails(open);
  const found = loaded.state === 'ready' ? loaded.data.publications.get(id) : undefined;
  return <Trigger href={publicationHref(id)} label={`${title} on PaperTrails`} open={open} onOpenChange={setOpen}
    card={loaded.state !== 'ready' ? <Pending loaded={loaded}/> : !found ? <p className="pt-card-note">This paper is not on PaperTrails yet.</p> : <>
      <p className="pt-card-label">{[found.publication.year, found.scientist.name].filter(Boolean).join(' · ')}</p>
      <p className="pt-card-name">{found.publication.title}</p>
      {found.publication.abstract && <p className="pt-card-summary">{found.publication.abstract}</p>}
    </>}>
    {children ?? title}
  </Trigger>;
}

/** PaperTrails' own brand mark, served by PaperTrails so that it follows any change there. */
export const PAPERTRAILS_MARK = `${PAPERTRAILS}images/brand-mark.png`;

/** PaperTrails' mark, labelling links that lead there. If it cannot load, its label shows in its place. */
export function PaperTrailsMark({ label = 'On PaperTrails' }: { label?: string }) {
  return <img className="pt-mark" src={PAPERTRAILS_MARK} alt={label} title={label} width={18} height={18}/>;
}
