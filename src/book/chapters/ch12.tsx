// Chapter 12: Astronomical Motion (PDF pp. 98–109). Figures 12-1 to 12-8.
import { useMemo, useRef, useState } from 'react';
import { Arrow, BlockArrow, Body, Choice, Diagram, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, Still, T, Toggle, clamp, deg, fmt, pathThrough, polar, rad, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;

/** Figure 12-1: Newtonian gravity as the small difference between two larger forces. */
function TwoForces() {
  const [excess, setExcess] = useState(2);
  const [r, setR] = useState(1);
  const H = 300, y = 150, xa = 110, xb = 610, newton = 1 / (r * r), matter = excess * newton, gravity = (excess + 1) * newton, unit = 34;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two bodies. The Matter Force pushes them apart with strength ${fmt(matter)}, gravity pushes them together with strength ${fmt(gravity)}, and the difference, ${fmt(newton)}, is Newtonian gravity.`}>
      <Body x={xa} y={y} r={46} tone="plain"/><Body x={xb} y={y} r={46} tone="plain"/>
      <Arrow x1={W / 2 - clamp(matter * unit, 8, 190)} y1={y - 44} x2={W / 2 + clamp(matter * unit, 8, 190)} y2={y - 44} both tone="matter" w={3} head={12}/><T x={W / 2} y={y - 56} tone="matter">Matter Force: apart</T>
      <Arrow x1={W / 2 - clamp(gravity * unit, 8, 190)} y1={y + 44} x2={W / 2 - 3} y2={y + 44} tone="force" w={3} head={12}/><Arrow x1={W / 2 + clamp(gravity * unit, 8, 190)} y1={y + 44} x2={W / 2 + 3} y2={y + 44} tone="force" w={3} head={12}/><T x={W / 2} y={y + 72} tone="text">gravity: together</T>
      <Arrow x1={W / 2 - clamp(newton * unit, 6, 190)} y1={y} x2={W / 2 - 3} y2={y} tone="accent" w={2} head={9}/><Arrow x1={W / 2 + clamp(newton * unit, 6, 190)} y1={y} x2={W / 2 + 3} y2={y} tone="accent" w={2} head={9}/><T x={W / 2} y={y - 10} tone="accent" size="sm">Newtonian Gravity: the difference</T>
    </Stage>}>
    <Slider label="How much stronger the real forces are" value={excess} min={0.5} max={5} step={0.5} onChange={setExcess} show={v => `${v} × Newtonian`}/>
    <Slider label="Distance between the bodies" value={r} min={0.6} max={2} step={0.05} onChange={setR} show={v => `${fmt(v, 2)} ×`}/>
    <Readout label="Matter Force (apart)" value={fmt(matter)} tone="force"/>
    <Readout label="Gravity (together)" value={fmt(gravity)}/>
    <Readout label="Newtonian Gravity (net)" value={fmt(newton)} tone="good"/>
    <Remark>Whatever the two real forces are, what is measured is their difference; both fall with the square of the distance here.</Remark>
  </Diagram>;
}

/** Curled arrows standing for the zeptons round a rotating body: they turn the opposite way, and thin out with distance. */
function CounterField({ x, y, inner, rings, sense, count = 9 }: { x: number; y: number; inner: number; rings: number; sense: number; count?: number }) {
  if (Math.abs(sense) < 0.05) return null;
  return <g>{Array.from({ length: rings }, (_, k) => Array.from({ length: count + k * 2 }, (_, i) => {
    const [px, py] = polar(x, y, inner + k * 36, (i / (count + k * 2)) * 360 + k * 17);
    return <Spin key={`${k}-${i}`} x={px} y={py} r={10} ccw={sense < 0} sweep={90 + 160 * Math.min(1, Math.abs(sense))} w={1.4} opacity={0.9 / (1 + k * 0.9)} steady/>;
  }))}</g>;
}

/** Figure 12-2: a small body orbiting a rotating one is pushed toward it by the mattermagnetic field. */
function OrbitInField() {
  const [omega, setOmega] = useState(0.7);
  const [orbit, setOrbit] = useState<'ccw' | 'cw'>('ccw');
  const play = usePlayback({ speed: 0.25 });
  const H = 400, cx = 300, cy = 200, R = 150, dir = orbit === 'ccw' ? 1 : -1, a = dir * play.t * 360, [px, py] = polar(cx, cy, R, a);
  // B_m points into the page for a body rotating counter-clockwise. The force m(υ × B_m) is toward the body when the
  // orbit goes the same way as the rotation, and away from it otherwise.
  const inward = Math.sign(omega) * dir, strength = Math.abs(omega), [vx, vy] = polar(px, py, 52, a + dir * 90), [fx, fy] = polar(px, py, -inward * (18 + 44 * strength), a);
  return <Diagram stage={
    <Stage w={W} h={H} label={Math.abs(omega) < 0.05 ? 'A small body orbiting a larger one that is not rotating: no mattermagnetic force.' : `A small body orbiting ${orbit === 'ccw' ? 'counter-clockwise' : 'clockwise'} round a larger body rotating ${omega > 0 ? 'counter-clockwise' : 'clockwise'}. The mattermagnetic field points ${omega > 0 ? 'into' : 'out of'} the page and the force on the small body is ${inward > 0 ? 'toward' : 'away from'} the larger one.`}>
      <circle cx={cx} cy={cy} r={R} className="bk-s-faint" fill="none" strokeDasharray="3 6"/>
      <CounterField x={cx} y={cy} inner={78} rings={3} sense={omega}/>
      <Body x={cx} y={cy} r={52} tone="plain"/>{Math.abs(omega) > 0.05 && <Spin x={cx} y={cy} r={24} ccw={omega > 0} sweep={270} tone="text" w={3} steady/>}<T x={cx + 34} y={cy - 26} tone="text" italic>ω</T>
      <Arrow x1={px} y1={py} x2={vx} y2={vy} tone="motion" w={2.4}/><T x={vx + 12} y={vy + 4} tone="motion" italic>υ</T>
      {Math.abs(omega) > 0.05 && <><BlockArrow x1={px} y1={py} x2={fx} y2={fy} thick={10}/><T x={fx + (fx < px ? -18 : 18)} y={fy + 18} tone="text" italic>F m</T></>}
      <Body x={px} y={py} r={15} tone="plain"/>
      {Math.abs(omega) > 0.05 && <><InOut x={600} y={70} out={omega < 0} r={11}/><T x={620} y={75} anchor="start" tone="b">B_m</T></>}
    </Stage>}>
    <Slider label="Rotation of the larger body, ω" value={omega} min={-1} max={1} step={0.05} onChange={setOmega} show={v => (Math.abs(v) < 0.05 ? 'none' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'counter-clockwise' : 'clockwise'}`)}/>
    <Choice label="Direction of the orbit" value={orbit} onChange={setOrbit} options={[{ value: 'ccw', label: 'Counter' }, { value: 'cw', label: 'Clockwise' }]}/>
    <PlayBar play={play} label="the orbit"/>
    <Readout label="Mattermagnetic field" value={Math.abs(omega) < 0.05 ? 'none' : omega > 0 ? 'into the page' : 'out of the page'} tone="b"/>
    <Readout label="Force on the small body" value={Math.abs(omega) < 0.05 ? 'none' : inward > 0 ? 'toward the larger' : 'away from it'} tone="force"/>
    <Remark>{inward > 0 ? 'The extra inward push makes the orbiting body appear heavier than it is.' : 'Rotation and orbit must go the same way for the push to be inward.'}</Remark>
  </Diagram>;
}

