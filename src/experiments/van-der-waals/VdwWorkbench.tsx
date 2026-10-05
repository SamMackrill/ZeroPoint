import { BookOpen } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';
import { downloadFile } from '../../persistence/experiment';
import { BOOK, InductionDiagram, number, PairDiagram, PlateDiagram, PressurePlot, stages } from '../../van-der-waals/diagrams';
import { casimir, london, pressureCSV } from '../../van-der-waals/model';
import { parseVdwFile, vdwFile } from './file';
import { FileActions, fileShortcuts, Header, StatusBar, type HeaderProps } from '../../workbench/Chrome';
import { withPaths } from '../../workbench/definition';
import { Dock } from '../../workbench/Dock';
import { Inspector, SetupPanel, ViewPanel, type InspectorTab } from '../../workbench/Inspector';
import { dipoleClockModel, type DipoleClock } from '../../workbench/main-thread-models';
import { MainThreadRuntime } from '../../workbench/main-thread-runtime';
import { SPEEDS } from '../../workbench/runtime';
import { Shell } from '../../workbench/Shell';
import { SplitView } from '../../workbench/SplitView';
import { AboutSheet, useAbout } from '../../workbench/AboutSheet';
import { TimelineBar, transportActions } from '../../workbench/TimelineBar';
import { PANEL_SHORTCUTS, SPLIT_SHORTCUT, useActions, type Action } from '../../workbench/actions';
import { vanDerWaalsDefinition, type VdwParams, type VdwView } from './definition';
import '../../van-der-waals/van-der-waals.css';
import './vdw-workbench.css';

/** Each stage's heading and explanation, shown under its diagram. */
const EXPLANATIONS = [
  ['Neutral does not mean unresponsive', 'An electric field shifts an atom’s negative charge cloud relative to its positive centre. Its total charge remains zero, but it now has a dipole moment. Move the field slider to see this induced response, following Figure 3-2.'],
  ['Zero mean dipoles can still attract', 'A fluctuating dipole couples to its neighbour. Their correlated fluctuations lower the pair’s interaction energy, producing London dispersion attraction. Run the schematic to see both moments reverse while the mean attraction remains inward. Fleming extends this dipole picture to the zero-point field.'],
  ['The difference is the pressure', 'In Fleming’s picture, the surrounding fluctuations press on both faces of each plate. Boundaries change the field between them, leaving a small inward imbalance. The standard calculation obtains this force per area from the change in the field–plate interaction energy as the gap changes.'],
] as const;

/** Chapter 3's embedded figures: title, caption and PDF page. */
const SOURCE_FIGURES = [
  ['Dipole orientations', 'Opposed and aligned dipoles, with changes in electric moment.', 28],
  ['Induced polarization', 'A neutral hydrogen atom and its polarized charge distribution.', 28],
  ['A cavity in the field', 'Fleming’s schematic of fluctuations outside and between plates.', 29],
  ['A pressure imbalance', 'Nearly balanced opposing stresses leave a net inward force.', 30],
] as const;

/** One of Fleming's Chapter 3 figures, linked to its page in the book. */
function SourceFigure({ index }: { index: number }) {
  const [title, caption, page] = SOURCE_FIGURES[index];
  return <figure><a href={`${BOOK}#page=${page}`} target="_blank" rel="noreferrer"><img src={`./docs/figures/van-der-waals/figure-3-${index + 1}.jpeg`} alt={`Fleming Figure 3-${index + 1}: ${caption}`} loading="lazy"/></a><figcaption><strong>Fig. 3-{index + 1} · {title}</strong><span>{caption} PDF p. {page}.</span></figcaption></figure>;
}

/** The correlated-dipole diagram and its phase, the only parts that change each clock tick (so only they re-render). */
function PairStage({ runtime, distance }: { runtime: MainThreadRuntime<DipoleClock>; distance: number }) {
  const [tick, setTick] = useState(() => runtime.latest().tick);
  useEffect(() => runtime.subscribe(s => setTick(s.tick)), [runtime]);
  return <><PairDiagram distance={distance} tick={tick}/><p className="vdw-phase" data-testid="vdw-phase">Phase {(tick * 3).toFixed(0)}° · illustrative clock</p></>;
}

/** The status bar's run state: it re-renders only when playback starts or stops, not on every clock tick. */
function VdwStatus({ runtime, stage }: { runtime: MainThreadRuntime<DipoleClock>; stage: string }) {
  const [running, setRunning] = useState(() => runtime.status().running);
  useEffect(() => runtime.subscribe(() => setRunning(runtime.status().running)), [runtime]);
  return <StatusBar running={running} items={[stage, 'Illustrative experiment · ideal analytic reference']}/>;
}

