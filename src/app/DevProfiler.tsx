import { Profiler, type ReactNode } from 'react';

declare global { interface Window { __zpRenders?: Record<string, number> } }

/** Tally one render of a profiled subtree, keyed by profiler id. */
function countRender(id: string) {
  const renders = (window.__zpRenders ??= {});
  renders[id] = (renders[id] ?? 0) + 1;
}

/** Count renders of a subtree in development so browser tests can hold a render budget; a no-op in production builds. */
export function DevProfiler({ id, children }: { id: string; children: ReactNode }) {
  return import.meta.env.DEV ? <Profiler id={id} onRender={countRender}>{children}</Profiler> : <>{children}</>;
}
