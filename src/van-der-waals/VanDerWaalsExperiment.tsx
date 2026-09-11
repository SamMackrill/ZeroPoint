import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Download, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { BrandMark } from '../app/BrandMark';
import { RepositoryLink } from '../app/RepositoryLink';
import { downloadFile } from '../persistence/experiment';
import { casimir, GAP_MAX_NM, GAP_MIN_NM, london, pressureCSV, pressureSweep } from './model';
import './van-der-waals.css';

const BOOK = './docs/papers/Book%20-%20the-zero-point-universe.pdf';
const stages = [
  { title: 'Induce a dipole', subtitle: 'A neutral atom can polarize', figure: '3-2', page: 28 },
  { title: 'Correlate the fluctuations', subtitle: 'From dipoles to attraction', figure: '3-1', page: 28 },
  { title: 'Reveal the pressure', subtitle: 'A boundary changes the balance', figure: '3-3 / 3-4', page: 29 },
];
const number = (n: number) => n === 0 ? '0' : Math.abs(n) < .001 || Math.abs(n) >= 10000 ? n.toExponential(3) : n.toPrecision(4);

function Arrow({ x1, x2, y, color = '#9ce3c5', width = 3 }: { x1: number; x2: number; y: number; color?: string; width?: number }) {
  const sign = Math.sign(x2 - x1);
  return <g stroke={color} fill={color}><line x1={x1} x2={x2 - sign * 7} y1={y} y2={y} strokeWidth={width}/><path d={`M ${x2} ${y} l ${-sign * 10} -6 v 12 z`} stroke="none"/></g>;
}

/** Charge lobes stay symmetric about a fixed centre; this is a schematic, not particle dynamics. */
function Dipole({ x, y, moment }: { x: number; y: number; moment: number }) {
  const offset = moment * 30;
  return <g><ellipse cx={x} cy={y} rx="70" ry="51" fill="#142b37" stroke="#355968" strokeDasharray="4 6"/>
    <line x1={x - offset} x2={x + offset} y1={y} y2={y} stroke="#7b9fa9"/>
    <circle cx={x - offset} cy={y} r="16" fill="#427d9b" stroke="#90d6ed"/><text x={x - offset} y={y + 6} textAnchor="middle" fill="#ecfaff">−</text>
    <circle cx={x + offset} cy={y} r="16" fill="#966448" stroke="#f5b88d"/><text x={x + offset} y={y + 6} textAnchor="middle" fill="#fff3e7">+</text>
    <circle cx={x} cy={y + 66} r="2" fill="#6c8b9a"/>
  </g>;
}

function InductionDiagram({ polarization }: { polarization: number }) {
  return <svg viewBox="0 0 760 350" role="img" aria-label="Neutral atom and induced dipole: an applied electric field displaces the negative charge cloud opposite to the field">
    <text x="200" y="42" textAnchor="middle">A · No applied field</text><text x="553" y="42" textAnchor="middle">B · Induced dipole</text>
    <circle cx="200" cy="180" r="75" fill="#32627b33" stroke="#82cdec" strokeDasharray="3 6"/>
    <circle cx={553 - polarization * 45} cy="180" r="75" fill="#32627b33" stroke="#82cdec"/>
    {[200, 553].map(x => <g key={x}><circle cx={x} cy="180" r="14" fill="#9a684f" stroke="#f5b88d"/><text x={x} y="186" textAnchor="middle" fill="#ffe0c8">+</text></g>)}
    <text x="200" y="121" textAnchor="middle" fill="#91d9f4">−</text><text x={553 - polarization * 45} y="121" textAnchor="middle" fill="#91d9f4">−</text>
    <Arrow x1={475} x2={475 + 150 * polarization + 1} y={83}/><text x="650" y="89" fill="#9ce3c5">E</text>
    <text x="200" y="292" textAnchor="middle">Mean dipole = 0</text><text x="553" y="292" textAnchor="middle">p = αE</text>
    <text x="380" y="328" textAnchor="middle" className="vdw-svg-muted">Net charge stays zero. The charge distribution changes.</text>
  </svg>;
}

