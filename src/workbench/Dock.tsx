import * as Tabs from '@radix-ui/react-tabs';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Readout } from '../ui/Readouts';
import './dock.css';

/** One dock tab (Plots, Ledger, Events, Probe, Compare…). */
export interface DockTab { id: string; label: string; content: ReactNode }

/** Props for Dock. */
export interface DockProps {
  /** Up to four key values, always visible, even when the dock is collapsed. */
  readouts: readonly Readout[];
  tabs: readonly DockTab[];
  tab?: string;
  onTab?(tab: string): void;
  collapsed?: boolean;
  onCollapsedChange?(collapsed: boolean): void;
}

/**
 * The dock (§05 E): a readout strip of the scenario's key values, then tabs. Collapsing (Ctrl J) keeps the strip.
 */
export function Dock({ readouts, tabs, tab, onTab, collapsed = false, onCollapsedChange }: DockProps) {
  // Controlled when the caller passes `tab`; otherwise Radix keeps the selection, starting at the first tab.
  return (
    <Tabs.Root className={`dock${collapsed ? ' is-collapsed' : ''}`} value={tab} defaultValue={tabs[0]?.id} onValueChange={id => { onTab?.(id); if (collapsed) onCollapsedChange?.(false); }}>
      <div className="dock-head">
        <dl className="dock-strip" aria-label="Key readouts">
          {readouts.slice(0, 4).map(r => (
            <div key={r.label}><dt>{r.label}</dt><dd>{r.value}{r.unit && <small> {r.unit}</small>}</dd></div>
          ))}
        </dl>
        {tabs.length > 0 && (
          <Tabs.List className="dock-tabs" aria-label="Dock">
            {tabs.map(t => <Tabs.Trigger key={t.id} value={t.id} data-testid={`dock-${t.id}`}>{t.label}</Tabs.Trigger>)}
          </Tabs.List>
        )}
        {onCollapsedChange && (
          <button type="button" className="dock-toggle" aria-expanded={!collapsed} aria-label={collapsed ? 'Expand dock' : 'Collapse dock'} title={`${collapsed ? 'Expand' : 'Collapse'} dock (Ctrl J)`} onClick={() => onCollapsedChange(!collapsed)}>
            {collapsed ? <ChevronUp size={14} aria-hidden="true"/> : <ChevronDown size={14} aria-hidden="true"/>}
          </button>
        )}
      </div>
      {!collapsed && tabs.map(t => <Tabs.Content key={t.id} value={t.id} className="dock-body">{t.content}</Tabs.Content>)}
    </Tabs.Root>
  );
}