/** Figure 12-3: a rotating planet and the counter-rotating zepton field that is its angular inertia. */
function PlanetSpinField() {
  const [omega, setOmega] = useState(0.7);
  const play = usePlayback();
  const H = 360, cx = 320, cy = 180, turned = play.t * omega * 90;
  return <Diagram stage={
    <Stage w={W} h={H} label={Math.abs(omega) < 0.05 ? 'A body that is not rotating: no mattermagnetic field of rotation.' : `A small body rotating ${omega > 0 ? 'counter-clockwise' : 'clockwise'}, with a counter-rotating zepton field round it. Its mattermagnetic field points ${omega > 0 ? 'into' : 'out of'} the page.`}>
      <CounterField x={cx} y={cy} inner={104} rings={2} sense={omega} count={10}/>
      <Body x={cx} y={cy} r={72} tone="plain"/>
      <line x1={polar(cx, cy, 66, turned)[0]} y1={polar(cx, cy, 66, turned)[1]} x2={polar(cx, cy, 66, turned + 180)[0]} y2={polar(cx, cy, 66, turned + 180)[1]} className="bk-s-muted" strokeDasharray="4 6"/>
      {Math.abs(omega) > 0.05 && <Spin x={cx} y={cy} r={28} ccw={omega > 0} sweep={270} tone="text" w={3}/>}<T x={cx + 40} y={cy - 30} tone="text" italic>ω</T>
      {Math.abs(omega) > 0.05 && <><InOut x={590} y={90} out={omega < 0} r={12}/><T x={612} y={96} anchor="start" tone="b" size="lg">B m</T></>}
    </Stage>}>
    <Slider label="Rotation of the body, ω" value={omega} min={-1} max={1} step={0.05} onChange={setOmega} show={v => (Math.abs(v) < 0.05 ? 'none' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'counter-clockwise' : 'clockwise'}`)}/>
    <PlayBar play={play} label="the rotation"/>
    <Readout label="Zeptons round it rotate" value={Math.abs(omega) < 0.05 ? 'not at all' : omega > 0 ? 'clockwise' : 'counter-clockwise'}/>
    <Readout label="Mattermagnetic field" value={Math.abs(omega) < 0.05 ? 'none' : omega > 0 ? 'into the page' : 'out of the page'} tone="b"/>
    <Remark>This field is the body’s angular inertia. The Sun’s rotation makes one of the same sense round the Sun.</Remark>
  </Diagram>;
}

/** The Sun's rotational field at a planet's inner and outer sides, relative to the planet's own orbital field there. */
export function sunFieldAt(sides: 'inner' | 'outer', strength: number) {
  // Inverse square from the Sun: the side nearer the Sun is a little closer, so the field is a little stronger there.
  return strength * (sides === 'inner' ? 1 / 0.9 ** 2 : 1 / 1.1 ** 2);
}

/** Figure 12-4: the two fields either side of an orbiting planet, and how the Sun's field unbalances them. */
function SynchronousRotation() {
  const [sun, setSun] = useState(true);
  const play = usePlayback();
  const state = useRef({ t: 0, spin: 1, angle: 0, distance: 1 });
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t)), s = state.current;
  if (play.t < s.t) { s.spin = 1; s.distance = 1; s.angle = 0; }
  s.t = play.t;
  const inner = sun ? sunFieldAt('inner', 0.35) : 0, outer = sun ? sunFieldAt('outer', 0.35) : 0, against = 1 + inner, withIt = 1 + outer, differential = against - withIt;
  // The side working against the rotation is the stronger, so the rotation slows, and what it loses goes to the orbit.
  const lost = s.spin * differential * 0.9 * dt;
  // What the orbit gains is what the rotation actually lost; once the rotation reaches its floor, nothing more passes.
  const before = s.spin; s.spin = Math.max(0.04, s.spin - lost); s.distance += (before - s.spin) * 0.25; s.angle += s.spin * 200 * dt;
  const H = 380, cx = 410, cy = 200, R = 60, grid = [-70, -25, 20, 65];
  return <Diagram stage={
    <Stage w={W} h={H} label={`A planet moving up the page in its orbit, with the Sun to the left. Its orbital motion makes a field out of the page on the Sun's side and into the page on the far side. ${sun ? 'The Sun’s own rotational field, into the page, is stronger on the near side, so the planet’s rotation slows.' : 'Without the Sun’s field the two sides are equal and the rotation does not change.'}`}>
      <Arrow x1={110} y1={cy} x2={50} y2={cy} tone="muted" w={1.6}/><T x={120} y={cy - 12} anchor="start" size="sm">to the Sun</T>
      {grid.map(dy => <g key={dy}>
        <Spin x={cx - 128} y={cy + dy} r={13} ccw sweep={220} w={1.6} steady/>
        <Spin x={cx + 128} y={cy + dy} r={13} ccw={false} sweep={220} w={1.6} steady/>
        {sun && <><InOut x={cx - 176} y={cy + dy} out={false} r={5 + 9 * inner} tone="b" opacity={0.9}/><InOut x={cx + 176} y={cy + dy} out={false} r={5 + 9 * outer} tone="b" opacity={0.9}/></>}
      </g>)}
      <T x={cx - 128} y={cy - 104} size="sm" tone="motion">orbital field: out of the page</T><T x={cx + 128} y={cy - 104} size="sm" tone="motion">orbital field: into the page</T>
      {sun && <T x={cx} y={H - 16} size="sm" tone="b">⊗ the Sun’s rotational field: into the page on both sides, stronger nearer the Sun</T>}
      <Arrow x1={cx} y1={cy - R - 8} x2={cx} y2={cy - R - 70} tone="motion" w={3}/><T x={cx + 14} y={cy - R - 44} tone="motion" italic>υ</T>
      <Body x={cx} y={cy} r={R} tone="plain"/>
      <line x1={polar(cx, cy, R - 6, s.angle)[0]} y1={polar(cx, cy, R - 6, s.angle)[1]} x2={polar(cx, cy, R - 6, s.angle + 180)[0]} y2={polar(cx, cy, R - 6, s.angle + 180)[1]} className="bk-s-muted" strokeWidth="2" strokeDasharray="5 6"/>
      <Still><Spin x={cx} y={cy} r={22} ccw sweep={60 + 210 * s.spin} tone="text" w={3}/><T x={cx + 34} y={cy - 22} tone="text" italic>ω</T></Still>
    </Stage>}>
    <Toggle label="Include the Sun’s rotational field" checked={sun} onChange={setSun}/>
    <PlayBar play={play} label="the passage of time"/>
    <Readout label="Field against the rotation" value={fmt(against, 3)} tone="b"/>
    <Readout label="Field with the rotation" value={fmt(withIt, 3)} tone="b"/>
    <Readout label="Planet’s rate of rotation" value={`${Math.round(s.spin * 100)} % of its start`} tone={sun ? 'bad' : 'good'}/>
    <Readout label="Distance from the Sun" value={`${fmt(s.distance, 4)} ×`}/>
    <Remark>{sun ? 'As the body loses angular momentum it gains linear momentum, and its distance increases: the Earth’s rotation is slowing while the Moon recedes.' : 'In free space these two effects are equal, so the angular velocity does not change.'}</Remark>
  </Diagram>;
}

