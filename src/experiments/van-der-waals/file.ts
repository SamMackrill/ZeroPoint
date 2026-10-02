// The van der Waals experiment file (zeropoint-vdw, version 1): the stage, its live parameters, the cavity-modes layer
// and the dipole-clock tick. Parsing validates every field against the definition's ranges.
import { VDW_LOOP_TICKS } from '../../workbench/main-thread-models';
import { vanDerWaalsDefinition, type VdwParams, type VdwView } from './definition';

/** A saved van der Waals experiment. */
export interface VdwFile { format: 'zeropoint-vdw'; version: 1; savedAt: string; scenario: string; params: VdwParams; view: VdwView; tick: number }

/** Build the file for the current stage. */
export function vdwFile(scenario: string, params: VdwParams, view: VdwView, tick: number): VdwFile {
  return { format: 'zeropoint-vdw', version: 1, savedAt: new Date().toISOString(), scenario, params: { ...params }, view: { ...view }, tick };
}

/** Parse and validate a van der Waals file; throws a readable error for anything out of range. */
export function parseVdwFile(text: string): Pick<VdwFile, 'scenario' | 'params' | 'view' | 'tick'> {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('This is not a JSON file.'); }
  const file = data as Partial<VdwFile>;
  if (!file || typeof file !== 'object' || file.format !== 'zeropoint-vdw') throw new Error('This is not a van der Waals experiment file.');
  if (file.version !== 1) throw new Error(`Unsupported van der Waals file version ${String(file.version)}.`);
  if (!vanDerWaalsDefinition.scenarios.some(s => s.id === file.scenario)) throw new Error(`Unknown stage "${String(file.scenario)}".`);
  const params = { ...vanDerWaalsDefinition.defaultParams } as Record<string, number>;
  for (const spec of vanDerWaalsDefinition.params) {
    if (spec.kind !== 'range') continue;
    const value = (file.params as Record<string, unknown> | undefined)?.[spec.key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < spec.min || value > spec.max) throw new Error(`${spec.label} must be a number from ${spec.min} to ${spec.max}.`);
    params[spec.key] = value;
  }
  if (typeof file.view?.modes !== 'boolean') throw new Error('The cavity-modes layer setting is missing.');
  if (!Number.isInteger(file.tick) || (file.tick as number) < 0 || (file.tick as number) >= VDW_LOOP_TICKS) throw new Error(`The dipole clock tick must be an integer from 0 to ${VDW_LOOP_TICKS - 1}.`);
  return { scenario: file.scenario as string, params: params as unknown as VdwParams, view: { modes: file.view.modes }, tick: file.tick as number };
}
