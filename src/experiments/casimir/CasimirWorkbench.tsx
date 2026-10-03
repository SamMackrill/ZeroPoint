import { ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { extent, lifeStage, phase, type CasimirModel, type Zepton } from '../../casimir/model';
import { Scene, type SceneLayers } from '../../casimir/Scene';
import { palette } from '../../ui/palette';
import { Plot } from '../../ui/Plot';
import { Segmented } from '../../ui/Segmented';
import { Header, StatusBar, type HeaderProps } from '../../workbench/Chrome';
import { withPaths } from '../../workbench/definition';
import { Dock } from '../../workbench/Dock';
import { Inspector, SetupPanel, ViewPanel, type InspectorTab } from '../../workbench/Inspector';
import { CASIMIR_SPEEDS, casimirModel, type CasimirConfig } from '../../workbench/main-thread-models';
import { MainThreadRuntime } from '../../workbench/main-thread-runtime';
import { Shell } from '../../workbench/Shell';
import { TimelineBar, transportActions } from '../../workbench/TimelineBar';
import { APPLY_SHORTCUT, layerActions, PANEL_SHORTCUTS, parameterActions, SELECTION_SHORTCUTS, SPLIT_SHORTCUT, useActions, type Action } from '../../workbench/actions';
import { casimirDefinition, type CasimirParams } from './definition';
import '../../casimir/casimir.css';
import './casimir-workbench.css';
import { useSelectionKeys } from '../../workbench/selection';
import { SplitView } from '../../workbench/SplitView';
import { InfoTip } from '../../ui/InfoTip';
import { AboutSheet, helpActions, useAbout } from '../../workbench/AboutSheet';

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
      <circle cx="150" cy="70" r="55" fill="none" stroke={palette.line2} strokeDasharray="3 5" />
      {!expired && <g>
        <line x1={150 - dx} y1={70 - dy} x2={150 + dx} y2={70 + dy} stroke={palette.text2} />
        <circle cx={150 - dx} cy={70 - dy} r="13" fill={palette.line2} stroke={palette.dataNeg} />
        <circle cx={150 + dx} cy={70 + dy} r="13" fill={palette.warnLine} stroke={palette.dataPosHi} />
        <text x={150 - dx} y={75 - dy} textAnchor="middle" fill={palette.dataNegHi} fontSize="17">−</text>
        <text x={150 + dx} y={75 + dy} textAnchor="middle" fill={palette.dataPosHi} fontSize="17">+</text>
      </g>}
      {expired && <text x="150" y="76" textAnchor="middle" fill={palette.text2} fontSize="13">Lifetime complete</text>}
      <text x="150" y="141" textAnchor="middle" fill={palette.text3} fontSize="10">{f < .5 ? 'Lobes separate as the pair grows' : 'Lobes return inward as the pair collapses'}</text>
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

/** Props for CasimirWorkbench. */
export interface CasimirWorkbenchProps {
  active: boolean;
  rail: ReactNode;
  header: Pick<HeaderProps, 'experiment'>;
  scenarioRequest?: { id: string; at: number } | null;
  onScenarioChange?(id: string): void;
}

/**
 * The extended Casimir laboratory in the workbench (UI 10): the 2D charge-interaction scene on the main thread, driven
 * by MainThreadRuntime (fixed steps, 0.1–2× speed, hidden-tab pause); the two pairings as rail scenarios; the initial
 * separation as a ↻ parameter and Held / Released as a live control; pressure readouts, plots, events and notes in the
 * dock; the lifetime loupe in a 2-up split pane (or Selection, when 1-up). The model is unchanged.
 */
export function CasimirWorkbench({ active, rail, header, scenarioRequest, onScenarioChange }: CasimirWorkbenchProps) {
  const runtime = useMemo(() => new MainThreadRuntime(casimirModel()), []);
  // The hidden-tab pause is attached by an effect, so StrictMode's repeated effects re-attach it; unmounting pauses.
  useEffect(() => { const detach = runtime.attach(); return () => { detach(); runtime.run(false); }; }, [runtime]);
  // The scene redraws from the live model; each published step bumps this revision (as the lab's own loop did).
  const [revision, setRevision] = useState(0);
  useEffect(() => runtime.subscribe(() => setRevision(r => r + 1)), [runtime]);
  const model: CasimirModel = runtime.latest();
  const [params, setParams] = useState<CasimirParams>(casimirDefinition.defaultParams);
  const [view, setView] = useState<SceneLayers>(casimirDefinition.defaultView);
  const [selected, setSelected] = useState<number | null>(null), [follow, setFollow] = useState(true);
  const about = useAbout();
  // Casimir opens 2-up with the lifetime loupe beside the scene; 1-up moves the loupe back into the Selection tab.
  const [split, setSplit] = useState(true);
  const lastSelected = useRef<Zepton | null>(null);
  const [tab, setTab] = useState<InspectorTab>('setup'), [dockTab, setDockTab] = useState('plots'), [dockCollapsed, setDockCollapsed] = useState(false);
  const scenario = params.pair;
  const refresh = () => setRevision(r => r + 1);
  useEffect(() => { if (!active) runtime.run(false); }, [active, runtime]);
  useEffect(() => { onScenarioChange?.(scenario); }, [scenario, onScenarioChange]);

  /** Restart for a pairing and separation, clearing the selection. */
  function restart(next: CasimirParams) { runtime.configure(next as CasimirConfig); setParams(next); setSelected(null); lastSelected.current = null; }
  const restartRef = useRef(restart); restartRef.current = restart;
  const paramsRef = useRef(params); paramsRef.current = params;
  useEffect(() => { if (scenarioRequest) restartRef.current({ ...paramsRef.current, pair: scenarioRequest.id as CasimirParams['pair'] }); }, [scenarioRequest]);

  let inspected = model.particles.find(p => p.id === selected);
  if (follow && !inspected) inspected = [...model.particles].reverse().find(p => scenario === 'electron-electron' ? p.gap : model.bridge(p)) ?? model.particles.find(p => model.bridge(p));
  useEffect(() => {
    if (inspected) { lastSelected.current = { ...inspected }; if (follow && selected !== inspected.id) setSelected(inspected.id); }
  }, [revision, inspected, follow, selected]);
  const displayed = inspected ?? lastSelected.current;
  // Esc unpins: the loupe goes back to following new births.
  const unpin = useCallback(() => { setSelected(null); lastSelected.current = null; setFollow(true); }, []);
  useSelectionKeys({ active, hasSelection: !follow, onClear: unpin });
  const like = scenario === 'electron-electron';
  const tendency = Math.abs(model.delta) < .002 ? 'Building pressure' : model.delta > 0 ? 'Apart' : 'Together';
  const start = model.history[0]?.time ?? 0, end = model.history.at(-1)?.time ?? 0;
  const running = runtime.status().running;
  /** Pin a Zepton (stops following new births). */
  const pin = (p: Zepton) => { setSelected(p.id); lastSelected.current = { ...p }; setFollow(false); setTab('selection'); };

  /** Pin the newest Zepton that bridges the charges (Selection's Inspect newest, and the palette). */
  const inspectNewest = () => { const p = [...model.particles].reverse().find(p => model.bridge(p)); if (p) pin(p); };
  // Every shortcut is an action (plan §11): the Help sheet lists them and one listener runs them.
  const actions: Action[] = [
    ...transportActions(runtime, casimirDefinition.timeline(scenario, params), CASIMIR_SPEEDS),
    { id: 'view.layers', label: 'Open View › Layers', group: 'View', keys: ['l'], run: () => setTab('view') },
    SELECTION_SHORTCUTS.clear, APPLY_SHORTCUT, SPLIT_SHORTCUT, ...PANEL_SHORTCUTS,
    ...layerActions(casimirDefinition, scenario, view, (k, v) => setView(old => withPaths(old, { [k]: v }))),
    ...parameterActions(casimirDefinition, scenario, () => setTab('setup')),
    { id: 'selection.newest', label: 'Inspect newest Zepton', group: 'Selection', run: inspectNewest },
    ...helpActions(about.show),
  ];
  useActions(active && !about.open, actions);

  const headerNode = <Header experiment={header.experiment} scenario={casimirDefinition.scenarios.find(s => s.id === scenario)?.title}
    onChip={() => about.show('scenario')} onHelp={() => about.show()}/>;

  const viewportNode = (
    <section className="casimir-scene casimir-stage" aria-label="Charge interaction visualization">
      <div className="casimir-scene-top"><span><i className={`dot ${running ? '' : 'paused'}`}/>{running ? 'LIVE FIELD' : 'PAUSED'} <b data-testid="casimir-time">{model.time.toFixed(2)} τ</b></span><span className="casimir-pair-symbol">e⁻ <ArrowLeftRight size={14}/> {like ? 'e⁻' : 'p⁺'} · 2D section · expanded time</span></div>
      <Scene model={model} revision={revision} layers={view} selected={inspected?.id ?? null} onSelect={pin}/>
      <div className="casimir-scene-caption"><strong>{like ? 'Random births at the meeting point push outwards' : 'Collapsing chains lower the pressure between charges'}</strong><span>Orange + / blue − lobes · mint rings: births · yellow arrows: net push</span></div>
      <div className="casimir-legend casimir-overlay-legend"><span>LOCAL PRESSURE / P₀</span><div><i/><div><span>0.55 · lower</span><span>1 · ambient</span><span>1.45 · higher</span></div></div><small>Colour saturates at the scale endpoints</small></div>
      {model.boundaryReached && <p role="status" className="casimir-limit casimir-overlay-limit">Observation limit reached. Reset to repeat the motion.</p>}
    </section>
  );

  const dockNode = (
    <Dock collapsed={dockCollapsed} onCollapsedChange={setDockCollapsed} tab={dockTab} onTab={setDockTab}
      readouts={[
        { label: 'Between charges', value: model.inner.toFixed(3), unit: 'P₀', testId: 'inner-pressure' },
        { label: 'Outer medium', value: model.outer.toFixed(3), unit: 'P₀' },
        { label: 'Inner − outer', value: signed(model.delta), unit: 'P₀', testId: 'pressure-difference' },
        { label: 'Net push', value: tendency, testId: 'motion-tendency' },
      ]}
      tabs={[
        { id: 'plots', label: 'Plots', content: <div className="casimir-dock-plot"><h4>Pressure builds from fleeting interactions</h4><Plot label="Inner and outer pressure history in units of ambient pressure P zero" x={model.history.map(p => p.time)} series={[{ key: 'inner', label: 'Inner', color: palette.dataShell1, values: model.history.map(p => p.inner) }, { key: 'outer', label: 'Outer', color: palette.dataShell2, values: model.history.map(p => p.outer) }]} xUnit="τ" yUnit="P₀" xDomain={[start, Math.max(end, start + 1)]} yDomain={[0.55, 1.45]} yTicks={[0.55, 1, 1.45]} reference={1} formatX={v => v.toFixed(1)} formatY={v => v.toFixed(2)} caption="Gap average along the axis · outer probes beyond each charge" height={80} testId="casimir-pressure-plot"/></div> },
        { id: 'events', label: 'Events', content: <div className="casimir-events casimir-dock-events"><div className="casimir-counts"><span><b>{model.particles.length}</b> alive</span><span><b>{model.births}</b> born</span><span><b>{model.deaths}</b> ended</span></div><p className="casimir-muted">{like ? `${model.gapBirths} extra gap births since reset` : 'Birth, expansion and contraction overlap in time'}</p><ol>{model.events.map(e => <li key={e.id}><time>{e.time.toFixed(2)} τ</time>{e.text}</li>)}</ol>{!model.events.length && <p className="casimir-muted">Run or step to see interactions.</p>}</div> },
      ]}/>
  );

  const selectionNode = (
    <div className="casimir-selection">
      {!split && <Lifetime particle={displayed} expired={!inspected}/>}
      <div className="casimir-inspect-actions">
        <button onClick={inspectNewest}>Inspect newest Zepton</button>
        <label><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)}/> Follow next birth after annihilation</label>
      </div>
    </div>
  );

  const inspectorNode = (
    <Inspector tab={tab} onTab={setTab} selection={selectionNode}
      setup={<SetupPanel definition={casimirDefinition} scenario={scenario} params={params} onLive={() => undefined} onApply={changes => restart(withPaths(params, changes))} onReset={() => restart(casimirDefinition.defaultParams.pair === scenario ? casimirDefinition.defaultParams : { ...casimirDefinition.defaultParams, pair: scenario })}>
        <section className="inspector-group" aria-label="From pressure to motion">
          <header className="inspector-group-head"><h3>From pressure to motion</h3></header>
          <div className="inspector-choice"><span className="inspector-choice-label">Charges<InfoTip label="Charges" testId="info-charges">{model.released ? 'Charges respond to the measured pressure difference.' : 'Charges are held so you can watch the surrounding field.'} {like ? 'Equal masses respond equally.' : 'The proton responds 1/1836 as much as the electron.'} Illustrative acceleration; run playback to move.</InfoTip></span>
            <Segmented label="Charges" testId="charges" options={[{ value: 'held', label: 'Held' }, { value: 'released', label: 'Released', disabled: model.boundaryReached }]} value={model.released ? 'released' : 'held'}
              onChange={v => { if (v === 'held') model.hold(); else model.released = true; refresh(); }}/></div>
        </section>
      </SetupPanel>}
      view={<ViewPanel definition={casimirDefinition} scenario={scenario} view={view} onView={(k, v) => setView(old => withPaths(old, { [k]: v }))}/>}/>
  );

  const aboutNode = (
    <AboutSheet {...about} shortcuts={actions} onOpenChange={about.setOpen} onSection={about.setSection} active={active} experiment={header.experiment} scenario={casimirDefinition.scenarios.find(s => s.id === scenario)?.title} sections={[
      { id: 'scenario', content: <div className="casimir-about">
          <p>This experiment animates Fleming’s proposed mechanism in Section 4, Figures 3–4. Pressure kernels, lifetimes and motion gain are illustrative choices; this is not a validated derivation of electrostatic force. Section 5 leaves the quantitative force law unresolved. τ is an expanded observation clock, not seconds. Dipole sizes and spacing are exaggerated.</p>
          <section className="casimir-explanation" aria-label="Mechanism sequence">{(like ? [
            ['01', 'Born, then aligned', 'Dipoles continually appear with random orientations and turn in the field of each electron.'],
            ['02', 'Deflect, then refill', 'Opposing alignments deflect near the middle. Fresh dipoles fill gaps and expand against neighbours.'],
            ['03', 'A greater inner push', 'Repeated gap births sustain higher local pressure, producing an outward motion tendency.'],
          ] : [
            ['01', 'A connected alignment', 'Between opposite charges, dipoles orient in a continuous chain.'],
            ['02', 'Grow, then contract', 'New pairs push back as they grow. During collapse, adjacent pairs shift inward toward the voids.'],
            ['03', 'A greater outer push', 'Contraction outweighs growth in this illustration. Higher outer pressure pushes the charges together.'],
          ]).map(([n, title, text]) => <div key={n}><span>{n}</span><h2>{title}</h2><p>{text}</p></div>)}</section>
          <p>{like ? 'A weak or neutral midpoint leaves new dipoles disordered. Neighbouring dipoles turn toward their local field.' : 'Each new pair first expands and pushes back, then contracts. Dashed links show neighbouring pairs moving inward.'}</p>
          <h3>From pressure to motion</h3>
          <ul><li>Held · Charges are held so you can watch the surrounding field.</li><li>Released · Charges respond to the measured pressure difference. {like ? 'Equal masses respond equally.' : 'The proton responds 1/1836 as much as the electron.'}</li></ul>
          <p>Illustrative acceleration · run playback to move</p>
          <p className="casimir-muted">Fleming’s proposed mechanism · qualitative pressure, arbitrary spatial units. Extended Casimir effect · short-lived Zeptons and local van der Waals pressure.</p>
        </div> },
      { id: 'sources', content: <div className="about-links"><a href="./docs/casimir-model.md" target="_blank" rel="noreferrer">Model and source notes ↗</a><a href={paper} target="_blank" rel="noreferrer">Read Section 4 ↗</a><a href={paper} target="_blank" rel="noreferrer">Section 4 · Figures 3 & 4 ↗</a></div> },
    ]}/>
  );

  const timeline = casimirDefinition.timeline(scenario, params);
  const timelineNode = <TimelineBar runtime={runtime} timeline={timeline} speeds={CASIMIR_SPEEDS}/>;

  return (
    <div className="casimir-workbench-root" style={{ display: active ? undefined : 'none' }}>
      <Shell id="casimir" header={headerNode} rail={rail} viewport={<SplitView active={active} primary={viewportNode} panes={[{ id: 'loupe', label: 'Lifetime loupe', content: <div className="casimir-loupe-pane"><Lifetime particle={displayed} expired={!inspected}/></div> }]} split={split} onSplit={setSplit} pane="loupe" onPane={() => undefined}/>} timeline={timelineNode} dock={dockNode} inspector={inspectorNode}
        status={<StatusBar running={running} items={[`Separation ${params.separation.toFixed(1)} a.u.`, `${model.particles.length} Zeptons`, 'Qualitative pressure · arbitrary spatial units']}/>}/>
      {aboutNode}
    </div>
  );
}
