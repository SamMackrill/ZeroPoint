import { useState } from 'react';
import { SHELL_PARTICLES, balancingOuterDiameter, balancingThickness, effectiveShellScale, excludedShell, fluxAtRadius, pairProductionWavelength, type ShellParticle } from './propertyGeometry';
import { palette } from '../ui/palette';

/**
 * Independent reference investigations prompted by the electron-properties video and by chapter 16 of the book. With
 * `study` set (the workbench's static scenarios) it shows that one study; without it, a choice between them.
 */
export function ElectronProperties({ study }: { study?: 'flux' | 'radius' | 'mass' } = {}) {
  const [chosen, setTopic] = useState<'flux' | 'radius' | 'mass'>('flux');
  const topic = study ?? chosen;
  const [radius, setRadius] = useState(1), [trialRadius, setTrialRadius] = useState(1), [rate, setRate] = useState(1);
  const flux = fluxAtRadius(radius), shell = effectiveShellScale(trialRadius, rate);
  if (topic === 'mass') return <MassShell choices={!study && <PropertyChoices topic={topic} onTopic={setTopic}/>}/>;
  return <section className="light-card electron-properties" aria-label="Electron property investigations">
    <div className="light-card-heading"><h2>Explore the electron’s properties</h2><span>Independent reference experiments</span></div>
    {!study && <PropertyChoices topic={topic} onTopic={setTopic}/>}
    {topic === 'flux' ? <div className="electron-property-layout">
      <svg viewBox="0 0 320 260" role="img" aria-label="Cross-section of a variable Gauss sphere around a stationary negative electron">
        <circle cx="160" cy="128" r="35" stroke={palette.text4} fill="none" strokeDasharray="4 5"/>
        <circle cx="160" cy="128" r={radius * 35} stroke={palette.dataE} fill={`${palette.dataE}0a`}/>
        {Array.from({ length: 12 }, (_, i) => {
          const a = i * Math.PI / 6, x = 160 + radius * 35 * Math.cos(a), y = 128 + radius * 35 * Math.sin(a);
          const length = Math.min(38, radius * 35 - 12, 15 * flux.field), ex = x - length * Math.cos(a), ey = y - length * Math.sin(a);
          return <path key={i} d={`M${x} ${y}L${ex} ${ey}M${ex + 5 * Math.cos(a + .5)} ${ey + 5 * Math.sin(a + .5)}L${ex} ${ey}L${ex + 5 * Math.cos(a - .5)} ${ey + 5 * Math.sin(a - .5)}`} stroke={palette.dataE} fill="none"/>;
        })}
        <circle cx="160" cy="128" r="10" fill={palette.dataCore}/><text x="160" y="134" textAnchor="middle" fill={palette.dataCoreDeep} fontSize="19">−</text>
        <text x="160" y="249" textAnchor="middle" fill={palette.accent2} fontSize="11">Dashed: R · solid: integration sphere r</text>
      </svg>
      <div><h3>Less field, more surface</h3><p className="light-small">Increase the sphere radius. The inward field falls as 1/r² while the area grows as r², keeping the enclosed charge constant.</p>
        <label className="light-range">Gauss sphere radius<output>{radius.toFixed(1)} R</output><input aria-label="Gauss sphere radius" type="range" min=".5" max="3" step=".1" value={radius} onChange={e => setRadius(+e.target.value)}/></label>
        <dl className="light-readouts"><div><dt>|E| / E₀</dt><dd data-testid="property-field">{flux.field.toFixed(4)}</dd></div><div><dt>Area / (4πR²)</dt><dd data-testid="property-area">{flux.area.toFixed(4)}</dd></div><div><dt>Flux / (4πE₀R²) = Q/e</dt><dd data-testid="property-flux">{flux.charge.toFixed(4)}</dd></div></dl>
        <p className="light-small">A static Coulomb reference with Q = −e supplied as input; 256 surface samples check its flux. This does not derive charge from the displayed zeptons. Arrow lengths are capped for readability.</p>
        <a href="https://www.youtube.com/watch?v=mFearr3kmIQ&t=351s" target="_blank" rel="noreferrer">Fleming’s flux explanation · 5:51 ↗</a>
      </div>
    </div> : <div className="electron-property-layout">
      <svg viewBox="0 0 320 260" role="img" aria-label="Effective speed versus radius at the selected pattern rate, with a speed-of-light threshold">
        <path d="M40 22V218H295" stroke={palette.text4} fill="none"/>
        <path d="M40 170H295" stroke={palette.warn} strokeDasharray="5 5"/>
        <text x="46" y="162" fill={palette.warn} fontSize="11">v = c</text>
        <path d={`M40 218L280 ${218 - 96 * rate}`} stroke={palette.dataE} strokeWidth="2"/>
        <circle cx={40 + trialRadius * 120} cy={218 - shell.speedOverC * 48} r="5" fill={shell.speedOverC > 1 ? palette.warn : palette.dataE}/>
        <text x="43" y="16" fill={palette.accent2} fontSize="11">v/c = 2πrf/c</text>
        <text x="40" y="237" fill={palette.accent2} fontSize="11">0</text><text x="157" y="237" fill={palette.accent2} fontSize="11">R</text><text x="274" y="237" fill={palette.accent2} fontSize="11">2R</text>
      </svg>
      <div><h3>Where the proposed shell reaches c</h3><p className="light-small">Hold the effective rate fixed and increase the trial radius, or change the rate to move the limit. R = λC/2; f₀ = c/(2πR).</p>
        <label className="light-range">Trial shell radius<output>{trialRadius.toFixed(2)} R</output><input aria-label="Trial shell radius" type="range" min=".5" max="2" step=".05" value={trialRadius} onChange={e => setTrialRadius(+e.target.value)}/></label>
        <label className="light-range">Effective pattern rate<output>{rate.toFixed(2)} f₀</output><input aria-label="Effective pattern rate" type="range" min=".5" max="2" step=".05" value={rate} onChange={e => setRate(+e.target.value)}/></label>
        <dl className="light-readouts"><div><dt>Effective frequency</dt><dd>{shell.frequency.toExponential(3)} Hz</dd></div><div><dt>Trial effective speed / c</dt><dd data-testid="property-speed">{shell.speedOverC.toFixed(3)}</dd></div><div><dt>Radius at c / R</dt><dd data-testid="property-limit">{shell.limitRadius.toFixed(3)}</dd></div></dl>
        <p className="light-small" data-testid="property-limit-status">{shell.speedOverC > 1 + 1e-9 ? 'Above the proposed limit: this trial radius would be excluded at this rate.' : Math.abs(shell.speedOverC - 1) < 1e-9 ? 'At the proposed limit: the effective shell speed equals c.' : 'Below the proposed limit: the effective shell speed is less than c.'}</p>
        <p className="light-small">This tests Fleming’s kinematic shell argument. It is not a measured electron size or a stability calculation. The local dipole turns use separate illustrative rates; no charge is animated orbiting at c.</p>
        <a href="https://www.youtube.com/watch?v=mFearr3kmIQ&t=616s" target="_blank" rel="noreferrer">Fleming’s size-limit explanation · 10:16 ↗</a>
      </div>
    </div>}
    <p className="light-small">These controls explore references independently of the main scene and its saved timeline. <a href="./docs/electron-video-notes.md" target="_blank" rel="noreferrer">Video notes & proposed experiments ↗</a></p>
  </section>;
}

