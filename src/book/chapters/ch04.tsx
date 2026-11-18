// Chapter 4: What is a Virtual Photon? (PDF pp. 33–42). Figures 4-1 to 4-9.
import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Arrow, Choice, Diagram, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, T, Toggle, Vector, Zepton, clamp, fmt, pathThrough, percentOfPeak, polar, rng, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { PairView } from '../three/PairScene';
import type { ChapterContent } from '../types';

const H_EV = 4.135667696e-15, C = 299792458;

/** Figure 4-1: the Dirac sea as pairs either side of zero energy, each lasting a time set by its energy. */
function DiracSea() {
  const [level, setLevel] = useState(0.55);
  const play = usePlayback();
  const W = 720, H = 330, zero = 170, x0 = 80;
  const pairs = useMemo(() => { const random = rng(41); return Array.from({ length: 7 }, (_, i) => ({ x: x0 + 70 + i * 82 + (random() - 0.5) * 22, e: 0.25 + random() * 0.75, phase: random() })); }, []);
  // A pair's energy and the time it lasts multiply to the same amount (ΔEΔt = h/2), so a higher pair is briefer.
  const dot = (x: number, e: number, phase: number, key: string, marked: boolean) => {
    const life = ((play.t * 0.5 * e) + phase) % 1, out = Math.sin(Math.PI * life), dy = e * 118 * out, r = 5 + 7 * (1 - e) + (marked ? 2 : 0);
    return <g key={key} opacity={0.3 + 0.7 * out}>
      <line x1={x} y1={zero - dy} x2={x} y2={zero + dy} className={marked ? 'bk-s-mark' : 'bk-s-faint'} strokeWidth="1" strokeDasharray="2 3"/>
      <circle cx={x} cy={zero - dy} r={r} className="bk-f-pos"/><circle cx={x} cy={zero + dy} r={r} className="bk-f-neg"/>
      {marked && <circle cx={x} cy={zero - dy} r={r + 4} className="bk-s-mark" fill="none" strokeWidth="1.5"/>}
    </g>;
  };
  return <Diagram stage={
    <Stage w={W} h={H} label="The Dirac sea: virtual particle pairs appear on opposite sides of a line of zero energy, move apart and return. Pairs of higher energy last a shorter time.">
      <Arrow x1={x0} y1={H - 22} x2={x0} y2={22} tone="muted" w={2}/><T x={x0 - 16} y={34} tone="text" size="lg">E</T>
      <line x1={x0} y1={zero} x2={W - 30} y2={zero} className="bk-s-text" strokeWidth="3"/><T x={x0 - 16} y={zero + 5} tone="text">0</T>
      <T x={W - 36} y={48} anchor="end" size="sm" tone="pos">positive: matter</T>
      <T x={W - 36} y={H - 34} anchor="end" size="sm" tone="neg">negative: antimatter</T>
      {pairs.map((p, i) => dot(p.x, p.e, p.phase, `p${i}`, false))}
      {dot(x0 + 34, level, 0, 'marked', true)}
    </Stage>}>
    <Slider label="Energy of the marked pair" value={level} min={0.2} max={1} step={0.01} onChange={setLevel} show={v => `${fmt(v / 0.2, 2)} × the lowest`}/>
    <PlayBar play={play} label="the pairs"/>
    <Readout label="Time the marked pair lasts" value={`${fmt(0.2 / level, 2)} × the longest`}/>
    <Readout label="Energy × time" value="h/2, whatever the energy" tone="good"/>
  </Diagram>;
}

/** A dipole of the sea in Figure 4-2: a place, a size, and a new random direction and sense of turning each time it forms. */
interface SeaPair { x: number; y: number; len: number; phase: number; seed: number }

/** Figure 4-2: the sea as electric dipoles of many sizes, each turning half a turn through its short life, at random. */
function DipoleSea() {
  const play = usePlayback();
  const W = 720, H = 360;
  const sea = useMemo(() => {
    const random = rng(7), list: SeaPair[] = [];
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 11; gx++) list.push({ x: 40 + gx * 64 + (random() - 0.5) * 34, y: 34 + gy * 58 + (random() - 0.5) * 30, len: 16 + random() * 26, phase: random(), seed: Math.floor(random() * 1e6) });
    return list;
  }, []);
  return <Diagram stage={
    <Stage w={W} h={H} label="Virtual particle pairs fill space as electric dipoles of many sizes. Each forms pointing a random way, turns half a turn as it opens and closes, and is gone.">
      {sea.map((p, i) => {
        const cycle = play.t * (14 / (p.len + 6)) + p.phase, generation = Math.floor(cycle), life = cycle - generation;
        // Each generation forms at a random angle and turns 180° over its life (p. 39), one way or the other at random.
        const random = rng(p.seed + generation * 97), born = random() * 360, sense = random() < 0.5 ? -1 : 1;
        return <Zepton key={i} x={p.x} y={p.y} angle={born + sense * 180 * life} len={p.len} open={Math.sin(Math.PI * life)} signs={p.len > 30} opacity={Math.min(1, 1.6 * Math.sin(Math.PI * life))}/>;
      })}
    </Stage>}>
    <PlayBar play={play} label="the dipoles"/>
    <Remark>Each pair forms pointing a random way, turns half a turn as it opens and closes, and is gone. No direction is favoured.</Remark>
  </Diagram>;
}

