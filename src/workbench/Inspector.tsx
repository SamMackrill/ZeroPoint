import * as Tabs from '@radix-ui/react-tabs';
import { Dices } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { InfoTip } from '../ui/InfoTip';
import { LayerList, type LayerGroup } from '../ui/LayerList';
import { ParamRow } from '../ui/ParamRow';
import { Segmented } from '../ui/Segmented';
import { appliesTo, getPath, type ChoiceSpec, type ControlSpec, type ExperimentDefinition, type LayerSpec, type RangeSpec } from './definition';
import './inspector.css';

/** The inspector's three tabs (§05 F). */
export type InspectorTab = 'setup' | 'view' | 'selection';

/** Props for Inspector. */
export interface InspectorProps {
  setup: ReactNode;
  view: ReactNode;
  /** The Selection tab's content; an empty state while nothing is selected. */
  selection?: ReactNode;
  tab?: InspectorTab;
  onTab?(tab: InspectorTab): void;
}

/**
 * The inspector (§05 F): Setup, View and Selection tabs whose bodies scroll while the tab list stays put. Every tab stays
 * mounted (hidden while inactive), so state such as Setup's staged changes survives switching tabs.
 */
export function Inspector({ setup, view, selection, tab, onTab }: InspectorProps) {
  return (
    <Tabs.Root className="wb-inspector" value={tab} defaultValue="setup" onValueChange={v => onTab?.(v as InspectorTab)}>
      <Tabs.List className="wb-inspector-tabs" aria-label="Inspector">
        <Tabs.Trigger value="setup" data-testid="inspector-setup">Setup</Tabs.Trigger>
        <Tabs.Trigger value="view" data-testid="inspector-view">View</Tabs.Trigger>
        <Tabs.Trigger value="selection" data-testid="inspector-selection">Selection</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content className="inspector-body" value="setup" forceMount>{setup}</Tabs.Content>
      <Tabs.Content className="inspector-body" value="view" forceMount>{view}</Tabs.Content>
      <Tabs.Content className="inspector-body" value="selection" forceMount>{selection ?? <p className="inspector-empty">Click something in the viewport to inspect it.</p>}</Tabs.Content>
    </Tabs.Root>
  );
}

/** Values compared for "has this changed": numbers, strings and booleans. */
const differs = (a: unknown, b: unknown) => !Object.is(a, b);

/** Group items by their group label, keeping first-appearance order. */
function grouped<T extends { group: string }>(items: readonly T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  return [...groups];
}

/** One Setup or view control: a ParamRow for ranges, a Segmented control for choices. */
export function Control({ spec, value, onChange, dirty }: { spec: ControlSpec; value: unknown; onChange(value: unknown): void; dirty?: boolean }) {
  const info = spec.info ? <InfoTip label={spec.label}>{spec.info}</InfoTip> : undefined;
  if (spec.kind === 'choice') return <ChoiceControl spec={spec} value={value} onChange={onChange} dirty={dirty} info={info}/>;
  return <RangeControl spec={spec} value={Number(value)} onChange={onChange} dirty={dirty} info={info}/>;
}

/** A choice control; option values may be numbers or booleans, so they travel as strings through Segmented. */
function ChoiceControl({ spec, value, onChange, dirty, info }: { spec: ChoiceSpec; value: unknown; onChange(value: unknown): void; dirty?: boolean; info?: ReactNode }) {
  return (
    <div className={`inspector-choice${dirty ? ' is-dirty' : ''}`} data-testid={`param-${spec.key}`}>
      <span className="inspector-choice-label">{spec.label}{spec.apply === 'restart' && <span className="inspector-restart" aria-label="applies on restart">↻</span>}{info}</span>
      <Segmented label={spec.label} options={spec.options.map(o => ({ value: String(o.value), label: o.label, title: o.title }))} value={String(value)}
        onChange={key => onChange(spec.options.find(o => String(o.value) === key)?.value)}/>
    </div>
  );
}

/** A range control, converted through its display scale (Light's wavelength in nm), with quick values and a dice button. */
function RangeControl({ spec, value, onChange, dirty, info }: { spec: RangeSpec; value: number; onChange(value: unknown): void; dirty?: boolean; info?: ReactNode }) {
  const d = spec.display, show = (v: number) => (d ? d.toDisplay(v) : v), store = (v: number) => (d ? d.fromDisplay(v) : v);
  const step = d ? show(spec.step) - show(0) : spec.step;
  return (
    <div className="inspector-range">
      <ParamRow label={spec.label} value={show(value)} min={show(spec.min)} max={show(spec.max)} step={step} unit={d?.unit ?? spec.unit}
        restart={spec.apply === 'restart'} dirty={dirty} info={info} slider={!spec.integer} testId={`param-${spec.key}`} onChange={v => onChange(store(spec.integer ? Math.round(v) : v))}/>
      {spec.integer && <button type="button" className="inspector-dice" aria-label={`Random ${spec.label.toLowerCase()}`} title="Random" onClick={() => onChange(Math.floor(Math.random() * (spec.max - spec.min + 1)) + spec.min)}><Dices size={14} aria-hidden="true"/></button>}
      {spec.quick && <div className="inspector-quick">{spec.quick.map(q => <button type="button" key={q} aria-pressed={value === q} onClick={() => onChange(q)}>{q} {spec.unit}</button>)}</div>}
    </div>
  );
}

