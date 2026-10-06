import * as ToggleGroup from '@radix-ui/react-toggle-group';
import type { ReactNode } from 'react';
import './segmented.css';

/** One option of a Segmented control. */
export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is an icon or symbol (e.g. "+½" → "spin up"). */
  title?: string;
  disabled?: boolean;
}

/** Props for Segmented: an exclusive choice between two to five options. */
export interface SegmentedProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange(value: T): void;
  disabled?: boolean;
  testId?: string;
  /** Extra classes on the root, beside `segmented`. */
  className?: string;
}

/**
 * An exclusive choice with every option visible (docs/ui-redesign-plan.html §07), replacing a native select for short
 * option sets. Arrow keys move between options. One option is always selected: clicking the current one keeps it.
 */
export function Segmented<T extends string>({ label, options, value, onChange, disabled, testId, className }: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root type="single" className={className ? `segmented ${className}` : 'segmented'} aria-label={label} value={value} disabled={disabled} data-testid={testId}
      onValueChange={next => { if (next) onChange(next as T); }}>
      {options.map(option => (
        <ToggleGroup.Item key={option.value} value={option.value} className="segmented-item" disabled={option.disabled}
          aria-label={option.title} title={option.title}>
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
