// Chapter 5: The Zero-Point Photon (PDF pp. 43–47). Figures 5-1 and 5-2.
import { useMemo, useState } from 'react';
import { Action, Arrow, Charge, Diagram, InOut, Line, PlayBar, Readout, Remark, Slider, Spin, Stage, T, Toggle, Vector, Zepton, fmt, pathThrough, percentOfPeak, rad, rng, usePlayback } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';

/** The pair of a photon's series at index n: even pairs turn clockwise (E up, B into the page), odd ones the other way. */
export const seriesPair = (n: number) => ({ clockwise: n % 2 === 0, up: n % 2 === 0 ? 1 : -1 });

/** 0 before `from`, 1 after `to`, easing smoothly between: for fading a label in or out. */
const ramp = (v: number, from: number, to: number) => { const k = Math.min(1, Math.max(0, (v - from) / (to - from))); return k * k * (3 - 2 * k); };

/** Figure 5-1: a photon as a series of pairs, each a half-turn, alternating in rotation and so in E and B. */
function PairSeries() {
  const spacing = 68;
  const [record, setRecord] = useState(true);
  const count = 9, play = usePlayback({ speed: 0.55 });
  const cycle = play.t % (count + 0.6), active = Math.min(count - 1, Math.floor(cycle)), u = Math.min(1, cycle - active), alive = cycle < count;
  const W = 720, x0 = (W - spacing * (count - 1)) / 2, y = 150, amp = 46;
  const wave = pathThrough(Array.from({ length: 181 }, (_, i) => { const s = (i / 180) * count; return [x0 - spacing / 2 + s * spacing, 62 - 24 * Math.sin(Math.PI * s)] as const; }));
  const now = seriesPair(active), strength = alive ? Math.sin(Math.PI * u) : 0;
  return <Diagram stage={
    <Stage w={W} h={322} label={alive
      ? `A photon as a row of ${count} virtual electron-positron pairs. Pair ${active + 1} is turning ${now.clockwise ? 'clockwise' : 'counter-clockwise'}: its electric field points ${now.up > 0 ? 'up' : 'down'} and its magnetic field ${now.clockwise ? 'into' : 'out of'} the page.`
      : `A photon as a row of ${count} virtual electron-positron pairs. Between cycles, no pair is turning and both the electric and magnetic fields are zero.`}>
      <T x={24} y={66} anchor="start" tone="e" size="lg">E</T><T x={24} y={y + 6} anchor="start" size="sm">pairs</T><T x={24} y={264} anchor="start" tone="b" size="lg">B</T>
      {record && <Line d={wave} tone="e" w={1.4} opacity={0.5}/>}
      <line x1={x0 - spacing / 2} y1={62} x2={x0 + spacing * (count - 0.5)} y2={62} className="bk-s-faint" strokeWidth="1"/>
      <Arrow x1={x0 - spacing / 2} y1={306} x2={x0 + spacing * (count - 0.5)} y2={306} tone="muted" w={1.2} head={7}/><T x={W / 2} y={300} size="sm">direction of the photon</T>
      {Array.from({ length: count }, (_, n) => {
        const x = x0 + n * spacing, pair = seriesPair(n), live = alive && n === active, age = live ? u : n < active ? 1 : 0;
        const angle = pair.clockwise ? 180 - 180 * age : 180 + 180 * age, field = live ? strength : 0;
        return <g key={n}>
          <circle cx={x} cy={y} r={2} className="bk-f-faint"/>
          {record && !live && <g opacity={0.4}>
            <Zepton x={x} y={y} angle={90 * pair.up} len={spacing * 0.5} oval={false} signs={false}/>
            <Vector x={x} y={62} angle={90 * pair.up} len={30} centred tone="e" w={1.6} head={7}/>
            <InOut x={x} y={260} out={!pair.clockwise} r={7}/>
          </g>}
          {live && <>
            <Zepton x={x} y={y} angle={angle} len={spacing * 0.86} open={Math.max(0.18, strength)} emphasis="key" signs={spacing > 60}/>
            <Spin x={x} y={y} r={spacing * 0.5} ccw={!pair.clockwise} from={pair.clockwise ? 150 : 210} sweep={90}/>
            <Vector x={x} y={62} angle={90 * pair.up} len={6 + amp * field} centred tone="e" w={3}/>
            <InOut x={x} y={260} out={!pair.clockwise} r={5 + 8 * field} opacity={0.35 + 0.65 * field}/>
          </>}
        </g>;
      })}
      {/* Each pair's name fades in as it forms and out near the end of its turn; then, over the same place, its
          annihilation fades in and lingers into the next pair's start, slowly enough to read. */}
      {[active - 1, active].filter(n => n >= 0).map(n => {
        const tau = cycle - n, x = x0 + n * spacing, ly = y + spacing * 0.5 + 24;
        // Paused (or stepped with Next pair) there is no fading to watch: the pair in hand shows its name, or its
        // annihilation once its turn is nearly done, and the one before shows nothing.
        const still = !play.playing, mine = n === active;
        const name = still ? (mine && u < 0.8 ? 1 : 0) : Math.min(ramp(tau, 0, 0.18), 1 - ramp(tau, 0.5, 0.68));
        const gone = still ? (mine && u >= 0.8 ? 1 : 0) : Math.min(ramp(tau, 0.62, 0.8), 1 - ramp(tau, 1.2, 1.4));
        return <g key={n}>
          {name > 0 && <T x={x} y={ly} tone="mark" opacity={name}>pair {n + 1}</T>}
          {gone > 0 && <T x={x} y={ly + 20} tone="mark" opacity={gone}>annihilate &amp; reverse</T>}
        </g>;
      })}
    </Stage>}>
    <PlayBar play={play} label="the photon"/>
    <Action onClick={() => play.seek(((active + 1) % count) + (play.playing ? 0 : 0.5))}>Next pair</Action>
    <Toggle label="Show the whole series, as printed" checked={record} onChange={setRecord}/>
    <Readout label={`E of this pair, ${now.up > 0 ? 'up' : 'down'} the page`} value={percentOfPeak(strength)} tone="e"/>
    <Readout label={`B of this pair, ${now.clockwise ? 'into' : 'out of'} the page`} value={percentOfPeak(strength)} tone="b"/>
  </Diagram>;
}

