import { useCallback, useEffect, useRef, useState } from 'react';
import type { Checkpoint, Diagnostics } from '../model/types';
import type { CompareCommand, CompareReply } from './compareWorker';

/** B's state for Medium: the pinned checkpoint, B's diagnostics at A's latest tick, and B's history by tick. */
export interface MediumB { pinned: Checkpoint; diagnostics: Diagnostics | null; stepMs: number; error?: string }

/** At most this many B samples are kept for the plots, matching A's rolling diagnostics window. */
const HISTORY = 480;

/**
 * Medium's B (plan §11 A/B comparison): a headless second worker that restores a pinned checkpoint and steps in lock-step
 * with A's tick. Clearing B stops its worker.
 */
export function useMediumCompare() {
  const worker = useRef<Worker | null>(null), history = useRef(new Map<number, Diagnostics>());
  const [b, setB] = useState<MediumB | null>(null);
  const stop = useCallback(() => { worker.current?.terminate(); worker.current = null; }, []);
  const pin = useCallback((checkpoint: Checkpoint) => {
    stop(); history.current.clear();
    const w = new Worker(new URL('./compareWorker.ts', import.meta.url), { type: 'module' }); worker.current = w;
    w.onmessage = (event: MessageEvent<CompareReply>) => {
      if (worker.current !== w) return;
      const reply = event.data;
      if (reply.type === 'error') { setB(old => old && { ...old, error: reply.message }); return; }
      if (reply.diagnostics) { history.current.set(reply.tick, reply.diagnostics); if (history.current.size > HISTORY) history.current.delete(history.current.keys().next().value!); }
      setB(old => old && { ...old, diagnostics: reply.diagnostics, stepMs: reply.stepMs });
    };
    w.postMessage({ type: 'pin', checkpoint } satisfies CompareCommand);
    setB({ pinned: checkpoint, diagnostics: null, stepMs: 0 });
  }, [stop]);
  const clear = useCallback(() => { stop(); history.current.clear(); setB(null); }, [stop]);
  const advance = useCallback((tick: number) => { worker.current?.postMessage({ type: 'advance', tick } satisfies CompareCommand); }, []);
  useEffect(() => stop, [stop]);
  return { b, pin, clear, advance, history };
}
