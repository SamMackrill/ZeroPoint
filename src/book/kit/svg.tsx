// The companion's drawing vocabulary: one way to draw a zepton, a charge, a field arrow and a rotation, so that every
// figure reads the same. Colours come from classes in book.css (tokens), never from literals here.
import { useContext, type ReactNode, type SVGProps } from 'react';
import { FigureRunning } from './clock';
import { polar, rad } from './geom';

/** A colour role. `pos`/`neg` are electric charge, `matter`/`anti` matter charge, `e`/`b` the fields, `force` a push. */
export type Tone = 'pos' | 'neg' | 'matter' | 'anti' | 'e' | 'b' | 'force' | 'motion' | 'mark' | 'accent' | 'text' | 'muted' | 'faint' | 'danger';

/** The drawing surface of a diagram: a scalable SVG with a spoken description. */
export function Stage({ w = 720, h = 360, label, children, ...rest }: { w?: number; h?: number; label: string; children: ReactNode } & Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return <svg className="bk-stage" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} {...rest}>{children}</svg>;
}

/** Diagram text. */
export function T({ x, y, children, anchor = 'middle', tone = 'muted', size = 'md', italic, ...rest }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; tone?: Tone; size?: 'sm' | 'md' | 'lg'; italic?: boolean } & Omit<SVGProps<SVGTextElement>, 'children'>) {
  return <text x={x} y={y} textAnchor={anchor} className={`bk-t bk-t-${size} bk-f-${tone}${italic ? ' bk-italic' : ''}`} {...rest}>{children}</text>;
}

/** A subscript inside SVG text, as in λ<Sb>ph</Sb> or B<Sb>m</Sb>: lowered and smaller, with the baseline restored after it. */
export function Sb({ children }: { children: ReactNode }) {
  // Both offsets are in the subscript's own size, so they cancel exactly and the text after it keeps its baseline.
  return <><tspan dy="0.32em" fontSize="0.72em">{children}</tspan><tspan dy="-0.32em" fontSize="0.72em">{'​'}</tspan></>;
}

/** A straight arrow from (x1, y1) to (x2, y2), with a head at the end (and at the start when `both`). */
export function Arrow({ x1, y1, x2, y2, tone = 'text', w = 2, head = 9, both, dash, opacity }: { x1: number; y1: number; x2: number; y2: number; tone?: Tone; w?: number; head?: number; both?: boolean; dash?: string; opacity?: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.5) return null;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len, h = Math.min(head, len * 0.6), half = h * 0.5;
  const tip = (x: number, y: number, s: 1 | -1) => `${x},${y} ${x - s * ux * h - uy * half},${y - s * uy * h + ux * half} ${x - s * ux * h + uy * half},${y - s * uy * h - ux * half}`;
  return <g className={`bk-s-${tone} bk-f-${tone}`} opacity={opacity}>
    <line x1={both ? x1 + ux * h * 0.8 : x1} y1={both ? y1 + uy * h * 0.8 : y1} x2={x2 - ux * h * 0.8} y2={y2 - uy * h * 0.8} strokeWidth={w} strokeDasharray={dash} strokeLinecap="round"/>
    <polygon points={tip(x2, y2, 1)} stroke="none"/>
    {both && <polygon points={tip(x1, y1, -1)} stroke="none"/>}
  </g>;
}

/**
 * A broad arrow for a pressure or a push, as Fleming draws forces: a solid shaft of a given thickness with a wider
 * head. Its length is the distance from tail to tip.
 */
