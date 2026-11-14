// The double slit drawn as Fleming draws it (The Zero-Point Universe Fig. 19-3): the page is the plane the zeptons
// rotate in, the photon travels up it from A to B, and the wall runs across with a slit to either side of the path.
import { memo, useMemo } from 'react';
import { Plot } from '../ui/Plot';
import { palette } from '../ui/palette';
import {
  LIGHT_REACH, PATH_LENGTH, SLIT_DT, SLIT_END_TICK, WALL_AT, centralPair, fieldAt, fieldOnWall, openings, pairCount, slitReadout, wallCrossing,
  type Point, type SlitParameters,
} from './model';

/** The scene layers the diagram can show. */
export interface SlitLayers { zeptons: boolean; fields: boolean; routes: boolean; reach: boolean; path: boolean }

const WIDTH = 760, HEIGHT = 440;
/** Pixels per wavelength. Fleming's own figure is far larger in wavelengths; this scale keeps a pair visible. */
const SCALE = 44;
/** Half the drawn width of the wall, in λ. */
const WALL_HALF = 8.2;
const sx = (x: number) => WIDTH / 2 + x * SCALE, sy = (y: number) => 396 - y * SCALE;

/** A repeatable value in [0, 1) for drawing slot `n`. */
const seeded = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** One surrounding zepton: where it sits and how it lies when no field reaches it. */
interface Zepton { at: Point; rest: Point }

/** The surrounding zeptons: a jittered grid across the page with seeded resting orientations. None sits on the wall. */
const ZEPTONS: readonly Zepton[] = Array.from({ length: 18 * 31 }, (_, i) => {
  const column = i % 31, row = Math.floor(i / 31), angle = 2 * Math.PI * seeded(i * 3 + 2);
  return { at: [-7.5 + column * 0.5 + (seeded(i * 3) - 0.5) * 0.2, -0.25 + row * 0.5 + (seeded(i * 3 + 1) - 0.5) * 0.2] as Point, rest: [Math.cos(angle), Math.sin(angle)] as Point };
});

/**
 * How far a surrounding zepton is drawn turned toward the central pair, from 0 to 1. The field falls with the inverse
 * square of distance, so the true bias is slight; the fourth root keeps the far field visible. A display choice.
 */
export const shownResponse = (envelope: number) => Math.min(1, Math.max(0, envelope) ** 0.25);

/** The surrounding zeptons, each turned toward the central pair's orientation by the field that reaches it. */
function Zeptons({ params, tick }: { params: SlitParameters; tick: number }) {
  const pair = centralPair(params, tick), half = 0.15 * SCALE;
  return <g data-testid="slit-zeptons">{ZEPTONS.map((z, i) => {
    const w = shownResponse(fieldAt(params, tick, z.at).envelope);
    const dx = (1 - w) * z.rest[0] + w * pair.direction[0], dy = (1 - w) * z.rest[1] + w * pair.direction[1], n = Math.hypot(dx, dy) || 1;
    const x = sx(z.at[0]), y = sy(z.at[1]), ux = dx / n * half, uy = -dy / n * half;
    // A zepton no field reaches stays grey; one the field reaches brightens with the field's strength.
    const colour = w > 0 ? palette.dataE : palette.text4, opacity = w > 0 ? 0.3 + 0.7 * w : 0.45;
    return <g key={i} stroke={colour} fill={colour} opacity={opacity}><line x1={x - ux} y1={y - uy} x2={x + ux} y2={y + uy} strokeWidth={1 + 0.8 * w}/><circle cx={x + ux} cy={y + uy} r="1.7" stroke="none"/></g>;
  })}</g>;
}

