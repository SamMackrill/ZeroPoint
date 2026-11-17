// Chapter 4: What is a Virtual Photon? (PDF pp. 33–42). Figures 4-1 to 4-9.
import { useMemo, useState } from 'react';
import { Arrow, Charge, Choice, Diagram, Drag, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, T, Toggle, Vector, Zepton, bearing, clamp, fmt, lerpAngle, pathThrough, polar, rng, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';

const H_EV = 4.135667696e-15, C = 299792458;

/** Figure 4-1: the Dirac sea as pairs either side of zero energy, each lasting a time set by its energy. */
function DiracSea() {
  const [level, setLevel] = useState(0.55);
  const [reading, setReading] = useState<'holes' | 'anti'>('anti');
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
      <T x={W - 36} y={48} anchor="end" size="sm" tone="pos">positive: {reading === 'anti' ? 'matter' : 'electrons'}</T>
      <T x={W - 36} y={H - 34} anchor="end" size="sm" tone="neg">negative: {reading === 'anti' ? 'antimatter' : 'holes in space'}</T>
      {pairs.map((p, i) => dot(p.x, p.e, p.phase, `p${i}`, false))}
      {dot(x0 + 34, level, 0, 'marked', true)}
    </Stage>}>
    <Slider label="Energy of the marked pair" value={level} min={0.2} max={1} step={0.01} onChange={setLevel} show={v => `${fmt(v / 0.2, 2)} × the lowest`}/>
    <Choice label="Read the lower half as" value={reading} onChange={setReading} options={[{ value: 'anti', label: 'Antimatter' }, { value: 'holes', label: 'Holes' }]}/>
    <PlayBar play={play} label="the pairs"/>
    <Readout label="Time the marked pair lasts" value={`${fmt(0.2 / level, 2)} × the longest`}/>
    <Readout label="Energy × time" value="h/2, whatever the energy" tone="good"/>
  </Diagram>;
}

/** A dipole of the sea in Figure 4-2: a place, a size, and a new random direction each time it forms. */
interface SeaPair { x: number; y: number; len: number; phase: number; seed: number }

/** How strongly a pair at a distance takes the charge's direction: full when close, thinning with the square of distance. */
export const alignmentShare = (distance: number, reach = 90) => clamp((reach * reach) / (distance * distance + reach * reach * 0.2), 0, 1);

/** Figure 4-2: the sea as electric dipoles that orient to a charge and turn as it moves. */
function DipoleSea() {
  const [kind, setKind] = useState<'none' | 'neg' | 'pos'>('none');
  const [pos, setPos] = useState({ x: 360, y: 180 });
  const play = usePlayback();
  const W = 720, H = 360;
  const sea = useMemo(() => {
    const random = rng(7), list: SeaPair[] = [];
    for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 11; gx++) list.push({ x: 40 + gx * 64 + (random() - 0.5) * 34, y: 34 + gy * 58 + (random() - 0.5) * 30, len: 16 + random() * 26, phase: random(), seed: Math.floor(random() * 1e6) });
    return list;
  }, []);
  const sign = kind === 'pos' ? 1 : -1;
  return <Diagram stage={
    <Stage w={W} h={H} label={kind === 'none' ? 'Virtual particle pairs fill space as electric dipoles of many sizes, each pointing a random way.' : `A free ${kind === 'pos' ? 'positive' : 'negative'} charge among the dipoles. Nearby dipoles turn their ${kind === 'pos' ? 'negative' : 'positive'} ends toward it.`}>
      {sea.map((p, i) => {
        const cycle = play.t * (14 / (p.len + 6)) + p.phase, generation = Math.floor(cycle), life = cycle - generation;
        const born = rng(p.seed + generation * 97)() * 360;
        let angle = born;
        if (kind !== 'none') {
          // The + end points away from a positive charge and toward a negative one; the pair turns to it as it lives.
          const away = bearing(pos.x, pos.y, p.x, p.y), target = sign > 0 ? away : away + 180;
          angle = lerpAngle(born, target, alignmentShare(Math.hypot(p.x - pos.x, p.y - pos.y)) * Math.min(1, life * 2.5));
        }
        return <Zepton key={i} x={p.x} y={p.y} angle={angle} len={p.len} open={Math.sin(Math.PI * life)} signs={p.len > 30} opacity={0.35 + 0.65 * Math.sin(Math.PI * life)}/>;
      })}
      {kind !== 'none' && <Drag x={pos.x} y={pos.y} onMove={(x, y) => setPos({ x, y })} bounds={{ x0: 30, y0: 30, x1: W - 30, y1: H - 30 }} label={`Free ${kind === 'pos' ? 'positive' : 'negative'} charge`}><Charge x={pos.x} y={pos.y} sign={sign as 1 | -1} r={14}/></Drag>}
    </Stage>}>
    <Choice label="Free charge" value={kind} onChange={setKind} options={[{ value: 'none', label: 'None' }, { value: 'neg', label: '−' }, { value: 'pos', label: '+' }]}/>
    <PlayBar play={play} label="the dipoles"/>
    <Remark>{kind === 'none' ? 'Each pair forms pointing a random way, opens, and is gone.' : 'Drag the charge. Dipoles near it turn to follow: orientation to a charge, rotation to its motion.'}</Remark>
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
  // The tally: each wavelength covered adds h. The eighth-wavelength pair covers half of what it needs and stops; the
  // single photon is counted, as in the text, for its one half wavelength.
  const covered = stuck ? (total / 2) * out : proposal === 'single' ? total * Math.min(1, u * 2) : total * u;
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