/** Props for SetupPanel. */
export interface SetupPanelProps<P extends object> {
  definition: ExperimentDefinition<P, object>;
  scenario: string;
  /** The running configuration. */
  params: P;
  /** A live parameter changed: apply it now. */
  onLive(key: string, value: unknown): void;
  /** Apply the staged restart parameters (by restarting). */
  onApply(changes: Record<string, unknown>): void;
  /** Restore the scenario's starting parameters. */
  onReset?(): void;
  /** Derived readouts shown under the parameters (Light's frequency). */
  children?: ReactNode;
}

/**
 * Setup (§07): the scenario's parameters by group. Live parameters apply at once. Restart (↻) parameters are staged
 * with an amber outline until the pending bar's Apply (Ctrl ⏎); Esc reverts them.
 */
export function SetupPanel<P extends object>({ definition, scenario, params, onLive, onApply, onReset, children }: SetupPanelProps<P>) {
  // The draft is mirrored in a ref, updated synchronously, so a Ctrl ⏎ that also commits a field's typed text applies
  // that new value (the field commits first, in the same event, before React re-renders).
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const draftRef = useRef(draft);
  const stage = (key: string, value: unknown) => { draftRef.current = { ...draftRef.current, [key]: value }; setDraft(draftRef.current); };
  const revert = () => { draftRef.current = {}; setDraft({}); };
  const pendingOf = (staged: Record<string, unknown>) => Object.entries(staged).filter(([key, value]) => differs(value, getPath(params, key)));
  const specs = definition.params.filter(spec => appliesTo(spec, scenario));
  const pending = pendingOf(draft);
  const apply = () => { const changes = pendingOf(draftRef.current); if (changes.length) onApply(Object.fromEntries(changes)); revert(); };

  /** Ctrl ⏎ applies and Esc reverts while focus is inside the panel. */
  const onKeyDown = (event: KeyboardEvent) => {
    // An input method editor is composing: its Enter commits the composition and its Escape cancels it, not the edits.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { if (pendingOf(draftRef.current).length) { event.preventDefault(); apply(); } }
    else if (event.key === 'Escape' && !event.defaultPrevented && pendingOf(draftRef.current).length) revert();
  };

  return (
    <div className="setup-panel" onKeyDown={onKeyDown}>
      {grouped(specs).map(([group, items], i) => (
        <section key={group} className="inspector-group" aria-label={group}>
          <header className="inspector-group-head"><h3>{group}</h3>{i === 0 && onReset && <button type="button" className="inspector-link" onClick={() => { revert(); onReset(); }}>Reset to scenario</button>}</header>
          {items.map(spec => {
            const current = getPath(params, spec.key), staged = spec.key in draft ? draft[spec.key] : current;
            return <Control key={spec.key} spec={spec} value={staged} dirty={spec.apply === 'restart' && differs(staged, current)}
              onChange={value => (spec.apply === 'live' ? onLive(spec.key, value) : stage(spec.key, value))}/>;
          })}
        </section>
      ))}
      {!specs.length && <p className="inspector-empty">This scenario has no parameters.</p>}
      {children}
      {pending.length > 0 && <PendingBar count={pending.length} onApply={apply} onRevert={revert}/>}
    </div>
  );
}

/** The pending bar (§05 G): shown only while a ↻ parameter differs from the running configuration. */
export function PendingBar({ count, onApply, onRevert }: { count: number; onApply(): void; onRevert(): void }) {
  return (
    <div className="pending-bar" role="status">
      <span>{count} {count === 1 ? 'change needs' : 'changes need'} restart</span>
      <button type="button" className="pending-revert" onClick={onRevert}>Revert</button>
      <button type="button" className="pending-apply" data-testid="params-apply" onClick={onApply}>Apply ⏎</button>
    </div>
  );
}

/** Props for ViewPanel. */
export interface ViewPanelProps<V extends object> {
  definition: ExperimentDefinition<object, V>;
  scenario: string;
  view: V;
  onView(key: string, value: unknown): void;
  onReset?(): void;
}

const LAYER_GROUPS: LayerSpec['group'][] = ['Medium', 'Fields', 'Guides', 'Clipping'];

/** View (§07): live display controls, then the scenario's layers grouped, with layer-bound controls nested. */
export function ViewPanel<V extends object>({ definition, scenario, view, onView, onReset }: ViewPanelProps<V>) {
  const controls = (definition.viewControls ?? []).filter(spec => appliesTo(spec, scenario));
  const layers = definition.layers.filter(layer => appliesTo(layer, scenario));
  const nested = (layer: string) => controls.filter(c => c.layer === layer).map(spec => <Control key={spec.key} spec={spec} value={getPath(view, spec.key)} onChange={v => onView(spec.key, v)}/>);
  const groups: LayerGroup[] = LAYER_GROUPS.map(group => ({
    title: group,
    layers: layers.filter(l => l.group === group).map(l => {
      const control = nested(l.key);
      return { key: l.key, label: l.label, info: l.info ? <InfoTip label={l.label}>{l.info}</InfoTip> : undefined, control: control.length ? <>{control}</> : undefined };
    }),
  })).filter(g => g.layers.length);
  const visible = Object.fromEntries(layers.map(l => [l.key, Boolean(getPath(view, l.key))]));
  return (
    <div className="view-panel">
      {grouped(controls.filter(c => !c.layer)).map(([group, items]) => (
        <section key={group} className="inspector-group" aria-label={group}>
          <header className="inspector-group-head"><h3>{group}</h3></header>
          {items.map(spec => <Control key={spec.key} spec={spec} value={getPath(view, spec.key)} onChange={v => onView(spec.key, v)}/>)}
        </section>
      ))}
      {groups.length > 0 && <LayerList groups={groups} visible={visible} onReset={onReset}
        onChange={next => { for (const [key, on] of Object.entries(next)) if (on !== visible[key]) onView(key, on); }}/>}
    </div>
  );
}
