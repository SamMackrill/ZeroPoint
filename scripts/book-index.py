"""Build an alphabetical index of The Zero-Point Universe: people, ideas, experiments and effects, with the PDF pages on
which the text discusses each. The book has none; this one is made by searching its text.

The entries are chosen here (ENTRIES); the pages are found, not chosen. Each entry's patterns are matched against the
body text and figure captions of every page from the Introduction on (p. 7), leaving out the endnotes, which the
References page lists. Writes src/book/appendix/index.json.

Usage (needs PyMuPDF): python -P scripts/book-index.py
"""
import json, re
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / 'docs' / 'papers' / 'Book - the-zero-point-universe.pdf'
OUT = ROOT / 'src' / 'book' / 'appendix' / 'index.json'
FIRST_PAGE = 7  # pages 1–6 are the contents

# (heading, patterns, case-sensitive). Names match case-sensitively, so "Lamb" is the physicist and not the animal;
# ideas match whatever the case. A pattern is a regular expression matched at word boundaries.
PEOPLE = [
    ('Anderson, Carl D.', [r'C\. ?D\. Anderson', r'Carl Anderson']), ('Anderson, John D.', [r'J\. ?D\. Anderson', r'John Anderson']),
    ('Bohr, Niels', [r'Bohr']), ('Bose, Satyendra Nath', [r'Bose(?!-)']), ('Boyer, Timothy', [r'Boyer']),
    ('Casimir, Hendrik', [r'Casimir(?! [Ee]ffect| [Ff]orce)']), ('Coulomb, Charles-Augustin de', [r'Coulomb(?:’s|\'s)? [Ll]aw', r'Coulomb(?! [Ff]orce)']),
    ('Debye, Peter', [r'Debye']), ('De Pretto, Olinto', [r'De Pretto']), ('Descartes, René', [r'Descartes']),
    ('Dirac, Paul', [r'Dirac']), ('Dolbear, Amos', [r'Dolbear']), ('Eddington, Arthur', [r'Eddington']),
    ('Einstein, Albert', [r'Einstein']), ('Faraday, Michael', [r'Faraday']), ('Fatio de Duillier, Nicolas', [r'Fatio']),
    ('Fermi, Enrico', [r'Fermi']), ('Feynman, Richard', [r'Feynman']), ('FitzGerald, George', [r'Fitz[Gg]erald']),
    ('Forward, Robert', [r'Robert Forward', r'R\. ?L\. Forward', r'Forward’s']), ('Galileo Galilei', [r'Galileo(?! spacecraft)']),
    ('Hawking, Stephen', [r'Hawking(?! [Rr]adiation)']), ('Heaviside, Oliver', [r'Heaviside']), ('Heisenberg, Werner', [r'Heisenberg(?:’s)?(?! [Uu]ncertainty)']),
    ('Jeans, James', [r'Jeans']), ('Kelvin, Lord (William Thomson)', [r'Kelvin', r'William Thomson']), ('Kepler, Johannes', [r'Kepler']),
    ('Laithwaite, Eric', [r'Laithwaite']), ('Lamb, Willis', [r'Lamb(?! [Ss]hift)']), ('Lamoreaux, Steven', [r'Lamoreaux']),
    ('Laplace, Pierre-Simon', [r'Laplace']), ('Larmor, Joseph', [r'Larmor']), ('Le Sage, Georges-Louis', [r'Le ?Sage']),
    ('Lodge, Oliver', [r'Lodge']),
    ('Lorentz, Hendrik', [r'Lorentz(?! [Ff]orce| [Tt]ransformation)']), ('Mach, Ernst', [r'Mach(?:’s)?\b']),
    ('Maxwell, James Clerk', [r'Maxwell(?:’s)?(?! [Ee]quations)']), ('Michelson, Albert', [r'Michelson(?![- ]Morley)']),
    ('Mohideen, Umar', [r'Mohideen']), ('Morgan, Harry', [r'Morgan']), ('Morley, Edward', [r'Morley']), ('Nernst, Walther', [r'Nernst']),
    ('Newton, Isaac', [r'Newton(?:’s|\'s)?(?!ian)']), ('Peratt, Anthony', [r'Peratt']), ('Planck, Max', [r'Planck(?:’s)?(?! [Cc]onstant| [Ll]ength)']),
    ('Poincaré, Henri', [r'Poincar[eé]']), ('Polder, Dirk', [r'Polder']), ('Puthoff, Harold', [r'Puthoff']), ('Riess, Adam', [r'Riess']),
    ('Sagnac, Georges', [r'Sagnac(?! [Ee]ffect)']), ('Sakharov, Andrei', [r'Sakharov']), ('Selleri, Franco', [r'Selleri']),
    ('Shapiro, Irwin', [r'Shapiro(?! [Dd]elay)']), ('Tajmar, Martin', [r'Tajmar']), ('Thorne, Kip', [r'Thorne']),
    ('Van Flandern, Tom', [r'Van Flandern']), ('van der Waals, Johannes', [r'van der Waals(?! [Ff]orce)']), ('Voigt, Woldemar', [r'Voigt']),
    ('Wallace, Henry', [r'Wallace']), ('Wheeler, John', [r'Wheeler']), ('Yukawa, Hideki', [r'Yukawa']),
]
IDEAS = [
    ('Accelerating expansion of the universe', [r'accelerat\w* expansion', r'accelerating universe']),
    ('Æther', [r'æther', r'aether', r'\bether']), ('Antimatter', [r'antimatter']), ('Antiproton', [r'anti-?protons?']),
    ('Beta decay', [r'beta decay']), ('Bending of light', [r'bending of (?:star)?light', r'light bending', r'deflection of light']),
    ('Black holes', [r'black holes?']), ('Bose-Einstein statistics', [r'Bose-Einstein']),
    ('Casimir effect', [r'Casimir [Ee]ffect']), ('Casimir force', [r'Casimir [Ff]orces?']),
    ('Class-one and class-two problems', [r'class-(?:one|two)']), ('Compton wavelength', [r'Compton wavelength']),
    ('Conservation of energy and momentum', [r'conservation of energy', r'energy-momentum', r'conservation of momentum']),
    ('Coulomb force', [r'Coulomb force']), ('Dipoles', [r'dipoles?']), ('Doppler effect', [r'Doppler']),
    ('Dwarf elliptical galaxies', [r'dwarf elliptical']), ('Dynamos, solar and planetary', [r'dynamos?']),
    ('Electric field', [r'electric fields?']), ('Electro-Matter Force', [r'Electro-Matter Force']),
    ('Electromagnetism', [r'electromagneti\w+']), ('Electron-positron pairs', [r'electron-positron']), ('Electrons', [r'electrons?']),
    ('Energy-time', [r'energy-time']), ('Fields, speed of propagation', [r'speed of (?:the )?(?:gravit\w+|field)', r'propagation speed', r'faster than (?:the speed of )?light']),
    ('Faraday’s lines of force', [r'Faraday(?:’s)? (?:field )?lines', r'lines of force', r'field lines']),
    ('Flywheels', [r'flywheels?']), ('Frames of reference', [r'frames? of reference', r'rest frame', r'reference frames?']),
    ('General relativity', [r'General Relativity', r'general theory of relativity']), ('Gravitational redshift', [r'gravitational redshift', r'red ?shift']),
    ('Gravitomagnetism', [r'gravitomagneti\w+']), ('Gravity', [r'gravit(?:y|ation|ational)']), ('Gyroscopes', [r'gyroscopes?']),
    ('Hawking radiation', [r'Hawking [Rr]adiation']), ('Heisenberg uncertainty principle', [r'uncertainty principle']),
    ('Hydrogen', [r'hydrogen']), ('Inertia', [r'inertia\w*']), ('Infinity problem', [r'infinity problem', r'infinit\w+ (?:energy|amount)']),
    ('Interferometers', [r'interferometers?']), ('Lamb shift', [r'Lamb [Ss]hift']), ('Length contraction', [r'length contraction', r'space contraction', r'contraction of (?:length|space)']),
    ('Lense-Thirring effect', [r'Lense-Thirring']), ('Light, speed of', [r'speed of light']), ('Lorentz force', [r'Lorentz [Ff]orce']),
    ('London-van der Waals forces and torque', [r'London-? ?van der Waals']),
    ('Long-range van der Waals force (gravity)', [r'long-? ?range van der Waals']),
    ('Lorentz transformations', [r'Lorentz [Tt]ransformations?']), ('Magnetic field', [r'magnetic fields?']),
    ('Mass', [r'\bmass(?:es)?\b']), ('Mass-energy', [r'mass-energy', r'E ?= ?mc']), ('Matter charge', [r'matter charges?']),
    ('Matter dipole', [r'matter dipoles?']), ('Matter Force', [r'Matter Force(?! Theory)', r'matter force']),
    ('Mattermagnetic field', [r'mattermagneti\w+']), ('Maxwell’s equations', [r'Maxwell(?:’s)? [Ee]quations']),
    ('Mercury, perihelion of', [r'perihelion', r'Mercury']), ('Michelson-Morley experiment', [r'Michelson[- ]Morley']),
    ('Molecular vortices', [r'molecular vortices', r'vortices', r'vortex']), ('Neutrinos', [r'neutrinos?']), ('Neutrons', [r'neutrons?']),
    ('Pair production', [r'pair production']), ('Permeability', [r'permeabilit\w+']), ('Permittivity', [r'permittivit\w+']),
    ('Photons', [r'photons?']), ('Pioneer anomaly', [r'Pioneer']), ('Planck’s constant', [r'Planck(?:’s)? [Cc]onstant']),
    ('Planck length', [r'Planck [Ll]ength']), ('Polarization', [r'polariz\w+']), ('Positrons', [r'positrons?']),
    ('Precession', [r'precess\w*']), ('Protons', [r'protons?']), ('Push theory of gravity', [r'push theory', r'push gravity', r'pushing gravity']),
    ('Quantum electrodynamics', [r'quantum electrodynamics', r'\bQED\b']), ('Quarks', [r'quarks?']),
    ('Renormalization', [r'renormaliz\w+']), ('Sagnac effect', [r'Sagnac [Ee]ffect']), ('Shapiro delay', [r'Shapiro [Dd]elay']),
    ('Special relativity', [r'Special Relativity', r'special theory of relativity']), ('Spin', [r'\bspin(?:s|ning)?\b']),
    ('Spiral galaxies', [r'spiral (?:arms|galax\w+)']), ('Strong nuclear force', [r'strong (?:nuclear )?force']),
    ('Synchronous rotation', [r'synchronous rotation', r'tidal(?:ly)? lock\w*']), ('Tidal forces', [r'tidal forces?', r'\btides?\b']),
    ('Time dilation', [r'time dilation', r'clocks? (?:run|slow)\w*']), ('Tops', [r'\btops?\b(?! of)']),
    ('Triacontahedron', [r'triacontahedron']), ('Vacuum energy', [r'vacuum energy']), ('Vacuum fluctuations', [r'vacuum fluctuations?']),
    ('Van der Waals force', [r'van der Waals [Ff]orces?']), ('Virtual particles', [r'virtual particles?']),
    ('Virtual photons', [r'virtual photons?']), ('W and Z bosons', [r'\bW and Z\b', r'bosons?']), ('Weak interaction', [r'weak (?:interaction|force)']),
    ('Zeptons', [r'zeptons?']), ('Zero-point energy', [r'zero-point energy']), ('Zero-point field', [r'zero-point field']),
]
ENTRIES = [(h, p, True) for h, p in PEOPLE] + [(h, p, False) for h, p in IDEAS]


