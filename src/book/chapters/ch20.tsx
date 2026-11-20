// Chapter 20: The Origin of the Speed of Light (PDF pp. 151–152). No figures: two explorers.
import { useMemo, useState } from 'react';
import { Arrow, Diagram, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, T, Zepton, bearing, clamp, deg, fmt, rad, rng, usePlayback } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';
import { TorqueLinks, linksBetween, wobbleAngle } from './shared';

const W = 720;

/** The rate at which a zepton turns against the drag of its neighbours, relative to free space, for a relative torque. */
export const turnRate = (torque: number) => 1 / torque;

/** The speedometer's top reading, in units of c₀ (the slider's least torque gives 5), and the sweep of its dial, as in a car's. */
const DIAL_MAX = 5, DIAL_FROM = 210, DIAL_SWEEP = 240;

/** The angle on the dial, in degrees anticlockwise from the right, of a reading in units of c₀. */
export const dialAngle = (v: number) => DIAL_FROM - DIAL_SWEEP * clamp(v / DIAL_MAX);

/** A car-style speedometer for the speed of light, centred on (x, y): a dial from 0 to 5 c₀, free space's 1 c₀ marked, and a needle. */
function Speedometer({ x, y, r, value }: { x: number; y: number; r: number; value: number }) {
  const at = (a: number, d: number) => [x + d * Math.cos(rad(a)), y - d * Math.sin(rad(a))] as const;
  const arc = (from: number, to: number, d: number) => { const [x1, y1] = at(from, d), [x2, y2] = at(to, d); return `M${x1} ${y1} A${d} ${d} 0 ${from - to > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
  const needle = dialAngle(value), [nx, ny] = at(needle, r - 16), ticks = Array.from({ length: 2 * DIAL_MAX + 1 }, (_, i) => i / 2);
  return <g>
    <circle cx={x} cy={y} r={r + 8} className="bk-fill-soft"/>
    <path d={arc(DIAL_FROM, DIAL_FROM - DIAL_SWEEP, r)} className="bk-s-faint" strokeWidth="6" fill="none"/>
    <path d={arc(DIAL_FROM, Math.min(DIAL_FROM - 0.5, needle), r)} className="bk-s-accent" strokeWidth="6" fill="none"/>
    {/* The needle under the numbers, so it never hides one, as on a car's dial. */}
    <line x1={x} y1={y} x2={nx} y2={ny} className="bk-s-danger" strokeWidth="3" strokeLinecap="round"/>
    {ticks.map(v => { const a = dialAngle(v), major = Number.isInteger(v), [x1, y1] = at(a, r - 5), [x2, y2] = at(a, r - (major ? 16 : 11)), [tx, ty] = at(a, r - 30);
      return <g key={v}><line x1={x1} y1={y1} x2={x2} y2={y2} className={v === 1 ? 'bk-s-accent' : 'bk-s-muted'} strokeWidth={major ? 2.4 : 1.2}/>
        {major && <T x={tx} y={ty + 5} size="sm" tone={v === 1 ? 'accent' : 'muted'}>{v}</T>}</g>; })}
    <circle cx={x} cy={y} r={7} className="bk-f-text"/>
    <T x={x} y={y + 40} tone="accent">{fmt(value, 3)} c₀</T>
    <T x={x} y={y + 62} size="sm">speed of light</T>
  </g>;
}

/** Explorer: a rotating zepton and the neighbours it has to turn. More drag, slower rotation, slower light. */
function Torque() {
  // The torque, and an offset to the zepton's angle that keeps it where it is when the torque changes: only its rate of turning changes.
  const [{ torque, offset }, setTurning] = useState({ torque: 1, offset: 0 });
  const play = usePlayback();
  const H = 360, cx = 300, cy = 180, rate = turnRate(torque), angle = offset + play.t * 200 * rate;
  const ring = useMemo(() => { const random = rng(201); return Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * 360 + random() * 12, r: 92 + (i % 2) * 44, lag: 20 + random() * 50 })); }, []);
  // The torque drawn as links between the zeptons it couples, the central one and its neighbours, plainer the greater it is.
  const links = useMemo(() => linksBetween([{ x: cx, y: cy }, ...ring.map(z => ({ x: cx + z.r * Math.cos(rad(z.a)), y: cy - z.r * Math.sin(rad(z.a)) }))], 100), [ring]);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A rotating zepton at the centre and the zeptons round it that it sets turning. With a London-van der Waals torque of ${fmt(torque, 2)} times that of free space it turns at ${Math.round(rate * 100)} per cent of its free-space rate, and light travels at ${Math.round(rate * 100)} per cent of c.`}>
      <TorqueLinks links={links} hold={() => (torque - 0.2) / 2.2}/>
      {ring.map((z, i) => { const x = cx + z.r * Math.cos(rad(z.a)), y = cy - z.r * Math.sin(rad(z.a)); return <g key={i}>
        <Zepton x={x} y={y} angle={(i % 2 ? -1 : 1) * (angle - z.lag) * (z.r > 100 ? 0.45 : 0.75)} len={24} oval={false} signs={false} opacity={0.5 + 0.4 * clamp(torque / 2.4)}/>
      </g>; })}
      <Zepton x={cx} y={cy} angle={angle} len={62} emphasis="key" signs/>
      <Spin x={cx} y={cy} r={46} ccw sweep={60 + 220 * rate}/>
      <Speedometer x={590} y={190} r={92} value={rate}/>
      {torque < 0.3 && <T x={cx} y={30} tone="danger" size="sm">with almost no field to resist it, a zepton would rotate almost without limit</T>}
    </Stage>}>
    <Slider label="London-van der Waals torque" value={torque} min={0.2} max={2.4} step={0.02} onChange={v => setTurning(s => ({ torque: v, offset: s.offset + play.t * 200 * (turnRate(s.torque) - turnRate(v)) }))} show={v => (Math.abs(v - 1) < 0.011 ? 'free space' : `${fmt(v, 3)} × free space`)}/>
    <PlayBar play={play} label="the rotation"/>
    <Readout label="Rate of rotation" value={`${fmt(rate, 3)} ×`}/>
    <Readout label="Speed of light" value={`${fmt(rate, 3)} c₀`} tone="good"/>
    <Remark>{Math.abs(torque - 1) < 0.011 ? 'In free space the zeptons are uniformly spread, the torque is constant, and so is the speed of light.' : torque > 1 ? 'Matter adds to the drag: the vacuum fluctuations respond to both the matter and the photon.' : 'Less drag, faster rotation. With no zero-point field at all a single zepton would rotate infinitely fast.'}</Remark>
  </Diagram>;
}