export function BlockArrow({ x1, y1, x2, y2, tone = 'force', thick = 20, opacity }: { x1: number; y1: number; x2: number; y2: number; tone?: Tone; thick?: number; opacity?: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return null;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len, head = Math.min(len * 0.6, thick * 0.9), h = thick / 2, wide = thick * 0.95;
  const bx = x2 - ux * head, by = y2 - uy * head;
  const p = (x: number, y: number, side: number, off: number) => `${x - uy * side * off},${y + ux * side * off}`;
  return <polygon className={`bk-f-${tone}`} opacity={opacity} points={[p(x1, y1, 1, h), p(bx, by, 1, h), p(bx, by, 1, wide), `${x2},${y2}`, p(bx, by, -1, wide), p(bx, by, -1, h), p(x1, y1, -1, h)].join(' ')}/>;
}

/** An arrow given by its tail, direction (degrees, up the page is 90°) and length. */
export function Vector({ x, y, angle, len, centred, ...rest }: { x: number; y: number; angle: number; len: number; centred?: boolean; tone?: Tone; w?: number; head?: number; dash?: string; opacity?: number }) {
  const [sx, sy] = centred ? polar(x, y, -len / 2, angle) : [x, y], [ex, ey] = polar(sx, sy, len, angle);
  return <Arrow x1={sx} y1={sy} x2={ex} y2={ey} {...rest}/>;
}

/**
 * A curved arrow showing a sense of rotation about (x, y). `ccw` turns counter-clockwise as the reader sees it. The arc
 * starts at `from` degrees and sweeps `sweep` degrees. While its figure's animation runs the arrow fades out, as the
 * motion shows the rotation itself. `steady` keeps an arrow that is the only picture of its rotation (a field, an
 * eddy, a body drawn still), or a key or a measure rather than a rotation.
 */
export function Spin({ x, y, r, ccw = true, tone = 'motion', from = 40, sweep = 270, w = 1.8, opacity, steady = false }: { x: number; y: number; r: number; ccw?: boolean; tone?: Tone; from?: number; sweep?: number; w?: number; opacity?: number; steady?: boolean }) {
  const quiet = useContext(FigureRunning) && !steady;
  const s = ccw ? 1 : -1, end = from + s * sweep;
  const [x1, y1] = polar(x, y, r, from), [x2, y2] = polar(x, y, r, end);
  // The tangent at the end of the arc gives the head's direction.
  const tx = -s * Math.sin(rad(end)), ty = -s * Math.cos(rad(end)), h = Math.max(5, Math.min(9, r * 0.7));
  const bx = x2 - tx * h, by = y2 - ty * h;
  return <g className={`bk-s-${tone} bk-f-${tone} bk-still${quiet ? ' is-running' : ''}`} opacity={opacity}>
    <path d={`M${x1} ${y1} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} ${ccw ? 0 : 1} ${x2} ${y2}`} fill="none" strokeWidth={w} strokeLinecap="round"/>
    <polygon points={`${x2 + tx * 2},${y2 + ty * 2} ${bx - ty * h * 0.55},${by + tx * h * 0.55} ${bx + ty * h * 0.55},${by - tx * h * 0.55}`} stroke="none"/>
  </g>;
}

/** A field arrow seen end-on: a dot in a circle coming out of the page, a cross going in. */
export function InOut({ x, y, out, r = 9, tone = 'b', opacity }: { x: number; y: number; out: boolean; r?: number; tone?: Tone; opacity?: number }) {
  const k = r * 0.55;
  return <g className={`bk-s-${tone} bk-f-${tone}`} opacity={opacity}>
    <circle cx={x} cy={y} r={r} fill="none" strokeWidth="1.6"/>
    {out ? <circle cx={x} cy={y} r={r * 0.3} stroke="none"/> : <path d={`M${x - k} ${y - k} L${x + k} ${y + k} M${x + k} ${y - k} L${x - k} ${y + k}`} strokeWidth="1.6" fill="none"/>}
  </g>;
}

/** Props for a zepton glyph. */
export interface ZeptonProps {
  x: number;
  y: number;
  /** Direction of the positive end (for matter polarity, the antimatter end) from the centre, in degrees; up the page is 90°. */
  angle: number;
  /** Tip-to-tip length when fully open. */
  len?: number;
  /** How far the pair has opened, 0 (just formed, or annihilating) to 1. */
  open?: number;
  /** `electric` colours the ends by electric charge, `matter` by matter and antimatter. */
  polarity?: 'electric' | 'matter';
  /** `key` marks the pair the figure is about (Fleming draws it black); `dim` recedes. */
  emphasis?: 'normal' | 'key' | 'dim';
  /** Draw the oval Fleming uses for a virtual pair. */
  oval?: boolean;
  /** Write + and − (or m and m̄) on the ends. Off by default for small glyphs. */
  signs?: boolean;
  opacity?: number;
}

/**
 * A zepton: Fleming's name (ch. 6) for a virtual particle pair, drawn as he draws it, an oval with a positive and a
 * negative end. `open` lets a pair be shown appearing, opening to its full size and closing again.
 */
export function Zepton({ x, y, angle, len = 30, open = 1, polarity = 'electric', emphasis = 'normal', oval = true, signs, opacity }: ZeptonProps) {
  const half = (len / 2) * Math.max(0, Math.min(1, open)), r = Math.min(11, Math.max(2.5, len * 0.15));
  const [px, py] = polar(x, y, Math.max(0, half - r * 0.6), angle), [nx, ny] = polar(x, y, -Math.max(0, half - r * 0.6), angle);
  const [a, b] = polarity === 'electric' ? ['pos', 'neg'] : ['anti', 'matter'];
  const showSigns = signs ?? len >= 34;
  return <g className={`bk-zepton bk-zepton-${emphasis}`} opacity={opacity}>
    {oval
      ? <ellipse cx={x} cy={y} rx={half + r * 0.9} ry={Math.max(r * 1.5, len * 0.27)} transform={`rotate(${-angle} ${x} ${y})`} className="bk-zepton-oval"/>
      : <line x1={nx} y1={ny} x2={px} y2={py} className="bk-zepton-bar"/>}
    <circle cx={nx} cy={ny} r={r} className={`bk-f-${b}`}/>
    <circle cx={px} cy={py} r={r} className={`bk-f-${a}`}/>
    {showSigns && open > 0.5 && <>
      <text x={px} y={py} dy="0.36em" textAnchor="middle" className="bk-sign">{polarity === 'electric' ? '+' : 'a'}</text>
      <text x={nx} y={ny} dy="0.36em" textAnchor="middle" className="bk-sign">{polarity === 'electric' ? '−' : 'm'}</text>
    </>}
  </g>;
}

/** A free charge: an electron, a proton or a charged body, with its sign and an optional name beneath. */
export function Charge({ x, y, sign, r = 13, label, opacity }: { x: number; y: number; sign: 1 | -1; r?: number; label?: string; opacity?: number }) {
  return <g opacity={opacity}>
    <circle cx={x} cy={y} r={r} className={sign > 0 ? 'bk-charge-pos' : 'bk-charge-neg'}/>
    <text x={x} y={y} dy="0.36em" textAnchor="middle" className="bk-sign bk-sign-lg">{sign > 0 ? '+' : '−'}</text>
    {label && <text x={x} y={y + r + 15} textAnchor="middle" className="bk-t bk-t-sm bk-f-muted">{label}</text>}
  </g>;
}

/** A body of ordinary matter (a planet, a star, a flywheel), which carries matter charge in the later chapters. */
export function Body({ x, y, r = 22, label, tone = 'matter', opacity }: { x: number; y: number; r?: number; label?: string; tone?: 'matter' | 'anti' | 'plain'; opacity?: number }) {
  return <g opacity={opacity}>
    <circle cx={x} cy={y} r={r} className={`bk-body bk-body-${tone}`}/>
    {label && <text x={x} y={y + r + 15} textAnchor="middle" className="bk-t bk-t-sm bk-f-muted">{label}</text>}
  </g>;
}

/** A polyline or free path in a tone. */
export function Line({ d, tone = 'muted', w = 1.5, dash, opacity, fill }: { d: string; tone?: Tone; w?: number; dash?: string; opacity?: number; fill?: boolean }) {
  return <path d={d} className={`bk-s-${tone}${fill ? ` bk-f-${tone}` : ''}`} fill={fill ? undefined : 'none'} strokeWidth={w} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}/>;
}

