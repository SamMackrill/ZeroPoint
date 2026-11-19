// Chapter 25: The Strong Nuclear Force (PDF pp. 192–200). Figures 25-1 and 25-2.
import { useMemo, useState } from 'react';
import { Arrow, BlockArrow, Diagram, Line, Readout, Remark, Slider, Stage, T, Toggle, clamp, fmt, pathThrough } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';
import { triacontahedron } from './ch16';

const W = 720;
const HBAR_C = 3.16152677e-26; // J m
const COULOMB = 2.30707751e-28; // e²/(4πε₀), J m
/** The proton's charge radius, in femtometres (CODATA 2010, as the text uses). */
export const PROTON_RADIUS = 0.8775;

/** The Casimir energy of two spheres of radius a a least distance L apart, by the proximity force approximation (Equation 25-3), in joules; lengths in femtometres. */
export const casimirEnergy = (L: number, a = PROTON_RADIUS) => -((HBAR_C * Math.PI ** 2) / 1440) * ((Math.PI * a * a) / (L * L * (2 * a + L))) * 1e15;

/** The attraction that energy gives: minus its rate of change with distance, in newtons. */
export function casimirForce(L: number, a = PROTON_RADIUS) {
  const k = (HBAR_C * Math.PI ** 2) / 1440;
  return (k * Math.PI * a * a * (4 * a + 3 * L)) / (L ** 3 * (2 * a + L) ** 2) * 1e30;
}

/** The special case the text works through (Equation 25-5, with 2a = L), in newtons. */
export const casimirForceEqualSpacing = (L: number) => ((HBAR_C * Math.PI ** 3) / (5760 * L * L)) * 1e30;

/** The Coulomb repulsion of two protons whose centres are r femtometres apart (Equation 25-6), in newtons. */
export const coulombForce = (r: number) => (COULOMB / (r * r)) * 1e30;

/** The share of the Casimir force left once the particles become transparent: none below 0.5 fm, rising in a straight line to all of it at 0.9 fm, as the text adjusts its chart. */
export const transparency = (L: number) => clamp((L - 0.5) / 0.4);

/** A particle drawn as a rhombic triacontahedron seen from a fixed angle. */
function Shell({ x, y, r }: { x: number; y: number; r: number }) {
  const { points, edges } = useMemo(() => {
    const v = triacontahedron(), ca = Math.cos(0.5), sa = Math.sin(0.5), ct = Math.cos(0.45), st = Math.sin(0.45);
    const points = v.map(p => { const px = p.p[0] * ca + p.p[2] * sa, pz = -p.p[0] * sa + p.p[2] * ca; return { x: px / 1.9, y: (p.p[1] * ct - pz * st) / 1.9, outer: p.outer }; });
    const edges: [number, number][] = [];
    v.forEach((a, i) => v.forEach((b, j) => { if (a.outer && !b.outer && Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]) < 1.2) edges.push([i, j]); }));
    return { points, edges };
  }, []);
  return <g>
    <circle cx={x} cy={y} r={r} className="bk-fill-soft" opacity={0.6}/>
    {edges.map(([i, j]) => <line key={`${i}-${j}`} x1={x + points[i].x * r} y1={y - points[i].y * r} x2={x + points[j].x * r} y2={y - points[j].y * r} className="bk-s-muted" strokeWidth="1.2"/>)}
  </g>;
}

