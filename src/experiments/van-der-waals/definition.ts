import { GAP_MAX_NM, GAP_MIN_NM } from '../../van-der-waals/model';
import { VDW_LOOP_TICKS } from '../../workbench/main-thread-models';
import { SPEEDS } from '../../workbench/runtime';
import type { ExperimentDefinition } from '../../workbench/definition';

/** Van der Waals Setup parameters, each shown only in the stage it belongs to. */
export interface VdwParams { polarization: number; distance: number; gap: number; area: number }
/** Van der Waals scene layers. */
export interface VdwView { modes: boolean }

/** The van der Waals laboratory: two static studies around a looping correlated-dipole stage. All parameters are live. */
export const vanDerWaalsDefinition: ExperimentDefinition<VdwParams, VdwView> = {
  id: 'vdw',
  title: 'Van der Waals & vacuum pressure',
  scenarios: [
    { id: 'induced', title: 'Induce a dipole', description: 'A neutral atom can polarize', static: true },
    { id: 'correlated', title: 'Correlate the fluctuations', description: 'From dipoles to attraction' },
    { id: 'pressure', title: 'Reveal the pressure', description: 'A boundary changes the balance', static: true },
  ],
  defaultParams: { polarization: 0.8, distance: 1.4, gap: 200, area: 1 },
  defaultView: { modes: true },
  params: [
    { kind: 'range', key: 'polarization', label: 'Applied field', group: 'Atom', apply: 'live', min: 0, max: 1, step: 0.05, unit: 'E₀', scenarios: ['induced'], info: 'p = αE. E₀ is an arbitrary field scale; α is fixed and the cloud displacement exaggerated.' },
    { kind: 'range', key: 'distance', label: 'Pair separation', group: 'Dipoles', apply: 'live', min: 1, max: 3, step: 0.05, unit: 'r₀', scenarios: ['correlated'], info: 'U(r) = −C₆ / r⁶, a short-range London reference in arbitrary units (E₀ = C₆ / r₀⁶).' },
    { kind: 'range', key: 'gap', label: 'Plate gap', group: 'Plates', apply: 'live', min: GAP_MIN_NM, max: GAP_MAX_NM, step: 10, unit: 'nm', quick: [100, 200, 500, 1000], scenarios: ['pressure'], info: 'P = −π²ℏc / (240d⁴), for ideal perfect conductors at 0 K. Negative means attraction.' },
    { kind: 'range', key: 'area', label: 'Plate area', group: 'Plates', apply: 'live', min: 0.1, max: 10, step: 0.1, unit: 'mm²', scenarios: ['pressure'], info: 'F ≈ P × A. The finite-area force neglects edge effects.' },
  ],
  layers: [{ key: 'modes', label: 'Cavity modes', group: 'Fields', scenarios: ['pressure'], info: 'Example standing waves (λₙ = 2d/n). Display only: not a mode count, and not used in the pressure.' }],
  panes: [{ id: 'fig-3-3', scenarios: ['pressure'] }, { id: 'fig-3-4', scenarios: ['pressure'] }],
  cameras: [],
  speeds: SPEEDS,
  timeline: scenario => scenario === 'correlated' ? { kind: 'loop', dt: 0.05, end: VDW_LOOP_TICKS, events: [] } : { kind: 'static', dt: 0.05, events: [] },
};
