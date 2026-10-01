import { Eye, EyeOff } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { soloLayer, toggleLayer, type Visibility } from './layer-visibility';
import './layer-list.css';

/** One scene layer: an eye toggle, a label, an optional InfoTip and an optional inline sub-control. */
export interface LayerItem {
  key: string;
  label: string;
  info?: ReactNode;
  /** Shown indented beneath the row while the layer is visible (e.g. Energy slice → a "Slice Z" ParamRow). */
  control?: ReactNode;
}

/** A titled group of layers (Medium, Fields, Guides, Clipping). */
export interface LayerGroup {
  title: string;
  layers: readonly LayerItem[];
}

/** Props for LayerList. */
export interface LayerListProps {
  groups: readonly LayerGroup[];
  visible: Visibility;
  onChange(visible: Visibility): void;
  /** Restores the scenario's layers; shows a "Reset layers to scenario" button. */
  onReset?(): void;
  testId?: string;
}

/**
 * The View tab's layer list (docs/ui-redesign-plan.html §07). Click toggles a layer; Alt-click solos it among the
 * listed layers, and Alt-clicking the soloed layer shows them all again. Layers that don't apply to the current
 * scenario are left out by the caller rather than disabled.
 */
export function LayerList({ groups, visible, onChange, onReset, testId }: LayerListProps) {
  const keys = groups.flatMap(group => group.layers.map(layer => layer.key));

  /** Toggle, or solo with Alt held. */
  const onToggle = (event: MouseEvent, key: string) => onChange(event.altKey ? soloLayer(visible, keys, key) : toggleLayer(visible, key));

  return (
    <div className="layer-list" data-testid={testId}>
      {groups.map(group => (
        <section key={group.title} className="layer-group" aria-label={group.title}>
          <h4 className="layer-group-title">{group.title}</h4>
          <ul>
            {group.layers.map(layer => {
              const on = Boolean(visible[layer.key]);
              return (
                <li key={layer.key} className={`layer-row${on ? ' is-on' : ''}`}>
                  <div className="layer-row-main">
                    <button type="button" className="layer-toggle" data-testid={`layer-${layer.key}`} aria-pressed={on} onClick={event => onToggle(event, layer.key)} title="Alt-click to solo">
                      {on ? <Eye size={14} aria-hidden="true"/> : <EyeOff size={14} aria-hidden="true"/>}
                      <span>{layer.label}</span>
                    </button>
                    {layer.info}
                  </div>
                  {on && layer.control && <div className="layer-row-control">{layer.control}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {onReset && <button type="button" className="layer-reset" onClick={onReset}>Reset layers to scenario</button>}
    </div>
  );
}