/** Common transparent media and the fraction of c at which light travels in them. */
const MEDIA = [{ name: 'vacuum', n: 1 }, { name: 'water', n: 1.333 }, { name: 'typical glass', n: 1.515 }, { name: 'diamond', n: 2.417 }];

/** The named medium a refractive index stands for, if it is one of them. */
export const mediumAt = (n: number) => MEDIA.find(m => Math.abs(m.n - n) < 0.012);

/** The angle of the refracted ray from the normal, in degrees, for an angle of incidence and a refractive index (Snell's law). */
export const refractedAngle = (incidence: number, n: number) => deg(Math.asin(Math.sin(rad(incidence)) / n));

/** How hard the medium's zeptons drag on the photon's turn, from 0 (vacuum) to 0.85 (diamond), for a refractive index. */
export const dragOf = (n: number) => 0.85 * clamp((n - 1) / 1.42);

/**
 * How far through its half-turn (0 to 1) a zepton carrying the light is, a fraction `u` of the way through its time. Every
 * half-turn takes the same time, but with drag it is held back at first and catches up after: the shape of a turn against
 * a resistance. With no drag it turns steadily.
 */
export const halfTurn = (u: number, drag: number) => u - (drag * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);

/** The point on a segment from `a` along unit `dir` for `length` nearest to (x, y), and how far along it is. */
function nearest(x: number, y: number, a: readonly [number, number], dir: readonly [number, number], length: number) {
  const s = clamp((x - a[0]) * dir[0] + (y - a[1]) * dir[1], 0, length);
  return { s, d: Math.hypot(x - (a[0] + dir[0] * s), y - (a[1] + dir[1] * s)) };
}

