// Chapter 22: Relativity is Not Special (PDF pp. 162–175). Figures 22-1 to 22-3.
import { useRef, useState } from 'react';
import { Arrow, Diagram, Drag, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, Still, T, clamp, fmt, pathThrough, polar, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;

/** The speed of light relative to a frame moving at V through the zero-point field, outward and on the way back (Equations 22-6 and 22-7), in units of c₀. */
export const lightFromFrame = (V: number) => ({ forward: 1 - V, back: 1 + V, average: 1 });

/** Figure 22-1: a photon emitted from a frame that moves through the zero-point field. */
function MovingFrameLight() {
  const [V, setV] = useState(0.3);
  const play = usePlayback({ speed: 0.3 });
  const H = 340, x0 = 70, L = 520, y1 = 110, y2 = 230, u = play.t % 1, speeds = lightFromFrame(V);
  // In the zero-point field's frame the photon goes at c₀ and frame A at V. The photon reaches the far wall when u = 1.
  const photon = x0 + L * u, frame = x0 + L * V * u;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A photon in the zero-point field's rest frame, moving at c₀, and a frame A moving at ${fmt(V, 2)} c₀. Relative to A the photon moves at ${fmt(speeds.forward, 3)} c₀ going out and ${fmt(speeds.back, 3)} c₀ coming back.`}>
      <line x1={x0} y1={50} x2={x0} y2={H - 50} className="bk-s-muted" strokeWidth="5"/><line x1={x0 + L} y1={50} x2={x0 + L} y2={H - 50} className="bk-s-muted" strokeWidth="5"/>
      <line x1={frame} y1={60} x2={frame} y2={170} className="bk-s-mark" strokeWidth="5"/><T x={frame} y={48} tone="mark" size="lg">A</T>
      <Arrow x1={x0} y1={y1} x2={frame} y2={y1} tone="mark" w={2.4}/><T x={(x0 + frame) / 2} y={y1 + 22} tone="mark" italic>V</T>
      <Arrow x1={frame} y1={y1} x2={photon} y2={y1} tone="e" w={2.4}/><T x={(frame + photon) / 2} y={y1 - 12} tone="e" size="sm">c′ = c₀ − V</T>
      <Arrow x1={x0} y1={y2} x2={photon} y2={y2} tone="text" w={2.4}/><T x={(x0 + photon) / 2} y={y2 + 24} tone="text" size="sm">c = c₀</T>
      <circle cx={photon} cy={y1} r={6} className="bk-f-e"/><circle cx={photon} cy={y2} r={6} className="bk-f-text"/>
      <T x={W / 2} y={H - 14} size="sm">both drawn in the zero-point field’s rest frame, over the same time</T>
    </Stage>}>
    <Slider label="Velocity of frame A, V" value={V} min={0} max={0.9} step={0.01} onChange={setV} show={v => `${fmt(v, 2)} c₀`}/>
    <PlayBar play={play} label="the photon"/>
    <Readout label="Light relative to A, going out" value={`${fmt(speeds.forward, 3)} c₀`} tone="e"/>
    <Readout label="Reflected, coming back" value={`${fmt(speeds.back, 3)} c₀`} tone="e"/>
    <Readout label="Average of the two" value="c₀" tone="good"/>
    <Readout label="Zepton rotation already used" value={`${fmt(180 * V, 3)}° of 180°`}/>
    <Remark>The average two-way velocity of light in a round trip is c₀. That is different from saying the speed of light is the same for every observer.</Remark>
  </Diagram>;
}

/** The wavelength of light emitted forward from a frame moving at V, relative to its wavelength in the zero-point field's frame (Figure 22-2). */
export const emittedWavelength = (V: number) => 1 - V;

/**
 * Figure 22-2: the wavelength of light from a moving source, shortened by the distance the source moves. Over each period
 * frame A moves from the left wall a distance λ₀V/c₀, while the light's front goes the whole wavelength λ₀ at c₀; so the
 * light from A fits one shortened wavelength, λ′, between A and the far wall, and the light at rest a whole λ₀.
 */
