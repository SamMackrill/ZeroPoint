// Chapter 7: Maxwell's Equations (PDF pp. 62–69). Figures 7-1 to 7-5.
import { useMemo, useRef, useState } from 'react';
import { Action, Dial, Arrow, BlockArrow, Charge, Choice, Diagram, FieldPicture, FieldZeptons, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, SpinLoop, Stage, T, Toggle, Zepton, clamp, fmt, pathThrough, polar, usePlayback, type Source } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';
import { HAND_DIGITS, HAND_PATH, HAND_SIZE } from '../art/fleming-hand';
import type { FieldMode } from './shared';

const W = 720;

/**
 * Where Figure 7-1 draws the field's straight lines of force: as many as the field's strength calls for (six at 0.7, as
 * printed, nine at full), spread evenly across the field, so their density shows its strength.
 */
export function fieldLineXs(field: number) {
  const n = field < 0.02 ? 0 : Math.max(1, Math.round(field * 9)), span = 420;
  return Array.from({ length: n }, (_, i) => Math.round(360 - span / 2 + (span * (i + 0.5)) / n));
}

/**
 * The radii of the current's circular lines of force round C. The strength round a straight current falls as 1/r, so
 * the number of lines inside a radius grows as log r: the circles are spaced by a constant ratio, which widens as the
 * current falls. Five circles at full current, between 34 and 175 units.
 */
export function circleRadii(current: number, inner = 34, outer = 175) {
  const k = Math.abs(current);
  if (k < 0.02) return [];
  const step = Math.log(outer / inner) / (4 * k), radii: number[] = [];
  for (let r = inner; r <= outer + 0.5; r *= Math.exp(step)) radii.push(Math.round(r));
  return radii;
}

/** Figure 7-1: Maxwell's current in a field. The lines add on one side and subtract on the other, and the current is urged across. */
function CurrentInField() {
  const [field, setField] = useState(0.7);
  const [current, setCurrent] = useState(0.7);
  const H = 380, cx = 360, cy = 190;
  // At the east point the current's circular lines run with the field; at the west point against it.
  const east = field + current * 0.6, west = field - current * 0.6, push = (east ** 2 - west ** 2) * 60;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A magnetic field pointing up the page from s to n, and a current ${current >= 0 ? 'rising out of' : 'going into'} the page at C. The lines of force are ${fmt(Math.abs(east), 2)} on the east side and ${fmt(Math.abs(west), 2)} on the west side, so the current is urged toward the ${push > 0 ? 'west' : push < 0 ? 'east' : 'neither side'}.`}>
      {fieldLineXs(field).map(x => <Arrow key={x} x1={x} y1={H - 40} x2={x} y2={40} tone="b" w={1.8} opacity={0.75}/>)}
      {circleRadii(current).map(r => <g key={r} opacity={0.9}><circle cx={cx} cy={cy} r={r} className="bk-s-motion" fill="none" strokeWidth={1.8} strokeDasharray="6 4"/>
        {[0, 180].map(a => { const [x, y] = polar(cx, cy, r, a), s = current > 0 ? 1 : -1; return <Arrow key={a} x1={x} y1={y + s * (a === 0 ? 8 : -8)} x2={x} y2={y - s * (a === 0 ? 8 : -8)} tone="motion" w={0.1} head={11}/>; })}</g>)}
      <circle cx={cx} cy={cy} r={17} className="bk-plate"/><InOut x={cx} y={cy} out={current >= 0} r={9} tone="text"/><T x={cx + 4} y={cy + 40} tone="text">C</T>
      {Math.abs(push) > 1 && <BlockArrow x1={cx - Math.sign(push) * 24} y1={cy} x2={cx - Math.sign(push) * (24 + Math.min(110, Math.abs(push)))} y2={cy} thick={14}/>}
      <T x={cx} y={24} tone="text">n</T><T x={cx} y={H - 14} tone="text">s</T><T x={36} y={cy + 5} tone="text">w</T><T x={W - 36} y={cy + 5} tone="text">e</T>
      <Spin x={W - 90} y={cy} r={8 + 22 * clamp(Math.abs(east) / 1.4)} ccw={east >= 0} sweep={300}/><T x={W - 90} y={cy + 52} size="sm">vortices: {fmt(Math.abs(east), 2)}</T>
      <Spin x={90} y={cy} r={8 + 22 * clamp(Math.abs(west) / 1.4)} ccw={west >= 0} sweep={300}/><T x={90} y={cy + 52} size="sm">vortices: {fmt(Math.abs(west), 2)}</T>
    </Stage>}>
    <Slider label="Strength of the field" value={field} min={0} max={1} step={0.05} onChange={setField}/>
    <Dial label="Current at C" value={current} min={-1} max={1} step={0.05} onChange={setCurrent} marks={['down', 'off', 'up']} show={v => (v === 0 ? 'off' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'ascending' : 'descending'}`)}/>
    <Readout label="Lines of force at e" value={fmt(Math.abs(east), 2)} tone="b"/>
    <Readout label="Lines of force at w" value={fmt(Math.abs(west), 2)} tone="b"/>
    <Readout label="Current is urged" value={Math.abs(push) < 1 ? 'nowhere' : push > 0 ? 'toward the west' : 'toward the east'} tone="force"/>
    <Remark>The more powerful vortices are on the side where the two sets of lines add, and they push the current toward the other side.</Remark>
  </Diagram>;
}