/**
 * A spinning zepton threaded on a magnetic field line: a small loop seen at a slant, its axis along the field, with a
 * mark going round it. By the right-hand grip rule (Figure 6-16) the mark circles counter-clockwise as seen from the
 * end the field points to. `angle` is the field's direction (degrees, up the page is 90°); `turn` is the turn so far.
 */
export function SpinLoop({ x, y, angle, r = 9, turn, tone = 'b', opacity }: { x: number; y: number; angle: number; r?: number; turn: number; tone?: Tone; opacity?: number }) {
  // Along the loop's long axis (across the field) and its foreshortened axis (along the field, standing for depth).
  const across = r * Math.cos(rad(turn)), depth = Math.sin(rad(turn));
  const [mx, my] = polar(x, y, across, angle + 90), [dx, dy] = polar(mx, my, r * 0.32 * depth, angle);
  return <g className={`bk-s-${tone} bk-f-${tone}`} opacity={opacity}>
    <ellipse cx={x} cy={y} rx={r * 0.32} ry={r} transform={`rotate(${-angle} ${x} ${y})`} fill="none" strokeWidth="1.2"/>
    <circle cx={dx} cy={dy} r={1.8 + 1.1 * depth} stroke="none"/>
  </g>;
}

/**
 * Annotations that a running animation makes redundant: an arrow marking the direction of a motion the reader can watch,
 * or the ω beside a rotation arrow. They fade out while the figure plays and back in when it pauses or stops; static
 * figures always show them. (Spin arrows fade by themselves.)
 */
export function Still({ children }: { children: ReactNode }) {
  const running = useContext(FigureRunning);
  return <g className={`bk-still${running ? ' is-running' : ''}`}>{children}</g>;
}
