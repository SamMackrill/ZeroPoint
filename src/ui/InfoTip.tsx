import * as Popover from '@radix-ui/react-popover';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import './info-tip.css';

/** Props for InfoTip: the caveat for one parameter, layer or readout. */
export interface InfoTipProps {
  /** What the tip explains, for the button's accessible name ("About <label>"). */
  label: string;
  /** One or two sentences. */
  children: ReactNode;
  /** Opens the About sheet at the relevant section; shows a "More in About ›" link. */
  onMore?(): void;
  testId?: string;
}

/**
 * An ⓘ button that opens a short caveat (docs/ui-redesign-plan.html §10). It opens on click or Enter rather than hover,
 * so the text can be selected, and Esc closes it.
 */
export function InfoTip({ label, children, onMore, testId }: InfoTipProps) {
  return (
    <Popover.Root>
      <Popover.Trigger className="info-tip-trigger" aria-label={`About ${label}`} data-testid={testId}>
        <Info size={13} aria-hidden="true"/>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="info-tip" side="bottom" align="start" sideOffset={6} collisionPadding={8}>
          <p>{children}</p>
          {onMore && (
            <Popover.Close asChild>
              <button type="button" className="info-tip-more" onClick={onMore}>More in About ›</button>
            </Popover.Close>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