/** The rows of Maxwell's vortices: how far each is from the line of the current, and which side. */
const ROWS = [-3, -2, -1, 1, 2];

/** The circumradius of one of Maxwell's hexagonal cells, counting half the channel of idle wheels round it. */
const CELL = 36;

/** Maxwell's honeycomb for Figure 7-2: the cells, the idle wheels between cells of one row, and the zigzag channels between rows. */
function honeycomb(cols: number, x0: number, y0: number) {
  const w = Math.sqrt(3) * CELL, rowH = 1.5 * CELL;
  const cells = ROWS.flatMap((_, r) => Array.from({ length: cols }, (__, c) => ({ r, x: x0 + c * w + (r % 2 ? w / 2 : 0), y: y0 + r * rowH })));
  const vertex = (x: number, y: number, a: number) => polar(x, y, CELL, a);
  // Idle wheels on the upright edges between neighbours in a row: two to an edge. They roll between two vortices
  // turning together, so they turn but never travel.
  const still = cells.filter(c => cells.some(d => d.r === c.r && Math.abs(d.x - c.x - w) < 1)).flatMap(c => {
    const [ax, ay] = vertex(c.x, c.y, 30), [bx, by] = vertex(c.x, c.y, -30);
    return [1 / 3, 2 / 3].map(k => ({ x: ax + (bx - ax) * k, y: ay + (by - ay) * k, r: c.r }));
  });
  // The zigzag channel under each row but the last: down to each cell's lowest corner and up again.
  const channels = ROWS.slice(0, -1).map((_, r) => {
    const row = cells.filter(c => c.r === r), last = row[row.length - 1];
    const points = [...row.flatMap(c => [vertex(c.x, c.y, 210), vertex(c.x, c.y, 270)]), vertex(last.x, last.y, 330)];
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    return { points, lengths, total: lengths.reduce((a, b) => a + b, 0) };
  });
  return { cells, still, channels };
}

/** The point a distance `d` along a channel's zigzag. */
function alongChannel(ch: { points: [number, number][]; lengths: number[] }, d: number): [number, number] {
  for (let i = 0; i < ch.lengths.length; i++) {
    if (d <= ch.lengths[i]) {
      const k = d / ch.lengths[i], [ax, ay] = ch.points[i], [bx, by] = ch.points[i + 1];
      return [ax + (bx - ax) * k, ay + (by - ay) * k];
    }
    d -= ch.lengths[i];
  }
  return ch.points[ch.points.length - 1];
}

/**
 * How fast the idle wheels in a channel travel, from the spin of the rows either side (positive spin is counter-
 * clockwise, positive travel is toward B). A wheel rolls between the lower face of the vortex above and the upper face
 * of the one below, so it travels at the average of those faces' speeds: half the difference of the two spins. When
 * the rows turn together it only turns; when they differ, it travels: a current (Maxwell, Part II).
 */
export const channelFlow = (above: number, below: number) => (above - below) / 2;

