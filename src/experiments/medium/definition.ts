import { DEFAULT_PARAMETERS, DEFAULT_VIEW, DT, type Parameters, type ViewSettings } from '../../model/types';
import { SPEEDS } from '../../workbench/runtime';
import type { ExperimentDefinition } from '../../workbench/definition';

/** Medium's Setup parameters: the seed (restart) and the live physical parameters. */
export type MediumParams = Parameters & { seed: number };

/** The Medium lifecycle laboratory: an open-ended timeline, live parameters and a seed that restarts. */
export const mediumDefinition: ExperimentDefinition<MediumParams, ViewSettings> = {
  id: 'medium',
  title: 'Medium lifecycle',
  scenarios: [
    { id: 'balanced', title: 'Balanced medium', description: 'Explore the fluctuation lifecycle' },
    { id: 'sparse', title: 'Sparse fluctuations', description: 'Follow individual dipoles', params: { birthRate: 200, frequency: 0.6, separation: 0.3 } },
    { id: 'dense', title: 'Dense medium', description: 'A closer look at collective activity', params: { birthRate: 6500, frequency: 1, separation: 0.24 } },
    { id: 'slow', title: 'Slow oscillations', description: 'Inspect longer-lived fluctuations', params: { birthRate: 450, frequency: 0.3, separation: 0.4 } },
  ],
  defaultParams: { ...DEFAULT_PARAMETERS, seed: 2026 },
  defaultView: DEFAULT_VIEW,
  params: [
    { kind: 'range', key: 'birthRate', label: 'Creation rate', group: 'Medium', apply: 'live', min: 0, max: 10000, step: 50, unit: '/ τ', info: 'Poisson arrivals into the finite cell.' },
    { kind: 'range', key: 'frequency', label: 'Frequency centre', group: 'Medium', apply: 'live', min: 0.25, max: 3, step: 0.05, unit: 'f₀', info: 'New dipoles sample 0.5–1.5× this value.' },
    { kind: 'range', key: 'separation', label: 'Peak pair separation', group: 'Medium', apply: 'live', min: 0, max: 0.8, step: 0.01, unit: 'L₀', info: 'Lobe-centre distance at midlife. The pair centre stays fixed.' },
    { kind: 'range', key: 'seed', label: 'Random seed', group: 'Run', apply: 'restart', min: 0, max: 4294967295, step: 1, integer: true, info: 'Reproducible initial state. Applied when you reset.' },
  ],
  viewControls: [
    { kind: 'choice', key: 'representation', label: 'Representation', group: 'Display', apply: 'live', options: [{ value: 'dipoles', label: 'Dipoles' }, { value: 'points', label: 'Points' }] },
    { kind: 'range', key: 'sliceZ', label: 'Slice Z', group: 'Display', apply: 'live', min: -4, max: 4, step: 0.1, unit: 'L₀', layer: 'slice' },
  ],
  layers: [
    { key: 'medium', label: 'Dipole medium', group: 'Medium' },
    { key: 'bounds', label: 'Cell boundaries', group: 'Guides' },
    { key: 'slice', label: 'Energy density slice', group: 'Clipping', info: '0.5 L₀ slab · binned energy, not pressure' },
  ],
  panes: [{ id: 'dipole' }],
  cameras: [{ id: 'perspective', label: 'Perspective' }, { id: 'top', label: 'Top' }, { id: 'front', label: 'Front' }],
  speeds: SPEEDS,
  timeline: () => ({ kind: 'open', dt: DT, events: [], next: 'jump' }),
};
