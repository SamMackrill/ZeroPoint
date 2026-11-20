// Chapter 26: The Weak Interaction (PDF pp. 201–206). Figure 26-1.
import { useState } from 'react';
import { Arrow, Charge, Choice, Diagram, PlayBar, Readout, Remark, Stage, T, Zepton, clamp, ease, lerp, polar, usePlayback } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;
type Process = 'hawking' | 'neutron' | 'capture';

/** What each process starts with, what crosses the boundary, and what is left, as the chapter describes them. */
export const PROCESSES: Record<Process, { name: string; boundary: string; inside: string; enters: string; left: string; freed: string }> = {
  hawking: { name: 'Hawking radiation', boundary: 'event horizon of a black hole', inside: 'the black hole', enters: 'One half of the pair falls inside', left: 'a black hole that has given up the energy', freed: 'The half outside becomes a free particle' },
  neutron: { name: 'Neutron decay', boundary: 'shell of a neutron', inside: 'a proton collocated with an electron', enters: 'The positron half crosses into the shell and annihilates with the electron inside', left: 'a proton', freed: 'The virtual electron is freed at some distance from the proton' },
  capture: { name: 'Electron capture', boundary: 'nucleus of an atom', inside: 'a proton of the nucleus', enters: 'The electron half is deposited in the nucleus and absorbed by a proton', left: 'a neutron in place of the proton', freed: 'The positron half annihilates the orbital electron' },
};

