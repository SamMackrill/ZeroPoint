# The Zero-Point Universe: interactive companion

A second page beside the laboratory, `book/index.html`, follows Ray Fleming's book [*The Zero-Point Universe*](papers/Book%20-%20the-zero-point-universe.pdf) chapter by chapter. Every one of the book's 86 figures has an interactive diagram that works the way Fleming's text says the figure works. Chapters with no figures (the Introduction, chapters 1, 2, 14, 15, 20, 24 and 27) have an explorer for their central argument or equation. A reader can keep the book open beside it and try each point as they reach it.

Open it at `/book/` on the dev server (`npm run dev`) or the preview, or at `book/` on the deployed site.

## What a chapter page holds

- **What the chapter argues**: a short summary with page references to the PDF. Every quotation is Fleming's, marked as a quotation.
- **One card per figure, in the book's order.** Each card gives the figure number and page, Fleming's caption, the diagram and its controls, the passage it illustrates (**In the text**), suggestions to **Try**, and **What is not Fleming's here**: anything the companion had to choose, such as a scale, a speed or a colour, and anything where the text and the figure disagree. The printed figure is shown beside the diagram (`docs/figures/book/fig-CC-NN.png`, cropped from the PDF) and links to its page.
- **In the laboratory**: links that open a laboratory scenario with the relevant settings (`../#/electron/spin?…`). A link names the scenario and says why it is relevant.
- **Future simulations**: proposals for deeper simulations this chapter could use, listed in full at `#/future`. Each proposal says what it would show, what it could be built from, and what Fleming leaves open, so that building it exposes the gap instead of filling it with an invention.

Routes are hashes, as in the laboratory: `#/` contents, `#/guide` how to read the diagrams, `#/ch/6` a chapter, `#/ch/6/6-10` a chapter scrolled to an item, `#/future` and `#/future/<id>`.

## Appendices

The book has no reference list and no index of its own. Its references are endnotes, printed at the end of each chapter and numbered 1 to 133 through the book. The companion adds two appendices.

- **References by chapter** (`#/references`, and `#/references/N` for chapter N): all 133 notes as printed, grouped by chapter. Each note lists the pages whose text cites it. DOIs open at doi.org and arXiv paths at their abstracts. Each chapter page also ends with its own notes, folded away until opened.

  The notes come from the PDF. `scripts/book-references.py` (needs PyMuPDF) separates them from the body text by font size: 15 pt body, 11.3 pt notes, 8.7 pt superscript citations. It writes `src/book/appendix/references.json`. The wording is Fleming's, slips included.

- **Index** (`#/index`, and `#/index/m` for the letter M): about 145 entries for people, ideas, experiments and effects. Each entry lists every PDF page whose text uses the term, grouped into runs, with links to the companion's chapters that cover those pages.

  The entries are chosen; the pages are searched for. `scripts/book-index.py` (needs PyMuPDF) holds the entries and their patterns. It matches them against the body text and captions from p. 7 on, leaving out the endnotes, and writes `src/book/appendix/index.json`. To add an entry, add it to the script and run it again.

`tests/book-appendix.test.tsx` checks the notes' numbering, chapters and citation pages, the index's order and page ranges, and spot-checks both against the book.

## Conventions

The diagrams follow the yardstick of the [fidelity review](fleming-fidelity-report.html): Fleming's own text and figures, not consensus physics.