function PairDiagram({ distance, tick }: { distance: number; tick: number }) {
  const spread = 160 + (distance - 1) * 95, left = 380 - spread / 2, right = 380 + spread / 2;
  const moment = Math.cos(tick * Math.PI / 60);
  return <svg viewBox="0 0 760 350" role="img" aria-label="Two correlated fluctuating dipoles with fixed centres and inward arrows showing their average London attraction">
    <text x="380" y="42" textAnchor="middle">Fluctuate together. Attract on average.</text>
    <Dipole x={left} y={150} moment={moment}/><Dipole x={right} y={150} moment={moment}/>
    <text x={left} y="90" textAnchor="middle" className="vdw-svg-muted">Dipole A</text><text x={right} y="90" textAnchor="middle" className="vdw-svg-muted">Dipole B</text>
    <line x1={left} x2={right} y1="229" y2="229" stroke="#627b8c"/>
    <text x="380" y="254" textAnchor="middle">r = {distance.toFixed(2)} r₀</text>
    <Arrow x1={left - 50} x2={left + 12 + 42 / distance ** 3} y={282}/><Arrow x1={right + 50} x2={right - 12 - 42 / distance ** 3} y={282}/>
    <text x="380" y="326" textAnchor="middle" className="vdw-svg-muted">⟨pA⟩ = ⟨pB⟩ = 0, but ⟨pA pB⟩ ≠ 0 · schematic correlation</text>
  </svg>;
}

function PlateDiagram({ gap, modes }: { gap: number; modes: boolean }) {
  const width = 150 + (gap - 100) / 900 * 160, left = 380 - width / 2, right = 380 + width / 2;
  const net = 27 + 18 * Math.log10(Math.abs(casimir(gap, 1).pressure) / .0013);
  return <svg viewBox="0 0 760 380" role="img" aria-label={`Two conducting plates ${gap} nanometres apart, with balanced background stress and an inward net pressure difference. Mode shapes and arrow scales are illustrative.`}>
    <defs><pattern id="vdw-field-grid" width="42" height="44" patternUnits="userSpaceOnUse"><ellipse cx="21" cy="22" rx="10" ry="4" transform="rotate(-35 21 22)" fill="none" stroke="#476577" strokeWidth="1"/></pattern></defs>
    <rect x="45" y="63" width={left - 57} height="213" fill="url(#vdw-field-grid)"/><rect x={right + 12} y="63" width={703 - right} height="213" fill="url(#vdw-field-grid)"/>
    <rect x={left} y="63" width={width} height="213" fill="#16312f" fillOpacity=".6"/>
    <text x="115" y="35" textAnchor="middle">Outside</text><text x="380" y="35" textAnchor="middle">Modified field</text><text x="645" y="35" textAnchor="middle">Outside</text>
    {modes && [1, 2, 3].map(n => <g key={n}><polyline points={Array.from({ length: 101 }, (_, i) => `${left + width * i / 100},${72 + n * 49 - 16 * Math.sin(n * Math.PI * i / 100)}`).join(' ')} fill="none" stroke={['#94e2bd', '#87c6ed', '#d5b4f0'][n - 1]} strokeWidth="2"/><text x="380" y={94 + n * 49} textAnchor="middle" className="vdw-mode-label">n = {n}</text></g>)}
    {[left - 12, right].map(x => <rect key={x} x={x} y="55" width="12" height="231" rx="2" fill="#93a8b5"/>)}
    <Arrow x1={left - 102} x2={left - 14} y={302} color="#7595a6" width={5}/><Arrow x1={left + 64} x2={left + 2} y={302} color="#7595a6" width={3}/>
    <Arrow x1={right + 102} x2={right + 14} y={302} color="#7595a6" width={5}/><Arrow x1={right - 64} x2={right - 2} y={302} color="#7595a6" width={3}/>
    <Arrow x1={left} x2={left + net} y={342}/><Arrow x1={right} x2={right - net} y={342}/>
    <text x="380" y="325" textAnchor="middle" fill="#9ce3c5">Net attraction</text>
    <text x="380" y="373" textAnchor="middle" className="vdw-svg-muted">d = {gap} nm · pressure imbalance exaggerated for visibility</text>
  </svg>;
}

