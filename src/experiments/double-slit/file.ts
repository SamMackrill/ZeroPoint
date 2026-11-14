// The double-slit experiment file (zeropoint-double-slit, version 1): the scenario, the slit geometry, the layers and the
// tick. Parsing validates every field against the definition; the scenario, not the file, sets the wall and field speed.
// The slit geometry is kept in every scenario, Open path included, because the lab carries it to the next scenario.
import { SLIT_END_TICK, SLIT_MODEL, validateSlitParameters, type SlitParameters } from '../../double-slit/model';
import { scenarioState } from '../../workbench/definition';
import { doubleSlitDefinition, type SlitView } from './definition';

/** A saved double-slit experiment. */
export interface SlitFile { format: 'zeropoint-double-slit'; version: 1; savedAt: string; model: typeof SLIT_MODEL; scenario: string; params: SlitParameters; view: SlitView; tick: number }

/** Build the file for the current scenario and instant. */
export function slitFile(scenario: string, params: SlitParameters, view: SlitView, tick: number): SlitFile {
  return { format: 'zeropoint-double-slit', version: 1, savedAt: new Date().toISOString(), model: SLIT_MODEL, scenario, params: { ...params }, view: { ...view }, tick };
}

/** Parse and validate a double-slit file; throws a readable error for anything missing or out of range. */
export function parseSlitFile(text: string): Pick<SlitFile, 'scenario' | 'params' | 'view' | 'tick'> {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('This is not a JSON file.'); }
  const file = data as Partial<SlitFile>;
  if (!file || typeof file !== 'object' || file.format !== 'zeropoint-double-slit') throw new Error('This is not a double-slit experiment file.');
  if (file.version !== 1 || file.model !== SLIT_MODEL) throw new Error(`Unsupported double-slit file (version ${String(file.version)}, model ${String(file.model)}).`);
  const scenario = doubleSlitDefinition.scenarios.find(s => s.id === file.scenario);
  if (!scenario) throw new Error(`Unknown scenario "${String(file.scenario)}".`);
  const start = scenarioState(doubleSlitDefinition, scenario.id), params = { ...start.params } as unknown as Record<string, unknown>;
  for (const spec of doubleSlitDefinition.params) {
    if (spec.kind !== 'range') continue;
    const value = (file.params as unknown as Record<string, unknown> | undefined)?.[spec.key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < spec.min || value > spec.max) throw new Error(`${spec.label} must be a number from ${spec.min} to ${spec.max}.`);
    params[spec.key] = value;
  }
  const view = { ...start.view };
  for (const key of Object.keys(view) as (keyof SlitView)[]) {
    if (typeof file.view?.[key] !== 'boolean') throw new Error(`The ${key} layer setting is missing.`);
    view[key] = file.view[key];
  }
  if (!Number.isInteger(file.tick) || (file.tick as number) < 0 || (file.tick as number) > SLIT_END_TICK) throw new Error(`The tick must be an integer from 0 to ${SLIT_END_TICK}.`);
  return { scenario: scenario.id, params: validateSlitParameters(params), view, tick: file.tick as number };
}
