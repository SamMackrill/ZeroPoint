// The van der Waals lab's diagrams and pressure plot (the workbench in src/experiments/van-der-waals lays them out).
import { casimir, pressureSweep } from './model';
import './van-der-waals.css';
import { palette } from '../ui/palette';
import { Plot } from '../ui/Plot';

export const BOOK = './docs/papers/Book%20-%20the-zero-point-universe.pdf';
export const stages = [
  { id: 'induced', title: 'Induce a dipole', subtitle: 'A neutral atom can polarize', figure: '3-2', page: 28 },
  { id: 'correlated', title: 'Correlate the fluctuations', subtitle: 'From dipoles to attraction', figure: '3-1', page: 28 },
  { id: 'pressure', title: 'Reveal the pressure', subtitle: 'A boundary changes the balance', figure: '3-3 / 3-4', page: 29 },
];
/** Format a numeric readout with four significant digits or compact exponential notation. */
export const number = (n: number) => n === 0 ? '0' : Math.abs(n) < .001 || Math.abs(n) >= 10000 ? n.toExponential(3) : n.toPrecision(4);

/** Draw a labelled diagram arrow between two horizontal coordinates. */
function Arrow({ x1, x2, y, color = palette.accent, width = 3 }: { x1: number; x2: number; y: number; color?: string; width?: number }) {
  const sign = Math.sign(x2 - x1);
  return <g stroke={color} fill={color}><line x1={x1} x2={x2 - sign * 7} y1={y} y2={y} strokeWidth={width}/><path d={`M ${x2} ${y} l ${-sign * 10} -6 v 12 z`} stroke="none"/></g>;
}

/** Charge lobes stay symmetric about a fixed centre; this is a schematic, not particle dynamics. */
function Dipole({ x, y, moment }: { x: number; y: number; moment: number }) {
  const offset = moment * 30;
  return <g><ellipse cx={x} cy={y} rx="70" ry="51" fill={palette.bg3} stroke={palette.line2} strokeDasharray="4 6"/>
    <line x1={x - offset} x2={x + offset} y1={y} y2={y} stroke={palette.text3}/>
    <circle cx={x - offset} cy={y} r="16" fill={palette.dataNegLo} stroke={palette.dataNeg}/><text x={x - offset} y={y + 6} textAnchor="middle" fill={palette.text}>−</text>
    <circle cx={x + offset} cy={y} r="16" fill={palette.dataPosLo} stroke={palette.dataPos}/><text x={x + offset} y={y + 6} textAnchor="middle" fill={palette.text}>+</text>
    <circle cx={x} cy={y + 66} r="2" fill={palette.text3}/>
  </g>;
}

/** Illustrate how an applied field polarizes a neutral atom. */
export function InductionDiagram({ polarization }: { polarization: number }) {
  return <svg viewBox="0 0 760 350" role="img" aria-label="Neutral atom and induced dipole: an applied electric field displaces the negative charge cloud opposite to the field">
    <text x="200" y="42" textAnchor="middle">A · No applied field</text><text x="553" y="42" textAnchor="middle">B · Induced dipole</text>
    <circle cx="200" cy="180" r="75" fill={`${palette.line2}33`} stroke={palette.dataNeg} strokeDasharray="3 6"/>
    <circle cx={553 - polarization * 45} cy="180" r="75" fill={`${palette.line2}33`} stroke={palette.dataNeg}/>
    {[200, 553].map(x => <g key={x}><circle cx={x} cy="180" r="14" fill={palette.dataPosLo} stroke={palette.dataPos}/><text x={x} y="186" textAnchor="middle" fill={palette.dataPosHi}>+</text></g>)}
    <text x="200" y="121" textAnchor="middle" fill={palette.dataNegHi}>−</text><text x={553 - polarization * 45} y="121" textAnchor="middle" fill={palette.dataNegHi}>−</text>
    <Arrow x1={475} x2={475 + 150 * polarization + 1} y={83}/><text x="650" y="89" fill={palette.accent}>E</text>
    <text x="200" y="292" textAnchor="middle">Mean dipole = 0</text><text x="553" y="292" textAnchor="middle">p = αE</text>
    <text x="380" y="328" textAnchor="middle" className="vdw-svg-muted">Net charge stays zero. The charge distribution changes.</text>
  </svg>;
}

