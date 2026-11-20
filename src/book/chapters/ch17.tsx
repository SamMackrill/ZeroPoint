// Chapter 17: Gravity (PDF pp. 129–136). Figures 17-1 to 17-5.
import { Suspense, lazy, useCallback, useId, useMemo, useState } from 'react';
import { Arrow, BlockArrow, Body, Choice, Diagram, FallbackOnError, Line, PlayBar, Readout, Remark, Slider, Stage, T, Toggle, canDraw3D, clamp, deg, fmt, pathThrough, rng, usePlayback } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';
import { ZEPTON_PAIR, dumbbell } from './shared';
import { ScientistLink } from '../../papertrails/PaperTrailsLink';

const W = 720;

/** The net push on each of two bodies that shadow each other: it needs some inelasticity, and falls as the inverse square. */
export const shadowPush = (absorbed: number, distance: number) => absorbed / (distance * distance);

/**
 * The pores of a globe in Figure 17-1, as in the engraving: spread evenly over the sphere (a Fibonacci lattice) and seen
 * from in front, so those near the limb are foreshortened, squashed along the radius and closer together, and fade into
 * its shade. Positions are in units of the radius; `turn` lays each pore's x axis, the one squashed, along its radius.
 */
const GLOBE_PORES = Array.from({ length: 110 }, (_, k) => {
  const z = 1 - (k + 0.5) / 55, ring = Math.sqrt(Math.max(0, 1 - z * z)), a = k * 2.39996;
  return { x: 0.96 * ring * Math.cos(a), y: 0.96 * ring * Math.sin(a), z };
}).filter(p => p.z > 0.12).map(p => {
  // Lit from the upper left, as the globe's shading is: pores on the shaded side fade into it.
  const light = Math.max(0, (-0.5 * p.x - 0.42 * p.y + 0.76 * p.z) / Math.hypot(0.5, 0.42, 0.76));
  return { ...p, turn: (Math.atan2(p.y, p.x) * 180) / Math.PI, fade: 0.95 * Math.min(1, 0.25 + light) * Math.min(1, p.z * 2.5) };
});

/**
 * A body drawn as the engraving in Figure 17-1 draws it: a globe lit from the upper left, with a dark limb to the lower
 * right, and pores, because Fatio's bodies let most of the corpuscles through.
 */
function Globe({ x, y, r }: { x: number; y: number; r: number }) {
  const id = useId(), shade = `${id}-shade`, clip = `${id}-clip`;
  const pores = GLOBE_PORES;
  return <g>
    <defs>
      <radialGradient id={shade} cx="38%" cy="40%" r="68%" fx="34%" fy="36%">
        <stop offset="0%" style={{ stopColor: 'var(--text-2)' }}/><stop offset="45%" style={{ stopColor: 'var(--text-4)' }}/><stop offset="80%" style={{ stopColor: 'var(--bg-3)' }}/><stop offset="100%" style={{ stopColor: 'var(--bg-0)' }}/>
      </radialGradient>
      <clipPath id={clip}><circle cx={x} cy={y} r={r}/></clipPath>
    </defs>
    <circle cx={x} cy={y} r={r} fill={`url(#${shade})`}/>
    <g clipPath={`url(#${clip})`}>
      {pores.map((p, i) => <ellipse key={i} cx={x + p.x * r} cy={y + p.y * r} rx={0.058 * r * Math.max(0.3, p.z)} ry={0.058 * r} transform={`rotate(${p.turn} ${x + p.x * r} ${y + p.y * r})`} className="bk-fill-panel" opacity={p.fade}/>)}
    </g>
    <circle cx={x} cy={y} r={r} fill="none" className="bk-s-text" strokeWidth="1.5"/>
  </g>;
}

