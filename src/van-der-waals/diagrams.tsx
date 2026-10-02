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

/** Illustrate the stress imbalance between two conducting plates. */
export function PlateDiagram({ gap, modes }: { gap: number; modes: boolean }) {
  const width = 150 + (gap - 100) / 900 * 160, left = 380 - width / 2, right = 380 + width / 2;
  const net = 27 + 18 * Math.log10(Math.abs(casimir(gap, 1).pressure) / .0013);
  return <svg viewBox="0 0 760 380" role="img" aria-label={`Two conducting plates ${gap} nanometres apart, with balanced background stress and an inward net pressure difference. Mode shapes and arrow scales are illustrative.`}>
    <defs><pattern id="vdw-field-grid" width="42" height="44" patternUnits="userSpaceOnUse"><ellipse cx="21" cy="22" rx="10" ry="4" transform="rotate(-35 21 22)" fill="none" stroke={palette.text4} strokeWidth="1"/></pattern></defs>
    <rect x="45" y="63" width={left - 57} height="213" fill="url(#vdw-field-grid)"/><rect x={right + 12} y="63" width={703 - right} height="213" fill="url(#vdw-field-grid)"/>
    <rect x={left} y="63" width={width} height="213" fill={palette.accentBg} fillOpacity=".6"/>
    <text x="115" y="35" textAnchor="middle">Outside</text><text x="380" y="35" textAnchor="middle">Modified field</text><text x="645" y="35" textAnchor="middle">Outside</text>
    {modes && [1, 2, 3].map(n => <g key={n}><polyline points={Array.from({ length: 101 }, (_, i) => `${left + width * i / 100},${72 + n * 49 - 16 * Math.sin(n * Math.PI * i / 100)}`).join(' ')} fill="none" stroke={[palette.accent, palette.dataNeg, palette.dataCoreHi][n - 1]} strokeWidth="2"/><text x="380" y={94 + n * 49} textAnchor="middle" className="vdw-mode-label">n = {n}</text></g>)}
    {[left - 12, right].map(x => <rect key={x} x={x} y="55" width="12" height="231" rx="2" fill={palette.text3}/>)}
    <Arrow x1={left - 102} x2={left - 14} y={302} color={palette.text3} width={5}/><Arrow x1={left + 64} x2={left + 2} y={302} color={palette.text3} width={3}/>
    <Arrow x1={right + 102} x2={right + 14} y={302} color={palette.text3} width={5}/><Arrow x1={right - 64} x2={right - 2} y={302} color={palette.text3} width={3}/>
    <Arrow x1={left} x2={left + net} y={342}/><Arrow x1={right} x2={right - net} y={342}/>
    <text x="380" y="325" textAnchor="middle" fill={palette.accent}>Net attraction</text>
    <text x="380" y="373" textAnchor="middle" className="vdw-svg-muted">d = {gap} nm · pressure imbalance exaggerated for visibility</text>
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