/** Illustrate two correlated dipoles and their average London attraction. */
export function PairDiagram({ distance, tick }: { distance: number; tick: number }) {
  const spread = 160 + (distance - 1) * 95, left = 380 - spread / 2, right = 380 + spread / 2;
  const moment = Math.cos(tick * Math.PI / 60);
  return <svg viewBox="0 0 760 350" role="img" aria-label="Two correlated fluctuating dipoles with fixed centres and inward arrows showing their average London attraction">
    <text x="380" y="42" textAnchor="middle">Fluctuate together. Attract on average.</text>
    <Dipole x={left} y={150} moment={moment}/><Dipole x={right} y={150} moment={moment}/>
    <text x={left} y="90" textAnchor="middle" className="vdw-svg-muted">Dipole A</text><text x={right} y="90" textAnchor="middle" className="vdw-svg-muted">Dipole B</text>
    <line x1={left} x2={right} y1="229" y2="229" stroke={palette.text4}/>
    <text x="380" y="254" textAnchor="middle">r = {distance.toFixed(2)} r₀</text>
    <Arrow x1={left - 50} x2={left + 12 + 42 / distance ** 3} y={282}/><Arrow x1={right + 50} x2={right - 12 - 42 / distance ** 3} y={282}/>
    <text x="380" y="326" textAnchor="middle" className="vdw-svg-muted">⟨pA⟩ = ⟨pB⟩ = 0, but ⟨pA pB⟩ ≠ 0 · schematic correlation</text>
  </svg>;
}

/** Sample fluctuation wavelengths in nm for the plate picture: many short ones, fewer long ones (Fleming's Fig. 3-3). */
export const SAMPLE_WAVELENGTHS = [30, 42, 58, 80, 110, 150, 200, 260, 340, 440, 560, 700, 850, 1000] as const;
/** Fleming's rule for the cavity: a fluctuation fits between the plates only if its wavelength is shorter than the gap. */
export const fitsGap = (wavelengthNm: number, gapNm: number) => wavelengthNm < gapNm;
/** A repeatable value in [0, 1) for drawing slot `n`. */
const seeded = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Drawn width of a gap of `nm`: compressed, like the plate spacing itself, so 100–1000 nm stays on the page. */
const drawnSpan = (nm: number) => nm >= 100 ? 150 + (nm - 100) / 900 * 160 : 1.5 * nm;
/** Ovals are drawn at this share of the gap's own scale, so one that just fits shows clear space at the plates. */
const OVAL_SCALE = .4;

/** One fluctuation drawn as an oval as long as its wavelength, at a seeded place and tilt inside a region. */
function Fluctuation({ slot, wavelength, x0, x1, upright }: { slot: number; wavelength: number; x0: number; x1: number; upright?: boolean }) {
  const length = OVAL_SCALE * drawnSpan(wavelength), room = x1 - x0;
  // A long oval is turned along the plates when the region is narrower than it.
  const tilt = upright || length > room - 6 ? 90 + (seeded(slot * 3 + 2) - .5) * 24 : (seeded(slot * 3 + 2) - .5) * 150;
  const cx = x0 + room * (.12 + .76 * seeded(slot * 3)), cy = 78 + 184 * seeded(slot * 3 + 1);
  return <ellipse cx={cx} cy={cy} rx={length / 2} ry={Math.max(1.6, length / 8)} transform={`rotate(${tilt} ${cx} ${cy})`} fill={`${palette.dataNeg}22`} stroke={palette.dataNeg} strokeOpacity=".8" strokeWidth="1"/>;
}

/**
 * Two conducting plates in the zero-point field, drawn as Fleming draws them (The Zero-Point Universe Fig. 3-3):
 * fluctuations of every wavelength outside, and between the plates only those shorter than the gap. The optional
 * standing-wave curves are a separate, labelled layer.
 */