/** The wall with its two slits (or nothing), the source A and the absorber B. They change only with the geometry. */
const Apparatus = memo(function Apparatus({ params }: { params: SlitParameters }) {
  const [left, right] = openings(params), y = sy(WALL_AT);
  return <g>
    {params.wall === 'slits' && <g stroke={palette.text2} strokeWidth="4" strokeLinecap="butt" data-testid="slit-wall">
      <line x1={sx(-WALL_HALF)} x2={sx(left[0])} y1={y} y2={y}/><line x1={sx(left[1])} x2={sx(right[0])} y1={y} y2={y}/><line x1={sx(right[1])} x2={sx(WALL_HALF)} y1={y} y2={y}/>
    </g>}
    <circle cx={sx(0)} cy={sy(0)} r="5" fill={palette.text}/><text x={sx(0) - 16} y={sy(0) + 6} textAnchor="end">A</text>
    <text x={sx(0) - 16} y={sy(PATH_LENGTH) + 6} textAnchor="end">B</text>
    <g stroke={palette.text3} fill={palette.text3}><line x1={sx(0.9)} x2={sx(0.9)} y1={sy(0.1)} y2={sy(0.9)} strokeWidth="1.5"/><path d={`M ${sx(0.9)} ${sy(1.05)} l -4 8 h 8 z`} stroke="none"/></g>
    <text x={sx(0.9) + 9} y={sy(0.45)} className="slit-svg-muted">c</text>
  </g>;
});

/** The straight path from A to B with the fixed centres of the pairs the run induces. */
const Path = memo(function Path({ params }: { params: SlitParameters }) {
  const count = pairCount(params), x = sx(0);
  return <g stroke={palette.line2}>
    <line x1={x} x2={x} y1={sy(0)} y2={sy(PATH_LENGTH)} strokeDasharray="3 5"/>
    {Array.from({ length: count }, (_, i) => <line key={i} x1={x - 4} x2={x + 4} y1={sy((i + 0.5) * 0.5)} y2={sy((i + 0.5) * 0.5)}/>)}
  </g>;
});

/** The band a field held to light speed could fill: half a wavelength to either side of the path. */
const Reach = memo(function Reach({ params }: { params: SlitParameters }) {
  const top = params.wall === 'slits' && params.fields === 'light' ? WALL_AT : PATH_LENGTH;
  return <g data-testid="slit-reach">
    <rect x={sx(-LIGHT_REACH)} y={sy(top)} width={2 * LIGHT_REACH * SCALE} height={top * SCALE} fill={palette.dataMark} fillOpacity=".1" stroke={palette.dataMarkLo} strokeDasharray="4 4"/>
    <text x={sx(LIGHT_REACH) + 8} y={sy(1.6)} className="slit-svg-muted" fill={palette.dataMark}>λ/2 at light speed</text>
  </g>;
});

/** The shortest routes from the active pair through each slit to B, while the pair is still short of the wall. */
function Routes({ params, tick }: { params: SlitParameters; tick: number }) {
  const pair = centralPair(params, tick), b: Point = [0, PATH_LENGTH];
  if (!pair.active || pair.centre[1] > WALL_AT) return null;
  return <g fill="none" stroke={palette.accent2} strokeWidth="1.2" strokeDasharray="2 5" data-testid="slit-routes">
    {openings(params).map((opening, i) => {
      const x = wallCrossing(opening, pair.centre, b);
      return <polyline key={i} points={`${sx(pair.centre[0])},${sy(pair.centre[1])} ${sx(x)},${sy(WALL_AT)} ${sx(b[0])},${sy(b[1])}`}/>;
    })}
  </g>;
}

