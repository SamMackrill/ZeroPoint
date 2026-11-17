// Dragging inside a diagram: a group the reader can move with the pointer or the arrow keys.
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { clamp } from './geom';

/** The rectangle a draggable thing may move within, in diagram units. */
export interface Bounds { x0: number; y0: number; x1: number; y1: number }

/**
 * A draggable group at (x, y). The pointer moves it in the diagram's own units whatever size the SVG is drawn at, and
 * the arrow keys move it in steps, so the diagram can be worked without a mouse.
 */
export function Drag({ x, y, onMove, bounds, label, step = 10, children }: { x: number; y: number; onMove(x: number, y: number): void; bounds: Bounds; label: string; step?: number; children: ReactNode }) {
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  /** The pointer's position in diagram units. */
  const at = (event: PointerEvent<SVGGElement>) => {
    const svg = event.currentTarget.ownerSVGElement, matrix = svg?.getScreenCTM?.();
    if (!svg || !matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };
  const move = (nx: number, ny: number) => onMove(clamp(nx, bounds.x0, bounds.x1), clamp(ny, bounds.y0, bounds.y1));
  const onKey = (event: KeyboardEvent<SVGGElement>) => {
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = delta[event.key];
    if (!d) return;
    event.preventDefault();
    move(x + d[0], y + d[1]);
  };
  return <g className="bk-drag" tabIndex={0} role="application" aria-label={`${label}. Drag, or use the arrow keys, to move it.`} onKeyDown={onKey}
    onPointerDown={event => { const p = at(event); if (!p) return; grab.current = { dx: x - p.x, dy: y - p.y }; event.currentTarget.setPointerCapture?.(event.pointerId); }}
    onPointerMove={event => { if (!grab.current) return; const p = at(event); if (p) move(p.x + grab.current.dx, p.y + grab.current.dy); }}
    onPointerUp={event => { grab.current = null; event.currentTarget.releasePointerCapture?.(event.pointerId); }}
    onPointerCancel={() => { grab.current = null; }}>
    {/* A generous invisible target, so a small glyph is easy to pick up on a touch screen. */}
    <circle cx={x} cy={y} r={24} fill="transparent"/>
    {children}
  </g>;
}
