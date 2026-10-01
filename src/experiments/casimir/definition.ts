import { STEP, type ChargePair } from '../../casimir/model';
import { CASIMIR_SPEEDS } from '../../workbench/main-thread-models';
import type { ExperimentDefinition } from '../../workbench/definition';

/** Casimir's Setup parameters: the pairing (set by the scenario) and the initial separation (restart). */
export interface CasimirParams { pair: ChargePair; separation: number }
/** Casimir's scene layers. */
export interface CasimirView { pressure: boolean; interactions: boolean; zeptons: boolean }

/** The extended Casimir laboratory: an open-ended main-thread timeline offering 0.1–2× playback. */
export const casimirDefinition: ExperimentDefinition<CasimirParams, CasimirView> = {
  id: 'casimir',
  title: 'Extended Casimir',
  scenarios: [
    { id: 'electron-electron', title: 'Electron / electron', description: 'Deflection & gap filling · repulsion', params: { pair: 'electron-electron' } },
    { id: 'electron-proton', title: 'Electron / proton', description: 'Aligned contraction · attraction', params: { pair: 'electron-proton' } },
  ],
  defaultParams: { pair: 'electron-electron', separation: 5.6 },
  defaultView: { pressure: true, interactions: true, zeptons: true },
  params: [
    { kind: 'range', key: 'separation', label: 'Initial separation', group: 'Charges', apply: 'restart', min: 4, max: 7, step: 0.2, unit: 'a.u.' },
  ],
  layers: [
    { key: 'zeptons', label: 'Zeptons', group: 'Medium' },
    { key: 'pressure', label: 'Pressure colour', group: 'Fields' },
    { key: 'interactions', label: 'Interaction arrows', group: 'Fields' },
  ],
  cameras: [],
  speeds: CASIMIR_SPEEDS,
  timeline: () => ({ kind: 'open', dt: STEP, events: [], next: 'jump' }),
};