/** Figure 7-2: Maxwell's vortices and idle wheels; a current from A to B sets the rows spinning, and the spin spreads outward. */
function MolecularVortices() {
  const [drive, setDrive] = useState(0.8);
  const [zeptons, setZeptons] = useState(false);
  const play = usePlayback();
  const H = 400, comb = useMemo(() => honeycomb(10, 58, 84), []), inner = ROWS.indexOf(-1);
  const fresh = () => ({ t: 0, rate: ROWS.map(() => 0), angle: ROWS.map(() => 0), offset: comb.channels.map(() => 0), roll: ROWS.map(() => 0) });
  const state = useRef(fresh());
  // Restart (or a step back) starts every row from rest again.
  if (play.t < state.current.t) state.current = fresh();
  const st = state.current, dt = Math.max(0, Math.min(0.1, play.t - st.t)), speed = 60; // surface speed at full spin, units a second
  st.t = play.t;
  // The rows either side of A–B take their spin from the current; each row further out from the row inside it.
  ROWS.forEach((row, i) => {
    const target = Math.abs(row) === 1 ? drive * Math.sign(-row) : st.rate[ROWS.indexOf(row - Math.sign(row))];
    st.rate[i] += (target - st.rate[i]) * Math.min(1, dt * 1.6);
    st.angle[i] += st.rate[i] * 140 * dt;
    st.roll[i] -= st.rate[i] * 420 * dt; // idle wheels turn against their vortices
  });
  // The channel along A–B carries the current itself; the others travel only while the rows either side differ.
  const flows = comb.channels.map((_, b) => (b === inner ? drive : channelFlow(st.rate[b], st.rate[b + 1])));
  flows.forEach((v, b) => { st.offset[b] += v * speed * dt; });
  const hex = (cx: number, cy: number) => pathThrough(Array.from({ length: 7 }, (_, k) => polar(cx, cy, CELL - 10, 30 + k * 60)));
  const wheel = (x: number, y: number, spin: number, key: string, travelling: number) => {
    const [ax, ay] = polar(x, y, 4, spin), [bx, by] = polar(x, y, 4, spin + 180), lit = travelling > 0.04;
    return <g key={key}>
      <circle cx={x} cy={y} r={4.6} className={lit ? 'bk-f-motion' : 'bk-f-faint'} opacity={lit ? 0.35 + 0.65 * Math.min(1, travelling) : 1}/>
      <line x1={ax} y1={ay} x2={bx} y2={by} className="bk-s-text" strokeWidth="1"/>
    </g>;
  };
  const lineY = comb.channels[inner].points[0][1] + CELL / 4;
  return <Diagram stage={
    <Stage w={W} h={H} label="Maxwell's hexagonal vortices with idle wheels in every channel between them, either side of a current from A to B. The vortices above spin one way and those below the other; the idle wheels along A–B travel with the current, and while outer rows catch up the wheels between them drift: induced currents.">
      {comb.cells.map((c, k) => {
        const rate = st.rate[c.r], angle = st.angle[c.r], [ax, ay] = polar(c.x, c.y, 16, angle), [bx, by] = polar(c.x, c.y, 16, angle + 180);
        return <g key={k}>
          <path d={hex(c.x, c.y)} className="bk-s-faint" fill="none" strokeWidth="1.2"/>
          {zeptons ? <Zepton x={c.x} y={c.y} angle={angle} len={30} oval={false} signs={false}/> : <>
            <line x1={ax} y1={ay} x2={bx} y2={by} className="bk-s-muted" strokeWidth="1.5"/>
            <T x={c.x} y={c.y + 5} tone={rate > 0.03 ? 'pos' : rate < -0.03 ? 'neg' : 'muted'} size="lg">{rate > 0.03 ? '+' : rate < -0.03 ? '−' : '·'}</T>
          </>}
        </g>;
      })}
      {comb.still.map((p, k) => wheel(p.x, p.y, st.roll[p.r] + k * 37, `s${k}`, 0))}
      {comb.channels.map((ch, b) => {
        const gap = CELL / 2.4, n = Math.floor(ch.total / gap), spin = (st.roll[b] + st.roll[b + 1]) / 2;
        return Array.from({ length: n }, (_, k) => {
          const d = (((k * gap + st.offset[b]) % ch.total) + ch.total) % ch.total, [x, y] = alongChannel(ch, d);
          return wheel(x, y, spin + k * 37, `c${b}-${k}`, Math.abs(flows[b]));
        });
      })}
      <T x={30} y={lineY + 5} tone="text" anchor="start">A</T><T x={W - 30} y={lineY + 5} tone="text" anchor="end">B</T>
      <T x={W / 2} y={H - 16} size="sm">+ and −: the way each vortex spins · small wheels: Maxwell’s idle wheels, lit while they travel</T>
    </Stage>}>
    <Dial label="Current from A to B" value={drive} min={-1} max={1} step={0.05} onChange={setDrive} marks={['B→A', 'off', 'A→B']} show={v => (v === 0 ? 'off' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'A to B' : 'B to A'}`)}/>
    <Toggle label="Show each vortex as a rotating zepton" checked={zeptons} onChange={setZeptons}/>
    <PlayBar play={play} label="the vortices"/>
    <Readout label="Nearest rows" value={`${Math.round(Math.abs(st.rate[inner]) * 100)} % of full spin`}/>
    <Readout label="Furthest row" value={`${Math.round(Math.abs(st.rate[0]) * 100)} % of full spin`}/>
    <Remark>Change the current and watch the outer rows lag: while they catch up, the idle wheels between them drift the other way. Those drifts are the induced currents that carry the rotation outward.</Remark>
  </Diagram>;
}

/** The path of a small charge past a fixed one under an inverse-square force, as points (screen coordinates). */
export function deflectionPath(start: [number, number], velocity: [number, number], centre: [number, number], strength: number, steps = 420): [number, number][] {
  let [x, y] = start, [vx, vy] = velocity;
  const points: [number, number][] = [[x, y]];
  for (let i = 0; i < steps; i++) {
    const dx = x - centre[0], dy = y - centre[1], d2 = Math.max(dx * dx + dy * dy, 400), d = Math.sqrt(d2);
    vx += (strength * dx) / (d2 * d); vy += (strength * dy) / (d2 * d);
    x += vx; y += vy;
    points.push([x, y]);
    if (x < 0 || x > W || y < 0 || y > 400) break;
  }
  return points;
}

/** Figure 7-3: a moving charge deflected by a fixed one, through the pressure of the zeptons between them. */
function ElectricDeflection() {
  const [sign, setSign] = useState<'pos' | 'neg'>('pos');
  const [offset, setOffset] = useState(130);
  const play = usePlayback({ speed: 0.3 });
  const H = 400, body: [number, number] = [320, 190], q = sign === 'pos' ? 1 : -1;
  const path = useMemo(() => deflectionPath([body[0] + offset, H - 20], [0, -1.4], body, q * 40), [offset, q]);
  const [mode, setMode] = useState<FieldMode>('zeptons');
  const [push, setPush] = useState(false);
  const index = Math.min(path.length - 1, Math.floor((play.t % 1.15) * path.length)), [px, py] = path[index], near = Math.hypot(px - body[0], py - body[1]) < 130;
  // Both charges are sources, so the zeptons between them re-polarize continuously as the small one moves, as in the
  // two-charge figures of chapter 6 (6-11, 6-13).
  const sources = useMemo<Source[]>(() => [{ x: body[0], y: body[1], q: 1.5 }, { x: px, y: py, q }], [px, py, q]);
  const [ex, ey] = path[path.length - 1], drift = ex - (body[0] + offset);
  const d = Math.hypot(px - body[0], py - body[1]) || 1, ux = (px - body[0]) / d, uy = (py - body[1]) / d, s = q > 0 ? 1 : -1;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A small ${sign === 'pos' ? 'positive' : 'negative'} charge moving up the page past a larger fixed positive charge, with the field of both drawn as ${mode === 'both' ? 'lines and zeptons' : mode}. ${q > 0 ? 'Between the two like charges the zeptons turn aside and crowd: the pressure builds up and the charge is deflected away.' : 'Between the opposite charges the zeptons bridge from one to the other: the pressure between is lower and the charge is deflected toward the fixed one.'}`}>
      {/* The zeptons stay where they are and turn to the field as the charge moves (p. 56), so nothing jumps; the lines are re-traced. */}
      {mode !== 'zeptons' && <FieldPicture sources={sources} w={W} h={H} perUnit={9} lines={mode === 'both' ? 0.45 : 1} zeptons={0}/>}
      {mode !== 'lines' && <FieldZeptons sources={sources} w={W} h={H} t={play.t} spacing={27} zeptonLen={15} radii={[24, 10]}/>}
      <Line d={pathThrough(path)} tone="motion" w={1.6} dash="5 4"/>
      {push && near && <>
        <BlockArrow x1={px + s * ux * 16} y1={py + s * uy * 16} x2={px + s * ux * 56} y2={py + s * uy * 56} thick={10}/>
        <BlockArrow x1={body[0] - s * ux * 30} y1={body[1] - s * uy * 30} x2={body[0] - s * ux * 70} y2={body[1] - s * uy * 70} thick={10}/>
      </>}
      <Charge x={body[0]} y={body[1]} sign={1} r={24}/>
      <Charge x={px} y={py} sign={q as 1 | -1} r={10}/>
    </Stage>}>
    <Choice label="Moving charge" value={sign} onChange={setSign} options={[{ value: 'pos', label: 'Positive' }, { value: 'neg', label: 'Negative' }]}/>
    <Choice label="Draw the field as" value={mode} onChange={setMode} options={[{ value: 'lines', label: 'Lines' }, { value: 'zeptons', label: 'Zeptons' }, { value: 'both', label: 'Both' }]}/>
    <Toggle label="Show the push on each charge" checked={push} onChange={setPush}/>
    <Slider label="How wide of the fixed charge it starts" value={offset} min={110} max={200} step={5} onChange={setOffset} unit="units"/>
    <PlayBar play={play} label="the moving charge"/>
    <Readout label="Deflected" value={`${Math.abs(Math.round(drift))} units ${drift > 0 ? 'away' : 'toward'}`} tone="force"/>
    <Remark>{q > 0 ? 'The two fields of zeptons repel each other, building up pressure in between, and the pressure deflects the moving body away.' : 'A moving negative charge is deflected in the opposite direction.'}</Remark>
  </Diagram>;
}

