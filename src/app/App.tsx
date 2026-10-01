import { useCallback, useState } from 'react';
import { VanDerWaalsExperiment } from '../van-der-waals/VanDerWaalsExperiment';
import { CasimirExperiment } from '../casimir/CasimirExperiment';
import { DevProfiler } from './DevProfiler';
import { EXPERIMENTS, electronDefinition, lightDefinition, mediumDefinition } from '../experiments';
import { MediumWorkbench } from '../experiments/medium/MediumWorkbench';
import { LightWorkbench } from '../experiments/light/LightWorkbench';
import { ElectronWorkbench } from '../experiments/electron/ElectronWorkbench';
import { Header, Rail, type PlannedExperiment } from '../workbench/Chrome';
import { HostedLayout } from '../workbench/Shell';

/** Planned experiments: greyed in the rail, each opening a one-line summary and its plan. */
const PLANNED: PlannedExperiment[] = [
  { id: 'casimir-plates', title: 'Casimir plates (3D)', summary: 'A full parallel-plate boundary model beyond the analytic comparison.', href: './docs/planned-experiments/casimir-effect.md' },
  { id: 'double-slit', title: 'Double slit', summary: 'Slit geometry and observation conditions against the screen pattern.', href: './docs/planned-experiments/double-slit.md' },
  { id: 'lamb-shift', title: 'Lamb shift', summary: 'Unshifted reference levels beside the small Lamb shift.', href: './docs/planned-experiments/lamb-shift.md' },
  { id: 'particle-shells', title: 'Particle shells', summary: 'Requires spectral cutoffs and shell-energy rules.' },
];

type ExperimentId = 'medium' | 'light' | 'electron' | 'casimir' | 'vdw';

/**
 * Coordinate navigation between the independent laboratories. Medium (UI 07), Light (UI 08) and Electron (UI 09) run in
 * the full workbench; the other labs are hosted in the shell's header and rail until they migrate. Every lab stays mounted after its first visit, so
 * switching preserves its state.
 */
export function App() {
  const [experiment, setExperiment] = useState<ExperimentId>('medium');
  const [visited, setVisited] = useState<Record<ExperimentId, boolean>>({ medium: true, light: false, electron: false, casimir: false, vdw: false });
  const open = useCallback((id: ExperimentId) => { setVisited(v => (v[id] ? v : { ...v, [id]: true })); setExperiment(id); }, []);
  // Labs whose scenarios the rail switches; each reports its current scenario back for the rail's highlight.
  const [current, setCurrent] = useState<Partial<Record<ExperimentId, string>>>({ medium: 'balanced', electron: 'stationary' });
  const [requests, setRequests] = useState<Partial<Record<ExperimentId, { id: string; at: number }>>>({});
  const onPresetChange = useCallback((id: string) => setCurrent(c => ({ ...c, medium: id })), []);
  const onElectronScenario = useCallback((id: string) => setCurrent(c => ({ ...c, electron: id })), []);
  const definition = EXPERIMENTS.find(d => d.id === experiment)!;
  const railScenarios = new Set<string>(['medium', 'electron']);
  const highlighted = current[experiment];
  const rail = <Rail experiments={EXPERIMENTS.map(d => ({ id: d.id, title: d.title, scenarios: railScenarios.has(d.id) ? d.scenarios : undefined }))} planned={PLANNED} experiment={experiment}
    scenario={highlighted !== 'custom' ? highlighted : undefined} onExperiment={id => open(id as ExperimentId)}
    onScenario={(e, id) => setRequests(r => ({ ...r, [e]: { id, at: performance.now() } }))}/>;
  const back = () => setExperiment('medium');
  // Each lab is profiled separately in development so the render budget can catch one lab re-rendering another.
  return <>
    <DevProfiler id="medium"><MediumWorkbench active={experiment === 'medium'} rail={rail} header={{ experiment: mediumDefinition.title }} scenarioRequest={requests.medium}
      onPresetChange={onPresetChange} onOpenLight={() => open('light')} onOpenElectron={() => open('electron')} onOpenVdw={() => open('vdw')}/></DevProfiler>
    {visited.light && <DevProfiler id="light"><LightWorkbench active={experiment === 'light'} rail={rail} header={{ experiment: lightDefinition.title }}/></DevProfiler>}
    {visited.electron && <DevProfiler id="electron"><ElectronWorkbench active={experiment === 'electron'} rail={rail} header={{ experiment: electronDefinition.title }} scenarioRequest={requests.electron} onScenarioChange={onElectronScenario}/></DevProfiler>}
    <div style={{ display: experiment === 'casimir' || experiment === 'vdw' ? undefined : 'none' }}>
      <HostedLayout header={<Header experiment={definition.title}/>} rail={rail}>
        {visited.casimir && <DevProfiler id="casimir"><CasimirExperiment active={experiment === 'casimir'} onBack={back}/></DevProfiler>}
        {visited.vdw && <DevProfiler id="vdw"><VanDerWaalsExperiment active={experiment === 'vdw'} onBack={back}/></DevProfiler>}
      </HostedLayout>
    </div>
  </>;
}
