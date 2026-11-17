// How to read the companion: what each part of a figure's card is, the drawing conventions, and the sources.
import { Arrow, Body, Charge, InOut, Spin, Stage, T, Zepton } from '../kit';
import { BOOK_PDF, LAB_APP, PAPERS, paperHref, type PaperId } from '../labs';

/** The drawing conventions as a labelled key, drawn with the same glyphs the figures use. */
function Legend() {
  return <Stage w={720} h={250} label="Key to the diagrams: a zepton, free charges, a body of matter, the electric and magnetic fields, rotation and force">
    <Zepton x={70} y={52} angle={0} len={46} signs/><T x={130} y={48} anchor="start" tone="text">Zepton</T><T x={130} y={66} anchor="start" size="sm">a virtual pair: + and − ends</T>
    <Zepton x={70} y={112} angle={180} len={46} polarity="matter" signs/><T x={130} y={108} anchor="start" tone="text">Matter dipole</T><T x={130} y={126} anchor="start" size="sm">matter (m) and antimatter (a) ends</T>
    <Zepton x={70} y={172} angle={0} len={46} emphasis="key"/><T x={130} y={168} anchor="start" tone="text">The pair in question</T><T x={130} y={186} anchor="start" size="sm">Fleming draws it black</T>
    <Charge x={52} y={224} sign={-1} r={11}/><Charge x={88} y={224} sign={1} r={11}/><T x={130} y={229} anchor="start" tone="text">Free charges</T>
    <Body x={410} y={52} r={15}/><T x={450} y={48} anchor="start" tone="text">Body of matter</T><T x={450} y={66} anchor="start" size="sm">carries matter charge (ch. 11 on)</T>
    <Arrow x1={388} y1={112} x2={432} y2={112} tone="e" w={2.4}/><T x={450} y={108} anchor="start" tone="text">Electric field E</T><T x={450} y={126} anchor="start" size="sm">toward the + end of the zeptons</T>
    <InOut x={398} y={172} out/><InOut x={424} y={172} out={false}/><T x={450} y={168} anchor="start" tone="text">Magnetic field B</T><T x={450} y={186} anchor="start" size="sm">out of the page, and into it</T>
    <Spin x={398} y={224} r={11}/><Arrow x1={414} y1={224} x2={440} y2={224} tone="force" w={3}/><T x={450} y={229} anchor="start" tone="text">Rotation, and a push</T>
  </Stage>;
}

/** The reading guide. */
export function GuidePage() {
  return <article className="bk-guide" data-testid="guide">
    <header className="bk-chapter-head">
      <p className="bk-kicker">Reading guide</p>
      <h1>How to read these pages</h1>
      <p className="bk-lede">The companion has one page for each chapter of <a href={BOOK_PDF} target="_blank" rel="noreferrer"><cite>The Zero-Point Universe</cite></a>, in the book’s order. Keep the book open beside it. When you reach a figure, find the same number here and try it.</p>
    </header>
    <section className="bk-prose">
      <h2>What each figure gives you</h2>
      <dl className="bk-guide-parts">
        <dt>Fleming’s caption</dt><dd>The caption as he prints it, so you can be sure you are at the right figure.</dd>
        <dt>The diagram</dt><dd>Something to run or change. It is drawn to do what the text beside the figure says, no more.</dd>
        <dt>In the text</dt><dd>What Fleming says about the figure, paraphrased closely, with the page. Page numbers are PDF pages, because the book prints none; each one opens the book at that page.</dd>
        <dt>Try</dt><dd>Two or three things to do, each tied to a sentence of his.</dd>
        <dt>What is not Fleming’s here</dt><dd>Anything the diagram had to choose that he does not give: a size, a speed, a magnification, or a reading of an ambiguous figure. Where his text and his figure disagree, the note says so and does not pick silently.</dd>
        <dt>The figure as printed</dt><dd>His own drawing, to compare with the diagram.</dd>
        <dt>Explore further in the laboratory</dt><dd>A link that opens <a href={LAB_APP}>the laboratory</a> at the scenario that carries the idea further.</dd>
      </dl>
      <p>Chapters without figures have a short account of the argument, and an <em>explorer</em> where the text gives a relation that is worth turning by hand.</p>
      <h2>How things are drawn</h2>
    </section>
    <div className="bk-card bk-card-legend"><Legend/></div>
    <section className="bk-prose">
      <p>A <strong>zepton</strong> is Fleming’s name (chapter 6) for a virtual particle pair of the zero-point field. He draws one as an oval with a positive and a negative end, and so do these pages. Colours keep one meaning throughout: warm for positive, cool for negative, green for the electric field, violet for the magnetic field, and gold and pink for matter and antimatter from chapter 11 onward.</p>
      <p>The diagrams are schematic. Sizes, counts, speeds and the strength of an effect are chosen to be seen, unless a readout gives a number, in which case the number comes from the equation named beside it. Animations pause when they leave the screen, and start paused if your system asks for reduced motion. Curved arrows that mark the sense of a rotation fade while the rotation itself is playing, and come back when you pause.</p>
      <h2>Sources</h2>
      <p>The authority throughout is the book. Fleming’s papers give more depth on particular points and are cited where a diagram draws on them:</p>
      <ul>{(Object.keys(PAPERS) as PaperId[]).map(id => <li key={id}><a href={paperHref(id)} target="_blank" rel="noreferrer"><cite>{PAPERS[id].title}</cite></a></li>)}</ul>
      <p>These pages follow Fleming’s model on its own terms and do not argue it against other physics. They are a study aid for his book, not validated physics.</p>
    </section>
  </article>;
}