/** The radius of a precessing ellipse at an angle: successive perihelia are (1 + advance) turns apart, so the ellipse
 * turns by `advance` of a turn in each orbit. */
export const precessingRadius = (theta: number, a: number, e: number, advance: number) => (a * (1 - e * e)) / (1 + e * Math.cos(theta / (1 + advance)));

/** Figure 12-5: an elliptical orbit whose perihelion advances with each revolution. */
function PrecessingOrbit() {
  const [advance, setAdvance] = useState(0.06);
  const [e, setE] = useState(0.55);
  const play = usePlayback();
  const state = useRef({ t: 0, theta: 0 });
  // Restart (or a step back) begins again from the starting state.
  if (play.t < state.current.t) state.current = { t: 0, theta: 0 };
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t)), H = 400, cx = 330, cy = 215, a = 120;
  state.current.t = play.t;
  // Equal areas in equal times: the planet moves fastest at perihelion.
  const rNow = precessingRadius(state.current.theta, a, e, advance);
  state.current.theta += ((a * a * 2.4) / (rNow * rNow)) * dt;
  const theta = state.current.theta, at = (th: number): [number, number] => { const r = precessingRadius(th, a, e, advance); return [cx + r * Math.sin(th), cy + r * Math.cos(th)]; };
  const from = Math.max(0, theta - 5 * 2 * Math.PI), trail = pathThrough(Array.from({ length: 400 }, (_, i) => at(from + ((theta - from) * i) / 399)));
  // An orbit runs perihelion to perihelion, (1 + advance) turns, so a perihelion is marked only once the planet has passed it.
  const [px, py] = at(theta), orbits = theta / (2 * Math.PI * (1 + advance));
  return <Diagram stage={
    <Stage w={W} h={H} label={`A planet on an elliptical orbit round a sun. The ellipse turns ${fmt(advance * 360, 2)} degrees further round with each orbit: the perihelion advances.`}>
      <Line d={trail} tone="muted" w={1.6}/>
      <Body x={cx} y={cy} r={16} tone="matter"/>
      <Body x={px} y={py} r={8} tone="plain"/>
      {advance > 0 && Array.from({ length: Math.min(5, Math.floor(orbits) + 1) }, (_, k) => { const n = Math.floor(orbits) - k; if (n < 0) return null; const [x, y] = at(n * 2 * Math.PI * (1 + advance)); return <circle key={n} cx={x} cy={y} r={4} className="bk-f-mark" opacity={1 - k * 0.18}/>; })}
      <T x={590} y={70} size="sm" tone="mark">● perihelion, orbit by orbit</T>
    </Stage>}>
    <Slider label="Advance of the perihelion per orbit" value={advance} min={0} max={0.15} step={0.005} onChange={setAdvance} show={v => (v === 0 ? 'none (Newton, two bodies)' : `${fmt(v * 360, 2)}°`)}/>
    <Slider label="Eccentricity of the orbit" value={e} min={0.1} max={0.75} step={0.05} onChange={setE}/>
    <PlayBar play={play} label="the orbit"/>
    <Readout label="Orbits completed" value={Math.floor(orbits)}/>
    <Readout label="Mercury’s unexplained advance" value="43″ per century"/>
    <Remark>{advance === 0 ? 'Two homogeneous spheres under Newtonian gravity: the ellipse stays where it is.' : 'The advance here is enormously exaggerated. Mercury’s unexplained 43 arcseconds a century is about a ten-millionth of a turn per orbit.'}</Remark>
  </Diagram>;
}

