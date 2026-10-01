import { Download } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { downloadFile } from '../persistence/experiment';
import { areaPath, drawable, extent, formatNumber, linePath, nearestIndex, plotCsv, scale, ticks3, type Sample, type ScaleKind } from './plot-scale';
import './plot.css';

/** One plotted series. Colours come from the data tokens in palette.ts; dashed is reserved for comparison (B) runs. */
export interface PlotSeries {
  key: string;
  label: string;
  color: string;
  /** One value per x; null marks a gap (a masked or excluded sample) and breaks the line. */
  values: readonly Sample[];
  dashed?: boolean;
  /** A faint wash under the line (single-series magnitude plots). */
  area?: boolean;
}

/** A marked position: a vertical line at x, or a ringed point when y is given. */
export interface PlotMarker {
  x: number;
  y?: number;
  label: string;
}

/** Props for Plot. */
export interface PlotProps {
  /** What the plot shows, for assistive technology. */
  label: string;
  /** Shared, ascending x positions. */
  x: readonly number[];
  series: readonly PlotSeries[];
  /** Caption under the x axis, e.g. "Normalized E projection". */
  caption?: string;
  xUnit?: string;
  yUnit?: string;
  xScale?: ScaleKind;
  yScale?: ScaleKind;
  xDomain?: readonly [number, number];
  yDomain?: readonly [number, number];
  /** Explicit ticks; the default is three (both ends and the middle). */
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  formatX?(value: number): string;
  formatY?(value: number): string;
  /** A horizontal reference value, e.g. ambient pressure. */
  reference?: number;
  /** The timeline's current position. */
  playhead?: number;
  markers?: readonly PlotMarker[];
  /** Plot area height in pixels (default 120). */
  height?: number;
  /** Shown instead of lines while there are fewer than two samples. */
  empty?: string;
  /** File name for "Export CSV" of exactly what is plotted; omit to hide the button. */
  csv?: string;
  testId?: string;
}

const W = 1000, H = 100;

/**
 * The shared plot (docs/ui-redesign-plan.html §12), replacing the per-lab SVG charts: three ticks per axis in mono
 * micro text, solid hairline grid, 2 px lines with gaps for masked samples, dashed comparison series, a playhead, a
 * hover or keyboard crosshair whose readout lists every series, a legend for two or more series, and CSV export.
 */