function WavelengthContraction() {
  const [V, setV] = useState(0.3);
  const play = usePlayback({ speed: 0.35 });
  const H = 340, x0 = 70, L = 560, y1 = 110, y2 = 240, ratio = emittedWavelength(V), xEnd = x0 + L * V;
  // One period, then a moment's hold showing the finished picture, then the next period from the left wall.
  // Before it has ever played (as with reduced motion, which starts paused) the figure shows the finished construction;
  // paused partway through a period, it shows that moment.
  const cycle = 1.4, u = !play.playing && play.t === 0 ? 1 : Math.min(1, (play.t % cycle) / 1), front = x0 + L * u, xa = x0 + L * V * u;
  /** A wave of spatial period `period` from `from` to the light's front, its crest pinned to the front so it is emitted, not slid. */
  const wave = (from: number, period: number, y: number) => from >= front - 1 ? '' : pathThrough(Array.from({ length: 81 }, (_, i) => { const x = from + ((front - from) * i) / 80; return [x, y - 22 * Math.sin((2 * Math.PI * (front - x)) / period)] as const; }));
  return <Diagram stage={
    <Stage w={W} h={H} label={`One wavelength of light in the zero-point field's rest frame, and above it light from frame A, which moves at ${fmt(V, 2)} c₀. In one period A moves ${fmt(V, 2)} of a wavelength, so its light holds one wavelength ${fmt(ratio, 3)} times as long.`}>
      <line x1={x0} y1={50} x2={x0} y2={H - 40} className="bk-s-muted" strokeWidth="5"/><line x1={x0 + L} y1={50} x2={x0 + L} y2={H - 40} className="bk-s-muted" strokeWidth="5"/>
      {/* Where A will be after one period: drag it to set the velocity. */}
      <Drag x={xEnd} y={115} onMove={nx => setV(Math.round(clamp((nx - x0) / L, 0, 0.8) * 100) / 100)} bounds={{ x0, y0: 115, x1: x0 + 0.8 * L, y1: 115 }} label="Where frame A is after one period" step={L * 0.02}>
        <line x1={xEnd} y1={60} x2={xEnd} y2={170} className="bk-s-mark" strokeWidth="3" strokeDasharray="4 4" opacity={0.6}/>
      </Drag>
      <line x1={xa} y1={60} x2={xa} y2={170} className="bk-s-mark" strokeWidth="5"/><T x={xa} y={48} tone="mark" size="lg">A</T>
      {u < 1 && <Arrow x1={xa + 6} y1={44} x2={xa + 34} y2={44} tone="motion" w={2}/>}
      {u >= 1 && V > 0.03 && <><Arrow x1={x0} y1={y1 + 50} x2={xEnd} y2={y1 + 50} both tone="mark" w={1.6} head={7}/><T x={(x0 + xEnd) / 2} y={y1 + 72} tone="mark" size="sm">λ₀V/c₀</T></>}
      <Line d={wave(xa, L * ratio, y1)} tone="e" w={2}/>
      {u >= 1 && <><Arrow x1={xEnd} y1={y1 + 50} x2={x0 + L} y2={y1 + 50} both tone="e" w={1.6} head={7}/><T x={(xEnd + x0 + L) / 2} y={y1 + 72} tone="e" size="sm">λ′ = λ₀ − λ₀V/c₀</T></>}
      <Line d={wave(x0, L, y2)} tone="text" w={2}/>
      {u >= 1 && <><Arrow x1={x0} y1={y2 + 44} x2={x0 + L} y2={y2 + 44} both tone="text" w={1.6} head={7}/><T x={x0 + L / 2} y={y2 + 66} tone="text" size="sm">λ = λ₀</T></>}
    </Stage>}>
    <Slider label="Velocity of frame A, V" value={V} min={0} max={0.8} step={0.01} onChange={setV} show={v => `${fmt(v, 2)} c₀`}/>
    <PlayBar play={play} label="frame A and its light"/>
    <Readout label="Distance A moves in one period" value={`${fmt(V, 2)} λ₀`}/>
    <Readout label="Wavelength from A, λ′" value={`${fmt(ratio, 3)} λ₀`} tone="e"/>
    <Readout label="Frequency, by a clock at rest in the field" value="unchanged"/>
    <Readout label="Frequency, by A’s own clock" value={`${fmt(1 / ratio, 3)} ×`}/>
    <Readout label="Speed A measures: its f × λ′" value="c₀" tone="good"/>
    <Remark>Each wave holds one wavelength. A’s clocks run slow, so A counts a higher frequency, and the product comes back to c₀.</Remark>
  </Diagram>;
}

/** When two photons sent opposite ways round a body of circumference 1 meet the emitter again, in units of the time light takes to go round, for a rim speed v (in units of c). */
export const sagnacTimes = (v: number) => ({ against: 1 / (1 + v), with: 1 / (1 - v) });

