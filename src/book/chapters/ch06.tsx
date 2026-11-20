// Chapter 6: Zeptons and Faraday Field Lines (PDF pp. 48–61). Figures 6-1 to 6-18.
import { Suspense, lazy, useCallback, useMemo, useRef, useState, type ComponentType } from 'react';
import { Action, Arrow, BlockArrow, Charge, Choice, Dial, Diagram, Drag, FallbackOnError, FieldPicture, canDraw3D, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, SpinLoop, Stage, Still, T, Toggle, Vector, Zepton, alongLine, bearing, clamp, deg, ease, fieldAngle, fmt, lerpAngle, pathThrough, polar, rad, rng, traceField, turn, usePlayback, wireField, type Source, type Wire } from '../kit';
import { Pg, Q } from '../prose';
import { ZEPTON_COUNTS } from '../three/coil-math';
import { SPHERE_LINES, SPHERE_R_MIN } from '../three/sphere-math';
import type { BookItem, ChapterContent } from '../types';
import { TwoSources } from './shared';
import { ScientistLink } from '../../papertrails/PaperTrailsLink';

const W = 720;

/**
 * Where an atom's electron is on its circle, in degrees from the far side, at phase `psi` of a smooth orbit that dwells
 * on the far side: `share` 0 is an even circle; toward 1 it lingers far from the free electron and hurries past the
 * near side (the eccentric-anomaly map, continuous and always moving forward).
 */
export function dwellAngle(psi: number, share: number) {
  const wrapped = Math.atan2(Math.sin(psi), Math.cos(psi)), squeeze = Math.sqrt((1 - share) / (1 + share));
  return (Math.floor((psi + Math.PI) / (2 * Math.PI)) * 360) + (2 * Math.atan(squeeze * Math.tan(wrapped / 2)) * 180) / Math.PI;
}

/** How far out, as a share of the circle's radius, the electron is on average for a `share` of dwell. */
export function meanOffset(share: number) {
  let sum = 0;
  for (let i = 0; i < 72; i++) sum += Math.cos(rad(dwellAngle(((i + 0.5) / 72) * 2 * Math.PI - Math.PI, share)));
  return sum / 72;
}

/** Figure 6-1: hydrogen atoms round a free electron, each polarized with its proton toward the electron. */
function HydrogenGas() {
  const [present, setPresent] = useState(true);
  const [pos, setPos] = useState({ x: 360, y: 180 });
  const play = usePlayback();
  const H = 360;
  const atoms = useMemo(() => { const random = rng(61); return Array.from({ length: 10 }, (_, i) => ({ x: 70 + (i % 5) * 145 + (random() - 0.5) * 60, y: 80 + Math.floor(i / 5) * 200 + (random() - 0.5) * 70, seed: i, speed: 1.6 + random() * 1.2, phase: random() * 2 * Math.PI })); }, []);
  return <Diagram stage={
    <Stage w={W} h={H} label={present ? 'A free electron among hydrogen atoms. In each atom the electron is pushed to the far side, so the proton faces the free electron.' : 'Hydrogen atoms with no free charge near them: each electron is found all round its proton.'}>
      {atoms.map(a => {
        const d = Math.hypot(a.x - pos.x, a.y - pos.y), away = bearing(pos.x, pos.y, a.x, a.y);
        // The nearer the free electron, the further the atom's electron keeps to the far side.
        const share = present ? clamp(40000 / (d * d + 12000), 0, 0.92) : 0;
        // The electron goes smoothly round its proton, slowest on the far side from the free electron and quickest on
        // the near side, so it spends most of its time away from it; with no free charge it circles evenly.
        const R = 34, angle = away + dwellAngle(a.speed * play.t + a.phase, share), mean = R * meanOffset(share);
        const [ex, ey] = polar(a.x, a.y, R, angle), [mx, my] = polar(a.x, a.y, mean, away);
        return <g key={a.seed}>
          <circle cx={a.x} cy={a.y} r={R} className="bk-s-faint" fill="none" strokeDasharray="2 4"/>
          {/* The dipole: from the proton to where its electron is on average. */}
          {mean > 2 && <><line x1={a.x} y1={a.y} x2={mx} y2={my} className="bk-s-mark" strokeWidth="3"/><circle cx={mx} cy={my} r={4} className="bk-f-mark"/></>}
          <circle cx={ex} cy={ey} r={6} className="bk-f-neg"/>
          <Charge x={a.x} y={a.y} sign={1} r={10}/>
        </g>;
      })}
      {present && <Drag x={pos.x} y={pos.y} onMove={(x, y) => setPos({ x, y })} bounds={{ x0: 30, y0: 30, x1: W - 30, y1: H - 30 }} label="Free electron"><Charge x={pos.x} y={pos.y} sign={-1} r={15} label="free electron"/></Drag>}
    </Stage>}>
    <Toggle label="Free electron present" checked={present} onChange={setPresent}/>
    <PlayBar play={play} label="the atoms"/>
    <Remark>{present ? 'Drag the electron: the atoms nearest it are polarized most, protons toward it.' : 'With no free charge the atoms are neutral in every direction.'}</Remark>
  </Diagram>;
}

/** A background zepton of the unpolarized field: a place, a size and a phase. */
function useBackground(seed: number, cols: number, rows: number, h: number) {
  return useMemo(() => {
    const random = rng(seed), list: { x: number; y: number; len: number; phase: number; seed: number }[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) list.push({ x: 30 + (c + 0.5) * ((W - 60) / cols) + (random() - 0.5) * 26, y: 24 + (r + 0.5) * ((h - 48) / rows) + (random() - 0.5) * 22, len: 13 + random() * 7, phase: random(), seed: Math.floor(random() * 1e6) });
    return list;
  }, [seed, cols, rows, h]);
}

/** Figure 6-2: zeptons polarized round a free charge, with the many that barely turn shown on request. */
function ZeptonsRoundCharge() {
  const count = 8; // as printed
  const [sign, setSign] = useState<'neg' | 'pos'>('neg');
  const [rest, setRest] = useState(false);
  const play = usePlayback();
  const H = 380, q = sign === 'neg' ? -1 : 1;
  const sources = useMemo<Source[]>(() => [{ x: W / 2, y: H / 2, q }], [q]);
  const background = useBackground(62, 13, 7, H);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A free ${sign === 'neg' ? 'electron' : 'positive charge'} with ${count} lines of zeptons round it, each zepton turned with its ${sign === 'neg' ? 'positive' : 'negative'} end toward the charge.`}>
      {rest && background.map((b, i) => {
        const cycle = play.t * 0.8 + b.phase, generation = Math.floor(cycle), life = cycle - generation, born = rng(b.seed + generation * 13)() * 360;
        const d = Math.hypot(b.x - W / 2, b.y - H / 2), lean = clamp(1800 / (d * d + 1800), 0, 1) * 0.3;
        return <Zepton key={i} x={b.x} y={b.y} angle={lerpAngle(born, fieldAngle(sources, b.x, b.y), lean)} len={b.len} open={Math.sin(Math.PI * life)} oval={false} signs={false} opacity={0.3 * Math.sin(Math.PI * life)}/>;
      })}
      <FieldPicture sources={sources} w={W} h={H} perUnit={count} lines={0} zeptons={1} t={play.t} zeptonLen={22}/>
      <Charge x={W / 2} y={H / 2} sign={q as 1 | -1} r={15}/>
    </Stage>}>
    <Choice label="Free charge" value={sign} onChange={setSign} options={[{ value: 'neg', label: 'Electron' }, { value: 'pos', label: 'Positive' }]}/>
    <Toggle label="Show the zeptons that barely turn" checked={rest} onChange={setRest}/>
    <PlayBar play={play} label="the zeptons"/>
    <Remark>{rest ? 'Most zeptons are oriented only to a slight degree; the lines pick out the few that align.' : 'The figure shows a few lines. There are polarized zeptons all the way round, at every distance.'}</Remark>
  </Diagram>;
}

/** Figure 6-3: Faraday's lines drawn over the zeptons they stand for. */
function LinesFromZeptons() {
  const [blend, setBlend] = useState(1);
  const [strength, setStrength] = useState<'1' | '2' | '3'>('1');
  const [sign, setSign] = useState<'neg' | 'pos'>('neg');
  const play = usePlayback();
  const H = 380, q = (sign === 'neg' ? -1 : 1) * Number(strength);
  const sources = useMemo<Source[]>(() => [{ x: W / 2, y: H / 2, q }], [q]);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A free ${sign === 'neg' ? 'negative' : 'positive'} charge with ${8 * Number(strength)} field lines pointing ${sign === 'neg' ? 'toward' : 'away from'} it.`}>
      <FieldPicture sources={sources} w={W} h={H} perUnit={8} lines={blend} zeptons={1 - blend} t={play.t} zeptonLen={22}/>
      <Charge x={W / 2} y={H / 2} sign={Math.sign(q) as 1 | -1} r={12 + 3 * Number(strength)}/>
    </Stage>}>
    <Slider label="From zeptons to Faraday’s lines" value={blend} min={0} max={1} step={0.05} onChange={setBlend} show={v => (v === 0 ? 'zeptons' : v === 1 ? 'lines' : 'both')}/>
    <Choice label="Strength of the charge" value={strength} onChange={setStrength} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]}/>
    <Choice label="Sign" value={sign} onChange={setSign} options={[{ value: 'neg', label: '−' }, { value: 'pos', label: '+' }]}/>
    <Readout label="Lines drawn" value={8 * Number(strength)}/>
    <Remark>The number of lines follows the strength of the force; the force itself is spread through space as the zeptons are.</Remark>
  </Diagram>;
}

