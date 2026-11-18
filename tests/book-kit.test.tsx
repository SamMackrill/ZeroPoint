// @vitest-environment jsdom
// The book companion's diagram kit and shell: field lines that should close do close, and every companion page can be
// reached from the narrow-screen drawer as well as from the header.
import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BookApp } from '../src/book/BookApp';
import { readdirSync, readFileSync } from 'node:fs';
import { mediumAt } from '../src/book/chapters/ch20';
import { Dial, FigureRunning, RunningReport, Slider, Spin, Still, traceField, usePlayback, wireField } from '../src/book/kit';

describe('book companion: kit', () => {
  it('traces the circular field line round a single wire back to its start', () => {
    const field = (x: number, y: number) => wireField([{ x: 360, y: 180, i: 1 }], x, y);
    const { points, closed } = traceField(field, 400, 180, 1, { w: 720, h: 360 });
    expect(closed).toBe(true);
    for (const [x, y] of points) expect(Math.hypot(x - 360, y - 180)).toBeCloseTo(40, 0);
  });
});

describe('book companion: shell', () => {
  it('lists the companion’s pages in the drawer as well as the header', () => {
    location.hash = '#/';
    const { container } = render(<BookApp/>);
    for (const nav of [container.querySelector('.bk-top-links')!, container.querySelector('.bk-side-links')!]) {
      const hrefs = within(nav as HTMLElement).getAllByRole('link').map(a => a.getAttribute('href'));
      expect(hrefs).toEqual(expect.arrayContaining(['#/', '#/guide', '#/future']));
    }
  });
});

describe('book companion: rotation arrows step aside while a figure plays', () => {
  it('shows a Still annotation when the figure is still, and fades it while it runs', async () => {
    const { container, rerender } = render(<svg><FigureRunning.Provider value={false}><Still><circle/></Still></FigureRunning.Provider></svg>);
    expect(container.querySelector('.bk-still')!.classList.contains('is-running')).toBe(false);
    rerender(<svg><FigureRunning.Provider value={true}><Still><circle/></Still></FigureRunning.Provider></svg>);
    expect(container.querySelector('.bk-still')!.classList.contains('is-running')).toBe(true);
  });

  it('fades every rotation arrow while the figure runs, except a steady one (a key or a measure)', () => {
    const { container } = render(<svg><FigureRunning.Provider value={true}><Spin x={0} y={0} r={10}/><Spin x={0} y={0} r={10} steady/></FigureRunning.Provider></svg>);
    expect([...container.querySelectorAll('.bk-still')].map(g => g.classList.contains('is-running'))).toEqual([true, false]);
  });

  it('has each clock report to its card whether it is playing, and stop reporting when it goes', () => {
    const calls: boolean[] = [];
    /** A diagram with one clock, which starts playing. */
    function Clock() { usePlayback(); return null; }
    const { unmount } = render(<RunningReport.Provider value={(_key, on) => calls.push(on)}><Clock/></RunningReport.Provider>);
    expect(calls.at(-1)).toBe(true);
    unmount();
    expect(calls.at(-1)).toBe(false);
  });

  it('keeps room for a slider’s longest reading, so its label does not rewrap as it moves', () => {
    const { container } = render(<Slider label="Distance" value={0} min={0} max={2} step={1} onChange={() => {}} show={v => ['1 µm', '1.78 µm', '10 µm'][v]}/>);
    expect(container.querySelector('output')!.style.minWidth).toBe('7ch');
  });

  it('reserves room for a reading that only one step of the range gives, and probes no value outside the range', () => {
    const seen: number[] = [];
    const { container } = render(<Slider label="Rate" value={0} min={0} max={120} step={1} onChange={() => {}} show={v => { seen.push(v); return v === 1 ? 'long reading' : '0'; }}/>);
    expect(container.querySelector('.bk-control')!.classList.contains('is-stacked')).toBe(true);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(120);
    render(<Slider label="Only" value={0} min={0} max={0} step={1} onChange={() => {}} show={v => ['zero'][v]}/>); // must not throw
  });

  it('names the refraction explorer’s medium from the value shown, not the current one', () => {
    expect(mediumAt(2.42)?.name).toBe('diamond');
    expect(mediumAt(1.515)?.name).toBe('typical glass');
    expect(mediumAt(1.9)).toBeUndefined();
  });

  it('every slider reads its value from the value it is given, which the room for its longest reading relies on', () => {
    const dir = 'src/book/chapters';
    const stale = readdirSync(dir).filter(f => /show=\{\(\) =>/.test(readFileSync(`${dir}/${f}`, 'utf8')));
    expect(stale).toEqual([]);
  });

  it('turns a dial with the keys, in whole steps, and never past its ends', () => {
    let value = 0;
    const { getByRole, rerender } = render(<Dial label="Current" value={value} min={-1} max={1} step={0.1} onChange={v => { value = v; }} show={v => `${v}`}/>);
    const press = (key: string) => { fireEvent.keyDown(getByRole('slider'), { key }); rerender(<Dial label="Current" value={value} min={-1} max={1} step={0.1} onChange={v => { value = v; }} show={v => `${v}`}/>); };
    press('ArrowRight'); expect(value).toBe(0.1);
    press('PageDown'); expect(value).toBe(-0.9);
    press('PageDown'); expect(value).toBe(-1); // held at the end
    press('End'); expect(value).toBe(1);
    expect(getByRole('slider').getAttribute('aria-valuetext')).toBe('1');
  });
});
