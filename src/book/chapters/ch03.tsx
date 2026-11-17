// Chapter 3: The Casimir Effect, The Model Force (PDF pp. 27–32). Figures 3-1 to 3-4.
import { useMemo, useState } from 'react';
import { Arrow, BlockArrow, Charge, Choice, Diagram, PlayBar, Readout, Remark, Slider, Stage, T, Toggle, fmt, rng, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';

const HBAR = 1.054571817e-34, C = 299792458;

/** The moment of each of two collinear dipoles once each has responded to the other's field (p₀ = 1, lengths in dipole lengths). */
export function respondedMoment(orientation: 'I' | 'II', alpha: number, r: number) {
  // On the axis a dipole's field is 2p/r³ along its moment: it opposes the other dipole in I and reinforces it in II.
  return 1 / (1 + (orientation === 'I' ? 1 : -1) * (2 * alpha) / r ** 3);
}

/** The force between two collinear dipoles, positive when it pushes them apart (6p₁p₂/r⁴). */
export const dipoleForce = (orientation: 'I' | 'II', p: number, r: number) => (orientation === 'I' ? 1 : -1) * (6 * p * p) / r ** 4;

/** Figure 3-1: Debye's two orientations, with each dipole's moment free to respond to the other. */
function DebyeDipoles() {
  const [orientation, setOrientation] = useState<'I' | 'II'>('I');
  const [alpha, setAlpha] = useState(0.8);
  const [r, setR] = useState(2.4);
  const p = respondedMoment(orientation, alpha, r), force = dipoleForce(orientation, p, r);
  const mean = (dipoleForce('I', respondedMoment('I', alpha, r), r) + dipoleForce('II', respondedMoment('II', alpha, r), r)) / 2;
  const unit = 118, cx = 360, y = 148, half = (unit * p) / 2, xl = cx - (r * unit) / 2, xr = cx + (r * unit) / 2;
  // Left dipole is always − +. The right one is + − in I (like charges face) and − + in II (opposite charges face).
  const rightSigns: [1 | -1, 1 | -1] = orientation === 'I' ? [1, -1] : [-1, 1];
  const change = p < 0.999 ? 'smaller' : p > 1.001 ? 'larger' : 'unchanged';
  // The arrow grows with the square root of the force, so it stays visible across the slider's range.
  const push = 14 + 86 * Math.sqrt(Math.abs(force));
  return <Diagram stage={
    <Stage h={290} label={`Two dipoles on a line in Debye's orientation ${orientation}. Each moment is ${change} than when alone, and the dipoles ${force > 0 ? 'repel' : 'attract'}.`}>
      <T x={cx} y={34} size="lg" tone="text">{orientation === 'I' ? 'I · like charges face each other' : 'II · opposite charges face each other'}</T>
      {[{ x: xl, signs: [-1, 1] as [1 | -1, 1 | -1], dir: -1 }, { x: xr, signs: rightSigns, dir: 1 }].map(d => <g key={d.x}>
        <line x1={d.x - half} x2={d.x + half} y1={y} y2={y} className="bk-s-muted" strokeWidth="3"/>
        <line x1={d.x - unit / 2} x2={d.x + unit / 2} y1={y + 40} y2={y + 40} className="bk-s-muted" strokeWidth="1" strokeDasharray="3 4"/>
        <Charge x={d.x - half} y={y} sign={d.signs[0]} r={15}/><Charge x={d.x + half} y={y} sign={d.signs[1]} r={15}/>
        {/* Debye's small arrows: toward each other when the moment shrinks, apart when it grows. */}
        {Math.abs(p - 1) > 0.004 && <>
          <Arrow x1={d.x - half - (p < 1 ? 30 : 4)} y1={y + 26} x2={d.x - half - (p < 1 ? 4 : 30)} y2={y + 26} tone="mark" w={1.6} head={7}/>
          <Arrow x1={d.x + half + (p < 1 ? 30 : 4)} y1={y + 26} x2={d.x + half + (p < 1 ? 4 : 30)} y2={y + 26} tone="mark" w={1.6} head={7}/>
        </>}
        {/* The other dipole's field here. */}
        <Arrow x1={d.x - (orientation === 'I' ? d.dir : 1) * 34} y1={y + 62} x2={d.x + (orientation === 'I' ? d.dir : 1) * 34} y2={y + 62} tone="e" w={2}/>
        <T x={d.x} y={y + 84} size="sm" tone="e">field of the other dipole</T>
        {/* The force on this dipole. */}
        <BlockArrow x1={d.x} y1={y - 50} x2={d.x + d.dir * Math.sign(force) * push} y2={y - 50} thick={12}/>
      </g>)}
      <T x={cx} y={y - 46} size="sm">{force > 0 ? 'pushed apart' : 'drawn together'}</T>
      <T x={cx} y={272} size="sm">Dashed line: the dipole’s length when it is alone.</T>
    </Stage>}>
    <Choice label="Orientation" value={orientation} onChange={setOrientation} options={[{ value: 'I', label: 'I' }, { value: 'II', label: 'II' }]}/>
    <Slider label="How easily the charges shift" value={alpha} min={0} max={1.5} step={0.05} onChange={setAlpha}/>
    <Slider label="Distance between dipoles" value={r} min={1.9} max={3.6} step={0.05} onChange={setR} unit="lengths"/>
    <Readout label="Electric moment" value={`${fmt(p)} × alone`} tone={p < 1 ? 'bad' : 'good'}/>
    <Readout label="Force in this orientation" value={`${fmt(Math.abs(force), 3)} ${force > 0 ? 'apart' : 'together'}`}/>
    <Readout label="Average of I and II" value={Math.abs(mean) < 1e-9 ? 'zero' : `${fmt(Math.abs(mean), 3)} ${mean > 0 ? 'apart' : 'together'}`} tone={mean < -1e-9 ? 'good' : undefined}/>
    <Remark>{alpha === 0 ? 'With rigid dipoles the two orientations cancel: no net force.' : orientation === 'I' ? 'The moments shrink, so this repulsion is weakened.' : 'The moments grow, so this attraction is strengthened.'}</Remark>
  </Diagram>;
}

/** Where the electron of Figure 3-2 is at a moment: a point on the shell, crowded to one side as the field grows. */
export function electronAngle(u: number, field: number, toward: number) {
  // With no field every direction is as likely as any other; a full field keeps the electron within a narrow arc.
  const spread = 360 * (1 - 0.86 * field);
  return toward + (u - 0.5) * spread;
}

/** Figure 3-2: a hydrogen atom, neutral with no field and an induced dipole in one. */
function InducedDipole() {
  const [field, setField] = useState(0);
  const [right, setRight] = useState(true);
  const play = usePlayback();
  const cx = 300, cy = 170, R = 86;
  // The electron is drawn where it has been over the last moments: forty positions, the newest brightest.
  const frame = Math.floor(play.t * 24), toward = right ? 180 : 0; // the electron is pulled against the field
  const trail = useMemo(() => Array.from({ length: 44 }, (_, i) => {
    const random = rng(1000 + frame - i), a = electronAngle(random(), field, toward), rr = R + (random() - 0.5) * 16;
    return { x: cx + rr * Math.cos((a * Math.PI) / 180), y: cy - rr * Math.sin((a * Math.PI) / 180) * (1 - 0.25 * field), age: i };
  }), [frame, field, toward]);
  const meanX = trail.reduce((s, p) => s + p.x, 0) / trail.length - cx, moment = Math.abs(meanX) / R;
  return <Diagram stage={
    <Stage h={340} label={field < 0.05 ? 'A hydrogen atom with no field: the electron is found all round the proton, so the atom appears neutral.' : `A hydrogen atom in an electric field: the electron stays mostly to the ${right ? 'left' : 'right'} of the proton, making an induced dipole.`}>
      <circle cx={cx} cy={cy} r={R} className="bk-s-faint" fill="none" strokeDasharray="2 5"/>
      {trail.map(p => <circle key={p.age} cx={p.x} cy={p.y} r={p.age === 0 ? 6 : 3.4} className="bk-f-neg" opacity={p.age === 0 ? 1 : 0.5 * (1 - p.age / 44)}/>)}
      <Charge x={cx} y={cy} sign={1} r={13} label="proton"/>
      {field > 0.04 && <>
        <Arrow x1={cx - (right ? 1 : -1) * (20 + 60 * field)} y1={52} x2={cx + (right ? 1 : -1) * (20 + 60 * field)} y2={52} tone="e" w={2.5}/>
        <T x={cx} y={36} tone="e" size="sm">local electric field</T>
        <line x1={cx} y1={cy + 118} x2={cx + meanX} y2={cy + 118} className="bk-s-mark" strokeWidth="3"/>
        <circle cx={cx + meanX} cy={cy + 118} r={4} className="bk-f-neg"/><circle cx={cx} cy={cy + 118} r={4} className="bk-f-pos"/>
        <T x={cx} y={cy + 142} size="sm" tone="mark">average positions: an electric dipole</T>
      </>}
      <T x={560} y={150} tone="text" size="lg">{field < 0.05 ? 'A' : field > 0.6 ? 'B' : 'A → B'}</T>
      <T x={560} y={174} size="sm">{field < 0.05 ? 'appears neutral' : 'induced dipole'}</T>
    </Stage>}>
    <Slider label="Local electric field" value={field} min={0} max={1} step={0.02} onChange={setField} show={v => (v === 0 ? 'none' : `${Math.round(v * 100)} %`)}/>
    <Toggle label="Field points to the right" checked={right} onChange={setRight}/>
    <PlayBar play={play} label="the electron"/>
    <Readout label="Induced moment" value={`${fmt(field < 0.02 ? 0 : moment)} of the most it could be`}/>
  </Diagram>;
}

/** One oval of Figure 3-3: a fluctuation of a wavelength, at a place, with a phase so it comes and goes. */
interface Fluctuation { x: number; y: number; len: number; angle: number; phase: number; between: boolean }

/** Whether a fluctuation of a wavelength can exist in a gap: Fleming's rule for Figure 3-3. */
export const fitsBetween = (wavelength: number, gap: number) => wavelength <= gap;

/** Figure 3-3: fluctuations of every wavelength outside the plates, and only those that fit between them. */
function PlatesAndFluctuations() {
  const [gap, setGap] = useState(70);
  const play = usePlayback();
  const W = 720, H = 430, top = 16, floor = 350, plate = 20, cx = W / 2, shortest = 10, range = 17;
  const population = useMemo(() => {
    const random = rng(33), list: Fluctuation[] = [];
    // Outside: every size. Wavelengths are spread evenly on a logarithmic scale, as "of any size".
    for (let i = 0; i < 46; i++) {
      const len = shortest * (range ** random()), side = i % 2 ? 1 : -1;
      list.push({ x: cx + side * (150 + random() * 190), y: top + 16 + random() * (floor - top - 32), len, angle: random() * 180, phase: random(), between: false });
    }
    // Between: the same spread of sizes is offered; the gap decides which can exist there.
    for (let i = 0; i < 26; i++) list.push({ x: random() - 0.5, y: top + 14 + random() * (floor - top - 28), len: shortest * (range ** random()), angle: 60 + random() * 60, phase: random(), between: true });
    return list;
  }, [cx]);
  const inside = population.filter(f => f.between), fit = inside.filter(f => fitsBetween(f.len, gap));
  // The strip under the plates: every wavelength offered to the gap, on a logarithmic scale, and where the gap falls.
  const sx = (len: number) => 90 + (Math.log(len / shortest) / Math.log(range)) * 540;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two plates ${gap} units apart. Fluctuations of every size appear outside; between the plates only those no longer than the gap appear, ${fit.length} of the ${inside.length} sizes offered.`}>
      {population.map((f, i) => {
        if (f.between && !fitsBetween(f.len, gap)) return null;
        // Each fluctuation appears, swells and vanishes; longer wavelengths are shown lasting longer.
        const life = ((play.t * 22) / (f.len + 14) + f.phase) % 1, swell = 0.35 + 0.65 * Math.sin(Math.PI * life);
        const x = f.between ? cx + f.x * Math.max(0, gap - f.len * 0.5) * 0.7 : f.x, angle = f.between ? 90 + (f.angle - 90) * Math.min(1, gap / 120) : f.angle;
        return <ellipse key={i} cx={x} cy={f.y} rx={(f.len / 2) * swell} ry={Math.max(3, f.len * 0.19) * swell} transform={`rotate(${-angle} ${x} ${f.y})`} className="bk-zepton-oval" opacity={0.3 + 0.7 * Math.sin(Math.PI * life)}/>;
      })}
      <rect x={cx - gap / 2 - plate} y={top} width={plate} height={floor - top} className="bk-plate"/>
      <rect x={cx + gap / 2} y={top} width={plate} height={floor - top} className="bk-plate"/>
      <Arrow x1={cx - gap / 2} y1={floor + 10} x2={cx + gap / 2} y2={floor + 10} both tone="mark" w={1.4} head={6}/>
      <T x={90} y={floor + 34} anchor="start" size="sm">Wavelengths offered to the gap</T>
      <line x1={90} y1={floor + 54} x2={630} y2={floor + 54} className="bk-s-faint" strokeWidth="1"/>
      {inside.map((f, i) => <line key={i} x1={sx(f.len)} x2={sx(f.len)} y1={floor + 44} y2={floor + 64} className={fitsBetween(f.len, gap) ? 'bk-s-accent' : 'bk-s-danger'} strokeWidth="2.5"/>)}
      <line x1={sx(gap)} x2={sx(gap)} y1={floor + 38} y2={floor + 70} className="bk-s-mark" strokeWidth="2" strokeDasharray="3 3"/>
      <T x={90} y={floor + 78} anchor="start" size="sm" tone="accent">shorter: fit</T><T x={630} y={floor + 78} anchor="end" size="sm" tone="danger">longer than the gap: shut out</T>
    </Stage>}>
    <Slider label="Distance between the plates" value={gap} min={14} max={170} step={2} onChange={setGap} show={v => `${v} units`}/>
    <PlayBar play={play} label="the fluctuations"/>
    <Readout label="Longest wavelength that fits" value={`${gap} units`}/>
    <Readout label="Sizes shut out of the gap" value={`${inside.length - fit.length} of ${inside.length}`} tone={inside.length - fit.length ? 'bad' : undefined}/>
    <Remark>Outside the plates nothing is excluded, at any gap.</Remark>
  </Diagram>;
}

/** The Casimir pressure between ideal plates a distance d apart, in pascals (Equation 3-1 divided by the area). */
export const casimirPressure = (d: number) => (HBAR * C * Math.PI ** 2) / (240 * d ** 4);

/** A length in metres as nanometres or micrometres. */
const length = (m: number) => (m < 1e-6 ? `${fmt(m * 1e9)} nm` : `${fmt(m * 1e6)} µm`);

/** Figure 3-4: the pressure on each side of the plates, almost in balance, and Equation 3-1 for the difference. */
function PressureBalance() {
  const [exp, setExp] = useState(-7); // log10 of the gap in metres
  const [area, setArea] = useState(1); // cm²
  const [magnify, setMagnify] = useState(true);
  const d = 10 ** exp, P = casimirPressure(d), F = P * area * 1e-4;
  const W = 720, H = 320, cx = W / 2, gap = 150 + (exp + 8) * 30, plate = 22, y = 146, full = 150, thick = 56;
  // The true reduction is far too small to draw, so the deficit shown follows the logarithm of the pressure.
  const deficit = magnify ? Math.max(0.04, Math.min(0.7, (Math.log10(P) + 8) / 19)) : 0;
  const inner = gap / 2 - 4, slim = thick * (1 - deficit);
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two plates ${length(d)} apart. The pressure from outside is unchanged; the pressure between them is slightly less, leaving ${fmt(P)} pascals pushing the plates together.`}>
      <rect x={cx - gap / 2 - plate} y={24} width={plate} height={244} className="bk-plate"/>
      <rect x={cx + gap / 2} y={24} width={plate} height={244} className="bk-plate"/>
      <BlockArrow x1={cx - gap / 2 - plate - full} y1={y} x2={cx - gap / 2 - plate - 2} y2={y} thick={thick}/>
      <BlockArrow x1={cx + gap / 2 + plate + full} y1={y} x2={cx + gap / 2 + plate + 2} y2={y} thick={thick}/>
      <BlockArrow x1={cx} y1={y} x2={cx - inner} y2={y} thick={slim} tone="muted"/>
      <BlockArrow x1={cx} y1={y} x2={cx + inner} y2={y} thick={slim} tone="muted"/>
      <T x={cx - gap / 2 - plate - full / 2} y={y - 62} size="sm">pressure from outside:</T>
      <T x={cx - gap / 2 - plate - full / 2} y={y - 46} size="sm">the same at any gap</T>
      <T x={cx} y={y + 74} size="sm">{magnify ? 'between: slightly less (magnified)' : 'between: less, but too little to see'}</T>
      <Arrow x1={cx - gap / 2} y1={288} x2={cx + gap / 2} y2={288} both tone="mark" w={1.4} head={6}/><T x={cx} y={308} size="sm" tone="mark">d = {length(d)}</T>
    </Stage>}>
    <Slider label="Distance between the plates, d" value={exp} min={-8} max={-5} step={0.05} onChange={setExp} show={() => length(d)}/>
    <Slider label="Area of the plates, A" value={area} min={0.1} max={10} step={0.1} onChange={setArea} unit="cm²"/>
    <Toggle label="Magnify the difference" checked={magnify} onChange={setMagnify}/>
    <Readout label="Pressure difference" value={`${fmt(P)} Pa`} tone="force"/>
    <Readout label="Force pushing them together" value={`${fmt(F)} N`} tone="force"/>
    <Remark>Halve the distance and the force grows sixteen times: d is to the fourth power.</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 3,
  summary: <>
    <p>Casimir and Polder treated vacuum fluctuations as induced dipoles that act on each other as molecules do, through van der Waals forces, and so press on matter. Two plates close together shut the longer wavelengths out of the space between them. The pressure from outside is then a little greater than the pressure from between, and the plates are pushed together.</p>
    <p>Fleming takes this as the model for every force that follows: a force is a difference in the pressure of the vacuum on opposite sides of a body. It also answers the infinity problem of chapter 2, because almost all the energy stays in balance on both sides (<Pg n={30}/>, <Pg n={31}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '3-1', page: 28, section: 'Van der Waals Forces', title: 'Debye’s dipoles: why the average is attraction',
      caption: 'Debye’s illustration of pairs of dipoles shown in opposite charge orientations with the effect on each dipoles electric moment. An arrow pointing in the direction of the negative charge indicates a decrease in electric moment while an arrow pointing in the direction of a positive charge indicates an increase in electric moment.',
      Diagram: DebyeDipoles,
      text: <>
        <p>Static dipoles can sit in two opposite orientations, I and II, and every one between. Seen from far off a gas of them has no net charge, and with rigid dipoles no net force. Debye’s point is that the electric moment of each dipole changes: <Q>The dipole moment increases as the space between the charges increases</Q> (<Pg n={27}/>).</p>
        <p>In I the dipoles repel, and the charges inside each are drawn together, which <Q>reduces the net amount of repulsion</Q>. In II the charges inside each dipole <Q>spread out further, thus increasing their electric moments and increasing the net forces between</Q>. So <Q>In each case the secondary force is an attractive one</Q> (<Pg n={28}/>).</p>
      </>,
      tryThis: [
        'Set “How easily the charges shift” to 0. The forces in I and II are equal and opposite, and their average is zero: the rigid-dipole gas with no van der Waals force.',
        'Raise it again and switch between I and II. Watch the small arrows under each dipole, which are Debye’s: inward in I, outward in II.',
        'Read the average of I and II as you bring the dipoles closer. It is always “together”, and it grows quickly.',
      ],
      notes: <>
        <p>The text calls II <Q>a repulsive configuration</Q>, but the figure draws II with opposite charges facing, which attract, and the conclusion that both secondary effects are attractive needs that. The diagram follows the figure.</p>
        <p>The numbers are a textbook pair of dipoles on a line (field 2<V>p</V>/<V>r</V>³, force 6<V>p</V>²/<V>r</V>⁴) in arbitrary units. Fleming gives no formula here.</p>
      </>,
      labs: [{ lab: 'vdw', scenario: 'correlated', why: 'Two fluctuating dipoles settle into step and attract, with the London energy plotted against their separation.' }],
    },
    {
      kind: 'figure', id: '3-2', page: 28, title: 'A neutral atom becomes a dipole',
      caption: 'One hydrogen atom A where the electron randomly propagates a shell around the proton, such that the atom appears electrically neutral. The second hydrogen atom B is an induced dipole with the electron primarily occupying a region off to one side of the proton in response to a local electric field.',
      Diagram: InducedDipole,
      text: <>
        <p>An induced dipole is one that is normally neutral. In hydrogen <Q>the electron’s position is so random that it can be approximated as a shell</Q>. In an electric field <Q>the two particles will favor an polar alignment with the field such that opposite charges are adjacent to each other</Q>, and the atom becomes a dipole (<Pg n={29}/>).</p>
        <p>This matters for what follows because Casimir’s forces are those between induced dipoles, <Q>where those induced dipoles are vacuum fluctuations</Q>.</p>
      </>,
      tryThis: [
        'With no field, watch where the electron has been: all round the proton. Its average position is on the proton, so the atom looks neutral (atom A).',
        'Raise the field. The electron keeps to one side, and the average positions of the two charges separate (atom B).',
        'Reverse the field and the dipole reverses with it.',
      ],
      notes: <p>How far the electron crowds to one side for a given field is a display choice; the text gives only the two ends, A and B.</p>,
      labs: [{ lab: 'vdw', scenario: 'induced', why: 'The same step as a laboratory stage, with the induced moment as p = αE.' }],
    },
    {
      kind: 'figure', id: '3-3', page: 29, section: 'Casimir Effect Fundamentals', title: 'What the plates shut out',
      caption: 'A simple illustration of the Casimir Effect between two plates. The force between the two plates is retarded because the longer wavelengths are excluded from the cavity between the plates.',
      Diagram: PlatesAndFluctuations,
      text: <>
        <p>The ovals are vacuum fluctuations of various wavelengths. In open space they may be of any size. Between the plates, <Q>vacuum fluctuations with wavelengths that are longer than the distance between the plates will be excluded from that space. These longer wavelengths will however still exist outside the plates</Q> (<Pg n={29}/>).</p>
        <p>As the plates come together, <Q>an increasing number of shorter and shorter wavelength, higher and higher energy, zero-point vacuum fluctuations are excluded from the space between</Q> (<Pg n={30}/>). Most of the energy is in fluctuations smaller than any drawn, so the two pressures stay close to equal.</p>
      </>,
      tryThis: [
        'Narrow the gap. Longer fluctuations stop appearing between the plates one size after another, while every size goes on appearing outside.',
        'Watch the strip under the plates: each mark is a wavelength offered to the gap. Marks to the right of the dashed line are longer than the gap and are shut out.',
        'Open the gap wide. Almost everything fits again, which is why the force is negligible at everyday distances.',
      ],
      notes: <p>The sizes drawn span a range of 17 to 1 so they can be seen; the real range runs from the Planck length upward. How long each oval lasts is illustrative (longer wavelengths are shown lasting longer).</p>,
      labs: [{ lab: 'vdw', scenario: 'pressure', query: 'split=fig-3-3', why: 'Adjustable plates with the pressure, force and energy the gap gives, beside this figure.' }],
    },
    {
      kind: 'figure', id: '3-4', page: 30, title: 'Two great pressures, almost in balance',
      caption: 'A simple graphic illustration of the Casimir Effect between two plates showing how the force represented by black arrows is only slightly reduced in between the plates as designated by the gray line.',
      Diagram: PressureBalance,
      text: <>
        <p><Q>The pressure pushing the plates together stays the same, while the pressure pushing the plates apart becomes slightly smaller.</Q> The effect is not noticeable at everyday distances, <Q>but once you get down to micron distances or less, the change in pressure becomes significant, and the plates are pushed together</Q> (<Pg n={30}/>).</p>
        <p>This is how Fleming meets the infinity problem. A nearly infinite energy on one side only would accelerate a body to the speed of light almost at once; because the forces stay largely in balance, <Q>We only have to worry about a small pressure differential</Q>. The size of that differential between plates is Equation 3-1 (<Pg n={31}/>):</p>
        <Eq n="3-1"><V>F</V> = <Frac top={<>ħ<V>c</V>π²</>} bottom={<>240 <V>d</V>⁴</>}/> <V>A</V></Eq>
      </>,
      tryThis: [
        'Slide the distance from 10 µm down to 10 nm and watch the pressure difference: twelve powers of ten, from about a ten-millionth of a pascal to more than the pressure of the atmosphere.',
        'Turn off “Magnify the difference”. The inner arrows are now drawn as large as the outer ones: against the whole pressure of the vacuum the reduction cannot be seen, which is the point of the figure.',
        'Change the area. The force follows it in proportion, as Equation 3-1 says.',
      ],
      notes: <p>The readouts are Equation 3-1. The length of the inner arrows when magnified is a display choice (it follows the logarithm of the pressure difference); the figure gives no scale.</p>,
      labs: [{ lab: 'vdw', scenario: 'pressure', query: 'split=fig-3-4', why: 'The same equation as a plot against the gap, with a sweep you can export.' }],
    },
  ],
  labs: [
    { lab: 'vdw', scenario: 'induced', why: 'This chapter as a three-stage laboratory: induce a dipole, correlate the fluctuations, reveal the pressure.' },
    { lab: 'casimir', scenario: 'electron-proton', why: 'The same pressure argument carried to two charges, where chapter 6 takes it.' },
  ],
};
export default chapter;