/** The share of a charge's polarization crossing unit area at a distance, relative to a reference distance. */
export const polarizationDensity = (r: number, reference: number) => (reference / r) ** 2;

/** Figure 6-4 drawn in three dimensions: loaded on demand, since three.js is large. */
const SphereScene = lazy(() => import('../three/SphereScene'));

/** Figure 6-4 as the printed page has it, flat: eight lines and circles. The fallback where 3D cannot be drawn. */
function FlatSpheres({ r, label }: { r: number; label: string }) {
  const H = 360, cx = W / 2, cy = 180, n = 8, ref = 45;
  return <Stage w={W} h={H} label={label}>
    {[ref, 160].map(rr => <circle key={rr} cx={cx} cy={cy} r={rr} className="bk-s-faint" fill="none" strokeDasharray="2 4"/>)}
    {Array.from({ length: n }, (_, i) => { const a = (i / n) * 360, [x1, y1] = polar(cx, cy, 172, a), [x2, y2] = polar(cx, cy, 20, a), [mx, my] = polar(cx, cy, r, a); return <g key={i}><Arrow x1={x1} y1={y1} x2={x2} y2={y2} tone="e" w={1.6}/><circle cx={mx} cy={my} r={4.5} className="bk-f-mark"/></g>; })}
    <circle cx={cx} cy={cy} r={r} className="bk-s-mark" fill="none" strokeWidth="2" strokeDasharray="5 4"/>
    <Charge x={cx} y={cy} sign={-1} r={12}/>
  </Stage>;
}

/** Figure 6-4: every sphere round the charge is crossed by the same lines, spread over more area. */
function EqualLinesSpheres() {
  const [r, setR] = useState(90);
  const [flat, setFlat] = useState(() => !canDraw3D());
  const fail = useCallback(() => setFlat(true), []);
  // Until the 3D scene has loaded and drawn, the flat page (eight lines) is what shows, so the words describe that.
  const [ready, setReady] = useState(false);
  const ready3D = useCallback(() => setReady(true), []);
  const flatShown = flat || !ready;
  const ref = 45, lines = flatShown ? 8 : SPHERE_LINES, density = polarizationDensity(r, ref), px = 90, pw = 540, ph = 110, py = 30;
  const curve = pathThrough(Array.from({ length: 61 }, (_, i) => { const rr = ref + (i / 60) * 115; return [px + ((rr - ref) / 115) * pw, py + ph - polarizationDensity(rr, ref) * ph] as const; }));
  const label = `A free electron with ${lines} field lines coming in to it ${flatShown ? 'in the plane of the page' : 'from every direction'}, and a sphere of radius ${fmt(r / ref, 3)} times the smallest round it. The sphere is crossed by all ${lines} lines; its area is ${fmt((r / ref) ** 2)} times that of the smallest sphere, so the density of polarization is ${fmt(density)} of the density there.`;
  return <Diagram stage={<>
    {flat
      ? <FlatSpheres r={r} label={label}/>
      : <FallbackOnError onError={fail} fallback={<FlatSpheres r={r} label={label}/>}>
          <Suspense fallback={<FlatSpheres r={r} label={label}/>}>
            <SphereScene radius={(r / ref) * SPHERE_R_MIN} onFail={fail} onReady={ready3D} description={`${label} The highlighted patch on the sphere has a fixed area. Drag to turn the view.`}/>
          </Suspense>
        </FallbackOnError>}
    <Stage w={W} h={190} label={`The density of polarization against distance from the charge: it falls as the inverse square. Now at ${fmt(density)} of its value at the smallest sphere.`}>
      <line x1={px} y1={py + ph} x2={px + pw} y2={py + ph} className="bk-s-muted"/><line x1={px} y1={py} x2={px} y2={py + ph} className="bk-s-muted"/>
      <Line d={curve} tone="e" w={2}/>
      <circle cx={px + ((r - ref) / 115) * pw} cy={py + ph - density * ph} r={6} className="bk-f-mark"/>
      <T x={px + pw / 2} y={py + ph + 24} size="sm">distance from the charge</T>
      <T x={px + pw / 2} y={py - 12} size="sm" tone="e">density of polarization (lines through each unit of area)</T>
    </Stage>
  </>}>
    <Slider label="Radius of the sphere" value={r} min={ref} max={160} step={1} onChange={setR} show={v => `${fmt(v / ref, 3)} ×`}/>
    <Readout label="Lines crossing it" value={`${lines}, at any radius`} tone="good"/>
    <Readout label="Its area (4πr²)" value={`${fmt((r / ref) ** 2)} ×`}/>
    <Readout label="Density of polarization" value={`${fmt(density)} ×`} tone="e"/>
    <Remark>Twice the distance, four times the area, a quarter of the density: the inverse square.</Remark>
  </Diagram>;
}

/** A two-charge diagram with fixed settings. */
const twoCharges = (signs: [1 | -1, 1 | -1], mode: 'lines' | 'zeptons' | 'both', names: [string, string], flip?: boolean): ComponentType => function Pair() { return <TwoSources signs={signs} mode={mode} names={names} flip={flip}/>; };

/** Figure 6-7: the electric field points the way the positive ends of the zeptons point. */
function FieldDirection() {
  const [swapped, setSwapped] = useState(false);
  const [each, setEach] = useState(false);
  const play = usePlayback();
  const since = useRef(-10);
  // After a swap the zeptons turn round over a moment, the field going through zero as they do.
  // With the negative charge on the left the positive ends point left (180°); swapped, they point right (0°).
  // Stopped (or with reduced motion) the clock does not advance, so the zeptons are shown already turned.
  const progress = play.playing ? ease((play.t - since.current) / 0.8) : 1, angle = swapped ? 180 - 180 * progress : 180 * progress;
  const y = 110, xs = Array.from({ length: 6 }, (_, i) => 190 + i * 68), pointing = Math.cos((angle * Math.PI) / 180);
  return <Diagram stage={
    <Stage w={W} h={250} label={`A negative charge on the ${swapped ? 'right' : 'left'} and a positive charge on the ${swapped ? 'left' : 'right'}, with six zeptons between. The positive end of each zepton faces the negative charge, and the electric field E points the same way, to the ${swapped ? 'right' : 'left'}.`}>
      <Charge x={110} y={y} sign={swapped ? 1 : -1} r={22}/><Charge x={610} y={y} sign={swapped ? -1 : 1} r={22}/>
      {xs.map(x => <g key={x}><Zepton x={x} y={y} angle={angle} len={46} signs/>{each && <Vector x={x} y={y + 40} angle={angle} len={34 * Math.abs(pointing)} centred tone="e" w={1.6} head={7}/>}</g>)}
      <Vector x={W / 2} y={192} angle={pointing < 0 ? 180 : 0} len={6 + 130 * Math.abs(pointing)} centred tone="e" w={4} head={14}/>
      <T x={W / 2} y={228} tone="e" size="lg">E</T>
    </Stage>}>
    <Action onClick={() => { since.current = play.t; setSwapped(v => !v); }}>Swap the charges</Action>
    <Toggle label="Show the field at each zepton" checked={each} onChange={setEach}/>
    <Readout label="Positive ends face" value={swapped ? 'right' : 'left'}/>
    <Readout label="E points" value={swapped ? 'right' : 'left'} tone="e"/>
    <Remark>E points toward the negative free charge, because that is where the positive ends of the zeptons point.</Remark>
  </Diagram>;
}

/** Figure 6-8: a row of zeptons end to end between an electron and a proton. */
function ZeptonBridge() {
  const [gap, setGap] = useState(420);
  const [continuum, setContinuum] = useState(false);
  const play = usePlayback();
  const H = 260, y = 130, xa = (W - gap) / 2, xb = (W + gap) / 2, len = 30, n = Math.max(1, Math.floor((gap - 44) / (len + 6))), pitch = (gap - 44) / n;
  const sources = useMemo<Source[]>(() => [{ x: xa, y, q: -1 }, { x: xb, y, q: 1 }], [xa, xb]);
  return <Diagram stage={
    <Stage w={W} h={H} label={`An electron and a proton with ${n} zeptons lined up end to end between them, each with its positive end toward the electron.`}>
      {continuum && <FieldPicture sources={sources} w={W} h={H} perUnit={8} lines={0} zeptons={0.45} t={play.t} zeptonLen={15} offset={0.5}/>}
      {Array.from({ length: n }, (_, i) => { const life = (play.t * 0.8 + (i * 0.37) % 1) % 1; return <Zepton key={i} x={xa + 22 + pitch * (i + 0.5)} y={y} angle={180} len={Math.min(len, pitch - 3)} open={0.5 + 0.5 * Math.sin(Math.PI * life)} signs={false} opacity={0.5 + 0.5 * Math.sin(Math.PI * life)}/>; })}
      <Charge x={xa} y={y} sign={-1} r={15} label="electron"/><Charge x={xb} y={y} sign={1} r={15} label="proton"/>
    </Stage>}>
    <Slider label="Distance between the particles" value={gap} min={160} max={600} step={10} onChange={setGap} unit="units"/>
    <Toggle label="Show the continuum of curved lines" checked={continuum} onChange={setContinuum}/>
    <PlayBar play={play} label="the zeptons"/>
    <Readout label="Zeptons in the row" value={n}/>
    <Remark>The dipoles are lined up end to end, virtually in contact, across the entire distance: a virtual bridge.</Remark>
  </Diagram>;
}

