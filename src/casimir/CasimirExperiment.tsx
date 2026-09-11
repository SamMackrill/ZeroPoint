import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowLeftRight, Info, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { BrandMark } from '../app/BrandMark';
import { RepositoryLink } from '../app/RepositoryLink';
import { CasimirModel, STEP, extent, lifeStage, phase, type ChargePair, type Zepton } from './model';
import { Scene, type SceneLayers } from './Scene';
import './casimir.css';

/** Format a pressure delta with an explicit sign and fixed precision. */
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(3)}`;
const paper = './docs/papers/Electromagnetic%20Motion%20as%20an%20Extended%20Casimir%20Effect.pdf#page=3';

/** Render the lifecycle details for the currently inspected Zepton. */
function Lifetime({ particle, expired }: { particle: Zepton | null; expired: boolean }) {
  if (!particle) return <p className="casimir-muted">Inspect a Zepton to follow its short lifetime.</p>;
  const p = expired ? { ...particle, age: particle.lifetime } : particle;
  const f = phase(p), distance = extent(p) * 225, dx = Math.cos(p.angle) * distance, dy = Math.sin(p.angle) * distance;
  return <>
    <div className="casimir-life-heading"><strong>Zepton #{p.id}</strong><span>{p.gap ? 'GAP BIRTH' : 'FIELD BIRTH'}</span></div>
    <svg viewBox="0 0 300 145" className="casimir-loupe" role="img" aria-label={`${lifeStage(p)}; ${Math.round(f * 100)} percent of lifetime elapsed`}>
      <circle cx="150" cy="70" r="55" fill="none" stroke="#28424d" strokeDasharray="3 5" />
      {!expired && <g>
        <line x1={150 - dx} y1={70 - dy} x2={150 + dx} y2={70 + dy} stroke="#97b2c1" />
        <circle cx={150 - dx} cy={70 - dy} r="13" fill="#204f68" stroke="#8dd7f8" />
        <circle cx={150 + dx} cy={70 + dy} r="13" fill="#6c4937" stroke="#ffc397" />
        <text x={150 - dx} y={75 - dy} textAnchor="middle" fill="#c8efff" fontSize="17">−</text>
        <text x={150 + dx} y={75 + dy} textAnchor="middle" fill="#ffe0c4" fontSize="17">+</text>
      </g>}
      {expired && <text x="150" y="76" textAnchor="middle" fill="#b4c6cf" fontSize="13">Lifetime complete</text>}
      <text x="150" y="141" textAnchor="middle" fill="#8ba4b4" fontSize="10">{f < .5 ? 'Lobes separate as the pair grows' : 'Lobes return inward as the pair collapses'}</text>
    </svg>
    <div className="casimir-life-track" role="progressbar" aria-label="Zepton lifetime" aria-valuenow={Math.round(f * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${f * 100}%` }}/></div>
    <div className="casimir-life-labels"><span>Birth</span><span>Maximum size</span><span>Annihilation</span></div>
    <p className="casimir-stage">{lifeStage(p)}</p>
    <dl className="casimir-readings">
      <div><dt>Age / lifetime</dt><dd>{p.age.toFixed(2)} / {p.lifetime.toFixed(2)} τ</dd></div>
      <div><dt>Alignment</dt><dd>{expired ? '—' : `${Math.round(p.alignment * 100)}%`}</dd></div>
      <div><dt>Pressure contribution</dt><dd>{expired ? 'Ended' : `${signed(p.contribution)} a.u.`}</dd></div>
      <div><dt>Interaction</dt><dd>{expired ? 'Pair no longer exists' : p.gap ? 'Pushes in all directions' : p.neighbor !== null ? `Contracts toward #${p.neighbor}` : p.deflected ? 'Deflects · opens a gap' : 'Turns toward local field'}</dd></div>
    </dl>
  </>;
}

