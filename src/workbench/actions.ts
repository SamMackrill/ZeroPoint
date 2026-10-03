// The action registry (plan §11 "Keyboard map", roadmap P6): every keyboard shortcut is an action with a label, a group
// and a binding. One listener per visible lab runs them, the Help sheet lists them, and the command palette (UI 15b)
// searches them.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { appliesTo, getPath, type ExperimentDefinition } from './definition';

/** Palette and Help-sheet groups, in display order. */
export const ACTION_GROUPS = ['Scenarios', 'Transport', 'Layers', 'Cameras', 'Selection', 'Setup', 'Parameters', 'Files', 'View', 'Help'] as const;
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
   * it but does not bind it; from the palette, it presses its key.
   */
  listOnly?: boolean;
  /** Not offered in the command palette (e.g. Apply, which needs focus in Setup). */
  palette?: false;
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
  // The listener reads the committed list: a layout effect updates it before any later keydown (render stays pure).
  // The visible lab's list is also what the command palette offers.
  const current = useRef(actions);
  useLayoutEffect(() => { current.current = actions; if (active) visible = actions; });
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

let visible: readonly Action[] = [];
/** The visible lab's actions, for the command palette. */
export const visibleActions = () => visible;

/** Press a binding as if from the keyboard, so a component that handles its own key (listOnly) acts on it. */
export function press(binding: string) {
  const parts = binding.split('+'), key = parts.at(-1)!, mods = new Set(parts.slice(0, -1));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: key === 'Space' ? ' ' : key, code: key === 'Space' ? 'Space' : '', bubbles: true, cancelable: true,
    ctrlKey: mods.has('Mod') && !MAC, metaKey: mods.has('Mod') && MAC, shiftKey: mods.has('Shift'), altKey: mods.has('Alt') }));
}

/** A shortcut its own component handles (listOnly), listed so the Help sheet and palette show the whole keyboard map. */
const listed = (id: string, label: string, group: ActionGroup, key: string): Action => ({ id, label, group, keys: [key], run: () => press(key), listOnly: true });

/** Shortcuts every lab has: the Shell's panels and focus mode, and Help. */
export const PANEL_SHORTCUTS: readonly Action[] = [
  listed('view.rail', 'Show or hide the rail', 'View', 'Mod+b'),
  listed('view.inspector', 'Show or hide the inspector', 'View', 'Mod+i'),
  listed('view.dock', 'Show or hide the dock', 'View', 'Mod+j'),
  listed('view.focus', 'Focus mode (hide the panels)', 'View', 'Mod+.'),
  listed('help.open', 'Help: About and shortcuts', 'Help', '?'),
  { ...listed('help.palette', 'Command palette', 'Help', 'Mod+k'), palette: false },
];
/** SetupPanel's own key, for labs with restart parameters. */
export const APPLY_SHORTCUT: Action = { ...listed('setup.apply', 'Apply pending changes', 'Setup', 'Mod+Enter'), palette: false };
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

/** Show or hide each of the scenario's layers by name (palette › Layers). */
export function layerActions(definition: ExperimentDefinition, scenario: string, view: object, onView: (key: string, value: boolean) => void): Action[] {
  return definition.layers.filter(l => appliesTo(l, scenario)).map(layer => {
    const on = !!getPath(view, layer.key);
    return { id: `layer.${layer.key}`, label: `${on ? 'Hide' : 'Show'} ${layer.label}`, group: 'Layers', run: () => onView(layer.key, !on) };
  });
}

/** Jump to a parameter's value field (palette › Parameters): open Setup, then focus and select the visible field. */
export function parameterActions(definition: ExperimentDefinition, scenario: string, openSetup: () => void): Action[] {
  return definition.params.filter(p => p.kind === 'range' && appliesTo(p, scenario)).map(param => ({
    id: `param.${param.key}`, label: param.label, group: 'Parameters', run: () => {
      openSetup();
      const focus = (tries: number) => {
        const field = [...document.querySelectorAll<HTMLInputElement>(`[data-testid="param-${param.key}"] input`)].find(f => f.offsetParent !== null);
        if (field) { field.focus(); field.select(); } else if (tries > 0) requestAnimationFrame(() => focus(tries - 1));
      };
      focus(10);
    },
  }));
}
