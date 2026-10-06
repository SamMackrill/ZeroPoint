import { useState } from 'react';
import { cross, dot, norm, scale, unit } from './model';
import type { ElectronState, SpinDisplay, Vec } from './model';
import { displayedDipole } from './spinGeometry';
import { chargeMotion, latticeTurnVelocity } from './propertyGeometry';
import { palette } from '../ui/palette';

/** A plane axis perpendicular to `v`, for a pair with no turn to define one. */
const perpendicular = (v: Vec) => unit(cross(v, Math.abs(v[2]) < .9 ? [0, 0, 1] : [1, 0, 0]));

/** Headings for each scenario's close-up. */
const HEADING = { spin: 'Two charges, one local turn', electric: 'Two charges, aligning', moving: 'Two charges, turning as the electron passes' } as const;

/**
 * Magnify one fixed-site pair: in Spin a shell pair's spin turn, as in the shell scene and inspector; in Stationary and
 * Moving the selected lattice pair's own turn (alignment toward the electron, or the motion-induced and spin turns).
 */
export function ChargeMotion({ state, index, display }: { state: ElectronState; index: number; display: SpinDisplay }) {
  const [current, setCurrent] = useState(false);
  const mode = state.parameters.mode, lattice = mode !== 'spin';
  const d = displayedDipole(state, index, display), motion = chargeMotion(lattice ? latticeTurnVelocity(state, index) : d.spinPositiveVelocity);
  const still = norm(motion.positiveVelocity) < 1e-9;
  // The view plane holds the pair's turn: Spin's local axis, else the axis the pair is turning about.
  const inward = lattice ? unit(d.field.electric) : unit(scale(d.centre, -1));
  const turnAxis = lattice ? unit(cross(d.direction, motion.positiveVelocity)) : d.localAxis;
  const tangent = norm(turnAxis) > 1e-9 ? cross(turnAxis, inward) : perpendicular(inward);
  const project = (v: Vec) => [-dot(v, inward), -dot(v, tangent)];
  const direction = project(d.direction), half = d.separation / .22 * 66;
  const ends = [[230 + direction[0] * half, 104 + direction[1] * half], [230 - direction[0] * half, 104 - direction[1] * half]];
  const vectors = current ? [motion.positiveCurrent, motion.negativeCurrent] : [motion.positiveVelocity, motion.negativeVelocity];
  return <div className="electron-charge-motion" aria-label="Local charge motion close-up">
    <div className="light-card-heading"><h3>{HEADING[mode]}</h3><span>Sample {index} · generation {d.generation} · tick {state.tick}</span></div>
    <div className="electron-property-choices" aria-label="Charge arrow meaning">
      <button aria-pressed={!current} onClick={() => setCurrent(false)}>Charge velocities</button>
      <button aria-pressed={current} onClick={() => setCurrent(true)}>Conventional current qv</button>
    </div>
    <svg viewBox="0 0 460 215" role="img" aria-label={current ? 'Opposite charges with opposite velocities give parallel conventional-current contributions' : 'The two charge ends move in opposite directions around their fixed midpoint'}>
      <text x="18" y="25" fill={palette.accent2} fontSize="12">← toward the electron</text>
      <path d="M65 104H400" stroke={palette.line2} strokeDasharray="3 6"/>
      <path d={`M${ends[0].join(',')}L${ends[1].join(',')}`} stroke={palette.text3}/>
      {ends.map(([x, y], i) => {
        const [vx, vy] = project(vectors[i]), length = Math.hypot(vx, vy);
        const ux = length ? vx / length : 0, uy = length ? vy / length : 0;
        const ax = x + ux * 48, ay = y + uy * 48;
        const colour = i ? palette.dataNeg : palette.dataPosHi;
        return <g key={i}>
          {length > 1e-9 && <path d={`M${x + ux * 16} ${y + uy * 16}L${ax} ${ay}M${ax - ux * 7 + uy * 4} ${ay - uy * 7 - ux * 4}L${ax} ${ay}L${ax - ux * 7 - uy * 4} ${ay - uy * 7 + ux * 4}`} stroke={colour} strokeWidth="2" fill="none"/>}
          <circle cx={x} cy={y} r="12" fill={palette.bg3} stroke={colour}/><text x={x} y={y + 5} textAnchor="middle" fill={colour} fontSize="17">{i ? '−' : '+'}</text>
        </g>;
      })}
      <circle cx="230" cy="104" r="3" fill={palette.dataMark}/>
      <text x="230" y="192" textAnchor="middle" fill={palette.accent2} fontSize="12">Fixed midpoint · rotation component only · magnified</text>
    </svg>
    <p className="light-small" data-testid="charge-motion-explanation">{lattice ? latticeExplanation(mode, current, still) : <>{current ? 'The negative charge reverses the current sign: (+e)v+ and (−e)v− point together. This illustrates why the two charge motions can reinforce magnetism.' : 'The + and − ends have opposite rotation velocities while their midpoint stays fixed. Switch to current to include each charge’s sign.'}{norm(d.localAxis) < 1e-9 ? ' This site lies on the preferred axis, where this display has no spin turn.' : ''}</>}</p>
    <p className="light-small">{lattice ? 'Arrows show direction, not speed. Separation and collapse velocities are omitted. The main timeline drives this pair.' : 'Arrows show direction, not speed. This is a local current comparison, not an integrated magnetic moment or a calculation of g ≈ 2. Separation and collapse velocities are omitted. The main timeline drives this pair.'}</p>
    <a href="https://www.youtube.com/watch?v=mFearr3kmIQ&t=151s" target="_blank" rel="noreferrer">Fleming’s two-charge explanation · 2:31 ↗</a>
  </div>;
}

/** What a Stationary or Moving lattice pair's arrows show. */
function latticeExplanation(mode: 'electric' | 'moving', current: boolean, still: boolean) {
  if (still) return mode === 'electric'
    ? 'Once aligned, the pair holds still: a stationary electron polarizes the medium (E) but moves no charge, so there is no current.'
    : 'This pair is not turning at this moment. Run or step the timeline to see it turn as the electron passes.';
  if (current) return 'The negative charge reverses the current sign: (+e)v+ and (−e)v− point together, so the turn is a local current.';
  return mode === 'electric'
    ? 'As the polarization builds, the pair turns its + end toward the electron about its fixed midpoint, so the two ends move oppositely.'
    : 'As the electron passes, the pair turns about its fixed midpoint (the motion field, B = v × E / c², plus its spin turn), so the two ends move oppositely.';
}