/** A point of an orbit with its velocity and the mattermagnetic force on it. */
export interface OrbitPoint { x: number; y: number; vx: number; vy: number; fx: number; fy: number }

/**
 * An orbit under Newtonian gravity (GM = 1) with a mattermagnetic Lorentz force m(υ × B_m) added, B_m pointing into
 * the page with strength k / r². Positions have y up the page. Starts at perihelion and runs for `turns` Newtonian periods.
 */
export function orbitWithLorentz(k: number, turns = 4, e = 0.55, perihelion = 0.45): OrbitPoint[] {
  let x = perihelion, y = 0, vx = 0, vy = Math.sqrt((1 + e) / perihelion);
  const a = perihelion / (1 - e), period = 2 * Math.PI * Math.sqrt(a ** 3), steps = Math.round(turns * 1500), dt = (turns * period) / steps, out: OrbitPoint[] = [];
  const accel = (px: number, py: number, ux: number, uy: number) => { const r2 = px * px + py * py, r = Math.sqrt(r2), b = k / r2; return [-px / (r2 * r) - b * uy, -py / (r2 * r) + b * ux, -b * uy, b * ux] as const; };
  for (let i = 0; i <= steps; i++) {
    const [ax, ay, fx, fy] = accel(x, y, vx, vy);
    if (i % 6 === 0) out.push({ x, y, vx, vy, fx, fy });
    // A midpoint step keeps the orbit closed to drawing accuracy when k is zero.
    const mx = x + vx * dt / 2, my = y + vy * dt / 2, mvx = vx + ax * dt / 2, mvy = vy + ay * dt / 2, [bx, by] = accel(mx, my, mvx, mvy);
    x += mvx * dt; y += mvy * dt; vx += bx * dt; vy += by * dt;
  }
  return out;
}