/** Figure 26-1: a virtual pair forms at a boundary and only one half crosses it. */
function PairAtBoundary() {
  const [process, setProcess] = useState<Process>('hawking');
  const play = usePlayback({ speed: 0.22 });
  const spec = PROCESSES[process], H = 380, cx = 230, cy = 190, R = process === 'capture' ? 40 : 110;
  // Before first play (or under reduced motion), show the pair formed at the boundary as printed.
  const u = !play.playing && play.t === 0 ? 0.24 : play.t % 1;
  // Four steps: the pair forms and opens, one half crosses into the boundary, and the other annihilates or escapes free.
  const forming = ease(u / 0.26), parting = ease((u - 0.28) / 0.26), settled = ease((u - 0.52) / 0.22), drop = ease((u - 0.62) / 0.24), done = u > 0.86;
  // In capture the pair opens between the nucleus and an inner orbital electron (pp. 203–204): the electron is absorbed
  // by a proton to form a neutral neutron, the positron annihilates the inner orbital electron, and an outer orbital
  // electron drops into the vacated orbital, emitting a photon.
  const capture = process === 'capture', innerR = 136, outerR = 180, bx = capture ? cx + 80 : cx + R + 14;
  // The half that stays outside moves off in one continuous motion: gathering speed as the pair parts, then carrying on
  // steadily once free, rather than stopping between the two.
  const away = clamp((u - 0.28) / 0.72), flight = away < 0.3 ? (away * away) / 0.6 : away - 0.15;
  const inward = capture ? lerp(cx + 22, cx, parting) : lerp(bx - 14, cx + 40, parting);
  const outward = capture ? lerp(cx + innerR - 8, cx + innerR, parting) : bx + 14 + (300 * flight) / 0.85;
  // In neutron decay the positron goes in and the electron out; in electron capture the electron goes in.
  const inSign: 1 | -1 = process === 'capture' ? -1 : 1, outSign = (-inSign) as 1 | -1, orbital = { x: cx + innerR, y: cy };
  const annihilate = process === 'neutron' ? settled : 0, flashOut = process === 'capture' ? settled : 0;
  const absorbed = capture ? ease((u - 0.44) / 0.18) : 0;
  const outerPos = polar(cx, cy, lerp(outerR, innerR, drop), lerp(32, 0, drop));
  const [ph1x, ph1y] = polar(cx, cy, innerR + 18 + 38 * drop, 16);
  const [ph2x, ph2y] = polar(cx, cy, innerR + 48 + 38 * drop, 16);
  return <Diagram stage={
    <Stage w={W} h={H} label={`${spec.name}. ${process === 'capture' ? 'A virtual pair as wide as the atom forms between the nucleus and an orbital electron' : `A virtual particle pair forms just outside the ${spec.boundary}`}. ${spec.enters}. ${spec.freed}. What is left is ${spec.left}.`}>
      <circle cx={cx} cy={cy} r={R} className={process === 'hawking' ? 'bk-fill-panel bk-s-text' : 'bk-body bk-body-plain'} strokeWidth="2" strokeDasharray={process === 'hawking' ? '6 4' : undefined}/>
      {process === 'hawking' && <><circle cx={cx} cy={cy} r={R - 26} className="bk-f-faint" opacity={0.5}/><T x={cx} y={cy + 5} tone="text">black hole</T><T x={cx} y={cy - R - 12} size="sm">event horizon</T></>}
      {process === 'neutron' && <><Charge x={cx - 26} y={cy} sign={1} r={18}/><Charge x={cx + 30} y={cy + 6} sign={-1} r={11} opacity={1 - annihilate}/><T x={cx} y={cy - R - 12} size="sm">{done ? 'now a proton' : 'neutron: a proton with an electron'}</T></>}
      {process === 'capture' && <>
        <circle cx={cx} cy={cy} r={innerR} className="bk-s-faint" fill="none" strokeDasharray="2 6"/>
        <circle cx={cx} cy={cy} r={outerR} className="bk-s-faint" fill="none" strokeDasharray="2 6" opacity={0.65}/>
        {absorbed < 0.99 && <Charge x={cx} y={cy} sign={1} r={15} opacity={1 - absorbed}/>}
        {absorbed > 0.02 && <g opacity={absorbed}><circle cx={cx} cy={cy} r={16} className="bk-body bk-body-plain" strokeWidth="1.8"/><T x={cx} y={cy + 5} tone="text">n</T></g>}
        <T x={cx} y={cy - R - 12} size="sm">{absorbed > 0.6 ? 'now a neutron' : 'nucleus (proton)'}</T>
        <Charge x={orbital.x} y={orbital.y} sign={-1} r={10} opacity={1 - flashOut}/>
        <T x={orbital.x + 14} y={orbital.y + 18} anchor="start" size="sm" opacity={1 - flashOut}>inner orbital electron</T>
        <Charge x={outerPos[0]} y={outerPos[1]} sign={-1} r={10}/>
        <T x={outerPos[0] + 15} y={outerPos[1] - 4} anchor="start" size="sm">{drop > 0.7 ? 'fills vacated orbital' : 'outer orbital electron'}</T>
        {drop > 0.15 && drop < 0.95 && <><Arrow x1={ph1x} y1={ph1y} x2={ph2x} y2={ph2y} tone="mark" w={2} head={7} dash="4 3" opacity={Math.sin(Math.PI * drop)}/><T x={ph2x + 10} y={ph2y + 4} anchor="start" size="sm" tone="mark" opacity={Math.sin(Math.PI * drop)}>photon</T></>}
      </>}
      {u < 0.28 && <Zepton x={bx} y={cy} angle={inSign > 0 ? 180 : 0} len={capture ? 124 : 34} open={forming} oval={!capture} signs={capture} emphasis="key" opacity={Math.min(1, forming * 1.4)}/>}
      {u >= 0.28 && <>
        <Charge x={inward} y={cy} sign={inSign} r={capture ? 10 : 9} opacity={process === 'neutron' ? 1 - annihilate : capture ? 1 - absorbed : 1 - 0.7 * settled}/>
        <Charge x={outward} y={cy} sign={outSign} r={capture ? 10 : 9} opacity={capture ? 1 - flashOut : 1}/>
      </>}
      {annihilate > 0.2 && annihilate < 0.95 && <circle cx={cx + 34} cy={cy + 4} r={10 + 26 * annihilate} className="bk-s-mark" fill="none" strokeWidth="2" opacity={1 - annihilate}/>}
      {flashOut > 0.15 && flashOut < 0.95 && <circle cx={orbital.x} cy={orbital.y} r={10 + 28 * flashOut} className="bk-s-mark" fill="none" strokeWidth="2" opacity={1 - flashOut}/>}
      <T x={W - 24} y={H - 44} anchor="end" size="sm" tone="mark">{capture ? (u < 0.28 ? 'a virtual pair opens across the atom' : u < 0.62 ? 'electron absorbed by proton; positron annihilates orbital electron' : 'another orbital electron drops in to take its place') : u < 0.28 ? 'a virtual pair forms just outside' : u < 0.56 ? 'one half crosses the boundary' : spec.freed.toLowerCase()}</T>
      <T x={W - 24} y={H - 22} anchor="end" size="sm">{done ? `left: ${spec.left}` : ''}</T>
    </Stage>}>
    <Choice label="Process" value={process} onChange={setProcess} options={[{ value: 'hawking', label: 'Hawking' }, { value: 'neutron', label: 'Neutron decay' }, { value: 'capture', label: 'Capture' }]}/>
    <PlayBar play={play} label="the process"/>
    <Readout label="Boundary" value={spec.boundary}/>
    <Readout label="Left behind" value={spec.left} tone="good"/>
    <Remark>{process === 'hawking' ? 'The attraction of the black hole is too strong for the pair to recombine, so the particle outside becomes free.' : process === 'neutron' ? 'This is the manner in which a neutron decays in free space. In a nucleus the same step is beta decay.' : 'A zepton takes the electron from its orbit by annihilating it with a positron, and deposits a once virtual, now free, electron in the nucleus.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 26,
  summary: <>
    <p>The weak interaction is said to be carried by the W and Z particles. Fleming’s objection is the one he made to the photon as a force carrier, with more force: these particles are far too massive and short-lived to be exchanged across an atom, and the model does not say where the energy for an electron to leave a nucleus comes from (<Pg n={201}/>, <Pg n={202}/>).</p>
    <p>His alternative needs nothing new. Every particle is surrounded by and filled with zeptons. Now and then one half of a virtual pair ends up inside a particle and the other half outside, as in Hawking’s account of a black hole. One half annihilates what it meets; the other is left free. Neutron decay, electron capture, positron emission and beta decay all follow from that one step (<Pg n={203}/>, <Pg n={204}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '26-1', page: 202, section: 'Hawking Radiation', title: 'Half a pair on each side of a boundary',
      caption: 'An illustration of Hawking Radiation where a virtual particle pair is formed just outside the event horizon of a black hole and half of it falls inside.',
      Diagram: PairAtBoundary,
      text: <>
        <p><Q>Hawking Radiation occurs when a virtual particle pair, a vacuum fluctuation, occurs just outside the event horizon of a black hole and one half of the pair enters the black hole, while the other remains outside.</Q> <Q>The attractive force of the black hole is too strong for the particle pair to recombine, so the particle outside the event horizon becomes free</Q> (<Pg n={202}/>, <Pg n={203}/>).</p>
        <p>Fleming then puts a neutron in place of the black hole, taking it as <Q>a proton collocated with an electron</Q>. If the positron half of a zepton crosses into the neutron’s shell while the electron half remains outside, <Q>The virtual positron combines with the electron inside the neutron, annihilating with it, and leaving behind a proton, while the virtual electron is freed at some distance away from the proton. This is the manner in which a neutron decays in free space</Q> (<Pg n={203}/>).</p>
        <p>Electron capture is the reverse: a zepton <Q>could easily snatch an electron from its normal probability zone by annihilating it with a positron and depositing the once virtual but now free electron in the nucleus where it is absorbed by a proton</Q> (<Pg n={204}/>).</p>
      </>,
      tryThis: ['Run Hawking radiation, the printed figure: the pair forms at the horizon, one half goes in, the other leaves.', 'Switch to neutron decay and follow the positron: it meets the electron inside, both vanish, and a proton is left with a free electron outside.', 'Switch to capture: the orbital electron is annihilated where it was, and an electron appears at the nucleus without having travelled there.'],
      notes: <p>The printed figure shows only the black hole. The neutron and the atom are drawn from the text that follows it; sizes and timing are display choices. Positron emission and proton-antiproton pairs, which the chapter also describes, are not drawn.</p>,
      labs: [{ lab: 'medium', scenario: 'sparse', why: 'Single virtual pairs forming, opening and annihilating: the raw material of each of these processes.' }],
    },
  ],
};
export default chapter;
