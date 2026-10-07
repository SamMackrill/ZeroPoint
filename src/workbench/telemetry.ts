// Debug telemetry (plan §05: Settings › Show debug telemetry): frame rate and the browser's WebGL, for every lab's
// status bar. Nothing here runs unless telemetry is shown.
import { useSyncExternalStore } from 'react';

let fps = 0, frames = 0, since = 0, handle = 0;
const listeners = new Set<() => void>();
/** Count one animation frame; once a second, publish the rate. */
function frame(now: number) {
  frames++;
  if (now - since >= 1000) { fps = Math.round(frames * 1000 / (now - since)); frames = 0; since = now; listeners.forEach(listener => listener()); }
  handle = requestAnimationFrame(frame);
}
/** One shared animation-frame loop, running only while something shows the frame rate. */
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) { frames = 0; since = performance.now(); handle = requestAnimationFrame(frame); }
  return () => { listeners.delete(listener); if (!listeners.size) cancelAnimationFrame(handle); };
}
/** Frames per second over the last second (0 until the first second has passed). */
export const useFps = () => useSyncExternalStore(subscribe, () => fps, () => 0);

let gl: string | undefined;
/** The browser's WebGL version and renderer, probed once on a throwaway canvas. */
export function webglInfo() {
  if (gl !== undefined) return gl;
  try {
    const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!context) return (gl = 'WebGL unavailable');
    const version = typeof WebGL2RenderingContext !== 'undefined' && context instanceof WebGL2RenderingContext ? 'WebGL 2' : 'WebGL 1';
    const debug = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER));
    context.getExtension('WEBGL_lose_context')?.loseContext();
    gl = `${version} · ${renderer}`;
  } catch { gl = 'WebGL unavailable'; }
  return gl;
}
