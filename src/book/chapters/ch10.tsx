// Chapter 10: Inertia (PDF pp. 86–90). Figures 10-1 to 10-3.
import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { BlockArrow, Body, Choice, Diagram, Drag, FieldPicture, PlayBar, Readout, Remark, Slider, Spin, Stage, T, Toggle, Vector, bearing, clamp, fmt, usePlayback, type Source } from '../kit';
import { Eq, Frac, Pg, Q, Sqrt, V } from '../prose';
import type { ChapterContent } from '../types';
import { SpinRow } from './shared';

const W = 720;

/** Figure 10-1: a current and the rotation of the zeptons round it sustain each other; only resistance stops them. */
function CurrentInertia() {
  const [emf, setEmf] = useState(true);
  const [resistance, setResistance] = useState(0.5);
  const play = usePlayback();
  const state = useRef({ t: 0, current: 0, angle: 0, flow: 0 });
  // Restart (or a step back) begins again from the starting state.
  if (play.t < state.current.t) state.current = { t: 0, current: 0, angle: 0, flow: 0 };
  const dt = Math.max(0, Math.min(0.1, play.t - state.current.t));
  state.current.t = play.t;
  // The electromotive force drives the current against the resistance; with neither, the current stays as it is.
  state.current.current = clamp(state.current.current + ((emf ? 0.5 : 0) - resistance * state.current.current) * dt * 1.4, 0, 1);
  state.current.angle += state.current.current * 150 * dt;
  state.current.flow += state.current.current * 70 * dt;
  const { current, angle, flow } = state.current;
  return <Diagram stage={
    <Stage w={W} h={320} label={`Electrons moving along a conductor with rotating zeptons either side. The current is ${Math.round(current * 100)} per cent of full, with the electromotive force ${emf ? 'applied' : 'removed'} and a resistance of ${fmt(resistance, 2)}.`}>
      <SpinRow kind="electron" current={current} angle={angle} flow={flow} t={play.t}/>
    </Stage>}>
    <Toggle label="Electromotive force applied" checked={emf} onChange={setEmf}/>
    <Slider label="Resistance of the circuit" value={resistance} min={0} max={1} step={0.05} onChange={setResistance} show={v => (v === 0 ? 'none' : fmt(v, 2))}/>
    <PlayBar play={play} label="the current"/>
    <Readout label="Current" value={`${Math.round(current * 100)} %`}/>
    <Remark>{resistance === 0 ? (emf ? 'With no resistance the force only speeds the current up.' : 'No resistance and no force: the current continues indefinitely, and the zeptons go on turning.') : emf ? 'The force is needed only to overcome the resistance.' : 'With the force removed the resistance brings the current, and the rotation, to rest.'}</Remark>
  </Diagram>;
}

/** The velocity of a body with matter charge m and momentum p, as a fraction of the speed the zeptons allow. */
export const bodyVelocity = (p: number, m: number) => { const u = p / m; return u / Math.sqrt(1 + u * u); };

/** A speed as a fraction of c, with enough digits to show that it stays below c however close it comes. */
export function speedOfLight(v: number) {
  const u = Math.abs(v);
  if (u < 0.99) return `${fmt(u, 2)} c`;
  const gap = 1 - u;
  return gap < 1e-9 ? 'within a billionth of c' : `${u.toFixed(Math.ceil(-Math.log10(gap)) + 1)} c`;
}

/** How hard a drag of this many units along the row pushes: a full push at 90 units, either way. */
export const pushOfDrag = (dragged: number) => clamp(dragged / 90, -1, 1);

/**
 * Figure 10-2: matter in motion sets zeptons rotating in proportion to its momentum, and their rotation keeps it moving.
 * The reader pushes the matter directly: drag along the row (harder the further), or hold an arrow key.
 */
