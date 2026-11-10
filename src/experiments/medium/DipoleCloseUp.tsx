import type { PickedDipole } from '../../rendering/FieldRenderer';
import { palette } from '../../ui/palette';
import { WAVELENGTH_AT_F0 } from '../../model/types';

/**
 * The selected dipole enlarged (Medium's split pane): its two lobes about the fixed centre at the current separation,
 * and how far through its lifetime it is. Geometry is schematic; separation is drawn relative to the pair's own peak.
 */
export function DipoleCloseUp({ picked }: { picked: PickedDipole | null }) {
  if (!picked) return <p className="split-empty">Select a dipole (click the field, or Select first in the Selection tab) to see it here.</p>;
  const life = Math.min(1, picked.age / picked.lifetime), half = Math.sin(Math.PI * life) * 110;
  // c/f in L₀ (c = 299 792 458 m/s, f₀ = 10²⁰ Hz, L₀ = 10⁻¹³ m): the wavelength the pair opens to before reduction.
  const wavelength = WAVELENGTH_AT_F0 / picked.frequency;
  return (
    <figure className="dipole-close-up" aria-label={`Dipole ${picked.slot}:${picked.generation} close-up`}>
      <svg viewBox="0 0 320 200" role="img" aria-label={`Lobes ${picked.separation.toFixed(3)} L₀ apart about a fixed centre, ${Math.round(life * 100)} percent of the lifetime elapsed`}>
        <circle cx="160" cy="95" r="118" fill="none" stroke={palette.line2} strokeDasharray="3 6"/>
        <line x1={160 - half} y1="95" x2={160 + half} y2="95" stroke={palette.text3}/>
        <circle cx="160" cy="95" r="3" fill={palette.dataMark}/>
        <circle cx={160 + half} cy="95" r="20" fill={palette.dataPosLo} stroke={palette.dataPos}/><text x={160 + half} y="101" textAnchor="middle" fill={palette.text}>+</text>
        <circle cx={160 - half} cy="95" r="20" fill={palette.dataNegLo} stroke={palette.dataNeg}/><text x={160 - half} y="101" textAnchor="middle" fill={palette.text}>−</text>
        <text x="160" y="190" textAnchor="middle" fill={palette.text3} fontSize="11">Fixed centre · drawn against this pair’s own peak, its wavelength</text>
      </svg>
      <figcaption>
        <strong>Dipole {picked.slot}:{picked.generation}</strong>
        <span>{picked.frequency.toFixed(3)} f₀ · wavelength c/f = {wavelength.toFixed(1)} L₀ · drawn separation {picked.separation.toFixed(4)} L₀ · {Math.round(life * 100)}% of lifetime</span>
        <div className="life-track"><i style={{ width: `${life * 100}%` }}/></div>
      </figcaption>
    </figure>
  );
}
