import { describe, expect, it, vi } from 'vitest';
import { Medium } from '../src/model/Medium';
import { DEFAULT_PARAMETERS } from '../src/model/types';

describe('Medium B worker', () => {
  it('catches up more than one Medium.step batch (10,000 ticks) behind A', async () => {
    const replies: unknown[] = [], scope = { postMessage: vi.fn((reply: unknown) => replies.push(reply)), onmessage: null as null | ((event: { data: unknown }) => void) };
    vi.stubGlobal('self', scope);
    await import('../src/simulation/compareWorker');
    const checkpoint = new Medium(7, { ...DEFAULT_PARAMETERS, birthRate: 50 }).serialize();
    scope.onmessage!({ data: { type: 'pin', checkpoint } });
    scope.onmessage!({ data: { type: 'advance', tick: 25_000 } });
    expect(replies.at(-1)).toMatchObject({ type: 'diagnostics', tick: 25_000, diagnostics: { tick: 25_000 } });
    vi.unstubAllGlobals();
  }, 60_000);
});
