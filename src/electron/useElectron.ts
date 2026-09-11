import { useCallback, useEffect, useRef, useState } from 'react';
import type { ElectronCommand, ElectronReply, ElectronSnapshot } from './model';
/** Manage the electron worker and expose its latest state to React. */
export function useElectron(active: boolean) {
  const worker = useRef<Worker | null>(null), latest = useRef<ElectronSnapshot | null>(null);
  const sink = useRef<((s: ElectronSnapshot) => void) | null>(null);
  const [state, setState] = useState<ElectronSnapshot | null>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const send = useCallback((command: ElectronCommand) => worker.current?.postMessage(command), []);
  useEffect(() => {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }); worker.current = w;
    w.onerror = e => { setError(e.message || 'Electron worker stopped.'); setState(s => s ? { ...s, running: false } : s); };
    w.onmessage = ({ data }: MessageEvent<ElectronReply>) => {
      if (data.type === 'error') { setError(data.message); setState(s => s ? { ...s, running: false } : s); return; }
      latest.current = data.state; sink.current?.(data.state); setState(data.state); w.postMessage({ type: 'ack' });
    };
    const visibility = () => { if (document.hidden) w.postMessage({ type: 'run', value: false }); };
    document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('visibilitychange', visibility); w.terminate(); worker.current = null; };
  }, [revision]);
  useEffect(() => { if (!active) send({ type: 'run', value: false }); }, [active, send]);
  const restart = () => { setError(''); setState(null); latest.current = null; setRevision(r => r + 1); };
  return { state, latest, sink, send, error, restart };
}
