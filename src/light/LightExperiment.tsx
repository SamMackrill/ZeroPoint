import { BrandMark } from '../app/BrandMark';
import { RepositoryLink } from '../app/RepositoryLink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Box, Download, Eye, Focus, Info, Pause, Play, RotateCcw, Save, SkipForward, Waves } from 'lucide-react';
import { downloadFile } from '../persistence/experiment';
import { DEFAULT_LIGHT, DEFAULT_LIGHT_VIEW, LIGHT_DT, LIGHT_END_TICK, LIGHT_MODEL, TIME_SECONDS, hopTicks, lightReadout, pairAt, pairCount, parseLightFile, sourceX, waveAt } from './model';
import type { LightParameters, LightState, LightView } from './model';
import type { LightRenderer } from './LightRenderer';
import { useLight } from './useLight';
import './light.css';

/** Render a compact normalized trace with an optional timeline marker. */
function WavePlot({ values, label, start, end, marker }: { values: number[]; label: string; start: string; end: string; marker?: number }) {
  return <div className="light-plot"><svg viewBox="0 0 480 90" preserveAspectRatio="none" role="img" aria-label={label}>
    {[20, 45, 70].map(y => <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="#29404c" strokeDasharray="3 5"/>)}
    <polyline points={values.map((v, i) => `${i / (values.length - 1) * 480},${45 - v * 32}`).join(' ')} fill="none" stroke="#9ce7c1" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>
    {marker !== undefined && <line x1={marker * 480} x2={marker * 480} y1="5" y2="85" stroke="#e8c77c" strokeDasharray="3 3"/>}
  </svg><div><span>{start}</span><span>Normalized E projection</span><span>{end}</span></div></div>;
}

