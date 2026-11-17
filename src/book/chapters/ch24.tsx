// Chapter 24: Standard Tests of Gravitational Theory (PDF pp. 185–191). No figures: one explorer.
import { useState } from 'react';
import { Diagram, Readout, Remark } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';

/** One of the fifteen tests of the chapter: Fleming's ten, then the five classic ones, with his verdict on general relativity. */
interface Test { id: string; name: string; page: number; gr: boolean; says: string; see?: { label: string; href: string } }

/** The tests in the order the chapter sets them, each with the place in this companion where its subject can be tried. */
export const TESTS: Test[] = [
  { id: '1', name: 'Does the theory factor in zero-point vacuum fluctuations?', page: 185, gr: false, says: 'General relativity leaves the energy of the vacuum out; the long-range van der Waals and Matter Force theories are built on it.', see: { label: 'Chapter 2', href: '#/ch/2' } },
  { id: '2', name: 'Does the theory require a prior structure?', page: 185, gr: false, says: 'Space that must know in advance where the matter is has a structure imposed on it.', see: { label: 'Figure 19-1', href: '#/ch/19/19-1' } },
  { id: '3', name: 'Is the force the correct magnitude?', page: 186, gr: false, says: 'Newtonian gravity is the difference between two larger forces, so a theory of one attraction has the wrong strength.', see: { label: 'Figure 12-1', href: '#/ch/12/12-1' } },
  { id: '4', name: 'Does the theory introduce space-time singularities?', page: 186, gr: false, says: 'Flat space with a pressure of zeptons has none.' },
  { id: '5', name: 'Does the theory agree with conservation of energy-momentum?', page: 187, gr: false, says: 'The zero-point account treats every one of these effects as energy conserved.', see: { label: 'Chapter 23', href: '#/ch/23' } },
  { id: '6', name: 'Can the theory account for an attractive force superposed on a repulsive one?', page: 187, gr: false, says: 'The accelerating expansion needs a repulsion as well as an attraction.', see: { label: 'Figure 18-2', href: '#/ch/18/18-2' } },
  { id: '7', name: 'Does the theory account for spiral galaxy formation?', page: 187, gr: false, says: 'The mattermagnetic force between fast outer stars draws the arms.', see: { label: 'Figure 12-8', href: '#/ch/12/12-8' } },
  { id: '8', name: 'Does the theory account for tidal forces?', page: 188, gr: false, says: 'Synchronous rotation is a mattermagnetic effect, not a tide.', see: { label: 'Figure 12-4', href: '#/ch/12/12-4' } },
  { id: '9', name: 'Does the theory account for the anomalous acceleration in the Solar System?', page: 188, gr: false, says: 'The planets’ own mattermagnetic fields add an inward force on a probe.', see: { label: 'Figure 12-2', href: '#/ch/12/12-2' } },
  { id: '10', name: 'Can the force be unified with electromagnetic theory?', page: 188, gr: false, says: 'Gravity as a long-range van der Waals force is already part of the Electro-Matter Force.', see: { label: 'Figure 17-5', href: '#/ch/17/17-5' } },
  { id: 'A', name: 'The precession of the perihelion of Mercury', page: 189, gr: true, says: 'Both pass; Fleming prefers a classical magnetic-like force to a mixture of time dilation and length contraction.', see: { label: 'Figure 12-6', href: '#/ch/12/12-6' } },
  { id: 'B', name: 'Gravitational redshift', page: 189, gr: true, says: 'Energy conservation, and the lengthening of wavelengths as light accelerates out of a gravitational field.', see: { label: 'Chapter 23, clocks and redshift', href: '#/ch/23/x23-1' } },
  { id: 'C', name: 'The bending of light around the Sun', page: 190, gr: true, says: 'Half from the radial slowing of light near matter, half from the torque of the vacuum on light passing tangentially.', see: { label: 'Figure 23-2', href: '#/ch/23/23-2' } },
  { id: 'D', name: 'The Shapiro delay', page: 190, gr: true, says: 'The same two halves as the bending of light.', see: { label: 'Figure 23-1', href: '#/ch/23/23-1' } },
  { id: 'E', name: 'The Lense-Thirring and de Sitter effects', page: 190, gr: true, says: 'Both are due to the mattermagnetic force and have nothing to do with gravity; general relativity is given a pass.', see: { label: 'Figure 11-5', href: '#/ch/11/11-5' } },
];

/** Explorer: the chapter's scorecard, test by test. */
function Scorecard() {
  const [id, setId] = useState('1');
  const test = TESTS.find(t => t.id === id)!, grPassed = TESTS.filter(t => t.gr).length;
  return <Diagram stage={
    <div className="bk-score" role="group" aria-label="Fleming’s fifteen tests of gravitational theory and his verdicts">
      <ol className="bk-score-list">
        {TESTS.map(t => <li key={t.id}><button type="button" aria-pressed={t.id === id} onClick={() => setId(t.id)}>
          <span className="bk-score-id">{t.id}</span><span className="bk-score-name">{t.name}</span>
          <span className={t.gr ? 'bk-score-pass' : 'bk-score-fail'} title={`General Relativity: ${t.gr ? 'Passed' : 'Failed'}`}>GR {t.gr ? '✓' : '✗'}</span><span className="bk-score-pass" title="Long-range van der Waals Force and Matter Force: Passed">ZP ✓</span>
        </button></li>)}
      </ol>
    </div>}>
    <Readout label="Test" value={test.id}/>
    <Readout label="General Relativity" value={test.gr ? 'Passed' : 'Failed'} tone={test.gr ? 'good' : 'bad'}/>
    <Readout label="Long-range van der Waals & Matter Force" value="Passed" tone="good"/>
    <Remark>{test.says} <Pg n={test.page}/>{test.see && <> · Try it at <a href={test.see.href}>{test.see.label}</a>.</>}</Remark>
    <Readout label="Fleming’s tally for General Relativity" value={`${grPassed} of ${TESTS.length}`}/>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 24,
  summary: <>
    <p>Einstein set three tests for any rival to general relativity, and others have been added since. Before taking them, Fleming sets ten of his own, drawn from the earlier chapters: does a theory of gravity include the vacuum, does it need space to have a prior structure, can it be joined to electromagnetism, does it explain galaxies, tides and the expansion. <Q>Fair is fair</Q> (<Pg n={185}/>).</p>
    <p>By his scoring general relativity fails all ten and passes the five classic tests, and the long-range van der Waals and Matter Force theories pass all fifteen. The verdicts are his; this page lists them and points to where each subject can be tried in the companion.</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x24-1', page: 185, section: 'First, The Zero-Point Universe Tests', title: 'Fifteen tests, and Fleming’s verdicts',
      Diagram: Scorecard,
      text: <p>The first ten are <Q>a few tests of my own</Q>; the last five, lettered A to E, are the classic ones. Of the ten he says: <Q>Any one of those failures should be sufficient reason to dismiss General Relativity from serious consideration on its own</Q> (<Pg n={188}/>). The classic tests he grants to both theories, giving a different cause for each result.</p>,
      tryThis: ['Select each test to read his reason in a sentence, with the page.', 'Follow “Try it at” to the figure or explorer in this companion where the same subject can be worked by hand.'],
      notes: <p>The verdicts and the wording of the tests are Fleming’s. The one-line reasons are condensed from his text, and the links to figures are this companion’s.</p>,
    },
  ],
};
export default chapter;