/** The choice between the investigations, shown when no single study is fixed. */
function PropertyChoices({ topic, onTopic }: { topic: 'flux' | 'radius' | 'mass'; onTopic(topic: 'flux' | 'radius' | 'mass'): void }) {
  return <div className="electron-property-choices" aria-label="Property investigation">
    <button aria-pressed={topic === 'flux'} onClick={() => onTopic('flux')}>Charge & flux</button>
    <button aria-pressed={topic === 'radius'} onClick={() => onTopic('radius')}>Radius & rate limit</button>
    <button aria-pressed={topic === 'mass'} onClick={() => onTopic('mass')}>Mass & excluded energy</button>
  </div>;
}

/** Four significant figures in scientific notation, as the book prints its energy densities. */
const density = (value: number) => { const [m, e] = value.toExponential(3).split('e'); return `${m} × 10${[...String(+e)].map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c] ?? '⁻').join('')}`; };

/**
 * Fluctuations drawn in the mass study, as wavelengths in units of the particle's diameter (Fleming's Fig. 16-1 draws
 * them as ovals as long as their wavelength). Which side of the shell each falls on depends on the current diameters.
 */
const FLUCTUATIONS = [.12, .16, .21, .27, .34, .42, .5, .6, .7, .8, .88, .94, .98, 1.02, 1.06, 1.12, 1.2, 1.32, 1.46, 1.62].map((wavelength, i) => ({ wavelength, angle: i * 2.399963229728653, spread: (i * .6180339887) % 1 }));

