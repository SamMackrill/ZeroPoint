// Chapter 20: The Origin of the Speed of Light (PDF pp. 151–152). No figures: two explorers.
import { useMemo, useState } from 'react';
import { Arrow, Diagram, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, Still, T, Zepton, clamp, deg, fmt, rad, rng, usePlayback } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;

/** The rate at which a zepton turns against the drag of its neighbours, relative to free space, for a relative torque. */
export const turnRate = (torque: number) => 1 / torque;

/** Explorer: a rotating zepton and the neighbours it has to turn. More drag, slower rotation, slower light. */
function Torque() {
  const [torque, setTorque] = useState(1);
  const play = usePlayback();
  const H = 360, cx = 300, cy = 180, rate = turnRate(torque), angle = play.t * 200 * rate;
  const ring = useMemo(() => { const random = rng(201); return Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * 360 + random() * 12, r: 92 + (i % 2) * 44, lag: 20 + random() * 50 })); }, []);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A rotating zepton at the centre and the zeptons round it that it sets turning. With a London-van der Waals torque of ${fmt(torque, 2)} times that of free space it turns at ${Math.round(rate * 100)} per cent of its free-space rate, and light travels at ${Math.round(rate * 100)} per cent of c.`}>
      {ring.map((z, i) => { const x = cx + z.r * Math.cos(rad(z.a)), y = cy - z.r * Math.sin(rad(z.a)); return <g key={i}>
        <line x1={cx} y1={cy} x2={x} y2={y} className="bk-s-faint" strokeDasharray="2 5" opacity={0.3 + 0.4 * clamp(torque / 2.4)}/>
        <Zepton x={x} y={y} angle={(i % 2 ? -1 : 1) * (angle - z.lag) * (z.r > 100 ? 0.45 : 0.75)} len={24} oval={false} signs={false} opacity={0.5 + 0.4 * clamp(torque / 2.4)}/>
      </g>; })}
      <Zepton x={cx} y={cy} angle={angle} len={62} emphasis="key" signs/>
      <Still><Spin x={cx} y={cy} r={46} ccw sweep={60 + 220 * rate}/></Still>
      <rect x={560} y={70} width={30} height={220} className="bk-fill-soft"/><rect x={560} y={290 - 220 * rate} width={30} height={220 * rate} className="bk-f-accent"/>
      <T x={575} y={312} size="sm" tone="accent">speed of light</T><T x={604} y={290 - 220 * rate + 5} anchor="start" tone="accent">{fmt(rate, 3)} c₀</T>
      {torque < 0.3 && <T x={cx} y={30} tone="danger" size="sm">with almost no field to resist it, a zepton would rotate almost without limit</T>}
    </Stage>}>
    <Slider label="London-van der Waals torque" value={torque} min={0.2} max={2.4} step={0.02} onChange={setTorque} show={v => (Math.abs(v - 1) < 0.011 ? 'free space' : `${fmt(v, 3)} × free space`)}/>
    <PlayBar play={play} label="the rotation"/>
    <Readout label="Rate of rotation" value={`${fmt(rate, 3)} ×`}/>
    <Readout label="Speed of light" value={`${fmt(rate, 3)} c₀`} tone="good"/>
    <Remark>{Math.abs(torque - 1) < 0.011 ? 'In free space the zeptons are uniformly spread, the torque is constant, and so is the speed of light.' : torque > 1 ? 'Matter adds to the drag: the vacuum fluctuations respond to both the matter and the photon.' : 'Less drag, faster rotation. With no zero-point field at all a single zepton would rotate infinitely fast.'}</Remark>
  </Diagram>;
}

/** Common transparent media and the fraction of c at which light travels in them. */
const MEDIA = [{ name: 'vacuum', n: 1 }, { name: 'water', n: 1.333 }, { name: 'typical glass', n: 1.515 }, { name: 'diamond', n: 2.417 }];

/** The angle of the refracted ray from the normal, in degrees, for an angle of incidence and a refractive index (Snell's law). */
export const refractedAngle = (incidence: number, n: number) => deg(Math.asin(Math.sin(rad(incidence)) / n));

/** Explorer: light entering a medium where the torque is greater slows down and is turned. */
function Refraction() {
  const [n, setN] = useState(1.515);
  const [incidence, setIncidence] = useState(45);
  const play = usePlayback({ speed: 0.45 });
  const H = 380, bx = 360, by = 190, inside = refractedAngle(incidence, n), speed = 1 / n, named = MEDIA.find(m => Math.abs(m.n - n) < 0.012);
  const ai = rad(incidence), ar = rad(inside), up = 190 / Math.cos(ai), down = 180 / Math.cos(ar);
  // Marks along the ray one wavelength apart: closer together in the medium, where the same frequency travels more slowly.
  const marks = (len: number, spacing: number, dir: [number, number], from: [number, number], phase: number) => Array.from({ length: Math.ceil(len / spacing) + 1 }, (_, i) => (i + phase) * spacing).filter(s => s < len).map(s => [from[0] + dir[0] * s, from[1] + dir[1] * s] as const);
  const p = play.t % 1, inDir: [number, number] = [Math.sin(ai), Math.cos(ai)], outDir: [number, number] = [Math.sin(ar), Math.cos(ar)], start: [number, number] = [bx - inDir[0] * up, by - inDir[1] * up];
  return <Diagram stage={
    <Stage w={W} h={H} label={`A ray of light entering ${named ? named.name : 'a medium'} at ${incidence} degrees from the normal. Inside, light travels at ${Math.round(speed * 100)} per cent of its speed in a vacuum and the ray is turned to ${fmt(inside, 3)} degrees.`}>
      <rect x={30} y={by} width={W - 60} height={H - by - 16} className="bk-fill-panel"/><line x1={30} y1={by} x2={W - 30} y2={by} className="bk-s-text" strokeWidth="2"/>
      <line x1={bx} y1={30} x2={bx} y2={H - 20} className="bk-s-faint" strokeDasharray="3 5"/>
      <Line d={`M${start[0]} ${start[1]} L${bx} ${by} L${bx + outDir[0] * down} ${by + outDir[1] * down}`} tone="e" w={2}/>
      {marks(up, 44, inDir, start, p).map(([x, y], i) => <circle key={`a${i}`} cx={x} cy={y} r={5} className="bk-f-mark"/>)}
      {marks(down, 44 * speed, outDir, [bx, by], p).map(([x, y], i) => <circle key={`b${i}`} cx={x} cy={y} r={5} className="bk-f-mark"/>)}
      {n > 1.01 && <Spin x={bx} y={by} r={26} ccw={false} from={90 + incidence} sweep={Math.max(8, (incidence - inside) * 2.2)} tone="text" w={2.4}/>}
      <T x={60} y={by - 12} anchor="start" size="sm">vacuum: c₀</T><T x={60} y={by + 24} anchor="start" size="sm">{named ? named.name : 'medium'}: {fmt(speed, 3)} c₀</T>
      <T x={bx + 60} y={H - 34} anchor="start" size="sm" tone="mark">● one wavelength apart</T>
    </Stage>}>
    <Slider label="Torque in the medium (refractive index)" value={n} min={1} max={2.42} step={0.005} onChange={setN} show={v => `${fmt(v, 4)}${named ? ` (${named.name})` : ''}`}/>
    <Slider label="Angle at which the light arrives" value={incidence} min={0} max={80} step={1} onChange={setIncidence} unit="°"/>
    <PlayBar play={play} label="the light"/>
    <Readout label="Speed in the medium" value={`${fmt(speed * 100, 3)} % of c₀`} tone="good"/>
    <Readout label="Turned by" value={`${fmt(incidence - inside, 3)}°`} tone="force"/>
    <Remark>{n < 1.01 ? 'No matter, no extra torque: the light goes straight on at c₀.' : 'In a typical glass the speed of light may be only 66% of its usual value. The torque that slows it is also the torque that turns it.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 20,
  summary: <>
    <p>Chapter 19 put the speed of light down to the time a zepton takes to make its half-turn. This chapter asks what sets that time. A rotating zepton makes its neighbours rotate, and that costs energy: <Q>The zero-point field’s resistance to rotation produces a drag on the rotating central zepton of the photon preventing it from rotating faster</Q>. Fleming calls it a <strong>London-van der Waals torque</strong> (<Pg n={151}/>).</p>
    <p>So <Q>The speed of light is not a fundamental constant; the torque due to the zero-point vacuum fluctuations is what is fundamental and constant in a vacuum in free space</Q>. In matter the torque is greater, and light is slower (<Pg n={152}/>).</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x20-1', page: 151, section: 'London-Van der Waals Torque', title: 'What holds a zepton’s rotation back',
      Diagram: Torque,
      text: <>
        <p><Q>It takes energy to induce rotation in the other zepton dipoles.</Q> <Q>Conversely, if there were no zero-point field, a single zepton would rotate infinitely fast. The zero-point field induces a torque on rotating zeptons slowing them down, ultimately to a degree that equates to the speed of light</Q> (<Pg n={151}/>).</p>
        <p>The same torque limits matter: <Q>Matter is accompanied by rotating zeptons that form an inertial field that is rotating, with the rate of rotation limited by the London-van der Waals torque of the vacuum.</Q></p>
      </>,
      tryThis: ['At “free space” the central zepton turns at its ordinary rate and light has its ordinary speed.', 'Raise the torque: the zepton turns more slowly, and the speed of light falls with it.', 'Lower it toward nothing: the rotation, and the speed, climb without limit.'],
      notes: <p>Fleming says the speed of light is derived from the torque and should be derivable from first principles, but gives no formula. Taking the rate of rotation as inversely proportional to the torque is a display choice, as are the neighbours’ lag and their number.</p>,
      labs: [{ lab: 'light', scenario: 'induction', why: 'The central pair of a photon and the background pairs that respond to it.' }],
    },
    {
      kind: 'explorer', id: 'x20-2', page: 152, title: 'Slower in glass, and turned',
      Diagram: Refraction,
      text: <>
        <p>Why light slows in glass has, Fleming says, no reasonable account: the photon is said to be absorbed and re-emitted, <Q>the catch-and-release model</Q>, which <Q>is not in keeping with standard physics of photon interactions</Q> (<Pg n={152}/>).</p>
        <p><Q>According to the London-van der Waals torque model, the amount of torque increases in the presence of matter since the vacuum fluctuations respond to both the matter and the photon, making for a greater amount of drag on the photon’s central zepton rotation. The London-van der Waals torque also directly converts to a real measurable torque as seen in the refraction, or bending, of the light as it enters glass, water, or other matter medium.</Q></p>
      </>,
      tryThis: ['Set the medium to typical glass and read the speed: 66 % of its value in a vacuum, the figure in the text.', 'Watch the marks cross the surface: they bunch up inside, where the light is slower.', 'Send the light in straight (0°): it slows but is not turned. Tilt it and the turn grows.'],
      notes: <p>The bending is Snell’s law for the ratio of speeds, which is the measured behaviour the text refers to; the refractive index stands for the relative torque. The curved arrow at the surface marks the turn and is not a computed torque.</p>,
    },
  ],
};
export default chapter;
