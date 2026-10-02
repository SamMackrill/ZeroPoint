import { Columns2, Square } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Segmented } from '../ui/Segmented';
import './split-view.css';

/** One linked view the second pane can show. */
export interface SplitPane { id: string; label: string; content: ReactNode }

/** Props for SplitView. */
export interface SplitViewProps {
  /** The main viewport (the 3D field or 2D scene). */
  primary: ReactNode;
  /** The scenario's linked views; with none, there is no split toggle. */
  panes: readonly SplitPane[];
  split: boolean;
  onSplit(split: boolean): void;
  pane: string;
  onPane(id: string): void;
  /** Whether the \ shortcut is live (the lab is visible). */
  active: boolean;
}

/** Whether a key event comes from a text field or a dialog, where \ must not toggle the split. */
const typing = (event: KeyboardEvent) => event.target instanceof HTMLElement && (event.target.isContentEditable || !!event.target.closest('input, textarea, select, [role=dialog]'));

/**
 * Split view (docs/ui-redesign-plan.html §07): the ▢ / ▢▢ toggle (or \) shows a second pane beside the viewport, with a
 * picker of the scenario's linked views. Both panes share the timeline and the selection. Narrow screens stack them.
 */
export function SplitView({ primary, panes, split, onSplit, pane, onPane, active }: SplitViewProps) {
  const current = panes.find(p => p.id === pane) ?? panes[0];
  const open = split && !!current;
  useEffect(() => {
    if (!active || !panes.length) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '\\' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented || typing(event)) return;
      event.preventDefault(); onSplit(!split);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, panes.length, split, onSplit]);
  return (
    <div className={`split-view${open ? ' is-split' : ''}`}>
      <div className="split-primary">
        {primary}
        {panes.length > 0 && (
          <button type="button" className="split-toggle" data-testid="split-toggle" aria-pressed={open} aria-label={open ? 'Show one view' : 'Show linked view beside'} title={`${open ? 'One view' : 'Split view'} (\\)`} onClick={() => onSplit(!open)}>
            {open ? <Square size={14} aria-hidden="true"/> : <Columns2 size={14} aria-hidden="true"/>}
          </button>
        )}
      </div>
      {open && current && (
        <section className="split-secondary" aria-label={current.label}>
          {panes.length > 1
            ? <header className="split-head"><Segmented label="Linked view" testId="split-pane" options={panes.map(p => ({ value: p.id, label: p.label }))} value={current.id} onChange={onPane}/></header>
            : <header className="split-head"><span>{current.label}</span></header>}
          <div className="split-body">{current.content}</div>
        </section>
      )}
    </div>
  );
}