/** The active central pair: its two charges about a fixed centre, and the E and B it produces. */
function CentralPair({ params, tick, fields }: { params: SlitParameters; tick: number; fields: boolean }) {
  const pair = centralPair(params, tick);
  if (!pair.active) return null;
  const cx = sx(pair.centre[0]), cy = sy(pair.centre[1]), half = Math.max(pair.separation, 0.04) / 2 * SCALE;
  const ux = pair.direction[0] * half, uy = -pair.direction[1] * half;
  // E is the transverse part of the pair's moment; it points toward the positive charge (book Fig. 6-7).
  const e = pair.polarity * Math.sin(pair.turn) ** 2, length = e * 1.1 * SCALE, sign = Math.sign(length);
  return <g data-testid="slit-pair">
    <line x1={cx - ux} y1={cy - uy} x2={cx + ux} y2={cy + uy} stroke={palette.text3}/>
    <circle cx={cx - ux} cy={cy - uy} r="4.5" fill={palette.dataNeg}/><circle cx={cx + ux} cy={cy + uy} r="4.5" fill={palette.dataPos}/>
    {fields && Math.abs(length) > 6 && <g stroke={palette.dataE} fill={palette.dataE}>
      <line x1={cx} x2={cx + length - sign * 7} y1={cy - 13} y2={cy - 13} strokeWidth="2"/><path d={`M ${cx + length} ${cy - 13} l ${-sign * 9} -5 v 10 z`} stroke="none"/>
      <text x={cx + length + sign * 7} y={cy - 8} textAnchor={sign > 0 ? 'start' : 'end'} stroke="none" className="slit-svg-muted">E</text>
    </g>}
    {/* E × B lies along the travel direction, so B is into the page when E points right and out of it when E points left. */}
    {fields && Math.abs(e) > 0.08 && <g stroke={palette.dataB} fill="none">
      <circle cx={cx - 30} cy={cy + 16} r="6.5" strokeWidth="1.5"/>
      {e > 0 ? <path d={`M ${cx - 34.5} ${cy + 11.5} l 9 9 M ${cx - 34.5} ${cy + 20.5} l 9 -9`} strokeWidth="1.5"/> : <circle cx={cx - 30} cy={cy + 16} r="1.8" fill={palette.dataB} stroke="none"/>}
      <text x={cx - 41} y={cy + 21} textAnchor="end" stroke="none" fill={palette.dataB} className="slit-svg-muted">B</text>
    </g>}
  </g>;
}

/** B, the photon's place on the path, and what has become of it. */
function Outcome({ params, tick }: { params: SlitParameters; tick: number }) {
  const r = slitReadout(params, tick), x = sx(0), bx = sx(0), by = sy(PATH_LENGTH);
  return <g>
    {r.status === 'absorbed' && <circle cx={bx} cy={by} r="13" fill="none" stroke={palette.accent} strokeWidth="2"/>}
    <circle cx={bx} cy={by} r="5" fill={r.status === 'absorbed' ? palette.accent : palette.text}/>
    {r.status === 'travelling' && <path d={`M ${x + 17} ${sy(r.position)} l 9 -5 v 10 z`} fill={palette.dataMark} data-testid="slit-photon-mark"/>}
    {r.status === 'halted' && <g stroke={palette.danger} strokeWidth="2"><path d={`M ${x - 7} ${sy(WALL_AT) + 5} l 14 14 M ${x - 7} ${sy(WALL_AT) + 19} l 14 -14`}/></g>}
    <text x={bx + 20} y={by + 6} className="slit-svg-muted" data-testid="slit-outcome">
      {r.status === 'absorbed' ? 'absorbed all at once' : r.status === 'halted' ? 'nothing arrives' : ''}
    </text>
    {r.status === 'halted' && <text x={x + 16} y={sy(WALL_AT) + 30} className="slit-svg-muted" fill={palette.danger}>halted: no field reached a slit</text>}
  </g>;
}

/** What the photon is doing at this tick, in one line under the diagram. */
export function stateLine(params: SlitParameters, tick: number): string {
  const r = slitReadout(params, tick), pair = `Pair ${r.pair.index + 1} of ${pairCount(params)}`;
  if (r.status === 'absorbed') return `Absorbed at B at ${PATH_LENGTH.toFixed(2)} τ, the straight-line time`;
  if (r.status === 'halted') return 'Halted at the wall · no field reached a slit';
  if (params.fields === 'light') return `${pair} · its field stops λ/2 from the path`;
  if (params.wall === 'open') return `${pair} · its field reaches B directly`;
  return r.pair.centre[1] < WALL_AT ? `${pair} · its field reaches B through both slits` : `${pair} · beyond the wall`;
}