/** Figure 12-6: the mattermagnetic force along an elliptical orbit round a rotating sun, and the precession it causes. */
function LorentzOnOrbit() {
  const [k, setK] = useState(0.03);
  const play = usePlayback({ speed: 0.12 });
  const H = 420, cx = 300, sunY = 250, scale = 105;
  const orbit = useMemo(() => orbitWithLorentz(k), [k]);
  const screen = (p: { x: number; y: number }): [number, number] => [cx + p.y * scale, sunY + p.x * scale];
  const i = Math.floor((play.t % 1) * (orbit.length - 1)), p = orbit[i], [px, py] = screen(p), r = Math.hypot(p.x, p.y);
  const toSun = deg(Math.atan2(-p.y, -p.x)), force = deg(Math.atan2(p.fy, p.fx)), off = k === 0 ? 0 : Math.abs(((force - toSun + 540) % 360) - 180);
  const perOrbit = Math.round(orbit.length / 4);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A planet on an elliptical orbit round a rotating sun. The mattermagnetic force on it is at right angles to its velocity and ${Math.round(off)} degrees away from the direction of the sun. ${k > 0 ? 'With this force added the ellipse precesses.' : 'With no such force the ellipse is closed.'}`}>
      <Line d={pathThrough(orbit.map(screen))} tone="muted" w={1.4}/>
      {k > 0 && orbit.slice(0, perOrbit).filter((_, n) => n % Math.round(perOrbit / 10) === 0).map((q, n) => { const [x, y] = screen(q), m = Math.hypot(q.fx, q.fy) || 1, len = 14 + 26 * Math.min(1, m / (k * 9)); return <Arrow key={n} x1={x} y1={y} x2={x + (q.fy / m) * len} y2={y + (q.fx / m) * len} tone="text" w={1.6} head={7}/>; })}
      <Body x={screen({ x: 0, y: 0 })[0]} y={screen({ x: 0, y: 0 })[1]} r={15} tone="matter"/><Spin x={screen({ x: 0, y: 0 })[0]} y={screen({ x: 0, y: 0 })[1]} r={25} ccw sweep={230} tone="text" steady/>
      <Arrow x1={px} y1={py} x2={px + p.vy * 26} y2={py + p.vx * 26} tone="motion" w={2.2}/>
      {k > 0 && <BlockArrow x1={px} y1={py} x2={px + (p.fy / (Math.hypot(p.fx, p.fy) || 1)) * 44} y2={py + (p.fx / (Math.hypot(p.fx, p.fy) || 1)) * 44} thick={8}/>}
      <Line d={`M${px} ${py} L${screen({ x: 0, y: 0 })[0]} ${screen({ x: 0, y: 0 })[1]}`} tone="faint" dash="3 4"/>
      <Body x={px} y={py} r={8} tone="plain"/>
      <T x={560} y={80} anchor="start" size="sm" tone="motion">→ velocity</T><T x={560} y={102} anchor="start" size="sm" tone="text">➤ mattermagnetic force</T><T x={560} y={124} anchor="start" size="sm">⋯ line to the sun</T>
    </Stage>}>
    <Slider label="Strength of the mattermagnetic force" value={k} min={0} max={0.08} step={0.005} onChange={setK} show={v => (v === 0 ? 'none' : `${fmt(v * 100, 2)} % (exaggerated)`)}/>
    <PlayBar play={play} label="the planet"/>
    <Readout label="Distance from the sun" value={`${fmt(r, 2)} units`}/>
    <Readout label="Force points away from the sun’s centre by" value={`${Math.round(off)}°`}/>
    <Remark>{k === 0 ? 'Newtonian gravity alone: the planet retraces one ellipse.' : 'The force is largest near perihelion, where the planet is fastest and the sun’s field strongest, and each orbit is turned a little from the last.'}</Remark>
  </Diagram>;
}

/** The angular momentum of a uniform rotating disc, L = Iω with I = ½mr² (p. 106). */
export const discAngularMomentum = (m: number, r: number, omega: number) => 0.5 * m * r * r * omega;

/** Figure 12-7: a rotating disc, and how quickly its mattermagnetic field grows with radius. */
function GalaxyDisc() {
  const [m, setM] = useState(1);
  const [r, setR] = useState(1);
  const [omega, setOmega] = useState(1);
  const play = usePlayback();
  const H = 380, cx = 260, cy = 190, R = 70 + 80 * (r - 0.5), L = discAngularMomentum(m, r, omega), turned = play.t * omega * 60;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A rotating disc of matter charge ${fmt(m, 2)}, radius ${fmt(r, 2)} and angular velocity ${fmt(omega, 2)}. Its angular momentum, and so its mattermagnetic field, is ${fmt(L / 0.5, 3)} times that of the starting disc.`}>
      <circle cx={cx} cy={cy} r={R} className="bk-body bk-body-plain" opacity={0.5 + 0.2 * m}/>
      {Array.from({ length: 26 }, (_, i) => { const [x, y] = polar(cx, cy, R * (0.15 + 0.82 * ((i * 0.618) % 1)), turned + i * 137.5); return <circle key={i} cx={x} cy={y} r={2.2} className="bk-f-mark"/>; })}
      <Arrow x1={cx} y1={cy} x2={cx - R} y2={cy} tone="text" w={2.4}/><T x={cx - R / 2} y={cy - 10} tone="text" italic>r</T>
      <Still><Spin x={cx} y={cy + 4} r={20} ccw sweep={250} tone="text" w={2.4}/><T x={cx + 34} y={cy + 30} tone="text" italic>ω</T></Still><T x={cx} y={cy - R + 26} tone="text" italic>m</T>
      <rect x={520} y={60} width={46} height={250} className="bk-fill-soft"/>
      <rect x={520} y={310 - clamp(L / 4.5) * 250} width={46} height={clamp(L / 4.5) * 250} className="bk-f-b"/>
      <T x={543} y={332} size="sm" tone="b">B_m ∝ L</T><T x={600} y={310 - clamp(L / 4.5) * 250 + 5} anchor="start" tone="b">{fmt(L / 0.5, 3)} ×</T>
    </Stage>}>
    <Slider label="Matter charge of the disc, m" value={m} min={0.5} max={2} step={0.1} onChange={setM} show={v => `${fmt(v, 2)} ×`}/>
    <Slider label="Radius, r" value={r} min={0.5} max={1.5} step={0.05} onChange={setR} show={v => `${fmt(v, 2)} ×`}/>
    <Slider label="Angular velocity, ω" value={omega} min={0.2} max={2} step={0.1} onChange={setOmega} show={v => `${fmt(v, 2)} ×`}/>
    <PlayBar play={play} label="the disc"/>
    <Readout label="Moment of inertia, ½mr²" value={`${fmt((0.5 * m * r * r) / 0.5, 3)} ×`}/>
    <Readout label="Angular momentum, L = Iω" value={`${fmt(L / 0.5, 3)} ×`} tone="b"/>
    <Remark>Doubling the matter doubles the field; half as much again in radius more than doubles it. Stars far from the centre, moving fast, make most of the field.</Remark>
  </Diagram>;
}