export function Plot({ label, x, series, caption, xUnit, yUnit, xScale = 'linear', yScale = 'linear', xDomain, yDomain, xTicks, yTicks, formatX = formatNumber, formatY = formatNumber, reference, playhead, markers = [], height = 120, empty, csv, testId }: PlotProps) {
  const readoutId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const xd = useMemo(() => xDomain ?? extent(x, xScale, 0), [xDomain, x, xScale]);
  const yd = useMemo(() => yDomain ?? extent([...series.flatMap(s => s.values), ...(reference === undefined ? [] : [reference]), ...markers.flatMap(m => (m.y === undefined ? [] : [m.y]))], yScale), [yDomain, series, reference, markers, yScale]);
  const px = (v: number) => scale(v, xd, [0, W], xScale);
  const py = (v: number) => scale(v, yd, [H, 0], yScale);
  const pct = (v: number, axis: 'x' | 'y') => (axis === 'x' ? px(v) / W : py(v) / H) * 100;
  const samples = x.filter(v => drawable(v, xScale)).length;
  const hasData = samples > 1 && series.some(s => s.values.filter(v => drawable(v, yScale)).length > 1);
  const active = hover !== null && hover < x.length ? hover : null;

  /** Move the crosshair to the sample nearest the pointer. */
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!hasData) return;
    const box = event.currentTarget.getBoundingClientRect(), t = (event.clientX - box.left) / Math.max(1, box.width);
    const target = xScale === 'log' ? 10 ** (Math.log10(xd[0]) + t * (Math.log10(xd[1]) - Math.log10(xd[0]))) : xd[0] + t * (xd[1] - xd[0]);
    setHover(nearestIndex(x, target));
  };

  /** Arrow keys step the crosshair through samples; Home and End jump to the ends, Esc hides it. */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!hasData) return;
    const last = x.length - 1, step = event.shiftKey ? 10 : 1;
    const next = event.key === 'ArrowRight' ? Math.min(last, (active ?? -1) + step) : event.key === 'ArrowLeft' ? Math.max(0, (active ?? last + 1) - step)
      : event.key === 'Home' ? 0 : event.key === 'End' ? last : event.key === 'Escape' ? null : undefined;
    if (next === undefined) return;
    event.preventDefault();
    setHover(next);
  };

  const readout = active === null ? '' : `${formatX(x[active])}${xUnit ? ` ${xUnit}` : ''}: ${series.map(s => `${s.label} ${drawable(s.values[active]) ? formatY(s.values[active] as number) : 'no value'}${yUnit ? ` ${yUnit}` : ''}`).join('; ')}`;
  const xt = xTicks ?? ticks3(xd, xScale), yt = yTicks ?? ticks3(yd, yScale);
  // The y unit rides on the highest tick rather than a separate label, so it never collides with the legend.
  const topTick = yt.reduce((top, t) => (py(t) < py(top) ? t : top), yt[0]);
  return (
    <figure className="plot-figure" data-testid={testId}>
      {(series.length > 1 || csv) && (
        <div className="plot-head">
          {series.length > 1 && (
            <ul className="plot-legend" aria-label="Series">
              {series.map(s => <li key={s.key}><svg width="16" height="6" aria-hidden="true"><line x1="0" y1="3" x2="16" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '4 3' : undefined}/></svg>{s.label}</li>)}
            </ul>
          )}
          {csv && <button type="button" className="plot-csv" disabled={!hasData} onClick={() => downloadFile(csv, plotCsv(xUnit ? `x (${xUnit})` : 'x', x, series), 'text/csv')}><Download size={12} aria-hidden="true"/>Export CSV</button>}
        </div>
      )}
      <div className="plot-body">
        <div className="plot-y" aria-hidden="true">
          {yt.map(t => <span key={t} style={{ top: `${pct(t, 'y')}%` }}>{formatY(t)}{yUnit && t === topTick && <small> {yUnit}</small>}</span>)}
        </div>
        <div className="plot-area" style={{ height }} tabIndex={hasData ? 0 : -1} role="img" aria-label={hasData ? `${label}. Use the arrow keys to read values.` : label}
          aria-describedby={readoutId} onPointerMove={onPointerMove} onPointerLeave={() => setHover(null)} onKeyDown={onKeyDown} onBlur={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            {yt.map(t => <line key={t} className="plot-grid" x1="0" x2={W} y1={py(t)} y2={py(t)}/>)}
            {reference !== undefined && <line className="plot-reference" x1="0" x2={W} y1={py(reference)} y2={py(reference)}/>}
            {hasData && series.filter(s => s.area).map(s => <path key={`${s.key}-area`} d={areaPath(x, s.values, px, py, H)} fill={s.color} fillOpacity="0.1" stroke="none"/>)}
            {hasData && series.map(s => <path key={s.key} d={linePath(x, s.values, px, py, { x: xScale, y: yScale })} className="plot-line" stroke={s.color} strokeDasharray={s.dashed ? '6 4' : undefined}/>)}
            {markers.filter(m => m.y === undefined && drawable(m.x, xScale)).map(m => <line key={m.label} className="plot-marker" x1={px(m.x)} x2={px(m.x)} y1="0" y2={H}/>)}
            {playhead !== undefined && drawable(playhead, xScale) && <line className="plot-playhead" x1={px(playhead)} x2={px(playhead)} y1="0" y2={H}/>}
            {active !== null && <line className="plot-crosshair" x1={px(x[active])} x2={px(x[active])} y1="0" y2={H}/>}
          </svg>
          {markers.filter(m => m.y !== undefined && drawable(m.x, xScale) && drawable(m.y, yScale)).map(m => <i key={m.label} className="plot-point" title={m.label} style={{ left: `${pct(m.x, 'x')}%`, top: `${pct(m.y as number, 'y')}%` }}/>)}
          {active !== null && series.map(s => drawable(s.values[active], yScale) && <i key={s.key} className="plot-hover-dot" style={{ left: `${pct(x[active], 'x')}%`, top: `${pct(s.values[active] as number, 'y')}%`, background: s.color }}/>)}
          {active !== null && (
            <div className={`plot-tooltip${pct(x[active], 'x') > 60 ? ' is-left' : ''}`} style={{ left: `${pct(x[active], 'x')}%` }} aria-hidden="true">
              <strong>{formatX(x[active])}{xUnit && <small> {xUnit}</small>}</strong>
              {series.map(s => <span key={s.key}><svg width="12" height="6"><line x1="0" y1="3" x2="12" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '4 3' : undefined}/></svg><b>{drawable(s.values[active]) ? formatY(s.values[active] as number) : '–'}{yUnit && <small> {yUnit}</small>}</b>{s.label}</span>)}
            </div>
          )}
          {!hasData && empty && <p className="plot-empty">{empty}</p>}
        </div>
      </div>
      <div className="plot-x" aria-hidden="true">
        {xt.map((t, i) => <span key={t} className={i === 0 ? 'is-first' : i === xt.length - 1 ? 'is-last' : undefined} style={{ left: `${pct(t, 'x')}%` }}>{formatX(t)}{xUnit && ` ${xUnit}`}</span>)}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
      <p id={readoutId} className="plot-readout" aria-live="polite">{readout}</p>
    </figure>
  );
}
