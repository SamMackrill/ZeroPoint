// Chapter 12: Astronomical Motion (PDF pp. 98–109). Figures 12-1 to 12-8.
import { useMemo, useRef, useState } from 'react';
import { Arrow, BlockArrow, Body, Choice, Diagram, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, Still, T, Toggle, Zepton, clamp, deg, fmt, pathThrough, polar, rad, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;

/** How much stronger than Newtonian Gravity the two real forces of Figure 12-1 are drawn. Fleming gives no ratio. */
const REAL = { matter: 1.5, gravity: 2.5 };

/**
 * Figure 12-1: Newtonian gravity as the small difference between two larger forces. Three arrowed bars stacked on one
 * scale between the bodies, in the printed order: the Matter Force, Newtonian Gravity, gravity. Each force acts on both bodies, so each has a head at each end: the Matter Force pointing out,
 * apart; gravity and Newtonian Gravity pointing in, together. Newtonian Gravity, the one that is measured, is drawn thickest.
 */
function TwoForces() {
  const H = 262, RY = 236, mid = W / 2, newton = 1, { matter, gravity } = REAL, s = 236 / gravity, rows = [70, 124, 178], thick = 26, gap = 3;
  /** A word written on an arrow, in the page's background colour so it reads on any of the arrows' colours. */
  const word = (x: number, row: number, text: string) => <text x={x} y={row + 5} textAnchor="middle" className="bk-t bk-t-sm bk-f-ink">{text}</text>;
  /** Two arrows meeting in the middle, one from each side: a force pushing the bodies together. */
  const inward = (row: number, f: number, tone: 'force' | 'accent', width: number) => <>
    <BlockArrow x1={mid - f * s} y1={row} x2={mid - gap} y2={row} tone={tone} thick={width}/>
    <BlockArrow x1={mid + f * s} y1={row} x2={mid + gap} y2={row} tone={tone} thick={width}/>
  </>;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two bodies, m1 and m2, a distance r apart, with three forces between them on one scale. The Matter Force pushes them apart, gravity pushes them together and is stronger, and Newtonian Gravity, the difference between the two, pushes them together. Newtonian Gravity is what is measured.`}>
      {/* The bodies are named and spaced as in Equations 12-2 and 12-3: matter charges m₁ and m₂, a distance r apart, centre to centre. */}
      {[[56, '1'], [W - 56, '2']].map(([x, i]) => <g key={i}><Body x={+x} y={rows[1]} r={34} tone="plain"/><T x={+x} y={rows[1] + 7} tone="text" size="lg" italic>m<tspan dy={5} fontSize="0.7em" fontStyle="normal">{i}</tspan></T></g>)}
      {[56, W - 56].map(x => <line key={x} x1={x} y1={rows[1] + 40} x2={x} y2={RY + 10} className="bk-s-faint" strokeDasharray="3 4"/>)}
      <Arrow x1={mid - 14} y1={RY} x2={62} y2={RY} tone="muted" w={1.5} head={9}/><Arrow x1={mid + 14} y1={RY} x2={W - 62} y2={RY} tone="muted" w={1.5} head={9}/>
      <T x={mid} y={RY + 6} tone="text" size="lg" italic>r</T>
      <BlockArrow x1={mid} y1={rows[0]} x2={mid - matter * s} y2={rows[0]} tone="matter" thick={thick}/>
      <BlockArrow x1={mid} y1={rows[0]} x2={mid + matter * s} y2={rows[0]} tone="matter" thick={thick}/>
      {word(mid, rows[0], 'Matter Force')}
      {inward(rows[2], gravity, 'force', thick)}
      {/* The names sit on the part of gravity beyond the Matter Force, clear of the dashed lines. */}
      {[-1, 1].map(side => <g key={side}>{word(mid + side * (matter + newton / 2) * s, rows[2], 'gravity')}</g>)}
      {/* Where the Matter Force reaches, marked down through gravity: beyond it, at each end, is the part of gravity left over. */}
      {[-1, 1].map(side => <line key={side} x1={mid + side * matter * s} y1={rows[0] + thick / 2 + 2} x2={mid + side * matter * s} y2={rows[2] + thick / 2 + 6} className="bk-s-matter" strokeWidth="1.5" strokeDasharray="3 3"/>)}
      {inward(rows[1], newton, 'accent', 38)}
      {word(mid - (newton * s) / 2 - 8, rows[1], 'Newtonian')}{word(mid + (newton * s) / 2 + 8, rows[1], 'Gravity')}
    </Stage>}>
    <Remark>Whatever the two real forces are, what is measured is their difference.</Remark>
  </Diagram>;
}

/**
 * The zeptons round a rotating body, in rings that thin out with distance. Each turns the opposite way to the body, like
 * one gear against another, by `turned` (the body's own angle) scaled up; a body at rest leaves them where they lie.
 * Curled arrows on some of them show the sense of turning while the figure is paused.
 */
function CounterField({ x, y, inner, rings, sense, turned, count = 9 }: { x: number; y: number; inner: number; rings: number; sense: number; turned: number; count?: number }) {
  return <g>{Array.from({ length: rings }, (_, k) => Array.from({ length: count + k * 2 }, (_, i) => {
    const at = (i / (count + k * 2)) * 360 + k * 17, [px, py] = polar(x, y, inner + k * 36, at), fade = 0.95 / (1 + k * 0.7);
    return <g key={`${k}-${i}`}>
      <Zepton x={px} y={py} angle={at + 180 - turned * 1.6} len={22} polarity="matter" signs={false} opacity={fade}/>
      {Math.abs(sense) >= 0.05 && i % 2 === 0 && <Spin x={px} y={py} r={15} ccw={sense < 0} sweep={200} w={1.4} opacity={fade}/>}
    </g>;
  }))}</g>;
}

/** A dark cross on a rotating body, turned to `turned` degrees, so the body's own rotation can be seen. Its arms stop short of the middle. */
function BodyCross({ x, y, r, turned }: { x: number; y: number; r: number; turned: number }) {
  return <g>{[0, 90, 180, 270].map(a => { const [x1, y1] = polar(x, y, Math.min(20, r * 0.35), turned + a), [x2, y2] = polar(x, y, r - 8, turned + a); return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} className="bk-body-ink" strokeWidth="3.5" strokeLinecap="round"/>; })}</g>;
}

/** Figure 12-2: a small body orbiting a rotating one is pushed toward it by the mattermagnetic field. */
function OrbitInField() {
  const play = usePlayback({ speed: 0.25 });
  // As printed: the Sun and the orbit both turn counter-clockwise, in balance. B_m then points into the page, and the
  // force m(υ × B_m) on the small body is toward the Sun. The Sun turns at its own rate, whatever the orbit is doing.
  const H = 400, cx = 300, cy = 200, R = 150, a = play.t * 360, [px, py] = polar(cx, cy, R, a), turned = play.t * 0.7 * 360;
  const [vx, vy] = polar(px, py, 52, a + 90), [fx, fy] = polar(px, py, -49, a);
  /** A letter with a subscript m, as in F_m and B_m. */
  const sub = (x: number, y: number, letter: string, tone: 'text' | 'b', anchor: 'start' | 'middle' = 'middle') => <T x={x} y={y} tone={tone} italic anchor={anchor}>{letter}<tspan dy={4} fontSize="0.75em">m</tspan></T>;
  return <Diagram stage={
    <Stage w={W} h={H} label="A small body orbiting counter-clockwise round a larger body that is also rotating counter-clockwise. The zeptons round the larger body turn the other way. The mattermagnetic field points into the page and the extra force on the small body is toward the larger one.">
      <circle cx={cx} cy={cy} r={R} className="bk-s-faint" fill="none" strokeDasharray="3 6"/>
      <CounterField x={cx} y={cy} inner={78} rings={3} sense={1} turned={turned}/>
      <Body x={cx} y={cy} r={52} tone="matter"/><BodyCross x={cx} y={cy} r={52} turned={turned}/><Spin x={cx} y={cy} r={24} ccw sweep={270} tone="text" w={3}/><T x={cx + 34} y={cy - 26} tone="text" italic>ω</T>
      <Arrow x1={px} y1={py} x2={vx} y2={vy} tone="motion" w={2.4}/><T x={vx + 12} y={vy + 4} tone="motion" italic>υ</T>
      <BlockArrow x1={px} y1={py} x2={fx} y2={fy} thick={10}/>{sub(fx + (fx < px ? -18 : 18), fy + 18, 'F', 'text')}
      <Body x={px} y={py} r={15} tone="plain"/>
      <InOut x={600} y={70} out={false} r={11}/>{sub(620, 75, 'B', 'b', 'start')}
    </Stage>}>
    <PlayBar play={play} label="the orbit"/>
    <Remark>The extra inward push makes the orbiting body appear heavier than it is.</Remark>
  </Diagram>;
}

/** Figure 12-3: a rotating planet and the counter-rotating zepton field that is its angular inertia. */
function PlanetSpinField() {
  const [omega, setOmega] = useState(0.7);
  const play = usePlayback();
  const H = 360, cx = 320, cy = 180, turned = play.t * omega * 90;
  return <Diagram stage={
    <Stage w={W} h={H} label={Math.abs(omega) < 0.05 ? 'A body that is not rotating: no mattermagnetic field of rotation.' : `A small body rotating ${omega > 0 ? 'counter-clockwise' : 'clockwise'}, with a counter-rotating zepton field round it. Its mattermagnetic field points ${omega > 0 ? 'into' : 'out of'} the page.`}>
      <CounterField x={cx} y={cy} inner={104} rings={2} sense={omega} turned={turned} count={10}/>
      <Body x={cx} y={cy} r={72} tone="matter"/><BodyCross x={cx} y={cy} r={72} turned={turned}/>
      {Math.abs(omega) > 0.05 && <Spin x={cx} y={cy} r={28} ccw={omega > 0} sweep={270} tone="text" w={3}/>}<T x={cx + 40} y={cy - 30} tone="text" italic>ω</T>
      {Math.abs(omega) > 0.05 && <><InOut x={590} y={90} out={omega < 0} r={12}/><T x={612} y={96} anchor="start" tone="b" size="lg" italic>B<tspan dy={4} fontSize="0.75em">m</tspan></T></>}
    </Stage>}>
    <Slider label="Rotation of the body, ω" value={omega} min={-1} max={1} step={0.05} onChange={setOmega} show={v => (Math.abs(v) < 0.05 ? 'none' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'counter-clockwise' : 'clockwise'}`)}/>
    <PlayBar play={play} label="the rotation"/>
    <Readout label="Zeptons round it rotate" value={Math.abs(omega) < 0.05 ? 'not turned by it' : omega > 0 ? 'clockwise' : 'counter-clockwise'}/>
    <Readout label="Mattermagnetic field" value={Math.abs(omega) < 0.05 ? 'none' : omega > 0 ? 'into the page' : 'out of the page'} tone="b"/>
    <Remark>This field is the body’s angular inertia. The Sun’s rotation makes one of the same sense round the Sun.</Remark>
  </Diagram>;
}

