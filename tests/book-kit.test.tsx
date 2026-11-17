// @vitest-environment jsdom
// The book companion's diagram kit and shell: field lines that should close do close, and every companion page can be
// reached from the narrow-screen drawer as well as from the header.
import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BookApp } from '../src/book/BookApp';
import { traceField, wireField } from '../src/book/kit';

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