/** Figure 12-8: two stars moving side by side are drawn together, as two parallel currents are. */
function ParallelStars() {
  const [same, setSame] = useState(true);
  const [speed, setSpeed] = useState(1);
  const play = usePlayback();
  const state = useRef({ t: 0, gap: 150, travel: 0 });
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t)), s = state.current;
  if (play.t < s.t) { s.gap = 150; s.travel = 0; }
  s.t = play.t;
  // The force follows the product of the two momenta, so the square of the speed when the stars are alike.
  const force = speed * speed * (same ? 1 : -1);
  s.gap = clamp(s.gap - force * 9 * dt, 70, 230); s.travel += speed * 60 * dt;
  // The first star moves left; the second moves with it, or right when they move opposite ways.
  const H = 360, cy = 180, x = 470 - (s.travel % 220), x2 = same ? x : 250 + (s.travel % 220), y1 = cy - s.gap / 2, y2 = cy + s.gap / 2, mid = x - 110;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two stars moving ${same ? 'in the same direction' : 'in opposite directions'} side by side. Their mattermagnetic fields ${same ? 'oppose each other in the space between, and the stars are drawn together' : 'add in the space between, and the stars are pushed apart'}.`}>
      <Body x={x} y={y1} r={22} tone="plain"/><Body x={x2} y={y2} r={22} tone="plain"/>
      {speed > 0.05 && <>
        <Still><Arrow x1={x - 28} y1={y1} x2={x - 28 - 70 * speed} y2={y1} tone="motion" w={2.6}/><T x={x - 110 - 70 * (speed - 1)} y={y1 - 10} tone="motion" italic>υ</T></Still>
        <Still><Arrow x1={x2 + (same ? -28 : 28)} y1={y2} x2={x2 + (same ? -28 - 70 * speed : 28 + 70 * speed)} y2={y2} tone="motion" w={2.6}/></Still>
        <Spin x={mid + 40} y={cy - 22} r={15} ccw sweep={230} w={1.8} steady/><Spin x={mid + 40} y={cy + 22} r={15} ccw={!same} sweep={230} w={1.8} steady/>
        <BlockArrow x1={mid - 30} y1={y1 + 14} x2={mid - 30} y2={y1 + 14 + (same ? 1 : -1) * 34 * Math.min(1.4, speed * speed)} thick={9}/><BlockArrow x1={mid - 30} y1={y2 - 14} x2={mid - 30} y2={y2 - 14 - (same ? 1 : -1) * 34 * Math.min(1.4, speed * speed)} thick={9}/>
        <T x={mid - 54} y={cy + 5} tone="text" italic>F</T>
      </>}
      <T x={W / 2} y={H - 14} size="sm">{same ? 'between the stars the two fields point opposite ways' : 'between the stars the two fields point the same way'}</T>
    </Stage>}>
    <Choice label="The two stars move" value={same ? 'same' : 'opposite'} onChange={v => setSame(v === 'same')} options={[{ value: 'same', label: 'The same way' }, { value: 'opposite', label: 'Opposite ways' }]}/>
    <Slider label="Their speed, υ" value={speed} min={0} max={1.5} step={0.05} onChange={setSpeed} show={v => `${fmt(v, 2)} ×`}/>
    <PlayBar play={play} label="the stars"/>
    <Readout label="Force between them" value={speed < 0.05 ? 'none from motion' : `${fmt(Math.abs(force), 2)} × , ${same ? 'together' : 'apart'}`} tone="force"/>
    <Readout label="Separation across their paths" value={`${Math.round(s.gap)} units`}/>
    <Remark>{same ? 'Like parallel conductors with currents in the same direction, the stars are attracted. This is what Fleming says forms the spiral arms.' : 'By the same analogy with conductors, opposite motion repels.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 12,
  summary: <>
    <p>Since the expansion of the universe was found to be accelerating, Fleming argues, Newtonian gravity has had to be read as the sum of two forces: an attraction stronger than Newton’s and a repulsion. He names them gravity and the Matter Force (<Pg n={99}/>).</p>
    <p>The rest of the chapter adds the magnetic part of the Matter Force to the heavens. A rotating sun pushes its planets inward; the same field slows the rotation of orbiting bodies (what is called tidal locking); a small tangential force gives Mercury its extra perihelion advance; and in a galaxy, where the outer stars move fast, the force exceeds Newtonian gravity and draws the arms into spirals. <Q>There is no missing matter problem with respect to spiral galaxies. All along it has been a missing force problem</Q> (<Pg n={107}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '12-1', page: 99, section: 'Attractive and Repulsive Forces', title: 'Newtonian gravity as a difference',
      caption: 'Two bodies with the Matter Force pushing them apart, gravity pushing them together, with the net difference being Newtonian Gravity.',
      Diagram: TwoForces,
      text: <>
        <p><Q>First there must be a gravitational force, some kind of super-gravity that pushes bodies together and is stronger than Newtonian Gravity. Then there must be a repulsive force behind the expansion, which is also stronger than Newtonian Gravity, but in the opposite direction</Q> (<Pg n={99}/>).</p>
        <p>Newton’s law (Equation 12-1) remains the practical formula. The two real forces are written in the same form, with matter charges <V>m</V><sub>1</sub>, <V>m</V><sub>2</sub> in place of masses (<Pg n={100}/>):</p>
        <Eq n="12-2"><V>F</V><sub>m</sub> = <Frac top={<><V>m</V><sub>1</sub><V>m</V><sub>2</sub></>} bottom={<>4πε<sub>0m</sub><V>r</V>²</>}/></Eq>
        <Eq n="12-3"><V>F</V> = <V>G</V><sub>m</sub> <Frac top={<><V>m</V><sub>1</sub><V>m</V><sub>2</sub></>} bottom={<><V>r</V>²</>}/></Eq>
      </>,
      tryThis: ['Raise “How much stronger the real forces are”. Both outer arrows grow; the inner one, their difference, does not change.', 'Change the distance: all three change together, by the inverse square.'],
      notes: <p>Fleming does not give the ratio of the real forces to Newtonian gravity in this chapter, so it is a slider. That the two fall off identically with distance is the simple case of these equations; chapter 18 argues that gravity fades faster at very great distances.</p>,
    },
    {
      kind: 'figure', id: '12-2', page: 101, section: 'Circular Orbits', title: 'A rotating sun pushes its planet inward',
      caption: 'One small body orbiting a larger body. The larger body is rotating, producing a mattermagnetic field of rotation in the opposite direction. As the small body moves through the field in the direction of the velocity arrow, the mattermagnetic force pushes it towards the larger body.',
      Diagram: OrbitInField,
      text: <>
        <p><Q>If the Sun is seen from above as rotating counterclockwise, the zeptons around it will rotate clockwise. The angular momentum of the sun, which is directed toward us, causes a mattermagnetic field B<sub>m</sub> directed away from us. As the smaller body crosses this mattermagnetic field, it is subject to a Lorentz Force</Q>, <V>F</V><sub>m</sub> = <V>m</V>(<V>υ</V> × <V>B</V><sub>m</sub>) (Equation 12-4) (<Pg n={100}/>).</p>
        <p><Q>As long as the larger body is rotating in the same direction as the orbiting body, the resultant force will be directed inward</Q>. The extra force makes the orbiting body appear heavier than it is, and since the masses of planets have always been inferred from Newton’s law, the error would not show (<Pg n={101}/>).</p>
      </>,
      tryThis: ['Watch the curled arrows round the large body: they turn the opposite way to it.', 'Reverse the orbit, or the rotation: the force turns outward. Reverse both and it is inward again.', 'Stop the rotation: no field, no extra force.'],
      notes: <p>The size of the force arrow follows the rate of rotation only; the true force would also fall with distance.</p>,
    },
    {
      kind: 'figure', id: '12-3', page: 102, section: 'Synchronous Rotation', title: 'A planet’s own rotational field',
      caption: 'A small body rotating counterclockwise produces a counter-rotating zepton field.',
      Diagram: PlanetSpinField,
      text: <p><Q>A planet rotating counterclockwise produces a magnetic field pointing into the page</Q>. <Q>This is the body’s angular inertia.</Q> The field of a rotating sun, in Figure 12-2, points the same way (<Pg n={102}/>).</p>,
      tryThis: ['Reverse the rotation: the zeptons reverse, and the field comes out of the page.', 'Compare with Figure 11-5, the same picture with zeptons drawn as dipoles.'],
    },
    {
      kind: 'figure', id: '12-4', page: 103, title: 'Why orbiting bodies stop turning',
      caption: 'A small body moving in an orbit produces oppositely rotating zepton fields on either side of it. The field due to its rotation is not shown.',
      Diagram: SynchronousRotation,
      text: <>
        <p>The orbital motion makes two fields: <Q>the field on the side away from the Sun also points into the page, while the field between the orbiting body and the Sun points out of the page in opposition to all the other fields. The field on the inside opposes the field due to rotation</Q>, <Q>while the field on the outside enforces it. In free space, these two effects are equal, so the angular velocity does not change</Q> (<Pg n={102}/>).</p>
        <p>The Sun’s rotational field breaks the balance. <Q>Because the field strength of the Sun’s rotational magnetic field varies in inverse proportion to the square of the distance, the magnetic force working against the planet’s rotation is slightly greater than the magnetic force working with the planet’s rotation. This differential causes the planet’s rotation to slow</Q> (<Pg n={103}/>).</p>
        <p>Fleming’s conclusion is that what are called tidal forces between solid rotating bodies <Q>are a manifestation of the mattermagnetic force</Q>.</p>
      </>,
      tryThis: ['Turn off the Sun’s field and restart: the two sides read the same and the rotation holds.', 'Turn it on: the side against the rotation is the stronger, the rotation slows, and the distance creeps up.'],
      notes: <p>The readouts take the planet’s orbital field as 1 on each side and add the Sun’s field as an inverse square between the two sides; the sizes, and the rate of slowing, are display choices. Fleming gives the argument in words.</p>,
    },
    {
      kind: 'figure', id: '12-5', page: 104, section: 'Precession of Elliptical Orbits', title: 'An ellipse that will not stay put',
      caption: 'A planet in orbit around a sun with a marked precession of the ellipse.',
      Diagram: PrecessingOrbit,
      text: <p>Newtonian gravity cannot make the ellipse of two homogeneous spheres precess. The planets do precess, almost entirely because there are more than two bodies. <Q>In the case of Mercury, there is a 43 arcseconds per century difference between theory and observation.</Q> <Q>In order for this extra amount of advance to occur, there must be an additional force</Q>, one that makes Mercury gain more velocity than expected near perihelion and lose more near aphelion (<Pg n={104}/>).</p>,
      tryThis: ['Set the advance to none: one closed ellipse, traced again and again.', 'Raise it and watch the perihelion marks step round the sun.', 'Notice the planet’s speed: fastest at perihelion, in any of these orbits.'],
      notes: <p>This diagram only shows what precession is; the advance is set by hand and is exaggerated enormously. Figure 12-6 produces it from a force.</p>,
    },
    {
      kind: 'figure', id: '12-6', page: 105, title: 'The force that turns the ellipse',
      caption: 'A planet in orbit around a rotating sun. The Lorentz force shown with small arrows is everywhere tangential to the planet’s velocity vector and generally not directed toward the center of mass of the sun.',
      Diagram: LorentzOnOrbit,
      text: <>
        <p>The force of Figure 12-2 was left out of the Newtonian computation. In an elliptical orbit it <Q>is not usually directed toward the sun</Q>. It is directed <Q>first one way and then the opposite way as it rounds the perihelion</Q>, so most of it is periodic, but <Q>There is, however, a residual, secular component that does cause precession</Q>: <Q>the classically unaccounted for 43 arcseconds of perihelion advance per century</Q> (<Pg n={104}/>, <Pg n={105}/>).</p>
        <p>Fleming cites Danby’s computation with a small modification to Newtonian gravity, and Van Flandern’s <Q>tangential pseudo-force directed along the velocity vector</Q>, as the same mathematics without the cause.</p>
      </>,
      tryThis: ['Follow the planet and compare the broad force arrow with the dotted line to the sun: they agree only at perihelion and aphelion.', 'Set the strength to none: a closed ellipse. Raise it: each orbit is turned from the last, in the direction the planet moves.', 'Watch the small arrows round the first orbit: longest near the sun.'],
      notes: <>
        <p>The text and caption call the force <Q>tangential</Q> to the velocity, and say it speeds Mercury up and slows it down. The printed figure draws the arrows across the path, toward the inside of the orbit, which is the direction <V>m</V>(<V>υ</V> × <V>B</V><sub>m</sub>) has when <V>B</V><sub>m</sub> points into the page. The diagram follows the figure and Equation 12-4; a force at right angles to the velocity turns the planet without changing its speed.</p>
        <p>The orbit is computed by adding that force, with the sun’s field falling as the inverse square of distance, to Newtonian gravity. The strength is exaggerated by many orders of magnitude so the precession can be seen in four orbits.</p>
      </>,
    },
    {
      kind: 'figure', id: '12-7', page: 107, section: 'Spiral Galaxies', title: 'The largest flywheel',
      caption: 'A rotating disc of matter charge m, radius r and angular velocity ω',
      Diagram: GalaxyDisc,
      text: <>
        <p>In a spiral galaxy, stars further out, and so travelling faster, are more strongly drawn to the centre. <Q>What kind of force gets stronger with distance and the consequent higher tangential velocities? That would be a force that is the result of a vector cross product, a Lorentz force, not gravity</Q> (<Pg n={106}/>).</p>
        <p>Taking the galaxy as a disc, <Q>the magnetic field is then proportional to the angular momentum L</Q>, with <V>L</V> = <V>I</V>ω and <V>I</V> = ½<V>m</V><V>r</V>² for a uniform disc. <Q>While the galaxy is nowhere near a uniform disc, it is easy to see that the mattermagnetic field increases rapidly when there are stars far from the center of the galaxy moving very rapidly.</Q></p>
      </>,
      tryThis: ['Raise the radius by half: the field more than doubles, because it goes as r².', 'Compare what the same change does to m and to ω: each only in proportion.'],
      notes: <p>The readouts are <V>L</V> = ½<V>m</V><V>r</V>²ω relative to the starting disc. Fleming says the field is proportional to <V>L</V>; no constant is given.</p>,
    },
    {
      kind: 'figure', id: '12-8', page: 107, title: 'Stars moving together are drawn together',
      caption: 'Two stars moving in the same direction produce a mattermagnetic field that attracts them toward each other.',
      Diagram: ParallelStars,
      text: <p>The fast outer stars each make their own field, <Q>and because they are more or less moving parallel to one another, the mattermagnetic field produced by one is directed opposite to the magnetic field produced by the other in the space in between. The situation is analogous to having a pair of parallel conductors, with their current moving in the same direction. Like the parallel conductors, the stars are attracted to one another</Q>. <Q>It is this mutual attraction between the fast moving outer stars that causes the spiral arms to form</Q> (<Pg n={107}/>).</p>,
      tryThis: ['Let the two stars run side by side: they close up as they go.', 'Raise their speed: the attraction grows as the square, since each star’s field and the force on the other both follow the speed.', 'Set the speed to zero: no attraction from motion.'],
      notes: <p>Fleming describes only stars moving the same way. The opposite case is drawn by his own analogy with parallel conductors. The rate at which the stars close is a display choice.</p>,
    },
  ],
};
export default chapter;
