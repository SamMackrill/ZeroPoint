import { DEFAULT_LIGHT, DEFAULT_LIGHT_VIEW, hopTicks, LIGHT_DT, LIGHT_END_TICK, type LightParameters, type LightView } from '../../light/model';
import { SPEEDS } from '../../workbench/runtime';
import type { ExperimentDefinition, TimelineEvent } from '../../workbench/definition';

/** One length unit L is 250 nm, so wavelengths are shown in nm. */
const NM_PER_L = 250;

/** The ticks at which each later pair is induced (pair 1 starts the sequence at tick 0), one hop apart, before the end. */
export function inductionEvents(params: LightParameters): TimelineEvent[] {
  const hop = hopTicks(params), events: TimelineEvent[] = [];
  for (let tick = hop, n = 2; tick < LIGHT_END_TICK; tick += hop, n++) events.push({ tick, label: `Pair ${n} induced` });
  return events;
}

/** The light induction laboratory: a bounded 0–12 τ sequence in which every parameter restarts the sequence. */
export const lightDefinition: ExperimentDefinition<LightParameters, LightView> = {
  id: 'light',
  title: 'Light through the ZPF',
  scenarios: [{ id: 'induction', title: 'Induction sequence', description: 'A wave induces pair after pair as it travels' }],
  defaultParams: DEFAULT_LIGHT,
  defaultView: DEFAULT_LIGHT_VIEW,
  params: [
    { kind: 'range', key: 'wavelength', label: 'Wavelength', group: 'Wave', apply: 'restart', min: 1, max: 4, step: 0.1, display: { unit: 'nm', toDisplay: v => v * NM_PER_L, fromDisplay: v => v / NM_PER_L } },
    { kind: 'range', key: 'polarization', label: 'Polarization', group: 'Wave', apply: 'restart', min: 0, max: 180, step: 5, unit: '°' },
    { kind: 'range', key: 'phase', label: 'Initial phase', group: 'Wave', apply: 'restart', min: 0, max: 360, step: 15, unit: '°' },
    { kind: 'choice', key: 'direction', label: 'Direction', group: 'Wave', apply: 'restart', options: [{ value: 1, label: '+X' }, { value: -1, label: '−X' }] },
    { kind: 'range', key: 'offset', label: 'Launch offset', group: 'Wave', apply: 'restart', min: -2, max: 2, step: 0.1, unit: 'L' },
    { kind: 'range', key: 'probe', label: 'Probe position', group: 'Probe', apply: 'restart', min: -5, max: 5, step: 0.1, unit: 'L' },
  ],
  layers: [
    { key: 'background', label: 'Background pairs', group: 'Medium' },
    { key: 'pairs', label: 'Induced pair', group: 'Medium' },
    { key: 'response', label: 'Dipole response', group: 'Medium' },
    { key: 'fields', label: 'E / B wave', group: 'Fields' },
    { key: 'envelope', label: 'Energy envelope', group: 'Fields' },
    { key: 'centres', label: 'Fixed pair centres', group: 'Guides' },
  ],
  cameras: [{ id: 'orbit', label: 'Orbit' }, { id: 'side', label: 'Side' }, { id: 'pair', label: 'Pair close-up' }],
  speeds: SPEEDS,
  timeline: (_scenario, params) => ({ kind: 'bounded', dt: LIGHT_DT, end: LIGHT_END_TICK, events: inductionEvents(params), next: 'event' }),
};