- A zepton (Fleming's vacuum-fluctuation pair) is an oval with a negative and a positive end. Its positive end points toward a negative charge, and the field arrow points toward the positive ends (Fig. 6-7). The right-hand grip rule gives the magnetic field from the rotation.
- In chapters 11 to 17 a zepton also carries matter polarity. Its antimatter end faces matter. An electron-like zepton pairs negative charge with matter; a proton-like zepton pairs positive charge with matter.
- Where Fleming gives a number or an equation, the diagram computes it with the CODATA values he quotes. Where he gives none, the scale is a display choice and the card says so.
- Animations run only while a card is on screen. They respect the system's reduced-motion setting, and every one can be paused and stepped.

The legend of glyphs is on the **How to read** page (`#/guide`).

## Where the text and figures disagree

These are recorded on the cards, not silently resolved. The card's note is the full statement.

| Item | What disagrees |
|---|---|
| Fig. 3-1 | The text calls arrangement II repulsive; the figure draws it with opposite charges facing, which attract. The diagram follows the figure, which the chapter's conclusion needs. |
| Fig. 4-9 | The caption puts the field into the page; the printed symbol is a dot (out of the page). The diagram follows the caption, which agrees with the grip rule of chapter 6. |
| Fig. 7-3 | "The pressure between two like charges is lower" is said in chapter 6 of opposite charges, which is the case being described; read as a slip, and the diagram follows chapter 6. |
| Fig. 12-6 | The text and caption call the extra force tangential to the velocity; the figure and Equation 12-4 put it across the velocity. The diagram follows the figure and the equation. |
| Fig. 16-1 | The electron shell printed on p. 125 (2.123 to 2.472 pm) has a mean of 2.298 pm, not the Compton wavelength it is said to be solved at, and excludes 0.555 MeV. The shell that does solve his condition (2.247 to 2.606 pm) and his second shell, whose diameters differ by the pair wavelength (2.880 to 3.487 pm, reproduced exactly), both give 0.511 MeV. All three are offered. |
| Fig. 16-2 | The radial balance of charges on a rhombic triacontahedron computes to 96 per cent; the text says about 99. |
| Eq. 23-4 | Printed as t₀ = t′√(1 − GM/rc²). Fleming says the root may be left off; without it the GPS clocks gain 45.7 µs a day, the figure usually quoted, and with it half that. The readout uses his form without the root. |
| Fig. 18-2 | A path 2.45 mm across has an area of 4.9 mm²; the text gives about 20 mm². |
| Fig. 22-2 | The text gives the apparent frequency ratio as c₀/V; for frequency × wavelength to be c₀, as it also says, the ratio must be c₀/(c₀ − V). |
| Fig. 25-1 | Equations 25-3 and 25-6 give the shape of Chart 25-1 but not its values: a peak near 20× Coulomb at 0.8 fm, not 15.1 at 0.9 fm, and a crossing near 3.1 fm, not 2.6. Eq. 25-6 gives 18.7 N where the text has 20.6 N. |
| Fig. 25-2 | One sentence says the force diminishes when the openings in the shell are smaller than the shadow; the next says it is strongest under that condition. The diagram follows the second, which matches the rest of the argument. |

## Code

- `book/index.html` is the second Vite entry (`vite.config.ts`), loading `src/book/main.tsx`.
- `src/book/toc.ts` lists the chapters, their PDF pages and their figures. Each chapter page (`src/book/chapters/chNN.tsx`) loads on demand.
- `src/book/kit/` holds the SVG glyphs, the field-line tracer, the clock that pauses off-screen, dragging and the controls. Colours come from `src/ui/tokens.css`, as in the laboratory.
- `src/book/labs.ts` names the laboratories and scenarios as plain text, so a chapter page does not load the laboratories' models.
- `src/book/future.ts` holds the proposed simulations.

`tests/book.test.tsx` checks:

- each chapter carries exactly its figures, in order, and the printed figure images exist
- every laboratory link opens a scenario that exists, with no setting dropped
- every link between companion pages lands on an item
- every chapter renders

`tests/book-numbers.test.ts` checks that the formulas reproduce the book's numbers: Equation 3-1, the 938 MeV and 0.511 MeV shells, the 2.45 mm gravity path, 1.75″ bending, the GPS clock gain, the Shapiro delay, the 55.3 N strong-force example and the chapter 24 scorecard.

The companion is excluded from the laboratory's copy inventory (`scripts/copy-inventory.mjs`). Its prose is the book's and is checked by reading against the book.

To capture a chapter for review, with the dev server running:

```sh
node scripts/book-shots.mjs <outDir> ch/6 --cards
```
