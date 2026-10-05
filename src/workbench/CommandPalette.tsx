import { Command } from 'cmdk';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ACTION_GROUPS, keyLabel, matches, visibleActions, type Action } from './actions';
import { usePhone } from './Shell';
import './command-palette.css';

/** Every typed word must appear in the entry's label or group (cmdk's fuzzy default matched scattered letters). */
export const paletteFilter = (_value: string, search: string, keywords: readonly string[] = []) => {
  const text = keywords.join(' ').toLowerCase();
  return search.toLowerCase().split(/\s+/).filter(Boolean).every(word => text.includes(word)) ? 1 : 0;
};

/** Props for CommandPalette. */
export interface CommandPaletteProps {
  /** App-wide entries (switching experiments and scenarios) offered beside the visible lab's actions. */
  navigation: readonly Action[];
}

/**
 * The command palette (plan §11): Ctrl K (⌘ K) opens a searchable list of the visible lab's actions and every
 * experiment's scenarios, grouped as in Help › Shortcuts, each with its shortcut on the right. Choosing one closes the
 * palette, then runs it.
 */
export function CommandPalette({ navigation }: CommandPaletteProps) {
  const [open, setOpen] = useState(false), openRef = useRef(false), returnTo = useRef<HTMLElement | null>(null);
  /**
   * Open or close. cmdk's dialog has no trigger, so Radix restores no focus on close: remember what had focus when it
   * opened and return focus there on the next frame, before a chosen action runs (which may move focus itself).
   */
  const change = (next: boolean) => {
    if (next) returnTo.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    else { const target = returnTo.current; returnTo.current = null; if (target) requestAnimationFrame(() => { if (document.activeElement === document.body || !document.activeElement) target.focus(); }); }
    openRef.current = next; setOpen(next);
  };
  const changeRef = useRef(change);
  useLayoutEffect(() => { changeRef.current = change; });
  const phone = usePhone(), phoneRef = useRef(phone);
  useLayoutEffect(() => { phoneRef.current = phone; });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!matches('Mod+k', event) || phoneRef.current) return; // no palette on phones (plan §13)
      // Ctrl K works from fields too, but not from inside another dialog (Help, a drawer); in the palette it closes it.
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('[role=dialog], dialog[open]') && !target.closest('[cmdk-root]')) return;
      event.preventDefault();
      changeRef.current(!openRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const actions = open ? [...navigation, ...visibleActions()].filter(a => a.palette !== false) : [];
  /** Close first, so focus returns to the page, then run the action on the next frame. */
  const choose = (action: Action) => { change(false); requestAnimationFrame(() => action.run()); };
  return (
    <Command.Dialog open={open} onOpenChange={change} label="Command palette" filter={paletteFilter} overlayClassName="palette-overlay" contentClassName="palette" data-testid="palette">
      <Command.Input className="palette-input" placeholder="Type a command, scenario, layer or parameter…"/>
      <Command.List className="palette-list">
        <Command.Empty className="palette-empty">No matching commands.</Command.Empty>
        {ACTION_GROUPS.map(group => {
          const items = actions.filter(a => a.group === group);
          return items.length > 0 && (
            <Command.Group key={group} heading={group} className="palette-group">
              {items.map(action => (
                <Command.Item key={action.id} value={action.id} keywords={[action.label, group]} disabled={action.disabled} onSelect={() => choose(action)} className="palette-item" data-testid={`palette-${action.id}`}>
                  <span>{action.label}</span>
                  {action.keys?.[0] && <span className="palette-keys">{keyLabel(action.keys[0]).map(part => <kbd key={part}>{part}</kbd>)}</span>}
                </Command.Item>
              ))}
            </Command.Group>
          );
        })}
      </Command.List>
    </Command.Dialog>
  );
}
