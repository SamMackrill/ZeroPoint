// ExperimentDefinition (docs/ui-redesign-plan.html §14): the shell renders any experiment described by one of these.
// A definition is data — scenarios, parameters, layers, cameras and the timeline — so the shell needs no per-lab code
// for its chrome. Readouts, panes, selection, files and About content join as each lab migrates (UI 07–11).

/** How a parameter change takes effect: immediately, or on restart (↻, staged in the pending bar). */
export type Apply = 'live' | 'restart';

/** A shown value that differs from the model's (Light's wavelength is stored in L and shown in nm). */
export interface DisplayScale {
  unit: string;
  toDisplay(value: number): number;
  fromDisplay(value: number): number;
}

/** Fields shared by every parameter and view control. */
interface ControlBase {
  key: string;
  label: string;
  /** Inspector group heading (e.g. "Wave", "Probe", "Shell display"). */
  group: string;
  apply: Apply;
  /** One or two sentences for the InfoTip. */
  info?: string;
  /** Scenario ids this control applies to; all scenarios when omitted (rule 3: show only what applies). */
  scenarios?: readonly string[];
  /** For a view control: the layer it belongs to, shown indented under that layer while it is visible (Slice Z). */
  layer?: string;
}

/** A continuous parameter: a ParamRow. */
export interface RangeSpec extends ControlBase {
  kind: 'range';
  min: number;
  max: number;
  step: number;
  unit?: string;
  display?: DisplayScale;
  /** Quick-value chips under the row (van der Waals gap presets). */
  quick?: readonly number[];
  /** Integer identifier with a dice button (Medium's seed). */
  integer?: boolean;
}

/** Two to five exclusive choices: a Segmented control. */
export interface ChoiceSpec extends ControlBase {
  kind: 'choice';
  options: readonly { value: string | number | boolean; label: string; title?: string }[];
}

/** A Setup control. Keys are dotted paths into the experiment's parameters (or view, for view controls). */
export type ControlSpec = RangeSpec | ChoiceSpec;

/** A scene layer: an eye toggle in View, keyed by a boolean in the experiment's view settings. */
export interface LayerSpec {
  key: string;
  label: string;
  /** Medium, Fields, Guides or Clipping. */
  group: 'Medium' | 'Fields' | 'Guides' | 'Clipping';
  info?: string;
  scenarios?: readonly string[];
}

/** A viewport camera preset, numbered 1–4 by order. */
export interface CameraSpec {
  id: string;
  label: string;
  scenarios?: readonly string[];
}

/** A named point on the timeline: a tick on the scrubber and a row in the Events tab. */
export interface TimelineEvent {
  tick: number;
  label: string;
  /** Stable id: the event's tick on the scrubber carries the test id event-<id>. */
  id?: string;
}

/** The four timeline kinds (§07): bounded, open-ended, looping, or none for a static study. */
export interface TimelineSpec {
  kind: 'bounded' | 'open' | 'loop' | 'static';
  /** Model time per tick, in τ. */
  dt: number;
  /** Last tick of a bounded timeline, or the loop length. */
  end?: number;
  events: readonly TimelineEvent[];
  /** What the timeline bar's Next button does (§07 table): the next event, or a jump of one τ. */
  next?: 'event' | 'jump';
}

/** A scenario: an entry in the rail, with its starting parameters and view. */
export interface Scenario {
  id: string;
  title: string;
  description: string;
  /** Overrides of the experiment's default parameters, as dotted paths. */
  params?: Readonly<Record<string, unknown>>;
  view?: Readonly<Record<string, unknown>>;
  /** A static study: no timeline, a 2D view in the viewport slot. */
  static?: boolean;
}

/** Everything the shell's chrome needs to present one experiment. P are its parameters and V its view settings. */
export interface ExperimentDefinition<P extends object = object, V extends object = object> {
  id: string;
  title: string;
  scenarios: readonly Scenario[];
  defaultParams: P;
  defaultView: V;
  params: readonly ControlSpec[];
  /** Live display controls stored in the view (Electron's shell display, Medium's representation). */
  viewControls?: readonly ControlSpec[];
  layers: readonly LayerSpec[];
  cameras: readonly CameraSpec[];
  /** The split view's linked panes (§07), by id; a link's split names one of these, or off. */
  panes?: readonly { id: string; scenarios?: readonly string[] }[];
  speeds: readonly number[];
  timeline(scenario: string, params: P): TimelineSpec;
  /** The lab's own parameter check, the one its files and worker use; throws on parameters it rejects. */
  validate?(params: P): unknown;
}

/** Read a dotted path ("spinDisplay.count") from an object. */
export function getPath(source: object, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined), source);
}