/**
 * Mass as the zero-point energy a shell excludes (The Zero-Point Universe ch. 16; Electron Properties §5). The shell
 * is a Casimir cavity: fluctuations with wavelengths between its inner and outer diameters are shut out, and Fleming
 * finds their energy equals mc² for an electron shell at the Compton wavelength and a proton shell at its charge radius.
 */
function MassShell({ choices }: { choices: React.ReactNode }) {
  const [particle, setParticle] = useState<ShellParticle>('electron'), [size, setSize] = useState(1), [thick, setThick] = useState(1);
  const spec = SHELL_PARTICLES[particle], mean = size * spec.diameter, balance = balancingThickness(particle, mean), thickness = Math.min(mean * .98, thick * balance);
  const shell = excludedShell(particle, mean - thickness, mean + thickness), open = excludedShell(particle, spec.diameter, Infinity);
  const inUnit = (metres: number, digits = 3) => (metres / spec.unit).toFixed(digits);
  // The drawing is scaled to the particle's own diameter: 1 diameter = 78 px, centred at (160, 124).
  const px = 78, cx = 160, cy = 124, rIn = shell.inner / spec.diameter * px / 2, rOut = shell.outer / spec.diameter * px / 2, bar = Math.min(1.6, shell.ratio);
  let outside = 0;
  return <section className="light-card electron-properties" aria-label="Electron property investigations">
    <div className="light-card-heading"><h2>Explore the electron’s properties</h2><span>Independent reference experiments</span></div>
    {choices}
    <div className="electron-property-layout">
      <svg viewBox="0 0 320 260" role="img" aria-label={`Cross-section of a ${spec.label.toLowerCase()} shell: fluctuations with wavelengths between its inner and outer diameters are excluded`}>
        <circle cx={cx} cy={cy} r={rOut} fill={`${palette.dataMark}33`} stroke={palette.dataMark}/>
        <circle cx={cx} cy={cy} r={rIn} fill={palette.bg1} stroke={palette.dataMark}/>
        {FLUCTUATIONS.map((f, i) => {
          const wavelength = f.wavelength * spec.diameter, long = f.wavelength * px / 2, short = Math.max(1.2, long / 3.2);
          if (wavelength > shell.inner && wavelength < shell.outer) {
            // As long as the shell is wide: it fits neither inside nor outside, so it is drawn across the shell, dashed.
            return <ellipse key={i} cx={cx} cy={cy} rx={long} ry={short} transform={`rotate(${f.angle * 57.3} ${cx} ${cy})`} fill="none" stroke={palette.warn} strokeDasharray="3 3" opacity=".8"/>;
          }
          if (wavelength <= shell.inner) {
            const reach = Math.max(0, rIn - long - 1.5) * f.spread, x = cx + reach * Math.cos(f.angle), y = cy + reach * Math.sin(f.angle);
            return <ellipse key={i} cx={x} cy={y} rx={long} ry={short} transform={`rotate(${f.angle * 131} ${x} ${y})`} fill={`${palette.dataNeg}40`} stroke={palette.dataNeg} strokeWidth=".8"/>;
          }
          // Longer wavelengths lie outside, set tangentially on rings so none crosses the shell.
          const slot = outside++, ring = rOut + 7 + short + (slot % 2) * 24, a = slot * 1.13 + .4, x = cx + ring * Math.cos(a), y = cy + ring * Math.sin(a);
          if (ring + short > 120) return null;
          return <ellipse key={i} cx={x} cy={y} rx={long} ry={short} transform={`rotate(${a * 57.3 + 90} ${x} ${y})`} fill={`${palette.dataNeg}26`} stroke={palette.dataNeg} strokeWidth=".8"/>;
        })}
        <circle cx={cx} cy={cy} r="2.5" fill={palette.dataCore}/>
        <text x="160" y="251" textAnchor="middle" fill={palette.accent2} fontSize="11">Ring: the excluded band · dashed: cannot fit</text>
      </svg>
      <div><h3>How much zero-point energy does the shell shut out?</h3><p className="light-small">Fluctuations shorter than the inner diameter exist inside the shell and longer than the outer diameter exist outside it. Those in between are excluded. Fleming equates their energy with the particle’s mass-energy.</p>
        <div className="electron-property-choices" aria-label="Particle"><button aria-pressed={particle === 'electron'} onClick={() => { setParticle('electron'); setSize(1); setThick(1); }}>Electron</button><button aria-pressed={particle === 'proton'} onClick={() => { setParticle('proton'); setSize(1); setThick(1); }}>Proton</button></div>
        <label className="light-range">Mean shell diameter<output>{inUnit(mean)} {spec.unitLabel}</output><input aria-label="Mean shell diameter" type="range" min=".6" max="1.6" step=".01" value={size} onChange={e => setSize(+e.target.value)}/></label>
        <label className="light-range">Shell thickness<output>{inUnit(thickness)} {spec.unitLabel}</output><input aria-label="Shell thickness" type="range" min=".2" max="2" step=".01" value={thick} onChange={e => setThick(+e.target.value)}/></label>
        <div className="electron-mass-bar" role="img" aria-label={`Excluded energy is ${(shell.ratio * 100).toFixed(0)} percent of the mass-energy`}><i style={{ width: `${bar / 1.6 * 100}%`, background: Math.abs(shell.ratio - 1) < .02 ? palette.accent : palette.dataMark }}/><b style={{ left: `${100 / 1.6}%` }}/><span style={{ left: `${100 / 1.6}%` }}>mc²</span></div>
        <dl className="light-readouts"><div><dt>Inner / outer diameter</dt><dd data-testid="mass-diameters">{inUnit(shell.inner)} / {inUnit(shell.outer)} {spec.unitLabel}</dd></div><div><dt>Excluded energy density</dt><dd data-testid="mass-excluded">{density(shell.excluded)} GeV/cm³</dd></div><div><dt>Mass-energy density</dt><dd data-testid="mass-density">{density(shell.mass)} GeV/cm³</dd></div><div><dt>Excluded energy / mc²</dt><dd data-testid="mass-ratio">{shell.ratio.toFixed(3)}</dd></div><div><dt>Thickness that balances</dt><dd data-testid="mass-balance">{inUnit(balance)} {spec.unitLabel}</dd></div></dl>
        <p className="light-small" data-testid="mass-status">{Math.abs(shell.ratio - 1) < .02 ? 'Balanced: the excluded zero-point energy equals the mass-energy.' : shell.ratio > 1 ? 'This shell excludes more energy than the particle’s mass-energy.' : 'This shell excludes less energy than the particle’s mass-energy.'}</p>
        <p className="light-small">Fleming’s figures, reproduced here: the {spec.label.toLowerCase()} at a mean diameter of {inUnit(spec.diameter)} {spec.unitLabel} ({spec.diameterNote}) has a mass-energy density of {density(open.mass)} GeV/cm³; every wavelength from that diameter up holds {density(open.excluded)} GeV/cm³, which balances at an outer diameter of {inUnit(balancingOuterDiameter(particle, spec.diameter))} {spec.unitLabel}. A virtual pair at the pair-production energy has a wavelength of {inUnit(pairProductionWavelength(particle), 4)} {spec.unitLabel}.</p>
        <p className="light-small">Energy density is ħω⁴/8π²c³ with ω = 2πc/d (book Eq. 16-1). The shell is a structure of fluctuations, not a solid surface, and wavelengths as short as its own thickness are not excluded. Mass is supplied as an input and compared; it is not predicted from a diameter the model derives.</p>
        <a href="./docs/papers/Book%20-%20the-zero-point-universe.pdf#page=122" target="_blank" rel="noreferrer">The Zero-Point Universe · ch. 16, Mass ↗</a>
      </div>
    </div>
    <p className="light-small">These controls explore references independently of the main scene and its saved timeline. <a href="./docs/electron-video-notes.md" target="_blank" rel="noreferrer">Video notes & proposed experiments ↗</a></p>
  </section>;
}