/** The Sun's rotational field at a planet's inner and outer sides, relative to the planet's own orbital field there. */
export function sunFieldAt(sides: 'inner' | 'outer', strength: number) {
  // Inverse square from the Sun: the side nearer the Sun is a little closer, so the field is a little stronger there.
  return strength * (sides === 'inner' ? 1 / 0.9 ** 2 : 1 / 1.1 ** 2);
}

/** Where Figure 12-4 draws the edge of the Sun: the centre of a great disc far off the left of the stage, and its radius. */
const SUN = { x: -1000, r: 1046 };

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
      {/* The Sun, symbolically and not to scale: the edge of a great disc at the left, with a few flares off its limb. */}
      <circle cx={SUN.x} cy={cy} r={SUN.r} className="bk-body bk-body-matter"/>
      {[-150, -80, -10, 60, 140].map(dy => { const x = SUN.x + Math.sqrt(SUN.r * SUN.r - dy * dy) + 4, y = cy + dy; return <path key={dy} d={`M${x} ${y} q 6 -9 12 0 t 12 0 t 12 0`} className="bk-s-matter" fill="none" strokeWidth="3" strokeLinecap="round"/>; })}
      <text x={24} y={cy} textAnchor="middle" className="bk-t bk-t-md bk-f-ink" transform={`rotate(-90 24 ${cy})`}>the Sun</text>
      {/* The orbital field: zeptons either side of the moving planet, turning opposite ways (out of the page on the Sun's side,
          into it beyond); curled arrows show the sense only while paused. */}
      {grid.map((dy, i) => <g key={dy}>
        <Zepton x={cx - 128} y={cy + dy} angle={i * 50 + play.t * 120} len={26} polarity="matter" signs={false}/>
        <Zepton x={cx + 128} y={cy + dy} angle={i * 50 + 90 - play.t * 120} len={26} polarity="matter" signs={false}/>
        <Spin x={cx - 128} y={cy + dy} r={18} ccw sweep={220} w={1.6}/>
        <Spin x={cx + 128} y={cy + dy} r={18} ccw={false} sweep={220} w={1.6}/>
        {sun && <><InOut x={cx - 176} y={cy + dy} out={false} r={5 + 9 * inner} tone="b" opacity={0.9}/><InOut x={cx + 176} y={cy + dy} out={false} r={5 + 9 * outer} tone="b" opacity={0.9}/></>}
      </g>)}
      <T x={cx - 128} y={cy - 104} size="sm" tone="motion">orbital field: out of the page</T><T x={cx + 128} y={cy - 104} size="sm" tone="motion">orbital field: into the page</T>
      {sun && <T x={cx} y={H - 16} size="sm" tone="b">⊗ the Sun’s rotational field: into the page on both sides, stronger nearer the Sun</T>}
      <Arrow x1={cx} y1={cy - R - 8} x2={cx} y2={cy - R - 70} tone="motion" w={3}/><T x={cx + 14} y={cy - R - 44} tone="motion" italic>υ</T>
      <Body x={cx} y={cy} r={R} tone="matter"/><BodyCross x={cx} y={cy} r={R} turned={s.angle}/>
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