/** Return a copy of `target` with dotted-path overrides applied. */
export function withPaths<T extends object>(target: T, overrides: Readonly<Record<string, unknown>> = {}): T {
  const out = structuredClone(target) as Record<string, unknown>;
  for (const [path, value] of Object.entries(overrides)) {
    const keys = path.split('.'), last = keys.pop()!;
    let node = out;
    for (const key of keys) node = (node[key] ??= {}) as Record<string, unknown>;
    node[last] = value;
  }
  return out as T;
}

/** Whether a control, layer or camera applies to a scenario. */
export const appliesTo = (item: { scenarios?: readonly string[] }, scenario: string) => !item.scenarios || item.scenarios.includes(scenario);

/** A scenario's starting parameters and view. */
export function scenarioState<P extends object, V extends object>(definition: ExperimentDefinition<P, V>, scenarioId: string): { params: P; view: V } {
  const scenario = definition.scenarios.find(s => s.id === scenarioId);
  if (!scenario) throw new Error(`${definition.title} has no scenario "${scenarioId}".`);
  return { params: withPaths(definition.defaultParams, scenario.params), view: withPaths(definition.defaultView, scenario.view) };
}

/**
 * Check a definition for mistakes the type system can't see: unknown paths, defaults outside their ranges, duplicate
 * ids, controls scoped to missing scenarios, and timeline events outside the timeline. Returns readable problems.
 */
export function validateDefinition<P extends object, V extends object>(definition: ExperimentDefinition<P, V>): string[] {
  const problems: string[] = [], ids = new Set(definition.scenarios.map(s => s.id));
  const unique = (label: string, values: string[]) => { const seen = new Set<string>(); for (const v of values) { if (seen.has(v)) problems.push(`duplicate ${label} "${v}"`); seen.add(v); } };
  unique('scenario', definition.scenarios.map(s => s.id));
  unique('parameter', definition.params.map(p => p.key));
  unique('layer', definition.layers.map(l => l.key));
  unique('camera', definition.cameras.map(c => c.id));
  const scoped = (what: string, item: { scenarios?: readonly string[] }) => item.scenarios?.filter(id => !ids.has(id)).forEach(id => problems.push(`${what} refers to unknown scenario "${id}"`));
  const checkControl = (spec: ControlSpec, source: object, where: string) => {
    scoped(`${where} "${spec.key}"`, spec);
    for (const scenario of definition.scenarios) {
      if (!appliesTo(spec, scenario.id)) continue;
      const state = scenarioState(definition, scenario.id), value = getPath(where === 'parameter' ? state.params : state.view, spec.key);
      if (value === undefined) { problems.push(`${where} "${spec.key}" is missing in scenario "${scenario.id}"`); continue; }
      if (spec.kind === 'range' && (typeof value !== 'number' || value < spec.min || value > spec.max)) problems.push(`${where} "${spec.key}" = ${String(value)} is outside ${spec.min}–${spec.max} in scenario "${scenario.id}"`);
      if (spec.kind === 'choice' && !spec.options.some(o => o.value === value)) problems.push(`${where} "${spec.key}" = ${String(value)} is not an option in scenario "${scenario.id}"`);
    }
    if (getPath(source, spec.key) === undefined) problems.push(`${where} "${spec.key}" is not in the defaults`);
  };
  for (const spec of definition.params) checkControl(spec, definition.defaultParams, 'parameter');
  if (definition.validate) for (const scenario of definition.scenarios) {
    try { definition.validate(scenarioState(definition, scenario.id).params); } catch (error) { problems.push(`scenario "${scenario.id}" parameters fail the lab's check: ${error instanceof Error ? error.message : String(error)}`); }
  }
  for (const spec of definition.viewControls ?? []) checkControl(spec, definition.defaultView, 'view control');
  for (const layer of definition.layers) {
    scoped(`layer "${layer.key}"`, layer);
    if (typeof getPath(definition.defaultView, layer.key) !== 'boolean') problems.push(`layer "${layer.key}" is not a boolean view setting`);
  }
  for (const camera of definition.cameras) scoped(`camera "${camera.id}"`, camera);
  for (const scenario of definition.scenarios) {
    const timeline = definition.timeline(scenario.id, scenarioState(definition, scenario.id).params);
    if (Boolean(scenario.static) !== (timeline.kind === 'static')) problems.push(`scenario "${scenario.id}" is ${scenario.static ? '' : 'not '}static but its timeline is ${timeline.kind}`);
    for (const event of timeline.events) if (event.tick < 0 || (timeline.end !== undefined && event.tick > timeline.end)) problems.push(`event "${event.label}" at tick ${event.tick} is outside scenario "${scenario.id}"`);
  }
  return problems;
}