/** Say what the drawing shows at this tick, for assistive technology. */
function describe(params: SlitParameters, tick: number): string {
  const r = slitReadout(params, tick);
  const setting = params.wall === 'open' ? 'Nothing stands between source A and absorber B.' : `A wall with two slits ${params.slitWidth} wavelengths wide, each ${params.slitOffset} wavelengths from the straight path, stands between source A and absorber B.`;
  const speed = params.fields === 'light' ? ' The fields are held to light speed and reach half a wavelength from the path.' : '';
  const state = r.status === 'absorbed' ? 'The photon has been absorbed at B.' : r.status === 'halted' ? 'The photon has halted at the wall and nothing arrives at B.' : `Central pair ${r.pair.index + 1} of ${pairCount(params)} is turning ${r.position.toFixed(1)} wavelengths from A.`;
  return `${setting}${speed} ${state} Sizes are illustrative.`;
}

/**
 * The double-slit scene at one tick: the apparatus, the surrounding zeptons turned by the field that reaches them,
 * the active central pair with its E and B, and the photon's outcome.
 */
export function SlitDiagram({ params, tick, layers }: { params: SlitParameters; tick: number; layers: SlitLayers }) {
  return <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={describe(params, tick)} data-testid="slit-diagram">
    {layers.reach && <Reach params={params}/>}
    {layers.zeptons && <Zeptons params={params} tick={tick}/>}
    {layers.path && <Path params={params}/>}
    {layers.routes && params.wall === 'slits' && params.fields === 'fast' && <Routes params={params} tick={tick}/>}
    <Apparatus params={params}/>
    <CentralPair params={params} tick={tick} fields={layers.fields}/>
    <Outcome params={params} tick={tick}/>
  </svg>;
}

/**
 * The strength of the field arriving at B through the run, with the playhead at the current time. The scale is
 * logarithmic because the field that comes through the slits is a few thousandths of the field beside the pair.
 */
export function ArrivalPlot({ params, tick }: { params: SlitParameters; tick: number }) {
  const { times, values } = useMemo(() => {
    const ticks = Array.from({ length: SLIT_END_TICK + 1 }, (_, i) => i);
    return { times: ticks.map(t => t * SLIT_DT), values: ticks.map(t => Math.abs(fieldAt(params, t, [0, PATH_LENGTH]).electric)) };
  }, [params]);
  if (!values.some(v => v > 0)) return <p className="slit-plot-empty" data-testid="slit-arrival-plot">No field reaches B at any time in this run.</p>;
  return <Plot label="The strength of the field at B over the run, taken from the active central pair, on a logarithmic scale. It pulses once with each pair, falling to zero at every hand-off, and grows as the photon approaches."
    x={times} series={[{ key: 'b', label: '|E| at B', color: palette.dataE, values }]} xDomain={[0, PATH_LENGTH]} yScale="log" yDomain={[1e-5, 1]} yTicks={[1e-5, 1e-3, 1]} xTicks={[0, WALL_AT, PATH_LENGTH]} xUnit="τ" playhead={tick * SLIT_DT}
    caption="Field strength at B over the run · log scale" height={110} testId="slit-arrival-plot"/>;
}

/** The field along the wall at this instant, with the slit edges marked. */
export function WallPlot({ params, tick }: { params: SlitParameters; tick: number }) {
  const xs = useMemo(() => Array.from({ length: 129 }, (_, i) => -8 + i / 8), []);
  const values = xs.map(x => Math.abs(fieldOnWall(params, tick, x).electric));
  return <Plot label="The strength of the active pair's field along the wall at this instant, against distance from the straight path. The slit edges are marked."
    x={xs} series={[{ key: 'wall', label: '|E| on the wall', color: palette.dataE, values }]} xDomain={[-8, 8]} yScale="log" yDomain={[1e-4, 1]} yTicks={[1e-4, 1e-2, 1]} xTicks={[-8, 0, 8]} xUnit="λ"
    markers={openings(params).flatMap((o, i) => [{ x: o[0], label: `${i ? 'Right' : 'Left'} slit from ${o[0]} λ` }, { x: o[1], label: `${i ? 'Right' : 'Left'} slit to ${o[1]} λ` }])}
    caption="Field strength along the wall, now · log scale · slit edges marked" height={110} empty="No field reaches the wall at this instant." testId="slit-wall-plot"/>;
}
