// Chapter 23: Gravity, Energy, and Light (PDF pp. 176–184). Figures 23-1 and 23-2.
import { useMemo, useRef, useState } from 'react';
import { Arrow, Body, Diagram, Line, PlayBar, Readout, Remark, Slider, Stage, T, Toggle, fmt, pathThrough, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;
const GM_SUN = 1.32712440018e20, GM_EARTH = 3.986004418e14, C = 299792458, R_SUN = 6.957e8, R_EARTH = 6.371e6, AU = 1.495978707e11;
/** Mean distances from the Sun of the bodies the radar signals were bounced from, in metres. */
export const TARGETS = { mercury: { name: 'Mercury', r: 5.791e10 }, mars: { name: 'Mars', r: 2.2794e11 } };

/** The fraction by which light is slowed at a distance r from a mass (Equation 23-6): 2GM/(rc²). */
export const lightSlowing = (gm: number, r: number) => (2 * gm) / (r * C * C);

/**
 * The extra time a signal takes on a round trip from Earth to a planet behind the Sun and back, passing the Sun at a
 * distance b, when light is slowed along the way as Equation 23-6 gives: the slowing summed along a straight path.
 */
export function shapiroDelay(b: number, target: number, earth = AU) {
  const leg = (r: number) => Math.log((Math.sqrt(r * r - b * b) + r) / b);
  return ((4 * GM_SUN) / C ** 3) * (leg(earth) + leg(target));
}

/** Figure 23-1: a radar signal to a planet behind the Sun and back, slowed where it passes the Sun. */
function ShapiroDelay() {
  // The signal is bounced off Mercury, as in the printed figure.
  const target = 'mercury' as const;
  const [radii, setRadii] = useState(1);
  const play = usePlayback({ speed: 0.3 });
  const b = radii * R_SUN, delay = shapiroDelay(b, TARGETS[target].r), slow = lightSlowing(GM_SUN, b);
  // Mercury is drawn at its distance from the Sun in proportion to the Earth's, about 0.39 of it.
  const H = 360, y = 190, xe = 70, xs = 380, xt = xs + 0.39 * (xs - xe), off = 14 + radii * 2.2, u = play.t % 1;
  // The signal slows near the Sun, greatly exaggerated: its speed follows the same 1/r shape as the band above, so it is
  // slowest where it passes closest. Its place at each moment comes from the time it has taken to cover the path so far.
  const timeline = useMemo(() => {
    const n = 240, depth = 2.6, xs_ = Array.from({ length: n + 1 }, (_, i) => xe + ((xt - xe) * i) / n), t = [0];
    for (let i = 1; i <= n; i++) { const xm = (xs_[i] + xs_[i - 1]) / 2, speed = 1 / (1 + depth * off / Math.hypot(xm - xs, off)); t.push(t[i - 1] + (xs_[i] - xs_[i - 1]) / speed); }
    return { xs: xs_, t: t.map(v => v / t[n]) };
  }, [off]);
  /** Where the signal is when a fraction `f` of the one-way time has passed. */
  const at = (f: number) => { const { xs: X, t } = timeline; let i = 1; while (i < t.length - 1 && t[i] < f) i++; return X[i - 1] + ((X[i] - X[i - 1]) * (f - t[i - 1])) / (t[i] - t[i - 1] || 1); };
  const px = at(u < 0.5 ? u * 2 : 2 - u * 2);
  // The slowing along the path, drawn as a band whose depth follows 1/r.
  const band = pathThrough(Array.from({ length: 80 }, (_, i) => { const x = xe + ((xt - xe) * i) / 79, d = Math.hypot(x - xs, off) / off; return [x, y - off - 46 / d] as const; }));
  return <Diagram stage={
    <Stage w={W} h={H} label={`A radar signal from Earth to ${TARGETS[target].name} and back, passing the Sun at ${fmt(radii, 2)} solar radii. Slowed by the Sun as Equation 23-6 gives, the round trip takes ${fmt(delay * 1e6, 3)} microseconds longer.`}>
      <Line d={band} tone="danger" w={1.4} opacity={0.8}/><T x={xs} y={y - off - 58} size="sm" tone="danger">how much the light is slowed along the path</T>
      <line x1={xe} y1={y - off} x2={xt} y2={y - off} className="bk-s-e" strokeWidth="1.6" strokeDasharray="6 4"/>
      <Body x={xs} y={y} r={13} tone="matter" label="Sun"/><Body x={xe} y={y - off} r={8} tone="plain" label="Earth"/><Body x={xt} y={y - off} r={6} tone="plain" label={TARGETS[target].name}/>
      <circle cx={px} cy={y - off} r={6} className="bk-f-mark"/>
      <Arrow x1={xs} y1={y - 2} x2={xs} y2={y - off + 2} both tone="muted" w={1} head={5}/>
      <T x={W / 2} y={H - 16} size="sm">not to scale · the bending of the signal is not shown, as in the printed figure</T>
    </Stage>}>
    <Slider label="Closest the signal passes to the Sun" value={radii} min={1} max={30} step={0.5} onChange={setRadii} show={v => `${fmt(v, 3)} solar radii`}/>
    <PlayBar play={play} label="the signal"/>
    <Readout label="Slowing at closest approach" value={`${fmt(slow * 1e6, 3)} parts per million`}/>
    <Readout label="Delay on the round trip" value={`${fmt(delay * 1e6, 3)} µs`} tone="force"/>
    <Readout label="As a distance" value={`${fmt((delay * C) / 1000, 3)} km`}/>
    <Remark>Fleming’s reading: not a contraction of space, but the speed of light reduced near a body of matter.</Remark>
  </Diagram>;
}

/** The angle by which light passing a mass at distance r is bent, in arcseconds (Equation 23-7): 4GM/(rc²). */
export const bendingAngle = (gm: number, r: number) => (((4 * gm) / (r * C * C)) * 180 * 3600) / Math.PI;

/** Figure 23-2: starlight bent as it passes the Sun, half from each of the two slowings. */
function LightBending() {
  const [radii, setRadii] = useState(1);
  const [both, setBoth] = useState(true);
  const H = 400, cx = 330, cy = 210, full = bendingAngle(GM_SUN, radii * R_SUN), angle = both ? full : full / 2;
  // The bend is far too small to draw: it is magnified so that 1.75 arcseconds shows as about 16 degrees.
  const shown = (angle / 1.75) * 16, off = 26 + radii * 9, x = cx + off, top = 30, yEarth = H - 34;
  // The ray turns gradually as it passes: the share of the bend made by the time it is level with a point s along its
  // path is (1 + s/√(s² + b²))/2, so it turns most beside the Sun and runs nearly straight far from it. Traced back
  // from Earth, where it arrives heading straight down, to the star.
  const ray = useMemo(() => {
    const pts: [number, number][] = [[x, yEarth]], n = 200, dy = (yEarth - top) / n;
    let px = x;
    for (let i = 1; i <= n; i++) {
      const yy = yEarth - i * dy, s = yy + dy / 2 - cy, made = (1 + s / Math.hypot(s, off)) / 2, phi = ((shown * (1 - made)) * Math.PI) / 180;
      px -= Math.tan(phi) * dy;
      pts.push([px, yy]);
    }
    return pts.reverse();
  }, [x, yEarth, cy, off, shown]);
  const [sx] = ray[0];
  return <Diagram stage={
    <Stage w={W} h={H} label={`A ray of light from a distant star passing the Sun at ${fmt(radii, 2)} solar radii and reaching Earth. It is bent by ${fmt(angle, 3)} arcseconds, so the star appears displaced from where it is.`}>
      <Line d={pathThrough(ray)} tone="e" w={2}/>
      <line x1={x} y1={cy} x2={x} y2={top} className="bk-s-mark" strokeDasharray="4 4"/>
      <Body x={cx} y={cy} r={22} tone="matter" label="Sun"/><Body x={x} y={H - 34} r={8} tone="plain"/><T x={x + 16} y={H - 30} anchor="start" size="sm">Earth</T>
      <circle cx={sx} cy={26} r={5} className="bk-f-e"/><T x={sx - 10} y={24} anchor="end" size="sm" tone="e">the star</T>
      <circle cx={x} cy={26} r={5} className="bk-s-mark" fill="none" strokeWidth="1.5"/><T x={x + 10} y={24} anchor="start" size="sm" tone="mark">where it appears</T>
      <T x={560} y={170} size="sm">bend, magnified</T><T x={560} y={196} tone="text" size="lg">{fmt(angle, 3)}″</T>
    </Stage>}>
    <Slider label="Closest the light passes to the Sun" value={radii} min={1} max={10} step={0.1} onChange={setRadii} show={v => `${fmt(v, 3)} solar radii`}/>
    <Toggle label="Both slowings (radial and tangential)" checked={both} onChange={setBoth}/>
    <Readout label="Bending" value={`${fmt(angle, 4)}″`} tone="force"/>
    <Readout label="From the radial slowing" value={`${fmt(full / 2, 4)}″`}/>
    <Readout label="From the torque of the matter field" value={both ? `${fmt(full / 2, 4)}″` : 'left out'}/>
    <Remark>{both ? 'At the Sun’s edge the two halves give 1.75 arcseconds.' : 'One half alone gives 0.875 arcseconds, the figure from Newtonian gravity and the Equivalence Principle.'}</Remark>
  </Diagram>;
}

/** How much faster a clock at altitude runs than one on the ground, in microseconds a day: Equation 23-4 without its square
 * root, which Fleming says may be left off. */
export const clockGain = (altitude: number) => ((GM_EARTH / (C * C)) * (1 / R_EARTH - 1 / (R_EARTH + altitude))) * 86400 * 1e6;

/** How much the drawing magnifies the clocks' difference in rate: 45.7 µs a day (5.3 × 10⁻¹⁰) is drawn as 60 per cent. */
const MAGNIFY = 0.6 / 45.7;

/** Explorer: a clock higher above the Earth runs faster, and light climbing away is redshifted (Equations 23-4 and 23-5). */
function ClocksAndRedshift() {
  const [km, setKm] = useState(20200);
  const play = usePlayback();
  const gain = clockGain(km * 1000);
  // Each hand's angle accumulates at its current rate, so a change of height changes the rate from then on and never
  // moves a hand by itself. Restart (or a step back) sets both to twelve.
  const hands = useRef({ t: 0, ground: 0, upper: 0 });
  if (play.t < hands.current.t) hands.current = { t: 0, ground: 0, upper: 0 };
  const step = Math.max(0, Math.min(0.05, play.t - hands.current.t));
  hands.current = { t: play.t, ground: hands.current.ground + 120 * step, upper: hands.current.upper + 120 * (1 + gain * MAGNIFY) * step };
  const shift = (GM_EARTH / (C * C)) * (1 / R_EARTH - 1 / (R_EARTH + km * 1000));
  const H = 340, cx = 200, cy = 350, R = 120, alt = 24 + (Math.log10(km) / Math.log10(40000)) * 150, y = cy - R - alt
  const clock = (yy: number, a: number, label: string) => <g><circle cx={cx} cy={yy} r={20} className="bk-body bk-body-plain"/><line x1={cx} y1={yy} x2={cx + 15 * Math.sin((a * Math.PI) / 180)} y2={yy - 15 * Math.cos((a * Math.PI) / 180)} className="bk-s-mark" strokeWidth="2.5" strokeLinecap="round"/><T x={cx + 30} y={yy + 5} anchor="start" size="sm">{label}</T></g>;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A clock on the Earth's surface and one ${km.toLocaleString('en-GB')} kilometres above it. The higher clock gains ${fmt(gain, 3)} microseconds a day, and light climbing to it is redshifted by ${fmt(shift, 3)}.`}>
      <circle cx={cx} cy={cy} r={R} className="bk-body bk-body-matter"/><T x={cx} y={cy - R + 30} tone="text" size="sm">Earth</T>
      {[0, 1, 2, 3].map(i => <circle key={i} cx={cx} cy={cy} r={R + 30 + i * 44} className="bk-s-b" fill="none" strokeDasharray="2 6" opacity={0.7 - i * 0.16}/>)}
      {clock(cy - R - 8, hands.current.ground, 'on the ground')}{clock(y, hands.current.upper, `at ${km.toLocaleString('en-GB')} km`)}
      <T x={470} y={90} anchor="start" size="sm" tone="b">dotted rings: the torque of the</T><T x={470} y={108} anchor="start" size="sm" tone="b">vacuum, greater nearer the Earth</T>
      <T x={470} y={150} anchor="start" size="sm">the difference in the clocks’ rates</T><T x={470} y={168} anchor="start" size="sm">is magnified about a billion times</T>
    </Stage>}>
    <Slider label="Height of the upper clock" value={km} min={100} max={40000} step={100} onChange={setKm} show={v => `${v.toLocaleString('en-GB')} km`}/>
    <PlayBar play={play} label="the clocks"/>
    <Readout label="Upper clock gains" value={`${fmt(gain, 3)} µs a day`} tone="good"/>
    <Readout label="Redshift of light climbing to it" value={`${fmt(shift, 3)}`}/>
    <Remark>{Math.abs(km - 20200) < 150 ? 'At the height of the GPS satellites the clocks gain about 46 microseconds a day, which is why they are set to run slow.' : 'The nearer a clock is to a large body of matter, the more slowly it runs.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 23,
  summary: <>
    <p>Four observations are counted as proofs of general relativity: clocks running slower nearer the Earth, the redshift of light climbing out of a gravitational field, the Shapiro delay, and the bending of starlight by the Sun. Fleming accepts all four as observed and gives each another cause.</p>
    <p>Near a large body of matter <Q>the London-van der Waals torque of the vacuum is increased</Q>: the zeptons turn more slowly, wavelengths lengthen and clocks slow (<Pg n={177}/>). Redshift is conservation of energy as a photon climbs away. The two effects on light passing the Sun are each <Q>half due to deceleration-acceleration in the radial direction</Q> and half due to the torque of the Sun’s matter field, which together give Einstein’s factor of two with space left flat (<Pg n={181}/>, <Pg n={183}/>).</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x23-1', page: 177, section: 'Einstein, Confusing Physicists for Over a Century', title: 'Clocks nearer the Earth run slower',
      Diagram: ClocksAndRedshift,
      text: <>
        <p>The gravitational correction for a clock, in the form Fleming derives from the potential energy per unit of rest energy (<Pg n={177}/>, <Pg n={178}/>):</p>
        <Eq n="23-4"><V>t</V><sub>0</sub> = <V>t</V>′ √(1 − <Frac top={<V>GM</V>} bottom={<><V>r</V><V>c</V>²</>}/>)</Eq>
        <p><Q>The clock rate change is not due to a time dilation effect or acceleration, but rather the London-van der Waals torque of the vacuum is increased in the presence of nearby large bodies of matter. The speed of rotation of the zeptons in space is slowed due to the polar Matter Force. This additional torque causes photon wavelengths to be longer and the frequencies lower. In turn it causes physical clocks to run slower than they do farther from Earth.</Q></p>
        <p>The redshift of light leaving a star has the same size (Equation 23-5): Δλ/λ = <V>GM</V>/(<V>c</V>²<V>r</V>). <Q>Photons accelerate as they leave a gravitational field in the radial direction, and as they speed up their wavelengths become longer</Q> (<Pg n={179}/>).</p>
      </>,
      tryThis: ['Set the height to 20,200 km, where the GPS satellites are: the upper clock gains about 46 microseconds a day.', 'Bring the clock down: the gain shrinks toward zero at the surface.', 'Compare the redshift readout: it is the same fraction, seen in the light instead of the clock.'],
      notes: <>
        <p>The readouts are Equation 23-4 with its square root left off, as Fleming says it may be, for the Earth: the difference between the surface and the height chosen. That gives about 45.7 µs a day at the height of the GPS satellites, the figure usually quoted. Taken with the square root as printed, the equation gives half that, about 22.9 µs; the standard form has 2<V>GM</V> under the root. The book does not remark on the difference.</p>
        <p>The correction for the satellite’s motion, which Fleming assigns to the Sagnac effect of chapter 22, is not included. The drawing magnifies the difference in rate about a billion times, in proportion to the gain, so a lower clock visibly gains less.</p>
      </>,
    },
    {
      kind: 'figure', id: '23-1', page: 180, section: 'Shapiro Delay', title: 'A signal that comes back late',
      caption: 'The Shapiro Delay experiment. A radar signal from Earth is bounced off Mercury and returns to Earth, grazing the Sun each way. The bending of the radar signal is not shown.',
      Diagram: ShapiroDelay,
      text: <>
        <p>Shapiro proposed that a radar signal bounced off a planet on the far side of the Sun would be delayed by about 200 microseconds when it passed near the Sun, and measured about 160 off Mercury; the later Viking measurements gave about 240 to Mars and back, which in general relativity is space contraction and time dilation <Q>to the tune of ~69 kilometers</Q> (<Pg n={179}/>, <Pg n={180}/>).</p>
        <p><Q>Of course it has never been an issue of space contraction, but rather the speed of light being reduced near bodies of matter.</Q> The change in speed carries a factor of two (<Pg n={181}/>):</p>
        <Eq n="23-6"><V>c</V>′ = <V>c</V>(1 − <Frac top={<>2<V>GM</V></>} bottom={<><V>r</V><V>c</V>²</>}/>)</Eq>
        <p><Q>Half of the speed of light change is due to the identical mechanism used to explain the gravitational redshift</Q>; <Q>The other half is due to the increase in the torque of the vacuum in the vicinity of nearby matter</Q>.</p>
      </>,
      tryThis: ['With the signal grazing the Sun, compare the delay with the figure in the text for Mercury: about 200 microseconds.', 'Watch the signal: it slows as it nears the Sun and picks up again beyond, both ways (much exaggerated).', 'Move the path away from the Sun: the delay falls slowly, because the slowing reaches far out, as 1/r.', 'Read the delay as a distance: the tens of kilometres the text mentions.'],
      notes: <p>The signal is drawn slowing as it passes the Sun, by far more than the parts per million of the true slowing, so that it can be seen; its speed follows the shape of the band above it. The delay is Equation 23-6 added up along a straight path between the planets’ mean distances from the Sun; the text gives the equation and the measured values, not this sum. The solar corona and the small extra path from bending are left out, as the text says they must be corrected for.</p>,
    },
    {
      kind: 'figure', id: '23-2', page: 182, section: 'The Bending of Light Around the Sun', title: 'Starlight turned by the Sun',
      caption: 'A ray of light from a distant star bends as it passes near the Sun.',
      Diagram: LightBending,
      text: <>
        <p>Newtonian gravity with the Equivalence Principle gives a bend of 0.875 arcseconds; Einstein’s final prediction was 1.75. The light <Q>is bent as it passes nearby the Sun and then is detected at Earth. This, interestingly, makes it appear to the casual observer that the distant star is located somewhere, other than its real location</Q> (<Pg n={182}/>).</p>
        <Eq n="23-7">θ = <Frac top={<>4<V>GM</V></>} bottom={<><V>r</V><V>c</V>²</>}/></Eq>
        <p>In the Matter Force account this is <Q>a two-part process that is identical to Shapiro Delay, except in this case the slowing of light near matter additionally causes the light to bend. The clock slowing or frequency change due to the tangential motion is responsible for half the bending, while slowing due to the radial component is responsible for the other half</Q> (<Pg n={183}/>).</p>
      </>,
      tryThis: ['At one solar radius the bend is 1.75 arcseconds.', 'Turn off one of the two slowings: 0.875, the Newtonian figure.', 'Move the ray outward: the bend falls in proportion to the distance.'],
      notes: <p>The readout is Equation 23-7. The bend is drawn about thirty thousand times too large, as a smooth curve that turns most beside the Sun, where its field is strongest. This is the bending chapter 20 calls refraction, with the Sun’s matter field in place of glass.</p>,
    },
  ],
};
export default chapter;
