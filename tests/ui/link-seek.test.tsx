// @vitest-environment jsdom
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLinkSeek, usePendingLink, type PendingLink } from '../../src/workbench/urlState';

/** A lab's link wait, reporting whether the URL writer is held. */
function Lab({ pending, state, seek, done, onHold }: { pending: PendingLink | null; state: { parameters: object } | null; seek(tick: number): void; done(): void; onHold(hold: boolean): void }) {
  onHold(useLinkSeek(pending, done, state, seek));
  return null;
}

describe('useLinkSeek', () => {
  afterEach(() => { vi.useRealTimers(); });
  it('releases the URL writer after 3 s but still seeks when a slow worker reports the link\'s parameters', () => {
    vi.useFakeTimers();
    const seek = vi.fn(), done = vi.fn(), holds: boolean[] = [], pending = { params: { wavelength: 3 }, tick: 120 };
    const view = render(<Lab pending={pending} state={{ parameters: { wavelength: 2 } }} seek={seek} done={done} onHold={h => holds.push(h)}/>);
    expect(holds.at(-1)).toBe(true);
    act(() => { vi.advanceTimersByTime(3500); });
    expect(holds.at(-1)).toBe(false); // the writer is free again
    expect(done).not.toHaveBeenCalled(); // but the seek is still pending
    view.rerender(<Lab pending={pending} state={{ parameters: { wavelength: 3 } }} seek={seek} done={done} onHold={h => holds.push(h)}/>);
    expect(seek).toHaveBeenCalledWith(120);
    expect(done).toHaveBeenCalled();
  });
  it('forgets a link whose parameters never arrive after 30 s', () => {
    vi.useFakeTimers();
    const done = vi.fn();
    render(<Lab pending={{ params: { wavelength: 3 } }} state={{ parameters: { wavelength: 2 } }} seek={vi.fn()} done={done} onHold={() => undefined}/>);
    act(() => { vi.advanceTimersByTime(30_500); });
    expect(done).toHaveBeenCalled();
  });
});

describe('useUrlWriter', () => {
  afterEach(() => { vi.useRealTimers(); });
  it('does not overwrite a link that arrives while its write is pending', async () => {
    vi.useFakeTimers();
    const { useUrlWriter } = await import('../../src/workbench/urlState');
    function Writer({ hash }: { hash: string }) { useUrlWriter(true, false, hash); return null; }
    history.replaceState(null, '', '#/medium/balanced');
    render(<Writer hash="#/medium/balanced?separation=0.8"/>);
    history.replaceState(null, '', '#/light?sel=3'); window.dispatchEvent(new HashChangeEvent('hashchange')); // a link arrives
    act(() => { vi.advanceTimersByTime(400); });
    expect(location.hash).toBe('#/light?sel=3');
  });
});

describe('usePendingLink', () => {
  it('drops a seek for a link that was cancelled in the same render, before the state update lands', () => {
    const seekNow = vi.fn(), { result } = renderHook(() => usePendingLink(seekNow));
    const link = { params: { wavelength: 3 }, tick: 600 };
    act(() => result.current.set(link));
    // A rail choice cancels the link; an effect from the render that still saw it then asks for its seek.
    const staleSeek = result.current.seek;
    act(() => { result.current.set(null); staleSeek(600); });
    expect(seekNow).not.toHaveBeenCalled();
    expect(result.current.link).toBeNull();
  });
  it('passes the seek on while its link is still pending, and not for the tick of another link', () => {
    const seekNow = vi.fn(), { result } = renderHook(() => usePendingLink(seekNow));
    act(() => result.current.set({ params: {}, tick: 240 }));
    act(() => result.current.seek(600));
    expect(seekNow).not.toHaveBeenCalled();
    act(() => result.current.seek(240));
    expect(seekNow).toHaveBeenCalledWith(240);
    act(() => result.current.done());
    expect(result.current.link).toBeNull();
  });
});
