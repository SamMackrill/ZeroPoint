// Diagrams that more than one chapter uses: Fleming's drawn hand for the right hand rule (Figures 7-4 and 8-4), and
// the rotation that moving bodies leave in the zeptons beside them (chapters 6, 10, 11 and 12), and the dumbbell zepton
// pairs of chapters 11 and 17.
import { useMemo, useState } from 'react';
import { BOOK_PDF } from '../labs';
import { HAND_DIGITS, HAND_PATH, HAND_SIZE } from '../art/fleming-hand';
import { Arrow, BlockArrow, Body, Charge, Choice, Diagram, Drag, FieldPicture, InOut, PlayBar, Readout, Remark, Spin, Stage, Still, T, Toggle, Zepton, polar, rad, rng, usePlayback, type Source, type Tone } from '../kit';

/** What one digit of the drawn hand stands for: a name, a small hint under it, and its colour. */
export interface HandDigit { name: string; hint: string; tone: Tone }

/**
 * Fleming's own drawing of the right hand, traced from the book, with an arrow carrying on from each digit the way it
 * points (Figures 7-4 and 8-4). The first finger is drawn up and to the left: in perspective it points into the page.
 * `mirrored` flips the drawing top to bottom into a left hand, thumb down.
 */
export function FlemingHandStage({ first, second, thumb, mirrored = false, label, footnote }: { first: HandDigit; second: HandDigit; thumb: HandDigit; mirrored?: boolean; label: string; footnote: string }) {
  const W = 720, H = 360, scale = 2.1, ox = 250, oy = 30, flip = mirrored ? -1 : 1;
  // The left hand is the right hand mirrored top to bottom, in the same box.
  const at = ([x, y]: readonly [number, number]): [number, number] => [ox + x * scale, oy + (mirrored ? HAND_SIZE.h - y : y) * scale];
  // An arrow carrying on from a fingertip the way the finger points.
  const along = (digit: { base: readonly [number, number]; tip: readonly [number, number] }, from: number, to: number) => {
    const [bx, by] = at(digit.base), [tx, ty] = at(digit.tip), d = Math.hypot(tx - bx, ty - by), ux = (tx - bx) / d, uy = (ty - by) / d;
    return { x1: tx + ux * from, y1: ty + uy * from, x2: tx + ux * to, y2: ty + uy * to };
  };
  const a = along(HAND_DIGITS.index, 14, 104), b = along(HAND_DIGITS.middle, 14, 112), c = along(HAND_DIGITS.thumb, 10, mirrored ? 68 : 82);
  return <Stage w={W} h={H} label={label}>
    <g transform={`translate(${ox} ${mirrored ? oy + HAND_SIZE.h * scale : oy}) scale(${scale} ${flip * scale})`}><path d={HAND_PATH} fillRule="evenodd" className="bk-f-text" opacity={0.85}/></g>
    <Arrow x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} tone={first.tone} w={3.5} head={13}/>
    <T x={a.x2 - 8} y={a.y2 - 12 * flip} tone={first.tone} anchor="end">{first.name}</T><T x={a.x2 - 8} y={a.y2 + (mirrored ? 30 : 6)} size="sm" tone={first.tone} anchor="end">{first.hint}</T>
    <Arrow x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} tone={second.tone} w={3.5} head={13}/>
    <T x={b.x2 - 8} y={b.y2 - 4} tone={second.tone} anchor="end">{second.name}</T><T x={b.x2 - 8} y={b.y2 + 14} size="sm" tone={second.tone} anchor="end">{second.hint}</T>
    <Arrow x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} tone={thumb.tone} w={5} head={15}/>
    <T x={c.x2 + 14} y={c.y2 + (mirrored ? -6 : 10)} tone={thumb.tone} anchor="start">{thumb.name}</T><T x={c.x2 + 14} y={c.y2 + (mirrored ? 12 : 28)} size="sm" tone={thumb.tone} anchor="start">{thumb.hint}</T>
    <T x={20} y={H - 14} size="sm" anchor="start">{footnote}</T>
  </Stage>;
}

/** How a two-source diagram draws the field. */
export type FieldMode = 'lines' | 'zeptons' | 'both';

/**
 * Two sources that can be dragged, with the field between and round them as Faraday's lines, as zeptons, or both
 * (Figures 6-5, 6-6, 6-11, 6-13, 11-2 and 18-1). `matter` makes them bodies of matter with matter-polarized zeptons;
 * a body of matter then takes the part a negative charge takes, with the antimatter ends of the zeptons toward it.
 */
