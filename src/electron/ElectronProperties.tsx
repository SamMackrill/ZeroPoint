import { useState } from 'react';
import { effectiveShellScale, fluxAtRadius } from './propertyGeometry';

/** Independent reference investigations prompted by the electron-properties video. */
export function ElectronProperties() {
  const [topic, setTopic] = useState<'flux' | 'radius'>('flux');
  const [radius, setRadius] = useState(1), [trialRadius, setTrialRadius] = useState(1), [rate, setRate] = useState(1);
  const flux = fluxAtRadius(radius), shell = effectiveShellScale(trialRadius, rate);
  return <section className="light-card electron-properties" aria-label="Electron property investigations">
    <div className="light-card-heading"><h2>Explore the electron’s properties</h2><span>Independent reference experiments</span></div>
    <div className="electron-property-choices" aria-label="Property investigation">
      <button aria-pressed={topic === 'flux'} onClick={() => setTopic('flux')}>Charge & flux</button>
      <button aria-pressed={topic === 'radius'} onClick={() => setTopic('radius')}>Radius & rate limit</button>
    </div>
    {topic === 'flux' ? <div className="electron-property-layout">
      <svg viewBox="0 0 320 260" role="img" aria-label="Cross-section of a variable Gauss sphere around a stationary negative electron">
        <circle cx="160" cy="128" r="35" stroke="#526976" fill="none" strokeDasharray="4 5"/>
        <circle cx="160" cy="128" r={radius * 35} stroke="#93dec0" fill="#93dec00a"/>
        {Array.from({ length: 12 }, (_, i) => {
          const a = i * Math.PI / 6, x = 160 + radius * 35 * Math.cos(a), y = 128 + radius * 35 * Math.sin(a);
          const length = Math.min(38, radius * 35 - 12, 15 * flux.field), ex = x - length * Math.cos(a), ey = y - length * Math.sin(a);
          return <path key={i} d={`M${x} ${y}L${ex} ${ey}M${ex + 5 * Math.cos(a + .5)} ${ey + 5 * Math.sin(a + .5)}L${ex} ${ey}L${ex + 5 * Math.cos(a - .5)} ${ey + 5 * Math.sin(a - .5)}`} stroke="#93dec0" fill="none"/>;
        })}
        <circle cx="160" cy="128" r="10" fill="#b199e3"/><text x="160" y="134" textAnchor="middle" fill="#21172e" fontSize="19">−</text>
        <text x="160" y="249" textAnchor="middle" fill="#91aebd" fontSize="11">Dashed: R · solid: integration sphere r</text>
      </svg>
      <div><h3>Less field, more surface</h3><p className="light-small">Increase the sphere radius. The inward field falls as 1/r² while the area grows as r², keeping the enclosed charge constant.</p>
        <label className="light-range">Gauss sphere radius<output>{radius.toFixed(1)} R</output><input aria-label="Gauss sphere radius" type="range" min=".5" max="3" step=".1" value={radius} onChange={e => setRadius(+e.target.value)}/></label>
        <dl className="light-readouts"><div><dt>|E| / E₀</dt><dd data-testid="property-field">{flux.field.toFixed(4)}</dd></div><div><dt>Area / (4πR²)</dt><dd data-testid="property-area">{flux.area.toFixed(4)}</dd></div><div><dt>Flux / (4πE₀R²) = Q/e</dt><dd data-testid="property-flux">{flux.charge.toFixed(4)}</dd></div></dl>
        <p className="light-small">A static Coulomb reference with Q = −e supplied as input; 256 surface samples check its flux. This does not derive charge from the displayed zeptons. Arrow lengths are capped for readability.</p>
        <a href="https://www.youtube.com/watch?v=mFearr3kmIQ&t=351s" target="_blank" rel="noreferrer">Fleming’s flux explanation · 5:51 ↗</a>
      </div>
    </div> : <div className="electron-property-layout">
      <svg viewBox="0 0 320 260" role="img" aria-label="Effective speed versus radius at the selected pattern rate, with a speed-of-light threshold">
        <path d="M40 22V218H295" stroke="#617c8c" fill="none"/>
        <path d="M40 170H295" stroke="#e8bb82" strokeDasharray="5 5"/>
        <text x="46" y="162" fill="#e8bb82" fontSize="11">v = c</text>
        <path d={`M40 218L280 ${218 - 96 * rate}`} stroke="#93dec0" strokeWidth="2"/>
        <circle cx={40 + trialRadius * 120} cy={218 - shell.speedOverC * 48} r="5" fill={shell.speedOverC > 1 ? '#e8bb82' : '#93dec0'}/>
        <text x="43" y="16" fill="#91aebd" fontSize="11">v/c = 2πrf/c</text>
        <text x="40" y="237" fill="#91aebd" fontSize="11">0</text><text x="157" y="237" fill="#91aebd" fontSize="11">R</text><text x="274" y="237" fill="#91aebd" fontSize="11">2R</text>
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
