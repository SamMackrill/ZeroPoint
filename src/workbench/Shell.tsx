import * as Dialog from '@radix-ui/react-dialog';
import { Menu, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from 'react-resizable-panels';
import { useCommand } from './actions';
import { OpenLibrary } from './library';
import './shell.css';

/** Props for Shell. */
export interface ShellProps {
  /** Layout persistence key: sizes and collapsed state are kept per experiment. */
  id: string;
  header: ReactNode;
  rail: ReactNode;
  viewport: ReactNode;
  timeline?: ReactNode;
  dock?: ReactNode;
  /** The dock is only its readout strip (the scenario has no dock tabs): it sits under the timeline, not in a resizable panel. */
  dockStripOnly?: boolean;
  inspector?: ReactNode;
  status?: ReactNode;
  /** Whether this lab is the visible one, so its panel keys apply (default true). */
  active?: boolean;
}


/** Whether a media query matches, following changes (false where matchMedia is unavailable). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const list = matchMedia(query), update = () => setMatches(list.matches);
    update(); list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** Below this width the shell stacks its panels and opens the rail and inspector as drawers (UI 18 refines phones). */
/**
 * Plan §13 tiers. Desktop (≥ 1280 px) has the resizable shell; tablets (768–1279 px) and phones (< 768 px) the narrow one,
 * with the rail and inspector as overlays. Phones are a basic viewer: no split view, Compare or palette.
 */
export const NARROW_QUERY = '(max-width: 1279px)';
export const PHONE_QUERY = '(max-width: 767px)';
/** Whether the window is phone-sized (the basic viewer). */
export const usePhone = () => useMediaQuery(PHONE_QUERY);
/** Narrow layouts (tablets, phones) start with the dock collapsed to its readout strip (plan §13). */
export const dockStartsCollapsed = () => typeof matchMedia !== 'undefined' && matchMedia(NARROW_QUERY).matches;


/** Layout persistence: localStorage when it works, otherwise an in-memory store for this session. */
type LayoutStore = Pick<Storage, 'getItem' | 'setItem'>;
let layoutStore: LayoutStore | null = null;

/**
 * The layout store, chosen on first use rather than at module load: reading localStorage can throw (a SecurityError
 * when browser policy blocks storage), and that must degrade to unsaved sizes, not stop the app from loading.
 */
export function layoutStorage(): LayoutStore {
  if (layoutStore) return layoutStore;
  try {
    const probe = '__zeropoint_layout__', storage = globalThis.localStorage;
    storage.setItem(probe, probe); storage.removeItem(probe);
    layoutStore = storage;
  } catch (error) {
    console.warn('Panel sizes will not be saved: browser storage is unavailable.', error);
    const memory = new Map<string, string>();
    layoutStore = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); } };
  }
  return layoutStore;
}

/**
 * The workbench shell (§05): header, a resizable rail (160–280 px, collapsing to 44 px), the viewport with the
 * timeline bar under it, a resizable dock, a resizable inspector (240–400 px) and the status bar. The page never
 * scrolls; only the inspector and dock bodies do. Ctrl B, Ctrl I and Ctrl J toggle the rail, inspector and dock, and
 * Ctrl . (focus mode) collapses all three and restores them. Sizes persist per experiment.
 */
export function Shell(props: ShellProps) {
  return useMediaQuery(NARROW_QUERY) ? <NarrowShell {...props}/> : <WideShell {...props}/>;
}

