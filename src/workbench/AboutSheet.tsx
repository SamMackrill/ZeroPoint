import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ACTION_GROUPS, keyLabel, type Action } from './actions';
import './about-sheet.css';

/** The Help sheet's sections: About (plan §10) and the keyboard map (§11). Saved views joins them with URL state (UI 16). */
export type AboutSectionId = 'scenario' | 'units' | 'sources' | 'views' | 'shortcuts';

/** One section of the About sheet; a lab omits the sections it has nothing for. */
export interface AboutSection { id: AboutSectionId; content: ReactNode }

const LABELS: Record<AboutSectionId, string> = { scenario: 'This scenario', units: 'Units & constants', sources: 'Sources', views: 'Saved views', shortcuts: 'Shortcuts' };

/** A saved view (plan §10): a named URL-state link to a state worth returning to. */
export interface SavedView { title: string; description: string; hash: string }

/** A pointer gesture and what it does in the viewport, listed above the keyboard map. */
export interface PointerGesture { gesture: string; does: string }
/** The 3D labs' viewport gestures: the orbit hint shows once on the canvas, then lives here (plan §05 C). */
export const ORBIT_GESTURES: readonly PointerGesture[] = [
  { gesture: 'Drag', does: 'Orbit the camera' },
  { gesture: 'Scroll or pinch', does: 'Zoom' },
  { gesture: 'Click or tap', does: 'Inspect what is under the pointer' },
];

/** The lab's keyboard map, grouped as in the palette; each binding shows as keys (Ctrl S, Shift →). */
function ShortcutList({ actions, pointer = [] }: { actions: readonly Action[]; pointer?: readonly PointerGesture[] }) {
  return <>{pointer.length > 0 && <section className="about-shortcuts" aria-label="Mouse and touch">
    <h3>Mouse and touch</h3>
    <dl>{pointer.map(g => <div key={g.gesture}><dt>{g.does}</dt><dd>{g.gesture}</dd></div>)}</dl>
  </section>}{ACTION_GROUPS.map(group => {
    const rows = actions.filter(a => a.group === group && a.keys?.length);
    return rows.length > 0 && <section key={group} className="about-shortcuts" aria-label={`${group} shortcuts`}>
      <h3>{group}</h3>
      <dl>{rows.map(a => <div key={a.id}><dt>{a.label}</dt><dd>{a.keys!.map((k, i) => <span key={k}>{i > 0 && ' or '}{keyLabel(k).map(part => <kbd key={part}>{part}</kbd>)}</span>)}</dd></div>)}</dl>
    </section>;
  })}<p className="about-shortcuts-note">Shortcuts are ignored while typing in a field or while a dialog is open.</p></>;
}

/** Whether a key event comes from a text field or a dialog, where ? must keep its usual meaning. */
const typing = (event: KeyboardEvent) => event.target instanceof HTMLElement && (event.target.isContentEditable || !!event.target.closest('input, textarea, select, [role=dialog], dialog[open]'));

/** Open state for one lab's About sheet: `show()` opens it, at a section if given. */
export function useAbout() {
  const [open, setOpen] = useState(false), [section, setSection] = useState<AboutSectionId>('scenario');
  const show = useCallback((at?: AboutSectionId) => { if (at) setSection(at); setOpen(true); }, []);
  return { open, setOpen, section, setSection, show };
}

/** Palette › Help: open the Help sheet at About or at the keyboard map. */
export function helpActions(show: (at?: AboutSectionId) => void): Action[] {
  return [
    { id: 'help.about', label: 'About this scenario', group: 'Help', run: () => show('scenario') },
    { id: 'help.shortcuts', label: 'Keyboard shortcuts', group: 'Help', run: () => show('shortcuts') },
  ];
}

/** Props for AboutSheet. */
export interface AboutSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  section: AboutSectionId;
  onSection(id: AboutSectionId): void;
  /** The experiment and scenario it describes, as in the breadcrumb. */
  experiment: string;
  scenario?: string;
  sections: readonly AboutSection[];
  /** The lab's actions, listed in a Shortcuts tab. */
  shortcuts?: readonly Action[];
  /** The viewport's pointer gestures, listed first in the Shortcuts tab. */
  pointer?: readonly PointerGesture[];
  /** Named links to states of this lab, listed in a Saved views tab. */
  views?: readonly SavedView[];
  /** Whether Shift ? opens it (the lab is visible). */
  active: boolean;
}

/**
 * The About sheet (plan §10): the full context behind the workspace — what the scenario shows and assumes, units and
 * constants, and sources — in a sheet over the inspector. The header chip, ? and Shift ? open it; Esc closes it.
 */
export function AboutSheet({ open, onOpenChange, section, onSection, experiment, scenario, sections: about, shortcuts, pointer, views, active }: AboutSheetProps) {
  /** Follow a saved view: the hash routes it (re-applied even when the address bar already shows it), and Help closes. */
  const follow = (view: SavedView) => { if (location.hash === view.hash) window.dispatchEvent(new HashChangeEvent('hashchange')); onOpenChange(false); };
  const sections: readonly AboutSection[] = [
    ...about,
    ...(views?.length ? [{ id: 'views' as const, content: <ul className="about-views">{views.map(v => <li key={v.hash}><a href={v.hash} onClick={() => follow(v)}>{v.title}</a><p>{v.description}</p></li>)}</ul> }] : []),
    ...(shortcuts?.length ? [{ id: 'shortcuts' as const, content: <ShortcutList actions={shortcuts} pointer={pointer}/> }] : []),
  ];
  useEffect(() => {
    if (!active || open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented || typing(event)) return;
      event.preventDefault(); onOpenChange(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, open, onOpenChange]);
  // A sheet left open when its lab is hidden closes, so it does not reappear on return without a new request.
  useEffect(() => { if (!active && open) onOpenChange(false); }, [active, open, onOpenChange]);
  const current = sections.some(s => s.id === section) ? section : sections[0]?.id;
  return (
    <Dialog.Root open={open && active} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="about-overlay"/>
        <Dialog.Content className="about-sheet" data-testid="about-sheet" aria-describedby={undefined}>
          <header className="about-head">
            <span className="about-eyebrow">Help</span>
            <Dialog.Title className="about-title">{scenario ?? experiment}</Dialog.Title>
            {scenario && <span className="about-experiment">{experiment}</span>}
            <Dialog.Close asChild><button type="button" className="workbench-icon-button about-close" aria-label="Close Help"><X size={17} aria-hidden="true"/></button></Dialog.Close>
          </header>
          <Tabs.Root className="about-tabs" value={current} onValueChange={id => onSection(id as AboutSectionId)}>
            <Tabs.List className="about-tab-list" aria-label="About sections">
              {sections.map(s => <Tabs.Trigger key={s.id} value={s.id} data-testid={`about-${s.id}`}>{LABELS[s.id]}</Tabs.Trigger>)}
            </Tabs.List>
            {sections.map(s => <Tabs.Content key={s.id} value={s.id} className="about-body">{s.content}</Tabs.Content>)}
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