/** Render and coordinate the light induction laboratory. */
export function LightExperiment({ active, onBack }: { active: boolean; onBack: () => void }) {
  const { state, latest, sink, send, error, restart } = useLight(active);
  const [draft, setDraft] = useState<LightParameters>({ ...DEFAULT_LIGHT });
  const [view, setView] = useState<LightView>(() => ({ ...DEFAULT_LIGHT_VIEW, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
  const [selected, setSelected] = useState<number | null>(null), [camera, setCamera] = useState<'orbit' | 'side' | 'pair'>('orbit');
  const [graphicsError, setGraphicsError] = useState(''), [revision, setRevision] = useState(0), [notice, setNotice] = useState('');
  const [checkpoints, setCheckpoints] = useState<LightState[]>([]);
  const host = useRef<HTMLDivElement>(null), renderer = useRef<LightRenderer | null>(null), input = useRef<HTMLInputElement>(null);
  const viewRef = useRef(view), selectedRef = useRef(selected), cameraRef = useRef(camera);
  viewRef.current = view; selectedRef.current = selected; cameraRef.current = camera;
  const onPick = useCallback((index: number) => setSelected(index), []);
  useEffect(() => {
    if (!active || !host.current) return;
    let disposed = false, r: LightRenderer | undefined;
    import('./LightRenderer').then(({ LightRenderer }) => {
      if (disposed || !host.current) return;
      r = new LightRenderer(host.current, viewRef.current, onPick, message => { setGraphicsError(message); send({ type: 'run', value: false }); });
      renderer.current = r; sink.current = s => r?.update(s);
      if (latest.current) r.update(latest.current);
      r.select(selectedRef.current); r.cameraPreset(cameraRef.current);
    }).catch(e => { if (!disposed) { setGraphicsError(`3D view unavailable: ${String(e)}`); send({ type: 'run', value: false }); } });
    return () => { disposed = true; sink.current = null; renderer.current = null; r?.dispose(); };
  }, [active, revision, latest, sink, send, onPick]);
  useEffect(() => { renderer.current?.setOptions(view); }, [view]);
  useEffect(() => { renderer.current?.select(selected); }, [selected]);
  useEffect(() => { renderer.current?.cameraPreset(camera); }, [camera]);
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'BUTTON', 'A', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable || error) return;
      if (e.code === 'Space' && !graphicsError) { e.preventDefault(); send({ type: 'run', value: !latest.current?.running }); }
      if (e.code === 'ArrowRight') { e.preventDefault(); send({ type: 'step' }); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [active, send, latest, error, graphicsError]);
  const s = state ?? { model: LIGHT_MODEL, tick: 0, parameters: DEFAULT_LIGHT, running: false, speed: 1 };
  const p = s.parameters, d = lightReadout(s), inspected = pairAt(p, s.tick, selected ?? d.index);
  const ready = !!state && !error;
  /** Apply the draft light parameters to a fresh paused sequence. */
  function configure() { send({ type: 'configure', parameters: draft }); setSelected(null); setNotice('Parameters applied. The light sequence is paused at its start.'); }
  /** Move playback to an exact light timeline tick. */
  function seek(tick: number) { send({ type: 'seek', tick }); }
  /** Download the current light experiment state. */
  function save() {
    if (!latest.current) return;
    const { model, tick, parameters } = latest.current;
    downloadFile(`zeropoint-light-tick-${tick}.json`, JSON.stringify({ format: 'zeropoint-light', version: 1, state: { model, tick, parameters }, view }), 'application/json');
    setNotice(`Saved the light sequence at tick ${tick}.`);
  }
  /** Load and restore a light experiment file selected by the user. */
  async function load(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error('Light files must be smaller than 100 KB.');
      const saved = parseLightFile(await file.text());
      send({ type: 'restore', state: saved.state }); setView(saved.view); setDraft(saved.state.parameters); setSelected(null);
      setNotice(`Loaded tick ${saved.state.tick}. Playback is paused.`);
    } catch (e) { setNotice(`Could not load: ${e instanceof Error ? e.message : String(e)}`); }
    finally { if (input.current) input.current.value = ''; }
  }
  /** Export the full light handoff timeline as CSV. */
  function exportCSV() {
    const rows = ['tick,time_s,distance_m,excitation_x_L,handoffs,pair_energy_eV,field_energy_eV,departed_energy_eV,probe_E_normalized'];
    for (let tick = 0; tick <= LIGHT_END_TICK; tick++) { const r = lightReadout({ ...s, tick }); rows.push([tick, r.time * TIME_SECONDS, r.time * 250e-9, r.x, r.handoffs, r.pairEnergy, r.fieldEnergy, r.departedEnergy, r.probe.electric].join(',')); }
    downloadFile('zeropoint-light-illustrative-sequence.csv', rows.join('\n'), 'text/csv'); setNotice('Exported the complete prescribed sequence, including future timeline samples.');
  }
  const layers: [keyof LightView, string][] = [['background', 'Background pairs'], ['pairs', 'Induced pair'], ['response', 'Surrounding dipole response'], ['fields', 'E / B wave and arrows'], ['envelope', 'Energy envelope'], ['centres', 'Fixed pair centres'], ['reducedMotion', 'Reduced flashing & camera motion']];
  const spatial = Array.from({ length: 161 }, (_, i) => waveAt(p, d.time, p.offset - 6 + i * 12 / 160).electric);
  const history = Array.from({ length: 161 }, (_, i) => waveAt(p, d.time * i / 160, p.probe).electric);
  const pairX = 100 + Math.sin(inspected.angle) * inspected.separation * 140, pairY = 66 - Math.cos(inspected.angle) * inspected.separation * 140;

  return <div className="light-app" style={{ display: active ? undefined : 'none' }}>
    <header className="topbar"><div className="identity"><BrandMark/><span>ZeroPoint<span className="brand-period">.</span></span><span className="brand-divider"/><span className="lab-label">FIELD LABORATORY</span></div><div className="experiment-header-actions"><RepositoryLink/><button className="light-back" onClick={onBack}><ArrowLeft size={15}/><span className="back-label">Medium laboratory</span></button></div></header>
    <main className="light-workbench">
      <div className="light-heading"><div><div className="light-eyebrow">02 / LIGHT IN THE MEDIUM</div><h1>Light through the zero-point field</h1><p>Follow an energy wave through successive, locally rotating pairs.</p></div><a className="light-badge" href="./docs/light-model.md" target="_blank" rel="noreferrer"><Info size={14}/>Illustrative induction model</a></div>
      <div className="light-toolbar"><div className="light-transport">
        <button className="play-button" disabled={!ready || !!graphicsError || d.finished} onClick={() => send({ type: 'run', value: !s.running })}>{s.running ? <Pause size={15}/> : <Play size={15}/>} {s.running ? 'Pause light' : 'Run light'}</button>
        <button className="tool-button" disabled={!ready || d.finished} onClick={() => send({ type: 'step' })}><SkipForward size={15}/>Step</button>
        <button className="light-next" disabled={!ready || d.finished} onClick={() => send({ type: 'next' })}>Next induction<ArrowRight size={15}/></button>
        <button className="tool-button" disabled={!ready} onClick={() => { send({ type: 'reset' }); setSelected(null); }}><RotateCcw size={14}/>Reset</button>
        <select aria-label="Light playback speed" value={s.speed} disabled={!ready} onChange={e => send({ type: 'speed', value: +e.target.value })}>{[.25, .5, 1, 2, 4].map(v => <option key={v} value={v}>{v}×</option>)}</select>
      </div><div className="light-file-actions"><button disabled={!ready} onClick={() => input.current?.click()}>Load light</button><button disabled={!ready} onClick={save}><Save size={14}/>Save light</button><input ref={input} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Import light experiment" onChange={e => load(e.target.files?.[0])}/></div></div>
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => { restart(); setDraft({ ...DEFAULT_LIGHT }); setSelected(null); setNotice('Light worker restarted with default parameters.'); }}>Restart light worker</button></div>}
      <div className="light-layout"><div className="light-stage-column">
        <section className="light-viewport-shell" aria-label="Light visualization"><div className="light-viewport" ref={host}/>
          <div className="light-view-top"><span><i className={`dot ${s.running ? '' : 'paused'}`}/>{d.finished ? 'PULSE EXITED' : s.running ? 'PROPAGATING' : 'PAUSED'}<b>c → local induction</b></span><div>{(['orbit', 'side', 'pair'] as const).map(mode => <button key={mode} aria-pressed={camera === mode} onClick={() => setCamera(mode)}>{mode === 'pair' ? <Focus size={13}/> : mode === 'orbit' ? <Box size={13}/> : <Eye size={13}/>} {mode === 'pair' ? 'Pair close-up' : mode === 'orbit' ? 'Orbit' : 'Side'}</button>)}</div></div>
          <div className="light-stage-note"><span className="light-eyebrow">{d.finished ? 'SEQUENCE COMPLETE' : `PAIR ${d.index + 1} / ${pairCount(p)}`}</span><strong>{d.finished ? 'Energy leaves the displayed region' : d.pair.sense > 0 ? '↺ Positive rotation' : '↻ Negative rotation'}</strong><small>{d.finished ? 'Reset or scrub the timeline to replay.' : 'Centres stay fixed. The excitation advances.'}</small></div>
          <button className="light-png icon-button" aria-label="Export light image" disabled={!ready || !!graphicsError} onClick={() => renderer.current?.exportPNG()}><Download size={17}/></button>
          <div className="light-view-legend"><span><i className="charge positive"/>+ Positron</span><span><i className="charge negative"/>− Electron</span><span className="light-e">— E</span><span className="light-b">— B</span><span className="light-probe">○ Probe</span></div>
          <div className="light-scale">1 L = 250 nm · 12 L window · drag to orbit</div>
          {graphicsError && <div className="graphics-error" role="alert"><h3>Light viewport needs attention</h3><p>{graphicsError}</p><button onClick={() => { setGraphicsError(''); setRevision(v => v + 1); }}>Recover light viewport</button></div>}
        </section>
        <section className="light-metrics" aria-label="Light diagnostics">
          <div><span>TRAVELLED</span><strong data-testid="light-distance">{d.time.toFixed(3)}<small>L</small></strong><em>{(d.time * 250).toFixed(0)} nm · {p.direction > 0 ? '+X' : '−X'}</em></div>
          <div><span>PHYSICAL TIME</span><strong>{(d.time * TIME_SECONDS * 1e15).toFixed(3)}<small>fs</small></strong><em data-testid="light-tick">Tick {s.tick} · Δt = τ/120</em></div>
          <div><span>PROPAGATION SPEED</span><strong>{s.tick ? '1.000' : '—'}<small>c</small></strong><em>{s.tick ? 'Distance / elapsed time' : 'Configured c; awaiting step'}</em></div>
          <div><span>EXCESS ENERGY</span><strong>{d.energy.toFixed(3)}<small>eV</small></strong><em>One packet · E = hf</em></div>
        </section>
        <section className="light-card light-timeline"><div className="light-card-heading"><h2>Induction timeline</h2><span>{d.handoffs} handoffs · {s.running ? 'running' : 'paused'}</span></div>
          <label className="light-scrubber">Replay position <output>{d.time.toFixed(3)} τ / 12 τ</output><input aria-label="Light timeline" type="range" min="0" max={LIGHT_END_TICK} step="1" value={s.tick} disabled={!ready} onChange={e => seek(+e.target.value)}/></label>
          <div className="light-events">{Array.from({ length: pairCount(p) }, (_, i) => <button key={i} className={i === d.index && !d.finished ? 'current' : ''} aria-label={`Inspect pair ${i + 1} at induction`} disabled={!ready} onClick={() => { setSelected(i); seek(i * hopTicks(p)); }}><span>{i % 2 ? '↻' : '↺'}</span><strong>Pair {i + 1}</strong><small>{(i * hopTicks(p) * LIGHT_DT).toFixed(2)} τ</small></button>)}</div>
          <p>{d.finished ? 'The packet crossed the window boundary. Its budget is now recorded as departed energy; this is not an absorption event.' : s.tick > 0 && s.tick % hopTicks(p) === 0 ? `Pair ${d.index} has collapsed; pair ${d.index + 1} is induced at its own fixed centre, with the opposite rotation sense.` : `Pair ${d.index + 1} rotates through 180° during ${(hopTicks(p) * LIGHT_DT).toFixed(2)} τ. Step or scrub to inspect its separation and collapse.`}</p>
          <div className="light-checkpoints"><button disabled={!ready} onClick={() => { const current = latest.current; if (current) setCheckpoints(old => [...old, { model: current.model, tick: current.tick, parameters: { ...current.parameters } }].slice(-4)); }}><Save size={13}/>Capture checkpoint</button>{checkpoints.map((c, i) => <button key={i} onClick={() => { send({ type: 'restore', state: c }); setDraft(c.parameters); setSelected(null); }}>Restore tick {c.tick}</button>)}</div>
        </section>
        <div className="light-plots"><section className="light-card"><div className="light-card-heading"><h2>Spatial wave profile</h2><span>Current instant</span></div><WavePlot values={spatial} label="Spatial electric wave projection" start={`${(p.offset - 6).toFixed(1)} L`} end={`${(p.offset + 6).toFixed(1)} L`} marker={(p.probe - p.offset + 6) / 12}/></section><section className="light-card"><div className="light-card-heading"><h2>Probe time trace</h2><span>x = {p.probe.toFixed(1)} L</span></div><WavePlot values={history} label="Electric projection at the fixed probe over elapsed time" start="0 τ" end={`${d.time.toFixed(2)} τ`}/></section></div>
        <div className="light-footnote"><span>Wave, field response and energy partition are prescribed illustrations of Fleming’s mechanism.</span><button disabled={!ready} onClick={exportCSV}><Download size={13}/>Export sequence CSV</button></div>
      </div><aside className="light-controls" aria-label="Light controls">
        <section className="light-card"><div className="light-card-heading"><h2><Waves size={16}/>Wave parameters</h2><span>c = 299,792,458 m/s</span></div>
          <form onSubmit={e => { e.preventDefault(); configure(); }}>
            {([['wavelength', 'Wavelength', 1, 4, .1, `${(draft.wavelength * 250).toFixed(0)} nm`], ['polarization', 'Polarization angle', 0, 180, 5, `${draft.polarization}°`], ['phase', 'Initial phase', 0, 360, 15, `${draft.phase}°`], ['offset', 'Launch offset', -2, 2, .1, `${draft.offset.toFixed(1)} L`], ['probe', 'Probe position', -5, 5, .1, `${draft.probe.toFixed(1)} L`]] as const).map(([key, label, min, max, step, value]) => <label className="light-range" key={key}>{label}<output>{value}</output><input aria-label={label} type="range" min={min} max={max} step={step} value={draft[key]} onChange={e => setDraft(v => ({ ...v, [key]: +e.target.value }))}/></label>)}
            <div className="light-derived">f = {(1 / (draft.wavelength * TIME_SECONDS) / 1e12).toFixed(1)} THz · λ = c / f</div>
            <label className="light-direction">Travel direction<select aria-label="Travel direction" value={draft.direction} onChange={e => setDraft(v => ({ ...v, direction: +e.target.value as 1 | -1 }))}><option value="1">Left to right (+X)</option><option value="-1">Right to left (−X)</option></select></label>
            <button className="light-apply" disabled={!ready} type="submit">Apply and restart sequence</button><small className="light-form-note">Changes start a new paused sequence.</small>
          </form>
        </section>
        <section className="light-card light-inspector"><div className="light-card-heading"><h2>Pair {inspected.index + 1} close-up</h2><button onClick={() => setSelected(selected === null ? d.index : null)}>{selected === null ? 'Pin pair' : 'Follow active'}</button></div>
          <svg className="light-pair-glyph" viewBox="0 0 200 135" role="img" aria-label="Selected pair in its rotation plane; fixed midpoint and opposite charge lobes"><circle cx="100" cy="66" r="59" fill="none" stroke="#2e424f" strokeDasharray="3 5"/><path d="M93 66H107M100 59V73" stroke="#a3cbb9"/><line x1={pairX} y1={pairY} x2={200 - pairX} y2={132 - pairY} stroke="#647d88"/>{inspected.active && <><circle cx={pairX} cy={pairY} r="10" fill="#d9916e"/><text x={pairX} y={pairY + 4} textAnchor="middle" fill="#18222a" fontSize="14">+</text><circle cx={200 - pairX} cy={132 - pairY} r="10" fill="#79c5e5"/><text x={200 - pairX} y={136 - pairY} textAnchor="middle" fill="#18222a" fontSize="14">−</text></>}<text x="100" y="130" textAnchor="middle" fill="#8cabb7" fontSize="9">Rotation plane · geometry exaggerated</text></svg>
          <dl className="light-readouts"><div><dt>State</dt><dd>{inspected.active ? 'Induced' : s.tick < inspected.index * hopTicks(p) ? 'Awaiting induction' : inspected.progress < 1 ? 'Window exited' : 'Collapsed / retired'}</dd></div><div><dt>Fixed centre</dt><dd data-testid="light-pair-centre">{inspected.centre.toFixed(3)} L</dd></div><div><dt>Pair age / lifetime</dt><dd>{inspected.age.toFixed(3)} / {inspected.lifetime.toFixed(3)} τ</dd></div><div><dt>Signed rotation</dt><dd data-testid="light-rotation">{(inspected.sense * inspected.progress * 180).toFixed(1)}° / {inspected.sense * 180}°</dd></div><div><dt>Full separation</dt><dd>{inspected.separation.toFixed(3)} L</dd></div></dl>
          <button className="light-focus" onClick={() => { setSelected(inspected.index); setCamera('pair'); renderer.current?.cameraPreset('pair'); }}><Focus size={14}/>Orbit this fixed centre</button>
        </section>
        <section className="light-card"><div className="light-card-heading"><h2>Packet energy ledger</h2><span>Above background</span></div><dl className="light-readouts"><div><dt>Central pair · hf/2</dt><dd>{d.pairEnergy.toFixed(4)} eV</dd></div><div><dt>Surrounding field · hf/2</dt><dd>{d.fieldEnergy.toFixed(4)} eV</dd></div><div><dt>Departed window</dt><dd>{d.departedEnergy.toFixed(4)} eV</dd></div><div><dt>Budget residual</dt><dd data-testid="light-energy-residual">{(d.pairEnergy + d.fieldEnergy + d.departedEnergy - d.energy).toExponential(1)} eV</dd></div></dl><p className="light-small">Assigned energy bookkeeping. Field energy and angular momentum are not calculated from a force solver.</p></section>
        <section className="light-card"><div className="light-card-heading"><h2>Scene layers</h2></div>{layers.map(([key, label]) => <label className="light-toggle" key={key}><span>{label}</span><input type="checkbox" checked={view[key]} onChange={e => setView(v => ({ ...v, [key]: e.target.checked }))}/></label>)}</section>
        <section className="light-source"><Info size={16}/><div><strong>About this experiment</strong><p>Successive dipoles make half-turns over half-wavelength intervals. The surrounding response and finite pulse shape are visual conventions.</p><a href="./docs/light-model.md" target="_blank" rel="noreferrer">Model equations & limitations ↗</a><a href="./docs/papers/Photons%20as%20Quantum%20Electron-Positron%20Composites.pdf#page=4" target="_blank" rel="noreferrer">Fleming’s paper · self-induction, p. 4 ↗</a></div></section>
      </aside></div>
      <div className="light-status" role="status" aria-label="Light experiment status">{notice || `Paused stepping is available. At 1×, one second of playback represents ${(TIME_SECONDS * 1e15).toFixed(3)} fs.`}</div>
    </main><footer className="statusbar"><span><i className="dot"/>{LIGHT_MODEL} · {s.running ? 'Running' : 'Paused'} · start x = {sourceX(p).toFixed(1)} L</span><span>Fixed centres · prescribed c · local worker</span></footer>
  </div>;
}
