import { DEFAULT_SLITS, SLIT_DT, SLIT_END_TICK, SLIT_OFFSET_RANGE, SLIT_WIDTH_RANGE, slitEvents, validateSlitParameters, type SlitParameters } from '../../double-slit/model';
import { SPEEDS } from '../../workbench/runtime';
import type { ExperimentDefinition } from '../../workbench/definition';

/** The double slit's scene layers. */
export interface SlitView { zeptons: boolean; fields: boolean; routes: boolean; reach: boolean; path: boolean }

/** The scenarios with a wall, where the slit geometry applies. */
const WALLED = ['slits', 'light-speed'] as const;

/**
 * The double-slit laboratory (The Zero-Point Universe ch. 19, Fig. 19-3): a photon from A to B in 8 τ, with two slits
 * in the way, nothing in the way, or its fields held to light speed. The scenario sets the wall and the field speed;
 * the slit geometry is live, because the scene is a function of the parameters and the tick alone.
 */
export const doubleSlitDefinition: ExperimentDefinition<SlitParameters, SlitView> = {
  id: 'double-slit',
  title: 'Double slit',
  scenarios: [
    { id: 'slits', title: 'Two slits', description: 'The field passes both slits', params: { wall: 'slits', fields: 'fast' } },
    { id: 'open', title: 'Open path', description: 'A to B with nothing in the way', params: { wall: 'open', fields: 'fast' } },
    { id: 'light-speed', title: 'Fields at light speed', description: 'Nothing reaches the slits', params: { wall: 'slits', fields: 'light' }, view: { reach: true } },
  ],
  defaultParams: DEFAULT_SLITS,
  defaultView: { zeptons: true, fields: true, routes: true, reach: false, path: true },
  params: [
    { kind: 'range', key: 'slitOffset', label: 'Slit distance from path', group: 'Slits', apply: 'live', min: SLIT_OFFSET_RANGE[0], max: SLIT_OFFSET_RANGE[1], step: 0.25, unit: 'λ', scenarios: WALLED, info: 'From the straight path to the centre of each slit. The slits are equidistant from the path, as Fleming sets them.' },
    { kind: 'range', key: 'slitWidth', label: 'Slit width', group: 'Slits', apply: 'live', min: SLIT_WIDTH_RANGE[0], max: SLIT_WIDTH_RANGE[1], step: 0.25, unit: 'λ', scenarios: WALLED },
  ],
  layers: [
    { key: 'zeptons', label: 'Surrounding zeptons', group: 'Medium', info: 'Zeptons around the path turn to follow the central pair where its field reaches. The turn is magnified so the far field shows.' },
    { key: 'fields', label: 'E / B of the active pair', group: 'Fields', info: 'E alternates left and right in the page; B points in and out of it.' },
    { key: 'routes', label: 'Field routes through the slits', group: 'Guides', scenarios: ['slits'], info: 'The shortest way from the active pair through each slit to B.' },
    { key: 'reach', label: 'Reach at light speed', group: 'Guides', info: 'Half a wavelength to either side of the path: as far as a field moving at c spreads before its pair is gone.' },
    { key: 'path', label: 'Straight path and pair centres', group: 'Guides' },
  ],
  panes: [{ id: 'fig-19-3' }],
  cameras: [],
  speeds: SPEEDS,
  validate: validateSlitParameters,
  timeline: (_scenario, params) => ({ kind: 'bounded', dt: SLIT_DT, end: SLIT_END_TICK, events: slitEvents(params), next: 'event' }),
};
