import { Focus, Info, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { downloadFile } from '../../persistence/experiment';
import { ALPHA, C, DEFAULT_ELECTRON_VIEW, ELECTRON_DT, ELECTRON_END, ELECTRON_MODEL, G_FACTOR, LATTICE_SAMPLES, RADIUS, SAMPLES_PER_SHELL, SHELL_RADII, TAU, alignmentProgress, electronPresence, electronX, enclosedCharge, parseElectronFile, probePosition, referenceFields, spinRateAtRadius, velocity, type ElectronMode, type ElectronParameters, type ElectronState, type ElectronView } from '../../electron/model';
import type { ElectronRenderer } from '../../electron/ElectronRenderer';
import { ChargeMotion } from '../../electron/ChargeMotion';
import { ElectronProperties } from '../../electron/ElectronProperties';
import { SpinSection } from '../../electron/SpinSection';
import { displayedDipole, shellCentre, shellSense, SHELL_COLOURS } from '../../electron/spinGeometry';
import { useElectron } from '../../electron/useElectron';
import { palette } from '../../ui/palette';
import { Plot } from '../../ui/Plot';
import { Segmented } from '../../ui/Segmented';
import { FileActions, Header, StatusBar, type HeaderProps } from '../../workbench/Chrome';
import { appliesTo, getPath, withPaths } from '../../workbench/definition';
import { Dock } from '../../workbench/Dock';
import { Control, Inspector, SetupPanel, ViewPanel, type InspectorTab } from '../../workbench/Inspector';
import { electronRuntime, SPEEDS } from '../../workbench/runtime';
import { Shell } from '../../workbench/Shell';
import { TimelineBar } from '../../workbench/TimelineBar';
import { CHECKPOINT_LIMIT } from '../medium/MediumWorkbench';
import { electronDefinition, electronMilestones } from './definition';
import '../../light/light.css';
import '../../electron/electron.css';
import './electron-workbench.css';
import { useSelectionKeys } from '../../workbench/selection';
import { SplitView, type SplitPane } from '../../workbench/SplitView';

/** Scenario id ↔ worker mode for the three timed scenarios. */
const MODE_OF: Record<string, ElectronMode> = { stationary: 'electric', spin: 'spin', moving: 'moving' };
const SCENARIO_OF: Record<ElectronMode, string> = { electric: 'stationary', spin: 'spin', moving: 'moving' };
/** The two static studies, from ElectronProperties. */
const STUDY_OF: Record<string, 'flux' | 'radius'> = { 'charge-flux': 'flux', 'radius-limit': 'radius' };
/** What each timed scenario is about (About this scenario). */
const DESCRIPTION: Record<ElectronMode, string> = {
  electric: 'Start with an unpolarized cubic medium. The electron appears, and nearby pairs align first as a three-dimensional electric pattern resolves.',
  spin: 'Following Fig. 2: neighboring zeptons turn locally as they polarize around the stationary electron. Compare the spherical field and equatorial section, then inspect how opposite charge motions contribute to current. Alternating whole bands is an optional extension.',
  moving: 'As the electron passes, nearby pairs turn locally. Reverse its velocity to reverse the motion-induced magnetic field.',
};
const vector = (v: number[]) => v.map(n => Math.abs(n) < 1e-9 ? '0' : n.toFixed(4)).join(', ');
type Camera = 'front' | 'orbit' | 'probe' | 'shell';

/** Props for ElectronWorkbench. */
export interface ElectronWorkbenchProps {
  active: boolean;
  rail: ReactNode;
  header: Pick<HeaderProps, 'experiment'>;
  scenarioRequest?: { id: string; at: number } | null;
  onScenarioChange?(id: string): void;
}

/**
 * The electron laboratory in the workbench (UI 09): three timed scenarios (stationary, spin, moving) over a bounded
 * 0–48 τ timeline with named milestones, and two static studies from the property investigations. The spin scenario
 * opens 2-up: the 3D shells beside the linked equatorial section or the selected pair's charge motion. The worker
 * protocol and renderer are unchanged.
 */
export function ElectronWorkbench({ active, rail, header, scenarioRequest, onScenarioChange }: ElectronWorkbenchProps) {
  const { state, latest, sink, send, error, restart } = useElectron(active);
  const [scenario, setScenario] = useState('stationary');
  const runtime = useMemo(() => electronRuntime({ send, latest, sink }, s => electronMilestones(SCENARIO_OF[s.parameters.mode]).map(e => e.tick)), [send, latest, sink]);
  useEffect(() => () => runtime.dispose(), [runtime]);
  // Selection is always on (§09 cuts the "Zepton selector" opt-in: click selects everywhere).
  const [view, setView] = useState<ElectronView>(() => ({ ...DEFAULT_ELECTRON_VIEW, inspect: true, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
  const [selected, setSelected] = useState<number | null>(null), [camera, setCamera] = useState<Camera>('orbit');
  const [graphicsError, setGraphicsError] = useState(''), [contextLost, setContextLost] = useState(false), [revision, setRevision] = useState(0), [notice, setNotice] = useState('');
  const [checkpoints, setCheckpoints] = useState<ElectronState[]>([]);
  // Spin's split state is the saved Linked 2D section flag (2-up by default); this picks which linked view it shows.
  const [pane, setPane] = useState<'section' | 'motion'>('section');
  const [tab, setTab] = useState<InspectorTab>('setup'), [dockTab, setDockTab] = useState('probe'), [dockCollapsed, setDockCollapsed] = useState(false);
  const [host, setHost] = useState<HTMLDivElement | null>(null), renderer = useRef<ElectronRenderer | null>(null);
  const viewRef = useRef(view), selectedRef = useRef(selected), cameraRef = useRef(camera); viewRef.current = view; selectedRef.current = selected; cameraRef.current = camera;
  /** A pick selects the zepton and opens the Selection tab. */
  const onPick = useCallback((id: number) => { setSelected(id); setTab('selection'); }, []);
  const study = STUDY_OF[scenario];
  useEffect(() => {
    if (!active || !host || study) return;
    let disposed = false, r: ElectronRenderer | undefined, off = () => undefined as void;
    import('../../electron/ElectronRenderer').then(({ ElectronRenderer }) => {
      if (disposed) return;
      r = new ElectronRenderer(host, viewRef.current, onPick, message => { setGraphicsError(message); setContextLost(true); runtime.run(false); }); renderer.current = r;
      off = runtime.subscribe(s => r?.update(s));
      if (latest.current) r.update(latest.current); r.select(selectedRef.current); r.cameraPreset(cameraRef.current);
    }).catch(e => { if (!disposed) { setGraphicsError(String(e)); runtime.run(false); } });
    return () => { disposed = true; off(); renderer.current = null; r?.dispose(); };
  }, [active, host, study, revision, latest, runtime, onPick]);
  useEffect(() => { renderer.current?.setView(view); }, [view]);
  useEffect(() => { renderer.current?.select(selected); }, [selected]);
  useEffect(() => { renderer.current?.cameraPreset(camera); }, [camera, view.cutaway, state?.parameters.axis]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { onScenarioChange?.(scenario); }, [scenario, onScenarioChange]);
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.defaultPrevented || ['INPUT', 'SELECT', 'BUTTON', 'A', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable || error || study) return;
      if (e.code === 'Space' && !contextLost) { e.preventDefault(); runtime.run(!latest.current?.running); }
      if (e.code === 'ArrowRight') { e.preventDefault(); runtime.step(); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [active, runtime, latest, error, contextLost, study]);

  const clearSelection = useCallback(() => setSelected(null), []);
  // Re-apply the preset even when the camera is already on it, so F always frames the current selection.
  const focusSelection = useCallback(() => { setCamera('probe'); renderer.current?.cameraPreset('probe'); }, []);
  useSelectionKeys({ active: active && !study, hasSelection: selected !== null, onClear: clearSelection, onFocus: focusSelection });
  const s = state ?? { model: ELECTRON_MODEL, tick: 0, parameters: electronDefinition.defaultParams, running: false, speed: 1 };
  const p = s.parameters, time = s.tick * ELECTRON_DT, ready = !!state && !error;
  const field = referenceFields(s, probePosition(p)), picked = selected === null ? null : displayedDipole(s, selected, view.spinDisplay), flux = enclosedCharge(s, 2);
  const shellIndex = selected !== null && selected >= LATTICE_SAMPLES && selected < LATTICE_SAMPLES + view.spinDisplay.count * SAMPLES_PER_SHELL ? selected : LATTICE_SAMPLES + 34;

  /** Switch scenario: timed ones restart the worker in their mode, with the view suited to it; static ones pause it. */
  function startScenario(id: string) {
    setScenario(id);
    const mode = MODE_OF[id];
    if (!mode) { runtime.run(false); return; }
    runtime.configure({ ...p, mode }); setSelected(null);
    setView(v => ({ ...v, intrinsic: false, faraday: mode !== 'spin', radius: false, cutaway: false, shells: mode === 'spin' ? true : v.shells }));
    setCamera(mode === 'spin' ? 'shell' : 'orbit'); setNotice('View changed. The sequence is paused at its start.');
  }
  const startRef = useRef(startScenario); startRef.current = startScenario;
  useEffect(() => { if (scenarioRequest) startRef.current(scenarioRequest.id); }, [scenarioRequest]);
  /** Restart with changed physics parameters (all ↻). */
  function configure(changes: Record<string, unknown>) { runtime.configure(withPaths(p, changes) as ElectronParameters); setNotice('Electron parameters applied. Paused at tick 0.'); }
  /** Download the current electron experiment state. */
  function save() {
    if (!latest.current) return; const { model, tick, parameters } = latest.current;
    downloadFile(`zeropoint-electron-${p.mode}-tick-${tick}.json`, JSON.stringify({ format: 'zeropoint-electron', version: 3, state: { model, tick, parameters }, view }), 'application/json'); setNotice(`Saved electron state at tick ${tick}.`);
  }
  /** Load and restore an electron experiment file selected by the user. */
  async function load(file: File) {
    try {
      if (file.size > 100000) throw new Error('File exceeds 100 KB.');
      const saved = parseElectronFile(await file.text()); runtime.restore(saved.state); setView({ ...saved.view, inspect: true }); setScenario(SCENARIO_OF[saved.state.parameters.mode]);
      setNotice(`Loaded electron tick ${saved.state.tick}. Playback is paused.${saved.migrated ? ' Updated an older experiment to the cubic medium and revised polarization sequence.' : ''}`);
    } catch (e) { setNotice(`Could not load: ${e instanceof Error ? e.message : String(e)}`); }
  }
  /** Export the electron reference-field timeline as CSV. */
  function csv() {
    const rows = ['tick,time_s,electron_x_R,beta,probe_valid,Ex_E0,Ey_E0,Ez_E0,Bmotion_x_B0,Bmotion_y_B0,Bmotion_z_B0,Bspin_x_B0,Bspin_y_B0,Bspin_z_B0'];
    for (let tick = 0; tick <= ELECTRON_END; tick += 12) { const st = { ...s, tick }, f = referenceFields(st, probePosition(p)); rows.push([tick, tick * ELECTRON_DT * TAU, electronX(st), velocity(p), f.valid, ...(f.valid ? [...f.electric, ...f.motion, ...f.intrinsic] : Array(9).fill(''))].join(',')); }
    downloadFile('zeropoint-electron-reference-sequence.csv', rows.join('\n'), 'text/csv'); setNotice('Exported the full analytic reference sequence, including future samples and the separate intrinsic-dipole reference.');
  }
  /** Select the displayed sample nearest to the configured probe. */
  function inspectProbe() { const shell = view.shells && p.mode === 'spin'; let best = shell ? LATTICE_SAMPLES : 0, distance = Infinity; for (let i = best; i < (shell ? LATTICE_SAMPLES + view.spinDisplay.count * SAMPLES_PER_SHELL : LATTICE_SAMPLES); i++) { const c = shellCentre(i, p.axis), r = Math.hypot(c[0] - p.probeX, c[1] - p.probeY, c[2] - p.probeZ); if (r < distance) { best = i; distance = r; } } setSelected(best); }
  /** The saved view the video's coordination explanation at 4:44 describes. */
  function sharedRotation() { setView(v => ({ ...v, shells: true, inspect: true, spinDisplay: { ...v.spinDisplay, alternating: false, section: true } })); setPane('motion'); setSelected(LATTICE_SAMPLES + 34); setCamera('shell'); setNotice('Shared local preference selected, following the video’s coordination explanation at 4:44.'); }
  /** Capture the current state as a ◆ checkpoint. */
  function capture() { const st = latest.current; if (st) setCheckpoints(old => [...old, { model: st.model, tick: st.tick, parameters: { ...st.parameters } }].slice(-CHECKPOINT_LIMIT)); }

  const traces = Array.from({ length: 161 }, (_, i) => { const f = referenceFields({ ...s, tick: Math.round(s.tick * i / 160) }, probePosition(p)); return f.valid ? [f.electric[1], f.motion[2], p.mode === 'electric' ? 0 : f.intrinsic[2]] : null; });
  const max = Math.max(.01, ...traces.flatMap(v => v?.map(Math.abs) ?? []));
  const traceTimes = Array.from({ length: 161 }, (_, i) => time * i / 160);
  const stageNote = p.mode === 'electric' ? (s.tick === 0 ? 'Unpolarized ZPF · electron not yet introduced' : electronPresence(s) < 1 ? 'Introducing the negative electron' : '+ ends align toward the electron') : p.mode === 'spin' ? 'Local turns around a stationary core' : 'The electron moves; the medium responds';
  const stageLabel = p.mode === 'electric' ? `Alignment ${(alignmentProgress(s) * 100).toFixed(0)}%` : p.mode === 'spin' ? '3D shells' : `${velocity(p).toFixed(2)} c along X`;
  const setSplit = useCallback((on: boolean) => setView(v => ({ ...v, spinDisplay: { ...v.spinDisplay, section: on } })), []);
  const scenarioTitle = electronDefinition.scenarios.find(x => x.id === scenario)?.title;

  const headerNode = <Header experiment={header.experiment} scenario={scenarioTitle}
    actions={<FileActions disabled={!ready} onFile={load} onSave={save}
      exports={[{ id: 'png', label: 'PNG image', onSelect: () => renderer.current?.exportPNG(), disabled: !!graphicsError || !!study }, { id: 'csv', label: 'CSV (reference sequence)', onSelect: csv }]}/>}/>;

  const scene = (
    <section className="light-viewport-shell electron-stage" aria-label="Electron field visualization">
      <div className="light-viewport electron-viewport" ref={setHost}/>
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => restart()}>Restart electron worker</button></div>}
      <div className="light-view-top">
        <span><i className={`dot ${s.running ? '' : 'paused'}`}/>{s.running ? 'FIELD RESPONSE' : 'PAUSED'}<b>{stageLabel} · {stageNote}</b></span>
        <Segmented label="Camera" testId="camera" options={electronDefinition.cameras.filter(c => appliesTo(c, scenario)).map(c => ({ value: c.id, label: c.label }))} value={camera}
          onChange={v => { if (v === 'shell') setView(old => ({ ...old, shells: true })); setCamera(v as Camera); }}/>
      </div>
      <div className="electron-overlay-bottom">
        <p className="electron-hint">{p.mode === 'spin' ? 'Curled arrows turn at each pair · shaded plane links to 2D' : 'Faraday lines follow dipoles · field arrows are references'}</p>
        <div className="light-view-legend"><span><i className="charge positive"/>+ Positron</span><span><i className="charge negative"/>− Electron</span><span className="light-e">— Polarization / E</span><span className="light-b">— B motion</span><span className="electron-spin-colour">— B spin</span></div>
        <div className="light-scale">R = λC/2 ≈ 1.213 pm · radius guide, not a solid shell</div>
      </div>
      {graphicsError && <div className="graphics-error" role="alert"><h3>Electron viewport needs attention</h3><p>{graphicsError}</p><button onClick={() => { setGraphicsError(''); setContextLost(false); setRevision(v => v + 1); }}>Recover electron viewport</button></div>}
    </section>
  );
  const viewportNode = study
    ? <div className="electron-study"><ElectronProperties study={study}/></div>
    : <div className="electron-single">{scene}</div>;
  // Spin links the equatorial section and the selected pair's charge motion. Stationary and Moving have no local turns
  // for the charge-motion close-up to show, so they stay 1-up.
  const panes: SplitPane[] = p.mode === 'spin' && view.shells && !study ? [
    { id: 'section', label: 'Equatorial section', content: <SpinSection state={s} view={view} selected={selected} onPick={id => { setSelected(id); setTab('selection'); }}/> },
    { id: 'motion', label: 'Charge motion', content: <ChargeMotion state={s} index={shellIndex} display={view.spinDisplay}/> },
  ] : [];

  const dockNode = study ? undefined : (
    <Dock collapsed={dockCollapsed} onCollapsedChange={setDockCollapsed} tab={dockTab} onTab={setDockTab}
      readouts={[
        { label: 'Position', value: electronX(s).toFixed(3), unit: `R · ${velocity(p).toFixed(2)} c`, testId: 'electron-position' },
        { label: 'Time', value: time.toFixed(2), unit: 'τ' },
        { label: 'Enclosed Q', value: flux.toFixed(4), unit: 'e' },
        { label: 'Spin', value: p.spin > 0 ? '+½' : '−½', unit: 'ℏ' },
      ]}
      tabs={[
        { id: 'probe', label: 'Probe', content: <div className="electron-probe">
          <div><h4>Field history · lab ({vector(probePosition(p))}) R</h4><Plot label="Electric Y, motion magnetic Z, and intrinsic magnetic Z reference components at the fixed probe" x={traceTimes} series={[{ key: 'e', label: 'Eᵧ/E₀', color: palette.dataE, values: traces.map(v => v?.[0] ?? null) }, { key: 'b', label: 'Bmotion,z/B₀', color: palette.dataB, values: traces.map(v => v?.[1] ?? null) }, { key: 'bspin', label: 'Bspin,z/B₀', color: palette.dataBspinHi, values: traces.map(v => v?.[2] ?? null) }]} xUnit="τ" xDomain={[0, Math.max(time, 0.01)]} yDomain={[-max * 1.25, max * 1.25]} reference={0} formatX={v => v.toFixed(2)} height={84} testId="electron-probe-plot"/></div>
          <div>{field.valid ? <dl className="light-readouts"><div><dt>Electric / E₀</dt><dd data-testid="electron-E">{vector(field.electric)}</dd></div><div><dt>Motion B / B₀</dt><dd data-testid="electron-B-motion">{vector(field.motion)}</dd></div><div><dt>Intrinsic B / B₀</dt><dd>{p.mode === 'electric' ? 'Hidden in electric-only view' : vector(field.intrinsic)}</dd></div><div><dt>Distance to electron</dt><dd>{field.radius.toFixed(3)} R</dd></div></dl> : <p className="electron-excluded" role="status">Probe lies inside the 0.3 R numerical mask. Field values are excluded.</p>}
            <p className="light-small">E₀ = e/(4πε₀R²), B₀ = E₀/c. Motion field vanishes at zero velocity. Intrinsic magnetism can remain at rest. Reference components use normalized units; gaps mark the excluded central region. Intrinsic spin magnetism is a separate dipole reference, not part of B = v × E / c².</p></div>
        </div> },
        ...(p.mode === 'spin' ? [{ id: 'shells', label: 'Shell rates', content: <div className="electron-shell-rates">
          <div className="electron-rate-profile" aria-label="Illustrative shell rotation profile">{SHELL_RADII.slice(0, view.spinDisplay.count).map((r, i) => {
            const pair = displayedDipole(s, LATTICE_SAMPLES + i * SAMPLES_PER_SHELL + 34, view.spinDisplay);
            return <button key={r} aria-label={`Inspect spin band at ${r} R`} onClick={() => { setSelected(pair.index); setView(v => ({ ...v, shells: true })); setTab('selection'); }} style={{ borderColor: SHELL_COLOURS[i] }}>
              <span style={{ color: SHELL_COLOURS[i] }}>{shellSense(i, p.spin, view.spinDisplay.alternating) > 0 ? '↺' : '↻'} Shell {i + 1} · {r.toFixed(1)} R</span>
              <i style={{ width: `${100 * spinRateAtRadius(r) / spinRateAtRadius(.6)}%`, background: SHELL_COLOURS[i] }}/>
              <strong>{(pair.spinRate * 180 / Math.PI).toFixed(2)}°/τ</strong>
            </button>;
          })}</div>
          <div><p className="light-small">Turn directions are viewed from +{p.axis.toUpperCase()} toward the core. Reverse the spin projection in Setup to reverse every shell. Playback, step and timeline control both views together.</p>
            <p className="light-small"><strong>{view.spinDisplay.alternating ? 'Alternating complete zepton shells is an illustrative extension.' : 'Shared preference illustrates the local coordination in §3.'}</strong> Fleming’s §4 counter-rotating charge shells are the inner + and outer − ends of a dipole, rather than a stated rule for successive whole zepton shells. The shell spacing, magnified turns and capped 1/r² rate are display assumptions.</p>
            <div className="electron-replay-actions"><button disabled={!ready} onClick={sharedRotation}>Explore the video’s shared rotation</button><a className="light-small" href="./docs/electron-source-notes.md#figure-2-linked-shell-views" target="_blank" rel="noreferrer">Fig. 2 interpretation & visualization choices ↗</a></div></div>
        </div> }] : []),
        { id: 'sources', label: 'Sources', content: <div className="electron-sources">
          <article><strong>Polarization → electric field</strong><p>A bare negative polarizer aligns positive dipole ends inward. Fleming relates the surrounding polarization flux to unit charge.</p><a href="./docs/papers/Electron%20Properties%20Explained%20as%20Quantum%20Field%20Effects.pdf#page=2" target="_blank" rel="noreferrer">Electron properties · §2 ↗</a></article>
          <article><strong>Preferred local rotation → spin</strong><p>Neighboring partially aligned dipoles favor a common rotation sense. Their centres and the bare core need not move.</p><a href="./docs/papers/Electron%20Properties%20Explained%20as%20Quantum%20Field%20Effects.pdf#page=3" target="_blank" rel="noreferrer">Electron properties · §§3–6 ↗</a></article>
          <article><strong>Polarization rate → radius</strong><p>R = λC/2 gives an effective rate c/(2πR) ≈ 3.933 × 10¹⁹ turns/s in Fleming’s radius argument.</p><a href="./docs/papers/Electron%20and%20proton%20radii%20are%20due%20to%20quantum%20polarization%20rate%20and%20the%20speed%20of%20light.pdf#page=3" target="_blank" rel="noreferrer">Radii paper · §4 ↗</a></article>
          <article><strong>Source scale & constants</strong><dl className="light-readouts"><div><dt>R = λC/2</dt><dd>{(RADIUS * 1e12).toFixed(6)} pm</dd></div><div><dt>c/(2πR)</dt><dd>{(C / (2 * Math.PI * RADIUS)).toExponential(3)} Hz</dd></div><div><dt>α</dt><dd>1 / {(1 / ALPHA).toFixed(6)}</dd></div><div><dt>μ along preferred axis</dt><dd>{(-p.spin * G_FACTOR / 2).toFixed(6)} μB</dd></div></dl><p className="light-small">Reference inputs, not fitted outputs. Fleming interprets α as total polarization. This experiment does not derive α, quantized spin, magnetic moment or mass from dipole interactions.</p><a href="./docs/electron-source-notes.md" target="_blank" rel="noreferrer">Read extracted source details & model decisions ↗</a></article>
        </div> },
      ]}/>
  );

  const selectionNode = (
    <div className="electron-selection">
      <div className="light-selection-head"><h3>{picked ? `Zepton ${picked.index}` : 'Inspect a zepton'}</h3><button type="button" className="inspector-link" disabled={!!study} onClick={inspectProbe}>Nearest to probe</button></div>
      {picked ? <>
        <div className="electron-pair-signs"><span>+</span><i/><span>−</span></div>
        <dl className="light-readouts"><div><dt>Sample / generation</dt><dd>{picked.index} / {picked.generation}</dd></div><div><dt>Fixed centre (R)</dt><dd data-testid="electron-pair-centre">{vector(picked.centre)}</dd></div><div><dt>Age / lifetime (τ)</dt><dd>{picked.age.toFixed(2)} / {picked.lifetime.toFixed(2)}</dd></div><div><dt>Full separation</dt><dd>{picked.separation.toFixed(3)} R</dd></div><div><dt>Local spin turn</dt><dd data-testid="electron-local-spin">{(picked.spinTurn * 180 / Math.PI).toFixed(2)}° / lifecycle</dd></div><div><dt>Spin rate (illustrative)</dt><dd data-testid="electron-spin-rate">{(picked.spinRate * 180 / Math.PI).toFixed(2)}° / τ</dd></div><div><dt>Motion turn</dt><dd>{(picked.motionTurn * 180 / Math.PI).toFixed(2)}° / lifecycle</dd></div></dl>
        {!picked.field.valid && <p className="light-small">This sample is currently inside the electron’s numerical mask.</p>}
        <div className="electron-selection-actions"><button type="button" className="light-focus" onClick={focusSelection}><Focus size={14}/>Focus this fixed centre <kbd>F</kbd></button><button type="button" className="inspector-link" onClick={clearSelection}>Clear <kbd>Esc</kbd></button></div>
      </> : <p className="light-small">Click a pair to inspect its fixed centre, in the field or the section, or choose Nearest to probe. Selection pins a fixed sampling location across successive pair generations.</p>}
    </div>
  );

  const spinControls = (electronDefinition.viewControls ?? []).filter(c => appliesTo(c, scenario));
  const inspectorNode = (
    <Inspector tab={tab} onTab={setTab} selection={selectionNode}
      setup={<SetupPanel definition={electronDefinition} scenario={scenario} params={p} onLive={() => undefined} onApply={configure}>
        {spinControls.length > 0 && <section className="inspector-group" aria-label="Shell display">
          <header className="inspector-group-head"><h3>Shell display</h3></header>
          {spinControls.map(spec => <Control key={spec.key} spec={spec} value={getPath(view, spec.key)} onChange={v => setView(old => withPaths(old, { [spec.key]: v }))}/>)}
        </section>}
        {MODE_OF[scenario] && <p className="light-small electron-about">{DESCRIPTION[MODE_OF[scenario]]} {p.mode === 'electric' ? 'The electron appears during the first 0.35 τ; nearby pairs then align before distant ones. The 3 τ introduction is an illustrative transition, not a calculated propagation time. Probe numbers are final-field analytic references.' : p.mode === 'spin' ? 'Each replacement pair starts partly aligned, turns toward the electron, and collapses. Both views show the same equatorial sites and generations. Outer pairs turn more slowly under the chosen display law; no centre orbits the electron.' : 'The path marks the prescribed electron trajectory. It is not a permanent magnetic wake; the reference field changes as the electron passes.'}</p>}
      </SetupPanel>}
      view={study ? <p className="inspector-empty">This study draws its own figure; it has no scene layers.</p> : <>
        <ViewPanel definition={{ ...electronDefinition, viewControls: [] }} scenario={scenario} view={view} onView={(k, v) => setView(old => withPaths(old, { [k]: v }))}/>
        {p.mode === 'spin' && <section className="inspector-group" aria-label="Spin view">
          <header className="inspector-group-head"><h3>Spin view</h3></header>
          <label className="medium-setting"><input type="checkbox" checked={view.spinDisplay.section} onChange={e => { setPane('section'); setSplit(e.target.checked); }}/>Linked 2D section</label>
          <label className="medium-setting"><input type="checkbox" checked={view.spinDisplay.guides} onChange={e => setView(v => ({ ...v, spinDisplay: { ...v.spinDisplay, guides: e.target.checked } }))}/>Shell guides</label>
          {!view.shells && <p className="light-small">Shell sampling is hidden. Choose Shell close-up to restore the linked views.</p>}
        </section>}
        <section className="inspector-group" aria-label="Settings">
          <header className="inspector-group-head"><h3>Settings</h3></header>
          <label className="medium-setting"><input type="checkbox" data-testid="setting-reduced-motion" checked={view.reducedMotion} onChange={e => setView(v => ({ ...v, reducedMotion: e.target.checked }))}/>Reduced flashing &amp; camera motion</label>
          <p className="light-small">Faraday lines trace the neighboring dipoles’ mean alignment, with arrows toward positive ends. Line spacing is illustrative. Magnetic guides follow the motion-induced rotation direction.</p>
          <a className="light-small" href="./docs/Polarization-Notes.md" target="_blank" rel="noreferrer">Polarization notes ↗</a>
        </section>
      </>}/>
  );

  const timelineNode = state && !study && (
    <TimelineBar runtime={runtime} timeline={electronDefinition.timeline(scenario, p)} speeds={SPEEDS}
      markers={checkpoints.map((c, i) => ({ id: `${i}-${c.tick}`, tick: c.tick, label: `electron tick ${c.tick}` }))}
      onMarker={m => { const c = checkpoints.find((x, i) => `${i}-${x.tick}` === m.id); if (c) runtime.restore(c); }} onCapture={capture} runDisabled={contextLost}/>
  );

  return (
    <div className={`electron-workbench-root ${p.mode === 'spin' ? 'electron-spin-view' : ''}`} style={{ display: active ? undefined : 'none' }}>
      <Shell id="electron" header={headerNode} rail={rail} viewport={<SplitView active={active && !study} primary={viewportNode} panes={panes} split={view.spinDisplay.section} onSplit={setSplit} pane={pane} onPane={id => setPane(id as 'section' | 'motion')}/>} timeline={timelineNode} dock={dockNode} inspector={inspectorNode}
        status={<StatusBar running={s.running} items={[ELECTRON_MODEL, <span data-testid="electron-tick">Tick {s.tick} · {(time * TAU).toExponential(2)} s</span>, 'τ = R/c', 'Fixed zepton centres · local worker · source-linked model']}/>}/>
      {notice && <div className="toast" role="status" data-testid="notice"><Info size={15}/><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14}/></button></div>}
    </div>
  );
}
