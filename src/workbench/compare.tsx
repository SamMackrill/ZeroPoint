// A/B comparison (plan §11 "A/B comparison · Dock › Compare", roadmap P7): B is a second set of parameters for the same
// lab, evaluated in lock-step with A's tick. Its series are drawn dashed beside A's, the readout strip shows Δ, and the
// Compare tab lists the parameters that differ, with "Copy B's parameters to A".
import { useCallback, useState } from 'react';
import { appliesTo, getPath, type ControlSpec, type ExperimentDefinition } from './definition';
import type { Readout } from '../ui/Readouts';
import './compare.css';

/** B's parameters, pinned from A's current configuration; null while no comparison is active. */
export function useCompare<P>() {
  const [b, setB] = useState<P | null>(null);
  const pin = useCallback((params: P) => setB(structuredClone(params)), []);
  const clear = useCallback(() => setB(null), []);
  return { b, pin, clear };
}

/** A parameter's value as shown in Setup: its display scale and unit, or a choice's label. */
function show(spec: ControlSpec, value: unknown): string {
  if (spec.kind === 'choice') return spec.options.find(o => o.value === value)?.label ?? String(value);
  const n = Number(value), shown = spec.display ? spec.display.toDisplay(n) : n, unit = spec.display?.unit ?? spec.unit;
  return `${Number(shown.toPrecision(6))}${unit ? ` ${unit}` : ''}`;
}

/** The scenario's parameters whose A and B values differ, as Setup shows them. */
export function parameterDiff(definition: ExperimentDefinition, scenario: string, a: object, b: object) {
  return definition.params.filter(spec => appliesTo(spec, scenario) && show(spec, getPath(a, spec.key)) !== show(spec, getPath(b, spec.key)))
    .map(spec => ({ key: spec.key, label: spec.label, a: show(spec, getPath(a, spec.key)), b: show(spec, getPath(b, spec.key)) }));
}

/** Decimal places in a formatted number ("0.250" → 3), so Δ reads at the same precision as the value. */
const places = (text: string) => (/\.(\d+)/.exec(text)?.[1].length ?? 0);

/**
 * The readout strip with Δ (B − A) in small text under each value that B also has. Numeric values give a signed
 * difference at the value's precision; others show B's value.
 */
export function withDeltas(a: readonly Readout[], b: readonly Readout[] | null): Readout[] {
  if (!b) return [...a];
  return a.map(item => {
    const other = b.find(r => r.label === item.label);
    if (!other) return item;
    const x = Number(item.value), y = Number(other.value);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { ...item, delta: other.value === item.value ? 'Δ 0' : `B ${other.value}` };
    const d = y - x, digits = Math.max(places(item.value), places(other.value));
    return { ...item, delta: `Δ ${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toFixed(digits)}` };
  });
}

/** Props for CompareTab. */
export interface CompareTabProps {
  definition: ExperimentDefinition;
  scenario: string;
  a: object;
  b: object | null;
  onPin(): void;
  onCopyToA(): void;
  onClear(): void;
  /** What B shows, e.g. "Plots draw B dashed". */
  note?: string;
}

/** The Compare dock tab: pin B, the parameters that differ, copy B's parameters to A, and clear. */
export function CompareTab({ definition, scenario, a, b, onPin, onCopyToA, onClear, note }: CompareTabProps) {
  if (!b) return (
    <div className="compare-empty">
      <p>Pin the current configuration as B, then change A’s parameters to compare the two side by side.</p>
      <button type="button" className="compare-button" data-testid="compare-pin" onClick={onPin}>Pin current as B</button>
    </div>
  );
  const diff = parameterDiff(definition, scenario, a, b);
  return (
    <div className="compare-tab">
      <div className="compare-head"><span className="compare-badge" aria-label="Comparison B active">B</span><p>{note ?? 'B runs in lock-step with A’s tick and is drawn dashed in the plots.'}</p></div>
      {diff.length ? (
        <table className="compare-diff" data-testid="compare-diff">
          <thead><tr><th scope="col">Parameter</th><th scope="col">A</th><th scope="col">B</th></tr></thead>
          <tbody>{diff.map(row => <tr key={row.key}><th scope="row">{row.label}</th><td>{row.a}</td><td>{row.b}</td></tr>)}</tbody>
        </table>
      ) : <p className="compare-same">A and B have the same parameters. Change A in Setup to compare.</p>}
      <div className="compare-actions">
        <button type="button" className="compare-button" data-testid="compare-copy" disabled={!diff.length} onClick={onCopyToA}>Copy B’s parameters to A</button>
        <button type="button" className="compare-button" data-testid="compare-repin" onClick={onPin}>Pin current as B</button>
        <button type="button" className="compare-button" data-testid="compare-clear" onClick={onClear}>Clear B</button>
      </div>
    </div>
  );
}
