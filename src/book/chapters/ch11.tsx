// Chapter 11: The Matter Dipole (PDF pp. 91–97). Figures 11-1 to 11-6.
import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Action, Arrow, Body, Charge, Choice, Diagram, Drag, FieldPicture, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, Still, T, Toggle, Zepton, bearing, clamp, polar, rad, turn, usePlayback, type Source } from '../kit';
import { Paper, Pg, Q } from '../prose';
import type { ChapterContent } from '../types';
import { TwoSources } from './shared';

const W = 720;

/** Figure 11-1: the matter field of a body of matter, with the antimatter ends of the zeptons toward it. */
function MatterField() {
  const [mode, setMode] = useState<'lines' | 'zeptons' | 'both'>('zeptons');
  const play = usePlayback();
  const H = 380, R = 26;
  const sources = useMemo<Source[]>(() => [{ x: W / 2, y: H / 2, q: -1 }], []);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A body of matter surrounded by 10 lines of zeptons polarized by matter charge. Each zepton has its antimatter end toward the body and its matter end away.`}>
      <FieldPicture sources={sources} w={W} h={H} perUnit={10} lines={mode === 'zeptons' ? 0 : mode === 'both' ? 0.45 : 1} zeptons={mode === 'lines' ? 0 : 1} t={play.t} polarity="matter" tone="accent" zeptonLen={24} radii={[R]}/>
      <Body x={W / 2} y={H / 2} r={R}/><T x={W / 2} y={H / 2 + 6} tone="text" size="lg">M</T>
      <Zepton x={90} y={H - 40} angle={180} len={46} polarity="matter" signs/><T x={126} y={H - 35} anchor="start" size="sm">a: antimatter end · m: matter end</T>
    </Stage>}>
    <Choice label="Draw the field as" value={mode} onChange={setMode} options={[{ value: 'lines', label: 'Lines' }, { value: 'zeptons', label: 'Zeptons' }, { value: 'both', label: 'Both' }]}/>
    <PlayBar play={play} label="the zeptons"/>
    <Remark>The zeptons become polarized, and the lines of polarization extend toward infinity.</Remark>
  </Diagram>;
}

type Facing = 'up' | 'down';

/** A raised sign after a particle's letter in SVG text, with the baseline restored after it. */
const sup = (sign: string) => <><tspan dy={-6} fontSize="0.8em">{sign}</tspan><tspan dy={6}>{'​'}</tspan></>;

/** Each zepton in Figures 11-3 and 11-6 is a dumbbell: two round ends of radius ZR, ZD above and below its middle,
 *  joined by an hourglass neck ZN wide at its waist. ZH is its overall height; ZX is how far each zepton sits from the middle of the pair. */
const ZR = 42, ZD = 60, ZN = 18, ZH = 2 * (ZD + ZR), ZX = 62;

/** The outline of a dumbbell zepton centred on (x, y): two circles joined by a smooth hourglass neck, each curve leaving a circle along its tangent. */
function dumbbell(x: number, y: number) {
  const shoulder = rad(45), k = 14, sx = ZR * Math.sin(shoulder), sy = ZD - ZR * Math.cos(shoulder), w = ZN / 2;
  // From the shoulder on the circle, along its tangent toward the waist, which is reached heading straight along the zepton.
  const cx1 = sx - k * Math.cos(shoulder), cy1 = sy - k * Math.sin(shoulder), cy2 = 12;
  const neck = (side: 1 | -1) => side > 0
    ? `C${x + cx1} ${y - cy1} ${x + w} ${y - cy2} ${x + w} ${y} C${x + w} ${y + cy2} ${x + cx1} ${y + cy1} ${x + sx} ${y + sy}`
    : `C${x - cx1} ${y + cy1} ${x - w} ${y + cy2} ${x - w} ${y} C${x - w} ${y - cy2} ${x - cx1} ${y - cy1} ${x - sx} ${y - sy}`;
  return `M${x - sx} ${y - sy} A${ZR} ${ZR} 0 1 1 ${x + sx} ${y - sy} ${neck(1)} A${ZR} ${ZR} 0 1 1 ${x - sx} ${y + sy} ${neck(-1)} Z`;
}

/** The net dipoles of an electron-like zepton and a proton-like zepton set side by side, by which end of each is up. */
export function pairDipoles(electronLike: Facing, protonLike: Facing) {
  // Electron-like: matter with negative charge at one end. Proton-like: matter with positive charge at one end.
  const e = electronLike === 'up' ? 1 : -1, p = protonLike === 'up' ? 1 : -1;
  return { matter: e + p, electric: -e + p };
}

/** Figures 11-3 and 11-6: an electron-like and a proton-like zepton side by side, at rest or rotating together. */
function ZeptonPair({ rotating }: { rotating: boolean }) {
  const [electronLike, setE] = useState<Facing>('up');
  const [protonLike, setP] = useState<Facing>('up');
  const play = usePlayback({ speed: 0.5 });
  const { matter, electric } = pairDipoles(electronLike, protonLike), H = 360, cx = 300, cy = 180, spin = rotating ? play.t * 90 : 0;
  // Each zepton is drawn as one dipole, a dumbbell whose two ends are Fleming's ovals (m or a, with its electric sign),
  // a particle and its antiparticle joined, with a gap between the two zeptons so the pair reads as two. Text is turned back so it stays upright.
  const upright = (x: number, y: number) => `rotate(${spin} ${x} ${y})`;
  const end = (dx: number, top: boolean, isMatter: boolean, sign: 1 | -1) => {
    const y = cy + (top ? -ZD : ZD);
    return <g>
      <text x={cx + dx - 14} y={y + 7} textAnchor="middle" className={`bk-t bk-t-lg ${isMatter ? 'bk-f-matter' : 'bk-f-anti'}`} transform={upright(cx + dx - 14, y)}>{isMatter ? 'm' : 'a'}</text>
      <text x={cx + dx + 16} y={y + 7} textAnchor="middle" className={`bk-t bk-t-lg ${sign > 0 ? 'bk-f-pos' : 'bk-f-neg'}`} transform={upright(cx + dx + 16, y)}>{sign > 0 ? '+' : '−'}</text></g>;
  };
  // Rotating, the names sit further out so they clear the zeptons as the pair turns.
  const nameAt = rotating ? ZH / 2 + 34 : ZH / 2 + 14;
  const zepton = (dx: number, up: boolean, matterSign: 1 | -1, name: string, like: ReactNode) => <g>
    <path d={dumbbell(cx + dx, cy)} className="bk-zepton-oval" strokeWidth="2.5"/>
    {end(dx, true, up, (up ? matterSign : -matterSign) as 1 | -1)}{end(dx, false, !up, (up ? -matterSign : matterSign) as 1 | -1)}
    <T x={cx + dx} y={cy - nameAt} size="sm" tone="text" transform={upright(cx + dx, cy - nameAt)}>{name}</T>
    {!rotating && <T x={cx + dx} y={cy + ZH / 2 + 26} size="sm" transform={upright(cx + dx, cy + ZH / 2 + 26)}>{like}</T>}
  </g>;
  const eUp = electronLike === 'up', pUp = protonLike === 'up';
  return <Diagram stage={
    <Stage w={W} h={H} label={`An electron-like zepton and a proton-like zepton side by side${rotating ? ', rotating together' : ''}. Together they are ${matter ? 'polarized' : 'neutral'} with respect to matter charge and ${electric ? 'polarized' : 'neutral'} with respect to electric charge.`}>
      <g transform={`rotate(${-spin} ${cx} ${cy})`}>
        {zepton(-ZX, eUp, -1, 'electron-like', <>like e{sup('−')} with e{sup('+')}</>)}
        {zepton(ZX, pUp, 1, 'proton-like', <>like p with <tspan textDecoration="overline">p</tspan></>)}
      </g>
      {rotating && <Spin x={cx} y={cy} r={172} ccw sweep={300} tone="muted"/>}
      <T x={600} y={84} size="sm">net dipole</T><T x={560} y={110} tone="matter">matter</T>
      {matter !== 0 ? <Arrow x1={560} y1={cy + matter * 22} x2={560} y2={cy - matter * 22} tone="matter" w={4} head={13}/> : <T x={560} y={cy + 5} tone="muted">none</T>}
      <T x={650} y={110} tone="e">electric</T>
      {electric !== 0 ? <Arrow x1={650} y1={cy + electric * 22} x2={650} y2={cy - electric * 22} tone="e" w={4} head={13}/> : <T x={650} y={cy + 5} tone="muted">none</T>}
      {rotating && <><T x={560} y={H - 60} size="sm" tone="matter">{matter ? 'mattermagnetic field' : 'no mattermagnetic field'}</T><T x={560} y={H - 40} size="sm" tone="e">{electric ? 'electromagnetic field' : 'no electromagnetic field'}</T></>}
    </Stage>}>
    <Choice label="Electron-like zepton: matter end" value={electronLike} onChange={setE} options={[{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }]}/>
    <Choice label="Proton-like zepton: matter end" value={protonLike} onChange={setP} options={[{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }]}/>
    {rotating && <PlayBar play={play} label="the pair"/>}
    <Readout label="Matter charge" value={matter ? 'polarized' : 'neutral'} tone={matter ? 'force' : undefined}/>
    <Readout label="Electric charge" value={electric ? 'polarized' : 'neutral'} tone={electric ? 'e' : undefined}/>
    <Remark>{matter && !electric ? (rotating ? 'As printed: rotating, the pair makes a mattermagnetic field and no electromagnetic one.' : 'As printed: the matter ends are together and the electric charges cancel.') : electric && !matter ? 'Turn one over and the pair is polarized electrically and matter neutral.' : 'Side by side they cancel one kind of charge and are polarized in the other.'}</Remark>
  </Diagram>;
}

/** Figure 11-4: a moving body of matter makes the zeptons either side of it spin, giving a mattermagnetic field. */
function MovingBody() {
  const [x, setX] = useState(200);
  const play = usePlayback({ autoplay: false, speed: 0.22 });
  const H = 340, y = 170, zx = 360, above = { x: zx, y: 84 }, below = { x: zx, y: 256 };
  const bx = play.playing ? 110 + 500 * (0.5 - 0.5 * Math.cos(play.t * 2 * Math.PI)) : x, moving = play.playing ? Math.sign(Math.sin(play.t * 2 * Math.PI)) || 1 : 0;
  // Each zepton keeps its antimatter end toward the body, so it turns as the body passes.
  const up = bearing(above.x, above.y, bx, y), down = bearing(below.x, below.y, bx, y);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A body of matter on a line between two zeptons. Each keeps its antimatter end toward the body. ${moving ? `With the body moving ${moving > 0 ? 'right' : 'left'} the mattermagnetic field points ${moving > 0 ? 'out of' : 'into'} the page above it and ${moving > 0 ? 'into' : 'out of'} the page below.` : ''}`}>
      <line x1={60} y1={y} x2={660} y2={y} className="bk-s-faint" strokeDasharray="3 5"/>
      <Line d={`M${above.x} ${above.y} L${bx} ${y} L${below.x} ${below.y}`} tone="faint" dash="2 4"/>
      <Zepton x={above.x} y={above.y} angle={up} len={52} polarity="matter" signs/><Zepton x={below.x} y={below.y} angle={down} len={52} polarity="matter" signs/>
      {moving !== 0 && <>
        <Spin x={above.x} y={above.y} r={38} ccw={moving > 0} from={moving > 0 ? 20 : 160} sweep={140}/><Spin x={below.x} y={below.y} r={38} ccw={moving < 0} from={moving > 0 ? -20 : 200} sweep={140}/>
        <InOut x={above.x + 78} y={above.y} out={moving > 0} r={10}/><InOut x={below.x + 78} y={below.y} out={moving < 0} r={10}/>
        <T x={above.x + 96} y={above.y + 5} anchor="start" tone="b">B_m {moving > 0 ? 'out of the page' : 'into the page'}</T><T x={below.x + 96} y={below.y + 5} anchor="start" tone="b">B_m {moving < 0 ? 'out of the page' : 'into the page'}</T>
        <Still><Arrow x1={bx + moving * 26} y1={y} x2={bx + moving * 62} y2={y} tone="motion" w={2.4}/></Still>
      </>}
      <Drag x={bx} y={y} onMove={nx => { if (!play.playing) setX(nx); }} bounds={{ x0: 80, y0: y, x1: 640, y1: y }} label="Body of matter"><Body x={bx} y={y} r={18}/><T x={bx} y={y + 6} tone="text" size="lg">M</T></Drag>
    </Stage>}>
    <Slider label="Position of the body" value={Math.round(bx)} min={80} max={640} step={2} onChange={v => { if (!play.playing) setX(v); }} show={v => (v < 300 ? 'left' : v > 420 ? 'right' : 'between the zeptons')}/>
    <Action onClick={() => { if (play.playing) setX(Math.round(bx)); play.toggle(); }}>{play.playing ? 'Stop the body' : 'Move the body'}</Action>
    <Readout label="Upper zepton has turned" value={`${Math.round(turn(-90, up))}°`}/>
    <Readout label="Lower zepton has turned" value={`${Math.round(turn(90, down))}°`}/>
    <Remark>By the right hand grip rule the two opposite rotations are fields pointing opposite ways, out of the page on one side of the motion and into it on the other.</Remark>
  </Diagram>;
}