/** One of the proposals Fleming tests in Figures 4-3 to 4-7. */
type Proposal = 'full' | 'half' | 'quarter' | 'eighth' | 'single';

/** Each proposal: how far a photon goes out (in wavelengths), how many photons, and Fleming's verdict. */
export const PROPOSALS: Record<Proposal, { figure: string; reach: number; photons: 1 | 2; returns: boolean; label: string; tick: string; verdict: string }> = {
  full: { figure: '4-3', reach: 1, photons: 2, returns: true, label: 'Pair, out one wavelength', tick: 'λ', verdict: 'Four wavelengths in all: eight times the energy-time allowed.' },
  half: { figure: '4-4', reach: 0.5, photons: 2, returns: true, label: 'Pair, out half a wavelength', tick: '½λ', verdict: 'Four half wavelengths, two wavelengths in all: still four times the amount allowed.' },
  quarter: { figure: '4-5', reach: 0.25, photons: 2, returns: true, label: 'Pair, out a quarter wavelength', tick: '¼λ', verdict: 'Still twice the amount allowed, and each photon is turned back along its own path, cancelling itself.' },
  eighth: { figure: '4-6', reach: 0.125, photons: 2, returns: false, label: 'Pair, out an eighth wavelength', tick: 'λ/8', verdict: 'The correct energy-time at last, but a wave turned back at an eighth of its wavelength does not return to the start: the two cannot recombine.' },
  single: { figure: '4-7', reach: 0.5, photons: 1, returns: false, label: 'Single photon, half a wavelength', tick: '½λ', verdict: 'The correct energy-time, but a single photon has no antimatter photon to be produced with, or annihilated by.' },
};

/**
 * The energy-time of a proposal in units of h: a photon has Et = h for each wavelength it covers (Equation 4-3). A
 * pair that goes out and back covers four times its reach; Fleming counts the single photon as one half wavelength.
 */
export const energyTime = (p: Proposal) => (PROPOSALS[p].photons === 2 ? 4 * PROPOSALS[p].reach : PROPOSALS[p].reach);

/** The allowance for a vacuum fluctuation, in units of h (Equation 4-1). */
export const ALLOWED = 0.5;

