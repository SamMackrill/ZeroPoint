import * as Popover from '@radix-ui/react-popover';
import { Atom, ChevronRight, CircleHelp, FlaskConical, Info, Lightbulb, Magnet, PanelLeftClose, PanelLeftOpen, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandMark } from '../app/BrandMark';
import { RepositoryLink } from '../app/RepositoryLink';
import './chrome.css';

/** Props for Header. */
export interface HeaderProps {
  experiment: string;
  scenario?: string;
  /** The parameters differ from the scenario's ("Balanced medium · modified"). */
  modified?: boolean;
  /** File and export buttons, identical across experiments once a lab has migrated. */
  actions?: ReactNode;
  /** Opens help and About for the current experiment (the header's ? button). */
  onHelp?(): void;
}

/** The header (§05 A): brand, breadcrumb, the one "Illustrative model" chip, file actions and the repository link. */
export function Header({ experiment, scenario, modified, actions, onHelp }: HeaderProps) {
  return (
    <header className="workbench-header">
      <div className="workbench-brand"><BrandMark/><span>ZeroPoint<span className="brand-period">.</span></span></div>
      <nav className="workbench-breadcrumb" aria-label="Breadcrumb">
        <span>{experiment}</span>
        {scenario && <><ChevronRight size={13} aria-hidden="true"/><span aria-current="page">{scenario}{modified && <em> · modified</em>}</span></>}
      </nav>
      <span className="workbench-chip"><Info size={12} aria-hidden="true"/>Illustrative model</span>
      <div className="workbench-actions">{actions}<RepositoryLink/>{onHelp && <button type="button" className="workbench-icon-button" aria-label="About the model" title="About the model" onClick={onHelp}><CircleHelp size={16} aria-hidden="true"/></button>}</div>
    </header>
  );
}

/** A rail entry: an experiment with its scenarios (listed once the lab can switch them from the rail). */
export interface RailExperiment {
  id: string;
  title: string;
  scenarios?: readonly { id: string; title: string }[];
}

/** A planned experiment: greyed in the rail, opening a one-line summary and its plan. */
export interface PlannedExperiment { id: string; title: string; summary: string; href?: string }

/** Props for Rail. */
export interface RailProps {
  experiments: readonly RailExperiment[];
  planned: readonly PlannedExperiment[];
  experiment: string;
  scenario?: string;
  onExperiment(id: string): void;
  onScenario?(experiment: string, scenario: string): void;
  collapsed?: boolean;
  onCollapsedChange?(collapsed: boolean): void;
}

/** Rail icons by experiment id; the collapsed rail shows only these. */
const ICONS: Record<string, typeof Waves> = { medium: Waves, light: Lightbulb, electron: Atom, casimir: Magnet, vdw: FlaskConical };

/**
 * The switcher rail (§05 B): experiments, with the active one expanded to its scenarios, then greyed planned
 * experiments. Collapses to a 44 px icon rail (Ctrl B).
 */
export function Rail({ experiments, planned, experiment, scenario, onExperiment, onScenario, collapsed = false, onCollapsedChange }: RailProps) {
  return (
    <nav className={`workbench-rail${collapsed ? ' is-collapsed' : ''}`} aria-label="Experiments">
      <div className="rail-head">
        {!collapsed && <span>Experiments</span>}
        {onCollapsedChange && (
          <button type="button" className="rail-toggle" aria-label={collapsed ? 'Expand experiment rail' : 'Collapse experiment rail'} title={`${collapsed ? 'Expand' : 'Collapse'} rail (Ctrl B)`} onClick={() => onCollapsedChange(!collapsed)}>
            {collapsed ? <PanelLeftOpen size={15} aria-hidden="true"/> : <PanelLeftClose size={15} aria-hidden="true"/>}
          </button>
        )}
      </div>
      <ul className="rail-list">
        {experiments.map(e => {
          const Icon = ICONS[e.id] ?? FlaskConical, active = e.id === experiment;
          return (
            <li key={e.id}>
              <button type="button" className={`rail-experiment${active ? ' is-active' : ''}`} data-testid={`lab-${e.id}`} aria-current={active ? 'true' : undefined} title={collapsed ? e.title : undefined} onClick={() => onExperiment(e.id)}>
                <Icon size={15} aria-hidden="true"/>{!collapsed && <span>{e.title}</span>}
              </button>
              {active && !collapsed && e.scenarios && e.scenarios.length > 1 && (
                <ul className="rail-scenarios">
                  {e.scenarios.map(s => (
                    <li key={s.id}><button type="button" className={`rail-scenario${s.id === scenario ? ' is-active' : ''}`} data-testid={`scenario-${s.id}`} aria-current={s.id === scenario ? 'true' : undefined} onClick={() => onScenario?.(e.id, s.id)}>{s.title}</button></li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {!collapsed && planned.length > 0 && (
        <div className="rail-planned">
          <span className="rail-planned-head">Planned</span>
          <ul>
            {planned.map(p => (
              <li key={p.id}>
                <Popover.Root>
                  <Popover.Trigger className="rail-planned-item">{p.title}<small>planned</small></Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content className="rail-planned-pop" side="right" align="start" sideOffset={8} collisionPadding={8}>
                      <strong>{p.title}</strong><p>{p.summary}</p>{p.href && <a href={p.href} target="_blank" rel="noreferrer">Read the plan ↗</a>}
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}

/** Props for StatusBar. */
export interface StatusBarProps {
  running: boolean;
  /** Short state items: seed or configuration, tick. */
  items?: readonly string[];
}

/** The status bar (§05): run state, configuration and tick, and the model disclaimer. Debug telemetry lives in Settings. */
export function StatusBar({ running, items = [] }: StatusBarProps) {
  return (
    <footer className="workbench-status">
      <span className={`status-state${running ? ' is-running' : ''}`}><i aria-hidden="true"/>{running ? 'Running' : 'Paused'}</span>
      {items.map(item => <span key={item}>{item}</span>)}
      <span className="status-disclaimer">Illustrative model</span>
    </footer>
  );
}
