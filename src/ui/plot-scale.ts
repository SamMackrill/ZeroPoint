// Pure geometry for the shared Plot (docs/ui-redesign-plan.html §12): scales, ticks, gap-aware paths, nearest-sample
// lookup and CSV export. Kept free of React so it can be unit-tested directly.

/** Linear or base-10 logarithmic axis. */
export type ScaleKind = 'linear' | 'log';

/** A sample value; null (or any non-finite number) is a gap, e.g. a masked or excluded sample. */
export type Sample = number | null;

/** Whether a sample can be drawn on an axis of this kind (log axes need positive values). */
export const drawable = (value: Sample, kind: ScaleKind = 'linear'): value is number =>
  value !== null && Number.isFinite(value) && (kind === 'linear' || value > 0);

/** Map a value from a domain to a range, linearly or by log10. */
export function scale(value: number, [d0, d1]: readonly [number, number], [r0, r1]: readonly [number, number], kind: ScaleKind = 'linear'): number {
  const t = kind === 'log' ? (Math.log10(value) - Math.log10(d0)) / (Math.log10(d1) - Math.log10(d0)) : (value - d0) / (d1 - d0);
  return r0 + (Number.isFinite(t) ? t : 0.5) * (r1 - r0);
}

/**
 * The extent of the drawable values (plus any extra values such as a reference line), padded by `pad` of the span on
 * a linear axis. An empty or flat extent widens to stay drawable. Log axes are padded by a fraction of a decade.
 */
export function extent(values: readonly Sample[], kind: ScaleKind = 'linear', pad = 0.08): [number, number] {
  const finite = values.filter((v): v is number => drawable(v, kind));
  if (!finite.length) return kind === 'log' ? [1, 10] : [0, 1];
  let lo = Math.min(...finite), hi = Math.max(...finite);
  if (kind === 'log') {
    const [a, b] = [Math.log10(lo), Math.log10(hi)], span = Math.max(b - a, 1) * pad;
    return [10 ** (a - span), 10 ** (b + span)];
  }
  if (lo === hi) { const d = Math.abs(lo) || 1; lo -= d * 0.5; hi += d * 0.5; }
  const span = (hi - lo) * pad;
  return [lo - span, hi + span];
}

/** Three ticks: the ends and the middle of the domain (the geometric middle on a log axis). */
export function ticks3([d0, d1]: readonly [number, number], kind: ScaleKind = 'linear'): [number, number, number] {
  return [d0, kind === 'log' ? Math.sqrt(d0 * d1) : (d0 + d1) / 2, d1];
}

/**
 * An SVG path through the drawable samples, starting a new subpath after each gap so masked samples never get a
 * line bridged across them. `x` and `values` are parallel arrays; points map through the given projections.
 */
export function linePath(x: readonly number[], values: readonly Sample[], px: (x: number) => number, py: (y: number) => number, kinds: { x?: ScaleKind; y?: ScaleKind } = {}): string {
  let path = '', pen = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!drawable(v, kinds.y) || !drawable(x[i], kinds.x)) { pen = false; continue; }
    path += `${pen ? 'L' : 'M'}${round(px(x[i]))} ${round(py(v))}`;
    pen = true;
  }
  return path;
}

/** The closed area under each run of a line, down to a baseline, with the same gaps as linePath. */
export function areaPath(x: readonly number[], values: readonly Sample[], px: (x: number) => number, py: (y: number) => number, baseline: number): string {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  values.forEach((v, i) => {
    if (drawable(v) && drawable(x[i])) run.push([round(px(x[i])), round(py(v))]);
    else if (run.length) { runs.push(run); run = []; }
  });
  if (run.length) runs.push(run);
  return runs.filter(r => r.length > 1).map(r => `M${r[0][0]} ${baseline}${r.map(([a, b]) => `L${a} ${b}`).join('')}L${r.at(-1)![0]} ${baseline}Z`).join('');
}

/** Index of the sample whose x is nearest to `target` (x sorted ascending); -1 for no samples. */
export function nearestIndex(x: readonly number[], target: number): number {
  if (!x.length) return -1;
  let lo = 0, hi = x.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (x[mid] <= target) lo = mid; else hi = mid; }
  return Math.abs(x[hi] - target) < Math.abs(x[lo] - target) ? hi : lo;
}

/** Quote a CSV field when it contains a comma, quote or newline. */
const csvField = (text: string) => (/[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text);

/** CSV of exactly what is plotted: one x column and one column per series, gaps left empty. */
export function plotCsv(xHeader: string, x: readonly number[], series: readonly { label: string; values: readonly Sample[] }[]): string {
  const header = [xHeader, ...series.map(s => s.label)].map(csvField).join(',');
  const rows = x.map((xv, i) => [xv, ...series.map(s => s.values[i])].map(v => (drawable(v) ? String(v) : '')).join(','));
  return [header, ...rows].join('\n') + '\n';
}

/** Round SVG coordinates to 0.01 so paths stay compact. */
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Compact tick and readout text: three significant figures with trailing zeros removed, thousands separated, and
 * exponent form for very large or very small magnitudes (|v| >= 1e5 or 0 < |v| < 1e-3). Uses a true minus sign.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '–';
  const abs = Math.abs(value);
  const text = abs !== 0 && (abs >= 1e5 || abs < 1e-3)
    ? value.toExponential(2).replace(/\.?0+e/, 'e')
    : Number(value.toPrecision(3)).toLocaleString('en-GB', { maximumFractionDigits: 6 });
  return text.replace('-', '−');
}
