// Chapter 9: Tops, Flywheels, and Gyroscopes (PDF pp. 81–85). Figures 9-1 and 9-2.
import { useRef, useState } from 'react';
import { Action, Arrow, BlockArrow, Choice, Diagram, PlayBar, Readout, Remark, Slider, Spin, Stage, T, Toggle, Zepton, clamp, polar, rad, usePlayback } from '../kit';
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

/** Figure 9-1: Morgan's two flywheels a small gap apart. The driven one turns the passive one the other way. */
function MorganFlywheels() {
  const [speed, setSpeed] = useState(0.8);
  const [running, setRunning] = useState(true);
  const play = usePlayback();
  const state = useRef({ t: 0, driven: 0, passive: 0, a1: 0, a2: 0 });
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t)), target = running ? speed : 0, before = state.current.driven;
  state.current.t = play.t;
  // The motor brings the first flywheel up to speed over a moment; the brake stops it almost at once.
  state.current.driven += (target - before) * Math.min(1, dt * (running ? 1.5 : 14));
  state.current.passive = clamp(inducedSpeed(state.current.passive, state.current.driven, state.current.driven - before, dt), -1.2, 1.2);
  state.current.a1 += state.current.driven * 520 * dt;
  state.current.a2 += state.current.passive * 520 * dt;
  const { driven, passive, a1, a2 } = state.current, H = 360, y = 170;
  const way = (v: number) => (Math.abs(v) < 0.02 ? 'at rest' : v > 0 ? 'counter-clockwise' : 'clockwise');
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two flywheels facing each other across a small air gap, shown face on. The driven flywheel is ${way(driven)}; the passive one is ${way(passive)}.`}>
      <Wheel x={230} y={y} r={92} angle={a1} label="driven flywheel (motor)" tone="matter"/>
      <Wheel x={490} y={y} r={110} angle={a2} label="passive flywheel (free to turn)"/>
      {Math.abs(driven) > 0.03 && <Spin x={230} y={y} r={106} ccw={driven > 0} sweep={60 + 160 * Math.abs(driven)}/>}
      {Math.abs(passive) > 0.03 && <Spin x={490} y={y} r={124} ccw={passive > 0} sweep={60 + 160 * Math.min(1, Math.abs(passive))}/>}
      {[-60, -20, 20, 60].map((dy, i) => <Zepton key={dy} x={354} y={y + dy} angle={a1 * 0.7 * (i % 2 ? -1 : 1) + i * 40} len={18} oval={false} signs={false} polarity="matter" opacity={0.35 + 0.6 * Math.min(1, Math.abs(driven) + Math.abs(passive))}/>)}
      <T x={354} y={y - 96} size="sm">air gap only</T>
      <T x={W / 2} y={H - 12} size="sm">The two discs face each other on one axis; they are drawn side by side so both rotations can be seen.</T>
    </Stage>}>
    <Slider label="Speed of the driven flywheel" value={speed} min={0.2} max={1} step={0.05} onChange={setSpeed} show={v => `${Math.round(v * 26500).toLocaleString('en-GB')} rpm`}/>
    <Action onClick={() => setRunning(r => !r)}>{running ? 'Stop the first flywheel suddenly' : 'Start the motor again'}</Action>
    <PlayBar play={play} label="the flywheels"/>
    <Readout label="Driven flywheel" value={way(driven)}/>
    <Readout label="Passive flywheel" value={way(passive)} tone={Math.sign(passive) === Math.sign(driven) && Math.abs(passive) > 0.02 ? 'bad' : undefined}/>
    <Remark>{running ? 'The second flywheel rotates briskly in the opposite direction.' : 'When the first is stopped suddenly, the second stops and reverses direction: a back EMF of the matter-motion kind.'}</Remark>
  </Diagram>;
}

/** Figure 9-2: Wallace's gyroscopes, some distance apart, with the driven one's plane turned over as it spins. */
function WallaceGyros() {
  const [spin, setSpin] = useState(0.8);
  const [tumble, setTumble] = useState(0.6);
  const play = usePlayback();
  const state = useRef({ t: 0, a1: 0, a2: 0, tilt: 0, passive: 0 });
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t));
  state.current.t = play.t;
  // The induced rotation is drawn as following both the spin and the turning-over of the first gyroscope's plane.
  state.current.passive += (-0.7 * spin * (0.25 + tumble) - state.current.passive) * Math.min(1, dt * 1.5);
  state.current.a1 += spin * 520 * dt; state.current.a2 += state.current.passive * 520 * dt; state.current.tilt += tumble * 70 * dt;
  const { a1, a2, tilt, passive } = state.current, H = 340, y = 160, squash = Math.abs(Math.cos(rad(tilt)));
  const gyro = (x: number, angle: number, k: number, label: string) => <g>
    <ellipse cx={x} cy={y} rx={84} ry={Math.max(6, 84 * k)} className="bk-body bk-body-plain"/>
    {[0, 60, 120].map(a => { const c = Math.cos(rad(angle + a)), s = Math.sin(rad(angle + a)); return <line key={a} x1={x - 78 * c} y1={y + 78 * s * k} x2={x + 78 * c} y2={y - 78 * s * k} className="bk-s-muted" strokeWidth="2"/>; })}
    <circle cx={x + 66 * Math.cos(rad(angle))} cy={y - 66 * Math.sin(rad(angle)) * k} r={5} className="bk-f-mark"/>
    <line x1={x - 104} y1={y} x2={x + 104} y2={y} className="bk-s-text" strokeWidth="2"/>
    <text x={x} y={y + 116} textAnchor="middle" className="bk-t bk-t-sm bk-f-muted">{label}</text>
  </g>;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two gyroscopes some distance apart. The first is spun by a motor while its plane is turned over; the second, passive, is induced to rotate the opposite way at ${Math.round(Math.abs(passive) * 100)} per cent of the display's full speed.`}>
      {gyro(190, a1, Math.max(0.08, squash), 'driven gyroscope: spun, and its plane turned over')}
      {gyro(530, a2, 0.75, 'passive gyroscope')}
      <Spin x={190} y={y - 96} r={16} ccw sweep={200} tone="muted"/>
      {Math.abs(passive) > 0.03 && <Spin x={530} y={y} r={98} ccw={passive > 0} sweep={50 + 200 * Math.min(1, Math.abs(passive))}/>}
      <Arrow x1={290} y1={y} x2={430} y2={y} tone="faint" w={1.4} dash="4 4"/><T x={360} y={y - 12} size="sm">some distance apart</T>
    </Stage>}>
    <Slider label="Spin of the driven gyroscope" value={spin} min={0} max={1} step={0.05} onChange={setSpin} show={v => `${Math.round(v * 100)} %`}/>
    <Slider label="Rate its plane is turned over" value={tumble} min={0} max={1} step={0.05} onChange={setTumble} show={v => (v === 0 ? 'fixed (as Morgan)' : `${Math.round(v * 100)} %`)}/>
    <PlayBar play={play} label="the gyroscopes"/>
    <Readout label="Induced rotation" value={`${Math.round(Math.abs(passive) * 100)} %`}/>
    <Remark>Wallace turned the plane of his discs with respect to the Earth, which Fleming says produces a greater force than spinning about a fixed axle as Morgan did.</Remark>
  </Diagram>;
}

