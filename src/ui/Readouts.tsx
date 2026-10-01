import { Check, Copy } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import './readouts.css';

/** One measured value: a label on the left and a mono value (with its unit) on the right. */
export interface Readout {
  label: string;
  value: string;
  unit?: string;
  info?: ReactNode;
}

/** Props for Readouts. */
export interface ReadoutsProps {
  items: readonly Readout[];
  /** Show a copy-value button on hover and focus (the Selection tab). */
  copyable?: boolean;
  testId?: string;
}

/** The text a copy button puts on the clipboard: the value with its unit. */
export const readoutText = (item: Readout) => (item.unit ? `${item.value} ${item.unit}` : item.value);

/** A readout list (docs/ui-redesign-plan.html §07): a description list, optionally with copy-value buttons. */
export function Readouts({ items, copyable, testId }: ReadoutsProps) {
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (copied === null) return;
    const timer = setTimeout(() => setCopied(null), 1200);
    return () => clearTimeout(timer);
  }, [copied]);

  /** Copy one value; the button shows a tick briefly when the clipboard accepted it. */
  const copy = (item: Readout) => {
    navigator.clipboard?.writeText(readoutText(item)).then(() => setCopied(item.label), () => undefined);
  };

  return (
    <dl className="readouts" data-testid={testId}>
      {items.map(item => (
        <div key={item.label} className="readout">
          <dt>{item.label}{item.info}</dt>
          <dd>
            <span className="readout-value">{item.value}</span>
            {item.unit && <span className="readout-unit">{item.unit}</span>}
            {copyable && (
              <button type="button" className="readout-copy" aria-label={`Copy ${item.label}`} onClick={() => copy(item)}>
                {copied === item.label ? <Check size={12} aria-hidden="true"/> : <Copy size={12} aria-hidden="true"/>}
              </button>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