/** The vacuum's zeptons round the ray: a loose lattice, each with a scattered resting angle. */
const REFRACTION_FIELD = (() => { const random = rng(2002); return Array.from({ length: 16 * 8 }, (_, k) => ({ x: 44 + (k % 16) * 42 + (Math.floor(k / 16) % 2) * 21, y: 30 + Math.floor(k / 16) * 46, rest: random() * 180, a: random() * 6.28, b: random() * 6.28 })); })();

/** Neighbouring zeptons of the field, for drawing the torque between them. */
const REFRACTION_LINKS = linksBetween(REFRACTION_FIELD, 52);

/** The medium's matter: atoms set between the rows of zeptons below the surface (at y 190). */
const REFRACTION_ATOMS = Array.from({ length: 3 * 8 }, (_, k) => ({ x: 65 + (k % 8) * 84 + (Math.floor(k / 8) % 2) * 42, y: 237 + Math.floor(k / 8) * 46 })).filter(a => a.x < 690);

/** Explorer: light entering a medium where the torque is greater slows down and is turned. */
function Refraction() {
  const [n, setN] = useState(1.515);
  const [incidence, setIncidence] = useState(45);
  const play = usePlayback({ speed: 0.45 });
  const H = 380, bx = 360, by = 190, inside = refractedAngle(incidence, n), speed = 1 / n, named = mediumAt(n), drag = dragOf(n), matterHold = clamp((n - 1) / 1.42);
  const ai = rad(incidence), ar = rad(inside), up = 190 / Math.cos(ai), down = 180 / Math.cos(ar);
  const inDir = [Math.sin(ai), Math.cos(ai)] as const, outDir = [Math.sin(ar), Math.cos(ar)] as const, start = [bx - inDir[0] * up, by - inDir[1] * up] as const;
  // The light is a series of central zeptons, one each half wavelength (44 in the vacuum, n times closer in the medium),
  // each making one half-turn, alternate ones turning opposite ways, as in Figure 5-1. Every half-turn takes the same
  // time, so in the medium, where it carries the light less far, the light is slower.
  const half = 44, sites = [
    ...Array.from({ length: Math.ceil(up / half) }, (_, i) => ({ s: half / 2 + i * half, medium: false })).filter(z => z.s < up),
    ...Array.from({ length: Math.ceil((down * n) / half) }, (_, i) => ({ s: (half / n) * (i + 0.5), medium: true })).filter(z => z.s < down),
  ];
  // Which zepton is carrying the light, and how far through its half-turn; after the last a short pause, then again.
  const at = (play.t * 2) % (sites.length + 0.8), now = Math.floor(at), u = at - now, carrying = now < sites.length;
  const where = (k: number) => { const z = sites[k], from = z.medium ? [bx, by] : start, dir = z.medium ? outDir : inDir; return [from[0] + dir[0] * z.s, from[1] + dir[1] * z.s] as const; };
  // A zepton's angle: upright before the light reaches it, turned over once it has passed, and between while it carries it.
  const turnOf = (k: number) => { const way = k % 2 ? 1 : -1, done = k < now ? 1 : k > now ? 0 : halfTurn(u, sites[k].medium ? drag : 0); return 90 + way * 180 * done; };
  const lightAt = carrying ? where(now) : null, size = Math.min(24, (half / n) * 0.9);
  // The vacuum's zeptons near the light swing with it as it turns; in the medium the matter holds them too, so they swing
  // less freely, and that resistance is the drag on the light.
  const field = REFRACTION_FIELD.map(z => {
    const medium = z.y > by, seg = medium ? nearest(z.x, z.y, [bx, by], outDir, down) : nearest(z.x, z.y, start, inDir, up);
    const swing = lightAt ? 45 * Math.exp(-Math.hypot(z.x - lightAt[0], z.y - lightAt[1]) / 55) * (medium ? 1 / (n * n) : 1) * (now % 2 ? 1 : -1) * Math.sin(Math.PI * u) : 0;
    // In the medium the matter holds each zepton turned partly towards its nearest atom, the more so the denser the medium.
    const atom = medium ? REFRACTION_ATOMS.reduce((best, a) => (Math.hypot(a.x - z.x, a.y - z.y) < Math.hypot(best.x - z.x, best.y - z.y) ? a : best)) : null;
    const toward = atom ? bearing(z.x, z.y, atom.x, atom.y) : z.rest, gap = ((toward - z.rest + 540) % 360) - 180;
    // Each wobbles restlessly about that angle, freely in the vacuum, held still in proportion to the matter in the medium.
    return { ...z, medium, near: seg.d, angle: wobbleAngle(z.rest + (atom ? 0.8 * matterHold * gap : 0), medium ? 1 - 0.85 * matterHold : 1, play.t, z.a, z.b) + swing };
  }).filter(z => z.near > 18 && Math.abs(z.y - by) > 10 && z.y < H - 20 && !(z.x < 330 && z.y > by - 34 && z.y < by + 40));
  const kept = new Set(REFRACTION_FIELD.filter(z => field.some(f => f.x === z.x && f.y === z.y)));
  return <Diagram stage={
    <Stage w={W} h={H} label={`A ray of light entering ${named ? named.name : 'a medium'} at ${incidence} degrees from the normal, drawn as the zeptons along it turning as it passes. The zeptons round it swing in sympathy, ${n > 1.01 ? 'less freely in the medium, where the matter holds them too' : 'as freely on both sides'}. Inside, light travels at ${Math.round(speed * 100)} per cent of its speed in a vacuum and the ray is turned to ${fmt(inside, 3)} degrees.`}>
      <rect x={30} y={by} width={W - 60} height={H - by - 16} className="bk-fill-panel"/><line x1={30} y1={by} x2={W - 30} y2={by} className="bk-s-text" strokeWidth="2"/>
      {matterHold > 0 && REFRACTION_ATOMS.filter(a => nearest(a.x, a.y, [bx, by], outDir, down).d > 16).map((a, i) => <circle key={i} cx={a.x} cy={a.y} r={4 + 3 * matterHold} className="bk-f-matter" opacity={0.35 + 0.5 * matterHold}/>)}
      <TorqueLinks links={REFRACTION_LINKS.filter(([a, b]) => kept.has(a) && kept.has(b))} hold={(_, y) => (y > by ? 0.12 + 0.88 * matterHold : 0.12)}/>
      {field.map((z, i) => <Zepton key={i} x={z.x} y={z.y} angle={z.angle} len={16} oval={false} signs={false} opacity={0.45}/>)}
      <line x1={bx} y1={30} x2={bx} y2={H - 20} className="bk-s-faint" strokeDasharray="3 5"/>
      <Line d={`M${start[0]} ${start[1]} L${bx} ${by} L${bx + outDir[0] * down} ${by + outDir[1] * down}`} tone="e" w={1.4} opacity={0.5}/>
      {sites.map((_, k) => { const [x, y] = where(k), on = carrying && k === now;
        return <g key={k}>{on && <circle cx={x} cy={y} r={17} className="bk-f-e" opacity={0.3}/>}
          <Zepton x={x} y={y} angle={turnOf(k)} len={on ? size + 4 : size} oval={false} signs={false} emphasis={on ? 'key' : 'normal'} opacity={on ? 1 : 0.35}/></g>; })}
      <T x={44} y={by - 12} anchor="start" size="sm">vacuum: c₀, zeptons turn freely</T>
      <T x={44} y={by + 24} anchor="start" size="sm">{named ? named.name : 'medium'}: {fmt(speed, 3)} c₀</T>
      {matterHold > 0 && <><circle cx={50} cy={H - 7} r={5} className="bk-f-matter"/><T x={60} y={H - 3} anchor="start" size="sm">matter, holding the zeptons</T></>}
    </Stage>}>
    <Slider label="Torque in the medium (refractive index)" value={n} min={1} max={2.42} step={0.005} onChange={setN} show={v => { const m = mediumAt(v); return `${fmt(v, 4)}${m ? ` (${m.name})` : ''}`; }}/>
    <Slider label="Angle at which the light arrives" value={incidence} min={0} max={80} step={1} onChange={setIncidence} unit="°"/>
    <PlayBar play={play} label="the light"/>
    <Readout label="Speed in the medium" value={`${fmt(speed * 100, 3)} % of c₀`} tone="good"/>
    <Readout label="Turned by" value={`${fmt(incidence - inside, 3)}°`} tone="force"/>
    <Remark>{n < 1.01 ? 'No matter, no extra torque: the zeptons turn as freely on both sides, and the light goes straight on at c₀.' : 'The medium’s zeptons answer the matter as well as the light, so they turn less freely. Each half-turn of the light is dragged and carries it less far: in a typical glass only 66% as far. The same torque turns the ray.'}</Remark>
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
      notes: <p>Fleming says the speed of light is derived from the torque and should be derivable from first principles, but gives no formula. Taking the rate of rotation as inversely proportional to the torque is a display choice, as are the neighbours’ lag and their number. The faint links between neighbouring zeptons stand for the torque, the resistance each meets in turning the others: plainer where it is greater, fading where they turn freely.</p>,
      labs: [{ lab: 'light', scenario: 'induction', why: 'The central pair of a photon and the background pairs that respond to it.' }],
    },
    {
      kind: 'explorer', id: 'x20-2', page: 152, title: 'Slower in glass, and turned',
      Diagram: Refraction,
      text: <>
        <p>Why light slows in glass has, Fleming says, no reasonable account: the photon is said to be absorbed and re-emitted, <Q>the catch-and-release model</Q>, which <Q>is not in keeping with standard physics of photon interactions</Q> (<Pg n={152}/>).</p>
        <p><Q>According to the London-van der Waals torque model, the amount of torque increases in the presence of matter since the vacuum fluctuations respond to both the matter and the photon, making for a greater amount of drag on the photon’s central zepton rotation. The London-van der Waals torque also directly converts to a real measurable torque as seen in the refraction, or bending, of the light as it enters glass, water, or other matter medium.</Q></p>
      </>,
      tryThis: ['Set the medium to typical glass and read the speed: 66 % of its value in a vacuum, the figure in the text.', 'Follow the lit zepton, where the light is: it crosses the surface and goes on more slowly. Each zepton makes one half-turn, the next the other way. Inside, each half-turn is dragged and carries the light less far, so the zeptons bunch up, and the zeptons round them swing less freely.', 'Send the light in straight (0°): it slows but is not turned. Tilt it and the turn grows.'],
      notes: <p>The light is drawn as its series of central zeptons, one each half wavelength, each making one half-turn, alternately one way and the other (Figure 5-1). Every half-turn takes the same time, so the frequency is the same in the medium; there each is held back and then catches up, a drag in proportion to the refractive index, and the zeptons nearby swing with it, by 1/n² as much as in the vacuum. The medium’s matter is drawn as atoms, plainer the higher the index, each zepton beside them held partly turned towards the nearest: they respond to the matter as well as the light, which is the extra torque. Fleming gives the drag, not its form. The bending is Snell’s law for the ratio of speeds, which is the measured behaviour the text refers to; the refractive index stands for the relative torque. The faint links between neighbouring zeptons stand for the torque, the resistance each meets in turning the others: plainer where it is greater, fading where they turn freely.</p>,
    },
  ],
};
export default chapter;