/** Figure 4-9: a rotating pair, its electric field in the plane of rotation and its magnetic field through it. */
function RotatingPair() {
  const [sense, setSense] = useState<'cw' | 'ccw'>('cw');
  const play = usePlayback({ speed: 0.25 });
  const turned = (play.t % 1) * 180, cw = sense === 'cw';
  // The pair starts along the path and turns half a turn; clockwise carries its positive end over the top.
  const angle = cw ? 180 - turned : 180 + turned, field = pairField(turned), up = cw ? 1 : -1;
  const cx = 210, cy = 165, px = 420, pw = 250, py = 165;
  const trace = pathThrough(Array.from({ length: 61 }, (_, i) => [px + (pw * i) / 60, py - up * 70 * pairField(i * 3)] as const));
  return <Diagram stage={
    <Stage h={330} label={`A virtual electron-positron pair rotating ${cw ? 'clockwise' : 'counter-clockwise'}. Its electric field points ${up > 0 ? 'up' : 'down'} the page, toward its positive end, and its magnetic field points ${cw ? 'into' : 'out of'} the page.`}>
      <Spin x={cx} y={cy} r={62} ccw={!cw} from={cw ? 150 : 210} sweep={100}/>
      <Zepton x={cx} y={cy} angle={angle} len={84} oval={false} signs/>
      <Vector x={cx + 100} y={cy} angle={90 * up} len={12 + 78 * field} centred tone="e" w={3}/><T x={cx + 124} y={cy + 5} tone="e" size="lg" anchor="start">E</T>
      <InOut x={cx - 104} y={cy} out={!cw} r={7 + 9 * field} opacity={0.3 + 0.7 * field}/><T x={cx - 104} y={cy + 40} tone="b" size="lg">B</T>
      <T x={cx} y={34} size="sm">{cw ? 'clockwise' : 'counter-clockwise'} · turned {Math.round(turned)}° of 180°</T>
      <line x1={px} y1={py} x2={px + pw} y2={py} className="bk-s-faint" strokeWidth="1"/>
      <Line d={trace} tone="e" w={2} opacity={0.45}/>
      <circle cx={px + (pw * turned) / 180} cy={py - up * 70 * field} r={6} className="bk-f-e"/>
      <T x={px + pw / 2} y={34} size="sm">E across the path, through the half-turn</T>
      <T x={px} y={py + 96} size="sm" anchor="start">0°</T><T x={px + pw} y={py + 96} size="sm" anchor="end">180°</T><T x={px + pw / 2} y={py + 96} size="sm">half a wavelength of the photon</T>
    </Stage>}>
    <Choice label="Rotation" value={sense} onChange={setSense} options={[{ value: 'cw', label: 'Clockwise' }, { value: 'ccw', label: 'Counter' }]}/>
    <PlayBar play={play} label="the rotation"/>
    <Slider label="Angle turned" value={Math.round(turned)} min={0} max={180} step={1} onChange={v => play.seek(v / 180)} unit="°"/>
    <Readout label="E" value={`${fmt(field)} of its peak, ${up > 0 ? 'up' : 'down'}`} tone="e"/>
    <Readout label="B" value={`${fmt(field)} of its peak, ${cw ? 'into' : 'out of'} the page`} tone="b"/>
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
      <Zepton x={x0 + (nm * scale) / 4} y={y - 0} angle={90} len={56} signs/>
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
        <p>Dirac’s equation for the electron held a second solution, the positron, and he came to think of the vacuum as filled with electrons and positrons. <Q>He saw the positrons as holes in space. They can alternatively be viewed as anti-particles in positive space</Q> (<Pg n={34}/>).</p>
        <p>The pairs are <Q>produced in pairs from out of nothing and then rush back together and annihilate, returning to nothing, all within the energy-time parameters of Planck and Heisenberg</Q>.</p>
      </>,
      tryThis: [
        'Watch a pair: both halves leave the zero line together, one up and one down, and return together.',
        'Raise the energy of the marked pair. It reaches further from zero and is gone sooner, so that energy × time stays at h/2.',
        'Switch the reading of the lower half between Dirac’s holes and antimatter; the picture does not change, only its name.',
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
        <p>The Casimir effect of chapter 3 already depends on a polarizable vacuum, which favours this picture over the photon one (<Pg n={35}/>).</p>
      </>,
      tryThis: [
        'With no charge, look at the directions: there is no pattern. Each pair forms pointing its own way.',
        'Add a negative charge. Pairs near it turn their positive ends toward it, less so further away. Change it to positive and they turn round.',
        'Drag the charge (or move it with the arrow keys). The pairs near its path rotate as it passes.',
      ],
      notes: <p>How much a pair turns at a given distance, and that it turns during its life after forming at random, follow the laboratory’s reading of chapter 6; the figure itself shows only the unpolarized sea.</p>,
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
        'Let the pair turn clockwise. E, toward the positive end, rises to its peak when the pair stands across the path and falls again: half a wave, drawn at the right.',
        'Reverse the rotation. E points down and B comes out of the page: the next half wavelength of the photon, which Figure 5-1 sets in a row.',
        'Pause and drag the angle to 90°, the moment the printed figure shows.',
      ],
      notes: <>
        <p>The caption says the magnetic field points into the page, but the printed figure marks B with a dot in a circle, the sign for out of the page. The diagram follows the caption, which agrees with the right-hand grip rule of chapter 6 for a clockwise rotation.</p>
        <p>The pair is drawn at one size, as printed. The laboratory also lets it open and close as it turns. That the field follows the sine of the angle turned is a reading of “equivalent to a photon during a half wavelength”.</p>
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
