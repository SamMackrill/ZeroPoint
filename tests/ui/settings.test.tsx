// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsMenu, StatusBar } from '../../src/workbench/Chrome';
import { getSettings, resetSettingsForTests, updateSettings } from '../../src/workbench/settings';

describe('global settings', () => {
  beforeEach(() => { localStorage.clear(); resetSettingsForTests(); });

  it('defaults to no telemetry, keeps changes in storage and ignores malformed values', () => {
    expect(getSettings()).toMatchObject({ telemetry: false, orbitHintSeen: false });
    updateSettings({ telemetry: true, orbitHintSeen: true });
    resetSettingsForTests();
    expect(getSettings()).toMatchObject({ telemetry: true, orbitHintSeen: true });
    localStorage.setItem('zeropoint-settings', '{"telemetry":"yes","reducedMotion":true}');
    resetSettingsForTests();
    expect(getSettings()).toMatchObject({ telemetry: false, reducedMotion: true });
    localStorage.setItem('zeropoint-settings', 'not json');
    resetSettingsForTests();
    expect(getSettings().telemetry).toBe(false);
  });

  it('applies and announces changes even when storage refuses the write', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<StatusBar running={false} telemetry={['model/1']}/>);
    act(() => { updateSettings({ telemetry: true }); });
    expect(getSettings().telemetry).toBe(true);
    expect(screen.getByText('model/1')).toBeTruthy();
    // Every lab's telemetry starts with the shared frame rate and WebGL (jsdom has none).
    expect(screen.getByText('0 fps')).toBeTruthy();
    expect(screen.getByText('WebGL unavailable')).toBeTruthy();
    write.mockRestore(); warn.mockRestore();
  });

  it('toggles reduced motion and telemetry from the header popover; the status bar shows telemetry only when on', () => {
    render(<><SettingsMenu/><StatusBar running={false} items={['Seed 42']} telemetry={['medium-lifecycle/2']}/></>);
    expect(screen.queryByText('medium-lifecycle/2')).toBeNull();
    fireEvent.click(screen.getByTestId('settings'));
    const motion = screen.getByTestId('setting-reduced-motion') as HTMLInputElement, telemetry = screen.getByTestId('setting-telemetry') as HTMLInputElement;
    const reduced = motion.checked;
    act(() => { fireEvent.click(motion); });
    expect(getSettings().reducedMotion).toBe(!reduced);
    act(() => { fireEvent.click(telemetry); });
    expect(telemetry.checked).toBe(true);
    expect(screen.getByText('medium-lifecycle/2')).toBeTruthy();
    expect(screen.getByText('Seed 42')).toBeTruthy();
  });
});
