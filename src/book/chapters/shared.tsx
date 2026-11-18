// Diagrams that more than one chapter uses: the right hand rule for a cross product (Figures 7-4 and 8-4), and the
// rotation that moving bodies leave in the zeptons beside them (chapters 6, 10, 11 and 12).
import { useMemo, useState } from 'react';
import { BOOK_PDF } from '../labs';
import { Arrow, BlockArrow, Body, Charge, Choice, Diagram, Drag, FieldPicture, InOut, PlayBar, Readout, Remark, Spin, Stage, Still, T, Toggle, Zepton, usePlayback, type Source, type Tone } from '../kit';

/** A direction along an axis: +x, −x and so on. */
export type Axis = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

type Vec = [number, number, number];

const AXES: Record<Axis, Vec> = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };
const NAMES: Record<Axis, string> = { '+x': 'right', '-x': 'left', '+y': 'up', '-y': 'down', '+z': 'toward you', '-z': 'away from you' };
const OPTIONS: { value: Axis; label: string }[] = [{ value: '+x', label: '→' }, { value: '-x', label: '←' }, { value: '+y', label: '↑' }, { value: '-y', label: '↓' }, { value: '+z', label: '⊙' }, { value: '-z', label: '⊗' }];

/** The cross product of two vectors. */
export const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** The direction of first × second as an axis name, or null when the two are parallel. */
export function crossAxis(first: Axis, second: Axis, sign: 1 | -1 = 1): Axis | null {
  const c = cross(AXES[first], AXES[second]).map(v => v * sign) as Vec;
  return (Object.keys(AXES) as Axis[]).find(k => AXES[k].every((v, i) => v === c[i])) ?? null;
}

/** An oblique view of three dimensions: x to the right, y up the page, z toward the reader at the lower left. */
export const oblique = (ox: number, oy: number) => ([x, y, z]: Vec): [number, number] => [ox + x - 0.6 * z, oy - y + 0.48 * z];

/** What the three fingers of the right hand rule stand for in one use of it. */
export interface HandRuleProps {
  /** First finger: the first term of the cross product. */
  first: { name: string; tone: Tone; start: Axis };
  /** Second finger: the second term. */
  second: { name: string; tone: Tone; start: Axis };
  /** Thumb: the result. */
  thumb: { name: string; tone: Tone };
  /** Offer a choice of sign for the thing acted on (a positive or negative charge), which reverses the result. */
  signed?: string;
  remark: string;
}

/**
 * The right hand rule as three arrows: first finger and second finger are set by the reader, and the thumb follows
 * as their cross product. With parallel fingers there is no result.
 */
export function HandRule({ first, second, thumb, signed, remark }: HandRuleProps) {
  const [a, setA] = useState<Axis>(first.start);
  const [b, setB] = useState<Axis>(second.start);
  const [negative, setNegative] = useState(false);
  const result = crossAxis(a, b, negative ? -1 : 1), project = oblique(300, 190), L = 130;
  const arrow = (axis: Axis, tone: Tone, label: string, w: number) => {
    const v = AXES[axis], [x, y] = project([v[0] * L, v[1] * L, v[2] * L]), [lx, ly] = project([v[0] * (L + 26), v[1] * (L + 26), v[2] * (L + 26)]);
    return <g key={label}><Arrow x1={300} y1={190} x2={x} y2={y} tone={tone} w={w} head={13}/><T x={lx} y={ly + 5} tone={tone}>{label}</T></g>;
  };
  return <Diagram stage={
    <Stage h={380} label={`Right hand rule. First finger, ${first.name}: ${NAMES[a]}. Second finger, ${second.name}: ${NAMES[b]}. Thumb, ${thumb.name}: ${result ? NAMES[result] : 'none, because the two fingers are parallel'}.`}>
      {(['+x', '+y', '+z'] as Axis[]).map(axis => { const v = AXES[axis], [x1, y1] = project([-v[0] * 160, -v[1] * 160, -v[2] * 160]), [x2, y2] = project([v[0] * 160, v[1] * 160, v[2] * 160]); return <line key={axis} x1={x1} y1={y1} x2={x2} y2={y2} className="bk-s-faint" strokeDasharray="2 5"/>; })}
      {arrow(a, first.tone, first.name, 3)}
      {a !== b && arrow(b, second.tone, second.name, 3)}
      {result && arrow(result, thumb.tone, thumb.name, 5)}
      <T x={560} y={150} anchor="start" size="sm" tone={first.tone}>first finger: {first.name}</T>
      <T x={560} y={174} anchor="start" size="sm" tone={second.tone}>second finger: {second.name}</T>
      <T x={560} y={198} anchor="start" size="sm" tone={thumb.tone}>thumb: {thumb.name}</T>
      <T x={30} y={372} anchor="start" size="sm">⊙ is toward you, drawn to the lower left; ⊗ is away from you.</T>
    </Stage>}>
    <Choice label={`First finger: ${first.name}`} value={a} onChange={setA} options={OPTIONS}/>
    <Choice label={`Second finger: ${second.name}`} value={b} onChange={setB} options={OPTIONS}/>
    {signed && <Choice label={signed} value={negative ? 'neg' : 'pos'} onChange={v => setNegative(v === 'neg')} options={[{ value: 'pos', label: 'Positive' }, { value: 'neg', label: 'Negative' }]}/>}
    <Readout label={`Thumb: ${thumb.name}`} value={result ? NAMES[result] : 'none'} tone={result ? 'good' : 'bad'}/>
    <Remark>{!result ? 'With the two fingers along the same line there is nothing for the thumb to show: only the perpendicular part counts.' : negative ? `For a negative ${signed?.toLowerCase() ?? 'charge'} the ${thumb.name} is opposite to where the right thumb points.` : remark}</Remark>
  </Diagram>;
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
  const glyph = (p: { x: number; y: number }, q: 1 | -1) => (matter ? <Body x={p.x} y={p.y} r={15} tone={q < 0 ? 'matter' : 'anti'}/> : <Charge x={p.x} y={p.y} sign={q} r={14}/>);
  return <Diagram stage={
    <Stage w={W} h={H} label={`${names[0]} and ${names[1]}, with the field between them drawn as ${mode === 'both' ? 'lines and zeptons' : mode}. ${like ? 'The lines turn aside from each other between the two: repulsion.' : 'The lines run from one to the other: attraction.'}`}>
      <FieldPicture sources={sources} w={W} h={H} perUnit={10} lines={mode === 'zeptons' ? 0 : mode === 'both' ? 0.45 : 1} zeptons={mode === 'lines' ? 0 : 1} t={play.t} zeptonLen={17} polarity={matter ? 'matter' : 'electric'}/>
      {push && <>
        <BlockArrow x1={a.x + s * ux * 24} y1={a.y + s * uy * 24} x2={a.x + s * ux * 66} y2={a.y + s * uy * 66} thick={11}/>
        <BlockArrow x1={b.x - s * ux * 24} y1={b.y - s * uy * 24} x2={b.x - s * ux * 66} y2={b.y - s * uy * 66} thick={11}/>
      </>}
      <Drag x={a.x} y={a.y} onMove={(x, y) => setA({ x, y })} bounds={bounds} label={names[0]}>{glyph(a, qa)}</Drag>
      <Drag x={b.x} y={b.y} onMove={(x, y) => setB({ x, y })} bounds={bounds} label={names[1]}>{glyph(b, qb)}</Drag>
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