export function TwoSources({ signs, mode: initial, names, flip, matter }: { signs: [1 | -1, 1 | -1]; mode: FieldMode; names: [string, string]; flip?: boolean; matter?: boolean }) {
  const [mode, setMode] = useState<FieldMode>(initial);
  const [flipped, setFlipped] = useState(false);
  const [a, setA] = useState({ x: 220, y: 180 });
  const [b, setB] = useState({ x: 500, y: 180 });
  const [push, setPush] = useState(false);
  const play = usePlayback();
  const W = 720, H = 360, k = flipped ? -1 : 1, qa = (signs[0] * k) as 1 | -1, qb = (signs[1] * k) as 1 | -1, like = qa === qb;
  const sources = useMemo<Source[]>(() => [{ x: a.x, y: a.y, q: qa }, { x: b.x, y: b.y, q: qb }], [a.x, a.y, b.x, b.y, qa, qb]);
  const bounds = { x0: 40, y0: 40, x1: W - 40, y1: H - 40 }, d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d, s = like ? -1 : 1;
  // Bodies of matter are marked M as in Figure 11-1 (M̄ for antimatter), and the key to a zepton's ends is drawn as there.
  const glyph = (p: { x: number; y: number }, q: 1 | -1) => (matter
    ? <><Body x={p.x} y={p.y} r={18} tone={q < 0 ? 'matter' : 'anti'}/><T x={p.x} y={p.y + 5} tone="text">{q < 0 ? 'M' : 'M̄'}</T></>
    : <Charge x={p.x} y={p.y} sign={q} r={14}/>);
  return <Diagram stage={
    <Stage w={W} h={H} label={`${names[0]} and ${names[1]}, with the field between them drawn as ${mode === 'both' ? 'lines and zeptons' : mode}. ${like ? 'The lines turn aside from each other between the two: repulsion.' : 'The lines run from one to the other: attraction.'}`}>
      <FieldPicture sources={sources} w={W} h={H} perUnit={10} lines={mode === 'zeptons' ? 0 : mode === 'both' ? 0.45 : 1} zeptons={mode === 'lines' ? 0 : 1} t={play.t} zeptonLen={17} polarity={matter ? 'matter' : 'electric'} radii={matter ? [18, 18] : undefined}/>
      {push && <>
        <BlockArrow x1={a.x + s * ux * 24} y1={a.y + s * uy * 24} x2={a.x + s * ux * 66} y2={a.y + s * uy * 66} thick={11}/>
        <BlockArrow x1={b.x - s * ux * 24} y1={b.y - s * uy * 24} x2={b.x - s * ux * 66} y2={b.y - s * uy * 66} thick={11}/>
      </>}
      <Drag x={a.x} y={a.y} onMove={(x, y) => setA({ x, y })} bounds={bounds} label={names[0]}>{glyph(a, qa)}</Drag>
      <Drag x={b.x} y={b.y} onMove={(x, y) => setB({ x, y })} bounds={bounds} label={names[1]}>{glyph(b, qb)}</Drag>
      {matter && <><Zepton x={90} y={H - 30} angle={180} len={46} polarity="matter" signs/><T x={126} y={H - 25} anchor="start" size="sm">a: antimatter end · m: matter end</T></>}
    </Stage>}>
    <Choice label="Draw the field as" value={mode} onChange={setMode} options={[{ value: 'lines', label: 'Lines' }, { value: 'zeptons', label: 'Zeptons' }, { value: 'both', label: 'Both' }]}/>
    {flip && <Toggle label={matter ? 'Make both antimatter' : 'Reverse both charges'} checked={flipped} onChange={setFlipped}/>}
    <Toggle label={`Show the push on each ${matter ? 'body' : 'charge'}`} checked={push} onChange={setPush}/>
    {mode !== 'lines' && <PlayBar play={play} label="the zeptons"/>}
    <Remark>{like ? `Drag a ${matter ? 'body' : 'charge'}. Wherever it goes the lines from the two turn aside and never join.` : 'Drag one of them. The lines always run from one to the other.'}</Remark>
  </Diagram>;
}

/**
 * A row of moving sources (electrons in a conductor, or pieces of matter) with the zeptons either side of it turning:
 * counter-clockwise above and clockwise below for motion to the right, as Figures 6-14 and 11-4 give it. The caller
 * owns the motion: `current` is the signed rate (−1 to 1), `angle` the zeptons' turn so far and `flow` the distance
 * the sources have gone.
 */
