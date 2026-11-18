// Chapter 9: Tops, Flywheels, and Gyroscopes (PDF pp. 81–85). Figures 9-1 and 9-2.
import { Suspense, lazy, useCallback, useRef, useState } from 'react';
import { Action, Arrow, BlockArrow, Choice, Diagram, FallbackOnError, canDraw3D, PlayBar, Readout, Remark, Slider, Spin, Stage, T, Toggle, Zepton, clamp, fmt, polar, rad, usePlayback } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;

/** A flywheel seen face on: a rim, a hub and spokes at an angle. */
function Wheel({ x, y, r, angle, label, tone = 'plain' }: { x: number; y: number; r: number; angle: number; label: string; tone?: 'plain' | 'matter' }) {
  return <g>
    <circle cx={x} cy={y} r={r} className={`bk-body bk-body-${tone}`}/>
    {[0, 60, 120].map(a => { const [x1, y1] = polar(x, y, r - 4, angle + a), [x2, y2] = polar(x, y, r - 4, angle + a + 180); return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} className="bk-s-muted" strokeWidth="2"/>; })}
    <circle cx={polar(x, y, r - 12, angle)[0]} cy={polar(x, y, r - 12, angle)[1]} r={6} className="bk-f-mark"/>
    <circle cx={x} cy={y} r={7} className="bk-f-text"/>
    <text x={x} y={y + r + 22} textAnchor="middle" className="bk-t bk-t-sm bk-f-muted">{label}</text>
  </g>;
}

/**
 * The passive flywheel's response in Morgan's experiment, as the text reports it: it turns the opposite way to the
 * driven one, and a sudden change in the driven one's speed kicks it the other way. Returns its new speed.
 */
export function inducedSpeed(passive: number, driven: number, drivenChange: number, dt: number, coupling = 0.6, kick = 1.6) {
  const target = -coupling * driven;
  return passive + (target - passive) * Math.min(1, dt * 2.2) - kick * drivenChange;
}

/** Morgan's apparatus drawn in three dimensions: loaded on demand, since three.js is large. */
const FlywheelScene = lazy(() => import('../three/FlywheelScene'));