/** How fast the body of Figure 11-5 turns at full rotation, in degrees a second. */
const FULL_TURN = 80;

/** The rotation a hand-turned body keeps when let go, from its turning speed in degrees a second: as a fraction of full, counter-clockwise positive, to the slider's step. */
export const spinRate = (degreesPerSecond: number) => clamp(Math.round(degreesPerSecond / FULL_TURN / 0.05) * 0.05, -1, 1) || 0;

/** Figure 11-5: a rotating body makes the zeptons round its circumference rotate the opposite way. The reader can turn the body by hand. */
function RotatingBody() {
  const [rate, setRateNow] = useState(0.6);
  const play = usePlayback();
  // The body's angle is carried from a base, so a change of rate or a turn by hand never makes it jump.
  const [base, setBase] = useState({ t: 0, angle: 0 });
  const [held, setHeld] = useState<number | null>(null);
  const grip = useRef<{ offset: number; pointer: number; angle: number; time: number; speed: number } | null>(null);
  const H = 380, cx = 300, cy = 190, R = 92, n = 12;
  const spun = base.angle + (play.t - base.t) * rate * FULL_TURN, turned = held ?? spun;
  const setRate = (v: number) => { setBase({ t: play.t, angle: spun }); setRateNow(v); };
  /** The pointer's direction from the middle of the body, in degrees. */
  const pointerAt = (e: PointerEvent<SVGCircleElement>) => {
    const matrix = e.currentTarget.ownerSVGElement?.getScreenCTM?.();
    if (!matrix) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    return bearing(cx, cy, p.x, p.y);
  };
  const letGo = () => {
    const g = grip.current;
    if (!g) return;
    grip.current = null;
    // A body held still before it is let go stops; one flicked keeps turning at the speed it was given.
    const next = performance.now() - g.time > 120 ? 0 : spinRate(g.speed);
    setBase({ t: play.t, angle: g.angle }); setRateNow(next); setHeld(null);
    if (next && !play.playing) play.toggle();
  };
  const moving = held === null && Math.abs(rate) >= 0.05;
  return <Diagram stage={
    <Stage w={W} h={H} label={Math.abs(rate) < 0.05 ? 'A body of matter that is not rotating, with zeptons round it: the body does not turn them.' : `A body of matter rotating ${rate > 0 ? 'counter-clockwise' : 'clockwise'}. The zeptons round its circumference rotate ${rate > 0 ? 'clockwise' : 'counter-clockwise'}, the opposite way.`}>
      <circle cx={cx} cy={cy} r={R} className="bk-body bk-body-matter"/>
      {/* A dark cross on the body, so its turning can be seen. */}
      {[0, 90, 180, 270].map(a => { const [x1, y1] = polar(cx, cy, 24, turned + a), [x2, y2] = polar(cx, cy, R - 8, turned + a); return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} className="bk-body-ink" strokeWidth="3.5" strokeLinecap="round"/>; })}
      <T x={cx} y={cy + 7} tone="text" size="lg">M</T>
      {moving && <Spin x={cx} y={cy} r={34} ccw={rate > 0} sweep={280} tone="text" w={3}/>}
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 360, [x, y] = polar(cx, cy, R + 46, a);
        // A zepton beside a moving surface turns like one gear against another: the opposite way to the body.
        return <g key={i}><Zepton x={x} y={y} angle={a + 180 - turned * 2.2} len={34} polarity="matter" signs={false}/>{moving && i % 3 === 0 && <Spin x={x} y={y} r={24} ccw={rate < 0} sweep={220} opacity={0.85}/>}</g>;
      })}
      {/* The body is what the reader turns: by dragging round it, or with the arrow keys once it has the focus. */}
      <circle cx={cx} cy={cy} r={R} fill="transparent" className="bk-turn" tabIndex={0} role="application"
        aria-label="The body of matter. Drag round it to turn it by hand, and flick it to set it spinning; or press the left or right arrow key to turn it a step counter-clockwise or clockwise."
        onPointerDown={e => {
          const at = pointerAt(e); if (at === null) return;
          e.preventDefault(); e.currentTarget.focus({ preventScroll: true });
          grip.current = { offset: turned - at, pointer: at, angle: turned, time: performance.now(), speed: 0 };
          setHeld(turned); setRateNow(0); e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={e => {
          const g = grip.current, at = g && pointerAt(e); if (!g || at === null || at === undefined) return;
          const now = performance.now(), dt = Math.max(0.001, (now - g.time) / 1000);
          // Follow the pointer round without a jump where its direction wraps past ±180°.
          const pointer = g.pointer + turn(g.pointer, at), angle = pointer + g.offset;
          g.speed += (1 - Math.exp(-dt / 0.08)) * ((angle - g.angle) / dt - g.speed);
          Object.assign(g, { pointer, angle, time: now });
          setHeld(angle); setRateNow(spinRate(g.speed));
        }}
        onPointerUp={e => { e.currentTarget.releasePointerCapture?.(e.pointerId); letGo(); }}
        onPointerCancel={letGo}
        onKeyDown={e => {
          const step = e.key === 'ArrowLeft' ? 15 : e.key === 'ArrowRight' ? -15 : 0; if (!step) return;
          e.preventDefault(); setBase({ t: play.t, angle: spun + step });
        }}/>
    </Stage>}>
    <Slider label="Rotation of the body" value={rate} min={-1} max={1} step={0.05} onChange={setRate} show={v => (Math.abs(v) < 0.05 ? 'none' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'counter-clockwise' : 'clockwise'}`)}/>
    <PlayBar play={play} label="the rotation"/>
    <Readout label="Mattermagnetic field round the rim" value={Math.abs(rate) < 0.05 ? 'none' : 'counter-rotating'} tone="b"/>
    <Remark>A large rotating body produces a counter-rotating mattermagnetic field around its circumference. Newtonian gravity has no rotational force between bodies; the Matter Force does.</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 11,
  summary: <>
    <p>A force that works like electromagnetism needs a charge with two signs. Mass has none, and neither has gravity. Going through the properties of the electron and positron, Fleming finds one that is opposite and could act on neutral matter: <Q>the opposite charge to matter is antimatter</Q> (<Pg n={92}/>). Every zepton is then a matter dipole as well as an electric one.</p>
    <p>Like matter charges repel, as like electric charges do. That repulsion is, he argues, the unidentified force at both ends of the scale: what keeps an electron off a proton, and <Q>the so-called Dark Energy</Q> (<Pg n={93}/>). How gravity can still win at ordinary distances is left to chapter 17.</p>
  </>,
  items: [
    {
      kind: 'figure', id: '11-1', page: 94, section: 'Matter Field Lines', title: 'The matter field of a body',
      caption: 'A body of matter surrounded by matter-oriented zeptons.',
      Diagram: MatterField,
      text: <p><Q>As we have for electricity and magnetism, we can have Faraday Field lines for matter forces and mattermagnetism. And, just as with electricity and magnetism, those force lines are more accurately represented as zepton dipoles.</Q> The figure shows <Q>the basic matter field around a body of matter with the antimatter side of the dipoles oriented toward the matter. The zeptons become polarized, and the lines of polarization extend toward infinity</Q> (<Pg n={93}/>, <Pg n={94}/>).</p>,
      tryThis: ['Look at any zepton: its antimatter end (a) is the one toward M, its matter end (m) the one away, as in the printed “a-m” labels.', 'Switch to Lines: the arrows point toward the body, as in Figure 10-3.'],
      notes: <p>The printed figure shows one ring of zeptons; rows reaching outward are drawn here, following <Q>the lines of polarization extend toward infinity</Q>.</p>,
    },
    {
      kind: 'figure', id: '11-2', page: 94, title: 'Matter repels matter',
      caption: 'Two bodies of matter are surrounded by matter-oriented zeptons in nearby space, oriented in a repulsive configuration.',
      Diagram: () => <TwoSources signs={[-1, -1]} mode="zeptons" names={['First body of matter', 'Second body of matter']} matter/>,
      text: <>
        <p>With two bodies of matter, <Q>their lines of polarization will meet, matter to matter, and be repelled</Q>. <Q>As with the electrical case, zeptons fill the void, which leads to an increase in zepton pressure in the space between the bodies, pushing them apart</Q> (<Pg n={94}/>).</p>
        <p>This is the mechanism of Figures 6-9 to 6-11 with matter charge in place of electric charge. Motion still comes from a difference: <Q>there is also a constant pressure originating from the vacuum pushing the bodies together</Q>.</p>
      </>,
      tryThis: ['Drag either body. Between them the rows of zeptons turn aside, matter ends toward matter ends.', 'Switch to Both and compare with Figure 6-11: the pattern is the same.', 'Turn on the push: the bodies are pushed apart.'],
      labs: [{ lab: 'casimir', scenario: 'electron-electron', why: 'The electric form of this repulsion as a difference of zepton pressure.' }],
    },
    {
      kind: 'figure', id: '11-3', page: 95, title: 'Two kinds of zepton, and how they cancel',
      caption: 'A zepton pair polarized with respect to matter charge while neutral with respect to electric charge.',
      Diagram: () => <ZeptonPair rotating={false}/>,
      text: <>
        <p>If the vacuum held only one kind of zepton, a matter field would always bring an electric field with it. There are two kinds: <Q>electron-like with negative charge and matter on one end and positive charge and antimatter on the other end</Q>, and proton-like, <Q>with positive charge and matter on one end of the dipole and negative charge and antimatter on the other end</Q> (<Pg n={95}/>).</p>
        <p><Q>If an electron-like and a proton-like zepton are side by side, they cancel with respect to one type of charge and are polarized with respect to the other.</Q> They can equally be polarized electrically while matter neutral. <Q>However, in local space dominated by matter, there will always be some matter charge polarization.</Q></p>
      </>,
      tryThis: ['As it starts, both matter ends are up: a matter dipole, and the − and + beside each other cancel.', 'Turn the proton-like zepton over. Now the two + ends are together: an electric dipole, and matter cancels.', 'Try all four arrangements. The pair is never polarized in both kinds, and never neutral in both.'],
      notes: <p>The printed figure is four touching ovals, two to a zepton. Here each zepton is drawn as one dipole, a dumbbell of two particles joined, with a gap between the two zeptons so the pair reads as two. The same drawing, unlabelled, is Fig. 5 of <Paper id="motion" page={4}/>, whose text gives the glosses under each zepton: the electron-like kind is <Q>like a quantum electron-positron pair</Q>, and the proton-like kind <Q>can be thought of as a proton-antiproton pair</Q>.</p>,
    },
    {
      kind: 'figure', id: '11-4', page: 96, section: 'Matter Magnetism', title: 'Moving matter makes a mattermagnetic field',
      caption: 'A body of matter moving through space causes nearby zeptons to spin.',
      Diagram: MovingBody,
      text: <p><Q>The motion of a body of matter causes nearby zeptons to spin</Q>, and the right hand grip rule gives the direction of the mattermagnetic field <i>B</i><sub>m</sub>: for the zeptons above the moving body <Q>the magnetic field points out of the page, while the magnetic field below the moving body of matter points into the page</Q> (<Pg n={96}/>).</p>,
      tryThis: ['Drag the body past the two zeptons: each keeps its antimatter end on it, so the two turn opposite ways.', 'Press “Move the body”. While it moves right the field is out of the page above and into it below, as the text says; when it turns back both reverse.'],
      notes: <p>The printed figure shows one moment, with the body moving right. That the zeptons turn by keeping their antimatter ends toward the body follows Figure 6-14, which gives the same mechanism for charge.</p>,
    },
    {
      kind: 'figure', id: '11-5', page: 96, title: 'A rotating body and its counter-rotating field',
      caption: 'A body of matter rotating in space causes nearby zeptons outside its circumference to rotate in the opposite direction.',
      Diagram: RotatingBody,
      text: <p><Q>One aspect of the Matter Force model that achieves greater importance when discussing large bodies of matter, is the force generated when bodies are rotating. A large rotating body produces a counter-rotating mattermagnetic field around its circumference</Q> (<Pg n={96}/>). Chapter 12 uses this field for the planets and the Sun.</p>,
      tryThis: ['Grab the body and turn it by hand: the zeptons turn the other way. Flick it and let go, and it keeps spinning.', 'Reverse the body’s rotation: the zeptons reverse too, always opposite to it.', 'Stop the body: it no longer turns the zeptons, and there is no mattermagnetic field.'],
      notes: <p>The rate at which the zeptons turn for a given rotation of the body is a display choice.</p>,
    },
    {
      kind: 'figure', id: '11-6', page: 97, title: 'A rotating pair with no electromagnetic field',
      caption: 'A zepton pair polarized with respect to matter charge while neutral with respect to electric charge, so that when they rotate they can produce a mattermagnetic field without producing an electromagnetic field.',
      Diagram: () => <ZeptonPair rotating/>,
      text: <p><Q>When electron-like zeptons and proton-like zeptons form pairs, it is possible for them to produce a mattermagnetic field when rotating while not producing an electromagnetic field and vice versa.</Q> Zeptons are <Q>effectively infinitely small compared to the scale of bodies in orbit, so that there is no measurable electro-magnetic field in this case</Q> (<Pg n={96}/>, <Pg n={97}/>).</p>,
      tryThis: ['As printed, the rotating pair gives a mattermagnetic field only.', 'Turn the proton-like zepton over: the same rotation now gives an electromagnetic field and no mattermagnetic one.'],
    },
  ],
};
export default chapter;