/** The row of zeptons between two electrons: positive ends face the nearer electron, so two negative ends meet midway. */
function likeRow(xa: number, xb: number, y: number, t: number, bow: (x: number) => number, opacity = 1, key = 'r') {
  const n = 5, half = (xb - xa) / 2 - 26, pitch = half / n, mid = (xa + xb) / 2;
  return [-1, 1].flatMap(side => Array.from({ length: n }, (_, i) => {
    const x = mid + side * (4 + pitch * (i + 0.5)), life = (t * 0.8 + ((i + (side > 0 ? 5 : 0)) * 0.37) % 1) % 1, dy = bow(x);
    // The slope of the bowed row tilts each zepton along it.
    const slope = (bow(x + 2) - bow(x - 2)) / 4, tilt = -deg(Math.atan(slope));
    return <Zepton key={`${key}${side}${i}`} x={x} y={y + dy} angle={(side < 0 ? 180 : 0) + tilt} len={Math.min(30, pitch - 3)} open={0.5 + 0.5 * Math.sin(Math.PI * life)} signs={false} opacity={opacity * (0.5 + 0.5 * Math.sin(Math.PI * life))}/>;
  }));
}

/** Figure 6-9: two electrons, with like ends of the zeptons meeting at the midpoint. */
function LikeChargesRow() {
  const [respond, setRespond] = useState(false);
  const play = usePlayback();
  const H = 250, y = 120, xa = 120, xb = 600, mid = (xa + xb) / 2;
  // Each generation of zeptons the two middle ones are pushed apart a little before they are annihilated.
  const u = (play.t * 0.5) % 1, shift = respond ? 16 * Math.sin(Math.PI * u) : 0;
  return <Diagram stage={
    <Stage w={W} h={H} label="Two electrons with a row of zeptons between them. The positive end of each zepton faces the nearer electron, so two negative ends meet at the midpoint and repel.">
      {likeRow(xa, xb, y, play.t, x => (Math.abs(x - mid) < 60 ? (x < mid ? -1 : 1) * shift * (1 - Math.abs(x - mid) / 60) : 0))}
      <circle cx={mid} cy={y} r={24} className="bk-s-danger" fill="none" strokeWidth="1.6" strokeDasharray="4 3" opacity={0.5 + 0.5 * Math.abs(Math.sin(play.t * 3))}/>
      <T x={mid} y={y + 52} tone="danger" size="sm">two negative ends in virtual contact</T>
      <Charge x={xa} y={y} sign={-1} r={15} label="electron"/><Charge x={xb} y={y} sign={-1} r={15} label="electron"/>
    </Stage>}>
    <Toggle label="Let the middle zeptons respond" checked={respond} onChange={setRespond}/>
    <PlayBar play={play} label="the zeptons"/>
    <Remark tone={respond ? 'bad' : undefined}>{respond ? 'The like ends move away from each other, if only slightly, before the zeptons are annihilated. Figure 6-10 follows what that leads to.' : 'On each side the positive ends face the nearer electron. At the middle, negative meets negative.'}</Remark>
  </Diagram>;
}

/** Figure 6-10: the middle zeptons deflect, a new zepton fills the hole, and its pressure pushes the electrons apart. */
function RepulsionPressure() {
  const play = usePlayback({ speed: 0.5 });
  const H = 300, y = 140, cycles = 5, cycle = Math.floor(play.t) % (cycles + 1), u = play.t % 1;
  // One generation: the rows bow apart at the middle, a zepton forms in the hole, and its push passes down the rows.
  const deflect = ease(u / 0.3), filled = ease((u - 0.3) / 0.25), pushing = ease((u - 0.55) / 0.3);
  const apart = Math.min(cycles, cycle + pushing) * 9, xa = 150 - apart, xb = 570 + apart, mid = 360;
  const bow = (side: 1 | -1) => (x: number) => side * (9 + 30 * deflect * Math.exp(-(((x - mid) / 95) ** 2)));
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two electrons with zeptons between them. The zeptons at the middle deflect, a new zepton comes into existence in the space, and the pressure pushes the electrons apart. Generation ${Math.min(cycles, cycle + 1)} of ${cycles}.`}>
      {likeRow(xa, xb, y, play.t, bow(-1), 1, 'u')}{likeRow(xa, xb, y, play.t, bow(1), 1, 'l')}
      {deflect > 0.2 && <><Arrow x1={mid} y1={y - 14} x2={mid} y2={y - 14 - 22 * deflect} tone="mark" w={2} head={8}/><Arrow x1={mid} y1={y + 14} x2={mid} y2={y + 14 + 22 * deflect} tone="mark" w={2} head={8}/></>}
      {filled > 0 && <Zepton x={mid} y={y} angle={0} len={30} open={filled} emphasis="key" signs={false} opacity={filled}/>}
      {pushing > 0 && <>
        <Arrow x1={mid - 22} y1={y} x2={mid - 22 - 46 * pushing} y2={y} tone="force" w={2.4}/><Arrow x1={mid + 22} y1={y} x2={mid + 22 + 46 * pushing} y2={y} tone="force" w={2.4}/>
        <BlockArrow x1={xa - 24} y1={y} x2={xa - 24 - 40 * pushing} y2={y} thick={12}/><BlockArrow x1={xb + 24} y1={y} x2={xb + 24 + 40 * pushing} y2={y} thick={12}/>
      </>}
      <Charge x={xa} y={y} sign={-1} r={15}/><Charge x={xb} y={y} sign={-1} r={15}/>
      <T x={mid} y={H - 40} size="sm" tone={u < 0.3 ? 'mark' : u < 0.55 ? 'mark' : 'text'}>{u < 0.3 ? 'like ends deflect, leaving a small hole in space' : u < 0.55 ? 'the hole is filled with another zepton' : 'it pushes on its neighbours, and they on the electrons'}</T>
      <T x={mid} y={H - 18} size="sm">pressure between the electrons {'>'} pressure outside them</T>
    </Stage>}>
    <PlayBar play={play} label="the generations of zeptons"/>
    <Readout label="Generation" value={`${Math.min(cycles, cycle + 1)} of ${cycles}`}/>
    <Readout label="Electrons pushed apart by" value={`${fmt(apart * 2, 2)} units`} tone="force"/>
    <Remark>That hole is filled with another zepton, then another, and another: each arrival adds pressure in the space between.</Remark>
  </Diagram>;
}

/** Figure 6-12: the chain of zeptons between opposite charges shortens, and the pressure outside pushes them together. */
function AttractionChain() {
  const play = usePlayback({ speed: 0.6 });
  const H = 290, y = 120, start = 8, end = 2, steps = start - end, phase = play.t % (steps + 1.5), k = Math.min(steps, Math.floor(phase)), u = k < steps ? phase - k : 0;
  // In each step one zepton collapses to a point and is not replaced at full size; the chain closes over the space.
  const count = start - k, pitch = 54, length = (count - ease(u)) * pitch, xa = W / 2 - length / 2 - 24, xb = W / 2 + length / 2 + 24, gone = Math.floor(count / 2);
  let x = xa + 24;
  return <Diagram stage={
    <Stage w={W} h={H} label={`An electron and a proton with a chain of ${count} zeptons between them. As zeptons annihilate the space available for the next is smaller, the chain shortens, and the pressure from outside pushes the particles together.`}>
      {Array.from({ length: count }, (_, i) => {
        const size = i === gone && k < steps ? 1 - ease(u) : 1, w = pitch * size, cx = x + w / 2;
        x += w;
        return size > 0.04 ? <Zepton key={i} x={cx} y={y} angle={180} len={(pitch - 8) * size} signs={size > 0.7} emphasis={i === gone && u > 0 ? 'key' : 'normal'} opacity={0.4 + 0.6 * size}/> : null;
      })}
      <Charge x={xa} y={y} sign={-1} r={16} label="electron"/><Charge x={xb} y={y} sign={1} r={16} label="proton"/>
      <BlockArrow x1={xa - 92} y1={y} x2={xa - 26} y2={y} thick={16}/><BlockArrow x1={xb + 92} y1={y} x2={xb + 26} y2={y} thick={16}/>
      <T x={xa - 60} y={y - 22} size="sm">pressure outside</T><T x={xb + 60} y={y - 22} size="sm">pressure outside</T>
      <T x={W / 2} y={y + 62} size="sm" tone="mark">{k < steps ? 'a zepton collapses to a point; a smaller one, or its neighbours, take the space' : 'the chain has shortened from 8 zeptons to 2'}</T>
      <T x={W / 2} y={H - 30} size="sm">pressure between the particles is slightly less than the pressure outside them</T>
    </Stage>}>
    <PlayBar play={play} label="the chain"/>
    <Readout label="Zeptons in the chain" value={count}/>
    <Readout label="Distance between the particles" value={`${Math.round(length + 48)} units`}/>
    <Remark>Nothing pulls. The alignment between opposite charges reduces the pressure pushing them apart, so they are pushed together.</Remark>
  </Diagram>;
}

/** Figure 6-14: an electron passes two zeptons, which rotate to stay aligned with it, opposite ways on opposite sides. */
function MovingCharge() {
  const [x, setX] = useState(150);
  const play = usePlayback({ autoplay: false, speed: 0.22 });
  const H = 320, y = 160, zx = 360, above = { x: zx, y: 84 }, below = { x: zx, y: 236 };
  // Playing carries the electron from left to right and back; dragging sets it by hand.
  const ex = play.playing ? 110 + 500 * (0.5 - 0.5 * Math.cos(play.t * 2 * Math.PI)) : x, moving = play.playing ? Math.sign(Math.sin(play.t * 2 * Math.PI)) || 1 : 0;
  const up = bearing(above.x, above.y, ex, y), down = bearing(below.x, below.y, ex, y);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A free electron on a line between two zeptons. Each zepton keeps its positive end toward the electron, so as the electron moves the upper zepton has turned ${Math.round(turn(-90, up))} degrees and the lower ${Math.round(turn(90, down))} degrees from pointing straight at the line.`}>
      <line x1={60} y1={y} x2={660} y2={y} className="bk-s-faint" strokeDasharray="3 5"/>
      {[160, 360, 560].map(px => <circle key={px} cx={px} cy={y} r={15} className="bk-s-faint" fill="none" strokeDasharray="2 3"/>)}
      <Line d={`M${above.x} ${above.y} L${ex} ${y} L${below.x} ${below.y}`} tone="faint" dash="2 4"/>
      <Zepton x={above.x} y={above.y} angle={up} len={50} signs/><Zepton x={below.x} y={below.y} angle={down} len={50} signs/>
      {moving !== 0 && <><Spin x={above.x} y={above.y} r={36} ccw={moving > 0} from={moving > 0 ? 20 : 160} sweep={140}/><Spin x={below.x} y={below.y} r={36} ccw={moving < 0} from={moving > 0 ? -20 : 200} sweep={140}/><Still><Arrow x1={ex + moving * 22} y1={y} x2={ex + moving * 58} y2={y} tone="motion" w={2.4}/></Still></>}
      <Drag x={ex} y={y} onMove={nx => { if (!play.playing) setX(nx); }} bounds={{ x0: 80, y0: y, x1: 640, y1: y }} label="Free electron"><Charge x={ex} y={y} sign={-1} r={15}/></Drag>
    </Stage>}>
    <Slider label="Position of the electron" value={Math.round(ex)} min={80} max={640} step={2} onChange={v => { if (!play.playing) setX(v); }} show={v => (v < 300 ? 'left' : v > 420 ? 'right' : 'between the zeptons')}/>
    <Action onClick={() => { if (play.playing) setX(Math.round(ex)); play.toggle(); }}>{play.playing ? 'Stop the electron' : 'Move the electron'}</Action>
    <Readout label="Upper zepton has turned" value={`${Math.round(turn(-90, up))}°`}/>
    <Readout label="Lower zepton has turned" value={`${Math.round(turn(90, down))}°`}/>
    <Remark>The two turn in opposite senses: zeptons on opposite sides of a moving charge always do.</Remark>
  </Diagram>;
}

