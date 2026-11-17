// Chapter 21: Æther and Michelson-Morley (PDF pp. 153–161). Figure 21-1.
import { useState } from 'react';
import { Arrow, Choice, Diagram, Line, PlayBar, Readout, Remark, Slider, Stage, T, deg, fmt, usePlayback } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;

/** The angle a swimmer must head into a current of speed v (as a fraction of their own speed) to cross straight, in degrees. */
export const headingAngle = (v: number) => deg(Math.asin(Math.min(0.999, v)));

/** How much longer the crossing was expected to take in a stream: the ratio of the slanted distance a to the straight distance b. */
export const expectedSlowing = (v: number) => 1 / Math.sqrt(1 - Math.min(0.999, v) ** 2);

/** Figure 21-1: what an æther stream was expected to do to light crossing it, and what was found. */
function AetherStream() {
  const [v, setV] = useState(0.5);
  const [model, setModel] = useState<'kinetic' | 'zero-point'>('kinetic');
  const play = usePlayback({ speed: 0.4 });
  const H = 400, x0 = 150, yTop = 60, yBottom = 320, b = yBottom - yTop, alpha = headingAngle(v), slow = model === 'kinetic' ? expectedSlowing(v) : 1;
  // Two signals leave together: one across the stream and back, one the same distance along it and back.
  // One cycle lets the slower signal get back, then pauses briefly before both set out again.
  const cycle = 2 * Math.max(slow, 1) + 0.6, u = (play.t % cycle) / 2, across = Math.min(1, u / slow), along = Math.min(1, u), tri = (k: number) => (k < 0.5 ? k * 2 : 2 - k * 2);
  const ax = x0 + Math.tan((alpha * Math.PI) / 180) * b;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Light crossing between two walls with an æther stream of ${fmt(v, 2)} of the speed of light flowing across. ${model === 'kinetic' ? `If the æther carried light as a stream carries a swimmer, the crossing would take ${fmt(expectedSlowing(v), 3)} times as long.` : 'With the æther as the zero-point field the crossing takes the same time in every direction, which is what was found.'}`}>
      <line x1={60} y1={yTop} x2={420} y2={yTop} className="bk-s-text" strokeWidth="4"/><line x1={60} y1={yBottom} x2={420} y2={yBottom} className="bk-s-text" strokeWidth="4"/>
      {v > 0.01 && [110, 180, 250].map(y => <Arrow key={y} x1={70} y1={y + 12} x2={70 + 30 + 60 * v} y2={y + 12} tone="faint" w={1.6} opacity={model === 'kinetic' ? 1 : 0.35}/>)}
      <T x={78} y={yTop + 28} anchor="start" size="sm">æther stream, <tspan fontStyle="italic">υ</tspan></T>
      <Line d={`M${x0} ${yBottom} L${x0} ${yTop}`} tone="accent" w={2}/><T x={x0 - 12} y={(yTop + yBottom) / 2} tone="accent" anchor="end" italic>b</T>
      {model === 'kinetic' && v > 0.01 && <>
        <Line d={`M${x0} ${yBottom} L${ax} ${yTop}`} tone="mark" w={2} dash="6 4"/><T x={(x0 + ax) / 2 + 14} y={(yTop + yBottom) / 2} tone="mark" anchor="start" italic>a</T>
        <T x={x0 + 14} y={yBottom - 26} tone="mark" anchor="start" size="sm">α = {fmt(alpha, 3)}°</T>
      </>}
      <circle cx={x0} cy={yBottom - tri(across) * b} r={7} className="bk-f-mark"/>
      <line x1={480} y1={yBottom} x2={480 + b * 0.8} y2={yBottom} className="bk-s-accent" strokeWidth="2"/><circle cx={480 + tri(along) * b * 0.8} cy={yBottom} r={7} className="bk-f-e"/>
      <T x={480 + b * 0.4} y={yBottom + 26} size="sm">the same distance along the stream and back</T>
      <T x={560} y={110} size="sm" tone="mark">across: {across >= 1 ? 'back' : 'on its way'}</T><T x={560} y={134} size="sm" tone="e">along: {along >= 1 ? 'back' : 'on its way'}</T>
    </Stage>}>
    <Choice label="The æther is taken to be" value={model} onChange={setModel} options={[{ value: 'kinetic', label: 'A stream' }, { value: 'zero-point', label: 'The zero-point field' }]}/>
    <Slider label="Speed of the æther past the apparatus" value={v} min={0} max={0.9} step={0.01} onChange={setV} show={x => `${fmt(x, 2)} c`}/>
    <PlayBar play={play} label="the two signals"/>
    <Readout label="Slanted path a, against b" value={model === 'kinetic' ? `${fmt(expectedSlowing(v), 4)} ×` : 'not relevant'}/>
    <Readout label="Crossing takes" value={`${fmt(slow, 4)} × as long`} tone={slow > 1.0005 ? 'bad' : 'good'}/>
    <Readout label="Difference between the two signals" value={slow > 1.0005 ? `${fmt((slow - 1) * 100, 3)} %` : 'none'} tone={slow > 1.0005 ? 'bad' : 'good'}/>
    <Remark>{model === 'kinetic' ? 'What was expected: the light across the stream comes back late. At 45° the path a is about 1.4 times b.' : 'What was found: no difference. To what extent the æther pushes, it pushes equally in all directions and from all sides.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 21,
  summary: <>
    <p>Students are taught that the Michelson-Morley experiment disproved the æther. Fleming’s reading is that it disproved one theory of how the æther carries light: the theory that light is swept along by it as a swimmer is by a stream. The experiment found the speed of light the same in both directions. That <Q>does not say anything about the existence of æther, only that their theory of light propagation being somehow affected by a velocity relative to the æther rest frame was incorrect</Q> (<Pg n={155}/>).</p>
    <p>Zeptons do not act on a photon kinetically, any more than Fatio’s corpuscles act on a planet. Of the three ways to read the null result, he takes the second: <Q>there is an æther, it is zero-point energy which is consistent with Einstein-Hopf, and the result is as expected</Q>. No length contraction is needed to explain it (<Pg n={159}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '21-1', page: 154, section: 'Maxwell’s Conjecture', title: 'Swimming across the æther',
      caption: 'A beam of light crosses between two walls along path b, but because of the æther direction and velocity υ shown by arrow, the effective distance is thought to be a. And angle α is shown between the two paths.',
      Diagram: AetherStream,
      text: <>
        <p><Q>You can get the idea by imagining yourself swimming across a stream. You have to swim at an angle into the current to make it across in a straight line.</Q> <Q>You would try to swim along line a, but your actual path is b.</Q> <Q>If the angle α were 45 degrees, the length of a would be about ~1.4 times b</Q>, so the current makes you appear to swim slower. Along the stream and back, the two time differences are taken to cancel (<Pg n={154}/>, <Pg n={155}/>).</p>
        <p>The experiment found no difference. Fleming’s explanation: <Q>There is no mechanism for æther to push a photon to one side as envisioned through kinetic gas theory.</Q> <Q>As long as the light source and sensor are in the same frame of reference</Q>, <Q>the time it takes for the photon to travel a two-way trip between the two will be determined by the speed of light as measured in that frame of reference</Q> (<Pg n={158}/>, <Pg n={159}/>).</p>
      </>,
      tryThis: ['With the æther as a stream, run the two signals: the one sent across comes back after the one sent along.', 'Set the speed so that α is 45° (about 0.71 c) and check that a is 1.4 times b.', 'Switch the æther to the zero-point field: both signals return together at any speed. This is the result of the experiment.'],
      notes: <>
        <p>The text takes the two legs along the stream to cancel exactly. In the kinetic theory they leave a small difference of their own, which the usual analysis of the experiment includes. The diagram follows the text.</p>
        <p>The speeds on the slider are far beyond the Earth’s 30 km/s (0.0001 c), for which the expected difference was about five parts in a billion.</p>
      </>,
    },
  ],
};
export default chapter;
