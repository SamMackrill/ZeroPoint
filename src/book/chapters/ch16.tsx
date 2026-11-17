// Chapter 16: Mass (PDF pp. 122–128). Figures 16-1 and 16-2.
import { useMemo, useRef, useState } from 'react';
import { Action, Arrow, Choice, Diagram, PlayBar, Readout, Remark, Slider, Stage, T, clamp, fmt, rng, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;
/** ħc in MeV times the length unit used for each particle: femtometres for the proton, picometres for the electron. */
const HBAR_C = { proton: 197.3269718, electron: 0.1973269718 };

/** A shell to set the sliders to: its inner and outer diameters. */
interface Shell { label: string; d: [number, number] }

/**
 * The particles of the chapter, with the CODATA 2010 values Fleming uses and the shells he gives. The electron's
 * printed shell (p. 125) does not have the Compton wavelength as its mean, as the text says it should; the shell
 * that does, solved here from Equation 16-1, is offered beside it. His second electron shell, with the pair
 * wavelength as its thickness, is reproduced by the equation to the digits he prints.
 */
export const PARTICLES: Record<'proton' | 'electron', { name: string; unit: string; energy: number; diameter: number; shells: Shell[]; range: [number, number]; pair: number }> = {
  proton: { name: 'Proton', unit: 'fm', energy: 938.272046, diameter: 1.755, shells: [{ label: 'Fleming’s shell', d: [1.586, 1.924] }], range: [1.2, 2.8], pair: 0.330 },
  electron: {
    name: 'Electron', unit: 'pm', energy: 0.510998928, diameter: 2.4263102389, range: [1.7, 3.8], pair: 0.6066,
    shells: [{ label: 'Fleming’s printed shell', d: [2.123, 2.472] }, { label: 'Mean at the Compton wavelength', d: [2.2469, 2.6057] }, { label: 'Pair-wavelength thickness', d: [2.880, 3.487] }],
  },
};
export type Particle = keyof typeof PARTICLES;

/**
 * The vacuum energy density excluded by a spherical shell (Equation 16-1) in MeV per cubic length unit. With
 * ω = 2πc/d the equation becomes 2π²ħc (1/dᵢ⁴ − 1/dₒ⁴): the wavelengths between the two diameters are shut out.
 */
export const excludedDensity = (particle: Particle, inner: number, outer: number) => 2 * Math.PI ** 2 * HBAR_C[particle] * (1 / inner ** 4 - 1 / outer ** 4);

/** The mass-energy density of a particle taken as a sphere of a given diameter, in MeV per cubic length unit. */
export const massDensity = (particle: Particle, diameter: number) => PARTICLES[particle].energy / ((Math.PI / 6) * diameter ** 3);

/** Figure 16-1: a particle as a shell that shuts out the vacuum fluctuations between its inner and outer diameters. */
function ParticleShell() {
  const [particle, setParticle] = useState<Particle>('proton');
  const spec = PARTICLES[particle];
  const [d, setD] = useState<Record<Particle, [number, number]>>({ proton: PARTICLES.proton.shells[0].d, electron: PARTICLES.electron.shells[0].d });
  const [inner, outer] = d[particle], mean = (inner + outer) / 2, play = usePlayback();
  const set = (i: number, o: number) => setD(v => ({ ...v, [particle]: [Math.min(i, o - 0.02), Math.max(o, i + 0.02)] as [number, number] }));
  const excluded = excludedDensity(particle, inner, outer), needed = massDensity(particle, mean), energy = excluded * (Math.PI / 6) * mean ** 3, ratio = excluded / needed;
  const H = 400, cx = 250, cy = 195, scale = 150 / spec.range[1], ri = inner * scale, ro = outer * scale;
  const blobs = useMemo(() => { const random = rng(161); return Array.from({ length: 40 }, () => ({ a: random() * 360, r: random(), len: random(), phase: random(), tilt: random() * 180 })); }, []);
  // A logarithmic strip of wavelengths, with the band the shell excludes.
  const sx = (v: number) => 470 + (Math.log(v / (spec.range[0] * 0.4)) / Math.log((spec.range[1] * 2.5) / (spec.range[0] * 0.4))) * 220;
  const unit = `MeV/${spec.unit}³`;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A ${spec.name.toLowerCase()} drawn as a spherical shell of inner diameter ${fmt(inner, 4)} and outer diameter ${fmt(outer, 4)} ${spec.unit}. The vacuum energy it excludes is ${fmt(energy, 4)} MeV, against a measured mass-energy of ${fmt(spec.energy, 4)} MeV.`}>
      <circle cx={cx} cy={cy} r={(ro + ri) / 2} className="bk-s-danger" fill="none" strokeWidth={Math.max(2, ro - ri)} opacity={0.3}/>
      <circle cx={cx} cy={cy} r={ro} className="bk-s-text" fill="none" strokeWidth="1.5"/><circle cx={cx} cy={cy} r={ri} className="bk-s-text" fill="none" strokeWidth="1.5"/>
      {blobs.map((b, i) => {
        const insideShell = i % 2 === 0, life = (play.t * 0.7 + b.phase) % 1, swell = Math.sin(Math.PI * life);
        // Inside: only fluctuations shorter than the inner diameter. Outside: only those longer than the outer one.
        const len = insideShell ? ri * 2 * (0.12 + 0.5 * b.len) * 0.5 : ro * 2 * (0.55 + 0.6 * b.len) * 0.5, dist = insideShell ? b.r * Math.max(0, ri - len / 2 - 4) : ro + 26 + b.r * 70;
        const x = cx + dist * Math.cos((b.a * Math.PI) / 180), y = cy + dist * Math.sin((b.a * Math.PI) / 180);
        if (x < 12 || x > 440 || y < 12 || y > H - 12) return null;
        return <ellipse key={i} cx={x} cy={y} rx={(len / 2) * (0.4 + 0.6 * swell)} ry={Math.max(2.5, len * 0.2) * (0.4 + 0.6 * swell)} transform={`rotate(${b.tilt} ${x} ${y})`} className="bk-zepton-oval" opacity={0.25 + 0.7 * swell}/>;
      })}
      <Arrow x1={cx - ri} y1={cy} x2={cx + ri} y2={cy} both tone="mark" w={1.4} head={6}/><T x={cx} y={cy - 8} tone="mark" size="sm">dᵢ</T>
      <Arrow x1={cx - ro} y1={cy + ro + 16} x2={cx + ro} y2={cy + ro + 16} both tone="accent" w={1.4} head={6}/><T x={cx} y={cy + ro + 34} tone="accent" size="sm">dₒ</T>
      <T x={580} y={60} size="sm">wavelengths of fluctuations</T>
      <line x1={470} y1={100} x2={690} y2={100} className="bk-s-faint" strokeWidth="10" strokeLinecap="round"/>
      <line x1={sx(inner)} y1={100} x2={sx(outer)} y2={100} className="bk-s-danger" strokeWidth="10"/>
      <T x={sx(inner) - 6} y={84} anchor="end" size="sm">inside</T><T x={sx(outer) + 6} y={84} anchor="start" size="sm">outside</T><T x={(sx(inner) + sx(outer)) / 2} y={128} size="sm" tone="danger">excluded</T>
      <rect x={470} y={170} width={220} height={16} rx={3} className="bk-fill-soft"/>
      <rect x={470} y={170} width={clamp(ratio / 2) * 220} height={16} rx={3} className={Math.abs(ratio - 1) < 0.02 ? 'bk-f-accent' : 'bk-f-mark'}/>
      <line x1={580} y1={162} x2={580} y2={194} className="bk-s-accent" strokeWidth="2"/><T x={580} y={212} size="sm" tone="accent">the particle’s mass-energy</T><T x={580} y={156} size="sm">energy excluded</T>
    </Stage>}>
    <Choice label="Particle" value={particle} onChange={setParticle} options={[{ value: 'proton', label: 'Proton' }, { value: 'electron', label: 'Electron' }]}/>
    <Slider label="Inner diameter, dᵢ" value={inner} min={spec.range[0]} max={spec.range[1]} step={0.001} onChange={v => set(v, outer)} show={v => `${fmt(v, 4)} ${spec.unit}`}/>
    <Slider label="Outer diameter, dₒ" value={outer} min={spec.range[0]} max={spec.range[1] + 1} step={0.001} onChange={v => set(inner, v)} show={v => `${fmt(v, 4)} ${spec.unit}`}/>
    {spec.shells.map(shell => <Action key={shell.label} onClick={() => setD(v => ({ ...v, [particle]: shell.d }))}>{shell.label}</Action>)}
    <Readout label="Excluded vacuum energy density" value={`${fmt(excluded, 4)} ${unit}`}/>
    <Readout label="Mass-energy density (mean diameter)" value={`${fmt(needed, 4)} ${unit}`}/>
    <Readout label="Energy excluded" value={`${fmt(energy, 4)} MeV`} tone={Math.abs(ratio - 1) < 0.02 ? 'good' : undefined}/>
    <Readout label="Measured mass-energy" value={`${fmt(spec.energy, 4)} MeV`}/>
    <Readout label="Shell thickness" value={`${fmt((outer - inner) / 2, 3)} ${spec.unit}`}/>
  </Diagram>;
}

type P3 = [number, number, number];

/** The 32 vertices of a rhombic triacontahedron: 12 outer ones (an icosahedron) and 20 inner ones (a dodecahedron). */
export function triacontahedron(): { p: P3; outer: boolean }[] {
  const phi = (1 + Math.sqrt(5)) / 2, out: { p: P3; outer: boolean }[] = [], cyc = (a: number, b: number, c: number): P3[] => [[a, b, c], [c, a, b], [b, c, a]];
  for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
    for (const p of cyc(0, s1, s2 * phi)) out.push({ p, outer: true });
    for (const p of cyc(0, s1 * phi, s2 / phi)) out.push({ p, outer: false });
    for (const s3 of [1, -1]) out.push({ p: [s1, s2, s3], outer: false });
  }
  return out;
}

/**
 * The static Coulomb force along the radius on each set of vertices when the 12 outer vertices carry one sign of unit
 * charge and the 20 inner ones the other: the outer set is drawn inward, the inner set pushed outward.
 */
export function shellForces() {
  const v = triacontahedron();
  let inward = 0, outward = 0;
  for (const a of v) {
    const r = Math.hypot(...a.p);
    let f = 0;
    for (const b of v) {
      if (a === b) continue;
      const d: P3 = [a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]], m = Math.hypot(...d), like = a.outer === b.outer ? 1 : -1;
      f += (like * (d[0] * a.p[0] + d[1] * a.p[1] + d[2] * a.p[2])) / (m ** 3 * r);
    }
    if (a.outer) inward -= f; else outward += f;
  }
  return { inward, outward, ratio: inward / outward };
}

/** Figure 16-2: a rhombic triacontahedron with charges at its vertices, turning, and the balance of forces on it. */
function Triacontahedron() {
  const [positiveOuter, setPositiveOuter] = useState(false);
  const play = usePlayback({ speed: 0.25 });
  const tilt = useRef(0.5);
  const H = 400, cx = 250, cy = 200, scale = 82, vertices = useMemo(() => triacontahedron(), []), forces = useMemo(() => shellForces(), []);
  const edges = useMemo(() => { const list: [number, number][] = []; vertices.forEach((a, i) => vertices.forEach((b, j) => { if (a.outer && !b.outer && Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]) < 1.2) list.push([i, j]); })); return list; }, [vertices]);
  const a = play.t * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(tilt.current), st = Math.sin(tilt.current);
  const view = vertices.map(v => { const x = v.p[0] * ca + v.p[2] * sa, z = -v.p[0] * sa + v.p[2] * ca, y = v.p[1] * ct - z * st, depth = v.p[1] * st + z * ct; return { x: cx + x * scale, y: cy - y * scale, depth, outer: v.outer }; });
  const outerSign = positiveOuter ? 1 : -1;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A rhombic triacontahedron turning slowly. Its 12 outer vertices carry ${positiveOuter ? 'positive' : 'negative'} charge and its 20 inner vertices the opposite. The inward Coulomb force on the outer charges is ${Math.round(forces.ratio * 100)} per cent of the outward force on the inner ones.`}>
      {edges.map(([i, j]) => <line key={`${i}-${j}`} x1={view[i].x} y1={view[i].y} x2={view[j].x} y2={view[j].y} className="bk-s-muted" strokeWidth="1" opacity={0.25 + 0.3 * clamp((view[i].depth + view[j].depth) / 4 + 0.5)}/>)}
      {view.map((v, i) => ({ v, i })).sort((p, q) => p.v.depth - q.v.depth).map(({ v, i }) => <circle key={i} cx={v.x} cy={v.y} r={(v.outer ? 8 : 6) * (0.75 + 0.15 * v.depth)} className={(v.outer ? outerSign : -outerSign) > 0 ? 'bk-f-pos' : 'bk-f-neg'} opacity={0.45 + 0.55 * clamp(v.depth / 3.8 + 0.5)}/>)}
      <T x={580} y={70} tone={outerSign > 0 ? 'pos' : 'neg'}>12 outer vertices: {outerSign > 0 ? '+' : '−'}</T>
      <T x={580} y={94} tone={outerSign > 0 ? 'neg' : 'pos'}>20 inner vertices: {outerSign > 0 ? '−' : '+'}</T>
      <T x={580} y={118} size="sm">net charge: {outerSign > 0 ? '−' : '+'}8 units</T>
      <rect x={490} y={170} width={180} height={14} rx={3} className="bk-fill-soft"/><rect x={490} y={170} width={180} height={14} rx={3} className="bk-f-mark" opacity={0.85}/><T x={580} y={162} size="sm">outward, on the 20 inner charges</T>
      <rect x={490} y={220} width={180} height={14} rx={3} className="bk-fill-soft"/><rect x={490} y={220} width={180 * forces.ratio} height={14} rx={3} className="bk-f-accent"/><T x={580} y={212} size="sm">inward, on the 12 outer charges</T>
      <T x={580} y={262} tone="accent">{Math.round(forces.ratio * 100)} % balanced</T>
    </Stage>}>
    <Choice label="Outer vertices carry" value={positiveOuter ? 'pos' : 'neg'} onChange={v => setPositiveOuter(v === 'pos')} options={[{ value: 'neg', label: 'Negative' }, { value: 'pos', label: 'Positive' }]}/>
    <PlayBar play={play} label="the turning"/>
    <Readout label="Inward on the outer 12" value={fmt(forces.inward, 4)}/>
    <Readout label="Outward on the inner 20" value={fmt(forces.outward, 4)}/>
    <Readout label="Ratio" value={`${fmt(forces.ratio * 100, 3)} %`} tone="good"/>
    <Remark>Swap the signs and the same form is the complementary particle: the two would annihilate if they occupied the same space.</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 16,
  summary: <>
    <p>Fleming treats a particle as a spherical shell that acts like a Casimir cavity. Fluctuations shorter than its inner diameter exist inside it, those longer than its outer diameter exist outside it, and those between are excluded. He computes the vacuum energy a proton-sized shell excludes and finds it close to the proton’s mass-energy; the same holds for an electron at about its Compton wavelength. <Q>A particle’s mass is equal to the vacuum energy displaced by the particle</Q> (<Pg n={128}/>).</p>
    <p>The shell must be a virtual structure, of vacuum fluctuations, or its spin would pass the speed of light. The chapter ends with a speculation about its geometry, and a suggestion for why the proton is heavier than the electron (<Pg n={127}/>, <Pg n={128}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '16-1', page: 122, section: 'Proton and Electron Mass', title: 'A shell that shuts out a band of the vacuum',
      caption: 'An illustration of the particle shell with elliptically shaped vacuum fluctuations in the middle and the spheres describing the inner and outer shell diameters indicated.',
      Diagram: ParticleShell,
      text: <>
        <p><Q>Wavelengths of vacuum fluctuations shorter than the inner diameter d<sub>i</sub> of the shell exist inside it. Vacuum fluctuations with wavelengths larger than the outer diameter d<sub>o</sub> of the shell exist outside it. The vacuum fluctuations with wavelengths between the inner diameter and outer diameter of a spherical shell are excluded</Q> (<Pg n={123}/>). The excluded energy density, with ω<sub>1</sub> = 2π<V>c</V>/<V>d</V><sub>o</sub> and ω<sub>2</sub> = 2π<V>c</V>/<V>d</V><sub>i</sub>, is</p>
        <Eq n="16-1">ρ = <Frac top={<>ħ(ω<sub>2</sub>⁴ − ω<sub>1</sub>⁴)</>} bottom={<>8π²<V>c</V>³</>}/></Eq>
        <p>For the proton, taking the charge radius 0.8775 fm as the mean of the two and setting the excluded energy equal to the mass-energy gives <V>d</V><sub>i</sub> = 1.586 fm and <V>d</V><sub>o</sub> = 1.924 fm, a shell 0.169 fm thick. For the electron, with the Compton wavelength as the mean diameter, <V>d</V><sub>i</sub> = 2.123 pm and <V>d</V><sub>o</sub> = 2.472 pm (<Pg n={123}/>, <Pg n={125}/>).</p>
        <p>He notes that the solution for a given radius is unique, <Q>since the density of a sphere varies with the radius cubed and the vacuum energy density varies with the diameter to the forth power</Q> (<Pg n={124}/>).</p>
      </>,
      tryThis: [
        'With Fleming’s shell for the proton, read the energy excluded: it is the proton’s 938 MeV.',
        'Widen the shell or move it. The excluded energy changes steeply, by the fourth power of the diameter, and no other shell of that mean diameter gives the right mass.',
        'Push the outer diameter as far as it goes with dᵢ at 1.755 fm: this is his first approximation, a little more than the proton’s mass-energy density.',
        'Switch to the electron and press “Mean at the Compton wavelength”: the same construction gives 0.511 MeV. Then try “Fleming’s printed shell” (see the note below) and “Pair-wavelength thickness”, his second solution, which also gives 0.511 MeV.',
      ],
      notes: <><p>The readouts are Equation 16-1 with the CODATA 2010 values the text quotes, and the particle’s density is taken over a sphere of the mean diameter, as he takes it. The ovals are illustrative: small ones inside, large ones outside, none of the excluded sizes. The shell is drawn solid; the text says it is a virtual structure.</p>
        <p>The electron’s printed shell does not match its description. The text sets the mean diameter to the Compton wavelength, 2.426 pm, and gives <V>d</V><sub>i</sub> = 2.123 pm and <V>d</V><sub>o</sub> = 2.472 pm, whose mean is 2.298 pm (<Pg n={125}/>). Over a sphere of that mean the shell excludes 0.555 MeV; the shell that solves his condition is 2.247 to 2.606 pm, 0.179 pm thick against his 0.175 pm. His second solution, a shell 0.6066 pm thick, comes out at 2.880 and 3.487 pm exactly as printed, so the method is his and the first pair looks like a slip. All three shells are offered.</p></>,
      labs: [
        { lab: 'electron', scenario: 'mass-shell', why: 'The same calculation as a laboratory study of the electron, with the excluded band plotted.' },
        { lab: 'electron', scenario: 'radius-limit', why: 'Why the shell must be virtual: the effective speed of its turning against its radius.' },
      ],
    },
    {
      kind: 'figure', id: '16-2', page: 126, section: 'Particle Structure', title: 'A shape whose charges almost hold themselves',
      caption: 'A rhombic triacontahedron. Could this be what a proton and electron look like? [Pictured with permission Roger von Oech’s Star-Ball ® www.CreativeWhack.com]',
      Diagram: Triacontahedron,
      text: <>
        <p>If a particle’s shell is made partly of virtual electrons and positrons, it could hold both signs of charge, arranged so that the Coulomb force is neutralized by geometry. A rhombic triacontahedron <Q>has 12 outer vertices and 20 inner vertices. If we assume the outer vertices are occupied by one type of charge and the 20 inner vertices the opposite charge</Q>, then <Q>the inward directed Coulomb force on the outer 12 charges combined is almost equal, ~99%, to the outward directed force on the 20 inner charges combined</Q> (<Pg n={126}/>).</p>
        <p>It has a single edge length, and works with either sign on the outside, so <Q>two complementary stable particles such as an electron and positron could be based on the same geometric form</Q>. Fleming calls these thoughts <Q>highly speculative</Q> (<Pg n={127}/>).</p>
      </>,
      tryThis: ['Watch it turn and pick out the two kinds of vertex: twelve further from the centre, twenty nearer.', 'Compare the two bars: the pull inward on the outer charges nearly balances the push outward on the inner ones.', 'Swap the signs. The balance is the same; the net charge reverses.'],
      notes: <p>The force balance is computed here for unit point charges at the vertices of the standard rhombic triacontahedron, taking the radial part of the Coulomb force on each. It comes to 96 per cent, where the text says about 99 per cent; the text does not give its calculation, so the difference is recorded and not resolved.</p>,
    },
  ],
};
export default chapter;