export function PlateDiagram({ gap, modes }: { gap: number; modes: boolean }) {
  const width = drawnSpan(gap), left = 380 - width / 2, right = 380 + width / 2;
  const net = 27 + 18 * Math.log10(Math.abs(casimir(gap, 1).pressure) / .0013);
  const fitting = SAMPLE_WAVELENGTHS.filter(w => fitsGap(w, gap));
  // Short wavelengths are the most numerous: several of each, thinning toward the long ones.
  const copies = (wavelength: number) => wavelength <= 110 ? 3 : wavelength <= 440 ? 2 : 1;
  return <svg viewBox="0 0 760 380" role="img" aria-label={`Two conducting plates ${gap} nanometres apart. Fluctuations of every wavelength lie outside; only the ${fitting.length} of ${SAMPLE_WAVELENGTHS.length} sample wavelengths shorter than the gap lie between the plates, so the pressure inside is slightly lower and the plates are pushed together. Sizes and arrow scales are illustrative.`}>
    <defs>
      <clipPath id="vdw-outside-left"><rect x="45" y="63" width={Math.max(0, left - 57)} height="213"/></clipPath>
      <clipPath id="vdw-outside-right"><rect x={right + 12} y="63" width={Math.max(0, 703 - right)} height="213"/></clipPath>
      <clipPath id="vdw-inside"><rect x={left} y="63" width={width} height="213"/></clipPath>
    </defs>
    <rect x={left} y="63" width={width} height="213" fill={palette.accentBg} fillOpacity=".6"/>
    <text x="115" y="35" textAnchor="middle">Outside</text><text x="380" y="35" textAnchor="middle">Only λ &lt; d</text><text x="645" y="35" textAnchor="middle">Outside</text>
    <g clipPath="url(#vdw-outside-left)" data-testid="vdw-fluctuations-outside">{SAMPLE_WAVELENGTHS.flatMap((w, i) => Array.from({ length: copies(w) }, (_, k) => <Fluctuation key={`${w}-${k}`} slot={i * 7 + k} wavelength={w} x0={45} x1={left - 12} upright={w > 440}/>))}</g>
    <g clipPath="url(#vdw-outside-right)">{SAMPLE_WAVELENGTHS.flatMap((w, i) => Array.from({ length: copies(w) }, (_, k) => <Fluctuation key={`${w}-${k}`} slot={500 + i * 7 + k} wavelength={w} x0={right + 12} x1={715} upright={w > 440}/>))}</g>
    <g clipPath="url(#vdw-inside)" data-testid="vdw-fluctuations-inside">{fitting.flatMap((w, i) => Array.from({ length: copies(w) }, (_, k) => <Fluctuation key={`${w}-${k}`} slot={900 + i * 7 + k} wavelength={w} x0={left + 4} x1={right - 4}/>))}</g>
    {modes && [1, 2, 3].map(n => <g key={n}><polyline points={Array.from({ length: 101 }, (_, i) => `${left + width * i / 100},${72 + n * 49 - 16 * Math.sin(n * Math.PI * i / 100)}`).join(' ')} fill="none" stroke={[palette.accent, palette.dataNeg, palette.dataCoreHi][n - 1]} strokeWidth="2"/><text x="380" y={94 + n * 49} textAnchor="middle" className="vdw-mode-label">n = {n}</text></g>)}
    {[left - 12, right].map(x => <rect key={x} x={x} y="55" width="12" height="231" rx="2" fill={palette.text3}/>)}
    <Arrow x1={left - 102} x2={left - 14} y={302} color={palette.text3} width={5}/><Arrow x1={left + 64} x2={left + 2} y={302} color={palette.text3} width={3}/>
    <Arrow x1={right + 102} x2={right + 14} y={302} color={palette.text3} width={5}/><Arrow x1={right - 64} x2={right - 2} y={302} color={palette.text3} width={3}/>
    <Arrow x1={left} x2={left + net} y={342}/><Arrow x1={right} x2={right - net} y={342}/>
    <text x="380" y="325" textAnchor="middle" fill={palette.accent}>Net push together</text>
    <text x="380" y="373" textAnchor="middle" className="vdw-svg-muted" data-testid="vdw-fit-count">d = {gap} nm · {fitting.length} of {SAMPLE_WAVELENGTHS.length} sample wavelengths fit the gap · imbalance exaggerated</text>
  </svg>;
}

/** Plot the ideal Casimir pressure sweep, marking the selected gap (the gap presets are quick values in Setup). */
export function PressurePlot({ gap }: { gap: number }) {
  const sweep = pressureSweep(1);
  return <div className="vdw-plot"><Plot label="Logarithmic plot of attractive pressure magnitude versus plate gap. Doubling the gap reduces pressure magnitude sixteenfold." x={sweep.map(r => r.gapNm)}
    series={[{ key: 'pressure', label: '|P|', color: palette.dataE, values: sweep.map(r => Math.abs(r.pressure)) }]} xScale="log" yScale="log"
    xTicks={[100, 200, 500, 1000]} yTicks={[10, 1, .1, .01]} xUnit="nm" yUnit="Pa" markers={[{ x: gap, y: Math.abs(casimir(gap, 1).pressure), label: `Selected gap ${gap} nm` }]}
    caption="Pressure magnitude versus gap · log axes" height={130} testId="vdw-pressure-plot"/></div>;
}