def page_texts(doc):
    """Each page's body and caption text from p. 7 on, without the endnotes: two readings of it, one with words split
    at a line end rejoined and one with their hyphen kept."""
    texts = {}
    for index in range(FIRST_PAGE - 1, doc.page_count):
        kept, notes = [], False
        for block in doc[index].get_text('dict')['blocks']:
            for line in block.get('lines', []):
                spans = [s for s in line['spans'] if s['text'].strip()]
                if not spans: continue
                text = ''.join(s['text'] for s in spans)
                # The endnotes: small type opening with a note number and its text. They end the page.
                if all(s['size'] < 12 for s in spans) and spans[0]['text'].strip().isdigit() and len(spans) > 1: notes = True
                if notes: break
                kept.append(text)
            if notes: break
        # A word split at a line end may be one word hyphenated (zep-tons) or a compound (zero-point). Keep both
        # readings, so a pattern matches whichever the split was.
        text = '\n'.join(kept)
        rejoined, compound = re.sub(r'(\w)-\n(\w)', r'\1\2', text), re.sub(r'(\w)-\n(\w)', r'\1-\2', text)
        texts[index + 1] = re.sub(r'\s+', ' ', rejoined) + ' \n ' + re.sub(r'\s+', ' ', compound)
    return texts


def main():
    doc = pymupdf.open(PDF)
    texts = page_texts(doc)
    out = []
    for heading, patterns, case in ENTRIES:
        flags = 0 if case else re.IGNORECASE
        regex = re.compile('|'.join(rf'(?<![\w-])(?:{p})(?![\w])' if not p.endswith(r'\b') else rf'(?<![\w-])(?:{p})' for p in patterns), flags)
        pages = [page for page, text in texts.items() if regex.search(text)]
        if pages: out.append({'term': heading, 'pages': pages})
    out.sort(key=lambda e: re.sub(r'[^a-z0-9 ]', '', e['term'].lower().replace('æ', 'ae')))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('[\n' + ',\n'.join(json.dumps(e, ensure_ascii=False) for e in out) + '\n]\n', encoding='utf-8', newline='\n')  # one entry a line
    print(f'Wrote {len(out)} entries to {OUT.relative_to(ROOT)}.')
    for entry in out: print(f"{len(entry['pages']):4d}  {entry['term']}")


if __name__ == '__main__':
    main()
