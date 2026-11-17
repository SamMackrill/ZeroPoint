// Chapter 2: The Zero-Point (PDF pp. 18–26). No figures: three explorers.
import { useState } from 'react';
import { Diagram, PlayBar, Readout, Remark, Slider, Stage, T, Zepton, clamp, fmt, superscript, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;
const H_EV = 4.135667696e-15, C = 299792458, HBAR = 1.054571817e-34, GEV = 1.602176634e-10, PLANCK_LENGTH = 1.616255e-35;

/** The comparisons of p. 19: one millilitre of water against an ever larger ocean, as a power of ten. */
export const OCEANS = [
  { name: 'a bucket (100 litres)', exp: 5 },
  { name: 'all the Earth’s oceans', exp: 24 },
  { name: 'an ocean the size of the Sun', exp: 41 },
  { name: 'an ocean the size of the solar system', exp: 50 },
  { name: 'an ocean the size of the galaxy', exp: 76 },
  { name: 'an ocean the size of the visible universe', exp: 95.7 },
];

/** Explorer: how small a drop of water is beside the energy of the vacuum. */
function DropInTheOcean() {
  const [i, setI] = useState(0);
  const step = OCEANS[i], H = 300, x0 = 60, w = 600, x = (e: number) => x0 + (e / 96) * w;
  return <Diagram stage={
    <Stage w={W} h={H} label={`One millilitre of water against ${step.name}: one part in ten to the power ${Math.round(step.exp)}. The energy of the vacuum, as a mass, is about ten to the power 95 times the density of water.`}>
      <T x={W / 2} y={44} tone="text" size="lg">a drop in {step.name}</T>
      <T x={W / 2} y={74}>1 part in 10{superscript(Math.floor(step.exp))}{i === OCEANS.length - 1 ? ' × 5' : ''}</T>
      <line x1={x0} y1={150} x2={x0 + w} y2={150} className="bk-s-faint" strokeWidth="12" strokeLinecap="round"/>
      <line x1={x0} y1={150} x2={x(step.exp)} y2={150} className="bk-s-accent" strokeWidth="12" strokeLinecap="round"/>
      {OCEANS.map((o, k) => <g key={o.name}><line x1={x(o.exp)} y1={134} x2={x(o.exp)} y2={166} className={k === i ? 'bk-s-mark' : 'bk-s-muted'} strokeWidth={k === i ? 3 : 1.5}/><T x={x(o.exp)} y={k % 2 ? 198 : 184} size="sm" tone={k === i ? 'mark' : 'muted'}>10{superscript(Math.floor(o.exp))}</T></g>)}
      <line x1={x(95)} y1={110} x2={x(95)} y2={130} className="bk-s-danger" strokeWidth="3"/><T x={x(95)} y={102} anchor="end" tone="danger" size="sm">the vacuum: 10⁹⁵ g/cm³, against water’s 1</T>
      <T x={W / 2} y={250} size="sm">a logarithmic scale: each step along it is a factor of ten</T>
    </Stage>}>
    <Slider label="Size of the ocean" value={i} min={0} max={OCEANS.length - 1} step={1} onChange={setI} show={() => step.name}/>
    <Readout label="Drop against ocean" value={`1 : 10${superscript(Math.floor(step.exp))}`}/>
    <Remark tone={i === OCEANS.length - 1 ? 'good' : undefined}>{i === OCEANS.length - 1 ? 'There we go: water against the vacuum is five drops in an ocean the size of the visible universe.' : 'Still not anywhere close.'}</Remark>
  </Diagram>;
}

/** The energy of a zero-point fluctuation of a given wavelength, in electron volts: hν/2 (Equation 2-4). */
export const fluctuationEnergy = (wavelength: number) => (H_EV * C) / wavelength / 2;

/** The time a fluctuation of that wavelength exists, in seconds: one period, 1/ν. */
export const fluctuationTime = (wavelength: number) => wavelength / C;

/** Explorer: more energy, less time. The product is always h/2. */
function EnergyAndTime() {
  const [exp, setExp] = useState(-7); // log10 of the wavelength in metres
  const play = usePlayback();
  const wavelength = 10 ** exp, E = fluctuationEnergy(wavelength), t = fluctuationTime(wavelength), H = 300;
  // The energy and the time, each as a bar on its own logarithmic scale.
  const eBar = clamp((Math.log10(E) + 4) / 20), tBar = clamp((Math.log10(t) + 30) / 20), size = 30 + (exp + 15) * 9;
  const life = (play.t * (1.6 - tBar)) % 1;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A vacuum fluctuation of wavelength ${fmt(wavelength)} metres has an energy of ${fmt(E)} electron volts and exists for ${fmt(t)} seconds. The product is half of Planck's constant.`}>
      <Zepton x={170} y={140} angle={90 - 180 * life} len={size} open={Math.max(0.15, Math.sin(Math.PI * life))} signs={size > 40}/>
      <T x={170} y={250} size="sm">one fluctuation, appearing and gone</T>
      <rect x={380} y={70} width={46} height={170} className="bk-fill-soft"/><rect x={380} y={240 - 170 * eBar} width={46} height={170 * eBar} className="bk-f-mark"/><T x={403} y={262} size="sm" tone="mark">energy</T>
      <rect x={480} y={70} width={46} height={170} className="bk-fill-soft"/><rect x={480} y={240 - 170 * tBar} width={46} height={170 * tBar} className="bk-f-e"/><T x={503} y={262} size="sm" tone="e">time</T>
      <rect x={580} y={70} width={46} height={170} className="bk-fill-soft"/><rect x={580} y={240 - 85} width={46} height={85} className="bk-f-accent"/><T x={603} y={262} size="sm" tone="accent">energy × time</T>
      <T x={503} y={54} size="sm">each bar on a logarithmic scale</T>
    </Stage>}>
    <Slider label="Wavelength of the fluctuation" value={exp} min={-15} max={-3} step={0.1} onChange={setExp} show={() => `${fmt(wavelength, 2)} m`}/>
    <PlayBar play={play} label="the fluctuation"/>
    <Readout label="Energy, hν/2" value={`${fmt(E)} eV`} tone="force"/>
    <Readout label="Time it exists" value={`${fmt(t)} s`} tone="e"/>
    <Readout label="Energy × time" value="h/2" tone="good"/>
    <Remark>Shorter wavelength, more energy, less time. The undetectable oscillators are always at Planck’s minimum energy.</Remark>
  </Diagram>;
}

