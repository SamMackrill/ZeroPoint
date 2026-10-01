import { useEffect, useState } from 'react';
import type { RuntimeStatus } from './runtime';

/** The part of a Runtime the hook reads, whatever its state and parameter types. */
export interface StatusSource { status(): RuntimeStatus; subscribe(listener: () => void): () => void }

/** Status fields compared to decide whether a re-render is needed. */
const same = (a: RuntimeStatus, b: RuntimeStatus) => a.running === b.running && a.tick === b.tick && a.time === b.time && a.speed === b.speed && a.finished === b.finished;

/**
 * A runtime's status for the timeline bar, updated from its subscription at most `hz` times a second (plus once when
 * it settles). Per-tick state never reaches shell-level React state: only the component using this hook re-renders,
 * and only at this rate (the UI 01b render budget gates it).
 */
export function useRuntimeStatus(runtime: StatusSource | null, hz = 15): RuntimeStatus | null {
  const [status, setStatus] = useState<RuntimeStatus | null>(() => runtime?.status() ?? null);
  useEffect(() => {
    if (!runtime) { setStatus(null); return; }
    let last = 0, timer: ReturnType<typeof setTimeout> | null = null;
    const publish = () => { timer = null; last = performance.now(); const next = runtime.status(); setStatus(prev => (prev && same(prev, next) ? prev : next)); };
    publish();
    const off = runtime.subscribe(() => {
      if (timer) return;
      const wait = 1000 / hz - (performance.now() - last);
      if (wait <= 0) publish(); else timer = setTimeout(publish, wait);
    });
    return () => { off(); if (timer) clearTimeout(timer); };
  }, [runtime, hz]);
  return status;
}
