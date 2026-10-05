// Medium's B for A/B comparison (plan §11): a headless second simulation with no renderer and no snapshots. It holds
// the pinned checkpoint and steps to whatever tick A shows, replying with B's diagnostics only.
import { Medium } from '../model/Medium';
import type { Checkpoint, Diagnostics } from '../model/types';
import { validateCheckpoint } from '../persistence/experiment';

/** Commands: pin a checkpoint as B, or advance B to A's tick. */
export type CompareCommand = { type: 'pin'; checkpoint: Checkpoint } | { type: 'advance'; tick: number };
/** B's diagnostics at A's tick (null when A is before B's pinned tick), with B's mean step time. */
export type CompareReply = { type: 'diagnostics'; tick: number; diagnostics: Diagnostics | null; stepMs: number } | { type: 'error'; message: string };

const ctx = self as unknown as { postMessage: (reply: CompareReply) => void; onmessage: (event: MessageEvent<CompareCommand>) => void };
let pinned: Checkpoint | undefined, model: Medium | undefined, stepMs = 0;

ctx.onmessage = ({ data }) => {
  try {
    if (data.type === 'pin') { pinned = validateCheckpoint(data.checkpoint); model = Medium.restore(pinned); }
    if (!pinned || !model) return;
    const target = data.type === 'advance' ? data.tick : model.diagnostics().tick;
    // A went back (Reset, a ◆ restore, a scrub): B re-runs from its pinned checkpoint, which is deterministic.
    if (target < model.diagnostics().tick) model = Medium.restore(pinned);
    const steps = target - model.diagnostics().tick;
    if (steps > 0) { const started = performance.now(); model.step(steps); stepMs = (performance.now() - started) / steps; }
    ctx.postMessage({ type: 'diagnostics', tick: target, diagnostics: steps >= 0 ? model.diagnostics() : null, stepMs });
  } catch (error) { ctx.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
};