/** Figure 17-1: Fatio's corpuscles pushing on two bodies that shade each other. */
function PushGravity() {
  // Each body stops half of what strikes it: a display choice.
  const absorbed = 0.5;
  const [gap, setGap] = useState(260);
  const play = usePlayback();
  const H = 340, y = 170, xa = W / 2 - gap / 2, xb = W / 2 + gap / 2, R = 72, push = shadowPush(absorbed, gap / 260);
  const streams = useMemo(() => { const random = rng(171); return Array.from({ length: 13 }, (_, i) => ({ y: 26 + i * 24, phase: random(), dir: (i % 2 ? 1 : -1) as 1 | -1 })); }, []);
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two bodies in a stream of corpuscles coming from every side, here drawn from left and right. Each body stops ${Math.round(absorbed * 100)} per cent of what strikes it, so fewer corpuscles reach the facing sides and the bodies are pushed together with a net push of ${fmt(push, 2)}.`}>
      {streams.map((s, i) => {
        const hits = Math.abs(s.y - y) < R, n = 9;
        return Array.from({ length: n }, (_, k) => {
          const travel = ((play.t * 0.22 + s.phase + k / n) % 1) * (W + 40) - 20, x = s.dir > 0 ? travel : W - travel;
          // A corpuscle that has passed through a body carries on with less: that is the shadow.
          const passed = hits ? (s.dir > 0 ? (x > xa ? 1 : 0) + (x > xb ? 1 : 0) : (x < xb ? 1 : 0) + (x < xa ? 1 : 0)) : 0;
          const inside = hits && (Math.hypot(x - xa, s.y - y) < R || Math.hypot(x - xb, s.y - y) < R);
          return inside ? null : <g key={`${i}-${k}`} opacity={(1 - absorbed) ** passed * 0.9 + 0.05}><circle cx={x} cy={s.y} r={3} className="bk-f-mark"/><line x1={x} y1={s.y} x2={x - s.dir * 12} y2={s.y} className="bk-s-mark" strokeWidth="1.2"/></g>;
        });
      })}
      <Globe x={xa} y={y} r={R}/><Globe x={xb} y={y} r={R}/>
      {push > 0.01 && <><BlockArrow x1={xa - R - 60 * clamp(push)} y1={y} x2={xa - R - 2} y2={y} thick={12}/><BlockArrow x1={xb + R + 60 * clamp(push)} y1={y} x2={xb + R + 2} y2={y} thick={12}/></>}
      <T x={W / 2} y={y + R + 30} size="sm" tone="mark">between the bodies: fewer corpuscles, less push</T>
    </Stage>}>
    <Slider label="Distance between the bodies" value={gap} min={190} max={440} step={10} onChange={setGap} show={v => `${fmt(v / 260, 2)} ×`}/>
    <PlayBar play={play} label="the corpuscles"/>
    <Readout label="Net push together" value={push < 0.005 ? 'none' : fmt(push, 3)} tone="force"/>
    <Remark>Each body shadows the other from the pressure coming from behind it, so more pushes them together than apart.</Remark>
  </Diagram>;
}

/** The fraction of a body's whole sky that a sphere of radius R at distance d covers. */
export const skyFraction = (R: number, d: number) => (1 - Math.sqrt(Math.max(0, 1 - (R / d) ** 2))) / 2;

/** Figure 17-2 drawn in three dimensions: loaded on demand, since three.js is large. */
const ShadowScene = lazy(() => import('../three/ShadowScene'));

/** Figure 17-2 as the printed page has it, flat: the two lines from Star 2's edges to Star 1's centre. The fallback where 3D cannot be drawn. */
function FlatShadow({ d, size, label }: { d: number; size: number; label: string }) {
  const H = 260, y = 130, x1 = 110, r1 = 44, x2 = 325 + ((d - 2.5) / 7.5) * 300, r2 = 30 * size, half = deg(Math.asin(clamp(size / d)));
  return <Stage w={W} h={H} label={label}>
    <Line d={`M${x2} ${y - r2} L${x1} ${y} L${x2} ${y + r2}`} tone="mark" w={1.4}/>
    <Body x={x1} y={y} r={r1} tone="plain" label="Star 1"/>
    {/* The distance range maps onto the stage, with room for the largest Star 2; the drawing is not to scale. */}
    <Body x={x2} y={y} r={r2} tone="plain" label="Star 2"/>
    <circle cx={x1 + r1} cy={y} r={Math.max(2.5, r1 * Math.sin((half * Math.PI) / 180))} className="bk-f-mark" opacity={0.9}/>
    <Arrow x1={x1 + r1 + 46} y1={y - 64} x2={x1 + r1 + 6} y2={y - 8} tone="muted" w={1.2} head={7}/><T x={x1 + r1 + 50} y={y - 70} anchor="start" size="sm">the “shadow” on the star’s surface</T>
  </Stage>;
}

/** Figure 17-2: the shadow one star casts on another, a cap on its surface, and how it shrinks with distance. */
function Shadow() {
  const [d, setD] = useState(6);
  const [size, setSize] = useState(1);
  const [flat, setFlat] = useState(() => !canDraw3D());
  const fail = useCallback(() => setFlat(true), []);
  const share = skyFraction(size, d), half = deg(Math.asin(clamp(size / d)));
  const px = 90, pw = 540, py = 30, ph = 100, curve = pathThrough(Array.from({ length: 50 }, (_, i) => { const dd = 2.5 + (i / 49) * 7.5; return [px + ((dd - 2.5) / 7.5) * pw, py + ph - (skyFraction(size, dd) / skyFraction(size, 2.5)) * ph] as const; }));
  const label = `Star 2, ${fmt(d, 2)} of its radii away from Star 1, covers ${fmt(share * 100, 2)} per cent of Star 1's sky. The lines from its edges to the centre of Star 1 mark the shadow on Star 1's surface.`;
  return <Diagram stage={<>
    {flat
      ? <FlatShadow d={d} size={size} label={label}/>
      : <FallbackOnError onError={fail} fallback={<FlatShadow d={d} size={size} label={label}/>}>
          <Suspense fallback={<FlatShadow d={d} size={size} label={label}/>}>
            <ShadowScene distance={d} size={size} onFail={fail} description={`${label} The cone from Star 1's centre to Star 2's edges meets Star 1's surface in the shadow, a cap facing Star 2. Drag to turn the view.`}/>
          </Suspense>
        </FallbackOnError>}
    <Stage w={W} h={160} label={`The share of Star 1's sky that Star 2 covers, against distance: it falls as the inverse square. Now ${fmt(share * 100, 2)} per cent.`}>
      <line x1={px} y1={py + ph} x2={px + pw} y2={py + ph} className="bk-s-muted"/><Line d={curve} tone="mark" w={2}/>
      <circle cx={px + ((d - 2.5) / 7.5) * pw} cy={py + ph - (share / skyFraction(size, 2.5)) * ph} r={5} className="bk-f-accent"/>
      <T x={px + pw / 2} y={py + ph + 20} size="sm">distance</T><T x={px + pw / 2} y={py - 10} size="sm" tone="mark">share of the sky covered</T>
    </Stage>
  </>}>
    <Slider label="Distance of Star 2" value={d} min={2.5} max={10} step={0.1} onChange={setD} show={v => `${fmt(v, 2)} radii`}/>
    <Slider label="Size of Star 2" value={size} min={0.5} max={1.5} step={0.05} onChange={setSize} show={v => `${fmt(v, 2)} ×`}/>
    <Readout label="Half-angle of the shadow" value={`${fmt(half, 3)}°`}/>
    <Readout label="Share of Star 1’s sky covered" value={`${fmt(share * 100, 3)} %`} tone="force"/>
    <Remark>Twice as far, about a quarter of the sky covered: the shadow, and so the push, falls as the inverse square.</Remark>
  </Diagram>;
}

