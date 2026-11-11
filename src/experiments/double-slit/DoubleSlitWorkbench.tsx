import { BookOpen, Info, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrivalPlot, SlitDiagram, stateLine, WallPlot } from '../../double-slit/Diagram';
import { LIGHT_REACH, PATH_LENGTH, SLIT_DT, SLIT_END_TICK, SLIT_MODEL, innerEdge, routeViaSlit, slitCsv, slitReadout, type SlitParameters } from '../../double-slit/model';
import { downloadFile } from '../../persistence/experiment';
import { Readouts } from '../../ui/Readouts';
import { AboutSheet, helpActions, useAbout } from '../../workbench/AboutSheet';
import { exportActions, FileActions, fileShortcuts, Header, StatusBar, type ExportItem, type HeaderProps } from '../../workbench/Chrome';
import { Dock } from '../../workbench/Dock';
import { Inspector, SetupPanel, ViewPanel, type InspectorTab } from '../../workbench/Inspector';
import { dockStartsCollapsed, Shell } from '../../workbench/Shell';
import { SplitView } from '../../workbench/SplitView';
import { TimelineBar, transportActions } from '../../workbench/TimelineBar';
import { layerActions, PANEL_SHORTCUTS, parameterActions, SPLIT_SHORTCUT, useActions, type Action } from '../../workbench/actions';
import { scenarioState, withPaths } from '../../workbench/definition';
import { boundedClockModel, type BoundedClock } from '../../workbench/main-thread-models';
import { MainThreadRuntime } from '../../workbench/main-thread-runtime';
import { SPEEDS } from '../../workbench/runtime';
import { copyLinkAction, encodeUrl, routeFor, useUrlWriter, type ScenarioRequest } from '../../workbench/urlState';
import { doubleSlitDefinition, type SlitView } from './definition';
import { parseSlitFile, slitFile } from './file';
import './double-slit-workbench.css';

const BOOK = './docs/papers/Book%20-%20the-zero-point-universe.pdf';
/** PDF pages of chapter 19's figures. */
const FIG_19_2_PAGE = 145, FIG_19_3_PAGE = 147;

type Clock = MainThreadRuntime<BoundedClock, never, number>;

/** Each scenario's heading and explanation: the stage's chip line, and the About sheet. */
const EXPLANATIONS: Record<string, readonly [string, string]> = {
  slits: ['The field passes both slits and the photon arrives on time', 'Fleming’s photon is a sequence of central pairs, each lasting while the photon covers half a wavelength, with the zeptons around it turning to follow its field. A wall with two slits stands between A and B, the slits equidistant from the straight path. The field spreads sideways far faster than light, passes through both slits and induces the next central pair beyond the wall, so the photon reaches B in the same time as with nothing in the way.'],
  open: ['Nothing in the way: the reference time', 'With nothing between A and B the photon arrives in a time set by the distance and the speed of light. Each central pair turns through 180 degrees in the plane of the page; its field is extinguished with it, and the next pair’s field is reversed.'],
  'light-speed': ['Held to light speed, the field never reaches a slit', 'Fleming’s counterfactual. A central pair lasts for half a wavelength of travel, so a field spreading at the speed of light gets only half a wavelength to either side of the path before it is extinguished. It never reaches a slit, so the fields, and thus the photon, could never make it through. That light does pass two slits, and diffracts, is his evidence that fields spread much faster than light.'],
};

/** One of chapter 19's figures, linked to its page in the book. */
function SourceFigure({ figure, page, caption }: { figure: string; page: number; caption: string }) {
  return <figure className="slit-figure"><a href={`${BOOK}#page=${page}`} target="_blank" rel="noreferrer"><img src={`./docs/figures/double-slit/figure-${figure}.jpeg`} alt={`Fleming Figure ${figure}: ${caption}`} loading="lazy"/></a><figcaption><strong>Fig. {figure}</strong><span>{caption} PDF p. {page}.</span></figcaption></figure>;
}

