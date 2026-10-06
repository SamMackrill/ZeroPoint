// Shareable URL state (plan §11 "Shareable URL state", roadmap P6): the visible lab's experiment, scenario and the
// non-default parts of its state, as a hash route the static host can serve:
//   #/electron/spin?spin=-1&axis=x&cam=shell&split=section&t=691&sel=2231&L=+radius,-faraday
// Values are validated against the experiment's definition on the way in; anything unknown or out of range is dropped.
import { useEffect, useState } from 'react';
import type { Action } from './actions';
import { appliesTo, getPath, scenarioState, type ControlSpec, type ExperimentDefinition } from './definition';

/** A decoded route. Values are still strings; `resolveUrl` validates them for one experiment. */
export interface UrlRoute {
  experiment: string;
  scenario?: string;
  /** Parameter and view-control values by dotted key. */
  values: Record<string, string>;
  /** Layer visibility changes from the scenario's default view. */
  layers: Record<string, boolean>;
  camera?: string;
  split?: string;
  tick?: number;
  /** Entries the decoder could not read (a negative tick, a malformed layer), listed with the dropped settings. */
  rejected?: string[];
  /** The selected item's stable index (Electron's sample, Light's pair); each lab checks its range. */
  selection?: number;
}

/** The validated changes a lab applies on top of a scenario's starting state. */
export interface UrlOverrides {
  params: Record<string, unknown>;
  view: Record<string, unknown>;
  camera?: string;
  split?: string;
  tick?: number;
  selection?: number;
}

const RESERVED = new Set(['cam', 'split', 't', 'sel', 'L']);

/** Format a value for the URL: numbers without float noise, booleans as 1/0. */
const format = (value: unknown) => (typeof value === 'boolean' ? (value ? '1' : '0') : typeof value === 'number' ? String(Number(value.toPrecision(12))) : String(value));

/** Encode a route as a hash. Keys are sorted so equal states give equal URLs. */
export function encodeUrl(route: UrlRoute): string {
  const query = new URLSearchParams();
  for (const key of Object.keys(route.values).sort()) query.set(key, route.values[key]);
  if (route.camera) query.set('cam', route.camera);
  if (route.split) query.set('split', route.split);
  if (route.tick) query.set('t', String(route.tick));
  if (route.selection !== undefined) query.set('sel', String(route.selection));
  const layers = Object.keys(route.layers).sort().map(k => `${route.layers[k] ? '+' : '-'}${k}`);
  if (layers.length) query.set('L', layers.join(','));
  const search = query.toString().replace(/%2C/g, ',').replace(/%2B/g, '+');
  return `#/${route.experiment}${route.scenario ? `/${route.scenario}` : ''}${search ? `?${search}` : ''}`;
}

/** Decode a hash (#/experiment/scenario?…) into a route, or null when it is not one. */
export function decodeUrl(hash: string): UrlRoute | null {
  const match = /^#\/([\w-]+)(?:\/([\w-]+))?(?:\?(.*))?$/.exec(hash);
  if (!match) return null;
  const query = new URLSearchParams((match[3] ?? '').replace(/\+(?=[\w.-])/g, '%2B'));
  const route: UrlRoute = { experiment: match[1], scenario: match[2], values: {}, layers: {} }, rejected: string[] = [];
  for (const [key, value] of query) {
    if (key === 'cam') route.camera = value;
    else if (key === 'split') route.split = value;
    else if (key === 't') { const tick = Number(value); if (value.trim() !== '' && Number.isInteger(tick) && tick >= 0) route.tick = tick; else rejected.push(`t ${value}`); }
    else if (key === 'sel') { const index = Number(value); if (value.trim() !== '' && Number.isInteger(index) && index >= 0) route.selection = index; else rejected.push(`sel ${value}`); }
    else if (key === 'L') for (const item of value.split(',')) { if (/^[+-][\w.]+$/.test(item)) route.layers[item.slice(1)] = item[0] === '+'; else rejected.push(`layer ${item}`); }
    else if (!RESERVED.has(key)) route.values[key] = value;
  }
  if (rejected.length) route.rejected = rejected;
  return route;
}

