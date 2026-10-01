// The experiments the shell offers, in rail order.
import { casimirDefinition } from './casimir/definition';
import { electronDefinition } from './electron/definition';
import { lightDefinition } from './light/definition';
import { mediumDefinition } from './medium/definition';
import { vanDerWaalsDefinition } from './van-der-waals/definition';

export const EXPERIMENTS = [mediumDefinition, lightDefinition, electronDefinition, casimirDefinition, vanDerWaalsDefinition] as const;

export { casimirDefinition, electronDefinition, lightDefinition, mediumDefinition, vanDerWaalsDefinition };
export type { MediumParams } from './medium/definition';