function MatterInertia() {
  const [matter, setMatter] = useState(2);
  const play = usePlayback();
  const state = useRef({ t: 0, p: 0, angle: 0, flow: 0 });
  // The push in hand: a drag along the row (where it was pressed, and where the pointer is now), or an arrow key held.
  const grip = useRef<{ from: number; at: number } | null>(null);
  // The arrow keys held, most recent last: the push follows the latest still held, so releasing one leaves the other.
  const held = useRef<(1 | -1)[]>([]);
  // Restart (or a step back) begins again from the starting state.
  if (play.t < state.current.t) state.current = { t: 0, p: 0, angle: 0, flow: 0 };
  const dt = Math.max(0, Math.min(0.1, play.t - state.current.t)), s = state.current;
  s.t = play.t;
  const push = grip.current ? pushOfDrag(grip.current.at - grip.current.from) : held.current.at(-1) ?? 0;
  // Momentum has no limit; only the velocity does (bodyVelocity), as the zeptons cannot turn faster.
  s.p += push * dt * 1.6;
  const v = bodyVelocity(s.p, matter);
  s.angle += s.p * 60 * dt; s.flow += v * 110 * dt;
  const mid = 160;
  /** The pointer's position along the row, in diagram units. */
  const along = (e: PointerEvent<SVGRectElement>) => { const m = e.currentTarget.ownerSVGElement?.getScreenCTM?.(); return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()).x : null; };
  // Pushing sets the figure going if it was paused, so the push has an effect to see.
  const start = () => { if (!play.playing) play.toggle(); };
  const arrow = grip.current ? [grip.current.from, grip.current.at] : push ? [W / 2 - 55 * push, W / 2 + 55 * push] : null;
  // A push along the motion (or from rest) makes the zeptons turn faster; against it, it slows them.
  const faster = push * s.p >= 0;
  // The stage is a group, not a picture (role img), since the matter in it is a control the reader can reach and use.
  return <Diagram stage={
    <Stage w={W} h={320} role="group" label={`Pieces of matter moving along a line at ${Math.round(Math.abs(v) * 100)} per cent of the speed of light, with momentum ${fmt(Math.abs(s.p), 2)}. The zeptons either side rotate in proportion to the momentum.${push ? ` It is being pushed ${push > 0 ? 'forward' : 'back'}.` : ''}`}>
      <SpinRow kind="matter" current={clamp(s.p / 4, -1, 1)} angle={s.angle} flow={s.flow} t={play.t} field/>
      {arrow && Math.abs(arrow[1] - arrow[0]) > 6 && <BlockArrow x1={arrow[0]} y1={mid} x2={arrow[1]} y2={mid} thick={16} opacity={0.9}/>}
      {/* One line, always in the same place, says what is happening, so nothing beside the figure changes size as it goes. */}
      <T x={W / 2} y={24} tone={push ? 'text' : 'muted'}>{push ? `pushing ${push > 0 ? 'forward' : 'back'}: the zeptons are forced to ${faster ? 'turn faster' : 'slow'}` : Math.abs(s.p) < 0.05 ? 'at rest it stays at rest: drag along the matter, or hold → or ←, to push it' : 'no push, and it keeps moving: the turning zeptons carry it on'}</T>
      {/* The row of matter is what the reader pushes: by dragging along it, or with the arrow keys once it has the focus. */}
      <rect x={20} y={mid - 34} width={W - 40} height={68} fill="transparent" className="bk-push" tabIndex={0} role="application"
        aria-label="The moving matter. Drag along it to push it, forward to the right or back to the left, harder the further you drag; or hold the right or left arrow key."
        onPointerDown={e => { const x = along(e); if (x === null) return; e.preventDefault(); e.currentTarget.focus({ preventScroll: true }); /* focused, so the arrow keys work next, without the browser's own focus handling */ grip.current = { from: x, at: x }; e.currentTarget.setPointerCapture?.(e.pointerId); start(); }}
        onPointerMove={e => { if (!grip.current) return; const x = along(e); if (x !== null) grip.current.at = x; }}
        onPointerUp={e => { grip.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId); }}
        onPointerCancel={() => { grip.current = null; }}
        onKeyDown={e => { const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return; e.preventDefault(); if (!held.current.includes(dir)) held.current = [...held.current, dir]; start(); }}
        onKeyUp={e => { const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (dir) held.current = held.current.filter(d => d !== dir); }}
        onBlur={() => { held.current = []; }}/>
    </Stage>}>
    <Slider label="Matter charge of the body, m" value={matter} min={1} max={5} step={0.5} onChange={setMatter} unit="units"/>
    <PlayBar play={play} label="the moving matter"/>
    <Readout label="Velocity, υ" value={speedOfLight(v)}/>
    <Readout label="Momentum, p" value={fmt(Math.abs(s.p), 2)} tone="force"/>
    <Readout label="Rotation of the zeptons" value={`${fmt(Math.abs(s.p), 2)} (follows p)`} tone="b"/>
    <Remark>The resistance you push against is the zeptons being made to change their rotation. With no push the matter keeps moving: the rotating zeptons induce it to move, as it induced them to rotate.</Remark>
  </Diagram>;
}

