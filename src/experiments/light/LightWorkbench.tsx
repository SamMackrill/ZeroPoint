import { Focus, Info, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { downloadFile } from '../../persistence/experiment';
import { DEFAULT_LIGHT_VIEW, LIGHT_DT, LIGHT_END_TICK, LIGHT_MODEL, TIME_SECONDS, hopTicks, lightReadout, pairAt, pairCount, parseLightFile, sourceX, waveAt, type LightParameters, type LightState, type LightView } from '../../light/model';
import type { LightRenderer } from '../../light/LightRenderer';
import { useLight } from '../../light/useLight';
import { palette } from '../../ui/palette';
import { Plot } from '../../ui/Plot';
import { Readouts } from '../../ui/Readouts';
import { Segmented } from '../../ui/Segmented';
import { FileActions, Header, StatusBar, type HeaderProps } from '../../workbench/Chrome';
import { withPaths } from '../../workbench/definition';
import { Dock } from '../../workbench/Dock';
import { Inspector, SetupPanel, ViewPanel, type InspectorTab } from '../../workbench/Inspector';
import { lightRuntime, SPEEDS } from '../../workbench/runtime';
import { Shell } from '../../workbench/Shell';
import { TimelineBar } from '../../workbench/TimelineBar';
import { CHECKPOINT_LIMIT } from '../medium/MediumWorkbench';
import { lightDefinition } from './definition';
import '../../light/light.css';
import './light-workbench.css';
import { useSelectionKeys } from '../../workbench/selection';
import { SplitView } from '../../workbench/SplitView';
import { AboutSheet, useAbout } from '../../workbench/AboutSheet';

/** Render a normalized electric-projection trace with the shared Plot, with an optional probe marker. */
function WavePlot({ x, values, label, unit, domain, marker }: { x: number[]; values: number[]; label: string; unit: 'L' | 'τ'; domain: [number, number]; marker?: number }) {
  return <Plot label={label} x={x} series={[{ key: 'e', label: 'E projection', color: palette.dataE, values }]} xUnit={unit} xDomain={domain}
    yDomain={[-1.4, 1.4]} yTicks={[-1, 0, 1]} formatX={v => v.toFixed(unit === 'τ' ? 2 : 1)} caption="Normalized E projection"
    markers={marker === undefined ? [] : [{ x: marker, label: 'Probe' }]} height={80}/>;
}

/** Props for LightWorkbench. */
export interface LightWorkbenchProps {
  active: boolean;
  rail: ReactNode;
  header: Pick<HeaderProps, 'experiment'>;
}

/**
 * The light induction laboratory in the workbench (UI 08): the propagating wave and its pairs in the viewport, the
 * bounded 0–12 τ timeline with one tick per induction, the dock (travelled, time, energy; plots, ledger, events), and
 * the inspector (Setup, all ↻; View; Selection: the pair close-up). The worker protocol and renderer are unchanged.
 */
export function LightWorkbench({ active, rail, header }: LightWorkbenchProps) {
  const { state, latest, sink, send, error, restart } = useLight(active);
  const runtime = useMemo(() => lightRuntime({ send, latest, sink }), [send, latest, sink]);
  useEffect(() => () => runtime.dispose(), [runtime]);
  const [view, setView] = useState<LightView>(() => ({ ...DEFAULT_LIGHT_VIEW, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
  const [selected, setSelected] = useState<number | null>(null), [camera, setCamera] = useState<'orbit' | 'side' | 'pair'>('orbit');
  const [graphicsError, setGraphicsError] = useState(''), [revision, setRevision] = useState(0), [notice, setNotice] = useState('');
  const [checkpoints, setCheckpoints] = useState<LightState[]>([]);
  // Light opens 1-up; the split pane shows the pair close-up glyph enlarged, which then leaves the Selection tab.
  const [split, setSplit] = useState(false);
  const about = useAbout();
  const [tab, setTab] = useState<InspectorTab>('setup'), [dockTab, setDockTab] = useState('plots'), [dockCollapsed, setDockCollapsed] = useState(false);
  // The host is a callback ref held in state, so the renderer follows the element when the shell changes layout.
  const [host, setHost] = useState<HTMLDivElement | null>(null), renderer = useRef<LightRenderer | null>(null);
  // A lost graphics context holds playback until the viewport recovers.
  const [contextLost, setContextLost] = useState(false);
  const viewRef = useRef(view), selectedRef = useRef(selected), cameraRef = useRef(camera);
  viewRef.current = view; selectedRef.current = selected; cameraRef.current = camera;
  /** A pick selects the pair and opens the Selection tab. */
  const onPick = useCallback((index: number) => { setSelected(index); setTab('selection'); }, []);
  useEffect(() => {
    if (!active || !host) return;
    let disposed = false, r: LightRenderer | undefined, off = () => undefined as void;
    import('../../light/LightRenderer').then(({ LightRenderer }) => {
      if (disposed) return;
      r = new LightRenderer(host, viewRef.current, onPick, message => { setGraphicsError(message); setContextLost(true); runtime.run(false); });
      renderer.current = r; off = runtime.subscribe(s => r?.update(s));
      if (latest.current) r.update(latest.current);
      r.select(selectedRef.current); r.cameraPreset(cameraRef.current);
    }).catch(e => { if (!disposed) { setGraphicsError(`3D view unavailable: ${String(e)}`); runtime.run(false); } });
    return () => { disposed = true; off(); renderer.current = null; r?.dispose(); };
  }, [active, host, revision, latest, runtime, onPick]);
  useEffect(() => { renderer.current?.setOptions(view); }, [view]);
  useEffect(() => { renderer.current?.select(selected); }, [selected]);
  useEffect(() => { renderer.current?.cameraPreset(camera); }, [camera]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Keys another control already handled (a plot's crosshair uses the arrows) are not transport shortcuts.
      if (e.defaultPrevented || ['INPUT', 'SELECT', 'BUTTON', 'A', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable || about.open || error) return;
      if (e.code === 'Space' && !contextLost) { e.preventDefault(); runtime.run(!latest.current?.running); }
      if (e.code === 'ArrowRight') { e.preventDefault(); runtime.step(); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [active, runtime, latest, error, contextLost, about.open]);

  const clearSelection = useCallback(() => setSelected(null), []);
  // Re-apply the preset even when the camera is already on it, so F always frames the current selection.
  const focusSelection = useCallback(() => { setCamera('pair'); renderer.current?.cameraPreset('pair'); }, []);
  useSelectionKeys({ active, hasSelection: selected !== null, onClear: clearSelection, onFocus: focusSelection });
  const s = state ?? { model: LIGHT_MODEL, tick: 0, parameters: lightDefinition.defaultParams, running: false, speed: 1 };
  const p = s.parameters, d = lightReadout(s), inspected = pairAt(p, s.tick, selected ?? d.index);
  const ready = !!state && !error;
  /** Restart the sequence with changed parameters (every light parameter is ↻). */
  function configure(changes: Record<string, unknown>) { runtime.configure(withPaths(p, changes) as LightParameters); setSelected(null); setNotice('Parameters applied. The light sequence is paused at its start.'); }
  /** Download the current light experiment state. */
  function save() {
    if (!latest.current) return;
    const { model, tick, parameters } = latest.current;
    downloadFile(`zeropoint-light-tick-${tick}.json`, JSON.stringify({ format: 'zeropoint-light', version: 1, state: { model, tick, parameters }, view }), 'application/json');
    setNotice(`Saved the light sequence at tick ${tick}.`);
  }
  /** Load and restore a light experiment file selected by the user. */
  async function load(file: File) {
    try {
      if (file.size > 100_000) throw new Error('Light files must be smaller than 100 KB.');
      const saved = parseLightFile(await file.text());
      runtime.restore(saved.state); setView(saved.view); setSelected(null);
      setNotice(`Loaded tick ${saved.state.tick}. Playback is paused.`);
    } catch (e) { setNotice(`Could not load: ${e instanceof Error ? e.message : String(e)}`); }
  }
  /** Export the full light handoff timeline as CSV. */
  function exportCSV() {
    const rows = ['tick,time_s,distance_m,excitation_x_L,handoffs,pair_energy_eV,field_energy_eV,departed_energy_eV,probe_E_normalized'];
    for (let tick = 0; tick <= LIGHT_END_TICK; tick++) { const r = lightReadout({ ...s, tick }); rows.push([tick, r.time * TIME_SECONDS, r.time * 250e-9, r.x, r.handoffs, r.pairEnergy, r.fieldEnergy, r.departedEnergy, r.probe.electric].join(',')); }
    downloadFile('zeropoint-light-illustrative-sequence.csv', rows.join('\n'), 'text/csv'); setNotice('Exported the complete prescribed sequence, including future timeline samples.');
  }
  /** Capture the current state as a ◆ checkpoint. */
  function capture() { const current = latest.current; if (current) setCheckpoints(old => [...old, { model: current.model, tick: current.tick, parameters: { ...current.parameters } }].slice(-CHECKPOINT_LIMIT)); }

  const spatialX = Array.from({ length: 161 }, (_, i) => p.offset - 6 + i * 12 / 160), historyX = Array.from({ length: 161 }, (_, i) => d.time * i / 160);
  const spatial = spatialX.map(x => waveAt(p, d.time, x).electric), history = historyX.map(t => waveAt(p, t, p.probe).electric);
  const pairX = 100 + Math.sin(inspected.angle) * inspected.separation * 140, pairY = 66 - Math.cos(inspected.angle) * inspected.separation * 140;
  const stateLine = d.finished ? 'SEQUENCE COMPLETE' : `Pair ${d.index + 1} / ${pairCount(p)} · ${d.pair.sense > 0 ? '↺ positive' : '↻ negative'}`;

  const headerNode = <Header experiment={header.experiment} scenario={lightDefinition.scenarios[0].title} onChip={() => about.show('scenario')} onHelp={() => about.show()}
    actions={<FileActions disabled={!ready} onFile={load} onSave={save}
      exports={[{ id: 'png', label: 'PNG image', onSelect: () => renderer.current?.exportPNG(), disabled: !!graphicsError }, { id: 'csv', label: 'CSV (full sequence)', onSelect: exportCSV }]}/>}/>;

  const viewportNode = (
    <section className="light-viewport-shell light-stage" aria-label="Light visualization">
      <div className="light-viewport" ref={setHost}/>
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => { restart(); setSelected(null); setNotice('Light worker restarted with default parameters.'); }}>Restart light worker</button></div>}
      <div className="light-view-top">
        <span><i className={`dot ${s.running ? '' : 'paused'}`}/>{d.finished ? 'PULSE EXITED' : s.running ? 'PROPAGATING' : 'PAUSED'}<b>{stateLine}</b></span>
        <Segmented label="Camera" testId="camera" options={lightDefinition.cameras.map(c => ({ value: c.id, label: c.label }))} value={camera} onChange={v => setCamera(v as typeof camera)}/>
      </div>
      <div className="light-view-legend"><span><i className="charge positive"/>+ Positron</span><span><i className="charge negative"/>− Electron</span><span className="light-e">— E</span><span className="light-b">— B</span><span className="light-probe">○ Probe</span></div>
      <div className="light-scale">1 L = 250 nm · 12 L window · drag to orbit</div>
      {graphicsError && <div className="graphics-error" role="alert"><h3>Light viewport needs attention</h3><p>{graphicsError}</p><button onClick={() => { setGraphicsError(''); setContextLost(false); setRevision(v => v + 1); }}>Recover light viewport</button></div>}
    </section>
  );

  const events = Array.from({ length: pairCount(p) }, (_, i) => ({ index: i, tick: i * hopTicks(p) }));
  const dockNode = (
    <Dock collapsed={dockCollapsed} onCollapsedChange={setDockCollapsed} tab={dockTab} onTab={setDockTab}
      readouts={[
        { label: 'Travelled', value: d.time.toFixed(3), unit: `L · ${(d.time * 250).toFixed(0)} nm ${p.direction > 0 ? '+X' : '−X'}` },
        { label: 'Time', value: (d.time * TIME_SECONDS * 1e15).toFixed(3), unit: 'fs' },
        { label: 'Handoffs', value: String(d.handoffs) },
        { label: 'Excess energy', value: d.energy.toFixed(3), unit: 'eV' },
      ]}
      tabs={[
        { id: 'plots', label: 'Plots', content: <div className="light-dock-plots">
          <div><h4>Spatial profile · current instant</h4><WavePlot x={spatialX} values={spatial} label="Spatial electric wave projection" unit="L" domain={[p.offset - 6, p.offset + 6]} marker={p.probe}/></div>
          <div><h4>Probe trace · x = {p.probe.toFixed(1)} L</h4><WavePlot x={historyX} values={history} label="Electric projection at the fixed probe over elapsed time" unit="τ" domain={[0, Math.max(d.time, 0.01)]}/></div>
        </div> },
        { id: 'ledger', label: 'Ledger', content: <div className="light-ledger">
          <Readouts items={[
            { label: 'Central pair · hf/2', value: d.pairEnergy.toFixed(4), unit: 'eV' },
            { label: 'Surrounding field · hf/2', value: d.fieldEnergy.toFixed(4), unit: 'eV' },
            { label: 'Departed window', value: d.departedEnergy.toFixed(4), unit: 'eV' },
            { label: 'Budget residual', value: (d.pairEnergy + d.fieldEnergy + d.departedEnergy - d.energy).toExponential(1), unit: 'eV' },
            { label: 'Propagation speed', value: s.tick ? '1.000' : '—', unit: 'c' },
          ]}/>
          <span className="visually-hidden" data-testid="light-energy-residual">{(d.pairEnergy + d.fieldEnergy + d.departedEnergy - d.energy).toExponential(1)} eV</span>
          <p className="light-small">Assigned energy bookkeeping. Field energy and angular momentum are not calculated from a force solver. Wave, field response and energy partition are prescribed illustrations of Fleming’s mechanism.</p>
        </div> },
        { id: 'events', label: 'Events', content: <ol className="light-event-list">
          {events.map(e => <li key={e.index} className={e.index === d.index && !d.finished ? 'is-current' : ''}>
            <button type="button" data-testid={`event-pair-${e.index + 1}`} aria-label={`Inspect pair ${e.index + 1} at induction`} disabled={!ready} onClick={() => { setSelected(e.index); runtime.seek(e.tick); }}>
              <span>{e.index % 2 ? '↻' : '↺'}</span><strong>Pair {e.index + 1}</strong><small>{(e.tick * LIGHT_DT).toFixed(2)} τ</small>
            </button>
            {e.index === d.index && !d.finished && <p>{s.tick > 0 && s.tick % hopTicks(p) === 0 ? `Pair ${d.index} has collapsed; pair ${d.index + 1} is induced at its own fixed centre, with the opposite rotation sense.` : `Pair ${d.index + 1} rotates through 180° during ${(hopTicks(p) * LIGHT_DT).toFixed(2)} τ. Step or scrub to inspect its separation and collapse.`}</p>}
          </li>)}
          {d.finished && <li><p>The packet crossed the window boundary. Its budget is now recorded as departed energy; this is not an absorption event.</p></li>}
        </ol> },
      ]}/>
  );

  const glyph = (
    <svg className="light-pair-glyph" viewBox="0 0 200 135" role="img" aria-label="Selected pair in its rotation plane; fixed midpoint and opposite charge lobes"><circle cx="100" cy="66" r="59" fill="none" stroke={palette.line2} strokeDasharray="3 5"/><path d="M93 66H107M100 59V73" stroke={palette.dataShell3}/><line x1={pairX} y1={pairY} x2={200 - pairX} y2={132 - pairY} stroke={palette.text4}/>{inspected.active && <><circle cx={pairX} cy={pairY} r="10" fill={palette.danger}/><text x={pairX} y={pairY + 4} textAnchor="middle" fill={palette.bg2} fontSize="14">+</text><circle cx={200 - pairX} cy={132 - pairY} r="10" fill={palette.dataNeg}/><text x={200 - pairX} y={136 - pairY} textAnchor="middle" fill={palette.bg2} fontSize="14">−</text></>}<text x="100" y="130" textAnchor="middle" fill={palette.accent2} fontSize="9">Rotation plane · geometry exaggerated</text></svg>
  );
  const aboutNode = (
    <AboutSheet {...about} onOpenChange={about.setOpen} onSection={about.setSection} active={active} experiment={header.experiment} scenario={lightDefinition.scenarios[0].title} sections={[
      { id: 'scenario', content: <><p>Successive dipoles make half-turns over half-wavelength intervals. The surrounding response and finite pulse shape are visual conventions. Follow an energy wave through successive, locally rotating pairs.</p><p>{`Paused stepping is available. At 1×, one second of playback represents ${(TIME_SECONDS * 1e15).toFixed(3)} fs.`}</p></> },
      { id: 'sources', content: <div className="about-links"><a href="./docs/light-model.md" target="_blank" rel="noreferrer">Model equations & limitations ↗</a><a href="./docs/papers/Photons%20as%20Quantum%20Electron-Positron%20Composites.pdf#page=4" target="_blank" rel="noreferrer">Fleming’s paper · self-induction, p. 4 ↗</a></div> },
    ]}/>
  );

  const selectionNode = (
    <div className="light-selection">
      <div className="light-selection-head"><h3>Pair {inspected.index + 1}</h3><button type="button" className="inspector-link" onClick={() => setSelected(selected === null ? d.index : null)}>{selected === null ? 'Pin pair' : 'Follow active'}</button></div>
      {!split && glyph}
      <dl className="light-readouts">
        <div><dt>State</dt><dd>{inspected.active ? 'Induced' : s.tick < inspected.index * hopTicks(p) ? 'Awaiting induction' : inspected.progress < 1 ? 'Window exited' : 'Collapsed / retired'}</dd></div>
        <div><dt>Fixed centre</dt><dd data-testid="light-pair-centre">{inspected.centre.toFixed(3)} L</dd></div>
        <div><dt>Pair age / lifetime</dt><dd>{inspected.age.toFixed(3)} / {inspected.lifetime.toFixed(3)} τ</dd></div>
        <div><dt>Signed rotation</dt><dd data-testid="light-rotation">{(inspected.sense * inspected.progress * 180).toFixed(1)}° / {inspected.sense * 180}°</dd></div>
        <div><dt>Full separation</dt><dd>{inspected.separation.toFixed(3)} L</dd></div>
      </dl>
      <button type="button" className="light-focus" onClick={() => { setSelected(inspected.index); focusSelection(); }}><Focus size={14}/>Focus this fixed centre <kbd>F</kbd></button>
    </div>
  );

  const inspectorNode = (
    <Inspector tab={tab} onTab={setTab} selection={selectionNode}
      setup={<SetupPanel definition={lightDefinition} scenario="induction" params={p} onLive={() => undefined} onApply={configure}>
        <p className="light-derived">f = {(1 / (p.wavelength * TIME_SECONDS) / 1e12).toFixed(1)} THz · λ = c / f · c = 299,792,458 m/s</p>
        <small className="light-form-note">Changes start a new paused sequence.</small>
      </SetupPanel>}
      view={<>
        <ViewPanel definition={lightDefinition} scenario="induction" view={view} onView={(k, v) => setView(old => withPaths(old, { [k]: v }))}/>
        <section className="inspector-group" aria-label="Settings">
          <header className="inspector-group-head"><h3>Settings</h3></header>
          <label className="medium-setting"><input type="checkbox" data-testid="setting-reduced-motion" checked={view.reducedMotion} onChange={e => setView(v => ({ ...v, reducedMotion: e.target.checked }))}/>Reduced flashing &amp; camera motion</label>
        </section>
      </>}/>
  );

  const timelineNode = state && (
    <TimelineBar runtime={runtime} timeline={lightDefinition.timeline('induction', p)} speeds={SPEEDS}
      markers={checkpoints.map((c, i) => ({ id: `${i}-${c.tick}`, tick: c.tick, label: `tick ${c.tick}` }))}
      onMarker={m => { const c = checkpoints.find((x, i) => `${i}-${x.tick}` === m.id); if (c) { runtime.restore(c); setSelected(null); } }} onCapture={capture} runDisabled={contextLost}/>
  );

  return (
    <div className="light-workbench-root" style={{ display: active ? undefined : 'none' }}>
      <Shell id="light" header={headerNode} rail={rail} viewport={<SplitView active={active} primary={viewportNode} panes={[{ id: 'pair', label: `Pair ${inspected.index + 1} close-up`, content: <div className="light-pair-pane">{glyph}</div> }]} split={split} onSplit={setSplit} pane="pair" onPane={() => undefined}/>} timeline={timelineNode} dock={dockNode} inspector={inspectorNode}
        status={<StatusBar running={s.running} items={[LIGHT_MODEL, <span data-testid="light-tick">Tick {s.tick} · Δt = τ/120</span>, `start x = ${sourceX(p).toFixed(1)} L`, 'Fixed centres · prescribed c · local worker']}/>}/>
      {notice && <div className="toast" role="status" data-testid="notice"><Info size={15}/><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14}/></button></div>}
      {aboutNode}
    </div>
  );
}