/** The radius of the circle a charge follows in a field of spinning zeptons: larger for a weaker field. */
export const sweepRadius = (strength: number) => 520 / Math.max(strength, 0.05);

/** Figure 7-5: a moving charge swept aside by a field of rotating zepton dipoles. */
function MagneticDeflection() {
  const [clockwise, setClockwise] = useState(true);
  const [sign, setSign] = useState<'pos' | 'neg'>('pos');
  const [strength, setStrength] = useState(1.6);
  const play = usePlayback({ speed: 0.3 });
  const H = 400, x0 = 360, y0 = H - 20, top = 300, q = sign === 'pos' ? 1 : -1;
  // A positive charge moving up the page is swept left by clockwise dipoles (a field into the page), right by
  // counter-clockwise ones; a negative charge goes the other way.
  const side = (clockwise ? -1 : 1) * q, R = sweepRadius(strength);
  const path = useMemo(() => {
    const points: [number, number][] = [[x0, y0], [x0, top]];
    for (let a = 0; a <= 1.6; a += 0.02) { const x = x0 + side * R * (1 - Math.cos(a)), y = top - R * Math.sin(a); if (y < 10 || x < 10 || x > W - 10) break; points.push([x, y]); }
    return points;
  }, [side, R]);
  const index = Math.min(path.length - 1, Math.floor((play.t % 1.15) * path.length)), [px, py] = path[index];
  return <Diagram stage={
    <Stage w={W} h={H} label={`A ${sign === 'pos' ? 'positive' : 'negative'} charge moving up the page into a field of zepton dipoles spinning ${clockwise ? 'clockwise' : 'counter-clockwise'}. It is swept to the ${side < 0 ? 'left' : 'right'}.`}>
      <rect x={30} y={20} width={W - 60} height={top - 20} rx={8} className="bk-fill-panel"/>
      {Array.from({ length: 4 }, (_, r) => Array.from({ length: 8 }, (_, c) => {
        const x = 80 + c * 80, y = 56 + r * 66;
        return <g key={`${r}-${c}`} opacity={0.3 + 0.25 * strength}><Zepton x={x} y={y} angle={(clockwise ? -1 : 1) * play.t * 260 * strength + (r * 8 + c) * 47} len={26} oval={false} signs={false}/>{(r + c) % 3 === 0 && <Spin x={x} y={y} r={20} ccw={!clockwise} sweep={200} opacity={0.7}/>}</g>;
      }))}
      <T x={W - 44} y={44} anchor="end" size="sm" tone="b">B {clockwise ? 'into the page' : 'out of the page'}</T><InOut x={W - 56 - (clockwise ? 104 : 116)} y={40} out={!clockwise} r={7}/>
      <Line d={pathThrough(path)} tone="motion" w={1.6} dash="5 4"/>
      <Charge x={px} y={py} sign={q as 1 | -1} r={11}/>
      <T x={x0 + 14} y={H - 26} anchor="start" size="sm">no field here: a straight path</T>
    </Stage>}>
    <Choice label="Dipoles spin" value={clockwise ? 'cw' : 'ccw'} onChange={v => setClockwise(v === 'cw')} options={[{ value: 'cw', label: 'Clockwise' }, { value: 'ccw', label: 'Counter' }]}/>
    <Choice label="Moving charge" value={sign} onChange={setSign} options={[{ value: 'pos', label: 'Positive' }, { value: 'neg', label: 'Negative' }]}/>
    <Slider label="Strength of the field (rate of spin)" value={strength} min={0.4} max={3} step={0.1} onChange={setStrength}/>
    <PlayBar play={play} label="the moving charge"/>
    <Readout label="Swept to the" value={side < 0 ? 'left' : 'right'} tone="force"/>
    <Remark>The rotation of the dipoles is in the same plane as the motion of the body, and sweeps it to the side.</Remark>
  </Diagram>;
}