/** The desktop shell: resizable panels with keyboard toggles. */
function WideShell({ id, header, rail, viewport, timeline, dock, dockStripOnly, inspector, status, active = true }: ShellProps) {
  const railRef = usePanelRef(), inspectorRef = usePanelRef(), dockRef = usePanelRef();
  const storage = layoutStorage();
  const outer = useDefaultLayout({ id: `zeropoint-shell-${id}`, storage });
  const inner = useDefaultLayout({ id: `zeropoint-shell-${id}-centre`, storage });
  const beforeFocus = useRef<string[] | null>(null);
  // 1280–1439 px: the rail starts collapsed to icons on the first visit (plan §13); after that, saved sizes rule.
  useEffect(() => {
    const seen = `zeropoint-shell-${id}-rail-start`;
    if (storage.getItem(seen)) return;
    storage.setItem(seen, '1');
    if (window.innerWidth < 1440) railRef.current?.collapse();
  }, [id, storage, railRef]);

  // The panel keys (PANEL_SHORTCUTS) run through the registry while this lab is visible.
  const panels = { rail: railRef, inspector: inspectorRef, dock: dockRef };
  const toggle = (name: keyof typeof panels) => { const p = panels[name].current; if (!p) return; if (p.isCollapsed()) p.expand(); else p.collapse(); };
  useCommand('view.rail', active, () => toggle('rail'));
  useCommand('view.inspector', active, () => toggle('inspector'));
  useCommand('view.dock', active, () => toggle('dock'));
  useCommand('view.focus', active, () => {
    if (beforeFocus.current) { for (const name of beforeFocus.current) panels[name as keyof typeof panels].current?.expand(); beforeFocus.current = null; }
    else {
      beforeFocus.current = Object.entries(panels).filter(([, p]) => p.current && !p.current.isCollapsed()).map(([name]) => name);
      for (const p of Object.values(panels)) p.current?.collapse();
    }
  });

  return (
    <div className="workbench">
      {header}
      <Group orientation="horizontal" className="workbench-body" {...outer}>
        <Panel id="rail" panelRef={railRef} defaultSize="190px" minSize="160px" maxSize="280px" collapsible collapsedSize="44px">{rail}</Panel>
        <Separator className="workbench-separator"/>
        <Panel id="centre" minSize="30%">
          <Group orientation="vertical" className="workbench-centre" {...inner}>
            <Panel id="viewport" minSize="25%">
              <div className="workbench-stage"><div className="workbench-viewport">{viewport}</div>{timeline}{dockStripOnly && dock}</div>
            </Panel>
            {dock && !dockStripOnly && <>
              <Separator className="workbench-separator is-horizontal"/>
              <Panel id="dock" panelRef={dockRef} defaultSize="170px" minSize="90px" collapsible collapsedSize="45px">{dock}</Panel>
            </>}
          </Group>
        </Panel>
        {inspector && <>
          <Separator className="workbench-separator"/>
          <Panel id="inspector" panelRef={inspectorRef} defaultSize="280px" minSize="240px" maxSize="400px" collapsible>{inspector}</Panel>
        </>}
      </Group>
      {status}
    </div>
  );
}

/** One narrow-layout drawer: a Radix modal dialog (focus moves in and is trapped, Esc closes, focus returns to its trigger). */
function Drawer({ side, label, closeLabel, trigger, open, onOpenChange, onClickCapture, children }: { side: 'rail' | 'inspector'; label: string; closeLabel: string; trigger: ReactNode; open: boolean; onOpenChange(open: boolean): void; onClickCapture?(event: MouseEvent<HTMLDivElement>): void; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="workbench-drawer-overlay"/>
        <Dialog.Content className={`workbench-drawer is-${side}`} aria-describedby={undefined} onClickCapture={onClickCapture}>
          <Dialog.Title className="visually-hidden">{label}</Dialog.Title>
          <Dialog.Close asChild><button type="button" className="workbench-icon-button workbench-drawer-close" aria-label={closeLabel}><X size={17} aria-hidden="true"/></button></Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The narrow shell: header, viewport, timeline and dock stacked in a scrolling page, with the rail and inspector opening
 * as modal drawers. Choosing an experiment or scenario in the rail closes its drawer.
 */
function NarrowShell({ header, rail, viewport, timeline, dock, inspector, status }: ShellProps) {
  const [drawer, setDrawer] = useState<'rail' | 'inspector' | null>(null);
  const openChange = (which: 'rail' | 'inspector') => (open: boolean) => setDrawer(open ? which : null);
  const openLibrary = useCallback(() => setDrawer('rail'), []);
  return (
    <OpenLibrary.Provider value={openLibrary}>
    <div className="workbench is-narrow">
      {header}
      <div className="workbench-narrow-bar">
        <Drawer side="rail" label="Experiment library" closeLabel="Close experiment library" open={drawer === 'rail'} onOpenChange={openChange('rail')}
          trigger={<button type="button" className="workbench-icon-button" data-testid="nav-open" aria-label="Open experiment library"><Menu size={17} aria-hidden="true"/></button>}
          onClickCapture={event => { if ((event.target as HTMLElement).closest('[data-testid^="scenario-"], [data-testid^="lab-"]')) setTimeout(() => setDrawer(null)); }}>
          {rail}
        </Drawer>
        {inspector && (
          <Drawer side="inspector" label="Inspector" closeLabel="Close inspector" open={drawer === 'inspector'} onOpenChange={openChange('inspector')}
            trigger={<button type="button" className="workbench-icon-button" aria-label="Open inspector"><SlidersHorizontal size={17} aria-hidden="true"/></button>}>
            {inspector}
          </Drawer>
        )}
      </div>
      <div className="workbench-narrow-stage"><div className="workbench-viewport">{viewport}</div>{timeline}</div>
      {dock && <div className="workbench-narrow-dock">{dock}</div>}
      {status}
    </div>
    </OpenLibrary.Provider>
  );
}