/** Props for VdwWorkbench. */
export interface VdwWorkbenchProps {
  active: boolean;
  rail: ReactNode;
  header: Pick<HeaderProps, 'experiment'>;
  scenarioRequest?: { id: string; at: number } | null;
  onScenarioChange?(id: string): void;
}

/**
 * The van der Waals laboratory in the workbench (UI 11): three stages as rail scenarios. Induce a dipole and Reveal the
 * pressure are static studies; Correlate the fluctuations runs a 120-tick looping dipole clock through
 * MainThreadRuntime. Parameters are live and stage-filtered in Setup (the gap with quick values); readouts sit in the
 * dock strip, with the pressure sweep, the stress derivation and Chapter 3's sources and figures in dock tabs.
 */
export function VdwWorkbench({ active, rail, header, scenarioRequest, onScenarioChange }: VdwWorkbenchProps) {
  const runtime = useMemo(() => new MainThreadRuntime(dipoleClockModel()), []);
  useEffect(() => { const detach = runtime.attach(); return () => { detach(); runtime.run(false); }; }, [runtime]);
  const [scenario, setScenario] = useState('induced');
  const [params, setParams] = useState<VdwParams>(vanDerWaalsDefinition.defaultParams);
  const [view, setView] = useState<VdwView>(vanDerWaalsDefinition.defaultView);
  const [tab, setTab] = useState<InspectorTab>('setup'), [dockTab, setDockTab] = useState('plots'), [dockCollapsed, setDockCollapsed] = useState(false);
  // Plate pressure can set Fleming's Figure 3-3 or 3-4 beside the diagram for comparison; it opens 1-up.
  const [split, setSplit] = useState(false), [figure, setFigure] = useState('fig-3-3');
  const about = useAbout();
  const fileInput = useRef<HTMLInputElement>(null);
  const stage = stages.findIndex(s => s.id === scenario), current = stages[stage];
  useEffect(() => { if (!active || scenario !== 'correlated') runtime.run(false); }, [active, scenario, runtime]);
  useEffect(() => { onScenarioChange?.(scenario); }, [scenario, onScenarioChange]);
  useEffect(() => { if (scenarioRequest) { setScenario(scenarioRequest.id); if (scenarioRequest.id === 'pressure') setDockTab('plots'); } }, [scenarioRequest]);

  const reference = casimir(params.gap, params.area), pair = london(params.distance);
  /** Restore the stage's starting parameters (and the dipole clock). */
  const resetScenario = () => { setParams(vanDerWaalsDefinition.defaultParams); setView(vanDerWaalsDefinition.defaultView); runtime.reset(); };
  const exportCsv = () => downloadFile('van-der-waals-pressure-sweep.csv', pressureCSV(params.area), 'text/csv');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  /** Save the stage, parameters, layers and dipole-clock tick. */
  const save = () => { downloadFile(`zeropoint-vdw-${scenario}.json`, JSON.stringify(vdwFile(scenario, params, view, runtime.latest().tick)), 'application/json'); setNotice(`Saved the ${current.title.toLowerCase()} stage.`); };
  /** Load a saved stage, validating every field. */
  async function load(file: File) {
    try {
      if (file.size > 20_000) throw new Error('Van der Waals files must be smaller than 20 KB.');
      const saved = parseVdwFile(await file.text());
      runtime.run(false); runtime.reset(); for (let i = 0; i < saved.tick; i++) runtime.step();
      setScenario(saved.scenario); setParams(saved.params); setView(saved.view); setNotice(`Loaded the ${stages.find(s => s.id === saved.scenario)!.title.toLowerCase()} stage.`);
    } catch (error) { setNotice(`Could not load: ${error instanceof Error ? error.message : String(error)}`); }
  }

  // Every shortcut is an action (plan §11): the Help sheet lists them and one listener runs them. Only the correlated
  // stage has a timeline; the others are static.
  const timeline = vanDerWaalsDefinition.timeline(scenario, params);
  const actions: Action[] = [
    ...transportActions(runtime, timeline, SPEEDS),
    ...(stage === 2 ? [{ id: 'view.layers', label: 'Open View › Layers', group: 'View' as const, keys: ['l'], run: () => setTab('view') }, SPLIT_SHORTCUT] : []),
    ...fileShortcuts(save, fileInput),
    ...PANEL_SHORTCUTS,
  ];
  useActions(active && !about.open, actions);

  const headerNode = <Header experiment={header.experiment} scenario={current.title} onChip={() => about.show('scenario')} onHelp={() => about.show()}
    actions={<FileActions inputRef={fileInput} onFile={load} onSave={save} exports={[{ id: 'csv', label: 'CSV (pressure sweep)', onSelect: exportCsv }]}/>}/>;

  const viewportNode = (
    <section className="vdw-scene-card vdw-stage" aria-label={current.title}>
      <div className="vdw-card-heading"><span>{stage === 2 ? 'BOUNDARIES → STRESS DIFFERENCE' : 'CHARGE RESPONSE → CORRELATION'}<b>{EXPLANATIONS[stage][0]}</b></span><a href={`${BOOK}#page=${current.page}`} target="_blank" rel="noreferrer">After Fig. {current.figure}</a></div>
      <div className="vdw-diagram">{stage === 0 ? <InductionDiagram polarization={params.polarization}/> : stage === 1 ? <PairStage runtime={runtime} distance={params.distance}/> : <PlateDiagram gap={params.gap} modes={view.modes}/>}</div>
      <div className="vdw-legend">{stage === 2 ? <span><i className="vdw-negative"/>Opposing field stresses</span> : <><span><i className="vdw-positive"/>Positive charge</span><span><i className="vdw-negative"/>Negative charge</span></>}<span><i className="vdw-mint"/>{stage === 2 ? 'Net pressure' : 'Field / mean force'}</span><small>Diagram · not to scale</small></div>
    </section>
  );

  const readouts = stage === 0
    ? [{ label: 'Applied field', value: params.polarization.toFixed(2), unit: 'E₀' }, { label: 'Dipole moment', value: 'p = αE' }, { label: 'Net charge', value: '0' }]
    : stage === 1
      ? [{ label: 'Pair energy', value: number(pair.energy), unit: 'E₀', testId: 'vdw-pair-energy' }, { label: 'Mean force', value: number(pair.force), unit: 'E₀/r₀' }, { label: 'Separation', value: params.distance.toFixed(2), unit: 'r₀' }]
      : [{ label: 'Net pressure', value: `${number(reference.pressure)} Pa`, testId: 'vdw-pressure' }, { label: 'Force on each plate', value: `${number(reference.force * 1e6)} μN`, testId: 'vdw-force' }, { label: 'Energy / area', value: number(reference.energyPerArea * 1e9), unit: 'nJ/m²' }, { label: 'Gap', value: String(params.gap), unit: 'nm' }];

  const stageNotes = stage === 0
    ? <><div className="vdw-equation">p = αE</div><p className="vdw-control-note">E₀ is an arbitrary field scale. Cloud displacement is exaggerated; α is fixed. Polarizability α describes how readily a charge distribution responds to an electric field.</p></>
    : stage === 1
      ? <><div className="vdw-equation">U(r) = −C₆ / r⁶<br/>F(r) = −6C₆ / r⁷</div><p className="vdw-control-note">Short-range London reference. Here E₀ = C₆/r₀⁶; r₀ is an arbitrary distance scale. Doubling r weakens the energy by 64× and the force by 128×. At longer distances, retardation changes these powers.</p></>
      : <><div className="vdw-equation">P = −π²ℏc / (240d⁴)<br/>F ≈ P × A</div><p className="vdw-control-note">Negative = attraction. Ideal perfect conductors at 0 K; finite-area force neglects edges. Values are an analytic reference.</p></>;

  const aboutNode = (
    <AboutSheet {...about} shortcuts={actions} onOpenChange={about.setOpen} onSection={about.setSection} active={active} experiment={header.experiment} scenario={current.title} sections={[
      { id: 'scenario', content: <div className="vdw-about"><h3>{EXPLANATIONS[stage][0]}</h3><p>{EXPLANATIONS[stage][1]}</p>{stageNotes}<div><span className="micro-label">READING CHAPTER 3</span><h2>From molecular attraction to a field pressure</h2></div><p>Keesom forces involve permanent dipoles; Debye forces involve a permanent and an induced dipole; London dispersion involves fluctuating, induced dipoles. This experiment follows the London branch into Fleming’s account of the Casimir effect. Follow an induced dipole into a collective force — and a measurable pressure difference.</p><p>Fleming treats vacuum fluctuations as interacting electric dipoles. The numerical plate result here is the standard ideal Casimir reference, evaluated separately from that illustration. A microscopic pressure law for Fleming’s medium is not derived by these diagrams.</p></div> },
      { id: 'sources', content: <div className="vdw-about vdw-source-content"><div className="about-links"><a href={`${BOOK}#page=27`} target="_blank" rel="noreferrer"><BookOpen size={14}/> Chapter 3 ↗</a></div><p>Original embedded figures extracted from Ray Fleming’s <em>The Zero-Point Universe</em>. Page numbers below are PDF page positions. Interactive diagrams above are adaptations.</p><div className="vdw-source-grid">{SOURCE_FIGURES.map((_, i) => <SourceFigure key={i} index={i}/>)}</div><p>Figure 3-1 shows an opposed, repulsive configuration (I) and an aligned, attractive one (II). The surrounding text calls both repulsive; the interactive explanation uses the charge geometry. The prescribed in-phase motion is a teaching aid, not a quantum dispersion calculation.</p><p>Retardation concerns finite electromagnetic propagation time. Figure 3-3’s “excluded fluctuations” are a heuristic; actual conductor boundary conditions constrain a full electromagnetic spectrum. Neither counting drawn dipoles nor cancelling two arbitrary pressures derives the reference result.</p><p>The ideal reference excludes material dispersion, temperature, surface roughness, edge effects and short-range overlap repulsion. Observing Casimir attraction does not uniquely establish a dipolar vacuum or determine absolute vacuum energy; see <a href="https://arxiv.org/abs/hep-th/0503158" target="_blank" rel="noreferrer">Jaffe’s discussion</a>.</p><div className="vdw-reference-links"><a href="./docs/van-der-waals-model.md" target="_blank" rel="noreferrer">Model & source notes ↗</a><a href="https://journals.aps.org/pr/abstract/10.1103/PhysRev.73.360" target="_blank" rel="noreferrer">Casimir & Polder (1948) ↗</a><a href="https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=906575" target="_blank" rel="noreferrer">NIST-hosted Casimir review ↗</a></div></div> },
    ]}/>
  );

  const dockNode = (
    // Plots and Stress exist only on the plate-pressure stage; the other stages show just the readout strip, fixed under
    // the timeline (the Shell's dockStripOnly).
    <Dock collapsed={dockCollapsed} onCollapsedChange={stage === 2 ? setDockCollapsed : undefined} tab={stage === 2 ? dockTab : undefined} onTab={setDockTab} readouts={readouts}
      tabs={[
        ...(stage === 2 ? [
          { id: 'plots', label: 'Plots', content: <div className="vdw-dock-plot"><h4>Gap sweep · ideal reference</h4><PressurePlot gap={params.gap}/><p>Double the gap → <strong>1/16 of the pressure</strong>. Double the area → twice the force, at the same pressure.</p></div> },
          { id: 'stress', label: 'Stress', content: <div className="vdw-dock-text"><h4>How zero-point energy produces stress</h4><p>Each field mode has ground-state energy ½ℏω. The plates change the allowed spectrum. Subtracting the infinite-separation reference gives a finite interaction energy per area:</p><div className="vdw-equation">U / A = −π²ℏc / (720d³)<br/>P = −∂(U/A) / ∂d</div><p>Pressure is the force per area associated with changing the cavity width. This is a <strong>difference in normal stress</strong>; the readout does not measure an absolute, uniform pressure of the vacuum.</p><p className="vdw-control-note">The curves illustrate normal standing-wave components (n = 1, 2, 3; λₙ = 2d/n). They are examples of boundary constraints, not a count of all modes or a wavelength cutoff. Their display does not set the calculated pressure.</p></div> },
        ] : []),
      ]}/>
  );

  const inspectorNode = (
    <Inspector tab={tab} onTab={setTab} selection={<p className="inspector-empty">These diagrams have nothing to select.</p>}
      setup={<SetupPanel definition={vanDerWaalsDefinition} scenario={scenario} params={params} onLive={(k, v) => setParams(p => withPaths(p, { [k]: v }))} onApply={() => undefined} onReset={resetScenario}/>}
      view={stage === 2 ? <ViewPanel definition={vanDerWaalsDefinition} scenario={scenario} view={view} onView={(k, v) => setView(old => withPaths(old, { [k]: v }))}/> : <p className="inspector-empty">This stage has no scene layers.</p>}/>
  );

  const timelineNode = scenario === 'correlated' ? <TimelineBar runtime={runtime} timeline={timeline} speeds={SPEEDS}/> : null;

  return (
    <div className="vdw-workbench-root" style={{ display: active ? undefined : 'none' }}>
      <Shell id="vdw" dockStripOnly={stage !== 2} header={headerNode} rail={rail} viewport={<SplitView active={active} primary={viewportNode} panes={stage === 2 ? [2, 3].map(i => ({ id: `fig-3-${i + 1}`, label: `Fig. 3-${i + 1}`, content: <div className="vdw-figure-pane"><SourceFigure index={i}/></div> })) : []} split={split} onSplit={setSplit} pane={figure} onPane={setFigure}/>} timeline={timelineNode} dock={dockNode} inspector={inspectorNode}
        status={<VdwStatus runtime={runtime} stage={current.title}/>}/>
      {notice && <div className="toast" role="status" data-testid="notice"><Info size={15}/><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14}/></button></div>}
      {aboutNode}
    </div>
  );
}