/** Figure 9-1: Morgan's two flywheels on one axis, a small gap apart. The driven one turns the passive one the other way. */
function MorganFlywheels() {
  const [speed, setSpeed] = useState(0.8);
  const [running, setRunning] = useState(true);
  const [flat, setFlat] = useState(() => !canDraw3D());
  const [reset, setReset] = useState(0);
  const fail = useCallback(() => setFlat(true), []);
  const play = usePlayback();
  const state = useRef({ t: 0, driven: 0, passive: 0, a1: 0, a2: 0 });
  // Restart (or a step back) begins again from the starting state.
  if (play.t < state.current.t) state.current = { t: 0, driven: 0, passive: 0, a1: 0, a2: 0 };
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t)), target = running ? speed : 0, before = state.current.driven;
  state.current.t = play.t;
  // The motor brings the first flywheel up to speed over a moment; the brake stops it almost at once.
  state.current.driven += (target - before) * Math.min(1, dt * (running ? 1.5 : 14));
  state.current.passive = clamp(inducedSpeed(state.current.passive, state.current.driven, state.current.driven - before, dt), -1.2, 1.2);
  state.current.a1 += state.current.driven * 520 * dt;
  state.current.a2 += state.current.passive * 520 * dt;
  const { driven, passive, a1, a2 } = state.current, H = 360, y = 170;
  const way = (v: number) => (Math.abs(v) < 0.02 ? 'at rest' : v > 0 ? 'counter-clockwise' : 'clockwise');
  const label = `Two flywheels on one axis, facing each other across a small air gap. Seen from the passive flywheel's end, the driven flywheel is ${way(driven)}; the passive one is ${way(passive)}.`;
  /** The flat drawing, both discs face on side by side: the fallback where 3D cannot be drawn (called, not mounted). */
  const flatWheels = () => <Stage w={W} h={H} label={label}>
      <Wheel x={230} y={y} r={92} angle={a1} label="driven flywheel (motor)" tone="matter"/>
      <Wheel x={490} y={y} r={110} angle={a2} label="passive flywheel (free to turn)"/>
      {Math.abs(driven) > 0.03 && <Spin x={230} y={y} r={106} ccw={driven > 0} sweep={60 + 160 * Math.abs(driven)}/>}
      {Math.abs(passive) > 0.03 && <Spin x={490} y={y} r={124} ccw={passive > 0} sweep={60 + 160 * Math.min(1, Math.abs(passive))}/>}
      {[-60, -20, 20, 60].map((dy, i) => <Zepton key={dy} x={354} y={y + dy} angle={a1 * 0.7 * (i % 2 ? -1 : 1) + i * 40} len={18} oval={false} signs={false} polarity="matter" opacity={0.35 + 0.6 * Math.min(1, Math.abs(driven) + Math.abs(passive))}/>)}
      <T x={354} y={y - 96} size="sm">air gap only</T>
      <T x={W / 2} y={H - 12} size="sm">The two discs face each other on one axis; they are drawn side by side so both rotations can be seen.</T>
    </Stage>;
  return <Diagram stage={flat ? flatWheels() : <FallbackOnError onError={fail} fallback={flatWheels()}>
      <Suspense fallback={flatWheels()}>
        <FlywheelScene state={{ drivenAngle: a1, passiveAngle: a2, driven, passive, reset }} onFail={fail} description={`${label} Drag to turn the view.`}/>
      </Suspense>
    </FallbackOnError>}>
    {!flat && <Action onClick={() => setReset(n => n + 1)}>Back to this view</Action>}
    <Slider label="Speed of the driven flywheel" value={speed} min={0.2} max={1} step={0.05} onChange={setSpeed} show={v => `${Math.round(v * 26500).toLocaleString('en-GB')} rpm`}/>
    <Action onClick={() => setRunning(r => !r)}>{running ? 'Stop the first flywheel suddenly' : 'Start the motor again'}</Action>
    <PlayBar play={play} label="the flywheels"/>
    <Readout label="Driven flywheel, seen from the far end" value={way(driven)}/>
    <Readout label="Passive flywheel, seen from the far end" value={way(passive)} tone={Math.sign(passive) === Math.sign(driven) && Math.abs(passive) > 0.02 ? 'bad' : undefined}/>
    <Remark>{running ? 'The second flywheel rotates briskly in the opposite direction.' : 'When the first is stopped suddenly, the second stops and reverses direction: a back EMF of the matter-motion kind.'}</Remark>
  </Diagram>;
}

/** Wallace's apparatus drawn in three dimensions: loaded on demand, since three.js is large. */
const WallaceScene = lazy(() => import('../three/WallaceScene'));

/** How the generator stands to the detector: poles aligned, poles opposed, or turned over continuously. */
type Poles = 'aligned' | 'opposed' | 'turning';

/**
 * The detector's shift from its resting angle in Wallace's measurements, in arc minutes: about 13 either side of
 * equilibrium with the poles aligned or opposed, 26 between the two (US 3,626,605, cols. 10-11). Taken here as in
 * proportion to the wheels' speed (a fraction of 20,000 rpm), and following the generator's orientation as it is
 * turned over.
 */
export const wallaceShift = (poles: Poles, speed: number, over: number) => 13 * speed * (poles === 'aligned' ? 1 : poles === 'opposed' ? -1 : Math.cos(rad(over)));

/** On screen the detector's tilt is magnified, so a shift of arc minutes can be seen: degrees drawn per arc minute (13 arc minutes are drawn as 5.2 degrees). */
const TILT_SHOWN = 0.4;