/**
 * One orbit, perihelion to perihelion, of the orbit of `orbitWithLorentz`, and the angle (radians) by which its perihelion
 * advanced. Every later orbit is the same one turned on by that angle, so the motion can run on for ever without a jump.
 */
export function orbitCycle(k: number): { points: OrbitPoint[]; advance: number } {
  const all = orbitWithLorentz(k, 1.4), outward = (q: OrbitPoint) => q.x * q.vx + q.y * q.vy, angle = (q: OrbitPoint) => Math.atan2(q.y, q.x);
  // The next perihelion is where the planet, past aphelion, stops closing on the sun and starts to recede. Between the two
  // samples either side of it, the angle is found where the outward speed passes through zero.
  let next = Math.floor(all.length / 2);
  while (next < all.length - 1 && !(outward(all[next - 1]) < 0 && outward(all[next]) >= 0)) next++;
  const before = all[next - 1], after = all[next], f = -outward(before) / (outward(after) - outward(before));
  const turn = Math.atan2(Math.sin(angle(after) - angle(before)), Math.cos(angle(after) - angle(before)));
  return { points: all.slice(0, next), advance: angle(before) + f * turn - angle(all[0]) };
}

/** A point of an orbit turned about the sun by `angle` radians, with its velocity and force turned with it. */
export function turnOrbitPoint(q: OrbitPoint, angle: number): OrbitPoint {
  const c = Math.cos(angle), s = Math.sin(angle), rot = (x: number, y: number) => [x * c - y * s, x * s + y * c] as const;
  const [x, y] = rot(q.x, q.y), [vx, vy] = rot(q.vx, q.vy), [fx, fy] = rot(q.fx, q.fy);
  return { x, y, vx, vy, fx, fy };
}

