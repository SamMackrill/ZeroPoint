import { Menu, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from 'react-resizable-panels';
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
  inspector?: ReactNode;
  status?: ReactNode;
}

/** Whether a key event comes from a text field, where the panel shortcuts must not fire. */
const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

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
export const NARROW_QUERY = '(max-width: 850px)';


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
function WideShell({ id, header, rail, viewport, timeline, dock, inspector, status }: ShellProps) {
  const railRef = usePanelRef(), inspectorRef = usePanelRef(), dockRef = usePanelRef();
  const storage = layoutStorage();
  const outer = useDefaultLayout({ id: `zeropoint-shell-${id}`, storage });
  const inner = useDefaultLayout({ id: `zeropoint-shell-${id}-centre`, storage });
  const beforeFocus = useRef<string[] | null>(null);

  useEffect(() => {
    const panels = { rail: railRef, inspector: inspectorRef, dock: dockRef };
    const toggle = (name: keyof typeof panels) => { const p = panels[name].current; if (!p) return; if (p.isCollapsed()) p.expand(); else p.collapse(); };
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || typing(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'b') toggle('rail');
      else if (key === 'i') toggle('inspector');
      else if (key === 'j') toggle('dock');
      else if (key === '.') {
        if (beforeFocus.current) { for (const name of beforeFocus.current) panels[name as keyof typeof panels].current?.expand(); beforeFocus.current = null; }
        else {
          beforeFocus.current = Object.entries(panels).filter(([, p]) => p.current && !p.current.isCollapsed()).map(([name]) => name);
          for (const p of Object.values(panels)) p.current?.collapse();
        }
      } else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [railRef, inspectorRef, dockRef]);

  return (
    <div className="workbench">
      {header}
      <Group orientation="horizontal" className="workbench-body" {...outer}>
        <Panel id="rail" panelRef={railRef} defaultSize="190px" minSize="160px" maxSize="280px" collapsible collapsedSize="44px">{rail}</Panel>
        <Separator className="workbench-separator"/>
        <Panel id="centre" minSize="30%">
          <Group orientation="vertical" className="workbench-centre" {...inner}>
            <Panel id="viewport" minSize="25%">
              <div className="workbench-stage"><div className="workbench-viewport">{viewport}</div>{timeline}</div>
            </Panel>
            {dock && <>
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

/**
 * The narrow shell: header, viewport, timeline and dock stacked in a scrolling page, with the rail and inspector opening
 * as drawers. Choosing an experiment or scenario in the rail closes its drawer.
 */
function NarrowShell({ header, rail, viewport, timeline, dock, inspector, status }: ShellProps) {
  const [drawer, setDrawer] = useState<'rail' | 'inspector' | null>(null);
  return (
    <div className="workbench is-narrow">
      {header}
      <div className="workbench-narrow-bar">
        <button type="button" className="workbench-icon-button" data-testid="nav-open" aria-label="Open experiment library" onClick={() => setDrawer('rail')}><Menu size={17} aria-hidden="true"/></button>
        {inspector && <button type="button" className="workbench-icon-button" aria-label="Open inspector" onClick={() => setDrawer('inspector')}><SlidersHorizontal size={17} aria-hidden="true"/></button>}
      </div>
      <div className="workbench-narrow-stage"><div className="workbench-viewport">{viewport}</div>{timeline}</div>
      {dock && <div className="workbench-narrow-dock">{dock}</div>}
      {status}
      {drawer && (
        <div className={`workbench-drawer is-${drawer}`} role="dialog" aria-modal="true" aria-label={drawer === 'rail' ? 'Experiment library' : 'Inspector'}
          onClickCapture={event => { if (drawer === 'rail' && (event.target as HTMLElement).closest('[data-testid^="scenario-"], [data-testid^="lab-"]')) setTimeout(() => setDrawer(null)); }}>
          <button type="button" className="workbench-icon-button workbench-drawer-close" aria-label={drawer === 'rail' ? 'Close experiment library' : 'Close inspector'} onClick={() => setDrawer(null)}><X size={17} aria-hidden="true"/></button>
          {drawer === 'rail' ? rail : inspector}
        </div>
      )}
    </div>
  );
}

/** Props for HostedLayout. */
export interface HostedLayoutProps {
  header: ReactNode;
  rail: ReactNode;
  children: ReactNode;
}

/**
 * The transitional layout for a lab whose workspace has not moved into the shell yet: the shell's header and rail
 * around the lab's own page, which keeps its scrolling. On phones the lab's own header and navigation stay instead.
 */
export function HostedLayout({ header, rail, children }: HostedLayoutProps) {
  return (
    <div className="workbench-hosted">
      {header}
      <div className="workbench-hosted-body">
        <div className="workbench-hosted-rail">{rail}</div>
        <div className="workbench-host">{children}</div>
      </div>
    </div>
  );
}