function PressurePlot({ gap, onGap }: { gap: number; onGap: (value: number) => void }) {
  const x = (d: number) => 62 + Math.log10(d / 100) * 620;
  const y = (p: number) => 28 + (Math.log10(Math.abs(casimir(100, 1).pressure)) - Math.log10(Math.abs(p))) * 36;
  return <div className="vdw-plot"><svg viewBox="0 0 760 226" role="img" aria-label="Logarithmic plot of attractive pressure magnitude versus plate gap. Doubling the gap reduces pressure magnitude sixteenfold.">
    {[100, 200, 500, 1000].map(d => <g key={d}><line x1={x(d)} x2={x(d)} y1="20" y2="178" stroke="#29404c" strokeDasharray="3 5"/><text x={x(d)} y="201" textAnchor="middle">{d}</text></g>)}
    {[10, 1, .1, .01].map(p => <g key={p}><line x1="62" x2="682" y1={y(p)} y2={y(p)} stroke="#29404c" strokeDasharray="3 5"/><text x="49" y={y(p) + 5} textAnchor="end">{p}</text></g>)}
    <polyline points={pressureSweep(1).map(r => `${x(r.gapNm)},${y(r.pressure)}`).join(' ')} fill="none" stroke="#96e0c1" strokeWidth="2.5"/>
    <circle cx={x(gap)} cy={y(casimir(gap, 1).pressure)} r="6" fill="#f2c38d" stroke="#172530" strokeWidth="2"/>
    <text x="65" y="14">|P| / Pa</text><text x="682" y="222" textAnchor="end">Gap / nm · log axes</text>
  </svg><div className="vdw-gap-presets">{[100, 200, 500, 1000].map(d => <button key={d} aria-pressed={gap === d} onClick={() => onGap(d)}>{d} nm</button>)}</div></div>;
}