type Mode = 'still' | 'spinning' | 'pushed' | 'locked';

/** Explorer: Laithwaite's flywheel on a pivoted shaft, in the four cases the text describes. */
function LaithwaiteFlywheel() {
  const [mode, setMode] = useState<Mode>('spinning');
  const play = usePlayback();
  const state = useRef({ t: 0, lift: -18, turn: 0, spin: 0, mode: 'spinning' as Mode });
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
      tryThis: ['Let the motor run: the passive flywheel turns the opposite way to the driven one.', 'Press “Stop the first flywheel suddenly” and watch the passive one: it stops, then turns the other way for a moment, as Morgan reported.', 'Start the motor again and it is kicked the opposite way before settling.'],
      notes: <p>The size of the induced rotation is greatly magnified, and how long the reversal lasts is a display choice; Morgan’s report gives directions, not rates. The zeptons in the gap stand for the field Fleming says carries the effect.</p>,
    },
    {
      kind: 'figure', id: '9-2', page: 84, title: 'Wallace’s gyroscopes: the plane turned over',
      caption: 'Wallace’s inductive gyroscope experimental apparatus',
      Diagram: WallaceGyros,
      text: <p>Wallace <Q>produced the inductive effect by rotating his gyroscopes such that the orientation of the plane of the disc changes with respect to the Earth. This produces a greater force directed in the normal direction of procession, however, his gyroscopes were restrained from moving in that direction</Q>. His gyroscopes were some distance apart, where Morgan’s discs nearly touched. <Q>That the inductive force is demonstrated in two different mechanical configurations makes the reports more convincing</Q> (<Pg n={84}/>).</p>,
      tryThis: ['Set the turning-over of the plane to zero: this is Morgan’s arrangement, a disc spinning about a fixed axle, and the induced rotation is smaller.', 'Raise it: the induced rotation grows.', 'Set the spin to zero: nothing is induced however the plane is turned.'],
      notes: <p>Fleming says turning the plane gives <Q>a greater force</Q> but not how much greater; the dependence drawn here is a display choice. Wallace’s further claim of an upward force Fleming thinks <Q>highly unlikely</Q>, and it is not shown.</p>,
    },
  ],
};
export default chapter;