type Law = 'gauss' | 'gaussB' | 'faraday' | 'ampere';

/** Explorer: Maxwell's four equations, each beside what the chapter says it means for zeptons. */
function FourEquations() {
  const [law, setLaw] = useState<Law>('gauss');
  const [amount, setAmount] = useState(0.6);
  const play = usePlayback();
  const H = 300, cx = 360, cy = 150;
  const charge = useMemo<Source[]>(() => [{ x: cx, y: cy, q: -1 }], []);
  const label = { gauss: 'Gauss’s Law', gaussB: 'Gauss’s Law for Magnetism', faraday: 'Faraday’s Law of Induction', ampere: 'Ampère’s law with Maxwell’s correction' }[law];
  return <Diagram stage={
    <Stage w={W} h={H} label={`${label}, drawn in terms of zeptons.`}>
      {law === 'gauss' && <><FieldPicture sources={charge} w={W} h={H} perUnit={12} lines={0} zeptons={0.9} t={play.t} zeptonLen={15}/><circle cx={cx} cy={cy} r={50 + 80 * amount} className="bk-s-mark" fill="none" strokeWidth="2" strokeDasharray="5 4"/><Charge x={cx} y={cy} sign={-1} r={13}/><T x={cx} y={H - 12} size="sm" tone="mark">the same total orientation through any surface round the charge</T></>}
      {law === 'gaussB' && <>{[-140, 0, 140].map(dx => <g key={dx}><SpinLoop x={cx + dx} y={cy} angle={90} r={26} turn={play.t * 240} tone="motion"/><Arrow x1={cx + dx} y1={cy - 34} x2={cx + dx} y2={cy - 34 - 70 * amount} tone="b" w={3}/><Arrow x1={cx + dx} y1={cy + 34 + 70 * amount} x2={cx + dx} y2={cy + 34} tone="b" w={3}/></g>)}<T x={cx} y={H - 12} size="sm" tone="b">above each spinning dipole the field is equal and opposite to the field below: the sum is zero</T></>}
      {law === 'faraday' && (() => { const x = 180 + (((play.t * 220 * amount) % 360)); return <>{Array.from({ length: 5 }, (_, r) => Array.from({ length: 9 }, (_, c) => <InOut key={`${r}-${c}`} x={140 + c * 55} y={40 + r * 48} out={false} r={6} opacity={0.5}/>))}<rect x={x - 5} y={40} width={10} height={192} rx={3} className="bk-plate"/><Arrow x1={x + 12} y1={cy - 10} x2={x + 12 + 60 * amount} y2={cy - 10} tone="motion" w={2}/><Arrow x1={x} y1={228} x2={x} y2={228 - 150 * amount} tone="e" w={3}/><T x={cx} y={H - 12} size="sm" tone="e">the faster the conductor crosses the flux, the higher the electromotive force</T></>; })()}
      {law === 'ampere' && <>{[60, 110].map(r => <g key={r}><circle cx={cx} cy={cy} r={r} className="bk-s-b" fill="none" strokeWidth={0.6 + 2 * amount}/><Arrow x1={cx + r} y1={cy + 6} x2={cx + r} y2={cy - 6} tone="b" w={0.1} head={11}/></g>)}<circle cx={cx} cy={cy} r={16} className="bk-plate"/><InOut x={cx} y={cy} out r={8} tone="text"/>{[0, 60, 120, 180, 240, 300].map(a => { const [x, y] = polar(cx, cy, 85, a + 30); return <Zepton key={a} x={x} y={y} angle={play.t * 200 * amount + a} len={20} oval={false} signs={false} opacity={0.8}/>; })}<T x={cx} y={H - 12} size="sm" tone="b">a larger current, or a faster change in the polarization of the zeptons: a larger magnetic field</T></>}
    </Stage>}>
    <Choice label="Equation" value={law} onChange={setLaw} options={[{ value: 'gauss', label: '7-1' }, { value: 'gaussB', label: '7-3' }, { value: 'faraday', label: '7-4' }, { value: 'ampere', label: '7-6' }]}/>
    <Slider label={{ gauss: 'Size of the surface', gaussB: 'Strength of the spin', faraday: 'Speed of the conductor', ampere: 'Current, and rate of change' }[law]} value={amount} min={0.1} max={1} step={0.05} onChange={setAmount} show={v => `${Math.round(v * 100)} %`}/>
    <PlayBar play={play} label="the diagram"/>
    <Readout label="Law" value={label}/>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 7,
  summary: <>
    <p>Maxwell reached his equations by picturing space filled with <Q>molecular vortices</Q>. Fleming’s claim is that the picture was right for magnetism: <Q>The vortices are rotating zepton dipoles</Q> (<Pg n={68}/>). What Maxwell lacked was the particle dipole, so he <Q>did not see that static electric currents could be simply considered to be non-rotating electric dipoles</Q> (<Pg n={63}/>).</p>
    <p>The chapter then reads the two ways a field moves a charge. An electric field deflects it by the pressure of the zeptons between; a magnetic field, which is spinning dipoles, sweeps it sideways. Each of Maxwell’s four equations is restated in those terms.</p>
  </>,
  items: [
    {
      kind: 'figure', id: '7-1', page: 62, title: 'Maxwell’s current in a field of vortices',
      caption: 'Figure 6 From Maxwell’s “On Physical Lines of Force” Part I “The Theory of Molecular Vortices applied to Magnetic Phenomena” described in the above quote.',
      Diagram: CurrentInField,
      text: <>
        <p>The chapter opens with Maxwell’s own description. The field runs from s to n; C is <Q>an ascending magnetic current perpendicular to the paper</Q>, whose lines of force are circles <Q>in the direction n w s e</Q>. <Q>At e the lines of force will be the sum of those of the field and of the current and at w they will be the difference of the two sets of lines; so that the vortices on the east side of the current will be more powerful than those on the west side</Q>, and <Q>the resultant effect on the current is to urge it towards the west</Q> (<Pg n={62}/>).</p>
      </>,
      tryThis: ['Compare the two readouts: the lines add at e and subtract at w.', 'Turn the current up and down: its circles crowd in or thin out. The field’s slider does the same for its straight lines.', 'Reverse the current: its circles reverse, the stronger side changes, and the current is urged east.', 'Set either slider to zero. With no field, or no current, the two sides are equal and nothing is urged anywhere.'],
      notes: <>
        <p>The numbers are in arbitrary units. That the push follows the difference of the squares of the two strengths is a display choice (Maxwell’s pressure is greater where the vortices are more powerful; neither he nor Fleming gives a formula here).</p>
        <p>The density of the lines shows strength: the field’s straight lines grow in number with its strength (six at the starting setting, as printed), and the current’s circles with the current, spaced more widely further out because the strength round a straight current falls as 1/<i>r</i>.</p>
      </>,
    },
    {
      kind: 'figure', id: '7-2', page: 63, section: 'On Physical Lines of Force', title: 'Vortices set spinning by a current',
      caption: 'Figure 2 From Maxwell’s “On Physical Lines of Force” Part II “The Theory of Molecular Vortices applied to Electric Currents” showing a current moving from A to B causing the adjacent vortices to spin in opposite directions. The + and – signs indicate direction of spin rather than charge. After considering the induced currents and rotations of vortices on page 291 he concludes with the below quotation.',
      Diagram: MolecularVortices,
      text: <>
        <p>Maxwell’s conclusion, which Fleming quotes: <Q>the phenomena of induced currents are part of the process of communicating the rotary velocity of the vortices from one part of the field to the other</Q> (<Pg n={63}/>).</p>
        <p>This is the picture of Figures 6-14 and 6-15 seventy years early: vortices on opposite sides of a current spin opposite ways. <Q>Only now with zero-point field theory firmly established can we recognize that Maxwell’s vortex theory of magnetism was essentially correct.</Q></p>
      </>,
      tryThis: [
        'Watch the signs: + above the line, − below. They mark the direction of spin, not charge.',
        'Watch the idle wheels: between vortices turning together they only turn; along A–B they travel, and that travel is the current.',
        'Reverse the current. The change spreads outward a row at a time, and while each row catches up the wheels between it and the next drift the other way: Maxwell’s induced currents.',
        'Turn on “Show each vortex as a rotating zepton” for Fleming’s reading of the same drawing.',
      ],
      notes: <>
        <p>The idle wheels follow Maxwell’s mechanism in the paper the figure comes from: a wheel rolls between the faces of the vortices either side, so it travels at half the difference of their spins. Where they turn together it only turns; where they differ, it travels, and a travelling layer of wheels is a current.</p>
        <p>The rate at which rotation passes from row to row, and the sizes and speeds drawn, are display choices.</p>
      </>,
      labs: [{ lab: 'electron', scenario: 'moving', why: 'Rotation induced in the pairs beside a moving electron.' }],
    },
    {
      kind: 'figure', id: '7-3', page: 64, title: 'An electric field deflects by pressure',
      caption: 'A simple static electric interaction between a small moving positively charged body and a larger positively charged body.',
      Diagram: ElectricDeflection,
      text: <p>The fixed positive body is surrounded by zepton dipoles with their negative ends toward it; the approaching particle has its own. <Q>As the second particle moves toward the first the two fields of zeptons will interact, repelling each other building up pressure in between. The increased pressure of the vacuum deflects the moving positively charged body away from the static charge. A moving negative charge is deflected in the opposite direction</Q> (<Pg n={64}/>).</p>,
      tryThis: [
        'Run it with a positive charge and watch the zeptons between the two: as it nears, they turn aside and crowd together, as between the like charges of Figure 6-11, and the path bends away.',
        'Make the moving charge negative: the zeptons bridge from one charge to the other, as in Figure 6-13, and it bends toward the fixed charge.',
        'Start it closer to the fixed charge: the zeptons between are squeezed harder and the deflection is sharper.',
        'Switch the field to Lines or Both to compare with Faraday’s picture of the same moment.',
      ],
      notes: <>
        <p>The sentence about the negative charge ends <Q>as the pressure between two like charges is lower than the natural background pressure</Q>. Chapter 6 gives lower pressure between <em>opposite</em> charges, which is the case being described, so “like” there reads as a slip. The diagram follows chapter 6.</p>
        <p>The path is computed for an inverse-square force in arbitrary units. The zeptons stay where they are and turn to the field of both charges at each moment, polarized more fully where it is stronger: as the charge moves <Q>the dipoles change their orientation in order to stay aligned</Q> (<Pg n={56}/>). The chains of Figures 6-11 and 6-13 show in them as Faraday’s lines show in iron filings. The printed figure shows the two bodies only; the spacing of the zeptons is a display choice.</p>
      </>,
      labs: [{ lab: 'casimir', scenario: 'electron-electron', why: 'The build-up of pressure between two like charges, with the charges free to move.' }],
    },
    {
      kind: 'figure', id: '7-4', page: 65, title: 'The right hand rule for the magnetic force',
      caption: 'Placement of fingers for the right hand rule memory device.',
      Diagram: FlemingHand,
      text: <>
        <p><Q>The second finger points in the direction of the magnetic field, the first finger points in the direction of motion of the particle, and the thumb points in the direction of the force on the particle.</Q> Fleming calls it <Q>not the most intuitive scheme</Q>: one expects the particle to be pushed along the field, not at 90 degrees to it (<Pg n={65}/>).</p>
        <p>This rule is John Ambrose Fleming’s, and is different from the grip rule of Figure 6-16.</p>
      </>,
      tryThis: [
        'Hold your own right hand the same way: thumb up, first finger pointing away from you, second finger to the left.',
        'Change the charge to negative: the force reverses, and the drawing becomes a left hand with its thumb down. Reversing the charge is the same as changing hands.',
      ],
      notes: <>
        <p>The hand is Fleming’s own drawing, traced from the book. The first finger is drawn up and to the left; in perspective it points into the page, at right angles to the other two. The rule is the cross product motion × field, which is how Equation 8-7 writes it. For a negative charge the drawing is mirrored into a left hand, which gives the reversed force.</p>
        <p>The book credits the rule to John Ambrose Fleming. His rule for the force on a current (motors) is left-handed, with the first finger along the field and the second along the current; this right-handed version swaps the two fingers, and swapping two fingers is the same as changing hands, so both give the same force.</p>
      </>,
    },
    {
      kind: 'figure', id: '7-5', page: 66, title: 'A spinning dipole field sweeps the charge aside',
      caption: 'A simple electromagnetic interaction between a small moving positively charged body and a rotating zepton dipole.',
      Diagram: MagneticDeflection,
      text: <>
        <p><Q>The magnetic field direction now just tells us the direction of spin of the dipoles, not to be confused at all with the direction of force. The rotation of the dipoles is now in the same plane as the body moving through the field</Q>. <Q>A positive charge is deflected to the left by a clockwise spinning dipole field, a downward directed magnetic field</Q> (<Pg n={65}/>).</p>
        <p>Negative charges deflect the other way, so that <Q>mechanically we have to think of a negative charge acting like a positive charge moving backwards through time</Q>. As with every force, <Q>it is ultimately a pressure differential that produces movement</Q> (<Pg n={66}/>).</p>
      </>,
      tryThis: ['Run it as it starts: a positive charge, clockwise dipoles, swept to the left.', 'Reverse the spin, or the sign of the charge: swept to the right. Reverse both: left again.', 'Raise the rate of spin and the path curls more tightly.'],
      notes: <p>The printed figure shows one dipole; a field of them is drawn here. The path is the circular arc of the Lorentz force (Equation 8-7), and its radius for a given rate of spin is a display choice.</p>,
      labs: [{ lab: 'electron', scenario: 'moving', why: 'The rotating pairs that make the magnetic field of a moving charge.' }],
    },
    {
      kind: 'explorer', id: 'x7-1', page: 66, section: 'Maxwell’s Equations', title: 'The four equations, read as zeptons',
      Diagram: FourEquations,
      text: <>
        <Eq n="7-1">∮ <V>E</V>·d<V>A</V> = <Frac top={<V>Q</V>} bottom={<>ε<sub>0</sub></>}/></Eq>
        <p>Gauss’s Law: <Q>the total amount of dipole orientation will be the same taken over any area around the charge</Q> (<Pg n={66}/>). Coulomb’s Law (Equation 7-2) restates it.</p>
        <Eq n="7-3">∮ <V>B</V>·d<V>A</V> = 0</Eq>
        <p>Gauss’s Law for Magnetism: <Q>the magnetic field above each dipole is equal but opposite to the magnetic field below it. If you put a bunch of rotating zepton dipoles together, the magnetic field always adds up to zero</Q> (<Pg n={67}/>).</p>
        <Eq n="7-4">∮ <V>E</V>·d<V>l</V> = − <Frac top={<>dΦ<sub>B</sub></>} bottom={<>d<V>t</V></>}/></Eq>
        <p>Faraday’s Law: the faster a conductor moves through the flux, the higher the electromotive force.</p>
        <Eq n="7-6">∮ <V>B</V>·d<V>l</V> = μ<sub>0</sub>(<V>I</V> + ε<sub>0</sub> <Frac top={<>dΨ<sub>E</sub></>} bottom={<>d<V>t</V></>}/>)</Eq>
        <p>Ampère’s law with Maxwell’s displacement current, which is <Q>the rate of change of polarization of the vacuum</Q>: of the zeptons (<Pg n={68}/>).</p>
      </>,
      tryThis: ['Step through the four with the Equation control; the slider changes the one thing each law is about.', 'In 7-1, grow the surface: the zeptons crossing it thin out, but their total is unchanged (Figure 6-4).'],
      notes: <p>These four small drawings are illustrations of the sentences quoted; the book gives the equations without figures.</p>,
    },
  ],
  labs: [{ lab: 'electron', scenario: 'moving', why: 'A moving electron and the rotation it induces: the zepton form of this chapter’s magnetic field.' }],
};
/**
 * Figure 7-4: Fleming's own drawing of the hand, traced from the book, with the three directions laid along it. The
 * first finger is drawn up and to the left: in perspective it points into the page. For a negative charge the force
 * reverses, which is the same rule with the left hand: the drawing is mirrored top to bottom, thumb down.
 */
