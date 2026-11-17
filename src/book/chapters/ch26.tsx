// Chapter 26: The Weak Interaction (PDF pp. 201–206). Figure 26-1.
import { useState } from 'react';
import { Charge, Choice, Diagram, PlayBar, Readout, Remark, Stage, T, Zepton, clamp, ease, lerp, usePlayback } from '../kit';
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
  const spec = PROCESSES[process], H = 380, cx = 230, cy = 190, R = process === 'capture' ? 40 : 110, u = play.t % 1;
  // Four steps: the pair forms just outside the boundary, opens, one half crosses, and the other is left free.
  const forming = ease(u / 0.2), parting = ease((u - 0.25) / 0.3), settled = ease((u - 0.6) / 0.25), done = u > 0.86;
  const bx = cx + (process === 'capture' ? 150 : R + 14), inward = lerp(bx - 14, process === 'capture' ? cx + 10 : cx + 40, parting), outward = lerp(bx + 14, process === 'capture' ? cx + 230 : bx + 150 + 110 * settled, parting);
  // In neutron decay the positron goes in and the electron out; in electron capture the electron goes in.
  const inSign: 1 | -1 = process === 'capture' ? -1 : 1, outSign = (-inSign) as 1 | -1, orbital = { x: cx + 230, y: cy };
  const annihilate = process === 'neutron' ? settled : 0, flashOut = process === 'capture' ? settled : 0;
  return <Diagram stage={
    <Stage w={W} h={H} label={`${spec.name}. A virtual particle pair forms just outside the ${spec.boundary}. ${spec.enters}. ${spec.freed}. What is left is ${spec.left}.`}>
      <circle cx={cx} cy={cy} r={R} className={process === 'hawking' ? 'bk-fill-panel bk-s-text' : 'bk-body bk-body-plain'} strokeWidth="2" strokeDasharray={process === 'hawking' ? '6 4' : undefined}/>
      {process === 'hawking' && <><circle cx={cx} cy={cy} r={R - 26} className="bk-f-faint" opacity={0.5}/><T x={cx} y={cy + 5} tone="text">black hole</T><T x={cx} y={cy - R - 12} size="sm">event horizon</T></>}
      {process === 'neutron' && <><Charge x={cx - 26} y={cy} sign={1} r={18}/><Charge x={cx + 30} y={cy + 6} sign={-1} r={11} opacity={1 - annihilate}/><T x={cx} y={cy - R - 12} size="sm">{done ? 'now a proton' : 'neutron: a proton with an electron'}</T></>}
      {process === 'capture' && <><circle cx={cx} cy={cy} r={230} className="bk-s-faint" fill="none" strokeDasharray="2 6"/><Charge x={cx} y={cy} sign={1} r={16} opacity={1 - 0.6 * settled}/><T x={cx} y={cy - R - 12} size="sm">{done ? 'proton and electron: a neutron' : 'nucleus'}</T><Charge x={orbital.x} y={orbital.y} sign={-1} r={10} opacity={1 - flashOut} label="orbital electron"/></>}
      {u < 0.3 && <Zepton x={bx} y={cy - 0} angle={inSign > 0 ? 180 : 0} len={34} open={forming} signs={false} emphasis="key" opacity={forming}/>}
      {u >= 0.25 && <>
        <Charge x={inward} y={cy} sign={inSign} r={9} opacity={process === 'neutron' ? 1 - annihilate : process === 'capture' ? 1 : 1 - 0.7 * settled}/>
        <Charge x={outward} y={cy} sign={outSign} r={9} opacity={process === 'capture' ? 1 - flashOut : 1}/>
      </>}
      {annihilate > 0.2 && annihilate < 0.95 && <circle cx={cx + 34} cy={cy + 4} r={10 + 26 * annihilate} className="bk-s-mark" fill="none" strokeWidth="2" opacity={1 - annihilate}/>}
      {flashOut > 0.2 && flashOut < 0.95 && <circle cx={orbital.x} cy={orbital.y} r={10 + 26 * flashOut} className="bk-s-mark" fill="none" strokeWidth="2" opacity={1 - flashOut}/>}
      <T x={W - 24} y={H - 44} anchor="end" size="sm" tone="mark">{u < 0.25 ? 'a virtual pair forms just outside' : u < 0.6 ? 'one half crosses the boundary' : spec.freed.toLowerCase()}</T>
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
