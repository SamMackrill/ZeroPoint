import { DEFAULT_ELECTRON, DEFAULT_ELECTRON_VIEW, ELECTRON_DT, ELECTRON_END, type ElectronParameters, type ElectronView } from '../../electron/model';
import { SPEEDS } from '../../workbench/runtime';
import type { ExperimentDefinition, TimelineEvent } from '../../workbench/definition';

/** The three time-based scenarios, which share the electron's physics parameters. */
const LIVE = ['stationary', 'spin', 'moving'] as const;

/**
 * Milestones per scenario, at the ticks the current replay buttons seek to: the electron appears over its first
 * 0.35 τ and the field is fully aligned at 3 τ (tick 360); a moving electron passes the path centre at 24 τ.
 */
export function electronMilestones(scenario: string): TimelineEvent[] {
  if (scenario === 'stationary') return [{ tick: Math.round(0.35 / ELECTRON_DT), label: 'Electron introduced', id: 'introduced' }, { tick: 360, label: 'Fully aligned', id: 'aligned' }];
  if (scenario === 'moving') return [{ tick: 2880, label: 'Path centre', id: 'path-centre' }];
  return [];
}

/**
 * The electron laboratory: three bounded 0–48 τ scenarios (physics parameters restart, shell display is live) and two
 * static studies from ElectronProperties.
 */
export const electronDefinition: ExperimentDefinition<ElectronParameters, ElectronView> = {
  id: 'electron',
  title: 'Electron in the ZPF',
  scenarios: [
    { id: 'stationary', title: 'Stationary electron', description: 'Nearby pairs align first as the electric pattern resolves', params: { mode: 'electric' } },
    { id: 'spin', title: 'Spin in the field', description: 'Neighbouring zeptons turn locally around a stationary core', params: { mode: 'spin' } },
    { id: 'moving', title: 'Moving electron', description: 'Pairs turn locally as the electron passes', params: { mode: 'moving' } },
    { id: 'charge-flux', title: 'Charge & flux', description: 'A Gauss sphere of variable radius', static: true },
    { id: 'radius-limit', title: 'Radius limit', description: 'Effective speed against radius', static: true },
  ],
  defaultParams: DEFAULT_ELECTRON,
  defaultView: DEFAULT_ELECTRON_VIEW,
  params: [
    { kind: 'range', key: 'beta', label: 'Velocity', group: 'Electron', apply: 'restart', min: -0.2, max: 0.2, step: 0.01, unit: 'c', scenarios: ['moving'] },
    { kind: 'choice', key: 'spin', label: 'Spin projection', group: 'Electron', apply: 'restart', scenarios: LIVE, options: [{ value: 1, label: '+½', title: 'spin up' }, { value: -1, label: '−½', title: 'spin down' }] },
    { kind: 'choice', key: 'axis', label: 'Preferred axis', group: 'Electron', apply: 'restart', scenarios: LIVE, options: [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }, { value: 'z', label: 'Z' }] },
    { kind: 'range', key: 'probeX', label: 'Probe X', group: 'Probe', apply: 'restart', min: -5, max: 5, step: 0.1, unit: 'R', scenarios: LIVE },
    { kind: 'range', key: 'probeY', label: 'Probe Y', group: 'Probe', apply: 'restart', min: -4, max: 4, step: 0.1, unit: 'R', scenarios: LIVE },
    { kind: 'range', key: 'probeZ', label: 'Probe Z', group: 'Probe', apply: 'restart', min: -3, max: 3, step: 0.1, unit: 'R', scenarios: LIVE },
  ],
  viewControls: [
    { kind: 'choice', key: 'spinDisplay.count', label: 'Visible shells', group: 'Shell display', apply: 'live', scenarios: ['spin'], options: [1, 2, 3, 4].map(n => ({ value: n, label: String(n) })) },
    { kind: 'choice', key: 'spinDisplay.alternating', label: 'Adjacent shells', group: 'Shell display', apply: 'live', scenarios: ['spin'], options: [{ value: false, label: 'Shared' }, { value: true, label: 'Alternate' }] },
    { kind: 'choice', key: 'spinDisplay.gain', label: 'Turn gain', group: 'Shell display', apply: 'live', scenarios: ['spin'], info: 'Magnifies each local turn for visibility. Display only; does not change the model.', options: [1, 2, 4].map(n => ({ value: n, label: `${n}×` })) },
  ],
  layers: [
    { key: 'dipoles', label: 'Zepton pairs', group: 'Medium', scenarios: LIVE },
    { key: 'shells', label: 'Zepton shells', group: 'Medium', scenarios: ['spin'] },
    { key: 'faraday', label: 'Faraday lines', group: 'Fields', scenarios: LIVE },
    { key: 'electric', label: 'Radial E reference', group: 'Fields', scenarios: LIVE },
    { key: 'magnetic', label: 'Motion B', group: 'Fields', scenarios: LIVE },
    { key: 'intrinsic', label: 'Intrinsic spin B', group: 'Fields', scenarios: LIVE },
    { key: 'rotation', label: 'Local rotation sense', group: 'Guides', scenarios: LIVE },
    { key: 'radius', label: 'Half-Compton radius', group: 'Guides', scenarios: LIVE },
    { key: 'cutaway', label: 'Central slab cutaway', group: 'Clipping', scenarios: LIVE },
  ],
  cameras: [
    { id: 'front', label: 'Front', scenarios: LIVE },
    { id: 'orbit', label: 'Orbit', scenarios: LIVE },
    { id: 'probe', label: 'Local close-up', scenarios: LIVE },
    { id: 'shell', label: 'Shell close-up', scenarios: ['spin'] },
  ],
  speeds: SPEEDS,
  timeline: scenario => scenario === 'charge-flux' || scenario === 'radius-limit'
    ? { kind: 'static', dt: ELECTRON_DT, events: [] }
    : { kind: 'bounded', dt: ELECTRON_DT, end: ELECTRON_END, events: electronMilestones(scenario), next: scenario === 'spin' ? 'jump' : 'event' },
};