function FlemingHand() {
  const [negative, setNegative] = useState(false);
  const W = 720, H = 360, scale = 2.1, ox = 250, oy = 30, flip = negative ? -1 : 1;
  // The left hand is the right hand mirrored top to bottom, in the same box.
  const at = ([x, y]: readonly [number, number]): [number, number] => [ox + x * scale, oy + (negative ? HAND_SIZE.h - y : y) * scale];
  // An arrow carrying on from a fingertip the way the finger points.
  const along = (digit: { base: readonly [number, number]; tip: readonly [number, number] }, from: number, to: number) => {
    const [bx, by] = at(digit.base), [tx, ty] = at(digit.tip), d = Math.hypot(tx - bx, ty - by), ux = (tx - bx) / d, uy = (ty - by) / d;
    return { x1: tx + ux * from, y1: ty + uy * from, x2: tx + ux * to, y2: ty + uy * to };
  };
  const motion = along(HAND_DIGITS.index, 14, 104), field = along(HAND_DIGITS.middle, 14, 112), force = along(HAND_DIGITS.thumb, 10, negative ? 68 : 82);
  const hand = negative ? 'left' : 'right';
  return <Diagram stage={
    <Stage w={W} h={H} label={`Fleming's rule with the ${hand} hand, drawn as in the book${negative ? ' but mirrored' : ''}. The second finger points along the magnetic field, to the left; the first finger points along the motion, into the page; the thumb points ${negative ? 'down' : 'up'}, the direction of the force on a ${negative ? 'negative' : 'positive'} charge.`}>
      <g transform={`translate(${ox} ${negative ? oy + HAND_SIZE.h * scale : oy}) scale(${scale} ${flip * scale})`}><path d={HAND_PATH} fillRule="evenodd" className="bk-f-text" opacity={0.85}/></g>
      <Arrow x1={motion.x1} y1={motion.y1} x2={motion.x2} y2={motion.y2} tone="motion" w={3.5} head={13}/>
      <T x={motion.x2 - 8} y={motion.y2 - 12 * flip} tone="motion" anchor="end">motion</T><T x={motion.x2 - 8} y={motion.y2 + (negative ? 30 : 6)} size="sm" tone="motion" anchor="end">first finger, into the page</T>
      <Arrow x1={field.x1} y1={field.y1} x2={field.x2} y2={field.y2} tone="b" w={3.5} head={13}/>
      <T x={field.x2 - 8} y={field.y2 - 4} tone="b" anchor="end">field B</T><T x={field.x2 - 8} y={field.y2 + 14} size="sm" tone="b" anchor="end">second finger</T>
      <Arrow x1={force.x1} y1={force.y1} x2={force.x2} y2={force.y2} tone="force" w={5} head={15}/>
      <T x={force.x2 + 14} y={force.y2 + (negative ? -6 : 10)} tone="force" anchor="start">force</T><T x={force.x2 + 14} y={force.y2 + (negative ? 12 : 28)} size="sm" tone="force" anchor="start">thumb</T>
      <T x={20} y={H - 14} size="sm" anchor="start">{negative ? 'left hand: for a negative charge' : 'right hand: for a positive charge'}</T>
    </Stage>}>
    <Choice label="Charge" value={negative ? 'neg' : 'pos'} onChange={v => setNegative(v === 'neg')} options={[{ value: 'pos', label: 'Positive' }, { value: 'neg', label: 'Negative' }]}/>
    <Readout label="Force" value={negative ? 'down: the left thumb' : 'up: the right thumb'} tone="good"/>
    <Remark>{negative ? 'A negative charge feels the opposite force: the same rule with the left hand, its thumb pointing down.' : 'The force is at right angles to both the motion and the field, which is why the magnetic interaction is harder to picture than the electric one.'}</Remark>
  </Diagram>;
}

export default chapter;