/** The route for a lab's current state: only what differs from the scenario's starting state. */
export function routeFor(definition: ExperimentDefinition, scenario: string, params: object, view: object, extra: Pick<UrlRoute, 'camera' | 'split' | 'tick' | 'selection'> = {}): UrlRoute {
  const start = scenarioState(definition, scenario), values: Record<string, string> = {}, layers: Record<string, boolean> = {};
  const differs = (a: unknown, b: unknown) => format(a) !== format(b);
  for (const spec of definition.params) if (appliesTo(spec, scenario) && differs(getPath(params, spec.key), getPath(start.params, spec.key))) values[spec.key] = format(getPath(params, spec.key));
  for (const spec of definition.viewControls ?? []) if (appliesTo(spec, scenario) && differs(getPath(view, spec.key), getPath(start.view, spec.key))) values[spec.key] = format(getPath(view, spec.key));
  for (const layer of definition.layers) if (appliesTo(layer, scenario) && !!getPath(view, layer.key) !== !!getPath(start.view, layer.key)) layers[layer.key] = !!getPath(view, layer.key);
  return { experiment: definition.id, scenario: definition.scenarios.length > 1 ? scenario : undefined, values, layers, ...extra };
}

/** Parse one value against its control, or undefined when it is not valid there. */
function parse(spec: ControlSpec, raw: string): unknown {
  if (spec.kind === 'range') {
    if (raw.trim() === '') return undefined; // Number('') is 0, which would pass as a value
    const value = Number(raw);
    if (!Number.isFinite(value) || value < spec.min || value > spec.max || (spec.integer && !Number.isInteger(value))) return undefined;
    return value;
  }
  return spec.options.find(o => format(o.value) === raw)?.value;
}

/**
 * Validate a route for one experiment: the scenario must exist; each value must name one of the scenario's controls and
 * lie within it; layers and the camera must apply. Returns the overrides to apply and the keys that were dropped.
 */
export function resolveUrl(definition: ExperimentDefinition, route: UrlRoute): { scenario: string; overrides: UrlOverrides; dropped: string[] } {
  const dropped: string[] = [...(route.rejected ?? [])];
  const scenario = route.scenario && definition.scenarios.some(s => s.id === route.scenario) ? route.scenario : definition.scenarios[0].id;
  if (route.scenario && route.scenario !== scenario) dropped.push(`scenario ${route.scenario}`);
  const overrides: UrlOverrides = { params: {}, view: {} };
  for (const [key, raw] of Object.entries(route.values)) {
    const param = definition.params.find(s => s.key === key && appliesTo(s, scenario)), control = (definition.viewControls ?? []).find(s => s.key === key && appliesTo(s, scenario));
    const spec = param ?? control, value = spec && parse(spec, raw);
    if (value === undefined) { dropped.push(key); continue; }
    (param ? overrides.params : overrides.view)[key] = value;
  }
  for (const [key, on] of Object.entries(route.layers)) {
    if (definition.layers.some(l => l.key === key && appliesTo(l, scenario))) overrides.view[key] = on; else dropped.push(`layer ${key}`);
  }
  if (route.camera) { if (definition.cameras.some(c => c.id === route.camera && appliesTo(c, scenario))) overrides.camera = route.camera; else dropped.push(`camera ${route.camera}`); }
  if (route.split) {
    const panes = (definition.panes ?? []).filter(p => appliesTo(p, scenario));
    if (panes.some(p => p.id === route.split) || (route.split === 'off' && panes.length)) overrides.split = route.split; else dropped.push(`split ${route.split}`);
  }
  if (route.tick) overrides.tick = route.tick;
  if (route.selection !== undefined) overrides.selection = route.selection;
  return { scenario, overrides, dropped };
}

/** A lab's request to start a scenario: from the rail or the palette, or from a link with its validated overrides. */
export interface ScenarioRequest { id: string; at: number; url?: UrlOverrides; dropped?: readonly string[] }