/** Figures 4-3 to 4-7: one proposal for a fluctuation made of photons, with its energy-time counted against the allowance. */
function PhotonProposal({ proposal }: { proposal: Proposal }) {
  const spec = PROPOSALS[proposal], play = usePlayback({ speed: 0.28 });
  const pair = spec.photons === 2, W = 720, H = 300, cx = pair ? 360 : 110, axis = 200, mid = 120, span = pair ? 270 : 480, amp = 34;
  const u = play.t % 1, total = energyTime(proposal), ratio = total / ALLOWED;
  // The path is the photon's own wave: one wavelength is span / reach wide. A photon of a pair goes out below the line
  // on the right (above it on the left) and comes back along the mirror image (Figures 4-3 and 4-4), or along the same
  // curve (Figure 4-5). The single photon of Figure 4-7 goes out along the top of its loop.
  const wave = (s: number, side: 1 | -1, back: boolean) => {
    const mirrored = back && proposal !== 'quarter' ? -1 : 1, top = pair ? 1 : -1;
    return [cx + side * s, mid + amp * Math.sin((2 * Math.PI * s * spec.reach) / span) * side * mirrored * top] as const;
  };
  const curve = (side: 1 | -1, back: boolean) => pathThrough(Array.from({ length: 61 }, (_, i) => wave((i / 60) * span, side, back)));
  const sides: (1 | -1)[] = pair ? [1, -1] : [1];
  // Where a photon is on its trip. Only the eighth-wavelength pair has no way back: it goes out and is left there.
  const stuck = proposal === 'eighth', out = stuck ? Math.min(1, u * 1.7) : u < 0.5 ? u * 2 : 2 - u * 2, back = !stuck && u >= 0.5, stranded = stuck && u > 0.6;
  // The tally: each wavelength covered adds h. The eighth-wavelength pair has the right energy-time, h/2, reached as its
  // photons go out (and they never come back); the single photon is counted, as in the text, for its one half wavelength.
  const covered = stuck ? total * out : proposal === 'single' ? total * Math.min(1, u * 2) : total * u;
  const ticks: [number, string][] = pair ? (proposal === 'full' ? [[-1, 'λ'], [-0.5, '½λ'], [0, '0'], [0.5, '½λ'], [1, 'λ']] : [[-1, spec.tick], [0, '0'], [1, spec.tick]]) : [[0, '0'], [1, spec.tick]];
  const bar = (amount: number) => (Math.min(4, amount) / 4) * 600;
  return <Diagram stage={
    <Stage w={W} h={H} label={`${spec.label}. ${spec.verdict}`}>
      <line x1={40} y1={axis} x2={W - 40} y2={axis} className="bk-s-text" strokeWidth="2.5"/>
      {ticks.map(([k, label]) => <g key={k}><line x1={cx + k * span} y1={axis - 12} x2={cx + k * span} y2={axis + 12} className="bk-s-text" strokeWidth="2.5"/><T x={cx + k * span} y={axis + 34} tone="text">{label}</T></g>)}
      {sides.map(side => {
        const [x, y] = wave(out * span, side, back);
        return <g key={side}>
          <Line d={curve(side, false)} tone="muted" w={1.6}/>
          {(spec.returns && proposal !== 'quarter' || proposal === 'single') && <Line d={curve(side, true)} tone="muted" w={1.6}/>}
          <circle cx={x} cy={y} r={7} className={stranded ? 'bk-f-danger' : 'bk-f-mark'} opacity={stranded ? 0.4 + 0.6 * Math.abs(Math.sin(play.t * 9)) : 1}/>
        </g>;
      })}
      {pair && <ellipse cx={cx} cy={mid} rx={9} ry={6} className="bk-f-text"/>}
      {stranded && <T x={cx} y={54} tone="danger">no way back to the centre</T>}
      {proposal === 'quarter' && <T x={cx} y={54} size="sm">the way back is the way out</T>}
      {proposal === 'single' && <T x={cx + span / 2} y={54} size="sm">one photon: nothing to be produced with</T>}
      {/* The tally against the allowance. */}
      <rect x={60} y={258} width={600} height={14} rx={3} className="bk-fill-soft"/>
      {stuck && <rect x={60} y={258} width={bar(total)} height={14} rx={3} className="bk-s-accent" fill="none" strokeDasharray="4 3"/>}
      <rect x={60} y={258} width={bar(covered)} height={14} rx={3} className={total > ALLOWED ? 'bk-f-danger' : 'bk-f-accent'}/>
      <line x1={60 + bar(ALLOWED)} y1={250} x2={60 + bar(ALLOWED)} y2={280} className="bk-s-accent" strokeWidth="2"/>
      <T x={60 + bar(ALLOWED) + 6} y={293} anchor="start" size="sm" tone="accent">allowed: h/2</T>
      <T x={60} y={250} anchor="start" size="sm">energy × time used</T>
      <T x={660} y={293} anchor="end" size="sm">4h</T>
    </Stage>}>
    <PlayBar play={play} label="the photons"/>
    <Readout label="Wavelengths in all" value={`${Number(total.toFixed(3))} λ`}/>
    <Readout label="Energy × time" value={`${Number(total.toFixed(3))} h`} tone={total > ALLOWED ? 'bad' : 'good'}/>
    <Readout label="Against the allowance" value={ratio === 1 ? 'exactly h/2' : `${ratio} × too much`} tone={ratio === 1 ? 'good' : 'bad'}/>
    <Remark tone="bad">{spec.verdict}</Remark>
  </Diagram>;
}

/** A diagram component for one proposal. */
const proposal = (p: Proposal) => function Proposed() { return <PhotonProposal proposal={p}/>; };

