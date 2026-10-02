import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import './about-sheet.css';

/** The About sheet's sections (plan §10). Saved views joins them with URL state (UI 16). */
export type AboutSectionId = 'scenario' | 'units' | 'sources';

/** One section of the About sheet; a lab omits the sections it has nothing for. */
export interface AboutSection { id: AboutSectionId; content: ReactNode }

const LABELS: Record<AboutSectionId, string> = { scenario: 'This scenario', units: 'Units & constants', sources: 'Sources' };

/** Whether a key event comes from a text field or a dialog, where ? must keep its usual meaning. */
const typing = (event: KeyboardEvent) => event.target instanceof HTMLElement && (event.target.isContentEditable || !!event.target.closest('input, textarea, select, [role=dialog], dialog[open]'));

/** Open state for one lab's About sheet: `show()` opens it, at a section if given. */
export function useAbout() {
  const [open, setOpen] = useState(false), [section, setSection] = useState<AboutSectionId>('scenario');
  const show = useCallback((at?: AboutSectionId) => { if (at) setSection(at); setOpen(true); }, []);
  return { open, setOpen, section, setSection, show };
}

/** Props for AboutSheet. */
export interface AboutSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  section: AboutSectionId;
  onSection(id: AboutSectionId): void;
  /** The experiment and scenario it describes, as in the breadcrumb. */
  experiment: string;
  scenario?: string;
  sections: readonly AboutSection[];
  /** Whether Shift ? opens it (the lab is visible). */
  active: boolean;
}

/**
 * The About sheet (plan §10): the full context behind the workspace — what the scenario shows and assumes, units and
 * constants, and sources — in a sheet over the inspector. The header chip, ? and Shift ? open it; Esc closes it.
 */
export function AboutSheet({ open, onOpenChange, section, onSection, experiment, scenario, sections, active }: AboutSheetProps) {
  useEffect(() => {
    if (!active || open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented || typing(event)) return;
      event.preventDefault(); onOpenChange(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, open, onOpenChange]);
  const current = sections.some(s => s.id === section) ? section : sections[0]?.id;
  return (
    <Dialog.Root open={open && active} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="about-overlay"/>
        <Dialog.Content className="about-sheet" data-testid="about-sheet" aria-describedby={undefined}>
          <header className="about-head">
            <span className="about-eyebrow">About</span>
            <Dialog.Title className="about-title">{scenario ?? experiment}</Dialog.Title>
            {scenario && <span className="about-experiment">{experiment}</span>}
            <Dialog.Close asChild><button type="button" className="workbench-icon-button about-close" aria-label="Close About"><X size={17} aria-hidden="true"/></button></Dialog.Close>
          </header>
          <Tabs.Root className="about-tabs" value={current} onValueChange={id => onSection(id as AboutSectionId)}>
            <Tabs.List className="about-tab-list" aria-label="About sections">
              {sections.map(s => <Tabs.Trigger key={s.id} value={s.id} data-testid={`about-${s.id}`}>{LABELS[s.id]}</Tabs.Trigger>)}
            </Tabs.List>
            {sections.map(s => <Tabs.Content key={s.id} value={s.id} className="about-body">{s.content}</Tabs.Content>)}
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