/** Figure 12-6: the mattermagnetic force along an elliptical orbit round a rotating sun, and the precession it causes. */
function LorentzOnOrbit() {
  const [k, setK] = useState(0.03);
  const play = usePlayback({ speed: 0.12 });
  const H = 420, cx = 300, sunY = 250, scale = 105;
  const cycle = useMemo(() => orbitCycle(k), [k]), perOrbit = cycle.points.length;
  /** The planet's g-th point since the start: the g-th of one orbit, turned on by the advance of each orbit completed. */
  const at = (g: number) => turnOrbitPoint(cycle.points[g % perOrbit], Math.floor(g / perOrbit) * cycle.advance);
  const screen = (p: { x: number; y: number }): [number, number] => [cx + p.y * scale, sunY + p.x * scale];
  // Four orbits for each unit of playback time, as before, but carried on without end.
  const i = Math.floor(play.t * 4 * perOrbit), p = at(i), [px, py] = screen(p), r = Math.hypot(p.x, p.y);
  const toSun = deg(Math.atan2(-p.y, -p.x)), force = deg(Math.atan2(p.fy, p.fx)), off = k === 0 ? 0 : Math.abs(((force - toSun + 540) % 360) - 180);
  const trail = Math.round(perOrbit * 3), now = Math.floor(i / perOrbit) * cycle.advance;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A planet on an elliptical orbit round a rotating sun. The mattermagnetic force on it is at right angles to its velocity and ${Math.round(off)} degrees away from the direction of the sun. ${k > 0 ? 'With this force added the ellipse precesses.' : 'With no such force the ellipse is closed.'}`}>
      {/* The trail the planet leaves: strong where it has just been, fading over the last three orbits behind it. */}
      {Array.from({ length: Math.ceil(Math.min(i, trail) / 5) }, (_, c) => {
        const end = i - c * 5, start = Math.max(0, end - 5), age = (i - end) / trail;
        return <polyline key={c} points={Array.from({ length: end - start + 1 }, (_, j) => screen(at(start + j)).join(',')).join(' ')} className="bk-s-muted" fill="none" strokeWidth={2.2 - 1.2 * age} strokeLinecap="round" opacity={0.08 + 0.92 * (1 - age)}/>;
      })}
      {/* The small force arrows round the present orbit are a still picture; the moving planet carries its own while it plays. */}
      <Still>{k > 0 && cycle.points.filter((_, n) => n % Math.round(perOrbit / 10) === 0).map(o => turnOrbitPoint(o, now)).map((q, n) => { const [x, y] = screen(q), m = Math.hypot(q.fx, q.fy) || 1, len = 14 + 26 * Math.min(1, m / (k * 9)); return <Arrow key={n} x1={x} y1={y} x2={x + (q.fy / m) * len} y2={y + (q.fx / m) * len} tone="text" w={1.6} head={7}/>; })}</Still>
      <Body x={screen({ x: 0, y: 0 })[0]} y={screen({ x: 0, y: 0 })[1]} r={22} tone="matter"/><BodyCross x={screen({ x: 0, y: 0 })[0]} y={screen({ x: 0, y: 0 })[1]} r={22} turned={play.t * 1500}/><Spin x={screen({ x: 0, y: 0 })[0]} y={screen({ x: 0, y: 0 })[1]} r={32} ccw sweep={230} tone="text"/>
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
  const play = usePlayback();
  const H = 380, cx = 260, cy = 190, R = 110, turned = play.t * 60;
  /** A letter with a small subscript, for B_m. */
  const sub = (letter: string, index: string) => <>{letter}<tspan dy={5} fontSize="0.7em" fontStyle="normal">{index}</tspan><tspan dy={-5}>{'​'}</tspan></>;
  return <Diagram stage={
    <Stage w={W} h={H} label="A rotating disc of matter charge m, radius r and angular velocity ω. Its mattermagnetic field is proportional to its angular momentum, L = Iω, with I = ½mr².">
      <circle cx={cx} cy={cy} r={R} className="bk-body bk-body-plain" opacity={0.7}/>
      {Array.from({ length: 26 }, (_, i) => { const [x, y] = polar(cx, cy, R * (0.15 + 0.82 * ((i * 0.618) % 1)), turned + i * 137.5); return <circle key={i} cx={x} cy={y} r={2.2} className="bk-f-mark"/>; })}
      <Arrow x1={cx} y1={cy} x2={cx - R} y2={cy} tone="text" w={2.4}/><T x={cx - R / 2} y={cy - 10} tone="text" italic>r</T>
      <Still><Spin x={cx} y={cy + 4} r={20} ccw sweep={250} tone="text" w={2.4}/><T x={cx + 34} y={cy + 30} tone="text" italic>ω</T></Still><T x={cx} y={cy - R + 26} tone="text" italic>m</T>
      {/* Fleming's relation, written beside the disc: the field goes as the angular momentum, and that as r². */}
      <T x={470} y={160} anchor="start" tone="b" size="lg" italic>{sub('B', 'm')} ∝ L</T>
      <T x={470} y={200} anchor="start" tone="text" size="lg" italic>L = Iω = ½mr²ω</T>
    </Stage>}>
    <PlayBar play={play} label="the disc"/>
    <Remark>Stars far from the centre, moving fast, make most of the field: it grows as the square of the radius.</Remark>
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
      tryThis: ['Follow the dashed lines down from the ends of the Matter Force: gravity reaches past them at each end by exactly the length of a green arrow.'],
      notes: <p>The printed figure draws the three forces as lines. Here they are stacked on one scale as arrowed bars, in the printed order, each with a head at both ends because each acts on both bodies, and Newtonian Gravity, the force that is measured, is drawn thickest. Fleming does not give the ratio of the real forces to Newtonian Gravity in this chapter; they are drawn as 1.5 and 2.5 times it. Chapter 18 argues that gravity fades faster than the Matter Force at very great distances.</p>,
    },
    {
      kind: 'figure', id: '12-2', page: 101, section: 'Circular Orbits', title: 'A rotating sun pushes its planet inward',
      caption: 'One small body orbiting a larger body. The larger body is rotating, producing a mattermagnetic field of rotation in the opposite direction. As the small body moves through the field in the direction of the velocity arrow, the mattermagnetic force pushes it towards the larger body.',
      Diagram: OrbitInField,
      text: <>
        <p><Q>If the Sun is seen from above as rotating counterclockwise, the zeptons around it will rotate clockwise. The angular momentum of the sun, which is directed toward us, causes a mattermagnetic field B<sub>m</sub> directed away from us. As the smaller body crosses this mattermagnetic field, it is subject to a Lorentz Force</Q>, <V>F</V><sub>m</sub> = <V>m</V>(<V>υ</V> × <V>B</V><sub>m</sub>) (Equation 12-4) (<Pg n={100}/>).</p>
        <p><Q>As long as the larger body is rotating in the same direction as the orbiting body, the resultant force will be directed inward</Q>. The extra force makes the orbiting body appear heavier than it is, and since the masses of planets have always been inferred from Newton’s law, the error would not show (<Pg n={101}/>).</p>
      </>,
      tryThis: ['Watch the zeptons round the Sun: they turn the opposite way to it.', 'Pause: curled arrows show which way the Sun and its zeptons turn.'],
      notes: <p>As printed, this is the one case: the Sun and the orbit both counter-clockwise, held in balance. Reversing either would turn the force outward, as the text says, and stopping the Sun would remove it; neither is animated, because the orbit drawn would then no longer be balanced and the small body would leave it. The force arrow is not to scale.</p>,
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
      tryThis: ['Follow the planet and compare the broad force arrow with the dotted line to the sun: they agree only at perihelion and aphelion.', 'Set the strength to none: a closed ellipse. Raise it: each orbit is turned from the last, in the direction the planet moves.', 'Pause, and small arrows show the force round the present orbit: longest near the sun.'],
      notes: <>
        <p>The text and caption call the force <Q>tangential</Q> to the velocity, and say it speeds Mercury up and slows it down. The printed figure draws the arrows across the path, toward the inside of the orbit, which is the direction <V>m</V>(<V>υ</V> × <V>B</V><sub>m</sub>) has when <V>B</V><sub>m</sub> points into the page. The diagram follows the figure and Equation 12-4; a force at right angles to the velocity turns the planet without changing its speed.</p>
        <p>The orbit is computed by adding that force, with the sun’s field falling as the inverse square of distance, to Newtonian gravity. The strength is exaggerated by many orders of magnitude so the precession can be seen within a few orbits.</p>
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
      tryThis: ['Watch the stars near the rim: they move fastest, and with the r² in L they make most of the field.'],
      notes: <p>Fleming says the field is proportional to <V>L</V>; no constant is given.</p>,
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
