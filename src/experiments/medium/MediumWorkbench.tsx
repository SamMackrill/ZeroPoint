import { Box, Check, ChevronRight, Crosshair, Info, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_VIEW, DT, ENERGY_UNIT, FREQUENCY_UNIT, MODEL_VERSION, validateSeed, type Checkpoint, type Diagnostics, type ExperimentFile, type Parameters, type ViewSettings } from '../../model/types';
import { downloadFile, parseExperiment } from '../../persistence/experiment';
import type { FieldRenderer, PickedDipole } from '../../rendering/FieldRenderer';
import { useSimulation } from '../../simulation/useSimulation';
import { palette } from '../../ui/palette';
import { Plot } from '../../ui/Plot';
import { Readouts } from '../../ui/Readouts';
import { Segmented } from '../../ui/Segmented';
import { exportActions, FileActions, fileShortcuts, Header, type ExportItem, StatusBar, type HeaderProps } from '../../workbench/Chrome';
import { scenarioState, withPaths } from '../../workbench/definition';
import { Dock } from '../../workbench/Dock';
import { Inspector, SetupPanel, ViewPanel, type InspectorTab } from '../../workbench/Inspector';
import { mediumRuntime, SPEEDS } from '../../workbench/runtime';
import { dockStartsCollapsed, Shell, usePhone } from '../../workbench/Shell';
import { TimelineBar, transportActions } from '../../workbench/TimelineBar';
import { APPLY_SHORTCUT, cameraActions, layerActions, PANEL_SHORTCUTS, parameterActions, SELECTION_SHORTCUTS, SPLIT_SHORTCUT, useActions, type Action } from '../../workbench/actions';
import { mediumDefinition, type MediumParams } from './definition';
import './medium-workbench.css';
import { useSelectionKeys } from '../../workbench/selection';
import { copyLinkAction, encodeUrl, routeFor, useUrlWriter, type ScenarioRequest } from '../../workbench/urlState';
import { getSettings, updateSettings, useSettings } from '../../workbench/settings';
import { AboutSheet, helpActions, useAbout } from '../../workbench/AboutSheet';
import { SplitView } from '../../workbench/SplitView';
import { CompareTab, withDeltas } from '../../workbench/compare';
import { useMediumCompare } from '../../simulation/useMediumCompare';
import { DipoleCloseUp } from './DipoleCloseUp';

/** At most this many ◆ checkpoints are kept, for every experiment (§09). */
export const CHECKPOINT_LIMIT = 8;

/** Whole numbers with thousands separators. */
const fmt = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 0 });

/** Plot recent medium population or energy diagnostics. */
function DiagnosticsPlot({ rows, mode, b }: { rows: Diagnostics[]; mode: 'population' | 'energy'; b?: ReadonlyMap<number, Diagnostics> }) {
  const pick = (r: Diagnostics) => (mode === 'population' ? r.active : r.fieldEnergy);
  const values = rows.map(pick), valuesB = b && rows.map(r => { const other = b.get(r.tick); return other ? pick(other) : null; });
  const label = mode === 'population' ? 'Active dipoles' : 'Field energy';
  return <Plot label={`${mode === 'population' ? 'Active dipole count' : 'Field energy in E₀'} over recent model time`} x={rows.map(r => r.time)}
    series={[{ key: mode, label, color: palette.dataShell3, values, area: true }, ...(valuesB ? [{ key: `${mode}B`, label: `${label} · B`, color: palette.dataShell3, values: valuesB, dashed: true }] : [])]}
    xUnit="τ" yUnit={mode === 'energy' ? 'E₀' : undefined} yDomain={[0, Math.max(1, ...values, ...(valuesB ?? []).map(v => v ?? 0)) * 1.15]} formatX={t => t.toFixed(2)} formatY={fmt}
    empty="Run or step the experiment to collect samples" height={96} testId={`medium-plot-${mode}`}/>;
}

/** Props for MediumWorkbench. */
export interface MediumWorkbenchProps {
  active: boolean;
  rail: ReactNode;
  /** Breadcrumb fields; the workbench adds its file actions and help. */
  header: Pick<HeaderProps, 'experiment'>;
  scenarioRequest?: ScenarioRequest | null;
  onPresetChange?(id: string): void;
  onOpenLight(): void;
  onOpenElectron(): void;
  onOpenVdw(): void;
}

