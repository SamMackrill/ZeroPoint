// Fields round point sources, drawn the two ways the book draws them: as Faraday's lines, and as the zeptons lined
// up end to end that Fleming says the lines stand for (ch. 6). The same picture serves electric charge and, from
// chapter 11, matter charge.
import { useMemo } from 'react';
import { deg, fieldAngle, fieldAt, pathThrough, traceLine, type Source } from './geom';
import { Zepton, type Tone } from './svg';

/** A traced line of the field, running the way the field points. */
export interface FieldLine { points: [number, number][]; closed: boolean }

/**
 * The lines of a field: `perUnit` lines leave each unit of positive source and arrive at each unit of negative source,
 * evenly spaced round it, as in Faraday's convention that the number of lines follows the strength. A line that runs
 * from a positive source to a negative one is traced once.
 */
export function fieldLines(sources: readonly Source[], box: { w: number; h: number }, perUnit = 8, start = 16, offset = 0): FieldLine[] {
  const lines: FieldLine[] = [];
  for (const s of sources) {
    const n = Math.max(1, Math.round(perUnit * Math.abs(s.q)));
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5 + offset) / n) * 2 * Math.PI, x = s.x + start * Math.cos(a), y = s.y + start * Math.sin(a);
      const traced = traceLine(sources, x, y, s.q > 0 ? 1 : -1, box, start * 0.8);
      const [ex, ey] = traced[traced.length - 1];
      const hit = sources.find(o => o !== s && Math.hypot(ex - o.x, ey - o.y) < start);
      // A line reaching a positive source from a negative one is the same line already traced from the positive end.
      if (s.q < 0 && hit && hit.q > 0) continue;
      const points: [number, number][] = [[s.x + (start * 0.6) * Math.cos(a), s.y + (start * 0.6) * Math.sin(a)], ...traced];
      lines.push({ points: s.q > 0 ? points : points.reverse(), closed: !!hit });
    }
  }
  return lines;
}

/** Points spaced evenly along a line, each with the line's direction there (degrees, up the page is 90°). */
export function alongLine(points: readonly (readonly [number, number])[], spacing: number, first = spacing / 2): { x: number; y: number; angle: number; s: number }[] {
  const out: { x: number; y: number; angle: number; s: number }[] = [];
  let travelled = 0, next = first;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i], seg = Math.hypot(x1 - x0, y1 - y0);
    while (seg > 0 && travelled + seg >= next) {
      const k = (next - travelled) / seg;
      out.push({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, angle: deg(Math.atan2(-(y1 - y0), x1 - x0)), s: next });
      next += spacing;
    }
    travelled += seg;
  }
  return out;
}

/** Props for a picture of a field. */
export interface FieldPictureProps {
  sources: readonly Source[];
  w: number;
  h: number;
  /** Lines per unit of source. */
  perUnit?: number;
  /** Draw Faraday's lines (0 to 1 is their opacity). */
  lines?: number;
  /** Draw zeptons along the lines (0 to 1 is their opacity). */
  zeptons?: number;
  /** Animation time, so the zeptons come and go; omit for a still picture. */
  t?: number;
  polarity?: 'electric' | 'matter';
  tone?: Tone;
  /** Length of each zepton and the gap to the next. */
  zeptonLen?: number;
  /** Where round each source the first line leaves, as a fraction of the spacing between lines. */
  offset?: number;
  /**
   * Each source's radius as drawn. The zeptons then start a small gap outside it, whatever its size, and none is drawn
   * touching it; without it they start at a fixed distance along the line.
   */
  radii?: readonly number[];
}

/** The clear space left between a source as drawn and the nearest end of a zepton. */
const ZEPTON_GAP = 4;

/**
 * A field as lines, as zeptons, or as both at once. The zeptons lie along the lines with their positive ends toward
 * the negative source, the way the electric field points (Figure 6-7), each one opening and closing in its turn.
 */
