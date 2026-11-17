// Animation time for the companion's diagrams. A diagram's clock runs only while its figure is on screen and playing,
// so a chapter page with eighteen figures animates the two or three the reader is looking at.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/** Whether the surrounding figure is on screen. FigureCard provides it; a diagram outside one is always visible. */
export const FigureVisible = createContext(true);

/** Whether the reader has asked their system for less motion. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A diagram's playback: the elapsed time in seconds, whether it is running, and the transport actions. */
export interface Playback {
  /** Seconds of animation time elapsed, scaled by the speed. */
  t: number;
  playing: boolean;
  toggle(): void;
  restart(): void;
  /** Move the clock to a time, for stepping. */
  seek(t: number): void;
}

/**
 * A clock for one diagram. It starts running unless the reader prefers reduced motion, advances only while the figure
 * is visible, and stops at `end` when one is given (a bounded sequence; Restart plays it again).
 */
export function usePlayback({ speed = 1, end, autoplay = true }: { speed?: number; end?: number; autoplay?: boolean } = {}): Playback {
  const visible = useContext(FigureVisible);
  const [playing, setPlaying] = useState(() => autoplay && !prefersReducedMotion());
  const [t, setT] = useState(0);
  const time = useRef(0), rate = useRef(speed);
  rate.current = speed;
  useEffect(() => {
    if (!playing || !visible || typeof requestAnimationFrame !== 'function') return;
    let frame = 0, last = performance.now();
    const tick = (now: number) => {
      // A long gap (a hidden tab) must not jump the animation forward, and the first frame's timestamp can precede `last`.
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      time.current += dt * rate.current;
      if (end !== undefined && time.current >= end) { time.current = end; setT(end); setPlaying(false); return; }
      setT(time.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, visible, end]);
  const seek = useCallback((next: number) => { time.current = next; setT(next); }, []);
  const toggle = useCallback(() => setPlaying(p => {
    // Play at the end of a bounded sequence starts it again.
    if (!p && end !== undefined && time.current >= end) { time.current = 0; setT(0); }
    return !p;
  }), [end]);
  const restart = useCallback(() => { time.current = 0; setT(0); setPlaying(true); }, []);
  return { t, playing, toggle, restart, seek };
}
