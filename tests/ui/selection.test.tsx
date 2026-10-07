// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SELECTION_SHORTCUTS, useActions } from '../../src/workbench/actions';
import { CLICK_TOLERANCE_PX, isClick, useSelectionKeys } from '../../src/workbench/selection';

/** Mount the selection keys with the given state, and the registry's listener that runs them, as a lab does. */
function Keys(props: { active: boolean; hasSelection: boolean; onClear(): void; onFocus?(): void }) {
  useSelectionKeys(props); useActions(true, [SELECTION_SHORTCUTS.clear, SELECTION_SHORTCUTS.focus]);
  return <input aria-label="field"/>;
}

describe('selection', () => {
  it('treats small pointer movements as clicks and larger ones as drags', () => {
    expect(isClick({ x: 10, y: 10 }, { clientX: 13, clientY: 12 })).toBe(true);
    expect(isClick({ x: 10, y: 10 }, { clientX: 10 + CLICK_TOLERANCE_PX + 1, clientY: 10 })).toBe(false);
  });
  it('clears on Esc and focuses on F, but not from fields, with modifiers, when inactive or with nothing selected', () => {
    const onClear = vi.fn(), onFocus = vi.fn();
    const { rerender, getByLabelText } = render(<Keys active hasSelection onClear={onClear} onFocus={onFocus}/>);
    fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.keyDown(window, { key: 'f' });
    expect(onClear).toHaveBeenCalledTimes(1); expect(onFocus).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(getByLabelText('field'), { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(onClear).toHaveBeenCalledTimes(1); expect(onFocus).toHaveBeenCalledTimes(1);
    rerender(<Keys active={false} hasSelection onClear={onClear} onFocus={onFocus}/>);
    fireEvent.keyDown(window, { key: 'Escape' });
    rerender(<Keys active hasSelection={false} onClear={onClear} onFocus={onFocus}/>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