/** The energy density of the vacuum counted up to an angular frequency ω (Equation 2-6), in GeV per cubic centimetre. */
export function vacuumDensity(cutoffWavelength: number) {
  const omega = (2 * Math.PI * C) / cutoffWavelength;
  return ((HBAR * omega ** 4) / (8 * Math.PI ** 2 * C ** 3)) / GEV / 1e6;
}

/** GeV per cubic centimetre as a mass density in grams per cubic centimetre. */
export const asMassDensity = (gevPerCm3: number) => gevPerCm3 * 1.78266192e-24;

/** Explorer: nearly all the energy is in the shortest wavelengths counted. */
function CutoffDensity() {
  const [exp, setExp] = useState(Math.log10(PLANCK_LENGTH));
  const cutoff = 10 ** exp, density = vacuumDensity(cutoff), mass = asMassDensity(density), H = 300, x0 = 70, w = 580;
  const x = (e: number) => x0 + ((e + 35) / 29) * w, bar = clamp((Math.log10(density) + 10) / 130);
  return <Diagram stage={
    <Stage w={W} h={H} label={`Counting vacuum fluctuations down to a wavelength of ${fmt(cutoff)} metres gives an energy density of ${fmt(density)} GeV per cubic centimetre, the mass equivalent of ${fmt(mass)} grams per cubic centimetre.`}>
      <T x={x0} y={40} anchor="start" size="sm">shortest wavelength counted</T>
      <line x1={x0} y1={70} x2={x0 + w} y2={70} className="bk-s-faint" strokeWidth="2"/>
      {[[-35, 'Planck length'], [-15, 'a proton'], [-10, 'an atom'], [-6.3, 'visible light']].map(([e, name]) => <g key={name}><line x1={x(e as number)} y1={62} x2={x(e as number)} y2={78} className="bk-s-muted"/><T x={x(e as number)} y={96} size="sm" anchor={e === -35 ? 'start' : 'middle'}>{name}</T></g>)}
      <line x1={x(exp)} y1={52} x2={x(exp)} y2={88} className="bk-s-mark" strokeWidth="3"/>
      <rect x={x0} y={150} width={w} height={22} rx={3} className="bk-fill-soft"/><rect x={x0} y={150} width={w * bar} height={22} rx={3} className="bk-f-accent"/>
      <T x={x0} y={140} anchor="start" size="sm">energy density of the vacuum (logarithmic)</T>
      <T x={x0 + w} y={196} anchor="end" size="sm" tone="accent">10{superscript(Math.round(Math.log10(density)))} GeV/cm³</T>
      <T x={W / 2} y={250} size="sm">each tenfold shorter cut-off multiplies the energy by ten thousand</T>
    </Stage>}>
    <Slider label="Cut-off wavelength" value={exp} min={Math.log10(PLANCK_LENGTH)} max={-6} step={0.1} onChange={setExp} show={() => (Math.abs(cutoff - PLANCK_LENGTH) < 1e-37 ? 'the Planck length' : `${fmt(cutoff, 2)} m`)}/>
    <Readout label="Energy density, ħω⁴/8π²c³" value={`${fmt(density)} GeV/cm³`} tone="good"/>
    <Readout label="As a mass density" value={`${fmt(mass, 2)} g/cm³`}/>
    <Remark>{Math.abs(cutoff - PLANCK_LENGTH) < 1e-37 ? 'At the Planck length: 5.7 × 10¹¹⁸ GeV/cm³, the mass-energy of 10⁹⁵ g/cm³.' : 'Nearly all of it lies in the last decade of wavelength before the cut-off.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 2,
  summary: <>
    <p>Empty a box of matter, shield it from light and fields, and cool it to absolute zero. What is left is the zero-point: not nothing, but a space <Q>teeming</Q> with vacuum fluctuations, each too small and too brief to detect and together an energy beyond reckoning (<Pg n={18}/>).</p>
    <p>The chapter gives the history: Planck’s oscillators, which never reach zero energy; Einstein and Stern’s <i>Nullpunktenergie</i>; Nernst’s recognition that this energy fills the vacuum and is the æther under another name; Heisenberg’s uncertainty principle, which sets the same limit from the other side. It ends with the difficulty that the total is infinite, or nearly, and the promise that the Casimir effect will show how to live with that (<Pg n={23}/>, <Pg n={25}/>).</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x2-1', page: 19, section: 'What is the Zero-Point?', title: 'A drop in the ocean',
      Diagram: DropInTheOcean,
      text: <p>To convey a vacuum energy equivalent to 10⁹⁵ g/cm³ against water’s 1 g/cm³, Fleming enlarges the ocean a drop is lost in. A drop in a bucket is a factor of 10⁵; in all the oceans, 10²⁴; in an ocean the size of the Sun, 10⁴¹; of the solar system, 10⁵⁰; of the galaxy, about 10⁷⁶. <Q>What if the ocean is the size of the known visible universe?</Q> <Q>The mass ratio is 5 x 10<sup>95</sup>. There we go</Q> (<Pg n={19}/>).</p>,
      tryThis: ['Step the ocean up from a bucket to the visible universe and watch the bar approach the mark for the vacuum.', 'Notice that the scale is logarithmic: the last step alone is nearly twenty powers of ten.'],
    },
    {
      kind: 'explorer', id: 'x2-2', page: 22, section: 'The Heisenberg Uncertainty Principle', title: 'More energy, less time',
      Diagram: EnergyAndTime,
      text: <>
        <p>Planck’s oscillator has a least energy, and Heisenberg’s principle limits the energy of an event that lasts a given time. For a zero-point fluctuation the principle is turned round: its energy multiplied by the time it exists must stay within half of Planck’s constant, or it would be detectable. Set side by side they are the same statement (<Pg n={22}/>):</p>
        <Eq n="2-4"><V>E</V> = <Frac top="ħω" bottom="2"/> = <Frac top={<><V>h</V>ν</>} bottom="2"/> ≡ Δ<V>E</V>Δ<V>t</V> = <Frac top={<V>h</V>} bottom="2"/></Eq>
        <p><Q>Planck and Heisenberg achieved the same result by approaching the problem from two different directions.</Q></p>
      </>,
      tryThis: ['Shorten the wavelength: the energy bar rises and the time bar falls by the same amount.', 'The third bar does not move. That constancy is what chapter 4 uses to rule out the photon as a vacuum fluctuation.'],
      notes: <p>The time is taken as one period, 1/ν, as in the text. The size of the pair drawn and the pace of its appearing are illustrative.</p>,
      labs: [{ lab: 'medium', scenario: 'balanced', why: 'A cell of fluctuations with their frequencies, lifetimes and energies, and the bookkeeping of the energy they borrow.' }],
    },
    {
      kind: 'explorer', id: 'x2-3', page: 24, section: 'The Infinity Problem', title: 'Where the energy is',
      Diagram: CutoffDensity,
      text: <>
        <p>Counted over all wavelengths the energy of the vacuum is infinite. One way to make it finite is to stop at the Planck length, below which a fluctuation would be <Q>effectively a virtual black hole</Q>. The energy density up to an angular frequency ω is (<Pg n={24}/>, <Pg n={25}/>):</p>
        <Eq n="2-6">ρ = <Frac top="ħω⁴" bottom={<>8π²<V>c</V>³</>}/></Eq>
        <p><Q>The solution is an energy density of 5.7 x 10<sup>118</sup> GeV/cm<sup>3</sup>, which is equivalent to the mass energy in 10<sup>95</sup> g/cm<sup>3</sup>.</Q> Since matter is not crushed, <Q>most force interactions must be limited at much lower energies than that of the Planck Length</Q>.</p>
      </>,
      tryThis: ['At the Planck length the readout is the figure in the text.', 'Lengthen the cut-off by a factor of ten: the energy falls ten-thousandfold. Almost all of it is at the very shortest wavelengths.', 'Take the cut-off up to the size of a proton and compare with the proton’s own density in Figure 16-1.'],
      notes: <p>The readout is Equation 2-6 with ω = 2π<V>c</V>/λ for the cut-off wavelength.</p>,
    },
  ],
};
export default chapter;