/** Coordinate the interactive charge-pair experiment and its controls. */
export function CasimirExperiment({ active, onBack }: { active: boolean; onBack: () => void }) {
  const modelRef = useRef<CasimirModel | null>(null);
  if (!modelRef.current) modelRef.current = new CasimirModel();
  const model = modelRef.current;
  const [revision, setRevision] = useState(0), [running, setRunning] = useState(false), [speed, setSpeed] = useState(1);
  const [pair, setPair] = useState<ChargePair>('electron-electron'), [separation, setSeparation] = useState(5.6);
  const [layers, setLayers] = useState<SceneLayers>({ pressure: true, interactions: true, zeptons: true });
  const [selected, setSelected] = useState<number | null>(null), [follow, setFollow] = useState(true);
  const lastSelected = useRef<Zepton | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  /** Request a render after mutating the model held in the ref. */
  const refresh = () => setRevision(r => r + 1);
  /** Recreate the model for a charge pairing and initial separation. */
  function reset(nextPair = pair, nextSeparation = separation) {
    modelRef.current = new CasimirModel(nextPair, nextSeparation);
    setPair(nextPair); setSeparation(nextSeparation); setRunning(false); setSelected(null); lastSelected.current = null; refresh();
  }
  useEffect(() => { if (!active) setRunning(false); }, [active]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) setRunning(false); };
    document.addEventListener('visibilitychange', visibility); return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (!active || !running) return;
    let frame = 0, previous = performance.now(), accumulator = 0;
    const animate = (now: number) => {
      accumulator += Math.min((now - previous) / 1000, .1) * speed; previous = now;
      let changed = false;
      while (accumulator >= STEP) { modelRef.current!.step(); accumulator -= STEP; changed = true; }
      if (changed) setRevision(r => r + 1);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate); return () => cancelAnimationFrame(frame);
  }, [active, running, speed]);
  useEffect(() => {
    if (!active) return;
    const keyboard = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      if (el.closest('input, select, textarea, button, a, summary, [contenteditable=true]')) return;
      if (event.code === 'Space') { event.preventDefault(); setRunning(r => !r); }
      if (event.code === 'ArrowRight') { event.preventDefault(); setRunning(false); modelRef.current!.step(); setRevision(r => r + 1); }
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, [active]);
  let inspected = model.particles.find(p => p.id === selected);
  if (follow && !inspected) inspected = [...model.particles].reverse().find(p => pair === 'electron-electron' ? p.gap : model.bridge(p)) ?? model.particles.find(p => model.bridge(p));
  useEffect(() => {
    if (inspected) { lastSelected.current = { ...inspected }; if (follow && selected !== inspected.id) setSelected(inspected.id); }
  }, [revision, inspected, follow, selected]);
  const displayed = inspected ?? lastSelected.current;
  const like = pair === 'electron-electron';
  const tendency = Math.abs(model.delta) < .002 ? 'Building pressure' : model.delta > 0 ? 'Apart' : 'Together';
  const start = model.history[0]?.time ?? 0, end = model.history.at(-1)?.time ?? 0;
  /** Convert one pressure history series into SVG polyline coordinates. */
  const plot = (key: 'inner' | 'outer') => model.history.map(p => `${20 + (p.time - start) / Math.max(1, end - start) * 710},${95 - (p[key] - 1) * 160}`).join(' ');
  return <div className="casimir-app" style={{ display: active ? undefined : 'none' }}>
    <header className="topbar"><div className="identity"><BrandMark/><span>ZeroPoint<span className="brand-period">.</span></span><span className="brand-divider"/><span className="lab-label">FIELD LABORATORY</span></div><RepositoryLink/></header>
    <main className="casimir-workspace">
      <div className="casimir-breadcrumb"><button onClick={onBack}><ArrowLeft size={14}/> Experiment library</button><span>04 / CHARGE INTERACTIONS</span></div>
      <div className="casimir-heading"><div><h1>Motion from the vacuum</h1><p>Extended Casimir effect · short-lived Zeptons and local van der Waals pressure.</p></div><button className="assumption-pill" onClick={() => setShowNotes(v => !v)} aria-expanded={showNotes}><Info size={14}/> Illustrative model</button></div>
      {showNotes && <div className="casimir-notes"><p>This experiment animates Fleming’s proposed mechanism in Section 4, Figures 3–4. Pressure kernels, lifetimes and motion gain are illustrative choices; this is not a validated derivation of electrostatic force. Section 5 leaves the quantitative force law unresolved. τ is an expanded observation clock, not seconds. Dipole sizes and spacing are exaggerated.</p><a href="./docs/casimir-model.md" target="_blank" rel="noreferrer">Model and source notes ↗</a><a href={paper} target="_blank" rel="noreferrer">Read Section 4 ↗</a></div>}
      <div className="casimir-modes" aria-label="Charge pairing">
        <button aria-pressed={like} onClick={() => reset('electron-electron')}><span className="casimir-pair-symbol">e⁻ <ArrowLeftRight size={20}/> e⁻</span><span><strong>Electron / electron</strong><small>Deflection & gap filling · repulsion</small></span><span className="casimir-mode-number">FIG. 4</span></button>
        <button aria-pressed={!like} onClick={() => reset('electron-proton')}><span className="casimir-pair-symbol">e⁻ <ArrowLeftRight size={20}/> p⁺</span><span><strong>Electron / proton</strong><small>Aligned contraction · attraction</small></span><span className="casimir-mode-number">FIG. 3</span></button>
      </div>
      <div className="casimir-toolbar">
        <div className="transport"><button className="play-button" onClick={() => setRunning(r => !r)}>{running ? <Pause size={15}/> : <Play size={15}/>} {running ? 'Pause' : 'Run'}<kbd>Space</kbd></button><button className="tool-button" onClick={() => { setRunning(false); model.step(); refresh(); }}><SkipForward size={15}/> Step</button><button className="tool-button" onClick={() => reset()}><RotateCcw size={15}/> Reset</button><select aria-label="Casimir playback speed" value={speed} onChange={e => setSpeed(+e.target.value)}>{[.1, .25, .5, 1, 2].map(s => <option key={s} value={s}>{s}×</option>)}</select></div>
        <label className="casimir-separation">Initial separation <input aria-label="Initial charge separation" type="range" min="4" max="7" step=".2" value={separation} onChange={e => reset(pair, +e.target.value)}/><output>{separation.toFixed(1)} a.u.</output></label>
      </div>
      <div className="casimir-columns">
        <div className="casimir-main">
          <section className="casimir-scene" aria-label="Charge interaction visualization">
            <div className="casimir-scene-top"><span><i className={`dot ${running ? '' : 'paused'}`}/>{running ? 'LIVE FIELD' : 'PAUSED'} <b data-testid="casimir-time">{model.time.toFixed(2)} τ</b></span><span>2D section · expanded time</span></div>
            <Scene model={model} revision={revision} layers={layers} selected={inspected?.id ?? null} onSelect={p => { setSelected(p.id); lastSelected.current = { ...p }; setFollow(false); }}/>
            <div className="casimir-scene-caption"><strong>{like ? 'Random births at the meeting point push outwards' : 'Collapsing chains lower the pressure between charges'}</strong><span>Orange + / blue − lobes · mint rings: births · yellow arrows: net push</span></div>
          </section>
          <div className="casimir-legend"><span>LOCAL PRESSURE / P₀</span><div><i/><div><span>0.55 · lower</span><span>1 · ambient</span><span>1.45 · higher</span></div></div><small>Colour saturates at the scale endpoints</small></div>
          <div className="casimir-layers">{(['pressure', 'interactions', 'zeptons'] as const).map(key => <label key={key}><input type="checkbox" checked={layers[key]} onChange={e => setLayers(v => ({ ...v, [key]: e.target.checked }))}/>{key === 'pressure' ? 'Pressure colour' : key === 'interactions' ? 'Interaction arrows' : 'Zeptons'}</label>)}<span>Click a pair to inspect its lifetime</span></div>
          <section className="casimir-metrics" aria-label="Pressure readings"><div><span>BETWEEN CHARGES</span><strong data-testid="inner-pressure">{model.inner.toFixed(3)} <small>P₀</small></strong></div><div><span>OUTER MEDIUM</span><strong>{model.outer.toFixed(3)} <small>P₀</small></strong></div><div><span>INNER − OUTER</span><strong data-testid="pressure-difference">{signed(model.delta)} <small>P₀</small></strong></div><div><span>NET PUSH</span><strong data-testid="motion-tendency">{tendency}</strong></div></section>
          <section className="casimir-chart"><div className="casimir-card-heading"><h2>Pressure builds from fleeting interactions</h2><span><i/> Inner <i/> Outer</span></div><svg viewBox="0 0 750 180" role="img" aria-label="Inner and outer pressure history in units of ambient pressure P zero"><text x="20" y="20">1.45 P₀</text><text x="20" y="170">0.55 P₀</text><line x1="20" y1="95" x2="730" y2="95" stroke="#4d6577" strokeDasharray="4 5"/><text x="677" y="88">1.00 P₀</text><polyline points={plot('outer')} fill="none" stroke="#95b1c5" strokeDasharray="4 5" strokeWidth="1.5"/><polyline points={plot('inner')} fill="none" stroke="#efbd8c" strokeWidth="2"/></svg><div className="casimir-chart-times"><span>{start.toFixed(1)} τ</span><span>Gap average along the axis · outer probes beyond each charge</span><span>{end.toFixed(1)} τ</span></div></section>
        </div>
        <aside className="casimir-inspector" aria-label="Zepton lifecycle inspector">
          <section className="casimir-card"><div className="casimir-card-heading"><h2>One fleeting lifetime</h2><span>LIVE LOUPE</span></div><Lifetime particle={displayed} expired={!inspected}/><div className="casimir-inspect-actions"><button onClick={() => { const p = [...model.particles].reverse().find(p => model.bridge(p)); if (p) { setSelected(p.id); lastSelected.current = { ...p }; setFollow(false); } }}>Inspect newest Zepton</button><label><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)}/> Follow next birth after annihilation</label></div><p className="casimir-muted">{like ? 'A weak or neutral midpoint leaves new dipoles disordered. Neighbouring dipoles turn toward their local field.' : 'Each new pair first expands and pushes back, then contracts. Dashed links show neighbouring pairs moving inward.'}</p></section>
          <section className="casimir-card"><div className="casimir-card-heading"><h2>From pressure to motion</h2></div><p className="casimir-muted">{model.released ? 'Charges respond to the measured pressure difference.' : 'Charges are held so you can watch the surrounding field.'} {like ? 'Equal masses respond equally.' : 'The proton responds 1/1836 as much as the electron.'}</p><button className="casimir-release" disabled={model.boundaryReached} onClick={() => { if (model.released) model.hold(); else model.released = true; refresh(); }}>{model.released ? 'Hold charges' : 'Release charges'}</button><small className="casimir-muted">Illustrative acceleration · run playback to move</small>{model.boundaryReached && <p role="status" className="casimir-limit">Observation limit reached. Reset to repeat the motion.</p>}</section>
          <section className="casimir-card casimir-events"><div className="casimir-card-heading"><h2>A field that keeps renewing</h2></div><div className="casimir-counts"><span><b>{model.particles.length}</b> alive</span><span><b>{model.births}</b> born</span><span><b>{model.deaths}</b> ended</span></div><p className="casimir-muted">{like ? `${model.gapBirths} extra gap births since reset` : 'Birth, expansion and contraction overlap in time'}</p><ol>{model.events.map(e => <li key={e.id}><time>{e.time.toFixed(2)} τ</time>{e.text}</li>)}</ol>{!model.events.length && <p className="casimir-muted">Run or step to see interactions.</p>}</section>
        </aside>
      </div>
      <section className="casimir-explanation" aria-label="Mechanism sequence">{(like ? [
        ['01', 'Born, then aligned', 'Dipoles continually appear with random orientations and turn in the field of each electron.'],
        ['02', 'Deflect, then refill', 'Opposing alignments deflect near the middle. Fresh dipoles fill gaps and expand against neighbours.'],
        ['03', 'A greater inner push', 'Repeated gap births sustain higher local pressure, producing an outward motion tendency.'],
      ] : [
        ['01', 'A connected alignment', 'Between opposite charges, dipoles orient in a continuous chain.'],
        ['02', 'Grow, then contract', 'New pairs push back as they grow. During collapse, adjacent pairs shift inward toward the voids.'],
        ['03', 'A greater outer push', 'Contraction outweighs growth in this illustration. Higher outer pressure pushes the charges together.'],
      ]).map(([n, title, text]) => <div key={n}><span>{n}</span><h2>{title}</h2><p>{text}</p></div>)}</section>
      <footer className="casimir-footer"><span>Fleming’s proposed mechanism · qualitative pressure, arbitrary spatial units</span><a href={paper} target="_blank" rel="noreferrer">Section 4 · Figures 3 & 4 ↗</a><a href="./docs/casimir-model.md" target="_blank" rel="noreferrer">Model notes ↗</a></footer>
    </main>
  </div>;
}
