// Chapter 19: The Speed of the Zero-Point Universe (PDF pp. 142–150). Figures 19-1 to 19-4.
import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { Arrow, BlockArrow, Body, Choice, Diagram, FallbackOnError, PlayBar, Readout, Remark, Slider, Spin, Stage, T, Toggle, Zepton, canDraw3D, clamp, fmt, lerpAngle, polar, rad, rng, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';
import { PATH_SITES, PATH_START, centralX } from '../three/photon-math';
import { SlitDiagram, stateLine } from '../../double-slit/Diagram';
import { DEFAULT_SLITS, PATH_LENGTH, SLIT_END_TICK, SLIT_OFFSET_RANGE, SLIT_TICKS_PER_TAU, routeViaSlit, slitReadout, type SlitParameters } from '../../double-slit/model';

const W = 720;
/** The Earth's orbital speed as a fraction of the speed of light: the lag angle, in radians, if gravity travelled at c. */
export const EARTH_BETA = 29780 / 299792458;

/** The angle by which a force lags when it travels at `speed` (in units of c) to a planet moving like the Earth, in radians. */
export const lagAngle = (speed: number) => EARTH_BETA / speed;

/** The number of orbits in which such a lag would double the size of the orbit: the radius grows by e^(4π·lag) each orbit. */
export const orbitsToDouble = (speed: number) => Math.log(2) / (4 * Math.PI * lagAngle(speed));

/** Where the speed-of-gravity slider of Figure 19-1 stops: one step past 10¹¹ c, standing for an infinite speed. */
const INFINITE_EXP = 11.5;

/** The speeds of gravity the chapter names, as powers of ten of c: the slider settles on each when it comes near. */
const SPEED_MARKS = [
  { exp: 0, name: 'Einstein: relativity' },
  { exp: Math.log10(7e6), name: 'Laplace' },
  { exp: Math.log10(2e10), name: 'Van Flandern' },
];

/**
 * A slider position, settled onto a named speed when within one step of it, coming from `from`. A step away from the
 * named speed the slider is already on is not pulled back to it, so the arrow keys can step past it.
 */
export function snapSpeed(v: number, from?: number) {
  const mark = SPEED_MARKS.find(m => Math.abs(m.exp - v) < 0.06);
  return mark && (from === undefined || Math.abs(mark.exp - from) > 1e-9) ? mark.exp : v;
}

/** How the speed-of-gravity slider reads: the speed in units of c, with its name where the chapter gives one. */
export function speedName(v: number) {
  if (v >= INFINITE_EXP - 0.05) return '∞ (no delay: Newton)';
  const mark = SPEED_MARKS.find(m => Math.abs(m.exp - v) < 1e-9);
  return `${fmt(10 ** v, 2)} c${mark ? ` (${mark.name})` : ''}`;
}

/** Figure 19-1: a force that arrives late points to where the planet was, and the orbit does not hold. */
function LateGravity() {
  const [exp, setExp] = useState(0); // log10 of the speed of gravity in units of c; the top of the slider is infinite
  const instant = exp >= INFINITE_EXP - 0.05;
  const play = usePlayback({ speed: 0.5 });
  const speed = 10 ** exp, lag = instant ? 0 : lagAngle(speed), doubling = instant ? Infinity : orbitsToDouble(speed), H = 400, cx = 300, cy = 200, r = 150;
  // The planet is drawn going round once in two seconds whatever the time-lapse; the angle to A is magnified to be seen.
  const a = play.t * 180, shown = instant ? 0 : clamp(lag * 3e5, 4, 34), [bx, by] = polar(cx, cy, r, a), [ax, ay] = polar(cx, cy, r, a - shown);
  const [fx, fy] = [bx + (cx - ax) * 0.5, by + (cy - ay) * 0.5];
  return <Diagram stage={
    <Stage w={W} h={H} label={instant ? 'A planet orbiting a star with a force that arrives without delay: the force points at the star and the orbit holds.' : `A planet orbiting a star, with gravity travelling at ${fmt(speed, 2)} times the speed of light. The force lags by ${fmt((lag * 180 * 3600) / Math.PI, 2)} arcseconds, and the orbit would double in size in ${fmt(doubling, 2)} years.`}>
      <circle cx={cx} cy={cy} r={r} className="bk-s-muted" fill="none" strokeDasharray="2 4"/>
      <Body x={cx} y={cy} r={18} tone="matter"/>
      {!instant && <><circle cx={ax} cy={ay} r={9} className="bk-s-muted" fill="none" strokeDasharray="2 2"/><T x={ax + (ax - cx) * 0.16} y={ay + (ay - cy) * 0.16 + 4} size="sm">A</T><Arrow x1={ax} y1={ay} x2={cx + (ax - cx) * (26 / r)} y2={cy + (ay - cy) * (26 / r)} both tone="faint" w={1.2} head={7}/></>}
      <BlockArrow x1={bx} y1={by} x2={fx} y2={fy} thick={7}/>
      <Body x={bx} y={by} r={9} tone="plain"/><T x={bx + (bx - cx) * 0.16} y={by + (by - cy) * 0.16 + 4} size="sm" tone="text">B</T>
      {!instant && <T x={560} y={80} anchor="start" size="sm">(angle A–B magnified)</T>}
    </Stage>}>
    <Slider label="Speed of gravity" value={exp} min={0} max={INFINITE_EXP} step={0.1} onChange={v => setExp(from => snapSpeed(v, from))} show={speedName}/>
    <PlayBar play={play} label="the orbit"/>
    <Readout label="Lag of the force" value={instant ? 'none' : `${fmt((lag * 180 * 3600) / Math.PI, 3)}″`}/>
    <Readout label="Orbit doubles in" value={instant ? 'never' : `${fmt(doubling, 3)} years`} tone={doubling < 1e9 ? 'bad' : 'good'}/>
    <Remark>{instant ? 'For Newtonian gravity to work there has to be no delay in transmission of the force.' : exp < 6 ? 'At anything near the speed of light the orbit would change far more than is observed.' : 'Laplace’s bound was 7 × 10⁶ c; Van Flandern’s, from better data, 2 × 10¹⁰ c.'}</Remark>
  </Diagram>;
}

/** How far a field spreads from a zepton during its life, in photon wavelengths, at a speed given in units of c. */
export const fieldReach = (speed: number) => speed * 0.5;

/** Figure 19-2 drawn in three dimensions, as printed: loaded on demand, since three.js is large. */
const PhotonScene = lazy(() => import('../three/PhotonScene'));

/** Figure 19-2 seen along the photon's path, flat: the fallback where 3D cannot be drawn. */
function FlatPhoton({ exp, t, label }: { exp: number; t: number; label: string }) {
  const H = 380, cx = 360, cy = 190, lambda = 70, speed = 10 ** exp, reach = fieldReach(speed) * lambda;
  const n = Math.floor(t), u = t - n, clockwise = n % 2 === 0, central = clockwise ? 180 - 180 * u : 180 + 180 * u, open = Math.max(0.2, Math.sin(Math.PI * u));
  const sites = useMemo(() => { const random = rng(192), list: { x: number; y: number; seed: number }[] = []; for (let j = 0; j < 5; j++) for (let i = 0; i < 11; i++) { const x = 40 + i * 64 + (random() - 0.5) * 20, y = 38 + j * 76 + (random() - 0.5) * 20; if (Math.hypot(x - cx, y - cy) > 46) list.push({ x, y, seed: Math.floor(random() * 1e6) }); } return list; }, []);
  return <Stage w={W} h={H} label={label}>
    <circle cx={cx} cy={cy} r={Math.min(reach, 520)} className="bk-s-e" fill="none" strokeWidth="1.4" strokeDasharray="6 5" opacity={0.7}/>
    <circle cx={cx} cy={cy} r={lambda / 2} className="bk-s-danger" fill="none" strokeWidth="1.4" strokeDasharray="3 3"/>
    {sites.map((s, i) => {
      const d = Math.hypot(s.x - cx, s.y - cy), reached = d <= reach, own = rng(s.seed + n * 17)() * 360;
      // The field falls as the inverse square; the lean is shown by its square root so the far zeptons can be seen to turn.
      const share = reached ? clamp(Math.sqrt(lambda / d) * 0.9) : 0;
      return <Zepton key={i} x={s.x} y={s.y} angle={lerpAngle(own, central, share)} len={22} open={open} oval={false} signs={false} emphasis={reached ? 'normal' : 'dim'}/>;
    })}
    <Zepton x={cx} y={cy} angle={central} len={lambda * 0.8} open={open} emphasis="key" signs/>
    <T x={cx} y={cy + lambda / 2 + 16} size="sm" tone="danger">half a wavelength: the reach at c</T>
    <T x={W - 20} y={24} anchor="end" size="sm" tone="e">dashed: how far the field gets in the zepton’s life</T>
  </Stage>;
}

/** Figure 19-2: the zeptons round a photon's central zepton respond only as far as its field can reach in its lifetime. */
function PhotonReach() {
  const [exp, setExp] = useState(Math.log10(4));
  const [flat, setFlat] = useState(() => !canDraw3D());
  const fail = useCallback(() => setFlat(true), []);
  const play = usePlayback({ speed: 0.4 });
  const speed = 10 ** exp, reach = fieldReach(speed);
  // The central zepton turns half a turn in each lifetime, one way and then the other, opening and closing as it goes.
  const n = Math.floor(play.t), u = play.t - n, central = n % 2 === 0 ? 180 - 180 * u : 180 + 180 * u, open = Math.max(0.2, Math.sin(Math.PI * u));
  // A new central zepton each lifetime, a half wavelength along; the photon's front moves on smoothly between them.
  const x = centralX(n), front = PATH_START + 0.5 * ((n % PATH_SITES) + u);
  const label = `A photon travelling along x as a sequence of central zeptons, a new one each half wavelength, its electric and magnetic fields trailing behind at right angles to each other and to the path. With fields spreading at ${fmt(speed, 2)} times the speed of light they reach ${fmt(reach, 2)} wavelengths from the path in the zepton's lifetime.`;
  return <Diagram stage={flat
    ? <FlatPhoton exp={exp} t={play.t} label={label}/>
    : <FallbackOnError onError={fail} fallback={<FlatPhoton exp={exp} t={play.t} label={label}/>}>
        <Suspense fallback={<FlatPhoton exp={exp} t={play.t} label={label}/>}>
          <PhotonScene frame={{ central: rad(central), open, reach, x, front }} onFail={fail} description={`${label} A sphere round the central zepton shows how far its field gets, against a red ring half a wavelength out, the reach at the speed of light. Drag to turn the view.`}/>
        </Suspense>
      </FallbackOnError>}>
    <Slider label="Speed at which the fields spread" value={exp} min={0} max={2} step={0.05} onChange={setExp} show={v => `${fmt(10 ** v, 2)} c`}/>
    <PlayBar play={play} label="the central zepton"/>
    <Readout label="Reach of the field" value={`${fmt(reach, 2)} λ`} tone="e"/>
    <Remark>{exp < 0.05 ? 'At the speed of light the fields are gone, with their zepton, before they get past half a wavelength.' : 'The fields are detectable more than half a wavelength to the side of the path, so they spread faster than light.'}</Remark>
  </Diagram>;
}

/** Figure 19-3: a single photon from A to B past a wall with two slits, drawn as the laboratory draws it, more simply. */
function TwoSlits() {
  const [fast, setFast] = useState(true);
  const [wall, setWall] = useState(true);
  const [offset, setOffset] = useState(DEFAULT_SLITS.slitOffset);
  const play = usePlayback({ speed: 0.6 });
  const params: SlitParameters = { ...DEFAULT_SLITS, wall: wall ? 'slits' : 'open', fields: fast ? 'fast' : 'light', slitOffset: offset };
  // The run goes from A to B in the laboratory's ticks, holds a moment at the end, and then a new photon starts at A.
  const tick = Math.floor(play.t * SLIT_TICKS_PER_TAU) % (SLIT_END_TICK + SLIT_TICKS_PER_TAU);
  const r = slitReadout(params, Math.min(tick, SLIT_END_TICK));
  return <Diagram stage={<div className="bk-slit">
    <SlitDiagram params={params} tick={Math.min(tick, SLIT_END_TICK)} layers={{ zeptons: true, fields: true, routes: true, reach: !fast, path: true }} sparse/>
    <p className="bk-slit-state">{stateLine(params, Math.min(tick, SLIT_END_TICK))}</p>
  </div>}>
    <Choice label="The photon’s fields spread" value={fast ? 'fast' : 'c'} onChange={v => setFast(v === 'fast')} options={[{ value: 'fast', label: 'Much faster than c' }, { value: 'c', label: 'At c' }]}/>
    <Toggle label="Wall with two slits" checked={wall} onChange={setWall}/>
    <Slider label="Each slit’s distance from the path" value={offset} min={SLIT_OFFSET_RANGE[0]} max={SLIT_OFFSET_RANGE[1]} step={0.25} onChange={setOffset} unit="λ"/>
    <PlayBar play={play} label="the photon"/>
    <Readout label="Straight path, A to B" value={`${fmt(PATH_LENGTH, 3)} λ`}/>
    {wall && <Readout label="By way of a slit" value={`${fmt(routeViaSlit(params), 3)} λ`}/>}
    <Readout label="Arrives at B after" value={r.arrival === null ? 'never' : `${fmt(r.arrival, 3)} periods`} tone={r.arrival === null ? 'bad' : 'good'}/>
    <Remark>{!fast && wall ? 'At the speed of light the fields would only go out half a wavelength to either side of the path.' : wall ? 'It still takes the same time t, even though the way through the slits is longer.' : 'With nothing in the way it reaches B in a time exactly in keeping with the speed of light.'}</Remark>
  </Diagram>;
}

/** The speed at which a field is passed on, in units of c, when each zepton need turn only `degrees` of its half-turn. */
export const fieldSpeed = (degrees: number) => 180 / degrees;

/**
 * Figure 19-4: a zepton's half-turn spans its wavelength, which is the speed of light; a field needs far less. The two are
 * drawn side by side over the same lifetime: above, the zepton making its whole half-turn; below, a row of zeptons that
 * each need only a tiny turn to pass the field on, so the field's front runs along the row far faster.
 */
function HalfTurn() {
  // How many times smaller than a half-turn the turn a field needs is, as a power of two: from all 180° to 180°/32, below
  // which the field crosses the row too fast to see.
  const [halvings, setHalvings] = useState(3);
  const play = usePlayback({ speed: 0.3 });
  const H = 460, x0 = 70, yTop = 170, yRow = 380, lambda = 120, u = play.t % 1, share = 2 ** -halvings, needed = 180 * share;
  // The field's front: in the time a zepton makes a whole half-turn it covers 1/share wavelengths. It runs on along the
  // row, and starts again once the row has turned, holding a moment first; never more often than once a half-turn.
  const rowEnd = W - 40, spacing = 34, count = Math.floor((rowEnd - x0) / spacing) + 1, crossing = ((rowEnd - x0 + lambda) * share) / lambda;
  const cycle = Math.max(1, crossing + 0.6), front = x0 + (lambda / share) * (play.t % cycle), frontShown = Math.min(rowEnd, front);
  // Each zepton turns through the share it needs, taking share of a lifetime, while the front moves one wavelength on.
  // A share too small to see is drawn as 14 degrees.
  const turnShown = Math.max(needed, 14);
  return <Diagram stage={
    <Stage w={W} h={H} label={`Above, a zepton turning through its whole half-turn, which spans its wavelength: the speed of light. Below, a row of zeptons each of which need turn only ${fmt(needed, 2)} degrees to pass a field on, so the field travels ${fmt(fieldSpeed(needed), 2)} times as fast.`}>
      <T x={x0 - 30} y={34} anchor="start" size="sm" tone="mark">matter or light: each zepton makes its whole half-turn, so it goes at c</T>
      <Zepton x={x0 + lambda / 2} y={yTop} angle={180 - 180 * u} len={lambda} open={Math.max(0.12, Math.sin(Math.PI * u))} polarity="matter" signs emphasis="key"/>
      <Spin x={x0 + lambda / 2} y={yTop - 12} r={lambda * 0.3 + 26} ccw={false} from={160} sweep={140}/>
      <Arrow x1={x0} y1={yTop + lambda / 2 + 18} x2={x0 + lambda} y2={yTop + lambda / 2 + 18} both tone="mark" w={1.6} head={7}/>
      <T x={x0 + lambda / 2} y={yTop + lambda / 2 + 42} tone="mark">d = λ = c/ν</T>
      <T x={x0 + lambda + 30} y={yTop + 5} anchor="start" size="sm">turned {Math.round(u * 180)}° of 180°</T>
      <line x1={x0 - 30} y1={yRow - 70} x2={W - 20} y2={yRow - 70} className="bk-s-faint"/>
      <T x={x0 - 30} y={yRow - 46} anchor="start" size="sm" tone="e">a field: each zepton need turn only {halvings === 0 ? '180°' : `180°/${2 ** halvings}`}, so the field goes {fmt(fieldSpeed(needed), 2)} times as fast</T>
      {Array.from({ length: count }, (_, i) => {
        const x = x0 + i * spacing, reached = x <= front, done = clamp((front - x) / lambda);
        return <Zepton key={i} x={x} y={yRow} angle={turnShown * done} len={24} polarity="matter" signs={false} opacity={reached ? 1 : 0.4}/>;
      })}
      {front < rowEnd + spacing && <line x1={frontShown} y1={yRow - 26} x2={frontShown} y2={yRow + 26} className="bk-s-e" strokeWidth="2.5" strokeDasharray="5 4"/>}
      <Arrow x1={x0} y1={yRow + 40} x2={x0 + lambda} y2={yRow + 40} both tone="mark" w={1.2} head={6}/><T x={x0 + lambda / 2} y={yRow + 60} size="sm" tone="mark">one wavelength, for scale</T>
      {needed < 14 && <T x={W - 30} y={yRow + 60} anchor="end" size="sm" tone="muted">(each zepton’s turn drawn magnified)</T>}
    </Stage>}>
    <Slider label="Share of a half-turn a field needs" value={-halvings} min={-5} max={0} step={1} onChange={v => setHalvings(-v)} show={v => (v === 0 ? 'all 180°' : `180° / ${2 ** -v}`)}/>
    <PlayBar play={play} label="the zeptons"/>
    <Readout label="Speed of what needs a whole half-turn" value="c"/>
    <Readout label="Speed of the field" value={`${fmt(fieldSpeed(needed), 2)} c`} tone="e"/>
    <Remark>{halvings === 0 ? 'Needing the whole half-turn, the field would go no faster than light.' : 'If the polarization needs only a small fraction of the turn, it is passed on that many times faster. The real figure has not been determined.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 19,
  summary: <>
    <p>If gravity crossed space no faster than light, the force on a planet would point to where the star used to be, and orbits would not hold. Astronomy puts the speed at <Q>a minimum 2 x 10<sup>10</sup> times the speed of light</Q> (<Pg n={149}/>). In Fleming’s model the Newtonian force is three forces, so all three fields must travel that fast, and he argues that the fields of a single photon do too.</p>
    <p>The explanation is in what a zepton has to do. To carry matter or a photon it must make its full half-turn, which spans its wavelength in its lifetime: that is the speed of light, <Q>a fundamental property of vacuum fluctuations</Q> (<Pg n={146}/>). To pass on a field it need turn only a tiny fraction of a degree, and that can spread through the field far faster.</p>
  </>,
  items: [
    {
      kind: 'figure', id: '19-1', page: 142, section: 'History of the Speed of Gravity', title: 'A force that arrives late',
      caption: 'If gravity interacts between a star and a planet at point A, but it is really at point B then the force will be in the wrong direction, not directed toward the star.',
      Diagram: LateGravity,
      text: <>
        <p><Q>If gravity is not instantaneous, the force looks like it is coming from point A when the body is really at point B some distance away. This causes the body at point B [to] have a force F on it that [is] not directed toward the Star</Q>. In Eddington’s words, the couple <Q>will tend to increase the angular momentum of the system, and, acting cumulatively, will soon cause an appreciable change of period</Q>. <Q>The speed of light as it turns out is too slow by many orders of magnitude</Q> (<Pg n={142}/>, <Pg n={143}/>).</p>
        <p>Fleming’s charge against general relativity is that it needs space to know where all the matter is, nearly instantly, and so breaks the limit it is built on (<Pg n={144}/>).</p>
      </>,
      tryThis: ['Leave the speed at c: the orbit would double in size in a few hundred years.', 'Raise the speed. At Laplace’s 7 × 10⁶ c the doubling takes billions of years; at Van Flandern’s 2 × 10¹⁰ c, far longer than the age of the solar system.', 'Slide the speed all the way up, to infinite (Newton’s case, no delay at all): the force points at the star and the orbit holds.'],
      notes: <p>The numbers are for a planet moving at the Earth’s speed, 29.8 km/s. The lag is that speed divided by the speed of gravity, and the orbit’s growth follows from the part of the force along the motion; the book gives the argument and the two bounds, not this calculation. The orbit is drawn at a fixed size, its growth given only as the doubling time, and the angle between A and B is magnified.</p>,
    },
    {
      kind: 'figure', id: '19-2', page: 145, section: 'The Speed of Long-Range Van der Waals Gravity', title: 'How far a photon’s field gets',
      caption: 'A photon propagating in the x direction as indicated by the black central zepton, which is surrounded by zeptons oriented and rotating with respect to the photon’s electric and magnetic fields.',
      Diagram: PhotonReach,
      text: <>
        <p>The fields of the central zepton <Q>propagate outward at a 90-degree angle to each other, while also perpendicular to the direction that the photon is moving</Q>, and the field <Q>declines in strength at a rate proportional to the inverse of the distance squared</Q> (<Pg n={145}/>).</p>
        <p>The fields <Q>are also extinguished each half wavelength along with the central zepton. Even so, the electric and magnetic fields are detectable at more than half a wavelength distance off to the side of the photon’s path. But remember that the half wavelength distance is related to the speed of light. That means that the electric and magnetic fields of the photon are propagating faster than the speed of light</Q> (<Pg n={146}/>).</p>
      </>,
      tryThis: ['Set the speed to 1 c: the sphere shrinks onto the red ring, half a wavelength out.', 'Raise the speed: the field reaches further and further to the side of the path in the same brief life.', 'Drag the figure round to look along the photon’s path, or across it.'],
      notes: <p>Drawn in three dimensions with the printed figure’s axes, as a much simplified form of the laboratory’s light scene: the photon a sequence of central zeptons along x, its fields trailing behind, and a sphere for how far the field gets. The printed figure’s surrounding zeptons are left out for clarity. Beyond about 5 c the sphere and the half-wavelength ring are drawn to a smaller common scale, so the ring shrinks within the sphere; up to 100 c can be shown, where Fleming’s lower bound is 2 × 10¹⁰ c. Where 3D cannot be drawn, the figure is shown flat, looking along the photon’s path, with the surrounding zeptons; their lean is magnified (the square root of the inverse-square field) so that distant ones can be seen to turn.</p>,
      labs: [{ lab: 'light', scenario: 'absorption', query: 'L=+cone', why: 'The light cone at an absorbing wall: how little of the field’s energy could arrive if fields kept to the speed of light.' }],
    },
    {
      kind: 'figure', id: '19-3', page: 147, title: 'One photon, two slits, the same time',
      caption: 'A photon moving from point A to B polarized in the plane of the surface of the page.',
      Diagram: TwoSlits,
      text: <>
        <p>With nothing in the way a photon reaches B in a time <i>t</i> set by the speed of light. Put a wall between, with two slits equidistant from the straight path, and <Q>it will still take the same time t even though the photon has to travel through slits offset from the direct path</Q> (<Pg n={146}/>).</p>
        <p><Q>The information of the photon, the magnetic and electric fields, travels through the slits, but the propagation of those fields in a direction perpendicular to the direction of the photon happens at a rate much faster than the speed of light.</Q> If it did not, <Q>the fields would only go out a half wavelength to either side of the photon’s path</Q>, and <Q>The fields, and thus the photon, could never make it through the slits</Q> (<Pg n={147}/>).</p>
      </>,
      tryThis: ['Run it with the wall and fast fields: the zeptons the field reaches brighten and turn with the central pair, the dotted routes through each slit are the way the fields go, and the photon arrives on time.', 'Compare the two readouts of distance: the way by a slit is longer, yet the time is the straight-line time.', 'Switch the fields to “At c”. The shaded band is all they can cover; it misses the slits, and the photon halts at the wall.', 'Remove the wall: A to B in the same time.'],
      notes: <p>This is the laboratory’s double-slit drawing, with a quarter of its surrounding zeptons. That the central pairs keep to the straight line while the field passes the slits is the laboratory’s reading (docs/double-slit-model.md): Fleming says the photon takes the same time <i>t</i> and that its fields travel through the slits, and does not say where the central zeptons go at the wall. No interference pattern is drawn, because the chapter does not derive one. What becomes of the energy when the fields are held to c he does not say either.</p>,
      labs: [
        { lab: 'double-slit', scenario: 'slits', why: 'This figure as a laboratory: the surrounding zeptons, the field at B through the run, and the slit geometry to change.' },
        { lab: 'double-slit', scenario: 'light-speed', why: 'The counterfactual: fields held to the speed of light, and nothing reaching the slits.' },
      ],
    },
    {
      kind: 'figure', id: '19-4', page: 148, title: 'A half-turn is the speed of light; a field needs far less',
      caption: 'A zepton rotating 180 degrees occupies a maximum distance d equal to its wavelength.',
      Diagram: HalfTurn,
      text: <>
        <p><Q>If a zepton has to rotate 180 degrees during its life, then the velocity of propagation in the direction of rotation is the speed of light.</Q> <Q>The maximum distance d a zepton can occupy in space during the time it exists is equal to its wavelength λ, which is equal to the speed of light c divided by the zepton frequency ν</Q> (<Pg n={147}/>).</p>
        <p>A field is different. <Q>Zeptons only have to rotate a fraction of a degree during a fraction of the time they exist in order to produce the field.</Q> <Q>For example, if the average polarization only requires 180/10<sup>20</sup> degrees of rotation then the polarization can propagate at 10<sup>20</sup> times the speed of light</Q>, which would need the vacuum to hold at least 10²⁰ times the charge of the permanent charges involved. The example <Q>may be nowhere close to the real propagation speed, which has not been determined</Q> (<Pg n={148}/>).</p>
      </>,
      tryThis: ['Watch the two together: at 180°/8 the field’s front runs eight wavelengths down the row in the time the zepton above makes its half-turn.', 'Lower the share to 180°/32: the front crosses the whole row while the half-turn above has barely begun. Fleming’s example, 180°/10²⁰, would be far too fast to see.', 'Set it to all 180°: each zepton in the row makes a whole half-turn, and the field is held to the speed of light, a wavelength per half-turn, keeping pace with the zepton above.'],
      notes: <p>The printed zepton is labelled m− and a+, an electron-like pair, and is drawn here by its matter ends. The row of zeptons below is an illustration of the argument, which the text gives in words; each zepton turns through the share it needs, completing it as the front moves a wavelength on, and a share too small to see is drawn as 14°.</p>,
      labs: [{ lab: 'medium', scenario: 'slow', why: 'Zeptons of low frequency followed through a half-turn, opening to their wavelength.' }],
    },
  ],
  labs: [{ lab: 'double-slit', scenario: 'slits', why: 'The chapter’s central argument as a laboratory.' }],
};
export default chapter;