/** Figure 22-3: the Sagnac effect. The photon sent against the rotation meets the emitter first. */
function Sagnac() {
  const [v, setV] = useState(0.25);
  const play = usePlayback({ speed: 0.22 });
  const H = 400, cx = 280, cy = 200, R = 108, times = sagnacTimes(v), span = times.with * 1.12, t = (play.t % 1) * span;
  // Angles in turns: the emitter goes round at v, each photon at 1, in the frame that does not rotate.
  const emitter = v * t, pWith = Math.min(t, times.with), pAgainst = -Math.min(t, times.against);
  const at = (turns: number, r: number) => polar(cx, cy, r, turns * 360);
  const arc = (to: number, r: number) => pathThrough(Array.from({ length: 60 }, (_, i) => at((to * i) / 59, r)));
  return <Diagram stage={
    <Stage w={W} h={H} label={`A sphere rotating with a rim speed of ${fmt(v, 2)} of the speed of light, and an emitter on its surface that sends one photon each way round. The photon sent against the rotation is detected after ${fmt(times.against, 3)} of the time light takes to go round, and the other after ${fmt(times.with, 3)}.`}>
      <circle cx={cx} cy={cy} r={R} className="bk-body bk-body-plain"/>
      <Still>{v > 0.01 && <Spin x={cx} y={cy} r={22} ccw sweep={250} tone="text" w={2.4}/>}<T x={cx + 30} y={cy - 18} tone="text" italic>ω</T></Still>
      <Line d={arc(pWith, R + 34)} tone="text" w={2}/><Line d={arc(pAgainst, R + 18)} tone="muted" w={2}/>
      <circle cx={at(pWith, R + 34)[0]} cy={at(pWith, R + 34)[1]} r={6} className="bk-f-text"/>
      <circle cx={at(pAgainst, R + 18)[0]} cy={at(pAgainst, R + 18)[1]} r={6} className="bk-f-mark"/>
      <circle cx={at(emitter, R)[0]} cy={at(emitter, R)[1]} r={8} className="bk-f-accent"/>
      <T x={560} y={90} anchor="start" size="sm" tone="accent">● emitter and detector</T>
      <T x={560} y={114} anchor="start" size="sm" tone="mark">● sent against the rotation</T><T x={560} y={132} anchor="start" size="sm" tone="mark">{t >= times.against ? 'detected' : 'on its way'}</T>
      <T x={560} y={160} anchor="start" size="sm" tone="text">● sent with the rotation</T><T x={560} y={178} anchor="start" size="sm" tone="text">{t >= times.with ? 'detected' : 'on its way'}</T>
    </Stage>}>
    <Slider label="Speed of the surface, υ" value={v} min={0} max={0.6} step={0.01} onChange={setV} show={x => `${fmt(x, 2)} c`}/>
    <PlayBar play={play} label="the photons"/>
    <Readout label="Against the rotation: detected at" value={fmt(times.against, 4)}/>
    <Readout label="With the rotation: detected at" value={fmt(times.with, 4)}/>
    <Readout label="Apparent speeds from the surface" value={`${fmt(1 + v, 3)} c and ${fmt(1 - v, 3)} c`} tone="e"/>
    <Remark>{v < 0.01 ? 'With no rotation the two photons return together.' : 'The speed of the photons does not change; one really does travel a shorter distance than the other.'}</Remark>
  </Diagram>;
}

/** The energy of matter moving at v relative to the zero-point field's rest frame, relative to its rest energy (Equation 22-13). */
export const energyFactor = (v: number) => 1 / Math.sqrt(1 - v * v);