export function SpinRow({ kind, current, angle, flow, t, field }: { kind: 'electron' | 'matter'; current: number; angle: number; flow: number; t: number; field?: boolean }) {
  const W = 720, top = 138, bottom = 182, n = 9, pitch = 68, x0 = 88, mid = (top + bottom) / 2, moving = Math.abs(current) > 0.05;
  return <g>
    {kind === 'electron' && <><line x1={30} y1={top} x2={690} y2={top} className="bk-s-muted" strokeWidth="1.5"/><line x1={30} y1={bottom} x2={690} y2={bottom} className="bk-s-muted" strokeWidth="1.5"/></>}
    {Array.from({ length: 10 }, (_, i) => { const x = 30 + ((((i * 66 + flow) % 660) + 660) % 660); return kind === 'electron' ? <Charge key={i} x={x} y={mid} sign={-1} r={9}/> : <Body key={i} x={x} y={mid} r={10}/>; })}
    {Array.from({ length: n }, (_, i) => {
      const x = x0 + i * pitch, life = (t * 0.5 + i * 0.31) % 1, seen = 0.35 + 0.65 * Math.min(1, Math.sin(Math.PI * life) * 3), polarity = kind === 'matter' ? 'matter' as const : 'electric' as const;
      return <g key={i}>
        <Zepton x={x} y={top - 62} angle={-90 + angle} len={38} signs={false} opacity={seen} polarity={polarity}/>
        <Zepton x={x} y={bottom + 62} angle={90 - angle} len={38} signs={false} opacity={seen} polarity={polarity}/>
        {moving && i % 2 === 0 && <><Spin x={x} y={top - 62} r={26} ccw={current > 0} sweep={70 + 150 * Math.min(1, Math.abs(current))} opacity={0.8}/><Spin x={x} y={bottom + 62} r={26} ccw={current < 0} sweep={70 + 150 * Math.min(1, Math.abs(current))} opacity={0.8}/></>}
        {field && moving && i % 2 === 1 && <><InOut x={x} y={top - 62 - 34} out={current > 0} r={7}/><InOut x={x} y={bottom + 62 + 34} out={current < 0} r={7}/></>}
      </g>;
    })}
    {moving && <Still><Arrow x1={W / 2 - Math.sign(current) * 40} y1={top - 14} x2={W / 2 + Math.sign(current) * 40} y2={top - 14} tone="motion" w={2}/></Still>}
  </g>;
}

/** One entry of a list the reader steps through: a name, what Fleming says of it, and where in the companion to try it. */
export interface Step { id: string; name: string; says: string; page?: number; see?: { label: string; href: string }[] }

/**
 * A list the reader steps through, for chapters whose content is an argument and not a figure: the principles of
 * chapter 1, the route of the introduction, the summary of the conclusion. Selecting an entry shows what the book says
 * of it and links to the figures where it can be tried.
 */