/** Figure 4-8: the Feynman picture of a pair within a photon, with the electron going forward and the positron back. */
function PairInPhoton() {
  const [turning, setTurning] = useState(false);
  const play = usePlayback({ speed: 0.3 });
  const W = 720, H = 250, y = 110, a = 290, b = 430, rx = 70, ry = 26, cx = (a + b) / 2;
  const wavy = (from: number, to: number) => pathThrough(Array.from({ length: 41 }, (_, i) => { const x = from + ((to - from) * i) / 40; return [x, y - 12 * Math.sin(((x - from) / 62) * Math.PI * 2)] as const; }));
  const u = play.t % 1, third = 1 / 3;
  // The energy runs along the wavy line, through the pair, and on. Within the pair the electron goes with the photon
  // along the top of the loop while the positron goes against it along the bottom.
  const phase = u < third ? 0 : u < 2 * third ? 1 : 2, k = (u - phase * third) / third;
  const along = (from: number, to: number) => { const x = from + (to - from) * k; return [x, y - 12 * Math.sin(((x - from) / 62) * Math.PI * 2)] as const; };
  const [ex, ey] = polar(cx, y, 1, 180 - 180 * k), [px, py] = polar(cx, y, 1, -180 * k);
  return <Diagram stage={
    <Stage w={W} h={H} label="A photon travels from left to right as a wavy line. In the middle it is a virtual electron-positron pair: the electron moves with the photon and the positron against it.">
      <Line d={wavy(40, a)} tone="e" w={2}/><Line d={wavy(b, 680)} tone="e" w={2}/>
      <ellipse cx={cx} cy={y} rx={rx} ry={ry} className="bk-s-muted" fill="none" strokeWidth="1.6"/>
      <Arrow x1={cx - 8} y1={y - ry} x2={cx + 8} y2={y - ry} tone="neg" w={0.1} head={10}/><Arrow x1={cx + 8} y1={y + ry} x2={cx - 8} y2={y + ry} tone="pos" w={0.1} head={10}/>
      <T x={cx} y={y - ry - 12} size="sm" tone="neg">electron, with the photon</T><T x={cx} y={y + ry + 22} size="sm" tone="pos">positron, against it</T>
      <T x={150} y={y + 44} size="sm" tone="e">photon</T><T x={570} y={y + 44} size="sm" tone="e">photon</T>
      {phase === 0 && (() => { const [x, yy] = along(40, a); return <circle cx={x} cy={yy} r={7} className="bk-f-mark"/>; })()}
      {phase === 2 && (() => { const [x, yy] = along(b, 680); return <circle cx={x} cy={yy} r={7} className="bk-f-mark"/>; })()}
      {phase === 1 && !turning && <>
        <circle cx={cx + (ex - cx) * rx} cy={y + (ey - y) * ry} r={7} className="bk-f-neg"/>
        <circle cx={cx + (px - cx) * rx} cy={y + (py - y) * ry} r={7} className="bk-f-pos"/>
      </>}
      {turning && <>
        <Zepton x={cx} y={y} angle={phase === 1 ? -180 * k : phase === 0 ? 0 : -180} len={76} open={phase === 1 ? Math.max(0.25, Math.sin(Math.PI * k)) : 0.25} oval={false} signs opacity={phase === 1 ? 1 : 0.35}/>
        {phase === 1 && <Spin x={cx} y={y} r={48} ccw={false} from={150} sweep={120}/>}
      </>}
      <T x={cx} y={228} size="sm">{turning ? 'Read as one pair turning half a turn: its electron moves forward, its positron back.' : 'The loop is the pair; the wavy line is the photon either side of it.'}</T>
    </Stage>}>
    <PlayBar play={play} label="the photon"/>
    <Toggle label="Show the pair as a half-turn" checked={turning} onChange={setTurning}/>
    <Remark>A photon, during half a wavelength, can be thought of as a virtual electron-positron pair that rotates 180 degrees.</Remark>
  </Diagram>;
}

/** The transverse field of a pair that has turned through an angle (degrees) of its half-turn: half a wave. */
export const pairField = (turned: number) => Math.sin((clamp(turned, 0, 180) * Math.PI) / 180);

/** Figure 4-9 drawn in three dimensions: loaded on demand, since three.js is large. */
const PairScene = lazy(() => import('../three/PairScene'));