/** Explorer: a clock moving through the zero-point field gains energy and runs slow (Equations 22-13 and 22-15). */
function MovingClock() {
  const [v, setV] = useState(0.6);
  const play = usePlayback();
  const state = useRef({ t: 0, rest: 0, moving: 0 });
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t)), gamma = energyFactor(v);
  if (play.t < state.current.t) { state.current.rest = 0; state.current.moving = 0; }
  state.current.t = play.t; state.current.rest += dt * 90; state.current.moving += (dt * 90) / gamma;
  const H = 320, clock = (x: number, angle: number, label: string, tone: 'text' | 'mark') => <g>
    <circle cx={x} cy={150} r={70} className="bk-body bk-body-plain"/>
    {Array.from({ length: 12 }, (_, i) => <line key={i} x1={polar(x, 150, 60, i * 30)[0]} y1={polar(x, 150, 60, i * 30)[1]} x2={polar(x, 150, 68, i * 30)[0]} y2={polar(x, 150, 68, i * 30)[1]} className="bk-s-muted"/>)}
    <line x1={x} y1={150} x2={polar(x, 150, 54, 90 - angle)[0]} y2={polar(x, 150, 54, 90 - angle)[1]} className={`bk-s-${tone}`} strokeWidth="3" strokeLinecap="round"/>
    <text x={x} y={252} textAnchor="middle" className="bk-t bk-t-sm bk-f-muted">{label}</text>
  </g>;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two clocks: one at rest in the zero-point field, one moving through it at ${fmt(v, 2)} c₀. The moving clock has ${fmt(gamma, 3)} times the energy and runs at ${fmt(1 / gamma, 3)} of the rate.`}>
      {clock(190, state.current.rest, 'at rest in the zero-point field', 'text')}
      {clock(470, state.current.moving, `moving at ${fmt(v, 2)} c₀`, 'mark')}
      <Arrow x1={560} y1={150} x2={560 + 90 * v} y2={150} tone="motion" w={3}/>
    </Stage>}>
    <Slider label="Velocity of the clock" value={v} min={0} max={0.98} step={0.01} onChange={setV} show={x => `${fmt(x, 2)} c₀`}/>
    <PlayBar play={play} label="the clocks"/>
    <Readout label="Energy, E′/E₀" value={`${fmt(gamma, 4)} ×`} tone="force"/>
    <Readout label="Rate of the moving clock" value={`${fmt(1 / gamma, 4)} ×`} tone="bad"/>
    <Remark>This is not a time dilation of space: it is a change in clock rate, due to the change in energy of the matter the clock is made from.</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 22,
  summary: <>
    <p>If light is made of the æther, its frame of reference is the æther. <Q>The zero-point field is light’s frame of reference</Q>, and that frame is one fixed frame, for which Fleming’s candidate is the rest frame of the cosmic background radiation (<Pg n={163}/>). Space itself is flat and transforms in the plain Galilean way; it does not contract and has no clock.</p>
    <p>What changes with motion is light and matter. A photon emitted from a moving frame travels at <V>c</V><sub>0</sub> through the field, so relative to its source it is slower one way and faster the other, averaging <V>c</V><sub>0</sub> over a round trip. Its wavelength is contracted, and the clocks of the moving frame run slow because moving matter has more energy (<Pg n={166}/>, <Pg n={172}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '22-1', page: 166, section: 'Frame Transformations of Light', title: 'Light from a moving frame',
      caption: 'The lower arrow is a photon moving relative to the zero-point field rest frame at the speed of light c₀ and the upper arrow is a photon emitted from rest frame A moving at velocity V with respect to the zero-point field rest frame.',
      Diagram: MovingFrameLight,
      text: <>
        <p><Q>The speed of light is transmitted in the zero-point field rest frame, regardless of what frame it is emitted from.</Q> In a frame moving at <V>V</V> through the field (<Pg n={165}/>):</p>
        <Eq n="22-6"><V>c</V>′ = <V>c</V><sub>0</sub> − <V>V</V></Eq>
        <p>The zeptons account for it: having to reflect a frame moving at <V>V</V>, <Q>they will have rotated by an average amount of 180 x V/c<sub>0</sub> degrees. The remaining amount of rotation they have left is 180 x (c<sub>0</sub>-V)/c<sub>0</sub> degrees</Q>. Reflected back, the light has the frame’s velocity added. <Q>The average two-way velocity of light in a roundtrip is c<sub>0</sub></Q>, which matches observation because nearly all our experiments are round trips (<Pg n={166}/>, <Pg n={167}/>).</p>
      </>,
      tryThis: ['Watch the upper arrow: the photon and frame A leave together, and the gap between them opens at c₀ − V.', 'Raise V: the outward speed relative to A falls and the return speed rises by the same amount.', 'Set V to zero: A is at rest in the field and sees c₀ both ways.'],
      notes: <p>The readouts are Equations 22-6 and 22-7, which the text gives for low velocities. The average is the mean of the two speeds, as the text takes it.</p>,
    },
    {
      kind: 'figure', id: '22-2', page: 167, title: 'A shorter wavelength, not a shorter space',
      caption: 'The lower double arrow is a wavelength in the zero-point field rest frame at c₀ and the upper arrow is a photon emitted from rest frame A moving at velocity V with respect to the zero-point field rest frame.',
      Diagram: WavelengthContraction,
      text: <>
        <p>Let the outer walls be one wavelength apart in the field’s rest frame. Frame A <Q>moves a distance that equates to the wavelength times the ratio of V/c<sub>0</sub>. The wavelength of light emitted from a source on the moving rest frame is then shortened by that amount</Q> (<Pg n={167}/>).</p>
        <p>Seen from the field’s frame the frequency is the same for both photons: <Q>there are an identical number of wavelengths in the two photons</Q>. The observer on A measures <V>c</V><sub>0</sub> all the same, <Q>because the clocks in his frame of reference run slow, making the frequency appear higher</Q>. <Q>This is in no way saying that the time of space is running slow</Q>; <Q>it is purely clock slowing</Q> (<Pg n={168}/>).</p>
      </>,
      tryThis: ['Watch a period: A moves on while its light goes out at c₀, so the light from A ends up squeezed between A and the far wall.', 'Drag the dashed marker, where A is after one period, or raise V: the upper wave is squeezed into what is left of the distance, and still holds exactly one wavelength.', 'Read the two frequencies: unchanged by a clock at rest in the field, higher by A’s slow clock, by just enough to bring f × λ′ back to c₀.'],
      notes: <p>The text gives the ratio by which A’s frequency appears higher as <Q>c<sub>0</sub>/V</Q>. For the product of frequency and wavelength to come to <V>c</V><sub>0</sub>, as the same sentence says it does, the ratio must be <V>c</V><sub>0</sub>/(<V>c</V><sub>0</sub> − <V>V</V>), and that is what the readout uses.</p>,
    },
    {
      kind: 'figure', id: '22-3', page: 170, section: 'The Sagnac Effect', title: 'Round a rotating body, both ways',
      caption: 'The Sagnac Effect shown with a gray rotating sphere in the center with a light emitter at the surface represented by the black dot. It simultaneously emits two photons, one in the direction of rotation and one in the opposite direction. The photon sent in the opposite direction is detected back at the emitter first.',
      Diagram: Sagnac,
      text: <>
        <p><Q>The velocity of both photons is c with respect to the Earth non-rotating rest frame, but not with respect to the emitter/detector. As the sphere continues to rotate, the photon sent in the direction opposite from the rotation is detected first. From the perspective of the observer on the surface, it appears that this photon traveled at c + υ</Q>; the other <Q>appears to travel at the velocity c - υ</Q>, <Q>and so it arrives noticeably later</Q> (<Pg n={169}/>, <Pg n={170}/>).</p>
        <p>Fleming’s point is that the effect needs a standard frame, here the Earth’s non-rotating one, <Q>which Special Relativity does not allow for</Q>, and that it behaves <Q>in a manner consistent with the Galilean frame transformations at low velocities</Q>.</p>
      </>,
      tryThis: ['Run it: both photons go round at the same speed, but the emitter moves to meet one and away from the other.', 'Raise the speed of the surface and the two arrival times separate further.', 'Set it to zero: they arrive together.'],
      notes: <p>The surface speeds on the slider are enormous, so the effect can be seen in one circuit; the Earth’s equator moves at about 1.5 millionths of c. Times are in units of the time light takes to go once round.</p>,
    },
    {
      kind: 'explorer', id: 'x22-1', page: 171, section: 'Transformations of Energy, Mass, and Time', title: 'Why a moving clock runs slow',
      Diagram: MovingClock,
      text: <>
        <p>Matter moving through the field has its rest energy plus <Q>the total kinetic and inertial energy it gains due to the velocity of the reference frame</Q>. The transformation for energy, and with it for the rate of a physical clock, is (<Pg n={171}/>, <Pg n={172}/>):</p>
        <Eq n="22-13"><V>E</V>′ = <Frac top={<><V>E</V><sub>0</sub></>} bottom={<>√(1 − <V>υ</V>²/<V>c</V><sub>0</sub>²)</>}/></Eq>
        <Eq n="22-15">Δ<V>t</V><sub>0</sub> = <Frac top={<>Δ<V>t</V>′</>} bottom={<>√(1 − <V>υ</V>²/<V>c</V><sub>0</sub>²)</>}/></Eq>
        <p><Q>Time rate change is ultimately due to the change in energy of the matter that the clock is made from.</Q> A particle need not contract to gain energy: the wavelengths its shell excludes (chapter 16) are simply more energetic (<Pg n={172}/>, <Pg n={173}/>).</p>
      </>,
      tryThis: ['Let the two clocks run and compare their hands.', 'Raise the velocity toward c₀: the energy climbs without limit and the moving clock nearly stops.', 'At everyday speeds the two cannot be told apart, which is why first-order formulas serve for GPS.'],
    },
  ],
};
export default chapter;