type Vec = [number, number, number];
/** Scale a vector to unit length. */
const unit = ([x, y, z]: Vec): Vec => { const m = Math.hypot(x, y, z) || 1; return [x / m, y / m, z / m]; };

/**
 * The direction of a pair's positive end after a share u of its half-turn: it starts along the photon's path (x) and
 * turns through the polarization axis, which lies across the path at angle `polarization` from y.
 */
export function pairDirection(u: number, clockwise: boolean, polarization: number): Vec {
  const theta = Math.PI * u, s = clockwise ? 1 : -1, c = Math.cos(rad(polarization)), sn = Math.sin(rad(polarization));
  return [-Math.cos(theta), s * Math.sin(theta) * c, s * Math.sin(theta) * sn];
}

/** Figure 5-2: the central pair of a photon and the field of pairs round it, turning in response. */
function PhotonField() {
  const [follow, setFollow] = useState(1);
  const [polarization, setPolarization] = useState(0);
  const [everywhere, setEverywhere] = useState(false);
  const play = usePlayback({ speed: 0.4 });
  const W = 720, H = 400, ox = 380, oy = 200;
  // An oblique view, as printed: x to the right, y up the page, z toward the lower left.
  const project = ([x, y, z]: Vec): [number, number] => [ox + x - 0.62 * z, oy - y + 0.5 * z];
  const n = Math.floor(play.t), u = play.t - n, centre = pairDirection(u, n % 2 === 0, polarization), open = Math.max(0.2, Math.sin(Math.PI * u));
  const sites = useMemo(() => {
    const onAxis: { p: Vec; seed: number; dim: boolean }[] = [-3, -2, -1, 1, 2, 3].map((k, i) => ({ p: [0, 0, k * 64] as Vec, seed: 50 + i, dim: false }));
    const random = rng(91), off = Array.from({ length: 22 }, (_, i) => ({ p: [(random() - 0.5) * 420, (random() - 0.5) * 230, (random() - 0.5) * 300] as Vec, seed: 200 + i, dim: true }));
    return { onAxis, off };
  }, []);
  const pair = (p: Vec, dir: Vec, half: number, key: string, emphasis: 'key' | 'normal', opacity = 1) => {
    const [ax, ay] = project([p[0] + dir[0] * half, p[1] + dir[1] * half, p[2] + dir[2] * half]), [bx, by] = project([p[0] - dir[0] * half, p[1] - dir[1] * half, p[2] - dir[2] * half]);
    return <g key={key} opacity={opacity}>
      <line x1={ax} y1={ay} x2={bx} y2={by} className={emphasis === 'key' ? 'bk-s-mark' : 'bk-s-muted'} strokeWidth={emphasis === 'key' ? 3 : 1.6}/>
      <circle cx={bx} cy={by} r={emphasis === 'key' ? 7 : 5} className="bk-f-neg"/><circle cx={ax} cy={ay} r={emphasis === 'key' ? 7 : 5} className="bk-f-pos"/>
    </g>;
  };
  const neighbour = (site: { p: Vec; seed: number; dim: boolean }) => {
    // Each neighbour forms pointing its own random way, and takes a share of the central pair's direction.
    const random = rng(site.seed * 31 + n), own = unit([random() - 0.5, random() - 0.5, random() - 0.5]);
    const dir = unit([follow * centre[0] + (1 - follow) * own[0], follow * centre[1] + (1 - follow) * own[1], follow * centre[2] + (1 - follow) * own[2]]);
    return pair(site.p, dir, 15 * open + 3, `n${site.seed}`, 'normal', site.dim ? 0.45 : 0.95);
  };
  const [zx, zy] = project([0, 0, 250]), [zx0, zy0] = project([0, 0, -250]);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A photon moving in the x direction. The central pair is turning, and the pairs along the z axis turn with it, following it ${Math.round(follow * 100)} per cent.`}>
      <Arrow x1={ox} y1={oy} x2={ox + 250} y2={oy} tone="muted" w={1.6}/><T x={ox + 262} y={oy + 5} tone="text" anchor="start">x</T>
      <Arrow x1={ox} y1={oy} x2={ox} y2={oy - 170} tone="muted" w={1.6}/><T x={ox} y={oy - 178} tone="text">y</T>
      <Line d={`M${zx0} ${zy0} L${ox} ${oy}`} tone="faint" dash="4 4"/><Arrow x1={ox} y1={oy} x2={zx} y2={zy} tone="muted" w={1.6}/><T x={zx - 12} y={zy + 16} tone="text">z</T>
      {everywhere && sites.off.map(neighbour)}
      {sites.onAxis.filter(s => s.p[2] < 0).map(neighbour)}
      {pair([0, 0, 0], centre, 26 * open + 4, 'centre', 'key')}
      {sites.onAxis.filter(s => s.p[2] > 0).map(neighbour)}
      <T x={24} y={30} anchor="start" size="sm" tone="mark">central pair: half-turn {n + 1}, {n % 2 === 0 ? 'clockwise' : 'counter-clockwise'}</T>
      <T x={24} y={H - 16} anchor="start" size="sm">The view travels with the photon: each half-turn is the next central pair of the series.</T>
    </Stage>}>
    <PlayBar play={play} label="the pairs"/>
    <Slider label="How closely the field follows" value={follow} min={0.05} max={1} step={0.05} onChange={setFollow} show={v => (v === 1 ? '100 % (as drawn)' : `${Math.round(v * 100)} %`)}/>
    <Slider label="Plane of polarization" value={polarization} min={0} max={90} step={5} onChange={setPolarization} show={v => (v === 0 ? 'along y (as drawn)' : `${v}° from y`)}/>
    <Toggle label="Pairs throughout space, not only on z" checked={everywhere} onChange={setEverywhere}/>
    <Remark>{follow > 0.6 ? 'As drawn, every pair copies the central one.' : 'Nearer the text: the pairs are mostly random, with only a slight lean toward the central pair.'}</Remark>
  </Diagram>;
}

/** The pair-production energies of the text, in MeV. */
export const THRESHOLDS = { electron: 1.022, proton: 1877 };

/** What a photon's zepton can become at an energy (MeV), when the photon meets other matter. */
export const canProduce = (mev: number, nearMatter: boolean) => (!nearMatter ? 'none' : mev >= THRESHOLDS.proton ? 'proton' : mev >= THRESHOLDS.electron ? 'electron' : 'none');

/** Explorer: pair production as a change of state of a pair that was there all along. */
function PairProduction() {
  const [exp, setExp] = useState(-1); // log10 of the photon energy in MeV
  const [nearMatter, setNearMatter] = useState(true);
  const play = usePlayback({ speed: 0.5 });
  const mev = 10 ** exp, made = canProduce(mev, nearMatter), u = play.t % 1;
  const x = (e: number) => 60 + ((e + 3) / 7) * 600, cx = 360, cy = 110, apart = made === 'none' ? 0 : 40 + 150 * u;
  const energyOf = (m: number) => (m >= 1000 ? `${fmt(m / 1000)} GeV` : m >= 1 ? `${fmt(m)} MeV` : m >= 1e-3 ? `${fmt(m * 1000)} keV` : `${fmt(m * 1e6)} eV`), energy = energyOf(mev);
  return <Diagram stage={
    <Stage h={270} label={`A photon of ${energy}. ${made === 'none' ? 'Its pair stays virtual.' : `It has enough energy for a stable ${made === 'proton' ? 'proton and antiproton' : 'electron and positron'}.`}`}>
      {made === 'none'
        ? <><Zepton x={cx} y={cy} angle={90 - 180 * u} len={70} open={Math.max(0.2, Math.sin(Math.PI * u))} signs/><T x={cx} y={cy + 66} size="sm">a zepton of the photon: virtual, gone in half a wavelength</T></>
        : <><Charge x={cx - apart} y={cy} sign={-1} r={made === 'proton' ? 17 : 12} label={made === 'proton' ? 'antiproton' : 'electron'}/><Charge x={cx + apart} y={cy} sign={1} r={made === 'proton' ? 17 : 12} label={made === 'proton' ? 'proton' : 'positron'}/><T x={cx} y={cy + 66} size="sm">free and stable: the particles were there all along</T></>}
      {nearMatter && <><circle cx={cx} cy={cy - 74} r={9} className="bk-body bk-body-plain"/><T x={cx + 18} y={cy - 70} anchor="start" size="sm">other matter, to conserve momentum</T></>}
      <line x1={60} y1={216} x2={660} y2={216} className="bk-s-faint" strokeWidth="6" strokeLinecap="round"/>
      <line x1={60} y1={216} x2={x(exp)} y2={216} className="bk-s-e" strokeWidth="6" strokeLinecap="round"/>
      {([['1.022 MeV', Math.log10(THRESHOLDS.electron)], ['1877 MeV', Math.log10(THRESHOLDS.proton)]] as [string, number][]).map(([name, e]) => <g key={name}><line x1={x(e)} y1={202} x2={x(e)} y2={230} className="bk-s-mark" strokeWidth="2"/><T x={x(e)} y={250} size="sm" tone="mark">{name}</T></g>)}
      <T x={60} y={196} size="sm" anchor="start">1 keV</T><T x={660} y={196} size="sm" anchor="end">10 GeV</T>
    </Stage>}>
    <Slider label="Energy of the photon" value={exp} min={-3} max={4} step={0.02} onChange={setExp} show={v => energyOf(10 ** v)}/>
    <Toggle label="The photon meets other matter" checked={nearMatter} onChange={setNearMatter}/>
    <PlayBar play={play} label="the pair"/>
    <Remark tone={made === 'none' ? undefined : 'good'}>{!nearMatter ? 'In free space there is no pair production at any energy: momentum could not be conserved.' : made === 'none' ? 'Below 1.022 MeV the pair cannot become a stable electron and positron (0.511 MeV each).' : made === 'electron' ? 'At 1.022 MeV or more: a stable electron and a stable positron.' : 'At 1877 MeV or more a photon made of a proton-antiproton pair can free those too.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 5,
  summary: <>
    <p>If a vacuum fluctuation is a pair, so is every photon. <Q>A photon is nothing more than a series of virtual particle pairs</Q>, each one turning half a turn, annihilating, and inducing the next so that energy, momentum and the field are conserved (<Pg n={43}/>, <Pg n={44}/>). The pairs round the central series are part of the photon too: they are its wave.</p>
    <p>Fleming names virtual particle pairs <strong>zeptons</strong> (<Pg n={46}/>). The photon is then not a fundamental particle but <Q>an elementary form of energy transport through the zero-point field</Q>.</p>
  </>,
  items: [
    {
      kind: 'figure', id: '5-1', page: 43, section: 'The Virtual Photon', title: 'A photon, pair by pair',
      caption: 'A series of alternately rotating virtual electron-positron pairs produces an alternating E field (up and down) and an alternating B field (in and out) identical to that of a photon.',
      Diagram: PairSeries,
      text: <>
        <p><Q>Each particle pair in the series serves to conserve energy and momentum while neutralizing the previous electric and magnetic field</Q> (<Pg n={43}/>).</p>
        <p>The hand-off works like a coil whose current is cut: the collapsing field drives a current the other way. <Q>The first particle pair in a series produces an electric and magnetic field. When that pair is annihilated, the surrounding field reverses electric and magnetic polarity in an effort to neutralize the previous field. Those fields induce a new central particle pair</Q>, <Q>produced out of vacuum in exactly the correct position, with the correct energy and state of polarization</Q> (<Pg n={44}/>).</p>
      </>,
      tryThis: [
        'Watch one pair: it forms, turns half a turn while its E and B rise and fall, and is gone. The next forms half a wavelength on, turning the other way, so E and B point the other way.',
        'Press “Next pair” with the animation paused to step through the series one hand-off at a time.',
        'Turn off “Show the whole series”. What is left is what exists at one moment: a single pair. The printed figure shows all nine at once, as a record of the photon’s passage.',
      ],
      notes: <p>The figure prints every pair at once. That only one pair of the series exists at a time follows the text (<Q>When that pair is annihilated … induce a new central particle pair</Q>). Each pair is shown turning where it forms; Fleming does not say outright whether a pair turns in place or travels with the photon (see Figure 4-8). The pair’s opening and closing as it turns follows <Pg n={55}/>.</p>,
      labs: [
        { lab: 'light', scenario: 'induction', why: 'The series in three dimensions with the surrounding medium, a probe and the field plotted along the path.' },
        { lab: 'light', scenario: 'absorption', why: 'What happens to the field’s energy when the last pair of the series meets a wall.' },
      ],
    },
    {
      kind: 'figure', id: '5-2', page: 44, title: 'The pairs round the photon are its wave',
      caption: 'A photon moving in the x direction with a central pair (black) surrounded by a field of particle pairs all rotating in response to the central pair’s rotation.',
      Diagram: PhotonField,
      text: <>
        <p>The fields the central pairs produce <Q>are also virtual particle pairs</Q>. <Q>It is the associated virtual particle pairs across the zero-point field that form a wave front and give a photon its wavelike properties as they oscillate in response to the central pair’s motion</Q> (<Pg n={44}/>).</p>
        <p>The figure shows them only along z, with charges along y; they are in reality throughout space. And they do not all copy the central pair: they are <Q>somewhat randomized and only slightly biased in the direction consistent with the photon’s central pair</Q>, because <Q>only a small amount of change by a small percentage of vacuum fluctuations is required</Q> (<Pg n={45}/>).</p>
        <p>When the central pair meets something the photon acts as a particle; when the wave front of associated pairs does, it acts as a wave.</p>
      </>,
      tryThis: [
        'At 100 % the picture is the printed figure: every pair along z turns with the central one.',
        'Lower “How closely the field follows” toward 10 %. This is what the text says is really there: mostly random pairs with a slight lean.',
        'Turn on “Pairs throughout space” to add the ones the figure leaves out.',
        'Turn the plane of polarization. In linear polarization the pairs rotate parallel to the axis of polarization (p. 45).',
      ],
      notes: <p>The figure draws curled arrows, not pairs; the pairs and their charges here follow the text (<Q>rotating with positive and negative charges oriented along the y-axis</Q>). No fall-off with distance is drawn here; chapter 19 gives it as the inverse square.</p>,
      labs: [{ lab: 'light', scenario: 'induction', query: 'cam=orbit', why: 'Background pairs that lean with the field as the photon passes, with the bias magnified so it can be seen.' }],
    },
    {
      kind: 'explorer', id: 'x5-1', page: 46, section: 'The Zepton', title: 'Pair production: the pair was already there',
      Diagram: PairProduction,
      text: <>
        <p><Q>In a zepton, an electron and positron can already be present and so they do not have to be produced by some secondary effect.</Q> A photon with at least 1.022 MeV has enough energy for a stable 0.511 MeV electron and a stable 0.511 MeV positron. It <Q>does have to interact with other matter to conserve momentum, so pair production does not occur in free space</Q> (<Pg n={46}/>).</p>
        <p>The same holds for a photon made of a proton-antiproton pair at 1877 MeV. Virtual pairs themselves exist over a continuum of energies, below and above these values (<Pg n={45}/>).</p>
      </>,
      tryThis: ['Raise the energy past 1.022 MeV: the virtual pair becomes a free electron and positron.', 'Turn off “The photon meets other matter”: nothing is produced, at any energy.', 'Go on past 1877 MeV for the proton and antiproton.'],
    },
  ],
  labs: [{ lab: 'light', scenario: 'induction', why: 'This chapter as a laboratory: wavelength, polarization and direction to set, each hand-off to step through.' }],
};
export default chapter;
