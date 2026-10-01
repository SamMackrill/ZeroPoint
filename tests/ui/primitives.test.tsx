// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { InfoTip, LayerList, ParamRow, Readouts, Segmented, ToastProvider, useToast, type Visibility } from '../../src/ui';

/** A ParamRow wired to local state, reporting each change. */
function Wavelength({ onChange = () => undefined }: { onChange?(value: number): void }) {
  const [value, setValue] = useState(625);
  return <ParamRow label="Wavelength" unit="nm" min={380} max={780} step={1} defaultValue={550} value={value}
    onChange={next => { setValue(next); onChange(next); }}/>;
}

describe('ParamRow', () => {
  it('commits typed values with units on Enter, clamped to the range', async () => {
    const onChange = vi.fn();
    render(<Wavelength onChange={onChange}/>);
    const field = screen.getByRole('textbox', { name: 'Wavelength' });
    await userEvent.clear(field);
    await userEvent.type(field, '700 nm{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(700);
    expect(field).toHaveProperty('value', '700');
    await userEvent.clear(field);
    await userEvent.type(field, '9000{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(780);
  });
  it('reverts on Esc and on text without a number', async () => {
    const onChange = vi.fn();
    render(<Wavelength onChange={onChange}/>);
    const field = screen.getByRole('textbox', { name: 'Wavelength' });
    await userEvent.clear(field);
    await userEvent.type(field, '700{Escape}');
    expect(field).toHaveProperty('value', '625');
    await userEvent.clear(field);
    await userEvent.type(field, 'abc{Enter}');
    expect(field).toHaveProperty('value', '625');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('nudges with the arrow keys, ×10 with Shift', async () => {
    const onChange = vi.fn();
    render(<Wavelength onChange={onChange}/>);
    const field = screen.getByRole('textbox', { name: 'Wavelength' });
    field.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(626);
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith(616);
  });
  it('shows the extra place an Alt nudge adds, so editing keeps it', async () => {
    const onChange = vi.fn();
    render(<Wavelength onChange={onChange}/>);
    const field = screen.getByRole('textbox', { name: 'Wavelength' });
    field.focus();
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(onChange).toHaveBeenLastCalledWith(625.1);
    expect(field).toHaveProperty('value', '625.1');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it('resets to the scenario value on a double-click of the label', async () => {
    const onChange = vi.fn();
    render(<Wavelength onChange={onChange}/>);
    await userEvent.dblClick(screen.getByText('Wavelength'));
    expect(onChange).toHaveBeenLastCalledWith(550);
  });
  it('moves with the slider keyboard', async () => {
    const onChange = vi.fn();
    render(<Wavelength onChange={onChange}/>);
    screen.getByRole('slider', { name: 'Wavelength' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(626);
  });
  it('marks restart-required and pending parameters', () => {
    const { container } = render(<ParamRow label="Seed" min={0} max={9} step={1} value={3} onChange={() => undefined} restart dirty/>);
    expect(screen.getByLabelText('applies on restart')).toBeTruthy();
    expect(container.querySelector('.param-row.is-dirty')).toBeTruthy();
  });
});

describe('Segmented', () => {
  const options = [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }, { value: 'z', label: 'Z' }] as const;
  it('selects an option and never deselects the current one', async () => {
    const onChange = vi.fn();
    render(<Segmented label="Axis" options={options} value="x" onChange={onChange}/>);
    await userEvent.click(screen.getByRole('radio', { name: 'Y' }));
    expect(onChange).toHaveBeenLastCalledWith('y');
    await userEvent.click(screen.getByRole('radio', { name: 'X' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('radio', { name: 'X' }).getAttribute('aria-checked')).toBe('true');
  });
});

describe('LayerList', () => {
  const groups = [
    { title: 'Medium', layers: [{ key: 'pairs', label: 'Zepton pairs' }, { key: 'shells', label: 'Shell sampling', control: <span>Slice Z</span> }] },
    { title: 'Fields', layers: [{ key: 'faraday', label: 'Faraday lines' }] },
  ];
  /** A LayerList wired to local state. */
  function Layers() {
    const [visible, setVisible] = useState<Visibility>({ pairs: true, shells: false, faraday: true });
    return <LayerList groups={groups} visible={visible} onChange={setVisible}/>;
  }
  it('toggles layers, shows inline controls only while visible, and solos with Alt-click', async () => {
    render(<Layers/>);
    const shells = screen.getByRole('button', { name: 'Shell sampling' });
    expect(shells.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText('Slice Z')).toBeNull();
    await userEvent.click(shells);
    expect(shells.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Slice Z')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Faraday lines' }), { altKey: true });
    expect(['Zepton pairs', 'Shell sampling', 'Faraday lines'].map(name => screen.getByRole('button', { name }).getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
    fireEvent.click(screen.getByRole('button', { name: 'Faraday lines' }), { altKey: true });
    expect(['Zepton pairs', 'Shell sampling', 'Faraday lines'].map(name => screen.getByRole('button', { name }).getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);
  });
});

describe('InfoTip', () => {
  it('opens on click, offers More in About, and closes on Esc', async () => {
    const onMore = vi.fn();
    render(<InfoTip label="Turn gain" onMore={onMore}>Magnifies each local turn for visibility.</InfoTip>);
    await userEvent.click(screen.getByRole('button', { name: 'About Turn gain' }));
    expect(screen.getByText('Magnifies each local turn for visibility.')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Magnifies each local turn for visibility.')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'About Turn gain' }));
    await userEvent.click(screen.getByRole('button', { name: 'More in About ›' }));
    expect(onMore).toHaveBeenCalledOnce();
    expect(screen.queryByText('Magnifies each local turn for visibility.')).toBeNull();
  });
});

describe('Readouts', () => {
  it('lists values with units and copies a value with its unit', async () => {
    const user = userEvent.setup();
    render(<Readouts copyable items={[{ label: 'Spin rate', value: '21.23', unit: '°/τ' }, { label: 'Generation', value: '3' }]}/>);
    expect(screen.getByText('Spin rate')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Copy Spin rate' }));
    expect(await navigator.clipboard.readText()).toBe('21.23 °/τ');
  });
});

describe('Toast', () => {
  /** A button that raises a toast with an Undo action. */
  function Switcher({ onUndo }: { onUndo(): void }) {
    const toast = useToast();
    return <button type="button" onClick={() => toast.show({ message: 'Switched to Moving', action: { label: 'Undo', run: onUndo } })}>Switch</button>;
  }
  it('shows a message with an action and closes after 5 s', () => {
    vi.useFakeTimers();
    try {
      const onUndo = vi.fn();
      render(<ToastProvider><Switcher onUndo={onUndo}/></ToastProvider>);
      fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
      expect(screen.getByText('Switched to Moving')).toBeTruthy();
      act(() => { vi.advanceTimersByTime(4900); });
      expect(screen.getByText('Switched to Moving')).toBeTruthy();
      act(() => { vi.advanceTimersByTime(200); });
      expect(screen.queryByText('Switched to Moving')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(onUndo).toHaveBeenCalledOnce();
      expect(screen.queryByText('Switched to Moving')).toBeNull();
    } finally { vi.useRealTimers(); }
  });
  it('stays open while focus is inside, even after the pointer leaves', () => {
    vi.useFakeTimers();
    try {
      render(<ToastProvider><Switcher onUndo={() => undefined}/></ToastProvider>);
      fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
      const toast = screen.getByText('Switched to Moving').parentElement as HTMLElement;
      fireEvent.pointerEnter(toast);
      fireEvent.focus(screen.getByRole('button', { name: 'Undo' }));
      fireEvent.pointerLeave(toast);
      act(() => { vi.advanceTimersByTime(6000); });
      expect(screen.getByText('Switched to Moving')).toBeTruthy();
      fireEvent.blur(screen.getByRole('button', { name: 'Undo' }), { relatedTarget: screen.getByRole('button', { name: 'Dismiss' }) });
      act(() => { vi.advanceTimersByTime(6000); });
      expect(screen.getByText('Switched to Moving')).toBeTruthy();
      fireEvent.blur(screen.getByRole('button', { name: 'Dismiss' }), { relatedTarget: null });
      act(() => { vi.advanceTimersByTime(5100); });
      expect(screen.queryByText('Switched to Moving')).toBeNull();
    } finally { vi.useRealTimers(); }
  });
  it('keeps at most three toasts', () => {
    render(<ToastProvider><Switcher onUndo={() => undefined}/></ToastProvider>);
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
    expect(screen.getAllByText('Switched to Moving')).toHaveLength(3);
  });
  it('requires a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Switcher onUndo={() => undefined}/>)).toThrow('useToast must be used inside a ToastProvider.');
    vi.mocked(console.error).mockRestore();
  });
});
