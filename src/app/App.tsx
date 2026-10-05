import { useCallback, useEffect, useMemo, useState } from 'react';
import { DevProfiler } from './DevProfiler';
import { EXPERIMENTS, casimirDefinition, electronDefinition, lightDefinition, mediumDefinition, vanDerWaalsDefinition } from '../experiments';
import { MediumWorkbench } from '../experiments/medium/MediumWorkbench';
import { LightWorkbench } from '../experiments/light/LightWorkbench';
import { ElectronWorkbench } from '../experiments/electron/ElectronWorkbench';
import { CasimirWorkbench } from '../experiments/casimir/CasimirWorkbench';
import { VdwWorkbench } from '../experiments/van-der-waals/VdwWorkbench';
import { Rail, type PlannedExperiment } from '../workbench/Chrome';
import { CommandPalette } from '../workbench/CommandPalette';
import type { Action } from '../workbench/actions';
import { requestFromHash, type ScenarioRequest } from '../workbench/urlState';

/** Planned experiments: greyed in the rail, each opening a one-line summary and its plan. */
const PLANNED: PlannedExperiment[] = [
  { id: 'casimir-plates', title: 'Casimir plates (3D)', summary: 'A full parallel-plate boundary model beyond the analytic comparison.', href: './docs/planned-experiments/casimir-effect.md' },
  { id: 'double-slit', title: 'Double slit', summary: 'Slit geometry and observation conditions against the screen pattern.', href: './docs/planned-experiments/double-slit.md' },
  { id: 'lamb-shift', title: 'Lamb shift', summary: 'Unshifted reference levels beside the small Lamb shift.', href: './docs/planned-experiments/lamb-shift.md' },
  { id: 'particle-shells', title: 'Particle shells', summary: 'Requires spectral cutoffs and shell-energy rules.' },
];

type ExperimentId = 'medium' | 'light' | 'electron' | 'casimir' | 'vdw';

/**
 * Coordinate navigation between the independent laboratories, each running in the workbench shell (UI 07–11). Every
 * lab stays mounted after its first visit, so switching preserves its state; the rail switches experiments and their
 * scenarios.
 */
export function App() {
  // A link (#/electron/spin?…) opens its lab at its scenario and state; otherwise the app starts on Medium.
  const [link] = useState(() => requestFromHash(location.hash, EXPERIMENTS));
  const [experiment, setExperiment] = useState<ExperimentId>((link?.experiment as ExperimentId) ?? 'medium');
  const [visited, setVisited] = useState<Record<ExperimentId, boolean>>(() => ({ medium: true, light: false, electron: false, casimir: false, vdw: false, ...(link ? { [link.experiment]: true } : {}) }));
  const open = useCallback((id: ExperimentId) => { setVisited(v => (v[id] ? v : { ...v, [id]: true })); setExperiment(id); }, []);
  // Labs whose scenarios the rail switches; each reports its current scenario back for the rail's highlight.
  const [current, setCurrent] = useState<Partial<Record<ExperimentId, string>>>({ medium: 'balanced', electron: 'stationary', casimir: 'electron-electron', vdw: 'induced' });
  const [requests, setRequests] = useState<Partial<Record<ExperimentId, ScenarioRequest>>>(() => (link ? { [link.experiment]: link.request } : {}));
  // Editing the address bar, or following a saved view, routes the same way.
  useEffect(() => {
    const onHash = () => { const next = requestFromHash(location.hash, EXPERIMENTS); if (next) { open(next.experiment as ExperimentId); setRequests(r => ({ ...r, [next.experiment]: next.request })); } };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [open]);
  const onPresetChange = useCallback((id: string) => setCurrent(c => ({ ...c, medium: id })), []);
  const onElectronScenario = useCallback((id: string) => setCurrent(c => ({ ...c, electron: id })), []);
  const onCasimirScenario = useCallback((id: string) => setCurrent(c => ({ ...c, casimir: id })), []);
  const onVdwScenario = useCallback((id: string) => setCurrent(c => ({ ...c, vdw: id })), []);
  const highlighted = current[experiment];
  const rail = <Rail experiments={EXPERIMENTS.map(d => ({ id: d.id, title: d.title, scenarios: d.scenarios }))} planned={PLANNED} experiment={experiment}
    scenario={highlighted !== 'custom' ? highlighted : undefined} onExperiment={id => open(id as ExperimentId)}
    onScenario={(e, id) => setRequests(r => ({ ...r, [e]: { id, at: performance.now() } }))}/>;
  // Palette › Scenarios: every experiment and scenario, wherever you are (a scenario opens its lab, then selects it).
  const navigation = useMemo<Action[]>(() => EXPERIMENTS.flatMap(d => [
    { id: `go.${d.id}`, label: d.title, group: 'Scenarios' as const, run: () => open(d.id as ExperimentId) },
    ...(d.scenarios.length > 1 ? d.scenarios.map(s => ({ id: `go.${d.id}.${s.id}`, label: `${d.title} › ${s.title}`, group: 'Scenarios' as const,
      run: () => { open(d.id as ExperimentId); setRequests(r => ({ ...r, [d.id]: { id: s.id, at: performance.now() } })); } })) : []),
  ]), [open]);
  // Each lab is profiled separately in development so the render budget can catch one lab re-rendering another.
  return <>
    <CommandPalette navigation={navigation}/>
    <DevProfiler id="medium"><MediumWorkbench active={experiment === 'medium'} rail={rail} header={{ experiment: mediumDefinition.title }} scenarioRequest={requests.medium}
      onPresetChange={onPresetChange} onOpenLight={() => open('light')} onOpenElectron={() => open('electron')} onOpenVdw={() => open('vdw')}/></DevProfiler>
    {visited.light && <DevProfiler id="light"><LightWorkbench active={experiment === 'light'} rail={rail} header={{ experiment: lightDefinition.title }} scenarioRequest={requests.light}/></DevProfiler>}
    {visited.electron && <DevProfiler id="electron"><ElectronWorkbench active={experiment === 'electron'} rail={rail} header={{ experiment: electronDefinition.title }} scenarioRequest={requests.electron} onScenarioChange={onElectronScenario}/></DevProfiler>}
    {visited.casimir && <DevProfiler id="casimir"><CasimirWorkbench active={experiment === 'casimir'} rail={rail} header={{ experiment: casimirDefinition.title }} scenarioRequest={requests.casimir} onScenarioChange={onCasimirScenario}/></DevProfiler>}
    {visited.vdw && <DevProfiler id="vdw"><VdwWorkbench active={experiment === 'vdw'} rail={rail} header={{ experiment: vanDerWaalsDefinition.title }} scenarioRequest={requests.vdw} onScenarioChange={onVdwScenario}/></DevProfiler>}
  </>;
}