type Kind = 'electric' | 'electron' | 'proton';

/** The two ends of a dipole standing upright: electric sign and matter sign at the top (the bottom is the opposite). */
function topOf(kind: Kind, flipped: boolean): { electric: 1 | -1; matter: 1 | -1 | 0 } {
  // Electron-like: matter with negative charge. Proton-like: matter with positive charge. Electric: no matter charge shown.
  const top = kind === 'electron' ? { electric: -1 as const, matter: 1 as const } : kind === 'proton' ? { electric: 1 as const, matter: 1 as const } : { electric: -1 as const, matter: 0 as const };
  return flipped ? { electric: (-top.electric) as 1 | -1, matter: (-top.matter) as 1 | -1 | 0 } : top;
}

/** What two dipoles side by side do to each other: each kind of charge either cancels (unlike ends adjacent) or repels (like ends adjacent). */
export function sideBySide(left: Kind, right: Kind, rightFlipped: boolean) {
  const a = topOf(left, false), b = topOf(right, rightFlipped);
  const electric = a.electric === b.electric ? 'repel' : 'cancel', matter = a.matter === 0 || b.matter === 0 ? 'none' : a.matter === b.matter ? 'repel' : 'cancel';
  return { electric, matter, longRange: electric === 'repel' || matter === 'repel' } as const;
}

