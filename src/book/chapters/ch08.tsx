// Chapter 8: The Mattermagnetic Field (PDF pp. 70–80). Figures 8-1 to 8-6.
import { useRef, useState } from 'react';
import { Action, Arrow, BlockArrow, Body, Charge, Choice, Diagram, Drag, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, T, Toggle, Zepton, clamp, deg, fmt, pathThrough, polar, rad, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';
import { HandRule } from './shared';

const W = 720;

/** Figure 8-1: Descartes's vortices, from a few great ones that carry planets down to innumerable small ones. */
function Vortices() {
  const [count, setCount] = useState(3);
  const play = usePlayback();
  const H = 380, cols = count, rows = Math.max(2, Math.round(count * 0.55)), cw = (W - 40) / cols, ch = (H - 40) / rows, r = Math.min(cw, ch) / 2 - 3, small = count >= 9;
  return <Diagram stage={
    <Stage w={W} h={H} label={small ? `Space filled with ${cols * rows} small vortices, each drawn as a rotating zepton dipole.` : `Space filled with ${cols * rows} large interlocking vortices, each a circling band of particles carrying bodies round its centre.`}>
      {Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => {
        const x = 20 + cw * (i + 0.5), y = 20 + ch * (j + 0.5), sense = (i + j) % 2 ? 1 : -1, turn = sense * play.t * (small ? 220 : 40);
        if (small) return <Zepton key={`${i}-${j}`} x={x} y={y} angle={turn + (i * 7 + j * 13) * 20} len={r * 1.5} oval={false} signs={false}/>;
        return <g key={`${i}-${j}`}>
          {[0.35, 0.65, 0.95].map(k => <circle key={k} cx={x} cy={y} r={r * k} className="bk-s-muted" fill="none" strokeWidth="1" strokeDasharray="1.5 5" strokeDashoffset={-turn * k * 0.6}/>)}
          <circle cx={x} cy={y} r={Math.max(3, r * 0.09)} className="bk-f-mark"/>
          {count <= 5 && [0.5, 0.82].map((k, n) => { const [px, py] = polar(x, y, r * k, turn / k + n * 140); return <circle key={k} cx={px} cy={py} r={Math.max(2.5, r * 0.05)} className="bk-f-text"/>; })}
        </g>;
      }))}
    </Stage>}>
    <Slider label="How many vortices fill the space" value={count} min={2} max={14} step={1} onChange={setCount} show={() => `${cols * rows}`}/>
    <PlayBar play={play} label="the vortices"/>
    <Remark>{small ? 'Innumerable and small: Maxwell’s molecular vortices, or rotating zepton dipoles.' : 'Descartes’s own picture: very large vortices, with the planets riding in their circling bands.'}</Remark>
  </Diagram>;
}

/** The outline of a top standing on its tip at (x, y), leaning `lean` degrees from the upright toward the right. */
function topOutline(x: number, y: number, lean: number, size = 1) {
  const pts: [number, number][] = [[0, 0], [-34, 96], [-26, 150], [-12, 150], [-12, 176], [12, 176], [12, 150], [26, 150], [34, 96]];
  const c = Math.cos(rad(lean)), s = Math.sin(rad(lean));
  return pathThrough(pts.map(([u, v]) => [x + size * (u * c + v * s), y - size * (-u * s + v * c)] as const)) + ' Z';
}

