// The action registry (plan §11 "Keyboard map", roadmap P6): every keyboard shortcut is an action with a label, a group
// and a binding. One listener per visible lab runs them, the Help sheet lists them, and the command palette (UI 15b)
// will search them.
import { useEffect, useRef } from 'react';

/** Palette and Help-sheet groups, in display order. */
export const ACTION_GROUPS = ['Transport', 'Cameras', 'Selection', 'Setup', 'View', 'Files', 'Help'] as const;
export type ActionGroup = typeof ACTION_GROUPS[number];

/** One command. */
export interface Action {
  id: string;
  label: string;
  group: ActionGroup;
  /**
   * Key bindings, e.g. 'Space', 'Shift+ArrowRight', ']', '1', 'Mod+s' (Mod is Ctrl, or ⌘ on a Mac). Letters match either
   * case; symbols (<, >, ?) match whatever Shift state types them.
   */
  keys?: readonly string[];
  run(): void;
  /** Unavailable now: its keys do nothing. */
  disabled?: boolean;
  /** Keep firing while the key is held (stepping); others fire once per press. */
  repeat?: boolean;
  /**
   * Handled by its own component (the split view, selection, the Shell's panels, the Help sheet), so the registry lists
   * it but does not bind it.
   */
  listOnly?: boolean;
}

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** How a binding reads in the Help sheet and the palette: Ctrl S (⌘ S on a Mac), Shift →, Space. */
export function keyLabel(binding: string): string[] {
  const names: Record<string, string> = { Mod: MAC ? '⌘' : 'Ctrl', ArrowRight: '→', ArrowLeft: '←', Enter: '⏎', Escape: 'Esc' };
  return binding.split('+').map(part => names[part] ?? (part.length === 1 ? part.toUpperCase() : part));
}

/** Whether a keydown event is the given binding. */
export function matches(binding: string, event: KeyboardEvent): boolean {
  const parts = binding.split('+'), key = parts.at(-1)!, mods = new Set(parts.slice(0, -1));
  if (mods.has('Mod') !== (event.ctrlKey || event.metaKey) || mods.has('Alt') !== event.altKey) return false;
  if (key === 'Space') return event.code === 'Space' && mods.has('Shift') === event.shiftKey;
  const letter = /^[a-z]$/i.test(key), symbol = key.length === 1 && !letter && !/^[0-9]$/.test(key);
  // A symbol's own Shift state is part of typing it (< is Shift+, on most layouts), so only explicit Shift+ is checked.
  if (!symbol && mods.has('Shift') !== event.shiftKey) return false;
  return letter ? event.key.toLowerCase() === key.toLowerCase() : event.key === key;
}

/** Whether the event comes from somewhere shortcuts must leave alone: a text field, an open dialog or the palette. */
export function busyTarget(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || !!target.closest('input, textarea, select, [role=dialog], dialog[open], [cmdk-root]');
}

/**
 * Keys a focused control uses itself: Space and Enter activate buttons, links and radios, and arrows move within
 * segmented controls, tabs, sliders and menus. Shortcuts on them would fire twice.
 */
function ownKey(event: KeyboardEvent): boolean {
  if (!(event.target instanceof HTMLElement)) return false;
  if (event.code === 'Space' || event.key === 'Enter') return !!event.target.closest('button, a, summary, [role=radio], [role=tab], [role=checkbox], [role=switch], [role=slider]');
  return event.key.startsWith('Arrow') && !!event.target.closest('[role=radio], [role=tab], [role=slider], [role=menuitem], [role=menu]');
}

/**
 * Run the visible lab's actions from the keyboard. Keys typed into fields, pressed inside dialogs, already handled
 * elsewhere (defaultPrevented: a plot's arrows, a popover's Esc) or bound to nothing are left alone.
 */
export function useActions(active: boolean, actions: readonly Action[]) {
  const current = useRef(actions); current.current = actions;
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || busyTarget(event) || ownKey(event)) return;
      const action = current.current.find(a => !a.listOnly && a.keys?.some(k => matches(k, event)));
      if (!action) return;
      event.preventDefault();
      if (action.disabled || (event.repeat && !action.repeat)) return;
      action.run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

/** A shortcut its own component handles (listOnly), listed so the Help sheet and palette show the whole keyboard map. */
const listed = (id: string, label: string, group: ActionGroup, key: string): Action => ({ id, label, group, keys: [key], run: () => undefined, listOnly: true });

/** Shortcuts every lab has: the Shell's panels and focus mode, and Help. */
export const PANEL_SHORTCUTS: readonly Action[] = [
  listed('view.rail', 'Show or hide the rail', 'View', 'Mod+b'),
  listed('view.inspector', 'Show or hide the inspector', 'View', 'Mod+i'),
  listed('view.dock', 'Show or hide the dock', 'View', 'Mod+j'),
  listed('view.focus', 'Focus mode (hide the panels)', 'View', 'Mod+.'),
  listed('help.open', 'Help: About and shortcuts', 'Help', '?'),
];
/** SetupPanel's own key, for labs with restart parameters. */
export const APPLY_SHORTCUT = listed('setup.apply', 'Apply pending changes', 'Setup', 'Mod+Enter');
/** The split view's own key (SplitView). */
export const SPLIT_SHORTCUT = listed('view.split', 'Split view', 'View', '\\');
/** Selection keys (useSelectionKeys); Focus only where the lab has a focus camera. */
export const SELECTION_SHORTCUTS = {
  clear: listed('selection.clear', 'Clear the selection', 'Selection', 'Escape'),
  focus: listed('selection.focus', 'Focus the selection', 'Selection', 'f'),
};

/** Camera presets on 1–4, in the order the viewport's camera control lists them. */
export function cameraActions(cameras: readonly { id: string; label: string }[], select: (id: string) => void): Action[] {
  return cameras.slice(0, 4).map((camera, i) => ({ id: `camera.${camera.id}`, label: `${camera.label} camera`, group: 'Cameras', keys: [String(i + 1)], run: () => select(camera.id) }));
}