/** Figure 6-15: a current of electrons keeps the zeptons beside the conductor spinning, opposite ways on each side. */
function CurrentAndSpin() {
  const [drive, setDrive] = useState(0.7);
  const [on, setOn] = useState(true);
  const play = usePlayback();
  const state = useRef({ t: 0, current: 0, angle: 0, flow: 0 });
  // Restart (or a step back) starts the current again from zero.
  if (play.t < state.current.t) state.current = { t: 0, current: 0, angle: 0, flow: 0 };
  // The current and the spin of the field rise quickly when driven and, with the drive cut, die away together.
  const dt = Math.max(0, Math.min(0.1, play.t - state.current.t)), target = on ? drive : 0, rate = on ? 4 : 0.45;
  state.current.t = play.t;
  state.current.current += (target - state.current.current) * Math.min(1, dt * rate);
  state.current.angle += state.current.current * 150 * dt;
  state.current.flow += state.current.current * 70 * dt;
  const { current, angle, flow } = state.current, H = 320, top = 138, bottom = 182, n = 9, pitch = 68, x0 = 88;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Electrons moving ${current >= 0 ? 'right' : 'left'} in a conductor at ${Math.round(Math.abs(current) * 100)} per cent of full current. The zeptons above the conductor spin ${current >= 0 ? 'counter-clockwise' : 'clockwise'} and those below spin the other way.`}>
      <line x1={30} y1={top} x2={690} y2={top} className="bk-s-muted" strokeWidth="1.5"/><line x1={30} y1={bottom} x2={690} y2={bottom} className="bk-s-muted" strokeWidth="1.5"/>
      {Array.from({ length: 10 }, (_, i) => { const x = 30 + ((((i * 66 + flow) % 660) + 660) % 660); return <Charge key={i} x={x} y={(top + bottom) / 2} sign={-1} r={9}/>; })}
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + i * pitch, life = (play.t * 0.5 + i * 0.31) % 1, seen = 0.35 + 0.65 * Math.min(1, Math.sin(Math.PI * life) * 3);
        return <g key={i}>
          <Zepton x={x} y={top - 62} angle={-90 + angle} len={38} signs={false} opacity={seen}/>
          <Zepton x={x} y={bottom + 62} angle={90 - angle} len={38} signs={false} opacity={seen}/>
          {Math.abs(current) > 0.05 && i % 2 === 0 && <><Spin x={x} y={top - 62} r={26} ccw={current > 0} sweep={70 + 150 * Math.abs(current)} opacity={0.8}/><Spin x={x} y={bottom + 62} r={26} ccw={current < 0} sweep={70 + 150 * Math.abs(current)} opacity={0.8}/></>}
        </g>;
      })}
      {Math.abs(current) > 0.05 && <Still><Arrow x1={W / 2 - Math.sign(current) * 40} y1={top - 14} x2={W / 2 + Math.sign(current) * 40} y2={top - 14} tone="motion" w={2}/></Still>}
    </Stage>}>
    <Dial label="Electron flow when driven" value={drive} min={-1} max={1} step={0.05} onChange={setDrive} marks={['left', 'off', 'right']} show={v => (v === 0 ? 'off' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'right' : 'left'}`)}/>
    <Toggle label="Drive the current" checked={on} onChange={setOn}/>
    <PlayBar play={play} label="the current"/>
    <Readout label="Current" value={`${Math.round(Math.abs(current) * 100)} %${Math.abs(current) > 0.01 ? (current > 0 ? ' right' : ' left') : ''}`}/>
    <Readout label="Spin of the zeptons" value={`${Math.round(Math.abs(current) * 100)} %`} tone="b"/>
    <Remark>{on ? 'Each zepton that dies is replaced by one that carries on the rotation.' : 'With the drive cut, the spinning zeptons keep the current moving and the current keeps them spinning, until both die away together.'}</Remark>
  </Diagram>;
}