/** Figure 10-3: the matter field of a body at rest, and the rotation forced on it when the body is moved. */
function RestField() {
  const [pos, setPos] = useState({ x: 360, y: 180 });
  const [mode, setMode] = useState<'lines' | 'zeptons'>('lines');
  const play = usePlayback();
  const last = useRef({ x: 360, y: 180, t: 0, speed: 0, dir: 0 });
  // How fast the body is being moved, smoothed, so the forced rotation shows while it moves and fades when it stops.
  const dt = Math.max(1e-3, play.t - last.current.t), dx = pos.x - last.current.x, dy = pos.y - last.current.y, dist = Math.hypot(dx, dy);
  if (play.t !== last.current.t) {
    last.current.speed += (clamp(dist / dt / 300) - last.current.speed) * Math.min(1, dt * 6);
    if (dist > 0.5) last.current.dir = bearing(last.current.x, last.current.y, pos.x, pos.y);
    last.current.x = pos.x; last.current.y = pos.y; last.current.t = play.t;
  }
  const { speed, dir } = last.current, H = 360;
  const sources = useMemo<Source[]>(() => [{ x: pos.x, y: pos.y, q: -1 }], [pos.x, pos.y]);
  const side = (k: 1 | -1) => { const a = ((dir + k * 90) * Math.PI) / 180; return [pos.x + 62 * Math.cos(a), pos.y - 62 * Math.sin(a)] as const; };
  return <Diagram stage={
    <Stage w={W} h={H} label={`A body of matter with its matter field pointing toward it. ${speed > 0.05 ? 'It is being moved, and the zeptons either side of its path are forced to rotate.' : 'It is at rest.'}`}>
      <FieldPicture sources={sources} w={W} h={H} perUnit={8} lines={mode === 'lines' ? 1 : 0} zeptons={mode === 'zeptons' ? 1 : 0} t={play.t} polarity="matter" tone="accent" zeptonLen={20}/>
      {speed > 0.05 && <>
        <Spin x={side(1)[0]} y={side(1)[1]} r={18 + 10 * speed} ccw sweep={240} opacity={Math.min(1, speed * 2)}/>
        <Spin x={side(-1)[0]} y={side(-1)[1]} r={18 + 10 * speed} ccw={false} sweep={240} opacity={Math.min(1, speed * 2)}/>
        <Vector x={pos.x} y={pos.y} angle={dir} len={40 + 50 * speed} tone="motion" w={2.4} opacity={Math.min(1, speed * 2)}/>
      </>}
      <Drag x={pos.x} y={pos.y} onMove={(x, y) => setPos({ x, y })} bounds={{ x0: 40, y0: 40, x1: W - 40, y1: H - 40 }} label="Body of matter"><Body x={pos.x} y={pos.y} r={18} label="m"/></Drag>
    </Stage>}>
    <Choice label="Draw the matter field as" value={mode} onChange={setMode} options={[{ value: 'lines', label: 'Lines' }, { value: 'zeptons', label: 'Zeptons' }]}/>
    <PlayBar play={play} label="the field"/>
    <Readout label="Zeptons forced to rotate" value={speed > 0.05 ? `${Math.round(speed * 100)} %` : 'none: at rest'} tone={speed > 0.05 ? 'b' : undefined}/>
    <Remark>{speed > 0.05 ? 'A force must be exerted to make it move; the resistance is the zeptons, forced to rotate as the body moves.' : 'Drag the body. Left alone, the oriented zeptons of its rest frame keep it at rest.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 10,
  summary: <>
    <p>Inertia is Newton’s first law, and it has never been explained. Fleming’s explanation is that it <Q>can only be an interaction between matter and the zero-point field</Q> (<Pg n={86}/>). A current and the rotation of the zeptons round it sustain each other; so do a moving body of matter and the zeptons it sets rotating. <Q>Inertia is nothing more than the principle of magnetism and inductance applied to the movement of matter</Q> (<Pg n={88}/>).</p>
    <p>That needs two things of matter that electricity already has: a magnetic-like field made by motion (Equation 10-1, the mattermagnetic field of chapter 8) and a static field of zeptons oriented to matter at rest (Equation 10-2).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '10-1', page: 87, section: 'A Physical Force Model', title: 'The inertia of a current',
      caption: 'Electrons in motion along a line induce rotation in surrounding zeptons.',
      Diagram: CurrentInertia,
      text: <>
        <p><Q>The current causes the zeptons to rotate, and the zepton rotation causes the current. The two are inseparable. This is how inertia works with respect to a current loop</Q> (<Pg n={86}/>).</p>
        <p><Q>As long as there is an electromotive force to overcome resistance in the circuit, the current will continue. But as with Aristotle, it is improper to say that force is required in the absence of disturbances such as resistance. In a hypothetical resistance-free circuit, the current would continue indefinitely. And if there were no current initially, no current would occur without an electromotive force being applied</Q> (<Pg n={87}/>).</p>
      </>,
      tryThis: ['Remove the electromotive force. With resistance in the circuit the current dies away, and the zeptons stop turning with it.', 'Set the resistance to none, let the current build, then remove the force: the current continues indefinitely.', 'Start again from rest with no force: nothing moves.'],
      notes: <p>This is the drawing of Figure 6-15 again, as the book reprints it. The rates of rise and decay are display choices.</p>,
      labs: [{ lab: 'electron', scenario: 'moving', why: 'The rotation a moving electron induces in the pairs round its path.' }],
    },
    {
      kind: 'figure', id: '10-2', page: 88, title: 'The inertia of matter',
      caption: 'Matter in motion along a line inducing rotation in surrounding zeptons.',
      Diagram: MatterInertia,
      text: <>
        <p><Q>As a body of matter moves through space it induces zeptons to rotate</Q>. <Q>The number and/or energy of zeptons that rotate is proportional to the momentum, matter-charge times velocity mυ, of the body of matter. Rotating zeptons also induce matter to move</Q> (<Pg n={87}/>, <Pg n={88}/>).</p>
        <p>The zeptons also set the limit of speed. A zepton <Q>can only rotate 180 degrees at its maximum extent of travel, its wavelength. So it can only cover a distance equivalent to the speed of light</Q>; <Q>as a body accelerates to near light speed, increasing momentum means an increasing number of zeptons rotating in response to the motion</Q>. And since matter is saturated with zeptons, <Q>a body of matter cannot be isolated from its inertial field</Q> (<Pg n={88}/>, <Pg n={89}/>).</p>
        <Eq n="10-1"><V>B</V><sub>m</sub> = <Frac top={<>μ<sub>0m</sub><V>m</V></>} bottom="4π"/> <Frac top={<><V>υ</V> × r̂</>} bottom={<><V>r</V>²</>}/></Eq>
      </>,
      tryThis: ['Drag along the row of matter to the right and let go: that is a push forward. The body keeps its velocity, and the zeptons keep turning: neither stops the other.', 'Drag to the left to push it back until it comes to rest. With the keyboard, hold → or ← instead.', 'Raise the matter charge and push again: the same push gives the same momentum and the same rotation, but less velocity.', 'Keep pushing forward. The momentum and the rotation go on rising while the velocity closes on c and never reaches it.'],
      notes: <p>The symbols ⊙ and ⊗ mark the mattermagnetic field as Figure 11-4 states it: out of the page above matter moving to the right, into it below. How the velocity approaches the limit as momentum rises is a display choice (the usual relativistic form); Fleming says only that the zeptons cannot rotate faster. So the momentum shown is p = mυ/<Sqrt>1 − υ²/c²</Sqrt>, which is Fleming’s mυ at low speeds and goes on rising as υ approaches c.</p>,
    },
    {
      kind: 'figure', id: '10-3', page: 88, title: 'Why a body at rest stays at rest',
      caption: 'A body of matter at rest with a matter field pointing toward it.',
      Diagram: RestField,
      text: <>
        <p><Q>If the motion of matter can cause zeptons to rotate, they also must cause zeptons to orient themselves with respect to matter when matter is at rest</Q>. <Q>It is the matter field or oriented zeptons in a body’s rest frame that cause the body to stay at rest. A force must be exerted on the body of matter in order to make it move, and the resistance to motion is provided by the zeptons, as they are forced to rotate when the body moves</Q> (<Pg n={88}/>).</p>
        <p>The static field takes the form of Gauss’s law, with <V>M</V> the matter field and ε<sub>0m</sub> the dielectric constant of the vacuum with respect to matter (<Pg n={89}/>):</p>
        <Eq n="10-2">∮ <V>M</V>·d<V>A</V> = <Frac top={<V>m</V>} bottom={<>ε<sub>0m</sub></>}/></Eq>
      </>,
      tryThis: ['Leave the body alone: its field is still, and so is it.', 'Drag it. While it moves, rotation appears either side of its path, opposite ways on the two sides; when you stop, the rotation dies away.', 'Switch to zeptons to see what the arrows stand for. Chapter 11 says which end of each faces the body.'],
      notes: <p>The printed figure shows only the arrows of the field. The rotation shown while the body is dragged illustrates the sentence quoted; its size and how quickly it fades are display choices. Here the field follows the body at once, which Fleming does not address in this chapter.</p>,
    },
  ],
};
export default chapter;