/** Figures 17-3 to 17-5: two dipoles side by side, and whether anything is left to act at a distance. */
function DipolePair({ left, right, flipped: initial }: { left: Kind; right: Kind; flipped: boolean }) {
  const [flipped, setFlipped] = useState(initial);
  const name = (k: Kind) => (k === 'electric' ? 'dipole' : `${k}-like`);
  const { ZD, ZH, ZX } = ZEPTON_PAIR, result = sideBySide(left, right, flipped), H = 360, cx = 200, cy = 175;
  const a = topOf(left, false), b = topOf(right, flipped);
  /** One end of a dipole: its matter letter (if it has matter charge) and electric sign together, as Fleming writes "m−". */
  const end = (dx: number, top: boolean, at: { electric: 1 | -1; matter: 1 | -1 | 0 }) => {
    const y = cy + (top ? -ZD : ZD), e = (top ? at.electric : -at.electric) as 1 | -1, m = top ? at.matter : -at.matter;
    return <g key={`${dx}${top}`}>
      {m !== 0 && <text x={cx + dx - 12} y={y + 7} textAnchor="middle" className={`bk-t bk-t-lg ${m > 0 ? 'bk-f-matter' : 'bk-f-anti'}`}>{m > 0 ? 'm' : 'a'}</text>}
      <text x={cx + dx + (m !== 0 ? 12 : 0)} y={y + 7} textAnchor="middle" className={`bk-t bk-t-lg ${e > 0 ? 'bk-f-pos' : 'bk-f-neg'}`}>{e > 0 ? '+' : '−'}</text></g>;
  };
  /** A whole dipole, drawn as the dumbbell of Figure 11-3, named above. */
  const dipole = (dx: number, at: { electric: 1 | -1; matter: 1 | -1 | 0 }, kind: Kind) => <g>
    <path d={dumbbell(cx + dx, cy)} className="bk-zepton-oval" strokeWidth="2.5"/>
    {end(dx, true, at)}{end(dx, false, at)}
    <T x={cx + dx} y={cy - ZH / 2 - 14} size="sm" tone="text">{name(kind)}</T>
  </g>;
  // The force between such pairs against distance: an ordinary van der Waals force dies away steeply; a Coulomb one does not.
  const px = 420, pw = 260, py = 70, ph = 190, curve = (power: number) => pathThrough(Array.from({ length: 40 }, (_, i) => { const r = 1 + (i / 39) * 4; return [px + ((r - 1) / 4) * pw, py + ph - ph / r ** power] as const; }));
  return <Diagram stage={
    <Stage w={W} h={H} label={`A ${name(left)} and a ${name(right)} side by side. Their electric charges ${result.electric}${result.matter === 'none' ? '' : ` and their matter charges ${result.matter}`}. ${result.longRange ? 'A Coulomb repulsion is left, which falls only as the inverse square of the distance.' : 'Everything cancels, leaving only a short-ranged force.'}`}>
      {dipole(-ZX, a, left)}{dipole(ZX, b, right)}
      {result.longRange && <><Arrow x1={cx - ZX - 50} y1={cy} x2={cx - ZX - 100} y2={cy} tone="force" w={3}/><Arrow x1={cx + ZX + 50} y1={cy} x2={cx + ZX + 100} y2={cy} tone="force" w={3}/></>}
      <line x1={px} y1={py + ph} x2={px + pw} y2={py + ph} className="bk-s-muted"/><line x1={px} y1={py} x2={px} y2={py + ph} className="bk-s-muted"/>
      <Line d={curve(7)} tone={result.longRange ? 'faint' : 'danger'} w={result.longRange ? 1.4 : 2.6}/><Line d={curve(2)} tone={result.longRange ? 'accent' : 'faint'} w={result.longRange ? 2.6 : 1.4}/>
      <T x={px + 62} y={py + ph - 14} anchor="start" size="sm" tone={result.longRange ? 'muted' : 'danger'}>ordinary van der Waals: 1/r³ to 1/r⁷</T>
      <T x={px + pw - 4} y={py + ph - 60} anchor="end" size="sm" tone={result.longRange ? 'accent' : 'muted'}>Coulomb: 1/r²</T>
      <T x={px + pw / 2} y={py + ph + 20} size="sm">distance</T><T x={px + pw / 2} y={py - 12} size="sm">force this pairing leaves</T>
    </Stage>}>
    <Toggle label={`Turn the ${name(right)} one over`} checked={flipped} onChange={setFlipped}/>
    <Readout label="Electric charges" value={result.electric === 'cancel' ? 'cancel' : 'repel'} tone={result.electric === 'repel' ? 'e' : undefined}/>
    {result.matter !== 'none' && <Readout label="Matter charges" value={result.matter === 'cancel' ? 'cancel' : 'repel'} tone={result.matter === 'repel' ? 'force' : undefined}/>}
    <Readout label="What is left" value={result.longRange ? 'Coulomb repulsion, 1/r²' : 'a short-ranged force'} tone={result.longRange ? 'good' : 'bad'}/>
    <Remark>{left === right || left === 'electric' ? (result.longRange ? 'Turned this way like ends face each other; left free, two dipoles of one kind settle with opposites together, and cancel.' : 'Two dipoles of the same kind align with their opposites together. At a distance they cancel, and the force falls to zero.') : 'One of each kind: cancel one type of charge and the other is in a repulsive configuration, whichever way they lie.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 17,
  summary: <>
    <p>The oldest mechanical theory of gravity is <ScientistLink id="fatio">Fatio</ScientistLink>’s: space is full of corpuscles that push on bodies from every side, and two bodies shade each other, so that they are pushed together. It was rejected because corpuscles that strike matter would heat it and drag on it. Fleming’s answer is that <Q>Fatio’s corpuscles are vacuum fluctuations, the zeptons that fill all of space</Q>, and that the Casimir effect already shows they push on matter without heat or drag (<Pg n={130}/>, <Pg n={132}/>).</p>
    <p>The remaining problem is range: van der Waals forces fall off far faster than 1/<i>r</i>². The Matter Force supplies what is missing. An electron-like zepton beside a proton-like one cannot cancel both kinds of charge, so a Coulomb repulsion is always left. That gives the vacuum an isotropic pressure that falls as the inverse square, <Q>a new type of long-range London-van der Waals Force</Q>, and <Q>Gravity is a long-range van der Waals Force</Q> (<Pg n={135}/>, <Pg n={136}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '17-1', page: 129, section: 'Gravity in History', title: 'Push gravity: bodies that shade each other',
      caption: 'An illustration of the Fatio’s Push Gravity Theory by Le Sage.',
      Diagram: PushGravity,
      text: <>
        <p><Q>Fatio’s idea was that space is filled with corpuscles, and that as these corpuscles move through space, they randomly strike astronomical bodies, pushing them. If we then consider two bodies, the first body shadows the second body from the corpuscular pressure force coming from behind the first body, and in this way there is more force pushing the bodies together than pushing them apart</Q> (<Pg n={129}/>).</p>
        <p>The interaction must be partly inelastic: <Q>No shadowing effect occurs if the interaction is completely elastic</Q>. And for the force to follow mass and not surface, matter must be almost entirely porous, which Fatio argued and which zeptons satisfy: they <Q>can be many orders of magnitude smaller than even the smallest fundamental particle, making matter, for all intents, infinitely porous</Q> (<Pg n={130}/>, <Pg n={131}/>).</p>
      </>,
      tryThis: ['Follow a stream that passes through a body: it comes out fainter, and reaches the second body fainter still.', 'Move the bodies apart: the push falls with the square of the distance.'],
      notes: <p>The corpuscles are drawn travelling in two directions only; in the theory they come from every direction. Each body is drawn stopping half of what strikes it; that share, and its effect on the streams, are display choices. Were the interactions entirely elastic nothing would be stopped, there would be no shadow, and no push. With zeptons in place of corpuscles the interaction is not a collision at all; that is the subject of Figures 17-3 to 17-5.</p>,
      labs: [{ lab: 'vdw', scenario: 'pressure', why: 'The Casimir plates of chapter 3, which Fleming says solved the heat and drag objections to this picture.' }],
    },
    {
      kind: 'figure', id: '17-2', page: 130, title: 'The shadow, and the inverse square',
      caption: 'An illustration of the shadow from the shadow gravity part of the theory.',
      Diagram: Shadow,
      text: <p><Q>In principle, the push theory could describe the 1/r<sup>2</sup> varying force required</Q> (<Pg n={130}/>). The figure shows why: the part of one star’s surroundings that the other blocks is a cone, and the cone narrows as the stars separate. Chapter 18 opens with <ScientistLink id="feynman">Feynman</ScientistLink>’s statement of it: <Q>The sun will appear smaller – in fact inversely as the square of the distance</Q> (<Pg n={137}/>).</p>,
      tryThis: ['Move Star 2 away: the lines to Star 1’s centre close up and the shadow on its surface shrinks.', 'Double the distance and compare the share of sky covered: about a quarter.', 'Make Star 2 larger: a larger shadow at the same distance.'],
      notes: <p>The printed figure is flat; here it is drawn in three dimensions, so the shadow shows as what it is, a cap on Star 1’s surface where the cone to Star 2 meets it. The share of the sky is the exact solid angle of a sphere seen from a point. Distances are in units of Star 2’s radius, far closer than real stars, so the cone can be seen.</p>,
    },
    {
      kind: 'figure', id: '17-3', page: 133, section: 'The Van der Waals Force', title: 'Electric dipoles side by side cancel',
      caption: 'Two electric dipoles side by side with their charges canceling.',
      Diagram: () => <DipolePair left="electric" right="electric" flipped/>,
      text: <p>With only electric charge on the zeptons there is a van der Waals force, <Q>But at a distance, the dipoles cancel and changes in dipole moment become negligible, giving the appearance of neutral space as the force falls to zero. Two dipoles with positive and negative charges will align with their opposites together</Q>. <Q>There is no way for them to form extending long range fields that are necessary to cause a long-range 1/r<sup>2</sup> varying force</Q> (<Pg n={133}/>).</p>,
      tryThis: ['As printed, each + is beside a −: the pair is neutral from any distance, and only the steep curve is left.', 'Turn one over to see the arrangement they avoid: like beside like.'],
      notes: <p>The two curves are 1/<i>r</i>² and 1/<i>r</i>⁷, the ends of the range the text gives; they are drawn to the same height at the left for comparison.</p>,
      labs: [{ lab: 'vdw', scenario: 'correlated', why: 'The short-ranged attraction between two fluctuating dipoles, with its steep fall-off plotted.' }],
    },
    {
      kind: 'figure', id: '17-4', page: 134, title: 'Two zeptons of one kind cancel in both charges',
      caption: 'Two electron-like zepton pairs side by side with both their electric and matter charge dipoles canceling',
      Diagram: () => <DipolePair left="electron" right="electron" flipped/>,
      text: <p><Q>The electron-like zeptons when paired with other electron-like zeptons largely cancel, and those interactions lead to the standard short-ranged force</Q>. <Q>When proton-like zeptons align adjacent to other proton-like zeptons, the charge forces also drop to zero after a fairly short difference</Q> (<Pg n={134}/>).</p>,
      tryThis: ['As printed: m− beside a+, and a+ beside m−. Matter is next to antimatter and − next to +, so both kinds cancel.', 'Turn one over: now both kinds repel at once, which is why the pair does not sit that way.'],
    },
    {
      kind: 'figure', id: '17-5', page: 135, title: 'One of each kind cannot cancel both',
      caption: 'A zepton pair one electron-like and one proton-like adjacent to each of with their electric dipoles canceling and their matter dipoles repelling',
      Diagram: () => <DipolePair left="electron" right="proton" flipped={false}/>,
      text: <>
        <p><Q>If they lie next to each other with their positive and negative electric charges canceling, their positive and negative matter charges are in a repulsive configuration. And, if they lie next to each other with their positive and negative matter charges canceling, their positive and negative electric charges are in a repulsive configuration. This leads to basic Coulomb repulsion, a 1/r<sup>2</sup> varying force, regardless of orientation</Q> (<Pg n={134}/>).</p>
        <p><Q>A field of such zepton pairs forms a repulsive Coulomb pressure field, but a field that is electric and matter neutral.</Q> <Q>It is the Coulomb forces between electron-like zeptons and proton-like zeptons that is the cause of gravity.</Q> In free space the pressure is the same in every direction; <Q>Having matter in the vicinity disrupts the force, reducing the long-range van der Waals pressure coming from the direction of the body of matter</Q>, and bodies shadow each other as Fatio said (<Pg n={135}/>).</p>
      </>,
      tryThis: ['As printed the electric charges cancel (− beside +) and the matter charges repel (m beside m).', 'Turn the proton-like one over: now matter cancels and the electric charges repel. Either way a repulsion is left, and it is the shallow curve.', 'Compare with Figure 17-4, where turning one over changed “cancel” to “repel” for both at once.'],
      notes: <p>This is the pair of Figure 11-3. There it showed how space can be polarized by matter and stay electrically neutral; here the same fact is why a long-range pressure exists at all.</p>,
    },
  ],
};
export default chapter;
