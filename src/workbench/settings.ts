// Global settings (plan §05 A, §11 P5): reduced motion and debug telemetry apply to every lab, from the header's
// Settings popover, and persist in browser storage (in memory where storage is unavailable).
import { useSyncExternalStore } from 'react';
import { layoutStorage } from './Shell';

/** The workbench-wide settings. */
export interface Settings {
  /** Steady lobe sizes and no camera damping; defaults to the OS "reduce motion" preference. */
  reducedMotion: boolean;
  /** Model IDs and parameter revisions in the status bar. */
  telemetry: boolean;
  /** Medium's "Drag to orbit" hint has been dismissed once, so it no longer shows on later visits. */
  orbitHintSeen: boolean;
}

const KEY = 'zeropoint-settings';
const listeners = new Set<() => void>();
let current: Settings | null = null;

/** The OS reduce-motion preference (false where matchMedia is unavailable). */
const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Read the stored settings over the defaults, ignoring anything unparsable or of the wrong type. */
function load(): Settings {
  const defaults: Settings = { reducedMotion: prefersReducedMotion(), telemetry: false, orbitHintSeen: false };
  try {
    const stored = JSON.parse(layoutStorage().getItem(KEY) ?? '{}') as Partial<Record<keyof Settings, unknown>>;
    for (const key of Object.keys(defaults) as (keyof Settings)[]) if (typeof stored[key] === 'boolean') defaults[key] = stored[key];
  } catch { /* keep the defaults */ }
  return defaults;
}

/** The current settings. */
export function getSettings(): Settings { return current ??= load(); }

/** Change some settings, store them and notify every subscriber. A failed write (storage full or revoked) still applies them for this visit. */
export function updateSettings(changes: Partial<Settings>) {
  current = { ...getSettings(), ...changes };
  try { layoutStorage().setItem(KEY, JSON.stringify(current)); } catch (error) { console.warn('Settings will not be saved: browser storage refused the write.', error); }
  listeners.forEach(listener => listener());
}

/** Forget the cached settings so the next read reloads them (tests). */
export function resetSettingsForTests() { current = null; }

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** The current settings, re-rendering when any of them changes. */
export function useSettings(): Settings { return useSyncExternalStore(subscribe, getSettings, getSettings); }
