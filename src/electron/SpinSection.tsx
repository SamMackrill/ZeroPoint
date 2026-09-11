import { useId } from 'react';
import { dot, SHELL_RADII } from './model';
import type { ElectronState, ElectronView, Vec } from './model';
import { displayedDipole, localTurnArrow, sectionFrame, sectionIndices, SHELL_COLOURS, shellBand, shellSense } from './spinGeometry';

/** Render the equatorial section linked to the three-dimensional spin shells. */
export function SpinSection({ state, view, selected, onPick }: { state: ElectronState; view: ElectronView; selected: number | null; onPick: (id: number) => void }) {
  const titleId = useId(), descriptionId = useId();
  const settings = view.spinDisplay, [u, v] = sectionFrame(state.parameters.axis);
  const extent = SHELL_RADII[settings.count - 1] + .28, zoom = 205 / extent;
  const point = (p: Vec) => [240 + dot(p, u) * zoom, 240 - dot(p, v) * zoom];
  const path = (points: Vec[]) => points.map((p, i) => `${i ? 'L' : 'M'}${point(p).join(',')}`).join(' ');
  return <section className="electron-section" aria-label="Linked 2D spin section">
    <header><span className="light-eyebrow">02 / EQUATORIAL SECTION</span><h2>The same pairs, seen in a plane</h2><p>Looking from +{state.parameters.axis.toUpperCase()} · {state.parameters.axis.toUpperCase()} = 0 · tick {state.tick}</p></header>
    <svg viewBox="0 0 480 480" role="img" aria-labelledby={`${titleId} ${descriptionId}`} data-testid="spin-section">
      <title id={titleId}>Electron spin cross-section through the 3D shells</title>
      <desc id={descriptionId}>Positive ends face inward. Curled arrows turn around each fixed pair centre. {settings.alternating ? 'Successive zepton bands reverse their local turn preference.' : 'All bands share a local turn preference.'} Both views use the same timeline.</desc>
      <path d="M20 240H460M240 20V460" stroke="#28404f" strokeDasharray="3 8"/>
      {SHELL_RADII.slice(0, settings.count).map((r, band) => <g key={r}>
        {settings.guides && <circle cx="240" cy="240" r={r * zoom} fill="none" stroke={SHELL_COLOURS[band]} opacity=".32" strokeDasharray="3 5"/>}
      </g>)}
      {view.dipoles && sectionIndices(settings.count).map(index => {
        const d = displayedDipole(state, index, settings), band = shellBand(index);
        const [cx, cy] = point(d.centre), [px, py] = point(d.positive), [nx, ny] = point(d.negative);
        const opacity = view.reducedMotion ? 1 : .35 + .65 * Math.sin(Math.PI * d.progress);
        const signSize = Math.max(7, Math.min(11, zoom * .07));
        return <g key={index} data-sample={index}>
          {view.rotation && <path d={path(localTurnArrow(d))} fill="none" stroke={SHELL_COLOURS[band]} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>}
          <circle cx={cx} cy={cy} r="1.8" fill="#8598a5"/>
          <g opacity={opacity}>
            <path d={`M${px},${py}L${nx},${ny}`} stroke="#647784" strokeWidth="1"/>
            <circle cx={px} cy={py} r={signSize * .7} fill="#2c2521" stroke="#ffc199" strokeWidth=".8"/>
            <circle cx={nx} cy={ny} r={signSize * .7} fill="#172c3c" stroke="#87d4f3" strokeWidth=".8"/>
            <text x={px} y={py} fill="#ffd6b9" fontSize={signSize} textAnchor="middle" dominantBaseline="central">+</text>
            <text x={nx} y={ny} fill="#a4e4ff" fontSize={signSize} textAnchor="middle" dominantBaseline="central">−</text>
          </g>
          {view.inspect && <circle cx={cx} cy={cy} r={.17 * zoom} fill="transparent" stroke={selected === index ? '#ffe39a' : 'none'} tabIndex={0} role="button" aria-label={`Inspect section pair ${index}`} onClick={() => onPick(index)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(index); } }}/>}
        </g>;
      })}
      <circle cx="240" cy="240" r={.22 * zoom} fill="#b199e3" stroke="#d8c7ff"/>
      <text x="240" y="240" textAnchor="middle" dominantBaseline="central" fill="#241338" fontSize={.26 * zoom}>−</text>
    </svg>
    <div className="electron-section-key">{SHELL_RADII.slice(0, settings.count).map((r, band) => <span key={r} style={{ color: SHELL_COLOURS[band] }}>{shellSense(band, state.parameters.spin, settings.alternating) > 0 ? '↺' : '↻'} Shell {band + 1} · {r} R</span>)}</div>
    <p className="light-small">Curled arrows show each zepton’s local turn. The dot at its centre stays fixed while the +/− pair separates, aligns and collapses.</p>
    <a href="./docs/papers/Electron%20Properties%20Explained%20as%20Quantum%20Field%20Effects.pdf#page=3" target="_blank" rel="noreferrer">Compare with Fleming’s Fig. 2 & §3 ↗</a>
  </section>;
}