/** The lab and request a link asks for, or null when the hash is not a route to a known experiment. */
export function requestFromHash(hash: string, definitions: readonly ExperimentDefinition[]): { experiment: string; request: ScenarioRequest } | null {
  const route = decodeUrl(hash), definition = route && definitions.find(d => d.id === route.experiment);
  if (!route || !definition) return null;
  const { scenario, overrides, dropped } = resolveUrl(definition, route);
  return { experiment: definition.id, request: { id: scenario, at: performance.now(), url: overrides, dropped } };
}

/** The split view as a URL value: the open pane's id, or off. */
export const splitValue = (open: boolean, pane: string) => (open ? pane : 'off');

/**
 * Keep the address bar's hash in step with the visible lab: debounced, through history.replaceState (no new history
 * entries, no hashchange), and never while it runs, when only the tick moves.
 */
export function useUrlWriter(active: boolean, hold: boolean, hash: string) {
  useEffect(() => {
    if (!active || hold) return;
    // A link arriving meanwhile (a hashchange, or the address bar edited) wins: never overwrite it with the old state.
    const seen = location.hash;
    const timer = setTimeout(() => { if (location.hash === seen && location.hash !== hash) history.replaceState(history.state, '', hash); }, 300);
    const onHash = () => clearTimeout(timer);
    window.addEventListener('hashchange', onHash);
    return () => { clearTimeout(timer); window.removeEventListener('hashchange', onHash); };
  }, [active, hold, hash]);
}

/** A link waiting for its runtime: the parameters it configured, and the tick to seek to once they are in effect. */
export interface PendingLink { params: object; tick?: number }

/** Whether every value in `want` equals the one at the same path in `have` (nested objects compared the same way). */
export function sameValues(want: object, have: object): boolean {
  return Object.entries(want).every(([key, value]) => {
    const other = (have as Record<string, unknown>)[key];
    return value && typeof value === 'object' ? !!other && typeof other === 'object' && sameValues(value, other) : Object.is(value, other);
  });
}

/**
 * After a link restarts a runtime with its parameters, wait until the runtime reports them, then seek to the link's tick
 * and clear the pending link. Returns whether the URL writer should hold, so the link isn't overwritten meanwhile.
 * The hold lasts at most 3 s; a slow worker still gets its seek when its parameters arrive, for up to 30 s.
 */
export function useLinkSeek(pending: PendingLink | null, done: () => void, state: { parameters: object } | null, seek: (tick: number) => void): boolean {
  const [holding, setHolding] = useState(false);
  useEffect(() => {
    if (!pending || !state || !sameValues(pending.params, state.parameters)) return;
    if (pending.tick) seek(pending.tick);
    done();
  }, [pending, state, done, seek]);
  useEffect(() => {
    if (!pending) { setHolding(false); return; }
    // A runtime that normalizes a value it reports back would never match: release the URL writer after 3 s, and
    // forget the seek after 30 s so it can't fire much later on a coincidental match.
    setHolding(true);
    const release = setTimeout(() => setHolding(false), 3000), expire = setTimeout(done, 30_000);
    return () => { clearTimeout(release); clearTimeout(expire); };
  }, [pending, done]);
  return !!pending && holding;
}

/**
 * Copy a link to the lab's current state (Ctrl Shift C): write the hash at once, without waiting for the debounced
 * writer, then copy the address; where the clipboard is refused, show the link to copy by hand.
 */
export async function copyLink(hash: string, notify: (text: string) => void) {
  history.replaceState(history.state, '', hash);
  try { await navigator.clipboard.writeText(location.href); notify('Link copied. It opens this lab in its current state.'); }
  catch { notify(`Copy this link: ${location.href}`); }
}

/** The Copy link action, for each lab's registry. */
export const copyLinkAction = (hash: string, notify: (text: string) => void): Action => ({ id: 'files.link', label: 'Copy link to this state', group: 'Files', keys: ['Mod+Shift+c'], run: () => { void copyLink(hash, notify); } });