/** Shows `fallback` in place of its children if they fail, such as the 3D scene's code failing to download. */
class FlatOnError extends Component<{ fallback: ReactNode; children: ReactNode; onError?(): void }, { failed: boolean }> {
  state = { failed: false };
  /** Switch to the fallback on any error below. */
  static getDerivedStateFromError() { return { failed: true }; }
  /** Tell the figure, so controls that only the 3D view has can step aside. */
  componentDidCatch() { this.props.onError?.(); }
  /** The children, or the fallback once they have failed. */
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** One pair's life is the half-turn (p. 39); then it is gone, and after a moment a new pair forms where it began. */
export const PAIR_CYCLE = 1.15;

/** Whether a seek with the angle slider shows the pair in full: only while paused, since playing carries on fading. */
export const sightedBySeek = (playing: boolean) => !playing;

/**
 * Where the pair is in its life at time `t` (in turns of the clock): the angle turned, and how fully it is there.
 * `fading` is false only when the reader has set the angle with the slider: then the pair is shown in full at any angle
 * up to 180°. Otherwise, playing or paused, it fades in as it forms and out as its turn ends, and between pairs there is
 * none, so pausing never changes the frame.
 */
export function pairLife(t: number, fading: boolean) {
  const local = t % PAIR_CYCLE, u = Math.min(1, local);
  const presence = local > 1 ? 0 : !fading ? 1 : clamp(Math.min(u, 1 - u) / 0.06, 0, 1);
  return { turned: u * 180, presence };
}

/** The printed page's view of Figure 4-9, drawn flat: the fallback where the browser cannot draw in three dimensions. */
function FlatPair({ turned, cw, presence, label }: { turned: number; cw: boolean; presence: number; label: string }) {
  const angle = cw ? 180 - turned : 180 + turned, field = pairField(turned), up = cw ? 1 : -1, cx = 360, cy = 150;
  return <Stage h={300} label={label}>
    <Spin x={cx} y={cy} r={62} ccw={!cw} from={cw ? 150 : 210} sweep={100}/>
    <Zepton x={cx} y={cy} angle={angle} len={84} oval={false} signs opacity={presence}/>
    {field * presence > 0.01 && <g opacity={presence}>
      <Vector x={cx + 100} y={cy} angle={90 * up} len={12 + 78 * field} centred tone="e" w={3}/><T x={cx + 124} y={cy + 5} tone="e" size="lg" anchor="start">E</T>
      <InOut x={cx - 104} y={cy} out={!cw} r={7 + 9 * field} opacity={0.3 + 0.7 * field}/><T x={cx - 104} y={cy + 40} tone="b" size="lg">B</T>
    </g>}
  </Stage>;
}

/** Figure 4-9: a rotating pair, its electric field in the plane of rotation and its magnetic field through it. */
function RotatingPair() {
  const [sense, setSense] = useState<'cw' | 'ccw'>('cw');
  const [view, setView] = useState<PairView>('turned');
  const [flat, setFlat] = useState(false);
  const fail = useCallback(() => setFlat(true), []);
  const [sought, setSought] = useState(false);
  const play = usePlayback({ speed: 0.25 });
  useEffect(() => { if (play.playing) setSought(false); }, [play.playing]);
  // Setting the angle by hand shows the pair in full; playing again lets it fade at the ends of its turn as before.
  const { turned, presence } = pairLife(play.t, play.playing || !sought), cw = sense === 'cw';
  const field = pairField(turned), up = cw ? 1 : -1;
  const px = 70, pw = 580, py = 70;
  const trace = pathThrough(Array.from({ length: 61 }, (_, i) => [px + (pw * i) / 60, py - up * 50 * pairField(i * 3)] as const));
  const label = `A virtual electron-positron pair rotating ${cw ? 'clockwise' : 'counter-clockwise'} on the page, turned ${Math.round(turned)}° of its half-turn. Its electric field lies in its plane of rotation, pointing ${up > 0 ? 'up' : 'down'} the page; its magnetic field lies along the axis of rotation, ${cw ? 'into' : 'out of'} the page.`;
  return <Diagram stage={<>
    {flat
      ? <FlatPair turned={turned} cw={cw} presence={presence} label={label}/>
      : <FlatOnError onError={fail} fallback={<FlatPair turned={turned} cw={cw} presence={presence} label={label}/>}>
          <Suspense fallback={<FlatPair turned={turned} cw={cw} presence={presence} label={label}/>}>
            <PairScene state={{ turned, cw, field, presence, showSpin: !play.playing, view }} onFail={fail} description={`${label} Drag to turn the view.`}/>
          </Suspense>
        </FlatOnError>}
    <Stage h={140} label={`E through the pair's half-turn: zero along the path, greatest across it at 90°, zero again at 180°. Now at ${Math.round(turned)}°.`}>
      <line x1={px} y1={py} x2={px + pw} y2={py} className="bk-s-faint" strokeWidth="1"/>
      <Line d={trace} tone="e" w={2} opacity={0.45}/>
      <circle cx={px + (pw * turned) / 180} cy={py - up * 50 * field} r={6} className="bk-f-e" opacity={presence}/>
      <T x={px - 10} y={py + 5} size="sm" anchor="end" tone="e">E</T>
      <T x={px} y={py + 66} size="sm" anchor="start">0°</T><T x={px + pw} y={py + 66} size="sm" anchor="end">180°</T><T x={px + pw / 2} y={py + 66} size="sm">the half-turn: half a wavelength of the photon (B follows the same curve)</T>
    </Stage>
  </>}>
    {!flat && <Choice label="View" value={view} onChange={setView} options={[{ value: 'turned', label: 'Turned' }, { value: 'page', label: 'As printed' }, { value: 'path', label: 'Along path' }]}/>}
    <Choice label="Rotation" value={sense} onChange={setSense} options={[{ value: 'cw', label: 'Clockwise' }, { value: 'ccw', label: 'Counter' }]}/>
    <PlayBar play={play} label="the rotation"/>
    <Slider label="Angle turned" value={Math.round(turned)} min={0} max={180} step={1} onChange={v => { setSought(sightedBySeek(play.playing)); play.seek(v / 180); }} unit="°"/>
    <Readout label={`E, in the plane of rotation, ${up > 0 ? 'up' : 'down'} the page`} value={percentOfPeak(field)} tone="e"/>
    <Readout label={`B, along the axis, ${cw ? 'into' : 'out of'} the page`} value={percentOfPeak(field)} tone="b"/>
  </Diagram>;
}

/** Explorer: a pair of half the photon's wavelength carries the photon's energy (Equations 4-4 to 4-6). */
function PairEnergy() {
  const [nm, setNm] = useState(500);
  const photon = (H_EV * C) / (nm * 1e-9), pairWavelength = nm / 2, pairFrequency = C / (pairWavelength * 1e-9), pair = (H_EV * pairFrequency) / 2;
  const scale = 0.5, x0 = 60, y = 86;
  return <Diagram stage={
    <Stage h={230} label={`A photon of wavelength ${nm} nanometres and a pair of wavelength ${pairWavelength} nanometres. Both carry ${fmt(photon, 3)} electron volts.`}>
      <Line d={pathThrough(Array.from({ length: 121 }, (_, i) => [x0 + (i / 120) * nm * scale, y - 30 * Math.sin((i / 120) * 2 * Math.PI)] as const))} tone="e" w={2.2}/>
      <Arrow x1={x0} y1={y + 52} x2={x0 + nm * scale} y2={y + 52} both tone="e" w={1.4} head={6}/><T x={x0 + (nm * scale) / 2} y={y + 72} tone="e" size="sm">photon wavelength λ_ph = {nm} nm</T>
      <Zepton x={x0 + (nm * scale) / 4} y={y} angle={0} len={(nm * scale) / 2} oval={false} signs/>
      <Arrow x1={x0} y1={y + 96} x2={x0 + (nm * scale) / 2} y2={y + 96} both tone="mark" w={1.4} head={6}/><T x={x0 + (nm * scale) / 4} y={y + 116} tone="mark" size="sm" anchor={nm < 420 ? 'start' : 'middle'}>pair wavelength λ_z = {pairWavelength} nm</T>
    </Stage>}>
    <Slider label="Photon wavelength" value={nm} min={250} max={1200} step={10} onChange={setNm} unit="nm"/>
    <Readout label={<>Photon, <V>hc</V>/λ_ph</>} value={`${fmt(photon, 3)} eV`} tone="e"/>
    <Readout label={<>Pair, <V>h</V>ν_z/2</>} value={`${fmt(pair, 3)} eV`} tone="good"/>
    <Remark tone="good">The same at every wavelength: a pair carries a photon’s energy during half a wavelength.</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 4,
  summary: <>
    <p>Vacuum fluctuations have long been called virtual photons, which made the zero-point field seem electrically neutral and easy to ignore. Fleming tests that idea against the energy-time limit of chapter 2. A photon has an energy-time of <V>h</V> for each wavelength; a fluctuation is allowed <V>h</V>/2. No pair of photons fits, and a single photon cannot be made from nothing.</p>
    <p>What does fit is the Dirac sea: a virtual electron-positron pair that rotates half a turn, which gives the electric and magnetic field of a photon over half a wavelength. So the field is made of charged pairs, and <Q>The vacuum is polarizable</Q> (<Pg n={42}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '4-1', page: 34, section: 'Paul Dirac', title: 'Pairs either side of zero energy',
      caption: 'An illustration of the Dirac Sea where pairs of virtual particles exist on opposite sides of a line indicating zero energy. The black circles are positive and the gray are negative. We can also think of the 0 line being the division between matter and antimatter.',
      Diagram: DiracSea,
      text: <>
        <p>Dirac’s equation for the electron held a second solution, the positron, and he came to think of the vacuum as filled with electrons and positrons. <Q>He saw the positrons as holes in space. They can alternatively be viewed as anti-particles in positive space, since we do not have a reasonable model for a hole in space</Q> (<Pg n={34}/>). The diagram follows that second reading, as the caption does: the zero line divides matter from antimatter.</p>
        <p>The pairs are <Q>produced in pairs from out of nothing and then rush back together and annihilate, returning to nothing, all within the energy-time parameters of Planck and Heisenberg</Q>.</p>
      </>,
      tryThis: [
        'Watch a pair: both halves leave the zero line together, one up and one down, and return together.',
        'Raise the energy of the marked pair. It reaches further from zero and is gone sooner, so that energy × time stays at h/2.',
      ],
      notes: <p>The figure shows circles of different sizes at different distances from the line without saying what size means. Here distance from the line is the pair’s energy, lower-energy pairs are drawn larger, and each pair is shown leaving the line and returning; all three are display choices.</p>,
      labs: [{ lab: 'medium', scenario: 'sparse', why: 'Single fluctuations followed through their lives, with the energy and lifetime of each.' }],
    },
    {
      kind: 'figure', id: '4-2', page: 35, title: 'A sea of dipoles that answers to charge',
      caption: 'A different illustration of the Dirac Sea where virtual particle pairs are shown as oval shaped electric dipoles filling space.',
      Diagram: DipoleSea,
      text: <>
        <p>With pairs in place of photons, <Q>we see a vacuum filled with electric dipoles that can orient with respect to charge and rotate in response to charge motion</Q>. A field of this kind <Q>absolutely must interact with matter electromagnetically</Q> (<Pg n={34}/>).</p>
        <p>The pairs rotate. Later in the chapter Fleming says a pair <Q>rotates 180 degrees</Q> during a half-wavelength period (<Pg n={39}/>), and Figure 4-9 draws one turning.</p>
        <p>The Casimir effect of chapter 3 already depends on a polarizable vacuum, which favours this picture over the photon one (<Pg n={35}/>).</p>
      </>,
      tryThis: [
        'Look at the directions: there is no pattern. Each pair forms pointing its own way and turns its own way.',
        'Follow one pair: it opens from a point, turns half a turn, and closes again. Smaller pairs are quicker.',
        'Pause and look at the sea as Fleming drew it: ovals of every size, pointing every way.',
      ],
      notes: <p>The figure is a still of the sea. The half-turn through each pair’s life is p. 39’s; that each pair forms at a random angle and turns either way at random, and how long each lasts, are display choices. How the sea orients to a charge is drawn in chapter 6 (Figures 6-1, 6-2 and 6-14).</p>,
      labs: [
        { lab: 'medium', scenario: 'balanced', why: 'The sea in three dimensions, with creation rate, frequency and pair size to set.' },
        { lab: 'electron', scenario: 'stationary', why: 'The polarization round a single electron, built up generation by generation.' },
      ],
    },
    ...(['full', 'half', 'quarter', 'eighth', 'single'] as Proposal[]).map((p, i) => ({
      kind: 'figure' as const, id: PROPOSALS[p].figure, page: [36, 37, 37, 38, 38][i], section: i === 0 ? 'The Photon Mistake' : undefined,
      title: ['A photon pair, out a wavelength and back', 'Out half a wavelength and back', 'Out a quarter wavelength', 'Out an eighth of a wavelength', 'One photon, half a wavelength'][i],
      caption: [
        'A vacuum fluctuation as a photon pair originating at the center with each photon traveling out one full wavelength and then back one full wavelength. The arrows show the direction of propagation.',
        'A vacuum fluctuation as a photon pair with each photon traveling out a half wavelength from the center and then traveling back. The arrows show the direction of propagation.',
        'A vacuum fluctuation as a photon pair with each photon traveling out a quarter wavelength. The arrows show the direction of propagation. Note that the return path in this case exactly follows the outward path.',
        'A vacuum fluctuation as a photon pair with each photon traveling out an eighth wavelength from the center. The arrows show the direction of propagation. There is no viable return path in this case.',
        'A vacuum fluctuation as a single photon of a half wavelength. The arrows show the direction of propagation.',
      ][i],
      Diagram: proposal(p),
      text: [
        <>
          <p>Suppose a fluctuation is two photons that start at a centre, go out a wavelength, and come back to annihilate. The test is the energy-time allowed to a fluctuation, <V>ΔE</V><V>Δt</V> = <V>h</V>/2 (Equation 4-1), against that of a photon, which for one wavelength is <V>Et</V> = <V>h</V> (Equation 4-3) (<Pg n={36}/>).</p>
          <p><Q>Since each photon goes out one wavelength and back one wavelength, the total number of wavelengths is four, and the total energy-time is 4h.</Q> That is eight times the allowance, so this <Q>cannot be correct</Q> (<Pg n={37}/>).</p>
        </>,
        <p><Q>At a glance that looks more like what we would expect a vacuum fluctuation to look like. The problem is that there are still four half wavelengths, or two full wavelengths for a total energy-time of 2h, which is still four times the amount allowed</Q> (<Pg n={37}/>).</p>,
        <p>Here there are <Q>two photons being deflected back along their own paths effectively canceling themselves</Q>, as a quarter-wave filter removes a wavelength in optics, so the situation cannot exist. And there is <Q>still twice the energy allowed</Q> (<Pg n={37}/>, <Pg n={38}/>).</p>,
        <p><Q>Finally we have the correct energy-time, but there is no viable description of an eighth of a wavelength photon pair.</Q> A wave deflected at an eighth of its wavelength does not return to the starting point, so the two photons cannot recombine and annihilate. It was the only possibility with the right energy: <Q>Zero-point energy is not composed of virtual photon pairs</Q> (<Pg n={38}/>).</p>,
        <p>To get the energy-time right, <Q>we are limited to only a single half wavelength of a single photon</Q>. But a single photon cannot be produced out of a vacuum, <Q>as there is no antimatter photon</Q>, nor annihilated to return its energy. So fluctuations are not single photons either, and the search turns to <Q>a more fundamental particle pair than a photon</Q>: the electron-positron pair (<Pg n={38}/>, <Pg n={39}/>).</p>,
      ][i],
      tryThis: [
        ['Follow one photon: out along its wave to λ, back along the mirror image to the centre. Two photons do this, so four wavelengths are covered.', 'Watch the bar pass the h/2 mark almost at once and run on to 4h.'],
        ['Compare the bar with Figure 4-3: half as far, but still four times the allowance.', 'Count the half wavelengths as the photons move: two out, two back.'],
        ['Notice that there is only one curve on each side: the photon comes back along the path it went out on.', 'The bar ends at h, twice the allowance.'],
        ['Watch the bar stop exactly on the h/2 mark: the only pair that fits.', 'Then watch the photons: they reach an eighth of a wavelength and have no path home.'],
        ['The bar reaches h/2 and stops, as in Figure 4-6.', 'There is one dot, not two: nothing for it to have been produced with, and nothing to annihilate it.'],
      ][i],
      notes: i === 4
        ? <p>The loop in the printed figure carries arrows in both directions; the text counts it as one half wavelength, and the tally here follows the text. The speed is a display choice.</p>
        : <p>The paths follow the printed arrows: each photon goes out along one side of the line{i < 2 ? ' and back along the other' : ''}. The bar is the count in the text, one <V>h</V> for each wavelength covered; the speed is a display choice.</p>,
    })),
    {
      kind: 'figure', id: '4-8', page: 39, section: 'The Fundamental Description of a Photon', title: 'The pair inside the photon',
      caption: 'A virtual electron-positron pair as part of a photon.',
      Diagram: PairInPhoton,
      text: <>
        <p><Q>Physicists have known since the 1930s that a photon during a half-wavelength period can be thought of as a virtual electron-positron pair that rotates 180 degrees.</Q> In Feynman’s diagram the photon is the wavy line, travelling left to right, and the pair is the oval. <Q>The electron is moving in the same direction as the photon, while the positron is moving in the opposite direction</Q> (<Pg n={39}/>).</p>
        <p>Fleming’s step is to take this as <Q>the fundamental description of the photon</Q>, and not only as a device of quantum electrodynamics.</p>
      </>,
      tryThis: [
        'Follow the energy along the wavy line into the loop: the electron crosses the top in the photon’s direction while the positron crosses the bottom against it.',
        'Turn on “Show the pair as a half-turn”. The same two motions are those of the two ends of one pair turning through 180°, which is Figure 4-9.',
      ],
      notes: <p>That the loop’s two arrows are the two ends of one pair turning about a fixed centre is a reading of the figure. Fleming says the pair rotates 180 degrees and which way each particle moves; he does not say outright whether the pair turns where it formed or travels with the photon. The laboratory’s notes (docs/light-model.md) record both readings.</p>,
      labs: [{ lab: 'light', scenario: 'induction', query: 'cam=pair&split=pair', why: 'One pair of a photon seen close up as it forms, turns half a turn and hands on.' }],
    },
    {
      kind: 'figure', id: '4-9', page: 40, title: 'A rotating pair makes E and B',
      caption: 'As a virtual electron-positron pair rotates it produces an electric and magnetic field. Here the pair is shown rotating clockwise with the electric field pointing upward and the magnetic field pointing into the page.',
      Diagram: RotatingPair,
      text: <>
        <p><Q>A rotating virtual electron-positron pair produces an electric field in its plane of rotation and a magnetic field in the perpendicular direction. The electric and magnetic field is precisely equivalent to the known electric and magnetic fields of a photon during a half wavelength</Q> (<Pg n={39}/>).</p>
        <p>The names electron and positron are <Q>a mere convenience</Q>: these pairs <Q>exist over a continuum of energies and are not limited by the rest mass energy</Q> of the stable particles (<Pg n={40}/>).</p>
      </>,
      tryThis: [
        'In the 3D view, drag the picture to turn it. E lies in the plane the pair turns in; B lies along the axis it turns about, at right angles to both E and the path.',
        'Let the pair turn clockwise. E, toward the positive end, rises to its peak when the pair stands across the path and falls again: half a wave, drawn underneath. Then the pair is gone, and a new one forms where it began.',
        'Reverse the rotation. E points down and B comes out of the page: the next half wavelength of the photon, which Figure 5-1 sets in a row.',
        'Pause and set the angle to 90° (in the 3D view, choose “As printed” first): the moment the printed figure shows.',
      ],
      notes: <>
        <p>The caption says the magnetic field points into the page, but the printed figure marks B with a dot in a circle, the sign for out of the page. The diagram follows the caption, which agrees with the right-hand grip rule of chapter 6 for a clockwise rotation.</p>
        <p>The pair is drawn at one size, as printed. The laboratory also lets it open and close as it turns. That the field follows the sine of the angle turned is a reading of “equivalent to a photon during a half wavelength”.</p>
        <p>The three-dimensional view is ours; the printed figure is the page seen face on. E is drawn beside the pair, in its plane of rotation, and B through its centre, along the axis. Each pair lives for its half-turn and is gone; the moment before a new pair forms, and the fading in and out, are display choices.</p>
      </>,
      labs: [{ lab: 'light', scenario: 'induction', query: 'cam=pair', why: 'The same pair with its field measured at a probe as it turns.' }],
    },
    {
      kind: 'explorer', id: 'x4-1', page: 40, title: 'A pair carries the photon’s energy',
      Diagram: PairEnergy,
      text: <>
        <p>To stand for a photon over half its wavelength, the pair’s wavelength must be half the photon’s: λ<sub>z</sub> = λ<sub>ph</sub>/2 (Equation 4-4). The most energy a pair may have is that of the uncertainty principle, <V>E</V> = <V>h</V>ν<sub>z</sub>/2 (Equation 4-5). Putting one into the other (<Pg n={41}/>):</p>
        <Eq n="4-6"><Frac top={<><V>h</V>ν<sub>z</sub></>} bottom="2"/> = <Frac top={<V>hc</V>} bottom={<>2λ<sub>z</sub></>}/> = <Frac top={<V>hc</V>} bottom={<>λ<sub>ph</sub></>}/></Eq>
        <p><Q>This shows that an electron-positron pair carries the same energy as a photon during a half wavelength.</Q></p>
      </>,
      tryThis: ['Change the wavelength. The photon’s energy and the pair’s change together and stay equal.', 'Note the pair’s size against the wave: it spans half the photon’s wavelength, at any colour.'],
    },
  ],
  labs: [{ lab: 'light', scenario: 'induction', why: 'Where this chapter leads: a photon as pair after pair, each a half-turn.' }],
};
export default chapter;