/** Figure 9-2: Wallace's apparatus, after his patent. The generator is turned over; the detector, restrained on a knife edge, tilts. */
function WallaceGyros() {
  const [speed, setSpeed] = useState(0.75);
  const [poles, setPoles] = useState<Poles>('turning');
  const [flat, setFlat] = useState(() => !canDraw3D());
  const [reset, setReset] = useState(0);
  const fail = useCallback(() => setFlat(true), []);
  const play = usePlayback();
  const state = useRef({ t: 0, wheel: 0, over: 0, shift: 0 });
  // Restart (or a step back) begins again from the starting state.
  if (play.t < state.current.t) state.current = { t: 0, wheel: 0, over: 0, shift: 0 };
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t)), s = state.current;
  s.t = play.t;
  s.wheel += speed * 520 * dt;
  // Turned over steadily; held aligned or opposed, the generator stands still at 0 or 180 degrees.
  s.over = poles === 'turning' ? s.over + 36 * dt : poles === 'aligned' ? 0 : 180;
  // The detector is heavy and hangs on a knife edge: it settles toward the shift over a second or two.
  s.shift += (wallaceShift(poles, speed, s.over) - s.shift) * Math.min(1, dt * 0.8);
  const { wheel, over, shift } = s, rpm = Math.round(speed * 20000);
  const side = Math.abs(shift) < 0.5 ? 'at its resting angle' : `${fmt(Math.abs(shift), 1)} arc minutes ${shift > 0 ? 'one way' : 'the other way'} from its resting angle`;
  const label = `Wallace's apparatus: two U-shaped brass members leave two gaps. In one, the generator's wheel spins at ${rpm.toLocaleString('en-GB')} rpm between its pole pieces${poles === 'turning' ? ' while the whole generator is turned over by a motor and belt' : `, held with its poles ${poles} with the detector's`}. In the other, the detector hangs on a knife edge; the light spot on the scale shows it ${side}.`;
  /** The flat drawing, face on as in the patent's FIG. 2: the fallback where 3D cannot be drawn (called, not mounted). */
  const flatRig = () => {
    const H = 360, gy = 170, gx = 230, dx = 420, lamp = [600, 250] as const, scaleX = 660;
    const assembly = (x: number, angle: number, turned: number) => <g transform={`translate(${x} ${gy}) rotate(${angle})`}>
      <rect x={-50} y={-6} width={100} height={12} rx={2} className="bk-body bk-body-plain"/>
      <line x1={-40 * Math.cos(rad(turned))} y1={0} x2={40 * Math.cos(rad(turned))} y2={0} className="bk-s-mark" strokeWidth="3"/>
      <rect x={-34} y={-22} width={68} height={12} className="bk-plate"/><rect x={-34} y={10} width={68} height={12} className="bk-plate"/>
      <rect x={-34} y={-22} width={68} height={4} className="bk-f-accent"/>
    </g>;
    // The beam from the lamp to the detector's mirror and on to the scale: the mirror turns with the tilt, the beam twice as far.
    const mx = dx + 20, my = gy, tilt = rad(shift * TILT_SHOWN);
    const toScale = Math.atan2(gy - 70 - my, scaleX - mx);
    const out = toScale + 2 * tilt, sy = my + (scaleX - mx) * Math.tan(out);
    return <Stage w={W} h={H} label={label}>
      <rect x={110} y={gy - 140} width={420} height={40} className="bk-body bk-body-matter"/><rect x={110} y={gy + 100} width={420} height={40} className="bk-body bk-body-matter"/>
      {[gx, dx].map(x => <g key={x}><rect x={x - 45} y={gy - 100} width={90} height={42} className="bk-body bk-body-matter"/><rect x={x - 45} y={gy + 58} width={90} height={42} className="bk-body bk-body-matter"/></g>)}
      {assembly(gx, -over, over)}
      {assembly(dx, -45 + shift * TILT_SHOWN, 0)}
      <line x1={lamp[0]} y1={lamp[1]} x2={mx} y2={my} className="bk-s-warn" strokeWidth="1.5"/><line x1={mx} y1={my} x2={scaleX} y2={sy} className="bk-s-warn" strokeWidth="1.5"/>
      <rect x={lamp[0] - 10} y={lamp[1] - 7} width={20} height={14} className="bk-plate"/>
      <line x1={scaleX} y1={gy - 140} x2={scaleX} y2={gy} className="bk-s-text" strokeWidth="3"/><circle cx={scaleX} cy={sy} r={5} className="bk-f-warn"/>
      <T x={gx} y={gy - 150} size="sm">generator</T><T x={dx} y={gy - 150} size="sm">detector, on a knife edge</T>
      <T x={320} y={H - 14} size="sm" tone="muted">brass mass circuit, face on as in the patent; the detector’s tilt is magnified {Math.round(60 * TILT_SHOWN)} times</T>
      <T x={scaleX + 8} y={gy - 146} anchor="start" size="sm">scale</T><T x={lamp[0]} y={lamp[1] + 24} size="sm">lamp</T>
    </Stage>;
  };
  return <Diagram stage={flat ? flatRig() : <FallbackOnError onError={fail} fallback={flatRig()}>
      <Suspense fallback={flatRig()}>
        <WallaceScene state={{ wheel, over, tilt: shift * TILT_SHOWN, turning: poles === 'turning', reset }} onFail={fail} description={`${label} Drag to turn the view.`}/>
      </Suspense>
    </FallbackOnError>}>
    {!flat && <Action onClick={() => setReset(n => n + 1)}>Back to this view</Action>}
    <Slider label="Speed of the wheels (compressed air)" value={speed} min={0} max={1} step={0.05} onChange={setSpeed} show={v => `${Math.round(v * 20000).toLocaleString('en-GB')} rpm`}/>
    <Choice label="The generator’s poles, to the detector’s" value={poles} onChange={setPoles} options={[{ value: 'aligned', label: 'Aligned' }, { value: 'opposed', label: 'Opposed' }, { value: 'turning', label: 'Turning' }]}/>
    <PlayBar play={play} label="the apparatus"/>
    <Readout label="Detector, from its resting angle" value={Math.abs(shift) < 0.05 ? 'at rest' : `${fmt(shift, 1)} arc minutes`}/>
    <Remark>{poles === 'turning' ? 'Turned over, the generator’s poles change their orientation to the Earth, and the detector swings one way and the other with them.' : 'Wallace reversed the poles every 30 or 40 minutes and found the detector’s resting angle shifted by about 26 arc minutes between the two.'}</Remark>
  </Diagram>;
}

