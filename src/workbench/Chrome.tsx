import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import { ArrowDownToLine, ArrowUpFromLine, Atom, ChevronDown, ChevronRight, CircleHelp, FlaskConical, Info, Lightbulb, Magnet, PanelLeftClose, PanelLeftOpen, Settings, Waves } from 'lucide-react';
import type { ReactNode, Ref, RefObject } from 'react';
import type { Action } from './actions';
import { BrandMark } from '../app/BrandMark';
import { RepositoryLink } from '../app/RepositoryLink';
import { updateSettings, useSettings } from './settings';
import './chrome.css';

/** Props for Header. */
export interface HeaderProps {
  experiment: string;
  scenario?: string;
  /** The parameters differ from the scenario's ("Balanced medium · modified"). */
  modified?: boolean;
  /** File and export buttons, identical across experiments once a lab has migrated. */
  actions?: ReactNode;
  /** Opens the Help sheet (About and Shortcuts) for the current scenario: the header's ? button; the ? key does the same. */
  onHelp?(): void;
  /** Makes the "Illustrative model" chip a button that opens About › This scenario. */
  onChip?(): void;
}

/** The header (§05 A): brand, breadcrumb, the one "Illustrative model" chip, file actions and the repository link. */
export function Header({ experiment, scenario, modified, actions, onHelp, onChip }: HeaderProps) {
  return (
    <header className="workbench-header">
      <div className="workbench-brand"><BrandMark/><span>ZeroPoint<span className="brand-period">.</span></span></div>
      <nav className="workbench-breadcrumb" aria-label="Breadcrumb">
        <span>{experiment}</span>
        {scenario && <><ChevronRight size={13} aria-hidden="true"/><span aria-current="page">{scenario}{modified && <em> · modified</em>}</span></>}
      </nav>
      {onChip
        ? <button type="button" className="workbench-chip" onClick={onChip}><Info size={12} aria-hidden="true"/>Illustrative model</button>
        : <span className="workbench-chip"><Info size={12} aria-hidden="true"/>Illustrative model</span>}
      <div className="workbench-actions">{actions}<RepositoryLink/><SettingsMenu/>{onHelp && <button type="button" className="workbench-icon-button" aria-label="Help" title="Help: About and shortcuts (?)" onClick={onHelp}><CircleHelp size={16} aria-hidden="true"/></button>}</div>
    </header>
  );
}

/** The global Settings popover (plan §05 A): reduced motion and debug telemetry, shared by every lab. */
export function SettingsMenu() {
  const { reducedMotion, telemetry } = useSettings();
  return (
    <Popover.Root>
      <Popover.Trigger className="workbench-icon-button" aria-label="Settings" title="Settings" data-testid="settings"><Settings size={16} aria-hidden="true"/></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="settings-popover" align="end" sideOffset={6} collisionPadding={8}>
          <h3>Settings</h3>
          <label><input type="checkbox" data-testid="setting-reduced-motion" checked={reducedMotion} onChange={e => updateSettings({ reducedMotion: e.target.checked })}/>Reduce flashing &amp; camera motion</label>
          <p>Keeps lobe size constant; rotation and pair separation still follow the lifecycle. Step while paused for still inspection. Defaults to your system’s reduce-motion setting.</p>
          <label><input type="checkbox" data-testid="setting-telemetry" checked={telemetry} onChange={e => updateSettings({ telemetry: e.target.checked })}/>Show debug telemetry</label>
          <p>Model IDs and parameter revisions in the status bar.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
              <button type="button" className={`rail-experiment${active ? ' is-active' : ''}`} data-testid={`lab-${e.id}`} aria-current={active ? 'true' : undefined} title={e.title} onClick={() => onExperiment(e.id)}>
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
  items?: readonly ReactNode[];
  /** Model ID and similar diagnostics, shown only with Settings › Show debug telemetry. */
  telemetry?: readonly ReactNode[];
}

/** The status bar (§05): run state, configuration and tick, and the model disclaimer. Debug telemetry lives in Settings. */
export function StatusBar({ running, items = [], telemetry = [] }: StatusBarProps) {
  const settings = useSettings();
  return (
    <footer className="workbench-status">
      {/* A polite live region (plan §13): screen readers hear Running or Paused when playback starts or stops. */}
      <span className={`status-state${running ? ' is-running' : ''}`} role="status" aria-live="polite" aria-atomic="true" data-testid="run-state"><i aria-hidden="true"/>{running ? 'Running' : 'Paused'}</span>
      {items.map((item, i) => <span key={i}>{item}</span>)}
      {settings.telemetry && telemetry.map((item, i) => <span key={`t${i}`} className="status-telemetry" data-testid="status-telemetry">{item}</span>)}
      <span className="status-disclaimer">Illustrative model</span>
    </footer>
  );
}

/** One Export ▾ entry, e.g. PNG image or CSV. */
export interface ExportItem { id: string; label: string; onSelect(): void; disabled?: boolean }

/** Props for FileActions. */
export interface FileActionsProps {
  /** The experiment's file input accepts its own format (`accept`); the load button opens it. */
  onFile(file: File): void;
  onSave(): void;
  exports: readonly ExportItem[];
  accept?: string;
  disabled?: boolean;
  /** The hidden file input, so Ctrl O can open it (fileShortcuts). */
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * The unified file buttons (§05 H): Load, Save and Export ▾ with the same labels in every experiment; the format is
 * chosen by the experiment. Test ids: file-load, file-save, file-input and export-<id>.
 */
export function FileActions({ onFile, onSave, exports, accept = '.json,application/json', disabled, inputRef }: FileActionsProps) {
  return (
    <div className="file-actions">
      <label className={`file-button${disabled ? ' is-disabled' : ''}`} data-testid="file-load" title="Load"><ArrowUpFromLine size={14} aria-hidden="true"/><span className="file-label">Load</span>
        <input ref={inputRef} className="visually-hidden" type="file" data-testid="file-input" aria-label="Load experiment file" accept={accept} disabled={disabled}
          onChange={event => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ''; }}/>
      </label>
      <button type="button" className="file-button" data-testid="file-save" disabled={disabled} onClick={onSave} aria-label="Save" title="Save"><ArrowDownToLine size={14} aria-hidden="true"/><span className="file-label">Save</span></button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="file-button" data-testid="export-menu" disabled={disabled || !exports.length}>Export<ChevronDown size={13} aria-hidden="true"/></DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="file-menu" align="end" sideOffset={6}>
            {exports.map(item => <DropdownMenu.Item key={item.id} className="file-menu-item" data-testid={`export-${item.id}`} disabled={item.disabled} onSelect={item.onSelect}>{item.label}</DropdownMenu.Item>)}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

/** A lab's Export ▾ entries as palette actions (Files group). */
export function exportActions(items: readonly ExportItem[], disabled = false): Action[] {
  return items.map(item => ({ id: `files.export.${item.id}`, label: `Export ${item.label}`, group: 'Files', disabled: disabled || item.disabled, run: item.onSelect }));
}

/** Ctrl S saves and Ctrl O opens the file picker (plan §11 keyboard map), for a lab's FileActions. */
export function fileShortcuts(save: () => void, input: RefObject<HTMLInputElement | null>, disabled = false): Action[] {
  return [
    { id: 'files.save', label: 'Save', group: 'Files', keys: ['Mod+s'], disabled, run: save },
    { id: 'files.load', label: 'Load', group: 'Files', keys: ['Mod+o'], disabled, run: () => input.current?.click() },
  ];
}
