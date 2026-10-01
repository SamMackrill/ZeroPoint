import * as Slider from '@radix-ui/react-slider';
import { RotateCcw } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatValue, normalizeValue, nudgeValue, parseValue } from './param-value';
import './param-row.css';

/** Props for ParamRow: one continuous parameter with a label, an editable value field and a slider. */
export interface ParamRowProps {
  label: string;
  value: number;
  onChange(value: number): void;
  min: number;
  max: number;
  step: number;
  /** Unit shown after the value field (the label never carries units). */
  unit?: string;
  /** Scenario value: double-clicking the label resets to it. */
  defaultValue?: number;
  /** Applies on restart (↻) rather than live. */
  restart?: boolean;
  /** A staged change that has not been applied yet (amber outline). */
  dirty?: boolean;
  disabled?: boolean;
  /** Custom display format for the value field; defaults to the step's precision. */
  format?(value: number): string;
  /** An InfoTip placed after the label. */
  info?: ReactNode;
  testId?: string;
}

/**
 * A continuous parameter (docs/ui-redesign-plan.html §07). Type directly, including units; ↑/↓ nudge by one step,
 * with Shift for ×10 and Alt for ×0.1; Enter or leaving the field commits and Esc reverts. Double-click the label to
 * reset to the scenario value.
 */
export function ParamRow({ label, value, onChange, min, max, step, unit, defaultValue, restart, dirty, disabled, format, info, testId }: ParamRowProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = format ? format(value) : formatValue(value, step);
  const commit = (next: number) => { const normalized = normalizeValue(next, min, max, step); if (normalized !== value) onChange(normalized); };

  /** Commit the typed text, or revert when it holds no number. */
  const commitDraft = () => {
    if (draft === null) return;
    const parsed = parseValue(draft);
    setDraft(null);
    if (parsed !== null) commit(parsed);
  };

  /** Handle Enter, Esc and ↑/↓ nudges in the value field. */
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); commitDraft(); }
    // Esc reverts typed text; with nothing typed it bubbles (the inspector uses it to revert staged changes).
    else if (event.key === 'Escape' && draft !== null) { event.preventDefault(); setDraft(null); }
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const base = draft === null ? value : parseValue(draft) ?? value;
      setDraft(null);
      commit(nudgeValue(base, event.key === 'ArrowUp' ? 1 : -1, step, min, max, event));
    }
  };

  const canReset = defaultValue !== undefined && !disabled;
  return (
    <div className={`param-row${dirty ? ' is-dirty' : ''}${disabled ? ' is-disabled' : ''}`} data-testid={testId}>
      <div className="param-row-head">
        <label htmlFor={id} className="param-row-label" onDoubleClick={canReset ? () => commit(defaultValue) : undefined} title={canReset ? 'Double-click to reset to the scenario value' : undefined}>
          {label}
          {restart && <RotateCcw className="param-row-restart" size={11} aria-label="applies on restart"/>}
        </label>
        {info}
        <span className="param-row-value">
          <input id={id} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} disabled={disabled}
            value={draft ?? shown} onChange={event => setDraft(event.target.value)} onBlur={commitDraft} onKeyDown={onKeyDown}
            onFocus={event => event.target.select()} aria-describedby={unit ? `${id}-unit` : undefined}/>
          {unit && <span id={`${id}-unit`} className="param-row-unit">{unit}</span>}
        </span>
      </div>
      <Slider.Root className="param-row-slider" min={min} max={max} step={step} value={[value]} disabled={disabled}
        onValueChange={([next]) => commit(next)} aria-label={label}>
        <Slider.Track className="param-row-track"><Slider.Range className="param-row-range"/></Slider.Track>
        <Slider.Thumb className="param-row-thumb" aria-label={label}/>
      </Slider.Root>
    </div>
  );
}
