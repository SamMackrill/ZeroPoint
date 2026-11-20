// Chapter 14: The Matter Force (PDF pp. 113–116). No figures: three explorers.
import { useMemo, useState, type ReactNode } from 'react';
import { Body, Choice, Diagram, PlayBar, Readout, Remark, Slider, Stage, T, rng, usePlayback } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';
import { TwoSources } from './shared';

const W = 720;

/** What is left when equal amounts of matter and antimatter have annihilated. */
export function afterAnnihilation(matter: number, antimatter: number) {
  const pairs = Math.min(matter, antimatter);
  return { matter: matter - pairs, antimatter: antimatter - pairs, pairs };
}

/** Explorer: matter and antimatter in the same space attract and annihilate until only the excess is left. */
function Annihilation() {
  const [matter, setMatter] = useState(14);
  const total = 24, antimatter = total - matter, play = usePlayback({ speed: 0.25, end: 1 });
  const H = 340, { pairs } = afterAnnihilation(matter, antimatter);
  const places = useMemo(() => { const random = rng(141); return Array.from({ length: total }, () => ({ x: 60 + random() * (W - 120), y: 40 + random() * (H - 100) })); }, []);
  // Pair nearest opposite-kind neighbours greedily so each pair meets locally instead of crossing the whole stage.
  const matched = useMemo(() => {
    const mPool = Array.from({ length: matter }, (_, i) => i), aPool = Array.from({ length: antimatter }, (_, i) => matter + i);
    const out: [number, number][] = [];
    while (mPool.length && aPool.length) {
      let bestM = 0, bestA = 0, bestD = Infinity;
      for (let mi = 0; mi < mPool.length; mi++) for (let ai = 0; ai < aPool.length; ai++) {
        const d = Math.hypot(places[mPool[mi]].x - places[aPool[ai]].x, places[mPool[mi]].y - places[aPool[ai]].y);
        if (d < bestD) { bestD = d; bestM = mi; bestA = ai; }
      }
      out.push([mPool.splice(bestM, 1)[0], aPool.splice(bestA, 1)[0]]);
    }
    return { order: out, leftM: mPool, leftA: aPool };
  }, [matter, antimatter, places]);
  const gone = Math.min(pairs, Math.floor(play.t * (pairs + 0.999))), stage = play.t * (pairs + 0.999) - gone;
  const active = gone < pairs ? matched.order[gone] : null;
  const flash = active && stage > 0.72 ? (stage - 0.72) / 0.28 : 0;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A region of space holding ${matter} pieces of matter and ${antimatter} of antimatter. They attract and annihilate in pairs; ${matter - gone} of matter and ${antimatter - gone} of antimatter remain.`}>
      {matched.order.slice(gone).map(([mi, ai], idx) => {
        const pm = places[mi], pa = places[ai], live = idx === 0, k = live ? Math.min(1, stage / 0.75) * 0.5 : 0;
        const op = live && stage > 0.75 ? Math.max(0, 1 - (stage - 0.75) / 0.25) : 1;
        return <g key={`${mi}-${ai}`}>
          <Body x={pm.x + (pa.x - pm.x) * k} y={pm.y + (pa.y - pm.y) * k} r={10} tone="matter" opacity={op}/>
          <Body x={pa.x + (pm.x - pa.x) * k} y={pa.y + (pm.y - pa.y) * k} r={10} tone="anti" opacity={op}/>
        </g>;
      })}
      {flash > 0 && active && <circle cx={(places[active[0]].x + places[active[1]].x) / 2} cy={(places[active[0]].y + places[active[1]].y) / 2} r={8 + 24 * flash} className="bk-s-mark" fill="none" strokeWidth="2" opacity={1 - flash}/>}
      {matched.leftM.map(i => <Body key={`lm${i}`} x={places[i].x} y={places[i].y} r={10} tone="matter"/>)}
      {matched.leftA.map(i => <Body key={`la${i}`} x={places[i].x} y={places[i].y} r={10} tone="anti"/>)}
      <Body x={70} y={H - 26} r={8} tone="matter"/><T x={86} y={H - 21} anchor="start" size="sm">matter</T><Body x={170} y={H - 26} r={8} tone="anti"/><T x={186} y={H - 21} anchor="start" size="sm">antimatter</T>
    </Stage>}>
    <Slider label="Matter, out of 24 pieces" value={matter} min={0} max={24} step={1} onChange={v => { setMatter(v); play.restart(); }} show={v => `${v} matter, ${24 - v} antimatter`}/>
    <PlayBar play={play} label="the annihilation"/>
    <Readout label="Matter left" value={matter - gone}/>
    <Readout label="Antimatter left" value={antimatter - gone}/>
    <Remark>{matter === antimatter ? 'Equal amounts: in the end nothing is left.' : `Only the excess survives: ${Math.abs(matter - antimatter)} of ${matter > antimatter ? 'matter' : 'antimatter'}. Why there was an excess of matter the model does not say.`}</Remark>
  </Diagram>;
}

type Law = 'coulomb' | 'gauss' | 'gaussB' | 'faraday' | 'lorentz' | 'ampere' | 'biot';

/** Each of the chapter's laws in its electric form and its matter form. */
const LAWS: Record<Law, { name: string; electric: ReactNode; matter: ReactNode; n: string; says: string }> = {
  coulomb: { name: 'Coulomb', n: '14-1', says: 'Matter is repelled by matter, as like charges are; and matter is attracted to antimatter.',
    electric: <><V>F</V> = <Frac top="1" bottom={<>4πε<sub>0</sub></>}/> <Frac top={<><V>q</V><sub>1</sub><V>q</V><sub>2</sub></>} bottom={<><V>r</V>²</>}/></>, matter: <><V>F</V><sub>m</sub> = <Frac top="1" bottom={<>4πε<sub>0m</sub></>}/> <Frac top={<><V>m</V><sub>1</sub><V>m</V><sub>2</sub></>} bottom={<><V>r</V>²</>}/></> },
  gauss: { name: 'Gauss', n: '14-2', says: 'The matter field M through any surface round a matter charge depends only on the charge inside.',
    electric: <>∮ <V>E</V>·d<V>A</V> = <Frac top={<V>Q</V>} bottom={<>ε<sub>0</sub></>}/></>, matter: <>∮ <V>M</V>·d<V>A</V> = <Frac top={<V>m</V>} bottom={<>ε<sub>0m</sub></>}/></> },
  gaussB: { name: 'Gauss (magnetism)', n: '14-3', says: 'There are no mattermagnetic monopoles: every rotating dipole makes a north and a south pole.',
    electric: <>∮ <V>B</V>·d<V>A</V> = 0</>, matter: <>∮ <V>B</V><sub>m</sub>·d<V>A</V> = 0</> },
  faraday: { name: 'Faraday', n: '14-4', says: 'A changing mattermagnetic field produces a matter field.',
    electric: <>∮ <V>E</V>·d<V>l</V> = − <Frac top={<>dΦ<sub>B</sub></>} bottom={<>d<V>t</V></>}/></>, matter: <>∮ <V>M</V>·d<V>l</V> = − <Frac top={<>dΦ<sub>m</sub></>} bottom={<>d<V>t</V></>}/></> },
  lorentz: { name: 'Lorentz', n: '14-5', says: 'The practical form for a single body: the force on a matter charge from the matter field and from its motion through a mattermagnetic field.',
    electric: <><V>F</V> = <V>q</V>(<V>E</V> + <V>υ</V> × <V>B</V>)</>, matter: <><V>F</V><sub>m</sub> = <V>m</V>(<V>M</V> + <V>υ</V> × <V>B</V><sub>m</sub>)</> },
  ampere: { name: 'Ampère–Maxwell', n: '14-6', says: 'The mattermagnetic field is proportional to the matter current, with a correction for a changing matter field.',
    electric: <>∮ <V>B</V>·d<V>l</V> = μ<sub>0</sub>(<V>I</V> + ε<sub>0</sub> <Frac top={<>dΨ<sub>E</sub></>} bottom={<>d<V>t</V></>}/>)</>, matter: <>∮ <V>B</V><sub>m</sub>·d<V>l</V> = μ<sub>0m</sub>(<V>I</V><sub>m</sub> + ε<sub>0m</sub> <Frac top={<>dΨ<sub>m</sub></>} bottom={<>d<V>t</V></>}/>)</> },
  biot: { name: 'Biot–Savart', n: '14-7', says: 'The form that keeps the velocity in view, which matter forces always need.',
    electric: <><V>B</V> = <Frac top={<>μ<sub>0</sub></>} bottom="4π"/> ∫ <Frac top={<><V>υ</V> × r̂</>} bottom={<><V>r</V>²</>}/> d<V>q</V></>, matter: <><V>B</V><sub>m</sub> = <Frac top={<>μ<sub>0m</sub></>} bottom="4π"/> ∫ <Frac top={<><V>υ</V> × r̂</>} bottom={<><V>r</V>²</>}/> d<V>m</V></> },
};

/** Explorer: each electromagnetic law beside the Matter Force law of the same form. */
function LawTranslator() {
  const [law, setLaw] = useState<Law>('coulomb');
  const entry = LAWS[law];
  return <Diagram stage={
    <div className="bk-eq-pair" role="group" aria-label={`${entry.name}: the electromagnetic law and the Matter Force law of the same form`}>
      <div><span className="bk-eq-pair-label">Electromagnetic</span><Eq>{entry.electric}</Eq></div>
      <div><span className="bk-eq-pair-label">Matter Force</span><Eq n={entry.n}>{entry.matter}</Eq></div>
      <p>{entry.says}</p>
      <p className="bk-eq-pair-key"><V>q</V> → <V>m</V> (matter charge) · <V>E</V> → <V>M</V> (matter field) · <V>B</V> → <V>B</V><sub>m</sub> · ε<sub>0</sub> → ε<sub>0m</sub> · μ<sub>0</sub> → μ<sub>0m</sub></p>
    </div>}>
    <Choice label="Law" value={law} onChange={setLaw} options={[{ value: 'coulomb', label: '14-1' }, { value: 'gauss', label: '14-2' }, { value: 'gaussB', label: '14-3' }, { value: 'faraday', label: '14-4' }]}/>
    <Choice label="More" value={law} onChange={setLaw} options={[{ value: 'lorentz', label: '14-5' }, { value: 'ampere', label: '14-6' }, { value: 'biot', label: '14-7' }]}/>
    <Readout label="Law" value={entry.name}/>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 14,
  summary: <>
    <p>This chapter collects the mathematics of the Matter Force. Every equation of electromagnetism has a counterpart with matter charge <V>m</V> in place of electric charge, the matter field <V>M</V> in place of <V>E</V>, and the mattermagnetic field <V>B</V><sub>m</sub> in place of <V>B</V>. <Q>The mattermagnetic force can be expressed by a set of equations completely analogous to Maxwell’s equations</Q> (<Pg n={116}/>).</p>
    <p>One consequence is stated in passing: in this model <Q>matter has to be attracted to antimatter</Q>, so the two annihilate wherever they share space, which would explain why local space holds only matter (<Pg n={113}/>).</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x14-1', page: 113, section: 'Matter Force Math', title: 'The same laws, with matter for charge',
      Diagram: LawTranslator,
      text: <>
        <p>Matter interacts with matter <Q>in a manner comparable to Coulomb’s Law, where matter is repelled by matte[r]</Q> (Equation 14-1). The next three equations are the matter forms of Gauss’s law, Gauss’s law for magnetism and Faraday’s law; the last is Ampère’s law with Maxwell’s correction (<Pg n={113}/>, <Pg n={114}/>).</p>
        <p>For practical work Fleming prefers the Lorentz form (Equation 14-5) and the Biot-Savart form (Equation 14-7), because <Q>In the Matter Force case, we must always take the velocity into account</Q> (<Pg n={115}/>).</p>
      </>,
      tryThis: ['Step through the seven laws. In each, only the symbols change.', 'Compare 14-5 with Equation 8-8 in chapter 8: it has gained the static term M, the field of chapter 10.'],
    },
    {
      kind: 'explorer', id: 'x14-2', page: 113, title: 'Matter attracts antimatter',
      Diagram: () => <TwoSources signs={[-1, 1]} mode="zeptons" names={['Body of matter', 'Body of antimatter']} matter/>,
      text: <p>Like matter charges repel (Figure 11-2). Unlike ones attract: the zeptons between a body of matter and a body of antimatter line up end to end, as they do between an electron and a proton in Figure 6-13, and the pressure between the two falls.</p>,
      tryThis: ['Drag the two bodies. The rows of zeptons run from one to the other, antimatter ends toward the matter.', 'Turn on the push: they are pushed together.'],
      notes: <p>Fleming states the attraction of matter to antimatter but does not draw it; this is the picture of Figure 6-13 with matter charge in place of electric charge.</p>,
    },
    {
      kind: 'explorer', id: 'x14-3', page: 113, title: 'Why only one kind is left',
      Diagram: Annihilation,
      text: <p><Q>If both matter and antimatter occupy the same space, they will annihilate each other until nothing, or an excess of one or the other is left. This is a nice and tidy way to explain away another of the great mysteries of science, the question of why is there only matter in local space. It still leaves us with the question of why is there an excess of matter</Q> (<Pg n={113}/>).</p>,
      tryThis: ['Start with unequal amounts and run it: pairs meet and vanish until only the excess remains.', 'Set the amounts equal: nothing is left.'],
      notes: <p>The number of pieces, where they start and the order in which pairs meet are display choices.</p>,
    },
  ],
};
export default chapter;