export function StepList({ label, steps, heading }: { label: string; steps: readonly Step[]; heading: string }) {
  const [id, setId] = useState(steps[0].id);
  const step = steps.find(s => s.id === id) ?? steps[0];
  return <Diagram stage={
    <div className="bk-score" role="group" aria-label={label}>
      <ol className="bk-score-list bk-step-list">
        {steps.map(s => <li key={s.id}><button type="button" aria-pressed={s.id === id} onClick={() => setId(s.id)}><span className="bk-score-id">{s.id}</span><span className="bk-score-name">{s.name}</span></button></li>)}
      </ol>
    </div>}>
    <Readout label={heading} value={step.id}/>
    <Remark>{step.says}{step.page ? <> <a className="bk-pg" href={`${BOOK_PDF}#page=${step.page}`} target="_blank" rel="noreferrer">p. {step.page}</a></> : null}</Remark>
    {step.see && <div className="bk-step-links"><span>Try it at</span>{step.see.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</div>}
  </Diagram>;
}

/** Each zepton in Figures 11-3, 11-6 and 17-3 to 17-5 is a dumbbell: two round ends of radius ZR, ZD above and below its middle,
 *  joined by an hourglass neck ZN wide at its waist. ZH is its overall height; ZX is how far each zepton sits from the middle of the pair. */
const ZR = 42, ZD = 60, ZN = 18, ZH = 2 * (ZD + ZR), ZX = 62;

/** The sizes of a pair of dumbbell zeptons, as above, for the figures that draw them. */
export const ZEPTON_PAIR = { ZR, ZD, ZN, ZH, ZX } as const;

/** The outline of a dumbbell zepton centred on (x, y): two circles joined by a smooth hourglass neck, each curve leaving a circle along its tangent. */
export function dumbbell(x: number, y: number) {
  const shoulder = rad(45), k = 14, sx = ZR * Math.sin(shoulder), sy = ZD - ZR * Math.cos(shoulder), w = ZN / 2;
  // From the shoulder on the circle, along its tangent toward the waist, which is reached heading straight along the zepton.
  const cx1 = sx - k * Math.cos(shoulder), cy1 = sy - k * Math.sin(shoulder), cy2 = 12;
  const neck = (side: 1 | -1) => side > 0
    ? `C${x + cx1} ${y - cy1} ${x + w} ${y - cy2} ${x + w} ${y} C${x + w} ${y + cy2} ${x + cx1} ${y + cy1} ${x + sx} ${y + sy}`
    : `C${x - cx1} ${y + cy1} ${x - w} ${y + cy2} ${x - w} ${y} C${x - w} ${y - cy2} ${x - cx1} ${y - cy1} ${x - sx} ${y - sy}`;
  return `M${x - sx} ${y - sy} A${ZR} ${ZR} 0 1 1 ${x + sx} ${y - sy} ${neck(1)} A${ZR} ${ZR} 0 1 1 ${x - sx} ${y + sy} ${neck(-1)} Z`;
}

/** A pendulum clock with its foot at (x, y), `size` times full size: a see-through case, a face whose hand steps once each beat, and the pendulum swinging (chapters 22 and 23). */
export function PendulumClock({ x, y, swing, beats, tone, size = 1 }: { x: number; y: number; swing: number; beats: number; tone: 'text' | 'mark'; size?: number }) {
  const face = y - 128, pivot = face + 36, [bobX, bobY] = polar(x, pivot, 64, -90 + swing);
  return <g transform={size === 1 ? undefined : `translate(${x} ${y}) scale(${size}) translate(${-x} ${-y})`}>
    <rect x={x - 40} y={face - 40} width={80} height={152} rx={10} className="bk-body bk-body-plain" fillOpacity={0.35}/>
    <circle cx={x} cy={face} r={30} className="bk-fill-panel" fillOpacity={0.6} stroke="currentColor" strokeOpacity={0.3}/>
    {Array.from({ length: 12 }, (_, i) => { const [x1, y1] = polar(x, face, 25, i * 30), [x2, y2] = polar(x, face, 29, i * 30); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="bk-s-muted"/>; })}
    <line x1={x} y1={face} x2={polar(x, face, 23, 90 - beats * 30)[0]} y2={polar(x, face, 23, 90 - beats * 30)[1]} className={`bk-s-${tone}`} strokeWidth="3" strokeLinecap="round"/>
    <line x1={x} y1={pivot} x2={bobX} y2={bobY} className="bk-s-muted" strokeWidth="2"/>
    <circle cx={bobX} cy={bobY} r={10} className={tone === 'mark' ? 'bk-f-mark' : 'bk-f-text'}/>
  </g>;
}

/** A point of a field of zeptons, for linking neighbours. */
export interface FieldPoint { x: number; y: number }

/** The pairs of neighbouring points in a field, those closer together than `reach`, each pair once. */
export function linksBetween<P extends FieldPoint>(points: readonly P[], reach: number): (readonly [P, P])[] {
  return points.flatMap((a, i) => points.slice(i + 1).filter(b => Math.hypot(a.x - b.x, a.y - b.y) < reach).map(b => [a, b] as const));
}

/**
 * The torque of the vacuum drawn as faint links between neighbouring zeptons: the resistance each must overcome to turn
 * the others. `hold` gives the resistance (0 to 1) at a point; a link is drawn at its middle's, fading to nothing where
 * the zeptons turn freely (chapters 20 and 23).
 */
export function TorqueLinks({ links, hold }: { links: readonly (readonly [FieldPoint, FieldPoint])[]; hold(x: number, y: number): number }) {
  return <g>{links.map(([a, b], i) => { const h = Math.min(1, Math.max(0, hold((a.x + b.x) / 2, (a.y + b.y) / 2)));
    return h > 0.02 ? <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="bk-s-muted" strokeWidth={1} opacity={0.6 * h}/> : null; })}</g>;
}

/** A zepton's restless wobble about its resting angle, in degrees, at time t: wide where it is free (`freedom` 1), still where it is held (0). `a` and `b` are its own phases. */
export const wobbleAngle = (rest: number, freedom: number, t: number, a: number, b: number) => rest + 80 * freedom * (Math.sin(3.1 * t + a) + 0.6 * Math.sin(5.3 * t + b));

/** A field of zeptons laid out over a stage of `w` by `h`: a loose lattice at `spacing`, each with a scattered resting angle and its own phases for a wobble; `keep` leaves out those over other things. */
export function fieldLattice(w: number, h: number, spacing: number, seed: number, keep: (x: number, y: number) => boolean = () => true) {
  const random = rng(seed), cols = Math.ceil(w / spacing) + 1, rows = Math.ceil(h / spacing) + 1;
  return Array.from({ length: cols * rows }, (_, k) => ({ x: spacing / 2 + (k % cols) * spacing + (Math.floor(k / cols) % 2) * (spacing / 2), y: spacing / 2 + Math.floor(k / cols) * spacing, rest: random() * 180, a: random() * 6.28, b: random() * 6.28 }))
    .filter(z => z.x < w - 6 && z.y < h - 6 && keep(z.x, z.y));
}