export function VanDerWaalsExperiment({ active, onBack }: { active: boolean; onBack: () => void }) {
  const [stage, setStage] = useState(0), [polarization, setPolarization] = useState(.8), [distance, setDistance] = useState(1.4);
  const [gap, setGap] = useState(200), [area, setArea] = useState(1), [modes, setModes] = useState(true);
  const [tick, setTick] = useState(0), [running, setRunning] = useState(false);
  useEffect(() => { if (!active || stage !== 1) setRunning(false); }, [active, stage]);
  useEffect(() => {
    const hide = () => { if (document.hidden) setRunning(false); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => {
    if (!active || !running || stage !== 1) return;
    const timer = window.setInterval(() => setTick(t => (t + 1) % 120), 50);
    return () => window.clearInterval(timer);
  }, [active, running, stage]);
  const reference = casimir(gap, area), pair = london(distance), current = stages[stage];
  function reset() { setRunning(false); setTick(0); setStage(0); setPolarization(.8); setDistance(1.4); setGap(200); setArea(1); setModes(true); }

  return <div className="vdw-app" style={{ display: active ? undefined : 'none' }}>
    <header className="topbar"><div className="identity"><BrandMark/><span>ZeroPoint<span className="brand-period">.</span></span><span className="brand-divider"/><span className="lab-label">FIELD LABORATORY</span></div><RepositoryLink/></header>
    <main className="vdw-main">
      <div className="vdw-nav"><button onClick={onBack}><ArrowLeft size={15}/>Medium laboratory</button><a href={`${BOOK}#page=27`} target="_blank" rel="noreferrer"><BookOpen size={15}/>Chapter 3 <ArrowRight size={13}/></a></div>
      <div className="vdw-heading"><div><span className="micro-label">04 / INTERACTIONS IN THE ZERO-POINT FIELD</span><h1>Van der Waals & vacuum pressure</h1><p>Follow an induced dipole into a collective force — and a measurable pressure difference.</p></div><span className="vdw-badge">ILLUSTRATIVE EXPERIMENT</span></div>
      <div className="vdw-stages" role="group" aria-label="Experiment stages">{stages.map((s, i) => <button key={s.title} aria-pressed={stage === i} onClick={() => setStage(i)}><span>0{i + 1}</span><div><strong>{s.title}</strong><small>{s.subtitle}</small></div><ArrowRight size={16}/></button>)}</div>
      <div className="vdw-layout">
        <section className="vdw-scene-card" aria-label={current.title}>
          <div className="vdw-card-heading"><span>{stage === 2 ? 'BOUNDARIES → STRESS DIFFERENCE' : 'CHARGE RESPONSE → CORRELATION'}</span><a href={`${BOOK}#page=${current.page}`} target="_blank" rel="noreferrer">After Fig. {current.figure}</a></div>
          <div className="vdw-diagram">{stage === 0 ? <InductionDiagram polarization={polarization}/> : stage === 1 ? <PairDiagram distance={distance} tick={tick}/> : <PlateDiagram gap={gap} modes={modes}/>}</div>
          <div className="vdw-legend">{stage === 2 ? <span><i className="vdw-negative"/>Opposing field stresses</span> : <><span><i className="vdw-positive"/>Positive charge</span><span><i className="vdw-negative"/>Negative charge</span></>}<span><i className="vdw-mint"/>{stage === 2 ? 'Net pressure' : 'Field / mean force'}</span><small>Diagram · not to scale</small></div>
          <div className="vdw-explanation">
            <h2>{['Neutral does not mean unresponsive', 'Zero mean dipoles can still attract', 'The difference is the pressure'][stage]}</h2>
            {stage === 0 && <p>An electric field shifts an atom’s negative charge cloud relative to its positive centre. Its total charge remains zero, but it now has a dipole moment. Move the field slider to see this induced response, following Figure 3-2.</p>}
            {stage === 1 && <p>A fluctuating dipole couples to its neighbour. Their correlated fluctuations lower the pair’s interaction energy, producing London dispersion attraction. Run the schematic to see both moments reverse while the mean attraction remains inward. Fleming extends this dipole picture to the zero-point field.</p>}
            {stage === 2 && <p>In Fleming’s picture, the surrounding fluctuations press on both faces of each plate. Boundaries change the field between them, leaving a small inward imbalance. The standard calculation obtains this force per area from the change in the field–plate interaction energy as the gap changes.</p>}
          </div>
        </section>
        <aside className="vdw-controls" aria-label="Experiment controls"><div className="vdw-card-heading"><span>ADJUST & OBSERVE</span><button aria-label="Reset van der Waals experiment" onClick={reset}><RotateCcw size={15}/></button></div>
          {stage === 0 && <><label className="vdw-slider">Applied field <output>{polarization.toFixed(2)} E₀</output><input aria-label="Applied field" type="range" min="0" max="1" step=".05" value={polarization} onChange={e => setPolarization(+e.target.value)}/></label><p className="vdw-control-note">E₀ is an arbitrary field scale. Cloud displacement is exaggerated; α is fixed.</p><div className="vdw-equation">p = αE</div><p className="vdw-control-note">Polarizability α describes how readily a charge distribution responds to an electric field.</p><button className="vdw-next" onClick={() => setStage(1)}>Connect two dipoles <ArrowRight size={15}/></button></>}
          {stage === 1 && <><label className="vdw-slider">Pair separation <output>{distance.toFixed(2)} r₀</output><input aria-label="Pair separation" type="range" min="1" max="3" step=".05" value={distance} onChange={e => setDistance(+e.target.value)}/></label><div className="vdw-transport"><button onClick={() => setRunning(!running)}>{running ? <Pause size={14}/> : <Play size={14}/>} {running ? 'Pause dipoles' : 'Run dipoles'}</button><button aria-label="Step dipoles" disabled={running} onClick={() => setTick(t => (t + 15) % 120)}><SkipForward size={16}/></button></div><p className="vdw-control-note" data-testid="vdw-phase">Phase {(tick * 3).toFixed(0)}° · illustrative clock</p><div className="vdw-equation">U(r) = −C₆ / r⁶<br/>F(r) = −6C₆ / r⁷</div><dl className="vdw-readouts"><div><dt>Pair energy / E₀</dt><dd data-testid="vdw-pair-energy">{number(pair.energy)}</dd></div><div><dt>Mean force / (E₀/r₀)</dt><dd>{number(pair.force)}</dd></div></dl><p className="vdw-control-note">Short-range London reference. Here E₀ = C₆/r₀⁶; r₀ is an arbitrary distance scale. Doubling r weakens the energy by 64× and the force by 128×. At longer distances, retardation changes these powers.</p><button className="vdw-next" onClick={() => setStage(2)}>See the pressure difference <ArrowRight size={15}/></button></>}
          {stage === 2 && <><label className="vdw-slider">Plate gap <output>{gap} nm</output><input aria-label="Plate gap" type="range" min={GAP_MIN_NM} max={GAP_MAX_NM} step="10" value={gap} onChange={e => setGap(+e.target.value)}/></label><label className="vdw-slider">Plate area <output>{area.toFixed(1)} mm²</output><input aria-label="Plate area" type="range" min=".1" max="10" step=".1" value={area} onChange={e => setArea(+e.target.value)}/></label><label className="vdw-check"><input type="checkbox" checked={modes} onChange={e => setModes(e.target.checked)}/>Show example cavity modes</label><div className="vdw-equation">P = −π²ℏc / (240d⁴)<br/>F ≈ P × A</div><dl className="vdw-readouts"><div><dt>Net pressure</dt><dd data-testid="vdw-pressure">{number(reference.pressure)} Pa</dd></div><div><dt>Force on each plate</dt><dd data-testid="vdw-force">{number(reference.force * 1e6)} μN</dd></div><div><dt>Interaction energy / area</dt><dd>{number(reference.energyPerArea * 1e9)} nJ/m²</dd></div></dl><p className="vdw-control-note">Negative = attraction. Ideal perfect conductors at 0 K; finite-area force neglects edges. Values are an analytic reference.</p></>}
        </aside>
      </div>
      {stage === 2 && <div className="vdw-pressure-details"><section className="vdw-card"><div className="vdw-card-heading"><span>GAP SWEEP / IDEAL REFERENCE</span><button onClick={() => downloadFile('van-der-waals-pressure-sweep.csv', pressureCSV(area), 'text/csv')}><Download size={14}/>Export CSV</button></div><PressurePlot gap={gap} onGap={setGap}/><p>Double the gap → <strong>1/16 of the pressure</strong>. Double the area → twice the force, at the same pressure.</p></section><section className="vdw-card"><h2>How zero-point energy produces stress</h2><p>Each field mode has ground-state energy ½ℏω. The plates change the allowed spectrum. Subtracting the infinite-separation reference gives a finite interaction energy per area:</p><div className="vdw-equation">U / A = −π²ℏc / (720d³)<br/>P = −∂(U/A) / ∂d</div><p>Pressure is the force per area associated with changing the cavity width. This is a <strong>difference in normal stress</strong>; the readout does not measure an absolute, uniform pressure of the vacuum.</p><p className="vdw-control-note">The curves illustrate normal standing-wave components (n = 1, 2, 3; λₙ = 2d/n). They are examples of boundary constraints, not a count of all modes or a wavelength cutoff. Their display does not set the calculated pressure.</p></section></div>}
      <section className="vdw-context"><div><span className="micro-label">READING CHAPTER 3</span><h2>From molecular attraction to a field pressure</h2></div><p>Keesom forces involve permanent dipoles; Debye forces involve a permanent and an induced dipole; London dispersion involves fluctuating, induced dipoles. This experiment follows the London branch into Fleming’s account of the Casimir effect.</p><p>Fleming treats vacuum fluctuations as interacting electric dipoles. The numerical plate result here is the standard ideal Casimir reference, evaluated separately from that illustration. A microscopic pressure law for Fleming’s medium is not derived by these diagrams.</p></section>
      <details className="vdw-sources"><summary><BookOpen size={17}/>Source figures & model notes<span>Chapter 3 · Figures 3-1–3-4</span></summary><div className="vdw-source-content"><p>Original embedded figures extracted from Ray Fleming’s <em>The Zero-Point Universe</em>. Page numbers below are PDF page positions. Interactive diagrams above are adaptations.</p><div className="vdw-source-grid">{[
        ['Dipole orientations', 'Opposed and aligned dipoles, with changes in electric moment.', 28],
        ['Induced polarization', 'A neutral hydrogen atom and its polarized charge distribution.', 28],
        ['A cavity in the field', 'Fleming’s schematic of fluctuations outside and between plates.', 29],
        ['A pressure imbalance', 'Nearly balanced opposing stresses leave a net inward force.', 30],
      ].map(([title, caption, page], i) => <figure key={i}><a href={`${BOOK}#page=${page}`} target="_blank" rel="noreferrer"><img src={`./docs/figures/van-der-waals/figure-3-${i + 1}.jpeg`} alt={`Fleming Figure 3-${i + 1}: ${caption}`} loading="lazy"/></a><figcaption><strong>Fig. 3-{i + 1} · {title}</strong><span>{caption} PDF p. {page}.</span></figcaption></figure>)}</div><p>Figure 3-1 shows an opposed, repulsive configuration (I) and an aligned, attractive one (II). The surrounding text calls both repulsive; the interactive explanation uses the charge geometry. The prescribed in-phase motion is a teaching aid, not a quantum dispersion calculation.</p><p>Retardation concerns finite electromagnetic propagation time. Figure 3-3’s “excluded fluctuations” are a heuristic; actual conductor boundary conditions constrain a full electromagnetic spectrum. Neither counting drawn dipoles nor cancelling two arbitrary pressures derives the reference result.</p><p>The ideal reference excludes material dispersion, temperature, surface roughness, edge effects and short-range overlap repulsion. Observing Casimir attraction does not uniquely establish a dipolar vacuum or determine absolute vacuum energy; see <a href="https://arxiv.org/abs/hep-th/0503158" target="_blank" rel="noreferrer">Jaffe’s discussion</a>.</p><div className="vdw-reference-links"><a href="./docs/van-der-waals-model.md" target="_blank" rel="noreferrer">Model & source notes ↗</a><a href="https://journals.aps.org/pr/abstract/10.1103/PhysRev.73.360" target="_blank" rel="noreferrer">Casimir & Polder (1948) ↗</a><a href="https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=906575" target="_blank" rel="noreferrer">NIST-hosted Casimir review ↗</a></div></div></details>
    </main>
  </div>;
}
