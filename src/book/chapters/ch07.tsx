// Chapter 7: Maxwell's Equations (PDF pp. 62–69). Figures 7-1 to 7-5.
import { useMemo, useRef, useState } from 'react';
import { Action, Arrow, BlockArrow, Charge, Choice, Diagram, FieldPicture, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, SpinLoop, Stage, Still, T, Toggle, Zepton, clamp, fmt, pathThrough, polar, usePlayback, type Source } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';
import { HandRule } from './shared';

const W = 720;

/** Figure 7-1: Maxwell's current in a field. The lines add on one side and subtract on the other, and the current is urged across. */
function CurrentInField() {
  const [field, setField] = useState(0.7);
  const [current, setCurrent] = useState(0.7);
  const H = 380, cx = 360, cy = 190;
  // At the east point the current's circular lines run with the field; at the west point against it.
  const east = field + current * 0.6, west = field - current * 0.6, push = (east ** 2 - west ** 2) * 60;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A magnetic field pointing up the page from s to n, and a current ${current >= 0 ? 'rising out of' : 'going into'} the page at C. The lines of force are ${fmt(Math.abs(east), 2)} on the east side and ${fmt(Math.abs(west), 2)} on the west side, so the current is urged toward the ${push > 0 ? 'west' : push < 0 ? 'east' : 'neither side'}.`}>
      {field > 0.02 && Array.from({ length: 6 }, (_, i) => <Arrow key={i} x1={210 + i * 60} y1={H - 40} x2={210 + i * 60} y2={40} tone="b" w={1 + 1.6 * field} opacity={0.75}/>)}
      {Math.abs(current) > 0.02 && [50, 95, 140].map(r => <g key={r} opacity={0.9}><circle cx={cx} cy={cy} r={r} className="bk-s-motion" fill="none" strokeWidth={1 + Math.abs(current)} strokeDasharray="6 4"/>
        {[0, 180].map(a => { const [x, y] = polar(cx, cy, r, a), s = current > 0 ? 1 : -1; return <Arrow key={a} x1={x} y1={y + s * (a === 0 ? 8 : -8)} x2={x} y2={y - s * (a === 0 ? 8 : -8)} tone="motion" w={0.1} head={11}/>; })}</g>)}
      <circle cx={cx} cy={cy} r={17} className="bk-plate"/><InOut x={cx} y={cy} out={current >= 0} r={9} tone="text"/><T x={cx + 4} y={cy + 40} tone="text">C</T>
      {Math.abs(push) > 1 && <BlockArrow x1={cx - Math.sign(push) * 24} y1={cy} x2={cx - Math.sign(push) * (24 + Math.min(110, Math.abs(push)))} y2={cy} thick={14}/>}
      <T x={cx} y={24} tone="text">n</T><T x={cx} y={H - 14} tone="text">s</T><T x={36} y={cy + 5} tone="text">w</T><T x={W - 36} y={cy + 5} tone="text">e</T>
      <Spin x={W - 90} y={cy} r={8 + 22 * clamp(Math.abs(east) / 1.4)} ccw={east >= 0} sweep={300}/><T x={W - 90} y={cy + 52} size="sm">vortices: {fmt(Math.abs(east), 2)}</T>
      <Spin x={90} y={cy} r={8 + 22 * clamp(Math.abs(west) / 1.4)} ccw={west >= 0} sweep={300}/><T x={90} y={cy + 52} size="sm">vortices: {fmt(Math.abs(west), 2)}</T>
    </Stage>}>
    <Slider label="Strength of the field" value={field} min={0} max={1} step={0.05} onChange={setField}/>
    <Slider label="Current at C" value={current} min={-1} max={1} step={0.05} onChange={setCurrent} show={v => (v === 0 ? 'none' : `${fmt(Math.abs(v), 2)} ${v > 0 ? 'ascending' : 'descending'}`)}/>
    <Readout label="Lines of force at e" value={fmt(Math.abs(east), 2)} tone="b"/>
    <Readout label="Lines of force at w" value={fmt(Math.abs(west), 2)} tone="b"/>
    <Readout label="Current is urged" value={Math.abs(push) < 1 ? 'nowhere' : push > 0 ? 'toward the west' : 'toward the east'} tone="force"/>
    <Remark>The more powerful vortices are on the side where the two sets of lines add, and they push the current toward the other side.</Remark>
  </Diagram>;
}

/** The rows of Maxwell's vortices: how far each is from the line of the current, and which side. */
const ROWS = [-3, -2, -1, 1, 2];

/** Figure 7-2: a current between rows of vortices sets them spinning, opposite ways on each side, row after row. */
function MolecularVortices() {
  const [drive, setDrive] = useState(0.8);
  const [zeptons, setZeptons] = useState(false);
  const play = usePlayback();
  const state = useRef({ t: 0, rate: ROWS.map(() => 0), angle: ROWS.map(() => 0), flow: 0 });
  // Restart (or a step back) starts every row from rest again.
  if (play.t < state.current.t) state.current = { t: 0, rate: ROWS.map(() => 0), angle: ROWS.map(() => 0), flow: 0 };
  // Each row takes its rotation from the row nearer the current, so the motion spreads outward a row at a time.
  const dt = Math.max(0, Math.min(0.1, play.t - state.current.t));
  state.current.t = play.t;
  state.current.flow += drive * 60 * dt;
  ROWS.forEach((row, i) => {
    const side = Math.sign(row), inner = Math.abs(row) === 1 ? drive * side : state.current.rate[ROWS.indexOf(row - side)];
    state.current.rate[i] += (inner - state.current.rate[i]) * Math.min(1, dt * 1.6);
    state.current.angle[i] += state.current.rate[i] * 140 * dt;
  });
  const H = 400, size = 34, line = 228, hex = (cx: number, cy: number) => pathThrough(Array.from({ length: 7 }, (_, k) => polar(cx, cy, size, 30 + k * 60)));
  return <Diagram stage={
    <Stage w={W} h={H} label={`Maxwell's hexagonal vortices either side of a line from A to B. With a current along the line the vortices above spin one way and those below the other; rows further from the line follow after a delay.`}>
      {ROWS.map((row, i) => {
        const y = line + row * 62 - Math.sign(row) * 16, shift = Math.abs(row) % 2 ? 0 : 31;
        return Array.from({ length: 9 }, (_, c) => {
          const x = 86 + c * 68 + shift, rate = state.current.rate[i], angle = state.current.angle[i];
          return <g key={`${row}-${c}`}>
            <path d={hex(x, y)} className="bk-s-faint" fill="none" strokeWidth="1.2"/>
            {zeptons ? <Zepton x={x} y={y} angle={angle} len={34} oval={false} signs={false}/> : <>
              <line x1={polar(x, y, 22, angle)[0]} y1={polar(x, y, 22, angle)[1]} x2={polar(x, y, 22, angle + 180)[0]} y2={polar(x, y, 22, angle + 180)[1]} className="bk-s-muted" strokeWidth="1.5"/>
              <T x={x} y={y + 5} tone={rate > 0.03 ? 'pos' : rate < -0.03 ? 'neg' : 'muted'} size="lg">{rate > 0.03 ? '+' : rate < -0.03 ? '−' : '·'}</T>
            </>}
          </g>;
        });
      })}
      <line x1={30} y1={line - 16} x2={W - 30} y2={line - 16} className="bk-s-motion" strokeWidth="1" strokeDasharray="3 4"/>
      {Array.from({ length: 16 }, (_, k) => <circle key={k} cx={30 + ((((k * 42 + state.current.flow) % 660) + 660) % 660)} cy={line - 16} r={5} className="bk-f-motion"/>)}
      <T x={22} y={line - 28} tone="text" anchor="start">A</T><T x={W - 22} y={line - 28} tone="text" anchor="end">B</T>
    </Stage>}>
    <Slider label="Current from A to B" value={drive} min={-1} max={1} step={0.05} onChange={setDrive} show={v => (v === 0 ? 'none' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'A to B' : 'B to A'}`)}/>
    <Toggle label="Show each vortex as a rotating zepton" checked={zeptons} onChange={setZeptons}/>
    <PlayBar play={play} label="the vortices"/>
    <Readout label="Nearest rows" value={`${Math.round(Math.abs(state.current.rate[2]) * 100)} % of full spin`}/>
    <Readout label="Furthest row" value={`${Math.round(Math.abs(state.current.rate[0]) * 100)} % of full spin`}/>
    <Remark>Change the current and watch the furthest row lag behind: induced currents are part of communicating the rotation from one part of the field to the other.</Remark>
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
  const [offset, setOffset] = useState(60);
  const play = usePlayback({ speed: 0.3 });
  const H = 400, body: [number, number] = [320, 190], q = sign === 'pos' ? 1 : -1;
  const path = useMemo(() => deflectionPath([body[0] + offset, H - 20], [0, -1.4], body, q * 40), [offset, q]);
  const sources = useMemo<Source[]>(() => [{ x: body[0], y: body[1], q: 1.5 }], []);
  const index = Math.min(path.length - 1, Math.floor((play.t % 1.15) * path.length)), [px, py] = path[index], near = Math.hypot(px - body[0], py - body[1]) < 130;
  const [ex, ey] = path[path.length - 1], drift = ex - (body[0] + offset);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A small ${sign === 'pos' ? 'positive' : 'negative'} charge moving up the page past a larger fixed positive charge. It is deflected ${drift > 0 ? 'away from' : 'toward'} the fixed charge.`}>
      <FieldPicture sources={sources} w={W} h={H} perUnit={8} lines={0} zeptons={0.5} t={play.t} zeptonLen={15}/>
      <Line d={pathThrough(path)} tone="motion" w={1.6} dash="5 4"/>
      {near && <circle cx={(px + body[0]) / 2} cy={(py + body[1]) / 2} r={26} className={q > 0 ? 'bk-s-danger' : 'bk-s-accent'} fill="none" strokeWidth="1.5" strokeDasharray="3 3"/>}
      {near && <T x={(px + body[0]) / 2} y={(py + body[1]) / 2 - 34} size="sm" tone={q > 0 ? 'danger' : 'accent'}>{q > 0 ? 'pressure builds up between' : 'pressure between is lower'}</T>}
      <Charge x={body[0]} y={body[1]} sign={1} r={24}/>
      <Charge x={px} y={py} sign={q as 1 | -1} r={10}/>
    </Stage>}>
    <Choice label="Moving charge" value={sign} onChange={setSign} options={[{ value: 'pos', label: 'Positive' }, { value: 'neg', label: 'Negative' }]}/>
    <Slider label="How wide of the fixed charge it starts" value={offset} min={30} max={160} step={5} onChange={setOffset} unit="units"/>
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
        return <g key={`${r}-${c}`} opacity={0.3 + 0.25 * strength}><Zepton x={x} y={y} angle={(clockwise ? -1 : 1) * play.t * 260 * strength + (r * 8 + c) * 47} len={26} oval={false} signs={false}/>{(r + c) % 3 === 0 && <Still><Spin x={x} y={y} r={20} ccw={!clockwise} sweep={200} opacity={0.7}/></Still>}</g>;
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
      tryThis: ['Compare the two readouts: the lines add at e and subtract at w.', 'Reverse the current: its circles reverse, the stronger side changes, and the current is urged east.', 'Set either slider to zero. With no field, or no current, the two sides are equal and nothing is urged anywhere.'],
      notes: <p>The numbers are in arbitrary units. That the push follows the difference of the squares of the two strengths is a display choice (Maxwell’s pressure is greater where the vortices are more powerful; neither he nor Fleming gives a formula here).</p>,
    },
    {
      kind: 'figure', id: '7-2', page: 63, section: 'On Physical Lines of Force', title: 'Vortices set spinning by a current',
      caption: 'Figure 2 From Maxwell’s “On Physical Lines of Force” Part II “The Theory of Molecular Vortices applied to Electric Currents” showing a current moving from A to B causing the adjacent vortices to spin in opposite directions. The + and – signs indicate direction of spin rather than charge. After considering the induced currents and rotations of vortices on page 291 he concludes with the below quotation.',
      Diagram: MolecularVortices,
      text: <>
        <p>Maxwell’s conclusion, which Fleming quotes: <Q>the phenomena of induced currents are part of the process of communicating the rotary velocity of the vortices from one part of the field to the other</Q> (<Pg n={63}/>).</p>
        <p>This is the picture of Figures 6-14 and 6-15 seventy years early: vortices on opposite sides of a current spin opposite ways. <Q>Only now with zero-point field theory firmly established can we recognize that Maxwell’s vortex theory of magnetism was essentially correct.</Q></p>
      </>,
      tryThis: ['Watch the signs: + above the line, − below. They mark the direction of spin, not charge.', 'Reverse the current and watch the change spread outward, the nearest rows first and the furthest last.', 'Turn on “Show each vortex as a rotating zepton” for Fleming’s reading of the same drawing.'],
      notes: <p>The rate at which rotation passes from row to row is a display choice. Maxwell’s small idle wheels between the vortices are drawn only along the line of the current.</p>,
      labs: [{ lab: 'electron', scenario: 'moving', why: 'Rotation induced in the pairs beside a moving electron.' }],
    },
    {
      kind: 'figure', id: '7-3', page: 64, title: 'An electric field deflects by pressure',
      caption: 'A simple static electric interaction between a small moving positively charged body and a larger positively charged body.',
      Diagram: ElectricDeflection,
      text: <p>The fixed positive body is surrounded by zepton dipoles with their negative ends toward it; the approaching particle has its own. <Q>As the second particle moves toward the first the two fields of zeptons will interact, repelling each other building up pressure in between. The increased pressure of the vacuum deflects the moving positively charged body away from the static charge. A moving negative charge is deflected in the opposite direction</Q> (<Pg n={64}/>).</p>,
      tryThis: ['Run it with a positive charge: the path bends away as it passes.', 'Start it closer to the fixed charge: the deflection is sharper.', 'Make the moving charge negative: it bends toward the fixed charge.'],
      notes: <>
        <p>The sentence about the negative charge ends <Q>as the pressure between two like charges is lower than the natural background pressure</Q>. Chapter 6 gives lower pressure between <em>opposite</em> charges, which is the case being described, so “like” there reads as a slip. The diagram follows chapter 6.</p>
        <p>The path is computed for an inverse-square force in arbitrary units.</p>
      </>,
      labs: [{ lab: 'casimir', scenario: 'electron-electron', why: 'The build-up of pressure between two like charges, with the charges free to move.' }],
    },
    {
      kind: 'figure', id: '7-4', page: 65, title: 'The right hand rule for the magnetic force',
      caption: 'Placement of fingers for the right hand rule memory device.',
      Diagram: () => <HandRule first={{ name: 'motion', tone: 'motion', start: '+y' }} second={{ name: 'field B', tone: 'b', start: '-z' }} thumb={{ name: 'force', tone: 'force' }} signed="Charge" remark="The force is at right angles to both the motion and the field, which is why the magnetic interaction is harder to picture than the electric one."/>,
      text: <>
        <p><Q>The second finger points in the direction of the magnetic field, the first finger points in the direction of motion of the particle, and the thumb points in the direction of the force on the particle.</Q> Fleming calls it <Q>not the most intuitive scheme</Q>: one expects the particle to be pushed along the field, not at 90 degrees to it (<Pg n={65}/>).</p>
        <p>This rule is John Ambrose Fleming’s, and is different from the grip rule of Figure 6-16.</p>
      </>,
      tryThis: ['Leave it as it starts: motion up the page, field away from you. The force is to the left, which is Figure 7-5.', 'Point the two fingers along the same line: no force.', 'Change the charge to negative: the force reverses. In the book’s words the first finger must then point opposite to the motion.'],
      notes: <p>The printed figure is a drawing of a hand. The arrows here give the same rule as a cross product (motion × field), which is how Equation 8-7 writes it.</p>,
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
export default chapter;