export function FieldPicture({ sources, w, h, perUnit = 8, lines = 1, zeptons = 0, t, polarity = 'electric', tone = 'e', zeptonLen = 20, offset = 0, radii }: FieldPictureProps) {
  const traced = useMemo(() => fieldLines(sources, { w, h }, perUnit, 16, offset), [sources, w, h, perUnit, offset]);
  return <g>
    {lines > 0 && traced.map((line, i) => {
      const marks = alongLine(line.points, 150, Math.min(60, 40)).filter(m => !radii || sources.every((s, j) => Math.hypot(m.x - s.x, m.y - s.y) > radii[j] + 8));
      return <g key={i} opacity={lines} className={`bk-s-${tone} bk-f-${tone}`}>
        <path d={pathThrough(line.points)} fill="none" strokeWidth="1.4"/>
        {marks.map((m, k) => <polygon key={k} points="6,0 -5,4.5 -5,-4.5" transform={`translate(${m.x} ${m.y}) rotate(${-m.angle})`} stroke="none"/>)}
      </g>;
    })}
    {zeptons > 0 && traced.map((line, i) => {
      // Each zepton lives its own short life, out of step with its neighbours.
      const life = (k: number) => (t === undefined ? 0.5 : (t * 0.9 + ((i * 7 + k * 3) % 10) / 10) % 1);
      if (!radii) return alongLine(line.points, zeptonLen + 9, zeptonLen * 0.9).map((m, k) => {
        const open = 0.45 + 0.55 * Math.sin(Math.PI * life(k));
        return <Zepton key={`${i}-${k}`} x={m.x} y={m.y} angle={m.angle} len={zeptonLen} open={open} polarity={polarity} oval={false} signs={false} opacity={zeptons * open}/>;
      });
      // With the sources' sizes known, the zeptons are counted from the end of the line at a source (a negative source's
      // lines are traced inward, so that end is last), the first one's middle far enough out that even fully open it
      // leaves a small gap. Each opens and closes about its middle, and those at the same distance along their lines do
      // so together, so the picture stays balanced round the source.
      const gap = (j: number) => radii[j] + ZEPTON_GAP + zeptonLen / 2 + 0.4 * Math.min(11, Math.max(2.5, zeptonLen * 0.15));
      const toNearest = ([x, y]: readonly [number, number]) => sources.reduce((best, s, j) => { const d = Math.hypot(x - s.x, y - s.y); return d < best.d ? { j, d } : best; }, { j: 0, d: Infinity });
      const head = toNearest(line.points[0]), tail = toNearest(line.points[line.points.length - 1]), flip = tail.d < head.d;
      const points = flip ? [...line.points].reverse() : line.points, end = flip ? tail : head;
      return alongLine(points, zeptonLen + 9, Math.max(0, gap(end.j) - end.d))
        .filter(m => sources.every((s, j) => Math.hypot(m.x - s.x, m.y - s.y) >= gap(j) - 0.5))
        .map((m, k) => {
          const ring = t === undefined ? 0.5 : (t * 0.9 + ((k * 3) % 10) / 10) % 1, open = 0.45 + 0.55 * Math.sin(Math.PI * ring);
          return <Zepton key={`${i}-${k}`} x={m.x} y={m.y} angle={flip ? m.angle + 180 : m.angle} len={zeptonLen} open={open} polarity={polarity} oval={false} signs={false} opacity={zeptons * open}/>;
        });
    })}
  </g>;
}

/**
 * A field as zeptons that stay where they are and turn to it: a fixed, even scatter, each zepton pointing along the field
 * at its place and polarized more fully where the field is stronger. As a source moves they turn smoothly to stay aligned
 * (p. 56), and the chains of Faraday's lines show in them as in iron filings, with nothing re-traced from frame to frame.
 */
export function FieldZeptons({ sources, w, h, t, spacing = 24, zeptonLen = 14, polarity = 'electric', radii }: { sources: readonly Source[]; w: number; h: number; t?: number; spacing?: number; zeptonLen?: number; polarity?: 'electric' | 'matter'; radii?: readonly number[] }) {
  const places = useMemo(() => {
    const rowH = spacing * 0.866, out: { x: number; y: number; phase: number }[] = [];
    for (let r = 0, y = rowH / 2; y < h; r++, y += rowH) {
      for (let x = (r % 2 ? spacing / 2 : 0) + spacing / 2; x < w; x += spacing) out.push({ x, y, phase: ((r * 7 + Math.round(x / spacing) * 3) % 10) / 10 });
    }
    return out;
  }, [w, h, spacing]);
  return <g>
    {places.map((p, k) => {
      // Hidden only under a source's own glyph (`radii`, as drawn), so the zeptons between two sources are all shown.
      if (sources.some((s, i) => Math.hypot(p.x - s.x, p.y - s.y) < (radii?.[i] ?? 14) + zeptonLen / 2)) return null;
      const strength = Math.min(1, Math.sqrt(relativeStrength(sources, p.x, p.y, 70))), life = t === undefined ? 0.5 : (t * 0.9 + p.phase) % 1, pulse = 0.45 + 0.55 * Math.sin(Math.PI * life);
      return <Zepton key={k} x={p.x} y={p.y} angle={fieldAngle(sources, p.x, p.y)} len={zeptonLen} open={pulse} polarity={polarity} oval={false} signs={false} opacity={(0.12 + 0.88 * strength) * pulse}/>;
    })}
  </g>;
}

/** The strength of a field at a point relative to its strength at a reference distance from a unit source. */
export function relativeStrength(sources: readonly Source[], x: number, y: number, reference = 100) {
  const [fx, fy] = fieldAt(sources, x, y);
  return Math.hypot(fx, fy) * reference * reference;
}