/** Figure 8-2: a top that is not spinning, stood on its tip, falls over. */
function FallingTop() {
  const [start, setStart] = useState(22);
  const play = usePlayback({ autoplay: false });
  const state = useRef({ t: 0, lean: 22, rate: 0, from: 22 });
  // An inverted pendulum: the further it leans, the faster it falls, until it lies on the surface.
  if (state.current.from !== start || play.t < state.current.t) state.current = { t: play.t, lean: start, rate: 0, from: start };
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t));
  state.current.t = play.t;
  if (state.current.lean < 78) { state.current.rate += 260 * Math.sin(rad(state.current.lean)) * dt; state.current.lean = Math.min(78, state.current.lean + state.current.rate * dt); }
  const lean = state.current.lean, H = 340, x = 250, y = 290, cm = 96, [cx, cy] = [x + cm * Math.sin(rad(lean)), y - cm * Math.cos(rad(lean))];
  const arc = pathThrough(Array.from({ length: 30 }, (_, i) => { const a = start + ((78 - start) * i) / 29; return [x + cm * Math.sin(rad(a)), y - cm * Math.cos(rad(a))] as const; }));
  return <Diagram stage={
    <Stage w={W} h={H} label={`A top that is not spinning, standing on its tip and leaning ${Math.round(lean)} degrees. Gravity acts straight down through its centre of mass and it falls over.`}>
      <line x1={60} y1={y} x2={W - 60} y2={y} className="bk-s-text" strokeWidth="2"/>
      <Line d={arc} tone="muted" dash="5 5"/>
      <path d={topOutline(x, y, lean)} className="bk-body bk-body-plain"/>
      <circle cx={cx} cy={cy} r={6} className="bk-f-mark"/>
      <Arrow x1={cx} y1={cy} x2={cx} y2={y - 4} tone="force" w={2.4}/>
      <T x={cx + 12} y={(cy + y) / 2} anchor="start" size="sm">gravity, through the centre of mass</T>
      <T x={520} y={120} tone="text">{lean >= 78 ? 'fallen' : play.playing ? 'falling' : 'held'}</T>
    </Stage>}>
    <Slider label="Lean when released" value={start} min={4} max={50} step={1} onChange={v => { setStart(v); play.seek(0); }} unit="°"/>
    <Action onClick={() => { state.current = { t: 0, lean: start, rate: 0, from: start }; play.restart(); }}>Release the top</Action>
    <Readout label="Lean" value={`${Math.round(lean)}°`}/>
    <Remark>Gravity is a point-to-point force between centres of mass, and the top follows that line. This is what the laws of gravity say should happen to a spinning top too.</Remark>
  </Diagram>;
}

/** The rate at which a top precesses: the torque of gravity over its angular momentum (Equations 8-4 and 8-5), in turns of the diagram. */
export const precessionRate = (spin: number, weight = 1) => weight / Math.max(Math.abs(spin), 0.05);