/**
 * The Medium lifecycle laboratory in the workbench (UI 07): the field viewport with its overlays, the open timeline,
 * the dock (readouts; plots, ledger and events), the inspector (Setup, View, Selection) and the header's file actions.
 * The worker protocol and renderer are unchanged; per-tick data reaches the renderer through the runtime subscription.
 */
export function MediumWorkbench({ active, rail, header, scenarioRequest, onPresetChange, onOpenLight, onOpenElectron, onOpenVdw }: MediumWorkbenchProps) {
  const sim = useSimulation(), { state, latest, sink, send, checkpoint } = sim;
  const runtime = useMemo(() => mediumRuntime({ send, latest, sink, checkpoint }), [send, latest, sink, checkpoint]);
  useEffect(() => () => runtime.dispose(), [runtime]);
  // The host is held in state (a callback ref), so the renderer follows the element itself: the shell remounts the viewport
  // when it switches between its wide and narrow layouts.
  const [host, setHost] = useState<HTMLDivElement | null>(null), viewport = useRef<FieldRenderer | null>(null);
  const [camera, setCamera] = useState<'perspective' | 'top' | 'front'>('perspective'), cameraRef = useRef(camera);
  cameraRef.current = camera;
  const [view, setView] = useState<ViewSettings>(() => ({ ...DEFAULT_VIEW, reducedMotion: getSettings().reducedMotion }));
  // Reduced motion is a global setting (header › Settings); the view follows it, including after a Load replaces it.
  // The orbit hint shows on the first visit only (the plan's cut list); dismissing it is remembered.
  const { reducedMotion, orbitHintSeen } = useSettings();
  useEffect(() => { if (view.reducedMotion !== reducedMotion) setView(v => ({ ...v, reducedMotion })); }, [reducedMotion, view.reducedMotion]);
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  const [graphicsError, setGraphicsError] = useState<string | null>(null), [renderRevision, setRenderRevision] = useState(0);
  // A lost graphics context holds playback until the viewport recovers; a renderer that never loaded leaves controls usable.
  const [contextLost, setContextLost] = useState(false);
  const [picked, setPicked] = useState<PickedDipole | null>(null);
  const [parameters, setParameters] = useState<Parameters>(mediumDefinition.defaultParams), [seed, setSeed] = useState(2026);
  const [preset, setPreset] = useState('balanced'), [scenario, setScenario] = useState('balanced');
  const [tab, setTab] = useState<InspectorTab>('setup'), [dockTab, setDockTab] = useState('plots'), [dockCollapsed, setDockCollapsed] = useState(dockStartsCollapsed);
  const [rows, setRows] = useState<Diagnostics[]>([]), [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  // Medium opens 1-up; the split pane shows the selected dipole enlarged (§07 split view).
  const [split, setSplit] = useState(false);
  const about = useAbout();
  const fileInput = useRef<HTMLInputElement>(null);
  const d = state?.diagnostics, ready = !!state && !sim.error, running = state?.running ?? false;
  // A/B compare (plan §11): B is a headless second simulation stepped to A's tick.
  const compare = useMediumCompare(), phone = usePhone(); // phones: no Compare (plan §13)
  useEffect(() => { if (compare.b && d) compare.advance(d.tick); }, [compare.b?.pinned, d?.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Pin A's exact current state as B (a checkpoint, so identical settings continue identically). */
  const pinCurrent = async () => { try { compare.pin(await runtime.checkpoint()); } catch (error) { setNotice(String(error)); } };
  /** Load a saved Medium file as B. */
  const loadB = async (file: File) => { try { if (file.size > 8 * 1024 * 1024) throw new Error('Experiment files must be smaller than 8 MB.'); compare.pin(parseExperiment(await file.text()).checkpoint); setNotice(`Loaded ${file.name} as B.`); } catch (error) { setNotice(`Could not load as B: ${error instanceof Error ? error.message : String(error)}`); } };
  // Δ compares like with like: B's diagnostics at A's displayed tick (a reply for an older tick is not used).
  const bNow = compare.b && d ? compare.history.current.get(d.tick) : undefined;
  /** The readout strip for one set of diagnostics. */
  const stripFor = (x: Diagnostics | undefined) => [
    { label: 'Active', value: fmt(x?.active ?? 0) },
    { label: 'Time', value: (x?.time ?? 0).toFixed(3), unit: 'τ' },
    { label: 'Energy', value: (x?.fieldEnergy ?? 0).toFixed(1), unit: 'E₀' },
    { label: 'Residual', value: Math.abs(x?.residual ?? 0).toExponential(1), unit: 'E₀' },
  ];

  /** A pick selects the dipole and opens the Selection tab (§07: selection changes auto-open it). */
  // The renderer reports the selection again on every snapshot; only a newly picked dipole opens the Selection tab.
  const pickedId = useRef<string | null>(null);
  const onPick = useCallback((value: PickedDipole | null) => {
    setPicked(value);
    const id = value ? `${value.slot}:${value.generation}` : null;
    if (id && id !== pickedId.current) setTab('selection');
    pickedId.current = id;
  }, []);
  useEffect(() => {
    if (!active || !host) return;
    let disposed = false, renderer: FieldRenderer | null = null, off = () => undefined as void;
    import('../../rendering/FieldRenderer').then(module => {
      if (disposed) return;
      renderer = new module.FieldRenderer(host, viewRef.current, onPick, () => undefined, message => { setGraphicsError(message); setContextLost(true); runtime.run(false); });
      viewport.current = renderer; renderer.cameraPreset(cameraRef.current);
      off = runtime.subscribe(snapshot => renderer?.update(snapshot.data));
      if (latest.current) renderer.update(latest.current.data);
    }).catch(error => { if (!disposed) setGraphicsError(`3D view unavailable: ${error instanceof Error ? error.message : String(error)}. Controls, diagnostics and experiment files remain available.`); });
    return () => { disposed = true; off(); viewport.current = null; renderer?.dispose(); };
  }, [active, host, onPick, renderRevision, runtime, latest]);
  useEffect(() => { viewport.current?.cameraPreset(camera); }, [camera]);
  useEffect(() => { if (!active) runtime.run(false); }, [active, runtime]);
  useEffect(() => { viewport.current?.setOptions(view); }, [view]);
  useEffect(() => { if (state) { setParameters(state.parameters); setSeed(state.seed); } }, [state?.diagnostics.parameterVersion, state?.seed]);
  useEffect(() => {
    if (!d) return;
    setRows(previous => { if (previous.at(-1)?.tick === d.tick) return previous; return d.tick < (previous.at(-1)?.tick ?? 0) ? [d] : [...previous, d].slice(-240); });
  }, [d?.tick]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { onPresetChange?.(preset); }, [preset, onPresetChange]);

  const clearSelection = useCallback(() => viewport.current?.select(null), []);
  const focusSelection = useCallback(() => { if (picked) viewport.current?.focusOn(picked.position); }, [picked]);
  useSelectionKeys({ active, hasSelection: !!picked, onClear: clearSelection, onFocus: focusSelection });
  const setOption = (key: string, value: unknown) => setView(v => withPaths(v, { [key]: value }));
  /** Apply a live parameter change; the scenario label becomes "modified". */
  function updateParameter(key: string, value: unknown) { const next = { ...parameters, [key]: value }; setParameters(next); runtime.setLive(next); setPreset('custom'); }
  /** Restart with a seed and parameters (Reset, scenario changes, and applying a new seed). */
  function restart(params: Parameters, nextSeed: number, id: string, message = 'Experiment reset to tick 0.') {
    try { runtime.configure({ seed: validateSeed(nextSeed), parameters: params }); setParameters(params); setSeed(nextSeed); setPreset(id); setRows([]); viewport.current?.select(null); setNotice(message); } catch (error) { setNotice(String(error)); }
  }
  /** Start a scenario from its preset parameters, keeping the seed; a link's request also brings its settings and view. */
  const startScenario = (request: ScenarioRequest) => {
    const { id, url } = request, linked = url && Object.keys(url.params).length > 0;
    const { params } = scenarioState(mediumDefinition, id), { seed: linkedSeed, ...physical } = { ...params, ...url?.params } as MediumParams;
    restart(physical, url && 'seed' in url.params ? linkedSeed : seed, linked ? 'custom' : id); setScenario(id);
    if (url) {
      setView(v => withPaths(v, url.view));
      if (url.camera) setCamera(url.camera as typeof camera);
      if (url.split) setSplit(url.split === 'dipole');
    }
    if (request.dropped?.length) setNotice(`Ignored link settings that don’t apply: ${request.dropped.join(', ')}.`);
  };
  const startRef = useRef(startScenario);
  startRef.current = startScenario;
  useEffect(() => { if (scenarioRequest) startRef.current(scenarioRequest); }, [scenarioRequest]);

  /** Capture the worker state as a ◆ checkpoint or a downloaded file. */
  async function save(kind: 'file' | 'checkpoint') {
    setBusy(true);
    try {
      const c = await runtime.checkpoint();
      if (kind === 'checkpoint') { setCheckpoints(old => [...old, c].slice(-CHECKPOINT_LIMIT)); setNotice(`Checkpoint captured at tick ${c.tick}.`); }
      else { const file: ExperimentFile = { format: 'zeropoint-experiment', version: 1, savedAt: new Date().toISOString(), checkpoint: c, view: viewRef.current }; downloadFile(`zeropoint-${c.seed}-tick-${c.tick}.json`, JSON.stringify(file), 'application/json'); setNotice('Experiment saved with exact simulation state.'); }
    } catch (error) { setNotice(String(error)); } finally { setBusy(false); }
  }
  /** Validate and restore a medium experiment file selected by the user. */
  async function importFile(file: File) {
    setBusy(true);
    try { if (file.size > 8 * 1024 * 1024) throw new Error('Experiment files must be smaller than 8 MB.'); const experiment = parseExperiment(await file.text()); runtime.restore(experiment.checkpoint); setParameters(experiment.checkpoint.parameters); setSeed(experiment.checkpoint.seed); setView(experiment.view); setRows([]); setPreset('custom'); viewport.current?.select(null); setNotice(`Loaded tick ${experiment.checkpoint.tick}. The experiment is paused.`); }
    catch (error) { setNotice(`Could not load file: ${error instanceof Error ? error.message : String(error)}`); } finally { setBusy(false); }
  }
  /** Restore a captured medium checkpoint and synchronize the controls. */
  function restore(c: Checkpoint) { runtime.restore(c); setParameters(c.parameters); setSeed(c.seed); setRows([]); setPreset('custom'); viewport.current?.select(null); setNotice(`Restored checkpoint at tick ${c.tick}.`); }
  /** Export the collected medium diagnostic samples as CSV. */
  function exportCSV() { const heading = 'tick,time_tau,physical_time_s,active,births,deaths,rejected,field_energy_E0,reservoir_E0,residual_E0,parameter_version'; downloadFile('zeropoint-diagnostics.csv', heading + '\n' + rows.map(r => [r.tick, r.time, r.time / FREQUENCY_UNIT, r.active, r.births, r.deaths, r.rejected, r.fieldEnergy, r.reservoir, r.residual, r.parameterVersion].join(',')).join('\n'), 'text/csv'); setNotice('Recent diagnostic samples exported.'); }
  /** Open the requested model or roadmap help content. */
  const exportPNG = () => viewport.current?.exportPNG(`Seed ${state?.seed} | Tick ${d?.tick} | t = ${d?.time.toFixed(3)} tau | L0 = 1e-13 m | Illustrative reduced model`);

  const params: MediumParams = { ...parameters, seed };
  // The address bar follows the visible lab (plan §11): its scenario and whatever differs from the scenario's start.
  const urlHash = encodeUrl(routeFor(mediumDefinition, scenario, params, view, { camera: camera === 'perspective' ? undefined : camera, split: split ? 'dipole' : undefined }));
  useUrlWriter(active, running, urlHash);
  const scenarioTitle = mediumDefinition.scenarios.find(s => s.id === scenario)?.title;
  const exportItems: ExportItem[] = [{ id: 'png', label: 'PNG image', onSelect: exportPNG, disabled: !!graphicsError }, { id: 'csv', label: 'CSV (diagnostics)', onSelect: exportCSV, disabled: !rows.length }];
  const headerNode = <Header experiment={header.experiment} scenario={scenarioTitle} modified={preset === 'custom'} onHelp={() => about.show()} onChip={() => about.show('scenario')}
    actions={<FileActions inputRef={fileInput} disabled={!ready || busy} onFile={importFile} onSave={() => save('file')}
      exports={exportItems}/>}/>;

  const viewportNode = (
    <section className="viewport-shell medium-stage" aria-label="Field visualization">
      <div ref={setHost} className="viewport" onPointerDown={() => { if (!orbitHintSeen) updateSettings({ orbitHintSeen: true }); }}/>
      {sim.error && <div className="error-banner" role="alert">{sim.error}<button onClick={sim.restart}>Restart worker</button></div>}
      <div className="view-top">
        <div className="view-label"><span className={`dot ${running ? '' : 'paused'}`}/><span>{ready ? running ? 'LIVE FIELD' : 'PAUSED' : 'INITIALIZING'}</span><span className="view-label-divider"/>{fmt(d?.active ?? 0)} dipoles · periodic 8 L₀ cell</div>
        <Segmented label="Camera" options={[{ value: 'perspective', label: 'Perspective' }, { value: 'top', label: 'Top' }, { value: 'front', label: 'Front' }]} value={camera} testId="camera"
          onChange={preset => setCamera(preset as typeof camera)}/>
      </div>
      <div className="view-axis" aria-hidden="true"><svg viewBox="0 0 60 60"><path d="M28 34V8M28 34L51 45M28 34L8 46" fill="none" strokeWidth="1.5" stroke={palette.text4}/><text x="24" y="7" fill={palette.dataShell3}>Y</text><text x="50" y="56" fill={palette.dataPos}>X</text><text x="0" y="55" fill={palette.text3}>Z</text><circle cx="28" cy="34" r="3" fill={palette.text2}/></svg></div>
      <div className="view-bottom"><div className="charge-legend">{view.representation === 'dipoles' ? <><span><i className="charge positive"/>+ Positive lobe</span><span><i className="charge negative"/>− Negative lobe</span></> : <span><i className="charge negative"/>Dipole samples · orientation hidden</span>}</div><span className="cell-scale"><i/>8 L₀ · periodic cell</span></div>
      {!orbitHintSeen && <div className="orbit-hint">Drag to orbit <span>·</span> Scroll to zoom <span>·</span> Click to inspect</div>}
      {view.slice && <div className="slice-legend"><span>Energy / L₀³</span><i/><span>0 — {viewport.current?.getSliceMax().toFixed(1) ?? '0'} E₀</span></div>}
      {graphicsError && <div className="graphics-error" role="alert"><Box size={30}/><h3>Viewport needs attention</h3><p>{graphicsError}</p><button onClick={() => { setGraphicsError(null); setContextLost(false); setRenderRevision(n => n + 1); }}>Recover viewport</button></div>}
    </section>
  );

  const dockNode = (
    <Dock collapsed={dockCollapsed} onCollapsedChange={setDockCollapsed} tab={dockTab} onTab={setDockTab}
      readouts={withDeltas(stripFor(d), bNow ? stripFor(bNow) : null)}
      tabs={[
        { id: 'plots', label: 'Plots', content: <div className="medium-plots"><div><h4>Active dipoles</h4><DiagnosticsPlot rows={rows} mode="population" b={compare.b ? compare.history.current : undefined}/></div><div><h4>Field energy · E₀</h4><DiagnosticsPlot rows={rows} mode="energy" b={compare.b ? compare.history.current : undefined}/></div></div> },
        ...(phone ? [] : [{ id: 'compare', label: 'Compare', badge: compare.b ? 'B' : undefined, content: <CompareTab definition={mediumDefinition} scenario={scenario} a={params}
          b={compare.b ? { ...compare.b.pinned.parameters, seed: compare.b.pinned.seed } : null} onPin={pinCurrent} onLoadB={loadB} onClear={compare.clear}
          onCopyToA={() => { if (compare.b) restart({ ...compare.b.pinned.parameters }, compare.b.pinned.seed, 'custom', 'Copied B’s parameters to A. Experiment reset to tick 0.'); }}
          note={compare.b?.error ?? `B is a second simulation from its pinned state (tick ${compare.b?.pinned.tick ?? 0}), stepped in lock-step with A’s tick and drawn dashed in the plots.`}/> }]),
        { id: 'ledger', label: 'Ledger', content: <div className="medium-ledger">
          <Readouts testId="medium-ledger" items={[
            { label: 'Reservoir energy', value: (d?.reservoir ?? 0).toFixed(2), unit: 'E₀' },
            { label: 'Field energy', value: (d?.fieldEnergy ?? 0).toFixed(1), unit: 'E₀' },
            { label: 'Ledger residual', value: Math.abs(d?.residual ?? 0).toExponential(1), unit: 'E₀' },
            { label: 'Rejected births', value: fmt(d?.rejected ?? 0) },
            { label: 'Physical time', value: ((d?.time ?? 0) / FREQUENCY_UNIT).toExponential(2), unit: 's' },
            { label: 'Represented energy', value: ((d?.fieldEnergy ?? 0) * ENERGY_UNIT).toExponential(2), unit: 'J' },
          ]}/>
          <p className="medium-note"><Check size={11}/>Particle + reservoir balance</p>
        </div> },
        { id: 'events', label: 'Events', content: <div className="event-list">{state?.events.slice().reverse().map((event, index) => <div key={`${event.tick}-${index}`}><span>tick {event.tick}</span><p>{event.text}</p></div>)}</div> },
      ]}/>
  );

  const selectionNode = (
    <div className="dipole-inspector">
      <div className="inspector-intro"><h2>{picked ? `Dipole ${picked.slot}:${picked.generation}` : 'Look a little closer'}</h2><p>{picked ? 'Live measurements from the selected fluctuation.' : 'Pause and click a dipole in the field, or select one here.'}</p></div>
      <button className="inspect-first" disabled={!ready || !d?.active} onClick={() => viewport.current?.inspectFirst()}><Crosshair size={15}/>Select first active dipole</button>
      {picked ? <>
        <Readouts copyable testId="dipole-readouts" items={[
          { label: 'Frequency', value: picked.frequency.toFixed(3), unit: 'f₀' },
          { label: 'Energy E = hf / 2', value: (picked.frequency / 2).toFixed(4), unit: 'E₀' },
          { label: 'Age', value: picked.age.toFixed(4), unit: 'τ' },
          { label: 'Lifetime 1 / f', value: picked.lifetime.toFixed(4), unit: 'τ' },
          { label: 'Pair separation', value: picked.separation.toFixed(4), unit: 'L₀' },
          { label: 'Life elapsed', value: `${(picked.age / picked.lifetime * 100).toFixed(1)}%` },
          { label: 'Fixed centre', value: picked.position.map(v => v.toFixed(2)).join(', '), unit: 'L₀' },
        ]}/>
        <div className="life-track"><i style={{ width: `${Math.min(100, picked.age / picked.lifetime * 100)}%` }}/></div>
        <p className="reduced-help">Selection follows this generation only. When it vanishes, its energy returns to the reservoir.</p>
        <div className="selection-actions"><button className="text-button" onClick={focusSelection}>Focus <kbd>F</kbd></button><button className="text-button" onClick={clearSelection}>Clear <kbd>Esc</kbd></button></div>
      </> : <div className="empty-inspector"><Crosshair size={35}/><p>No active selection</p><small>Inspection does not change the simulation.</small></div>}
    </div>
  );

  const inspectorNode = (
    <Inspector tab={tab} onTab={setTab} selection={selectionNode}
      setup={<SetupPanel definition={mediumDefinition} scenario={scenario} params={params}
        onLive={updateParameter} onApply={changes => restart(parameters, Number(changes.seed ?? seed), preset)} onReset={() => startScenario({ id: scenario, at: performance.now() })}/>}
      view={<>
        <ViewPanel definition={mediumDefinition} scenario={scenario} view={view} onView={setOption}/>
      </>}/>
  );

  const timeline = mediumDefinition.timeline(scenario, params);
  // Every shortcut is an action (plan §11): the Help sheet lists them and one listener runs them.
  const actions: Action[] = [
    ...transportActions(runtime, timeline, SPEEDS, { onCapture: () => save('checkpoint'), runDisabled: contextLost, disabled: !ready || busy }),
    ...cameraActions([{ id: 'perspective', label: 'Perspective' }, { id: 'top', label: 'Top' }, { id: 'front', label: 'Front' }], id => setCamera(id as typeof camera)),
    { id: 'view.representation', label: 'Dipoles or points', group: 'View', keys: ['r'], run: () => setOption('representation', view.representation === 'dipoles' ? 'points' : 'dipoles') },
    { id: 'view.layers', label: 'Open View › Layers', group: 'View', keys: ['l'], run: () => setTab('view') },
    ...fileShortcuts(() => save('file'), fileInput, !ready || busy),
    SELECTION_SHORTCUTS.clear, SELECTION_SHORTCUTS.focus, APPLY_SHORTCUT, SPLIT_SHORTCUT, ...PANEL_SHORTCUTS,
    copyLinkAction(urlHash, setNotice),
    ...layerActions(mediumDefinition, scenario, view, (k, v) => setOption(k, v)),
    ...parameterActions(mediumDefinition, scenario, () => setTab('setup')),
    { id: 'selection.first', label: 'Select first active dipole', group: 'Selection', disabled: !ready, run: () => viewport.current?.inspectFirst() },
    ...exportActions(exportItems, !ready || busy),
    ...helpActions(about.show),
  ];
  useActions(active && !about.open, actions);
  const timelineNode = state && (
    <TimelineBar runtime={runtime} timeline={timeline} speeds={SPEEDS}
      markers={checkpoints.map((c, i) => ({ id: `${i}-${c.tick}`, tick: c.tick, label: `t ${c.tick * DT < 100 ? (c.tick * DT).toFixed(2) : Math.round(c.tick * DT)} τ` }))}
      onMarker={m => { const c = checkpoints.find((x, i) => `${i}-${x.tick}` === m.id); if (c) restore(c); }}
      onMarkerPin={m => { const c = checkpoints.find((x, i) => `${i}-${x.tick}` === m.id); if (c) { compare.pin(c); setNotice(`Pinned the checkpoint at tick ${c.tick} as B.`); } }} onCapture={() => save('checkpoint')} runDisabled={contextLost}/>
  );

  const aboutNode = (
    <AboutSheet {...about} shortcuts={actions} onOpenChange={about.setOpen} onSection={about.setSection} active={active} experiment={header.experiment} scenario={scenarioTitle} sections={[
      { id: 'scenario', content: <><h3>What you are observing</h3><p className="model-lede">Observe pairs rotate, separate and collapse around fixed centres. Changes apply at the next available model tick.</p><p>This is a reproducible, reduced visualization of the blueprint’s fluctuation lifecycle. It is not a complete ZPF force solver or experimental validation of the hypothesis.</p><div className="model-equations"><span>E = hf/2</span><span>Δt = 1/f</span><span>Efield + Ereservoir = constant</span></div><h3>The choices made in this version</h3><ul><li>A periodic 8 L₀ cube, at most 10,000 representative dipoles. The population is a finite sample, not a literal Planck-resolved medium.</li><li>Seeded Poisson births; frequencies uniform from 0.5–1.5 times the frequency centre. Existing dipoles keep their assigned frequency.</li><li>We identify ΔE with E and use the blueprint’s equality ΔE Δt = h/2, giving lifetime 1/f. This is an explicit model convention.</li><li>Every birth debits E from a bookkeeping reservoir; every death credits E. Each pair has a fixed centre. Its lobes rotate in opposite positions, separate smoothly to a maximum at midlife, and collapse together before disappearance. The chosen rotation rate and separation envelope are illustrative; no kinetic-energy law is asserted.</li><li>The energy slice bins live dipole energy in a 0.5 L₀ slab. It is not pressure or an emergent force.</li><li>At 1× playback, one wall-clock second represents one τ = 10⁻²⁰ physical seconds. Fixed ticks are 1/120 τ. Runs pause when the tab is hidden.</li></ul><p className="model-limits">Torque, emergent constants, stable shells, force propagation, exchange events and cosmology need additional equations and are not implemented in this release.</p><p className="model-note-card"><strong>A finite window into a proposed field.</strong> Reduced lifecycle model. Physical scales are mapped to an observable clock. A space to observe. A model to question.</p></> },
      { id: 'units', content: <><h3>Scale &amp; conventions</h3><dl className="medium-constants"><div><dt>Length · L₀</dt><dd>10⁻¹³ m</dd></div><div><dt>Frequency · f₀</dt><dd>10²⁰ Hz</dd></div><div><dt>Time · τ</dt><dd>10⁻²⁰ s</dd></div><div><dt>Energy · E₀</dt><dd>hf₀</dd></div><div><dt>Fixed step</dt><dd>1/120 τ</dd></div></dl>
          <div className="formula">E = ½hf <span>·</span> Δt = 1/f</div></> },
      { id: 'sources', content: <><div className="about-links"><a href="./docs/model-specification.md" target="_blank" rel="noreferrer">Read model specification <ChevronRight size={14}/></a><a href="./docs/simulation-plan.html" target="_blank" rel="noreferrer">Full development plan <ChevronRight size={14}/></a></div><h3>Beyond the medium</h3><p>The medium laboratory, light induction sequence and electron polarization experiment are available. Further experiments and calculated force responses remain planned.</p><div className="roadmap-item"><span>02</span><div><h3>Electron polarization · available</h3><p>Explore a stationary electron, local spin rotation and a moving electron’s magnetic response. Calculated torque and pressure forces remain future work.</p><button className="text-button" onClick={() => { about.setOpen(false); onOpenElectron(); }}>Open electron experiment <ChevronRight size={13}/></button></div></div><div className="roadmap-item"><span>03</span><div><h3>Van der Waals / Casimir pressure · available</h3><p>Induce and correlate dipoles, then explore adjustable plates and the ideal Casimir pressure, force and energy. The microscopic zepton boundary model remains planned.</p><a className="text-button" href="./docs/planned-experiments/casimir-effect.md" target="_blank" rel="noreferrer">Read experiment plan <ChevronRight size={13}/></a><button className="text-button" onClick={() => { about.setOpen(false); onOpenVdw(); }}>Open van der Waals experiment <ChevronRight size={13}/></button></div></div><div className="roadmap-item"><span>04</span><div><h3>Light through the zero-point field · available</h3><p>Follow an energy wave through successive induced, counter-rotating electron–positron pairs. Inspect fixed pair centres, local separation and collapse, surrounding field response and each induction handoff.</p><a className="text-button" href="./docs/planned-experiments/light-through-zero-point.md" target="_blank" rel="noreferrer">Read light experiment plan <ChevronRight size={13}/></a><button className="text-button" onClick={() => { about.setOpen(false); onOpenLight(); }}>Open light experiment <ChevronRight size={13}/></button></div></div><div className="roadmap-item"><span>05</span><div><h3>Particle shells</h3><p>Requires spectral cutoffs and shell-energy rules.</p></div></div><div className="roadmap-item"><span>06</span><div><h3>Exchange & cosmology</h3><p>Requires event maps, complete conservation ledgers and a tired-light loss law.</p></div></div></> },
    ]}/>
  );

  return (
    <div className="medium-workbench" style={{ display: active ? undefined : 'none' }}>
      <Shell id="medium" header={headerNode} rail={rail} viewport={<SplitView active={active} primary={viewportNode} panes={[{ id: 'dipole', label: 'Dipole close-up', content: <DipoleCloseUp picked={picked}/> }]} split={split} onSplit={setSplit} pane="dipole" onPane={() => undefined}/>} timeline={timelineNode} dock={dockNode} inspector={inspectorNode}
        status={<StatusBar running={running} items={[...(compare.b ? [<span className="status-badge" aria-label="Comparison B active">B</span>] : []), sim.error ? 'Simulation error' : ready ? 'Simulation ready' : 'Starting worker', `Seed ${state?.seed ?? '—'}`, <span data-testid="tick">Tick {d?.tick ?? 0}</span>]} telemetry={[MODEL_VERSION, `Parameter revision ${d?.parameterVersion ?? 0}`, ...(compare.b ? [`B ${compare.b.stepMs.toFixed(3)} ms/step`] : [])]}/>}/>
      {notice && <div className="toast" role="status" data-testid="notice"><Info size={15}/><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14}/></button></div>}
      {aboutNode}
    </div>
  );
}