/** The runtime's tick, for the parts that change every tick (so only they re-render while it runs). */
function useTick(runtime: Clock): number {
  const [tick, setTick] = useState(() => runtime.latest().tick);
  useEffect(() => { setTick(runtime.latest().tick); return runtime.subscribe(s => setTick(s.tick)); }, [runtime]);
  return tick;
}

/** Whether the runtime is running, and its tick whenever it is paused: what the address bar and files need. */
function usePaused(runtime: Clock): { running: boolean; tick: number } {
  const read = () => { const s = runtime.status(); return { running: s.running, tick: s.tick }; };
  const [state, setState] = useState(read);
  useEffect(() => runtime.subscribe(() => setState(old => {
    const next = read();
    // While it runs the tick is left alone, so the lab's shell re-renders on pause, not on every tick.
    if (next.running) return old.running ? old : { running: true, tick: old.tick };
    return old.running || old.tick !== next.tick ? next : old;
  })), [runtime]);
  return state;
}

/** The diagram and its state line. */
function Stage({ runtime, params, view }: { runtime: Clock; params: SlitParameters; view: SlitView }) {
  const tick = useTick(runtime);
  return <><div className="slit-diagram"><SlitDiagram params={params} tick={tick} layers={view}/></div><p className="slit-state" data-testid="slit-state">{stateLine(params, tick)}</p></>;
}

/** The status bar: run state, the scenario and the tick. */
function Status({ runtime, scenario }: { runtime: Clock; scenario: string }) {
  const tick = useTick(runtime), [running, setRunning] = useState(() => runtime.status().running);
  useEffect(() => runtime.subscribe(() => setRunning(runtime.status().running)), [runtime]);
  return <StatusBar running={running} telemetry={[SLIT_MODEL]} items={[scenario, <span data-testid="slit-tick">Tick {tick} · Δt = τ/60</span>]}/>;
}

/** The dock: the photon's readouts, the field plots, and the reach comparison that is Fleming's argument. */
function LiveDock({ runtime, params, collapsed, onCollapsedChange, tab, onTab }: { runtime: Clock; params: SlitParameters; collapsed: boolean; onCollapsedChange(collapsed: boolean): void; tab: string; onTab(tab: string): void }) {
  const tick = useTick(runtime), r = slitReadout(params, tick), walled = params.wall === 'slits';
  const photon = r.status === 'absorbed' ? 'Absorbed at B' : r.status === 'halted' ? 'Halted at the wall' : `${r.position.toFixed(2)} λ from A`;
  const readouts = [
    { label: 'Photon', value: photon, testId: 'slit-photon' },
    { label: 'Arrival at B', value: r.arrival === null ? 'Never' : `${r.arrival.toFixed(2)} τ`, testId: 'slit-arrival' },
    { label: 'Field at B', value: (r.atB.electric * 1000).toFixed(2), unit: '‰ of peak', testId: 'slit-field-b' },
    walled ? { label: 'Slit edge from path', value: innerEdge(params).toFixed(2), unit: 'λ', testId: 'slit-edge' } : { label: 'Path length', value: PATH_LENGTH.toFixed(2), unit: 'λ' },
  ];
  const reach = [
    { label: 'Straight path A to B', value: `${PATH_LENGTH.toFixed(2)} λ`, unit: `· ${PATH_LENGTH.toFixed(2)} τ at c` },
    ...(walled ? [
      { label: 'Route through a slit', value: `${routeViaSlit(params).toFixed(2)} λ`, unit: `· ${routeViaSlit(params).toFixed(2)} τ at c`, testId: 'slit-route' },
      { label: 'Nearest slit edge from the path', value: innerEdge(params).toFixed(2), unit: 'λ' },
    ] : []),
    { label: 'Reach of a field at light speed', value: LIGHT_REACH.toFixed(2), unit: 'λ' },
    ...(walled ? [{ label: 'Speed to reach a slit in one pair’s life', value: `≥ ${(innerEdge(params) / LIGHT_REACH).toFixed(1)}`, unit: 'c', testId: 'slit-speed' }] : []),
  ];
  return <Dock collapsed={collapsed} onCollapsedChange={onCollapsedChange} tab={tab} onTab={onTab} readouts={readouts} tabs={[
    { id: 'plots', label: 'Plots', content: <div className="slit-dock-plots"><div><h4>Field at B</h4><ArrivalPlot params={params} tick={tick}/></div>{walled && <div><h4>Field along the wall</h4><WallPlot params={params} tick={tick}/></div>}</div> },
    { id: 'reach', label: 'Reach', content: <div className="slit-dock-text"><h4>How far the field must spread</h4><Readouts items={reach}/>
      <p>{walled ? 'The photon arrives in the straight-line time although the only way past the wall is through the slits, off the straight path. A central pair lasts for half a wavelength of travel, so a field moving at c would spread half a wavelength before it was extinguished.' : 'With nothing in the way the arrival time is the distance over the speed of light. This is the time the wall and slits leave unchanged.'}</p>
      <p className="slit-note">Fleming gives no figure for the speed of fields beyond “much faster than the speed of light”; the last row is only what reaching the slit edge within one pair’s life requires.</p></div> },
  ]}/>;
}

