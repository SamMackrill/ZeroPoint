// Pure visibility updates for LayerList (docs/ui-redesign-plan.html §07): toggle one layer, or solo it with Alt-click.

/** Which layers are shown, by layer key. */
export type Visibility = Record<string, boolean>;

/** Toggle one layer. */
export function toggleLayer(visible: Visibility, key: string): Visibility {
  return { ...visible, [key]: !visible[key] };
}

/**
 * Solo a layer among `keys` (the layers listed): show only it. Soloing the layer that is already the only one shown
 * shows every listed layer again, so a second Alt-click undoes the solo.
 */
export function soloLayer(visible: Visibility, keys: readonly string[], key: string): Visibility {
  const alreadySolo = keys.every(k => Boolean(visible[k]) === (k === key));
  return { ...visible, ...Object.fromEntries(keys.map(k => [k, alreadySolo || k === key])) };
}