/** Figure 6-16: the right hand grip rule, from the rotation of a zepton to the direction of B. */
function GripRule() {
  const [ccw, setCcw] = useState(true);
  const [tilt, setTilt] = useState(0);
  const [left, setLeft] = useState(false);
  const play = usePlayback({ speed: 0.35 });
  // Tall enough for B pointing straight down (clockwise), 160 below the origin, with its arrowhead and label.
  const H = 400, ox = 270, oy = 210, R = 96;
  // Oblique view: x right, y up, z toward the lower left. The axis of rotation leans from y toward x by `tilt`.
  const project = (x: number, y: number, z: number): [number, number] => [ox + x - 0.6 * z, oy - y + 0.48 * z];
  const c = Math.cos((tilt * Math.PI) / 180), s = Math.sin((tilt * Math.PI) / 180);
  const axis: [number, number, number] = [s, c, 0], u1: [number, number, number] = [c, -s, 0], u2: [number, number, number] = [0, 0, 1];
  // Counter-clockwise as seen from the tip of the axis: from u1 toward −u2... the grip gives B along the axis.
  const at = (phi: number, r = R) => project(r * (u1[0] * Math.cos(phi) - u2[0] * Math.sin(phi)), r * (u1[1] * Math.cos(phi) - u2[1] * Math.sin(phi)), r * (u1[2] * Math.cos(phi) - u2[2] * Math.sin(phi)));
  const sense = ccw ? 1 : -1, phi = sense * play.t * 2 * Math.PI, orbit = pathThrough(Array.from({ length: 49 }, (_, i) => at((i / 48) * 2 * Math.PI)));
  const [px, py] = at(phi), [nx, ny] = at(phi + Math.PI), [bx, by] = project(axis[0] * 160 * sense, axis[1] * 160 * sense, 0), [sx, sy] = project(-axis[0] * 130 * sense, -axis[1] * 130 * sense, 0);
  const [h1x, h1y] = at(sense * 0.9), [h2x, h2y] = at(sense * 1.25);
  const [zx, zy] = project(0, 0, 210);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A zepton rotating ${ccw ? 'counter-clockwise' : 'clockwise'} as seen from above. With the fingers of the right hand curled the way it rotates, the thumb gives the direction of the magnetic field B, ${ccw ? 'up' : 'down'} the axis of rotation.`}>
      <Arrow x1={ox} y1={oy} x2={ox + 230} y2={oy} tone="faint" w={1.2}/><T x={ox + 242} y={oy + 5} anchor="start" size="sm">x</T>
      <Arrow x1={ox} y1={oy} x2={ox} y2={oy - 190} tone="faint" w={1.2}/><T x={ox + 14} y={oy - 184} size="sm">y</T>
      <Arrow x1={ox} y1={oy} x2={zx} y2={zy} tone="faint" w={1.2}/><T x={zx - 10} y={zy + 14} size="sm">z</T>
      <Line d={orbit} tone="motion" w={1.6} dash="5 4"/>
      <Arrow x1={h1x} y1={h1y} x2={h2x} y2={h2y} tone="motion" w={0.1} head={12}/>
      {left && <><Arrow x1={ox} y1={oy} x2={sx} y2={sy} tone="muted" w={3} head={12}/><T x={sx + 16} y={sy + 5} anchor="start" tone="text">S (left thumb)</T></>}
      <Arrow x1={ox} y1={oy} x2={bx} y2={by} tone="b" w={4} head={14}/><T x={bx + 16} y={by + 5} anchor="start" tone="b" size="lg">B{left ? ' · N (right thumb)' : ''}</T>
      <line x1={px} y1={py} x2={nx} y2={ny} className="bk-s-muted" strokeWidth="2"/>
      <circle cx={px} cy={py} r={11} className="bk-f-pos"/><circle cx={nx} cy={ny} r={11} className="bk-f-neg"/>
      <T x={570} y={292} tone="motion">fingers: the way the zepton rotates</T><T x={570} y={316} tone="b">thumb: the direction of B</T>
    </Stage>}>
    <Choice label="Rotation, seen from above" value={ccw ? 'ccw' : 'cw'} onChange={v => setCcw(v === 'ccw')} options={[{ value: 'ccw', label: 'Counter' }, { value: 'cw', label: 'Clockwise' }]}/>
    <Slider label="Lean the axis of rotation" value={tilt} min={0} max={70} step={5} onChange={setTilt} unit="°"/>
    <Toggle label="Use the left hand too (the south pole)" checked={left} onChange={setLeft}/>
    <PlayBar play={play} label="the rotation"/>
    <Remark>{left ? 'The two thumbs always point opposite ways: a spinning dipole has both poles. No magnetic monopoles.' : 'Reverse the rotation and B reverses; lean the axis and B leans with it.'}</Remark>
  </Diagram>;
}

/** Figure 6-17: a bar magnet's field lines, with a compass to move and spinning zeptons threaded on a line. */
function BarMagnet() {
  const [strength, setStrength] = useState(2);
  const [threads, setThreads] = useState(true);
  const [compass, setCompass] = useState({ x: 360, y: 80 });
  const play = usePlayback();
  const H = 380, y = 190, xs = 260, xn = 460;
  const sources = useMemo<Source[]>(() => [{ x: xn - 6, y, q: 1 }, { x: xs + 6, y, q: -1 }], []);
  const angle = fieldAngle(sources, compass.x, compass.y);
  // One loop of the field, leaving the north pole upward: the string the spinning zeptons are threaded on.
  const thread = useMemo(() => {
    const field = (x: number, yy: number): [number, number] => { const a = fieldAngle(sources, x, yy); return [Math.cos((a * Math.PI) / 180), -Math.sin((a * Math.PI) / 180)]; };
    const stop = (points: [number, number][]) => { const end = points.findIndex(([x, yy], i) => i > 3 && Math.abs(yy - y) < 22 && x > xs - 6 && x < xn + 6); return end < 0 ? points : points.slice(0, end); };
    const mid: [number, number] = [(xs + xn) / 2, y - 78], box = { w: W, h: H };
    return [...stop(traceField(field, mid[0], mid[1], -1, box, 4, 300).points).reverse(), ...stop(traceField(field, mid[0], mid[1], 1, box, 4, 300).points).slice(1)];
  }, [sources]);
  return <Diagram stage={
    <Stage w={W} h={H} label="A bar magnet with its field lines leaving the north pole, looping round and entering the south pole. A compass needle can be moved through the field.">
      <FieldPicture sources={sources} w={W} h={H} perUnit={4 + strength * 3} lines={1} tone="b"/>
      {threads && alongLine(thread, 26, 14).map((m, i) => <SpinLoop key={i} x={m.x} y={m.y} angle={m.angle} r={9} turn={play.t * 300 + i * 40} tone="motion"/>)}
      <rect x={xs} y={y - 17} width={xn - xs} height={34} rx={3} className="bk-plate"/>
      <T x={xs + 24} y={y + 6} tone="text" size="lg">S</T><T x={xn - 24} y={y + 6} tone="text" size="lg">N</T>
      <Drag x={compass.x} y={compass.y} onMove={(x, yy) => setCompass({ x, y: yy })} bounds={{ x0: 30, y0: 30, x1: W - 30, y1: H - 30 }} label="Compass">
        <circle cx={compass.x} cy={compass.y} r={19} className="bk-fill-panel bk-s-mark" strokeWidth="1.5"/><Vector x={compass.x} y={compass.y} angle={angle} len={30} centred tone="mark" w={3} head={10}/>
      </Drag>
    </Stage>}>
    <Slider label="Strength of the magnet" value={strength} min={1} max={4} step={1} onChange={setStrength} show={v => `${4 + v * 3} lines`}/>
    <Toggle label="Thread spinning zeptons on one line" checked={threads} onChange={setThreads}/>
    <PlayBar play={play} label="the spinning zeptons"/>
    <Readout label="Compass points" value={`${Math.round(((angle % 360) + 360) % 360)}°`} tone="b"/>
    <Remark>Drag the compass. A field line is like a string drawn through little spinning loops so that they lie in a line.</Remark>
  </Diagram>;
}

/** Figure 6-18 drawn in three dimensions: loaded on demand, since three.js is large. */
const CoilScene = lazy(() => import('../three/CoilScene'));

/** Figure 6-18 as printed: the coil in cross section, flat. The fallback where 3D cannot be drawn. */
function FlatCoil({ current, t }: { current: number; t: number }) {
  const H = 380, cy = 190, turns = 6, x0 = 270, pitch = 36, half = 62;
  const wires = useMemo<Wire[]>(() => Array.from({ length: turns }, (_, i) => [{ x: x0 + i * pitch, y: cy - half, i: current }, { x: x0 + i * pitch, y: cy + half, i: -current }]).flat(), [current]);
  const lines = useMemo(() => {
    if (Math.abs(current) < 0.05) return [];
    const field = (x: number, y: number) => wireField(wires, x, y), box = { w: W, h: H }, cx = x0 + ((turns - 1) * pitch) / 2;
    // Seeds across the middle of the coil: the lines through them run along the axis and return outside.
    return [-46, -22, -9, 0, 9, 22, 46].map(dy => {
      const forward = traceField(field, cx, cy + dy, 1, box), back = forward.closed ? { points: [] as [number, number][] } : traceField(field, cx, cy + dy, -1, box);
      return [...back.points.slice(1).reverse(), ...forward.points];
    });
  }, [wires, current]);
  const spots = [[-150, 0], [-60, 0], [0, 0], [60, 0], [150, 0], [-40, -112], [50, -112], [-40, 112], [50, 112]].map(([dx, dy]) => ({ x: x0 + ((turns - 1) * pitch) / 2 + dx, y: cy + dy, inside: dy === 0 }));
  const north = current > 0 ? 'right' : 'left';
  return <Stage w={W} h={H} label={Math.abs(current) < 0.05 ? 'A coil in cross section with no current: no magnetic field.' : `A coil in cross section. The current comes out of the page in the ${current > 0 ? 'top' : 'bottom'} windings and goes in at the ${current > 0 ? 'bottom' : 'top'}, producing a magnetic field through the coil with its north pole to the ${north}.`}>
      {lines.map((points, i) => <g key={i} className="bk-s-b bk-f-b"><path d={pathThrough(points)} fill="none" strokeWidth="1.4"/>{alongLine(points, 170, 60).map((m, k) => <polygon key={k} points="6,0 -5,4.5 -5,-4.5" transform={`translate(${m.x} ${m.y}) rotate(${-m.angle})`} stroke="none"/>)}</g>)}
      {Math.abs(current) > 0.05 && spots.map((p, i) => { const [bx, by] = wireField(wires, p.x, p.y); return <SpinLoop key={i} x={p.x} y={p.y} angle={deg(Math.atan2(-by, bx))} r={11} turn={t * 280 * Math.abs(current) + i * 50} tone="motion"/>; })}
      {wires.map((w, i) => <g key={i}><circle cx={w.x} cy={w.y} r={15} className="bk-plate"/>{Math.abs(current) > 0.05 && <InOut x={w.x} y={w.y} out={w.i > 0} r={8} tone="text"/>}</g>)}
      {Math.abs(current) > 0.05 && <><T x={current > 0 ? 668 : 52} y={cy + 6} tone="text" size="lg">N</T><T x={current > 0 ? 52 : 668} y={cy + 6} tone="text" size="lg">S</T></>}
      <T x={W / 2} y={H - 12} size="sm">dot: current toward you · cross: current away · loops: spinning zeptons</T>
    </Stage>;
}

/** Figure 6-18: a coil, the field it makes, and the zeptons spinning inside and outside it, in three dimensions. */
function Coil() {
  const [current, setCurrent] = useState(1);
  const [cutaway, setCutaway] = useState(true);
  const [many, setMany] = useState<keyof typeof ZEPTON_COUNTS>('few');
  const [flat, setFlat] = useState(() => !canDraw3D());
  const fail = useCallback(() => setFlat(true), []);
  const play = usePlayback();
  const north = current > 0 ? 'right' : 'left', on = Math.abs(current) >= 0.05;
  const description = on ? `A coil wound from left to right, ${cutaway ? 'with its front half cut away, ' : ''}carrying a current that comes out at the top of each turn${current < 0 ? ' (reversed: in at the top)' : ''}. Its field runs through the coil to the north pole on the ${north} and back round the outside. Zeptons inside the coil spin one way about the field, those outside the other way. Drag to turn the view.` : 'A coil with no current: no magnetic field. Drag to turn the view.';
  return <Diagram stage={flat
    ? <FlatCoil current={current} t={play.t}/>
    : <FallbackOnError onError={fail} fallback={<FlatCoil current={current} t={play.t}/>}>
        <Suspense fallback={<FlatCoil current={current} t={play.t}/>}>
          <CoilScene state={{ current, t: play.t, cutaway, zeptons: ZEPTON_COUNTS[many] }} onFail={fail} description={description}/>
        </Suspense>
      </FallbackOnError>}>
    <Dial label="Current in the coil" value={current} min={-1} max={1} step={0.1} onChange={setCurrent} marks={['rev', 'off', 'fwd']} show={v => (Math.abs(v) < 0.05 ? 'off' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'forward' : 'reversed'}`)}/>
    {!flat && <Toggle label="Cut away the front of the coil" checked={cutaway} onChange={setCutaway}/>}
    {!flat && <Choice label="Spinning zeptons" value={many} onChange={setMany} options={[{ value: 'few', label: 'Few' }, { value: 'more', label: 'More' }, { value: 'many', label: 'Many' }]}/>}
    <PlayBar play={play} label="the spinning zeptons"/>
    <Readout label="North pole" value={Math.abs(current) < 0.05 ? 'none' : `to the ${north}`} tone="b"/>
    <Remark>The zeptons inside the coil spin one way and those outside the opposite way; the field lines outside point the opposite way too.</Remark>
  </Diagram>;
}