type Mode = 'still' | 'spinning' | 'pushed' | 'locked';

/** Explorer: Laithwaite's flywheel on a pivoted shaft, in the four cases the text describes. */
function LaithwaiteFlywheel() {
  const [mode, setMode] = useState<Mode>('spinning');
  const play = usePlayback();
  const state = useRef({ t: 0, lift: -18, turn: 0, spin: 0, mode: 'spinning' as Mode });
  // Restart (or a step back) begins again from the starting state.
  if (play.t < state.current.t) state.current = { t: 0, lift: -18, turn: 0, spin: 0, mode: 'spinning' as Mode };
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t));
  state.current.t = play.t;
  if (state.current.mode !== mode) { state.current.mode = mode; if (mode === 'still' || mode === 'locked') state.current.lift = -18; }
  // Not spinning, or held so that it cannot tilt, the flywheel falls. Spinning, it holds its height and precesses.
  // Pushed along its precession it rises, until the shaft is level and the upward force stops.
  const s = state.current, target = mode === 'still' || mode === 'locked' ? -62 : mode === 'pushed' ? 0 : -18;
  s.lift += (target - s.lift) * Math.min(1, dt * (mode === 'pushed' ? 0.9 : mode === 'spinning' ? 2 : 1.6));
  s.turn += (mode === 'spinning' ? 26 : mode === 'pushed' ? 60 : 0) * dt;
  s.spin += (mode === 'still' ? 0 : 700) * dt;
  const H = 360, px = 230, py = 150, len = 230, [ex, ey] = polar(px, py, len, s.lift), tx = 560, ty = 110;
  return <Diagram stage={
    <Stage w={W} h={H} label={{ still: 'A flywheel that is not spinning, on a pivoted shaft: it falls.', spinning: 'A spinning flywheel on a pivoted shaft: it supports its own weight and precesses round the stand.', pushed: 'The spinning flywheel pushed along its precession: it rises until the shaft is level.', locked: 'The spinning flywheel held so it cannot tilt downward, then pushed: it simply topples.' }[mode]}>
      <rect x={px - 14} y={py} width={28} height={130} className="bk-plate"/><rect x={px - 60} y={py + 130} width={120} height={12} className="bk-plate"/>
      <line x1={px} y1={py} x2={ex} y2={ey} className="bk-s-text" strokeWidth="5" strokeLinecap="round"/>
      <ellipse cx={ex} cy={ey} rx={16} ry={64} transform={`rotate(${-s.lift} ${ex} ${ey})`} className="bk-body bk-body-matter"/>
      {mode !== 'still' && <line x1={ex} y1={ey - 50 * Math.cos(rad(s.spin))} x2={ex} y2={ey + 50 * Math.cos(rad(s.spin))} transform={`rotate(${-s.lift} ${ex} ${ey})`} className="bk-s-motion" strokeWidth="3"/>}
      <circle cx={px} cy={py} r={7} className="bk-f-mark"/><T x={px - 16} y={py - 12} anchor="end" size="sm">pivot</T>
      <Arrow x1={ex} y1={ey + 74} x2={ex} y2={ey + 124} tone="force" w={2.4}/><T x={ex + 10} y={ey + 106} anchor="start" size="sm">weight</T>
      {mode === 'pushed' && s.lift < -2 && <BlockArrow x1={ex} y1={ey - 72} x2={ex} y2={ey - 112} thick={12}/>}
      <circle cx={tx} cy={ty} r={54} className="bk-s-faint" fill="none" strokeDasharray="4 5"/><circle cx={tx} cy={ty} r={4} className="bk-f-mark"/>
      <line x1={tx} y1={ty} x2={polar(tx, ty, 54, s.turn)[0]} y2={polar(tx, ty, 54, s.turn)[1]} className="bk-s-text" strokeWidth="3"/><circle cx={polar(tx, ty, 54, s.turn)[0]} cy={polar(tx, ty, 54, s.turn)[1]} r={9} className="bk-body bk-body-matter"/>
      <T x={tx} y={ty + 78} size="sm">seen from above</T>
      <T x={W / 2} y={H - 12} size="sm" tone="mark">{{ still: 'not spinning: it falls under gravity', spinning: 'spinning: it holds its height and precesses', pushed: s.lift > -2 ? 'level: the upward force has stopped' : 'pushed along the precession: the whole assembly rises', locked: 'not free to tilt: no precession, and it topples' }[mode]}</T>
    </Stage>}>
    <Choice label="The flywheel is" value={mode} onChange={setMode} options={[{ value: 'still', label: 'Still' }, { value: 'spinning', label: 'Spinning' }, { value: 'pushed', label: 'Pushed' }, { value: 'locked', label: 'Locked' }]}/>
    <PlayBar play={play} label="the flywheel"/>
    <Readout label="Shaft" value={`${Math.round(s.lift)}° from level`}/>
    <Remark>The flywheel rises only until it is rotating parallel to the Earth’s surface. Turn it right round and you end where you started: no net propulsion.</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 9,
  summary: <>
    <p>If a spinning top interacts with a field in the vacuum, larger spinning masses should show it more plainly. Fleming takes three sets of experiments as evidence. Laithwaite’s heavy flywheel supports its own weight on a pivoted shaft, and rises when pushed along its precession. Wallace and Morgan each found that one spinning mass sets a second, passive one turning across an air gap.</p>
    <p>He sets aside the claims of anti-gravity and propulsion made for these devices, and keeps the plain result: <Q>The principle of magnetic induction applies to mattermagnetic forces</Q> (<Pg n={85}/>).</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x9-1', page: 81, section: 'Eric Laithwaite', title: 'Laithwaite’s flywheel: held up by the vacuum',
      Diagram: LaithwaiteFlywheel,
      text: <>
        <p>Laithwaite mounted a large flywheel on a shaft pivoted at a stand. <Q>The spinning flywheel is able to entirely support its own weight, or more precisely vacuum did, without requiring a counterweight.</Q> When he pushed the shaft <Q>in the direction of precession, the entire assembly, flywheel, shaft and bearing, moved upward</Q> (<Pg n={81}/>).</p>
        <p>The conditions matter. Locked so that it cannot tilt downward and then pushed, <Q>it simply topples over. It must be free to tilt downward for precession to occur</Q>. And the rise has a limit: <Q>the flywheel will rise until it is rotating parallel to the Earth’s surface where the upward force stops</Q>, so there is no net propulsive force (<Pg n={82}/>).</p>
        <p>What Fleming takes from it: <Q>none of this could happen if the rotating flywheel was not producing and interacting with a mattermagnetic field</Q>.</p>
      </>,
      tryThis: ['Step through the four cases. Still: it falls. Spinning: it stays up and goes round the stand. Pushed: it rises to level and no further. Locked: it topples.', 'In the Pushed case watch the top view: the push is along the circle of precession, and the response is upward, at right angles to it.'],
      notes: <p>The angles and rates are illustrative; the text describes the demonstrations in words. The spring and sliding bearing of Laithwaite’s stand are not drawn.</p>,
    },
    {
      kind: 'figure', id: '9-1', page: 83, section: 'Wallace, Morgan, and Inductive Matter Forces', title: 'Morgan’s flywheels: induction across an air gap',
      caption: 'Morgan’s inductive flywheel experimental apparatus',
      Diagram: MorganFlywheels,
      text: <>
        <p>When two flywheels are placed close together, <Q>the rotation of the first flywheel induces a rotation in the second passive flywheel when there is only an air gap and no electromagnetic or mechanical means of energy transfer other than perhaps vibration</Q>. The effect is <Q>extremely small relative to electromagnetic induction, as the velocities are slow compared to the speed of light</Q> (<Pg n={83}/>).</p>
        <p>Morgan’s discs were a sixteenth of an inch apart, the smaller driven by a motor rated at 26,500 rpm. <Q>When the first flywheel rotated at high speed, the second flywheel rotated briskly in the opposite direction.</Q> <Q>When the first flywheel was stopped suddenly, the second flywheel stopped and reversed direction.</Q> Fleming reads the reversal as the back EMF of a coil, <Q>of the matter motion variety</Q>.</p>
      </>,
      tryThis: ['Let the motor run: the passive flywheel turns the opposite way to the driven one. Drag the picture to look along the axis from either end.', 'Press “Stop the first flywheel suddenly” and watch the passive one: it stops, then turns the other way for a moment, as Morgan reported.', 'Start the motor again and it is kicked the opposite way before settling.'],
      notes: <p>The apparatus follows the photograph: the motor on a base drives the smaller disc, and the larger, passive disc faces it on the same axis, carried on an upright at the far end. Both discs stand upright, as Fleming describes them on p. 84: Morgan <Q>simply rotated his flywheels about their axle with the discs oriented perpendicular to the Earth</Q>. The gap is drawn wider than a sixteenth of an inch so it can be seen. The size of the induced rotation is greatly magnified, and how long the reversal lasts is a display choice; Morgan’s report gives directions, not rates. Where 3D cannot be drawn, a flat drawing shows the two discs face on, side by side, with zeptons in the gap for the field Fleming says carries the effect.</p>,
    },
    {
      kind: 'figure', id: '9-2', page: 84, title: 'Wallace’s gyroscopes: the plane turned over',
      caption: 'Wallace’s inductive gyroscope experimental apparatus',
      Diagram: WallaceGyros,
      text: <p>Wallace <Q>produced the inductive effect by rotating his gyroscopes such that the orientation of the plane of the disc changes with respect to the Earth. This produces a greater force directed in the normal direction of procession, however, his gyroscopes were restrained from moving in that direction</Q>. His gyroscopes were some distance apart, where Morgan’s discs nearly touched. <Q>That the inductive force is demonstrated in two different mechanical configurations makes the reports more convincing</Q> (<Pg n={84}/>).</p>,
      tryThis: [
        'Hold the generator’s poles aligned, then opposed: the light spot on the scale moves between two places, as Wallace’s detector settled about 26 arc minutes apart.',
        'Let it turn over: as the poles change their orientation, the detector swings one way and the other with them.',
        'Slow the wheels to zero: the detector stays at rest however the generator is turned.',
        'Drag the picture to look at the generator’s wheel between its pole pieces, and the detector hanging on its knife edge.',
      ],
      notes: <>
        <p>The figure prints two of the drawings from Wallace’s patent (US 3,626,605, FIGS. 2 and 6); the apparatus here follows the patent. Two U-shaped brass members, mirrored, leave two gaps. The generator sits in one: its wheel, spun by compressed air on buckets cut in its rim, turns a hair’s breadth from a pole piece on each face. The detector, built the same way, hangs in the other gap on a knife edge. The patent reads its tilt with a light beam off a mirror onto a scale on the wall, and the generator assembly turns over on a shaft (in FIG. 7, by a motor, pulley and belt). Fleming calls 31 the pulley; in the patent 31 is the shaft’s bearings.</p>
        <p>The detector’s shift is about 13 arc minutes from rest, 26 between poles aligned and opposed, as the patent reports; on screen its tilt is magnified 24 times. Taking the shift as in proportion to the wheels’ speed, and as following the generator round as it turns over, are display choices. Wallace’s further claim of an upward force Fleming thinks <Q>highly unlikely</Q>, and it is not shown.</p>
      </>,
    },
  ],
};
export default chapter;
