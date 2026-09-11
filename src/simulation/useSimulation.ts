import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_PARAMETERS, SNAPSHOT_STRIDE } from '../model/types';
import type { Checkpoint, Command, Snapshot, WorkerReply } from '../model/types';
/** Manage the medium worker lifecycle, snapshots, and checkpoint requests. */
export function useSimulation() {
  const worker = useRef<Worker | null>(null), sink = useRef<((s: Snapshot) => void) | null>(null), latest = useRef<Snapshot | null>(null);
  const [state, setState] = useState<Snapshot | null>(null), [error, setError] = useState<string | null>(null), [revision, setRevision] = useState(0);
  const saves = useRef<{ resolve: (c: Checkpoint) => void; reject: (e: Error) => void; timeout: ReturnType<typeof setTimeout> }[]>([]);
  const send = useCallback((command: Command) => { worker.current?.postMessage(command); }, []);
  useEffect(() => {
    let disposed = false, lastUI = 0;
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }); worker.current = w;
    const fail = (message: string) => { setError(message); setState(s => s ? { ...s, running: false } : s); for (const p of saves.current.splice(0)) { clearTimeout(p.timeout); p.reject(new Error(message)); } };
    w.onerror = e => fail(`Simulation worker: ${e.message || 'unexpected error'}`);
    w.onmessage = (event: MessageEvent<WorkerReply>) => {
      if (disposed) return; const message = event.data;
      if (message.type === 'error') { fail(message.message); return; }
      if (message.type === 'saved') { const pending = saves.current.shift(); if (pending) { clearTimeout(pending.timeout); pending.resolve(message.checkpoint); } return; }
      const data = new Float32Array(message.buffer, 0, message.count * SNAPSHOT_STRIDE).slice();
      w.postMessage({ type: 'recycle', buffer: message.buffer }, [message.buffer]);
      const snapshot: Snapshot = { ...message, data };
      const previous = latest.current; latest.current = snapshot; sink.current?.(snapshot);
      if (!previous || !message.running || previous.running !== message.running || previous.diagnostics.parameterVersion !== message.diagnostics.parameterVersion || previous.seed !== message.seed || performance.now() - lastUI > 120) { setState(snapshot); lastUI = performance.now(); }
    };
    w.postMessage({ type: 'initialize', seed: 2026, parameters: DEFAULT_PARAMETERS });
    const onVisibility = () => { if (document.hidden) w.postMessage({ type: 'running', value: false }); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { disposed = true; document.removeEventListener('visibilitychange', onVisibility); w.terminate(); worker.current = null; for (const p of saves.current.splice(0)) { clearTimeout(p.timeout); p.reject(new Error('Worker stopped.')); } };
  }, [revision]);
  const checkpoint = useCallback(() => new Promise<Checkpoint>((resolve, reject) => {
    if (!worker.current) { reject(new Error('Worker is not ready.')); return; }
    const request = { resolve, reject, timeout: setTimeout(() => { saves.current = saves.current.filter(p => p !== request); reject(new Error('Saving timed out. Try restarting the worker.')); }, 10000) };
    saves.current.push(request); send({ type: 'save' });
  }), [send]);
  const restart = useCallback(() => { setError(null); latest.current = null; setState(null); setRevision(r => r + 1); }, []);
  return { state, latest, sink, send, error, setError, checkpoint, restart };
}