const drag = 'Drag either charge anywhere (or select one and use the arrow keys).';

const items: BookItem[] = [
  {
    kind: 'figure', id: '6-1', page: 49, section: 'The Mechanism Behind Electricity and Magnetism', title: 'A free electron polarizes hydrogen',
    caption: 'A free electron surrounded by hydrogen atoms that are polarized in response to its electric charge.',
    Diagram: HydrogenGas,
    text: <>
      <p>Near a free electron, charged particles and polar molecules <Q>orient themselves with respect to charge, such that positive charges and the positive ends of polar molecules will face toward the electron</Q>. Hydrogen atoms are induced to form dipoles: <Q>The electrons and protons in the hydrogen become slightly separate in nearby space with the positive dipole, the proton, preferentially facing toward the local free electron</Q> (<Pg n={48}/>, <Pg n={49}/>).</p>
      <p>This is the familiar case. The next figure puts the vacuum in place of the gas.</p>
    </>,
    tryThis: ['Remove the free electron. Each atom’s electron is found all round its proton: no polarization.', 'Put it back and drag it about. The atoms nearest it polarize most, always with the proton on the near side.'],
    notes: <p>The figure prints only the letters e⁻ and p⁺. How far each atom’s electron is displaced at a given distance is a display choice.</p>,
    labs: [{ lab: 'vdw', scenario: 'induced', why: 'One atom polarized by a field, as in Figure 3-2.' }],
  },
  {
    kind: 'figure', id: '6-2', page: 49, title: 'The vacuum polarizes in the same way',
    caption: 'A free electron surrounded by zeptons that are polarized in response to its electric charge.',
    Diagram: ZeptonsRoundCharge,
    text: <>
      <p><Q>Each vacuum fluctuation that forms the zero-point field is a miniature, short-lived electric dipole. These dipoles orient themselves with respect to nearby electric charges, or at least some of them will.</Q> The field <Q>acts very similarly to the hydrogen gas</Q> (<Pg n={49}/>).</p>
      <p><Q>Zepton dipoles align with their positive charge, such as a virtual positron, facing toward the free electron</Q>. <Q>While Figure 6-2 only shows a few lines, there are polarized zeptons all the way around the charge at every distance, extending toward infinity</Q> (<Pg n={50}/>).</p>
      <p>The polarization is partial: a single charge <Q>only causes a small percentage of zeptons to orient their dipoles in the charge’s direction, and most are only oriented to a slight degree</Q> (<Pg n={53}/>).</p>
    </>,
    tryThis: ['Look at any zepton on a line: its warm (positive) end is the one nearer the electron.', 'Change the free charge to positive. Every zepton turns round.', 'Turn on “the zeptons that barely turn” to see how the few that align sit among the many that do not.'],
    notes: <p>The share of the background zeptons’ turn, and its thinning with distance, are display choices: Fleming says only that most are oriented to a slight degree.</p>,
    labs: [
      { lab: 'electron', scenario: 'stationary', why: 'The polarization round an electron building up from pairs born at random, in three dimensions.' },
      { lab: 'electron', scenario: 'proton', why: 'A proton in place of the electron: the pairs point the other way.' },
    ],
  },
  {
    kind: 'figure', id: '6-3', page: 50, section: 'The Nature of Fields', title: 'Faraday’s lines are the zeptons',
    caption: 'A free electron with field lines pointing toward it.',
    Diagram: LinesFromZeptons,
    text: <>
      <p>Electricity and magnetism act across a distance with nothing apparent between, and <ScientistLink id="faraday">Faraday</ScientistLink> drew lines to stand for the unknown mechanism. <Q>The convention is that electric field lines point toward negative charges. This selection was completely arbitrary</Q> (<Pg n={50}/>).</p>
      <p><Q>The connection between the aligned polarized zeptons and Faraday’s field lines is unmistakable.</Q> In his method <Q>the number of lines was proportional to the strength of the force. The force itself is spread throughout space in the same way that zeptons are spread throughout space.</Q></p>
    </>,
    tryThis: ['Slide from lines to zeptons and back: each arrow lies along a row of zeptons, and points the way their positive ends point.', 'Raise the strength of the charge: more lines, as Faraday drew a stronger force.', 'Reverse the sign and the arrows reverse.'],
  },
  {
    kind: 'figure', id: '6-4', page: 51, title: 'The same lines through every sphere',
    caption: 'A free electron with field lines pointing toward it with different surfaces around the charge with each crossing exactly the same number of field lines.',
    Diagram: EqualLinesSpheres,
    text: <>
      <p>Round a point charge the field has the same strength everywhere at a given distance, and falls with the square of the distance. <Q>The easiest way to see how this occurs is to recognize that the same total amount of polarization occurs at each distance away from the charge; it is just spread out over increasingly larger volumes of space</Q> (<Pg n={51}/>).</p>
      <p>The area of a sphere is 4π<i>r</i>², so <Q>the electric field density, decreases with the square of the distance</Q>. In principle it continues to infinity.</p>
    </>,
    tryThis: [
      'Drag the picture to turn it. The lines come in from every direction, and the sphere is crossed by every one of them.',
      'Grow the sphere. Its crossings spread apart over its area, and the highlighted patch, which keeps one fixed area, holds fewer and fewer of them.',
      'Watch the area and the density: at twice the radius, four times the area and a quarter of the density.',
      'Follow the marker down the curve: it never reaches zero.',
    ],
    notes: <>
      <p>The printed figure is flat: eight lines and circles on the page. On a flat page the lines cross circles, whose length grows only as <i>r</i>, so the drawing alone would suggest a fall with distance, not with its square. The square comes from the sphere’s area, 4π<i>r</i>², as the text says, so the diagram is drawn in three dimensions.</p>
      <p>The 26 lines, spread evenly over every direction, and the patch of fixed area are display choices; Fleming says only that each surface is crossed by the same number of lines. Where the browser cannot draw in 3D, the flat page view with its eight lines is shown.</p>
    </>,
    labs: [{ lab: 'electron', scenario: 'charge-flux', why: 'A Gauss sphere of variable radius round the electron, with the flux through it.' }],
  },
  {
    kind: 'figure', id: '6-5', page: 52, title: 'Opposite charges: lines from one to the other',
    caption: 'A free positive charge and a free negative charge with field lines aligned between them.',
    Diagram: twoCharges([1, -1], 'lines', ['Free positive charge', 'Free negative charge']),
    text: <p>With two opposite charges nearby, <Q>Following convention, the arrows are drawn from the positive charge toward the negative charge</Q> (<Pg n={51}/>). Figure 6-13 returns to this picture and shows what the lines are made of.</p>,
    tryThis: [drag, 'Switch “Draw the field as” to Zeptons: the same curves, now as dipoles end to end with their positive ends toward the negative charge.', 'Turn on the push to see which way the charges are moved.'],
    notes: <p>The lines are traced from an inverse-square field of two point charges, ten to each charge; Faraday’s and Fleming’s drawings are freehand.</p>,
  },
  {
    kind: 'figure', id: '6-6', page: 52, title: 'Like charges: lines that turn aside',
    caption: 'Two positive charges with field lines between them.',
    Diagram: twoCharges([1, 1], 'lines', ['First positive charge', 'Second positive charge'], true),
    text: <>
      <p>Faraday drew the lines between like charges turning away from each other: <Q>This illustration shows the repulsive force between the like charges</Q> (<Pg n={52}/>).</p>
      <p>The point of the zero-point model is that <Q>there no longer has to be action at a distance</Q>. The lines illustrate <Q>real zepton dipoles that cover the full length of the field lines from one end to the other, or toward infinity</Q>, <Q>lined up end to end virtually in contact with each other</Q>.</p>
    </>,
    tryThis: [drag, 'Bring the charges close together and watch the lines between them bend away more sharply.', 'Reverse both charges: the pattern is the same and only the arrows change, which is Figure 6-11.'],
  },
  {
    kind: 'figure', id: '6-7', page: 53, title: 'Which way E points',
    caption: 'The electrostatic or E field points in the direction of the positive end of the zepton dipoles.',
    Diagram: FieldDirection,
    text: <p>Faraday’s electrostatic field converts simply: <Q>the alignment of the field is in a line with the polarized zepton charges going from negative toward positive</Q>, <Q>keeping in mind that the positive end of the zepton is pointing toward a negative free charge</Q> (<Pg n={52}/>).</p>,
    tryThis: ['Read along a zepton from its cool (negative) end to its warm (positive) end: that is the direction of E.', 'Swap the charges. The zeptons turn end for end and E turns with them.', 'Turn on the field at each zepton: every one carries the same small arrow.'],
  },
  {
    kind: 'figure', id: '6-8', page: 53, section: 'Electric Attraction and Repulsion', title: 'A bridge of zeptons between opposite charges',
    caption: 'A free electron and proton with a row of polarized zeptons lined up between them end to end across the entire distance.',
    Diagram: ZeptonBridge,
    text: <p>Between an electron and a proton <Q>zeptons form a virtual bridge between the particles. There will be of course a continuum of such lines with most of them curved in a manner consistent with Figure 6-5</Q> (<Pg n={53}/>).</p>,
    tryThis: ['Change the distance: the row always reaches from one particle to the other, with more or fewer zeptons in it.', 'Turn on the continuum to see the curved rows either side of the straight one.'],
    labs: [{ lab: 'casimir', scenario: 'electron-proton', why: 'Zeptons born at random that line up between an electron and a proton, with the pressure they leave.' }],
  },
  {
    kind: 'figure', id: '6-9', page: 53, title: 'Between like charges, like ends meet',
    caption: 'Two free electrons with a row of polarized zeptons lined up between them with like charges in opposition at the midway point.',
    Diagram: LikeChargesRow,
    text: <p><Q>In this case we have two negative virtual charges in virtual contact with each other. These two negative charges are repelled from one another. These two like charges must then move away from each other, if only slightly, before the zeptons are annihilated</Q> (<Pg n={53}/>).</p>,
    tryThis: ['Follow the row from each electron inward: positive end first, each time. At the centre the two rows meet negative end to negative end.', 'Let the middle zeptons respond and watch them shift apart in each generation.'],
    notes: <p>How far the middle zeptons move before they are annihilated is a display choice; the text says only “if only slightly”.</p>,
    labs: [{ lab: 'casimir', scenario: 'electron-electron', why: 'The same meeting of like ends, with the deflection and gap filling that follow.' }],
  },
  {
    kind: 'figure', id: '6-10', page: 54, title: 'Repulsion: a hole filled, and pressure',
    caption: 'Two free electrons with polarized zeptons between them showing the deflection in the center and a new zepton coming into existence producing pressure that pushes the electrons apart.',
    Diagram: RepulsionPressure,
    text: <>
      <p><Q>As the like charges of the zepton dipoles deflect, they produce a small hole in space. That hole is filled with another zepton, then another, and another, and another</Q> (<Pg n={53}/>).</p>
      <p><Q>As each new zepton arrives on the scene it is forced to align with nearby polarized particle pairs and subsequently deflects to avoid like charges. This creates an increase in pressure in the space between the free particles. The virtual particle pairs push against adjacent pairs, which in turn push against those in line toward the particles.</Q> The electrons are pushed apart <Q>as the pressure of the vacuum between the particles increases and overcomes the pressure of the vacuum outside</Q>. The mechanism is <Q>reminiscent of the Casimir Force</Q> (<Pg n={54}/>).</p>
    </>,
    tryThis: ['Watch one generation in three steps: the rows bow apart at the centre, a new zepton (marked) forms in the hole, and its push runs outward along the rows to the electrons.', 'Count the generations: each one moves the electrons a little further apart.'],
    notes: <p>The timing of the three steps, the number of generations shown and the distance moved in each are display choices. The figure prints one moment of the process.</p>,
    labs: [{ lab: 'casimir', scenario: 'electron-electron', why: 'Random births, deflection and gap filling between two electrons, with the local pressure coloured and the charges free to move.' }],
  },
  {
    kind: 'figure', id: '6-11', page: 54, title: 'Repulsion drawn in zeptons',
    caption: 'Two free electrons with polarized zeptons oriented between them forming the well-known electrostatic repulsion field lines.',
    Diagram: twoCharges([-1, -1], 'zeptons', ['First electron', 'Second electron']),
    text: <p>Every line of dipoles round each charge is deflected a little, as the middle ones are. <Q>The lines of zepton diploes end up tracing out the well-known Faraday electrostatic field lines</Q> of Figure 6-6. <Q>These are not field lines at all, but rather zeptons acting as simple dipoles, instantaneously lined up end-to-end</Q> (<Pg n={54}/>).</p>,
    tryThis: [drag, 'Switch to Both: Faraday’s lines appear under the zeptons, and each zepton lies along one.', 'Turn on the push: the pressure between the electrons moves them apart.'],
    labs: [{ lab: 'casimir', scenario: 'electron-electron', why: 'The pressure that this pattern of zeptons produces between two electrons.' }],
  },
  {
    kind: 'figure', id: '6-12', page: 55, title: 'Attraction: the chain shortens',
    caption: 'A free electron and proton being pushed together as the available space for zeptons between them disappears.',
    Diagram: AttractionChain,
    text: <>
      <p>The key is what happens when each zepton annihilates. <Q>The electron-positron dipole starts at a point, moves outward to its maximum extent, its wavelength, and then collapses back to a point. As each zepton contracts newer zeptons next to it easily fill in the space. When each successive zepton vanishes, the space available for the next pair is smaller, so smaller wavelength zeptons take its place or longer wavelength zeptons meet in the middle</Q> (<Pg n={55}/>).</p>
      <p><Q>The pressure pushing outward between the charges is slightly reduced as compared to the normal pressure pushing on matter from all directions. Over time, the length of the chain of zeptons is shortened as the pressure from outside pushes the charges together.</Q></p>
      <p>Fleming stresses the push principle here: the force <Q>is not due to the virtual dipoles between the charges pulling them together as we might imagine</Q>.</p>
    </>,
    tryThis: ['Watch the marked zepton in each step: it collapses to a point, and the chain closes over where it was.', 'Follow the count from 8 to 2, the three stages of the printed figure.', 'Notice what moves the particles: the broad arrows outside them, not anything between.'],
    notes: <p>Which zepton of the chain collapses in each step, and the pace, are display choices.</p>,
    labs: [{ lab: 'casimir', scenario: 'electron-proton', why: 'Aligned contraction between an electron and a proton, with the pressure histories and the charges released.' }],
  },
  {
    kind: 'figure', id: '6-13', page: 56, title: 'Attraction drawn in zeptons',
    caption: 'A free electron and proton with zeptons between and around them showing the well-known Faraday field lines of electrostatic attraction.',
    Diagram: twoCharges([-1, 1], 'zeptons', ['Electron', 'Proton']),
    text: <p>The same holds for the strands off the axis: <Q>as zeptons are excluded, the strands get pushed toward the axis. What we see then are stands of virtual pairs that follow the well-known Faraday field line model for electrostatic attraction</Q> (<Pg n={55}/>).</p>,
    tryThis: [drag, 'Switch to Both to lay Faraday’s lines of Figure 6-5 under the zeptons.', 'Turn on the push: the particles are pushed together from outside.'],
    labs: [{ lab: 'casimir', scenario: 'electron-proton', why: 'The pressure this pattern leaves between the two particles.' }],
  },
  {
    kind: 'figure', id: '6-14', page: 56, section: 'Magnetism', title: 'A moving charge turns the zeptons',
    caption: 'A free electron in three separate positions relative to two zeptons. The zeptons rotate in response to the electron motion.',
    Diagram: MovingCharge,
    text: <>
      <p><Q>The nature of the zepton dipoles is to align with respect to a charge, so when the free charge is moving, the dipoles change their orientation in order to stay aligned. So, as a free electron moves, the zepton dipoles rotate to maintain their orientation relative to the stable charge</Q> (<Pg n={56}/>).</p>
      <p>Later in the chapter Fleming draws the consequence: <Q>zeptons on opposite sides of a current carrying wire, always spin in opposite directions</Q> (<Pg n={59}/>).</p>
    </>,
    tryThis: ['Drag the electron from the left circle to the right one: these are the three positions of the printed figure. Each zepton keeps its positive end on the electron.', 'Compare the two readouts as you go: one angle rises while the other falls.', 'Press “Move the electron” and watch the curled arrows reverse when the electron turns back.'],
    notes: <p>The electron’s return journey is added so the motion can repeat; the figure shows one pass.</p>,
    labs: [{ lab: 'electron', scenario: 'moving', why: 'An electron passing through the field in three dimensions, with the pairs turning as it goes.' }],
  },
  {
    kind: 'figure', id: '6-15', page: 57, title: 'A current keeps the zeptons spinning',
    caption: 'Electrons in motion within a conductor induce rotation in surrounding zeptons.',
    Diagram: CurrentAndSpin,
    text: <>
      <p>A series of charges in motion is a current. <Q>The zeptons rotate in response to the first charge, and continue rotating as the next charge passes by, and so on, and so on, and the zeptons keep on spinning. Or, more properly as the zeptons flash in and out of existence, each successive one continues the spinning motion, conserving angular momentum</Q> (<Pg n={56}/>).</p>
      <p>The reverse is also true: spinning zeptons induce charge movement in a conductor. <Q>The balance between the spinning zeptons in the zero-point field and the current in the conductor forms an inherently symbiotic relationship</Q>. <Q>One can think of it as something akin to inertia for electric forces. The current continues as long as the magnetic field continues and the current stops when the magnetic field stops</Q> (<Pg n={57}/>).</p>
    </>,
    tryThis: ['Compare the two rows of zeptons: they turn opposite ways, as Figure 6-14 requires.', 'Reverse the flow with the slider and both rows reverse.', 'Turn off “Drive the current”. The current does not stop at once: the spinning field keeps it going while it dies away, and the two reach zero together.'],
    notes: <p>How quickly the current and the spin rise and die away is a display choice; Fleming describes the mutual dependence but gives no rate. The printed figure does not mark the direction of B, and none is drawn here.</p>,
    labs: [{ lab: 'electron', scenario: 'moving', query: 'L=+rotation', why: 'The rotation a single moving electron leaves in the field, with the local sense of rotation marked.' }],
  },
  {
    kind: 'figure', id: '6-16', page: 58, section: 'Faraday’s Magnetism', title: 'From rotation to B: the right hand grip',
    caption: 'The right hand grip rule to determine the direction of the magnetic, or B, field shown here pointing along the y-axis.',
    Diagram: GripRule,
    text: <>
      <p><Q>If you hold your hand with your fingers curled inward and your thumb pointing up and then align your fingertips so they point in the direction of zepton rotation, your thumb will point in the direction of the B field</Q> (<Pg n={58}/>).</p>
      <p>The same rule settles the question of monopoles. The south pole is found with the left hand, and <Q>the right thumb and left thumb will always point in opposite directions with respect to a spinning dipole. Since magnetic forces are due to spinning dipoles they must always produce both magnetic poles</Q> (<Pg n={60}/>).</p>
    </>,
    tryThis: ['Reverse the rotation: B turns from up to down.', 'Lean the axis of rotation. B stays on the axis, whatever way it points.', 'Turn on the left hand. The south pole is always opposite the north: one spinning dipole, two poles.'],
    notes: <p>The figure prints a small rotation mark beside the axes and a drawing of a hand. The pair is drawn here circling the y axis, with the sense that the grip rule gives for B along +y.</p>,
    labs: [{ lab: 'electron', scenario: 'spin', why: 'Zeptons turning about an electron’s spin axis, with the intrinsic magnetic field that goes with it.' }],
  },
  {
    kind: 'figure', id: '6-17', page: 58, title: 'A magnet’s lines, threaded with spinning zeptons',
    caption: 'A simple bar magnetic with north and south poles marked N and S respectively and magnetic field lines running from one end to the other.',
    Diagram: BarMagnet,
    text: <>
      <p><Q>With a common bar magnet the magnetic field lines are shown exiting the north pole looping around the magnet and entering the south pole</Q> (<Pg n={58}/>).</p>
      <p>What the lines stand for comes a page later: <Q>If you imagine those little dipoles as little loops of current, the magnetic field line is like drawing strings through all those little loops so that they lie in a line</Q> (<Pg n={59}/>). Of permanent magnets Fleming says there must be <Q>zepton dipoles rotating within the structure of the ferromagnetic material</Q>, sustained by some effect <Q>yet to be determined</Q>.</p>
    </>,
    tryThis: ['Drag the compass through the field. It always lies along the line it is on, pointing from N round to S.', 'Look at the threaded line: every loop spins the same way about the line, as the grip rule of Figure 6-16 requires.', 'Raise the strength: more lines.'],
    notes: <p>The lines are those of two poles at the ends of the bar, a common textbook approximation. The size and spacing of the loops are display choices.</p>,
  },
  {
    kind: 'figure', id: '6-18', page: 59, title: 'A coil: spin inside, opposite spin outside',
    caption: 'A cross section of a coil with a current coming out the top of the winding and in the bottom spiraling from left to right through the windings producing a magnetic field with the north pole to the right.',
    Diagram: Coil,
    text: <>
      <p>Curl the fingers of the right hand the way the current flows through the coil, and <Q>your thumb will point in the direction of the magnetic field, the north pole of the electromagnet</Q> (<Pg n={59}/>).</p>
      <p><Q>The current in the coil is making the zepton dipoles of the vacuum that are inside the coil spin in the same circular direction.</Q> And <Q>while the zeptons inside the coil spin one way, the zeptons outside the coil spin the opposite direction, and we can see the magnetic field lines outside the coil also point in the opposite direction.</Q></p>
    </>,
    tryThis: [
      'Drag to turn the coil. With the front cut away you can see inside: the field runs along the axis, out at N and back round the outside to S.',
      'Compare a zepton inside the coil with one outside it: each spins about the field where it is, so they spin opposite ways.',
      'Watch the markers on the wire: the current comes out of the page at the top of each turn and goes in at the bottom, as the caption says, and the right hand grip gives N on the right.',
      'Reverse the current. The poles change ends and every zepton reverses. Set it to zero and the field is gone.',
    ],
    notes: <>
      <p>The printed figure is a cross section: the grey circles are the tops of the turns, the white circles the bottoms. The diagram draws the whole coil in three dimensions, with the front half cut away to show the inside.</p>
      <p>The field lines are computed for the six turns, each taken as a circular loop, and drawn in four planes through the axis. The zeptons are drawn as small dipoles spinning about the field where they stand; their size and speed are display choices. Where the browser cannot draw in 3D, the printed cross section is shown, computed for twelve straight wires seen end on.</p>
    </>,
  },
];

const chapter: ChapterContent = {
  n: 6,
  summary: <>
    <p>A free charge polarizes the zeptons round it as it would a gas of atoms: their positive ends turn toward an electron. Faraday’s field lines are a drawing of those rows of dipoles, end to end. The electric field is zeptons oriented to charge.</p>
    <p>Forces follow by the push principle of chapter 3. Between like charges the meeting of like ends makes room for more zeptons and raises the pressure; between opposite charges the chain of zeptons shortens and the pressure falls. A moving charge makes the zeptons rotate, and that rotation, kept going by a current, is the magnetic field (<Pg n={60}/>).</p>
  </>,
  items,
  labs: [
    { lab: 'electron', scenario: 'stationary', why: 'The electric half of this chapter round one electron.' },
    { lab: 'casimir', scenario: 'electron-electron', why: 'Attraction and repulsion as differences of vacuum pressure between two charges.' },
    { lab: 'electron', scenario: 'moving', why: 'The magnetic half: rotation induced by a moving electron.' },
  ],
};
export default chapter;