/** Figure 25-1: two particles a distance L apart, the Casimir force pushing them together and the Coulomb force pushing them apart. */
function TwoProtons() {
  const [L, setL] = useState(1.755);
  const [porous, setPorous] = useState(true);
  const casimir = casimirForce(L) * (porous ? transparency(L) : 1), coulomb = coulombForce(L + 2 * PROTON_RADIUS), ratio = casimir / coulomb;
  // The net force, positive together; its arrows' length follows its size on the same logarithmic scale as before.
  const net = casimir - coulomb, netLen = 30 * clamp(Math.log10(Math.max(Math.abs(net), 1)) / 4);
  const H = 420, scale = 42, r = PROTON_RADIUS * scale, cx = 250, y = 110, xa = cx - (L * scale) / 2 - r, xb = cx + (L * scale) / 2 + r;
  // The two forces against distance, on a logarithmic scale of newtons.
  const px = 80, pw = 560, py = 230, ph = 150, fx = (l: number) => px + ((l - 0.1) / 3.9) * pw, fy = (f: number) => py + ph - (clamp((Math.log10(Math.max(f, 1)) - 0) / 5)) * ph;
  const curve = (f: (l: number) => number) => pathThrough(Array.from({ length: 79 }, (_, i) => { const l = 0.1 + (i / 78) * 3.9; return [fx(l), fy(f(l))] as const; }));
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two protons drawn as shells, ${fmt(L, 3)} femtometres apart at their nearest. The Casimir force pushing them together is ${fmt(casimir, 3)} newtons and the Coulomb force pushing them apart is ${fmt(coulomb, 3)} newtons.`}>
      <Shell x={xa} y={y} r={r}/><Shell x={xb} y={y} r={r}/>
      <Arrow x1={xa + r} y1={y + r + 16} x2={xb - r} y2={y + r + 16} both tone="mark" w={1.4} head={6}/><T x={cx} y={y + r + 34} tone="mark" size="sm" italic>L = {fmt(L, 3)} fm</T>
      {/* The net force on each particle: pushed together where the Casimir force is the larger, apart where Coulomb wins. */}
      {Math.abs(net) > 0.5 && (net > 0
        ? <><BlockArrow x1={xa - r - 14 - netLen} y1={y} x2={xa - r - 4} y2={y} thick={12}/><BlockArrow x1={xb + r + 14 + netLen} y1={y} x2={xb + r + 4} y2={y} thick={12}/></>
        : <><BlockArrow x1={xa - r - 4} y1={y} x2={xa - r - 14 - netLen} y2={y} thick={12}/><BlockArrow x1={xb + r + 4} y1={y} x2={xb + r + 14 + netLen} y2={y} thick={12}/></>)}
      <Arrow x1={xa} y1={y - r - 12} x2={xa - 16 - 30 * clamp(Math.log10(coulomb) / 4)} y2={y - r - 12} tone="pos" w={2.4}/><Arrow x1={xb} y1={y - r - 12} x2={xb + 16 + 30 * clamp(Math.log10(coulomb) / 4)} y2={y - r - 12} tone="pos" w={2.4}/>
      <T x={560} y={70} anchor="start" size="sm" tone="text">➤ net force: {net > 0 ? 'together' : 'apart'}</T><T x={560} y={92} anchor="start" size="sm" tone="pos">→ Coulomb: apart</T>
      <line x1={px} y1={py + ph} x2={px + pw} y2={py + ph} className="bk-s-muted"/><line x1={px} y1={py} x2={px} y2={py + ph} className="bk-s-muted"/>
      <Line d={curve(l => casimirForce(l) * (porous ? transparency(l) : 1))} tone="text" w={2.2}/><Line d={curve(l => coulombForce(l + 2 * PROTON_RADIUS))} tone="pos" w={2.2}/>
      <line x1={fx(L)} y1={py} x2={fx(L)} y2={py + ph} className="bk-s-mark" strokeDasharray="3 3"/>
      {[0.1, 1, 2, 3, 4].map(l => <T key={l} x={fx(l)} y={py + ph + 18} size="sm">{l}</T>)}<T x={px + pw / 2} y={py + ph + 36} size="sm">least distance between the particles, L (fm)</T>
      {[1, 100, 10000].map(f => <T key={f} x={px - 8} y={fy(f) + 4} anchor="end" size="sm">{f.toLocaleString('en-GB')} N</T>)}
    </Stage>}>
    <Slider label="Least distance between them, L" value={L} min={0.1} max={4} step={0.005} onChange={setL} show={v => `${fmt(v, 4)} fm`}/>
    <Toggle label="Particles are transparent to short wavelengths" checked={porous} onChange={setPorous}/>
    <Readout label="Casimir force (together)" value={`${fmt(casimir, 3)} N`}/>
    <Readout label="Coulomb force (apart)" value={`${fmt(coulomb, 3)} N`} tone="e"/>
    <Readout label="Net force" value={`${fmt(Math.abs(net), 3)} N, ${net > 0 ? 'together' : 'apart'}`} tone={net > 0 ? 'good' : 'bad'}/>
    <Readout label="Casimir ÷ Coulomb" value={casimir < 0.01 ? '0' : fmt(ratio, 3)} tone={ratio > 1 ? 'good' : 'bad'}/>
    <Remark>{ratio > 1 ? 'The net force is attractive at this distance.' : L < 0.9 && porous ? 'Closer than this the shell lets the short wavelengths through, the Casimir force fades, and Coulomb repulsion dominates.' : 'Beyond about 3 fm the Coulomb repulsion is the larger.'}</Remark>
  </Diagram>;
}

/** The width of the shadow one particle casts on the surface of another whose centre is D away, both of radius a. */
export const shadowWidth = (D: number, a = PROTON_RADIUS) => (2 * a * a) / D;

/** The smaller width of one rhombic face of a proton-sized triacontahedron, in femtometres (p. 195). */
export const OPENING = 0.6;

/** Figure 25-2: the shadow one particle casts on another, against the size of the openings in its shell. */
function ShellShadow() {
  const [L, setL] = useState(2);
  const D = L + 2 * PROTON_RADIUS, shadow = shadowWidth(D), H = 340, scale = 60, r = PROTON_RADIUS * scale, y = 150, xa = 150, xb = xa + D * scale;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two particles ${fmt(L, 3)} femtometres apart. The shadow one casts on the other is ${fmt(shadow, 3)} femtometres across, ${shadow > OPENING ? 'larger' : 'smaller'} than the 0.60 femtometre openings in the shell.`}>
      <Line d={`M${Math.min(xb, W - 20)} ${y - r} L${xa} ${y} L${Math.min(xb, W - 20)} ${y + r}`} tone="mark" w={1.4}/>
      <Shell x={xa} y={y} r={r}/>{xb < W + r && <Shell x={xb} y={y} r={r}/>}
      <line x1={xa + r} y1={y - (shadow * scale) / 2} x2={xa + r} y2={y + (shadow * scale) / 2} className="bk-s-mark" strokeWidth="5" strokeLinecap="round"/>
      <line x1={xa + r + 12} y1={y - (OPENING * scale) / 2} x2={xa + r + 12} y2={y + (OPENING * scale) / 2} className="bk-s-accent" strokeWidth="3" strokeLinecap="round"/>
      <T x={xa} y={y + r + 28} size="sm" tone="mark">shadow: {fmt(shadow, 3)} fm</T><T x={xa} y={y + r + 46} size="sm" tone="accent">opening in the shell: 0.60 fm</T>
      <Arrow x1={xa + r} y1={H - 30} x2={Math.min(xb - r, W - 30)} y2={H - 30} both tone="muted" w={1.2} head={6}/><T x={(xa + r + Math.min(xb - r, W - 30)) / 2} y={H - 38} size="sm" italic>L = {fmt(L, 3)} fm</T>
    </Stage>}>
    <Slider label="Least distance between them, L" value={L} min={0.3} max={6} step={0.05} onChange={setL} show={v => `${fmt(v, 3)} fm`}/>
    <Readout label="Width of the shadow" value={`${fmt(shadow, 3)} fm`} tone="force"/>
    <Readout label="Smaller width of an opening" value="0.60 fm"/>
    <Readout label="Shadow against opening" value={shadow > OPENING ? 'larger' : 'smaller'} tone={shadow > OPENING ? 'good' : 'bad'}/>
    <Remark>{shadow > OPENING ? 'The push together is strongest when the shadow is larger than the openings in the particle structure.' : 'With the shadow smaller than an opening, less of the push is intercepted.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 25,
  summary: <>
    <p>The strong force holds protons together against their Coulomb repulsion between about 0.7 and 2 femtometres, and then gives way. Its accepted explanation, by exchanged mesons, does not say what pushes on the proton, or why the force turns off at short range. Fleming notes that the range is 0.4 to 1.1 proton diameters: <Q>ideal conditions for the van der Waals Force</Q> (<Pg n={192}/>).</p>
    <p>Take the proton as the shell of chapter 16. Two such shells shade each other from the vacuum, as Casimir’s plates and Fatio’s bodies do, down to the distance at which the shell is transparent to the wavelengths that would fit between them. The force that results is no longer weak at this range, and Fleming calls it <strong>the Strong Casimir Force</strong> (<Pg n={199}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '25-1', page: 194, section: 'What is Really Going On?', title: 'Two shells, a diameter apart',
      caption: 'Two hypothetical particles depicted as rhombic triacontahedrons a minimum distance L apart where L is similar to the diameter of the particles. [Pictured with permission, Roger von Oech’s Star-Ball ® www.CreativeWhack.com]',
      Diagram: TwoProtons,
      text: <>
        <p><Q>It appears that we have a situation that is a cross between Fatio’s Push Gravity plus other van der Waals Forces along with the Casimir Effect.</Q> The attraction is greatest when wavelengths smaller than the proton’s outer diameter begin to be excluded: 1.924 fm, <Q>which corresponds closely with the maximum effective range of the Strong Nuclear Force</Q>. It lasts until the structure is transparent, which for a triacontahedron of the proton’s size is about 0.7 fm (<Pg n={194}/>, <Pg n={195}/>).</p>
        <p>For the size of the force he uses the proximity force approximation for two spheres of radius <V>a</V> (<Pg n={196}/>):</p>
        <Eq n="25-3"><V>E</V> = − <Frac top={<>ħ<V>c</V>π²</>} bottom="1440"/> <Frac top={<>π<V>a</V>²</>} bottom={<><V>L</V>²(2<V>a</V> + <V>L</V>)</>}/></Eq>
        <p>With 2<V>a</V> = <V>L</V> = 1.755 fm this gives a Casimir force of 55.3 N against a Coulomb repulsion of 20.6 N. Over the whole range his chart peaks at 15.1 times the Coulomb repulsion at 0.9 fm, after the force is set to zero below 0.5 fm and reduced in a straight line between 0.5 and 0.9 fm <Q>for purposes of illustrating the effect due to the semi-transparent structure of the proton</Q> (<Pg n={197}/>, <Pg n={199}/>).</p>
      </>,
      tryThis: ['Start at 1.755 fm, a proton diameter apart: the Casimir force is the larger and the protons are pushed together.', 'Move them apart until the two curves cross: beyond that Coulomb repulsion wins, and the nucleus would not hold.', 'Bring them closer than 0.9 fm and watch the Casimir force fall away: below about 0.5 fm the net force turns round, and the white arrows push them apart. Then turn off the transparency: without it the force would run to hundreds of thousands of newtons at 0.1 fm (the text says more than 50,000).'],
      notes: <>
        <p>The Casimir curve here is the rate of change of Equation 25-3 with distance, at the proton’s radius, and the Coulomb curve is Equation 25-6 with the centres <V>L</V> + 2<V>a</V> apart. It has the shape of the book’s Chart 25-1 but not its exact values: with the same adjustment below 0.9 fm it peaks at about 20 times the Coulomb force near 0.8 fm, where the chart shows 15.1 at 0.9 fm, and the two curves cross near 3.1 fm, where the text says a little over 2.6. The text does not give enough of its working to reproduce the chart exactly.</p>
        <p>At 1.755 fm this curve gives 69 N. The text’s 55.3 N comes from its special case, Equation 25-5, in which <V>a</V> is set to <V>L</V>/2 before the rate of change is taken; the companion’s test suite reproduces that figure. For the Coulomb force at that spacing Equation 25-6 gives 18.7 N, where the text has 20.6.</p>
        <p>Fleming himself counts the size as the open question: the strong force is taken to be about 100 times the Coulomb repulsion, and this approximation gives about 15.</p>
      </>,
      labs: [{ lab: 'vdw', scenario: 'pressure', why: 'The same Casimir pressure between flat plates, where it is weak because the gap is a hundred million times wider.' }],
    },
    {
      kind: 'figure', id: '25-2', page: 195, title: 'The shadow and the openings',
      caption: 'Two lines show the van der Waals Force shadow cast by one particle on another, again depicted as rhombic triacontahedrons. [Pictured with permission, Roger von Oech’s Star-Ball ® www.CreativeWhack.com]',
      Diagram: ShellShadow,
      text: <>
        <p>Each rhombus of a proton-sized triacontahedron is 0.60 fm across its smaller dimension and 0.97 fm across its longer. <Q>The shadow in this case is slightly smaller than the smaller dimension of the rhombus (0.60 fm) when the particles are separated by ~1 particle diameter, ~2 fm. The van der Waals Force pushing two such particles together is strongest when the shadow is larger than the openings in the particle structure</Q> (<Pg n={195}/>).</p>
        <p>His conclusion is modest about the shape and firm about the mechanism: <Q>the domination of Coulomb repulsive forces at shorter distances can be attributed simply to the proton being transparent to shorter wavelengths</Q>.</p>
      </>,
      tryThis: ['At 2 fm apart the shadow is smaller than an opening, as the text says.', 'Bring the particles together until the shadow is as wide as the opening, then wider.', 'Compare with Figure 18-2: the same cone, between stars, is millimetres wide on a body a million kilometres across.'],
      notes: <>
        <p>The shadow is the cone from the edges of one sphere to the centre of the other, cut at the other’s surface, as in Figures 17-2 and 18-2. The sentence before the one quoted says the force <Q>will diminish when the openings in the particle structure are smaller than the shadow</Q>, which is the same condition under which the next sentence says it is strongest. The diagram follows the second sentence, which matches the rest of the argument.</p>
      </>,
    },
  ],
};
export default chapter;