/** Props for DoubleSlitWorkbench. */
export interface DoubleSlitWorkbenchProps {
  active: boolean;
  rail: ReactNode;
  header: Pick<HeaderProps, 'experiment'>;
  scenarioRequest?: ScenarioRequest | null;
  onScenarioChange?(id: string): void;
}

/**
 * The double-slit laboratory in the workbench: Fleming's Fig. 19-3 as three rail scenarios (two slits, an open path,
 * and fields held to light speed), a bounded 0–8 τ timeline on a main-thread clock, live slit geometry, the photon's
 * readouts, field plots and the reach comparison in the dock, and the source figure in a split pane.
 */
export function DoubleSlitWorkbench({ active, rail, header, scenarioRequest, onScenarioChange }: DoubleSlitWorkbenchProps) {
  const eventTicks = useRef<readonly number[]>([]);
  const runtime = useMemo<Clock>(() => new MainThreadRuntime(boundedClockModel(SLIT_DT, SLIT_END_TICK, () => eventTicks.current)), []);
  useEffect(() => { const detach = runtime.attach(); return () => { detach(); runtime.run(false); }; }, [runtime]);
  const [scenario, setScenario] = useState('slits');
  const [params, setParams] = useState<SlitParameters>(() => scenarioState(doubleSlitDefinition, 'slits').params);
  const [view, setView] = useState<SlitView>(() => scenarioState(doubleSlitDefinition, 'slits').view);
  const [tab, setTab] = useState<InspectorTab>('setup'), [dockTab, setDockTab] = useState('plots'), [dockCollapsed, setDockCollapsed] = useState(dockStartsCollapsed);
  const [split, setSplit] = useState(false);
  const about = useAbout();
  const fileInput = useRef<HTMLInputElement>(null);
  const paused = usePaused(runtime);
  const current = doubleSlitDefinition.scenarios.find(s => s.id === scenario)!;
  const timeline = doubleSlitDefinition.timeline(scenario, params);
  eventTicks.current = timeline.events.map(e => e.tick);
  useEffect(() => { if (!active) runtime.run(false); }, [active, runtime]);
  useEffect(() => { onScenarioChange?.(scenario); }, [scenario, onScenarioChange]);
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);

  /** Start a scenario from the beginning, keeping the slit geometry unless told to take the scenario's own. */
  const start = (id: string, keepGeometry: boolean) => {
    const next = scenarioState(doubleSlitDefinition, id);
    runtime.reset(); setScenario(id); setView(next.view);
    setParams(old => (keepGeometry ? { ...next.params, slitOffset: old.slitOffset, slitWidth: old.slitWidth } : next.params));
  };
  // The rail starts a scenario with the current slits; a link also sets its geometry, layers, split and tick.
  useEffect(() => {
    if (!scenarioRequest) return;
    const { id, url, dropped } = scenarioRequest;
    start(id, !url);
    if (url) {
      const from = scenarioState(doubleSlitDefinition, id);
      setParams(withPaths(from.params, url.params)); setView(withPaths(from.view, url.view));
      if (url.split) setSplit(url.split !== 'off');
      if (Number.isInteger(url.tick)) runtime.seek(Math.min(SLIT_END_TICK, Math.max(0, url.tick!)));
    }
    if (dropped?.length) setNotice(`Ignored link settings that don’t apply: ${dropped.join(', ')}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a request is applied once, when it arrives
  }, [scenarioRequest]);
  // The address bar follows this lab while it is paused (plan §11).
  const urlHash = encodeUrl(routeFor(doubleSlitDefinition, scenario, params, view, { split: split ? 'fig-19-3' : undefined, tick: paused.tick || undefined }));
  useUrlWriter(active, paused.running, urlHash);

  /** Save the scenario, slits, layers and tick. */
  const save = () => { const tick = runtime.status().tick; downloadFile(`zeropoint-double-slit-${scenario}-tick-${tick}.json`, JSON.stringify(slitFile(scenario, params, view, tick)), 'application/json'); setNotice(`Saved “${current.title}” at tick ${tick}.`); };
  /** Load a saved experiment, validating every field. Playback stays paused. */
  async function load(file: File) {
    try {
      if (file.size > 20_000) throw new Error('Double-slit files must be smaller than 20 KB.');
      const saved = parseSlitFile(await file.text());
      runtime.seek(saved.tick); setScenario(saved.scenario); setParams(saved.params); setView(saved.view);
      setNotice(`Loaded “${doubleSlitDefinition.scenarios.find(s => s.id === saved.scenario)!.title}” at tick ${saved.tick}. Playback is paused.`);
    } catch (error) { setNotice(`Could not load: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const exportItems: ExportItem[] = [{ id: 'csv', label: 'CSV (the whole run)', onSelect: () => downloadFile(`double-slit-${scenario}.csv`, slitCsv(params), 'text/csv') }];

  // Every shortcut is an action (plan §11): the Help sheet lists them and one listener runs them.
  const onView = (key: string, value: unknown) => setView(old => withPaths(old, { [key]: value }));
  const actions: Action[] = [
    ...transportActions(runtime, timeline, SPEEDS),
    { id: 'view.layers', label: 'Open View › Layers', group: 'View', keys: ['l'], run: () => setTab('view') }, SPLIT_SHORTCUT,
    ...fileShortcuts(save, fileInput),
    ...PANEL_SHORTCUTS,
    copyLinkAction(urlHash, setNotice),
    ...layerActions(doubleSlitDefinition, scenario, view, onView),
    ...parameterActions(doubleSlitDefinition, scenario, () => setTab('setup')),
    ...exportActions(exportItems, false),
    ...helpActions(about.show),
  ];
  useActions(active && !about.open, actions);

  const [heading, explanation] = EXPLANATIONS[scenario];
  const headerNode = <Header experiment={header.experiment} scenario={current.title} onChip={() => about.show('scenario')} onHelp={() => about.show()}
    actions={<FileActions inputRef={fileInput} onFile={load} onSave={save} exports={exportItems}/>}/>;

  const viewportNode = (
    <section className="slit-stage" aria-label={current.title}>
      <div className="slit-heading"><span>ONE PHOTON, A TO B<b>{heading}</b></span><a href={`${BOOK}#page=${FIG_19_3_PAGE}`} target="_blank" rel="noreferrer">After Fig. 19-3</a></div>
      <Stage runtime={runtime} params={params} view={view}/>
      <div className="slit-legend"><span><i className="slit-positive"/>Positive charge</span><span><i className="slit-negative"/>Negative charge</span><span><i className="slit-turned"/>Zepton turned by the field</span><span><i className="slit-mark"/>Photon’s place · reach at light speed</span><small>The page is the plane of zepton rotation · not to scale</small></div>
    </section>
  );

  const aboutNode = (
    <AboutSheet {...about} shortcuts={actions} onOpenChange={about.setOpen} onSection={about.setSection} active={active} experiment={header.experiment} scenario={current.title} sections={[
      { id: 'scenario', content: <div className="slit-about"><h3>{heading}</h3><p>{explanation}</p>
        <h3>What is drawn</h3>
        <p>The page is the plane the zeptons rotate in, as in Figure 19-3: the electric field alternates left and right and the magnetic field points in and out of the page. The central pairs keep to the straight line from A to B. The surrounding zeptons turn toward the active pair’s orientation wherever its field reaches them, and relax when it is extinguished at each hand-off.</p>
        <h3>What Fleming leaves open</h3>
        <p>Fleming gives the figure, the equal arrival time and the half-wavelength argument. He does not say how the next central pair is re-established beyond the wall, how the field divides between the two slits, or what pattern a screen would record. Here the pairs keep to the straight path, which the equal arrival time requires; the field beyond the wall takes the shortest route through each slit, with the two slits carrying half each. Those two rules are this model’s construction, and no interference pattern is drawn.</p></div> },
      { id: 'units', content: <div className="slit-about"><h3>Units</h3><p>Lengths are in photon wavelengths λ and times in periods τ = λ/c, the terms Fleming’s argument is made in, so the photon moves one λ per τ. A central pair lasts half a period, τ/2, and opens to its own wavelength, λ/2.</p>
        <h3>Display choices</h3><p>The path is 8 λ with the wall halfway; Fleming gives no distances, and his own figure is far larger measured in wavelengths. The field falls with the inverse square of distance and is softened inside a quarter-wavelength. The turn of the surrounding zeptons is magnified, by the fourth root of the field strength, so the far field shows. Field values are normalized to the peak beside the pair.</p></div> },
      { id: 'sources', content: <div className="slit-about"><div className="about-links"><a href={`${BOOK}#page=142`} target="_blank" rel="noreferrer"><BookOpen size={14}/> Chapter 19 ↗</a><a href="./docs/double-slit-model.md" target="_blank" rel="noreferrer">Model notes ↗</a></div>
        <p>Figures extracted from Ray Fleming’s <em>The Zero-Point Universe</em>, chapter 19, “The Speed of the Zero-Point Universe”. Page numbers are PDF page positions. The interactive diagram is an adaptation.</p>
        <div className="slit-source-grid"><SourceFigure figure="19-2" page={FIG_19_2_PAGE} caption="A photon’s central zepton, surrounded by zeptons oriented and rotating with its fields."/><SourceFigure figure="19-3" page={FIG_19_3_PAGE} caption="A photon moving from A to B past two slits, polarized in the plane of the page."/></div></div> },
    ]}/>
  );

  const inspectorNode = (
    <Inspector tab={tab} onTab={setTab} selection={<p className="inspector-empty">This diagram has nothing to select.</p>}
      setup={<SetupPanel definition={doubleSlitDefinition} scenario={scenario} params={params} onLive={(k, v) => setParams(p => withPaths(p, { [k]: v }))} onApply={() => undefined} onReset={() => start(scenario, false)}/>}
      view={<ViewPanel definition={doubleSlitDefinition} scenario={scenario} view={view} onView={onView} onReset={() => setView(scenarioState(doubleSlitDefinition, scenario).view)}/>}/>
  );

  return (
    <div className="slit-workbench-root" style={{ display: active ? undefined : 'none' }}>
      <Shell active={active} id="double-slit" header={headerNode} rail={rail} inspector={inspectorNode}
        viewport={<SplitView active={active} primary={viewportNode} split={split} onSplit={setSplit} pane="fig-19-3" onPane={() => undefined}
          panes={[{ id: 'fig-19-3', label: 'Fig. 19-3', content: <div className="slit-figure-pane"><SourceFigure figure="19-3" page={FIG_19_3_PAGE} caption="A photon moving from A to B past two slits, polarized in the plane of the page."/></div> }]}/>}
        timeline={<TimelineBar runtime={runtime} timeline={timeline} speeds={SPEEDS}/>}
        dock={<LiveDock runtime={runtime} params={params} collapsed={dockCollapsed} onCollapsedChange={setDockCollapsed} tab={dockTab} onTab={setDockTab}/>}
        status={<Status runtime={runtime} scenario={current.title}/>}/>
      {notice && <div className="toast" role="status" data-testid="notice"><Info size={15}/><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14}/></button></div>}
      {aboutNode}
    </div>
  );
}