/** Figure 8-3: a spinning top seen from above, precessing the way it spins. */
function PrecessingTop() {
  const [clockwise, setClockwise] = useState(true);
  const [spin, setSpin] = useState(1);
  const [field, setField] = useState(false);
  const play = usePlayback();
  const state = useRef({ t: 0, angle: 20, spun: 0 });
  // Restart (or a step back) begins again from the starting state.
  if (play.t < state.current.t) state.current = { t: 0, angle: 20, spun: 0 };
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t)), sense = clockwise ? -1 : 1;
  state.current.t = play.t;
  state.current.angle += sense * precessionRate(spin) * 34 * dt;
  state.current.spun += sense * spin * 500 * dt;
  const H = 380, cx = 300, cy = 190, R = 118, a = state.current.angle, [hx, hy] = polar(cx, cy, R + 34, a), [mx, my] = polar(cx, cy, R * 0.7, a);
  const [p1x, p1y] = polar(hx, hy, 30, a + 90), [p2x, p2y] = polar(hx, hy, 30, a - 90), [tx, ty] = polar(mx, my, 46, a + sense * 90);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A top seen from above, spinning ${clockwise ? 'clockwise' : 'counter-clockwise'}. It precesses round the point where its tip meets the surface, also ${clockwise ? 'clockwise' : 'counter-clockwise'}.`}>
      <circle cx={cx} cy={cy} r={R * 0.7} className="bk-s-muted" fill="none" strokeDasharray="7 7"/>
      <Spin x={cx} y={cy} r={R * 0.7 + 22} ccw={!clockwise} from={a + sense * 20} sweep={50} tone="muted"/>
      <path d={`M${cx} ${cy} L${p1x} ${p1y} L${p2x} ${p2y} Z`} className="bk-body bk-body-plain"/>
      <circle cx={hx} cy={hy} r={20} className="bk-body bk-body-plain"/>
      <line x1={hx} y1={hy} x2={polar(hx, hy, 16, state.current.spun)[0]} y2={polar(hx, hy, 16, state.current.spun)[1]} className="bk-s-motion" strokeWidth="2.5"/>
      <Spin x={hx} y={hy} r={27} ccw={!clockwise} sweep={240}/>
      <circle cx={mx} cy={my} r={6} className="bk-f-mark"/>
      <circle cx={cx} cy={cy} r={4} className="bk-f-text"/><T x={cx - 10} y={cy + 22} anchor="end" size="sm">tip</T>
      {field && <>
        {/* Along the axis: toward the tip for a clockwise spin, away from it (toward the head) for a counter-clockwise one. */}
        <Arrow x1={hx} y1={hy} x2={polar(hx, hy, 70, clockwise ? a + 180 : a)[0]} y2={polar(hx, hy, 70, clockwise ? a + 180 : a)[1]} tone="b" w={3}/>
        <InOut x={mx} y={my} out={false} r={11} tone="motion"/>
        <BlockArrow x1={mx} y1={my} x2={tx} y2={ty} thick={9}/>
        <T x={560} y={120} anchor="start" size="sm" tone="b">B_m along the axis,</T><T x={560} y={136} anchor="start" size="sm" tone="b">{clockwise ? 'downward (toward the tip)' : 'upward (toward the head)'}</T>
        <T x={560} y={166} anchor="start" size="sm" tone="motion">⊗ v: falling, into the page</T>
        <T x={560} y={196} anchor="start" size="sm" tone="text">force F_m, at 90° to both</T>
      </>}
    </Stage>}>
    <Choice label="Spin, seen from above" value={clockwise ? 'cw' : 'ccw'} onChange={v => setClockwise(v === 'cw')} options={[{ value: 'cw', label: 'Clockwise' }, { value: 'ccw', label: 'Counter' }]}/>
    <Slider label="Rate of spin" value={spin} min={0.3} max={3} step={0.1} onChange={setSpin} show={v => `${fmt(v, 2)} ×`}/>
    <Toggle label="Show the mattermagnetic account" checked={field} onChange={setField}/>
    <PlayBar play={play} label="the top"/>
    <Readout label="Precession" value={`${fmt(precessionRate(spin), 2)} × , ${clockwise ? 'clockwise' : 'counter-clockwise'}`}/>
    <Remark>{field ? 'The spinning top produces a mattermagnetic field, and gravity gives it a velocity downward. The force is at 90 degrees to that velocity, so it moves round and does not fall.' : 'Spin it the other way and it precesses the other way. Spin it faster and it precesses more slowly.'}</Remark>
  </Diagram>;
}

/** The torque of gravity on a leaning top (Equation 8-4). */
export const gravityTorque = (m: number, g: number, r: number, alpha: number) => m * g * r * Math.sin(rad(alpha));

/** Figure 8-5: where each part of the torque of gravity on a top comes from. */
function TopTorque() {
  const [alpha, setAlpha] = useState(28);
  const [mass, setMass] = useState(0.2);
  const [r, setR] = useState(0.04);
  const [spin, setSpin] = useState(30);
  const H = 360, x = 240, y = 310, cm = 60 + r * 1500, [cx, cy] = [x + cm * Math.sin(rad(alpha)), y - cm * Math.cos(rad(alpha))];
  const torque = gravityTorque(mass, 9.81, r, alpha), inertia = 0.5 * mass * 0.03 ** 2, L = inertia * spin * 2 * Math.PI, wp = (mass * 9.81 * r) / L;
  const arc = pathThrough(Array.from({ length: 20 }, (_, i) => { const a = (alpha * i) / 19; return [x + 70 * Math.sin(rad(a)), y - 70 * Math.cos(rad(a))] as const; }));
  return <Diagram stage={
    <Stage w={W} h={H} label={`A spinning top leaning ${alpha} degrees from the perpendicular. Its weight acts at the centre of mass, a distance r from the tip, giving a torque of ${fmt(torque)} newton metres.`}>
      <line x1={60} y1={y} x2={W - 60} y2={y} className="bk-s-text" strokeWidth="2"/>
      <path d={topOutline(x, y, alpha, 0.9 + r * 6)} className="bk-body bk-body-plain" opacity={0.7}/>
      <line x1={x} y1={y} x2={x} y2={y - 190} className="bk-s-muted" strokeDasharray="4 4"/>
      <Arrow x1={x} y1={y} x2={cx} y2={cy} tone="mark" w={2.4}/><T x={(x + cx) / 2 + 14} y={(y + cy) / 2 + 4} tone="mark" anchor="start">r</T>
      <Line d={arc} tone="accent" w={1.6}/><T x={x + 86 * Math.sin(rad(alpha / 2))} y={y - 86 * Math.cos(rad(alpha / 2))} tone="accent">α</T>
      <circle cx={cx} cy={cy} r={6} className="bk-f-mark"/>
      <Arrow x1={cx} y1={cy} x2={cx} y2={cy + 40 + mass * 120} tone="force" w={3}/><T x={cx + 12} y={cy + 40 + mass * 60} anchor="start" tone="text">mg</T>
      <Arrow x1={x} y1={y + 18} x2={cx} y2={y + 18} both tone="e" w={1.4} head={6}/><T x={(x + cx) / 2} y={y + 36} size="sm" tone="e">r sin α</T>
    </Stage>}>
    <Slider label="Angle from the perpendicular, α" value={alpha} min={2} max={60} step={1} onChange={setAlpha} unit="°"/>
    <Slider label="Mass of the top, m" value={mass} min={0.05} max={0.5} step={0.01} onChange={setMass} unit="kg"/>
    <Slider label="Tip to centre of mass, r" value={r} min={0.02} max={0.08} step={0.005} onChange={setR} show={v => `${fmt(v * 100, 2)} cm`}/>
    <Slider label="Spin" value={spin} min={5} max={80} step={1} onChange={setSpin} unit="turns/s"/>
    <Readout label="Torque, mgr sin α" value={`${fmt(torque)} N m`} tone="force"/>
    <Readout label="Precession, from τ = ω_p × L" value={`${fmt(wp / (2 * Math.PI))} turns/s`}/>
    <Remark>The torque grows with the lean; the precession rate does not, because the part of L it has to turn grows with the lean too.</Remark>
  </Diagram>;
}

/** The relative strength of the field of a moving charge or body at a distance r and angle α from its motion (Equations 8-11 and 8-13). */
export const movingField = (r: number, alpha: number, reference: number) => (Math.sin(rad(alpha)) * reference * reference) / (r * r);

/** Figure 8-6: the magnetic field of a moving charge, and of a moving body of matter by the same form. */
function MovingSourceField() {
  const [matter, setMatter] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [p, setP] = useState({ x: 480, y: 130 });
  const H = 380, sx = 280, sy = 300, dx = p.x - sx, dy = p.y - sy, r = Math.hypot(dx, dy), alpha = deg(Math.acos(clamp(-dy / (r || 1), -1, 1)));
  // At the source itself the inverse square has no value, and a body at rest makes no field: both read as none.
  const strength = r < 1 || speed === 0 ? 0 : speed * movingField(r, alpha, 150), none = strength < 1e-6, right = dx > 0, name = matter ? 'B_m' : 'B';
  const arc = pathThrough(Array.from({ length: 20 }, (_, i) => polar(sx, sy, 56, 90 - (Math.sign(dx) || 1) * (alpha * i) / 19)));
  return <Diagram stage={
    <Stage w={W} h={H} label={`A ${matter ? 'body of matter' : 'positive charge'} ${speed === 0 ? 'at rest' : 'moving up the page'}. At the point marked, ${Math.round(r)} units away at ${Math.round(alpha)} degrees from the motion, ${none ? `there is no ${matter ? 'mattermagnetic' : 'magnetic'} field` : `the ${matter ? 'mattermagnetic' : 'magnetic'} field points ${right ? 'into' : 'out of'} the page with relative strength ${fmt(strength, 2)}`}.`}>
      {speed > 0 && <><Arrow x1={sx} y1={sy} x2={sx} y2={sy - 60 - 110 * speed} tone="motion" w={3}/><T x={sx - 14} y={sy - 90} anchor="end" tone="motion" size="lg">v</T></>}
      <Arrow x1={sx} y1={sy} x2={p.x} y2={p.y} tone="mark" w={2.2}/><T x={(sx + p.x) / 2 + 12} y={(sy + p.y) / 2 + 16} tone="mark" anchor="start" size="lg">r</T>
      <Line d={arc} tone="accent" w={1.6}/><T x={polar(sx, sy, 74, 90 - (Math.sign(dx) || 1) * alpha / 2)[0]} y={polar(sx, sy, 74, 90 - (Math.sign(dx) || 1) * alpha / 2)[1]} tone="accent">α</T>
      {matter ? <Body x={sx} y={sy} r={18}/> : <Charge x={sx} y={sy} sign={1} r={18}/>}
      <Drag x={p.x} y={p.y} onMove={(x, y) => setP({ x, y })} bounds={{ x0: 40, y0: 30, x1: W - 40, y1: H - 30 }} label="Point where the field is measured">
        {/* No field, no direction: an empty ring marks the point instead of ⊙ or ⊗. */}
        {none ? <circle cx={p.x} cy={p.y} r={7} className="bk-s-muted" fill="none" strokeWidth="1.5"/> : <InOut x={p.x} y={p.y} out={!right} r={6 + 16 * clamp(strength / 2)} tone="b"/>}
      </Drag>
      <T x={p.x + 30} y={p.y - 18} anchor="start" tone="b" size="lg">{name}</T>
      <T x={30} y={H - 14} anchor="start" size="sm">⊗ into the page on the right of the motion · ⊙ out of it on the left</T>
    </Stage>}>
    <Choice label="What is moving" value={matter ? 'matter' : 'charge'} onChange={v => setMatter(v === 'matter')} options={[{ value: 'charge', label: 'Charge q' }, { value: 'matter', label: 'Matter m' }]}/>
    <Slider label="Velocity" value={speed} min={0} max={1.5} step={0.05} onChange={setSpeed} show={v => `${fmt(v, 2)} ×`}/>
    <Readout label="Distance r" value={`${Math.round(r)} units`}/>
    <Readout label="Angle α" value={`${Math.round(alpha)}°`}/>
    <Readout label={`${name}, relative`} value={none ? 'none' : `${fmt(strength, 2)} ${right ? 'into the page' : 'out of the page'}`} tone="b"/>
    <Remark>{matter ? 'With matter in place of charge the numerator is mυ: the momentum of the body.' : 'Drag the point. The field is strongest beside the charge, falls with the square of the distance, and is zero straight ahead.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 8,
  summary: <>
    <p>A top that is not spinning falls over; a spinning one precesses and stays up. Nothing in Newton’s gravity or general relativity depends on rotation, and the standard account by angular momentum and torque does not say what the top pushes against. Fleming’s answer is the vacuum.</p>
    <p>He takes the torque of a current loop as the model, and writes a Lorentz force for matter, <V>F</V><sub>m</sub> = <V>m</V>(<V>υ</V> × <V>B</V><sub>m</sub>) (Equation 8-8). Moving matter produces a <strong>mattermagnetic</strong> field, proportional to its momentum; a spinning top produces one along its axis, and <Q>it is the mattermagnetic field that is the thing the top pushes against</Q> (<Pg n={80}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '8-1', page: 70, section: 'Descartes’s Vortices', title: 'Vortices: Descartes’s, and much smaller ones',
      caption: 'An illustration of vortices by Descartes from his Principia Philosophiae written in1644.',
      Diagram: Vortices,
      text: <p>Descartes concluded that orbital motion had to be due to vortices, very large ones with the planets riding along their edges. Newton debunked them. But after seeing how magnetism works in Maxwell’s terms, the theory <Q>does not seem quite so laughable, at least not when one presumes they are innumerable and small molecular vortices, or as we have now come to know them as rotating zepton dipoles</Q> (<Pg n={71}/>).</p>,
      tryThis: ['Start with a few great vortices, each carrying bodies round its centre, as Descartes drew them.', 'Raise the number until they become too small to carry anything: each is now drawn as a rotating zepton.'],
      notes: <p>Descartes’s engraving has vortices of irregular shape; a regular grid is drawn here, with neighbours turning opposite ways so they mesh. That is a display choice.</p>,
    },
    {
      kind: 'figure', id: '8-2', page: 71, section: 'Tops and Torques', title: 'A top that is not spinning falls',
      caption: 'A stationary top with the center of mass shown as a dot, the force of gravity a straight solid line arrow, and the falling motion shown by a dashed line arrow',
      Diagram: FallingTop,
      text: <p><Q>If we visualize a top when it is not spinning, and stand it on its tip, it will fall over in one direction. There is a point-to-point force, gravity, between the center of mass of the top and the center of mass of the Earth and it will follow that line</Q> (<Pg n={71}/>).</p>,
      tryThis: ['Press “Release the top” and watch the centre of mass follow the dashed path to the surface.', 'Release it from nearly upright: it starts slowly and gathers speed as the lean grows.'],
      notes: <p>The fall is that of a rigid body pivoting on its tip, with the time scale chosen to be watchable.</p>,
    },
    {
      kind: 'figure', id: '8-3', page: 72, title: 'A spinning top precesses the way it spins',
      caption: 'A spinning top rotating clockwise as viewed from above with the center of mass shown as a dot, the force of gravity is straight down, but the top precesses around the point where the tip meets the surface instead of falling straight down. The precession is also in a clockwise direction.',
      Diagram: PrecessingTop,
      text: <>
        <p><Q>If the top spins one direction, it precesses in that direction and if the top is spun the opposite direction, it processes in the new direction.</Q> Fleming asks what holds it up: not air, not electromagnetism. <Q>A force must be applied to the top continuously by some means, a very strong force</Q> (<Pg n={72}/>).</p>
        <p>His account comes at the end of the chapter. A clockwise top produces a mattermagnetic field <Q>directed downward along its axis of rotation</Q>. Gravity gives the off-balance top a velocity toward Earth, and <Q>This produces a Lorentz Force, F<sub>m</sub> = m (υ x B<sub>m</sub>). Since the force is a result of a cross product, the movement of the top is perpendicular to the motion due to the gravitational acceleration</Q> (<Pg n={80}/>).</p>
      </>,
      tryThis: ['Reverse the spin: the precession reverses with it.', 'Spin it faster. It precesses more slowly, as Equation 8-5 requires for the same torque and a larger L.', 'Turn on the mattermagnetic account to see the three things Fleming’s force is built from, and that the force lies along the circle.'],
      notes: <>
        <p>Fleming gives the force as <V>m</V>(<V>υ</V> × <V>B</V><sub>m</sub>) and says it is at 90 degrees to gravity’s acceleration; he does not work through its sign. Taken literally with the field and velocity as he describes them (the field down the axis, toward the tip, for a clockwise top, and the velocity downward), the cross product points the other way round the circle from the precession he describes, for either sense of spin. The force arrow is drawn the way he says the top precesses, and the sign is left as he leaves it.</p>
        <p>The top is not shown slowing down and falling.</p>
      </>,
    },
    {
      kind: 'figure', id: '8-4', page: 74, title: 'The right hand rule again: torque and angular momentum',
      caption: 'Placement of fingers for right hand rule memory device.',
      Diagram: () => <HandRule first={{ name: 'distance r', tone: 'mark', start: '+x' }} second={{ name: 'force F', tone: 'force', start: '-y' }} thumb={{ name: 'torque Γ', tone: 'accent' }} remark="Torque is r × F (Equation 8-2). Put momentum mυ on the second finger in place of force and the thumb is the angular momentum L = r × mυ (Equation 8-3)."/>,
      text: <>
        <p>Torque is a cross product, Γ = <V>r</V> × <V>F</V> (Equation 8-2): <Q>the force F, points in the direction of the second finger, the first term of the cross product r points in the direction of the first finger, and the thumb points in the direction of the resultant torque</Q> (<Pg n={73}/>).</p>
        <p>Angular momentum has the same form, <V>L</V> = <V>r</V> × <V>mυ</V> (Equation 8-3). <Q>For a top spinning clockwise the angular momentum vector L points downward, while if a top is spinning counter-clockwise the angular momentum vector L is pointing up</Q> (<Pg n={74}/>).</p>
      </>,
      tryThis: ['As it starts, r points right and the force (gravity) points down: the torque points away from you, into the page.', 'Swap the two fingers’ directions and the torque reverses.', 'Point both along one line: no torque.'],
    },
    {
      kind: 'figure', id: '8-5', page: 75, title: 'The torque of gravity on a leaning top',
      caption: 'A spinning top showing the acceleration due to gravity and the angle between the top’s axis of rotation and the perpendicular.',
      Diagram: TopTorque,
      text: <>
        <p>Gravity produces a torque proportional to the mass, to <V>g</V>, and to the distance between the tip and the point on the surface below the centre of mass, which is <V>r</V> sin α (<Pg n={74}/>):</p>
        <Eq n="8-4">τ = <V>m</V><V>g</V><V>r</V> sin α</Eq>
        <p>The precession follows from another cross product, τ = ω<sub>p</sub> × <V>L</V> (Equation 8-5). <Q>Really, is that all we get for an explanation?</Q> It works mathematically, <Q>but it still begs the question, if there is an equal and opposite reaction related to this force, what is the top pushing against in order to stay upright?</Q> (<Pg n={75}/>).</p>
      </>,
      tryThis: ['Lean the top further: the lever arm r sin α lengthens and the torque grows.', 'Raise the spin: the precession slows.', 'Change the mass: torque and angular momentum both follow it, and the precession rate does not change.'],
      notes: <p>The readouts use Equations 8-4 and 8-5 with <V>g</V> = 9.81 m/s². The top’s moment of inertia is taken as that of a disc of radius 3 cm, which Fleming does not specify.</p>,
    },
    {
      kind: 'figure', id: '8-6', page: 78, section: 'A Different Explanation?!', title: 'The field of a moving charge, and of moving matter',
      caption: 'A positive charge moving upward produces a magnetic field measured as indicated by the distance vector r. The magnetic field B points into the page on the right side of the moving charge.',
      Diagram: MovingSourceField,
      text: <>
        <p>The field of a moving point charge is a form of the Biot-Savart law (<Pg n={77}/>, <Pg n={78}/>):</p>
        <Eq n="8-11"><V>B</V> = <Frac top={<>μ<sub>0</sub><V>q</V><V>υ</V></>} bottom={<>4π<V>r</V>²</>}/> sin α</Eq>
        <p>Fleming writes the same law for matter. <Q>Moving matter produces a magnetic field, spinning zepton dipoles</Q>; the field increases with the amount of matter and with its velocity, so it <Q>is also proportional to the momentum</Q> (<Pg n={77}/>). For a body far enough away to be a point:</p>
        <Eq n="8-13"><V>B</V><sub>m</sub> = <Frac top={<>μ<sub>0m</sub><V>m</V></>} bottom="4π"/> <Frac top={<><V>υ</V> × r̂</>} bottom={<><V>r</V>²</>}/></Eq>
        <p>where μ<sub>0m</sub> is <Q>the matter permeability of the vacuum</Q> and <V>m</V> a quantity of matter charge, both still to be determined at this point in the book.</p>
      </>,
      tryThis: ['Drag the measuring point to the right of the motion: B is into the page. To the left: out of it.', 'Move it straight ahead of the charge: α is zero and so is the field.', 'Switch to matter. Nothing in the geometry changes; the source is now momentum mυ.'],
      notes: <p>The strength is relative: it uses sin α / <V>r</V>² and the velocity, and leaves out the constants. Fleming gives no value for μ<sub>0m</sub> in this chapter.</p>,
      labs: [{ lab: 'electron', scenario: 'moving', query: 'L=+magnetic', why: 'The motion field of a moving electron as rotating pairs.' }],
    },
  ],
};
export default chapter;
