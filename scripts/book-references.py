"""Extract the endnotes of The Zero-Point Universe and where the text cites each one.

Each chapter ends with its numbered notes, set smaller (11.3 pt) than the body (15 pt); the citations in the text are
superscript numbers (8.7 pt). The numbering runs through the book, 1 to 133. This writes the notes, by chapter, with
the PDF pages that cite them, as src/book/appendix/references.json for the companion's References page.

Usage (needs PyMuPDF): python -P scripts/book-references.py
"""
import json, re, sys
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / 'docs' / 'papers' / 'Book - the-zero-point-universe.pdf'
OUT = ROOT / 'src' / 'book' / 'appendix' / 'references.json'
NOTE, SUPER = (10.5, 12), (7.5, 9.5)  # font size bands for notes and superscripts

# The chapters' PDF page ranges, as in src/book/toc.ts.
CHAPTERS = [(0, 7, 10), (1, 11, 17), (2, 18, 26), (3, 27, 32), (4, 33, 42), (5, 43, 47), (6, 48, 61), (7, 62, 69), (8, 70, 80),
            (9, 81, 85), (10, 86, 90), (11, 91, 97), (12, 98, 109), (13, 110, 112), (14, 113, 116), (15, 117, 121), (16, 122, 128),
            (17, 129, 136), (18, 137, 141), (19, 142, 150), (20, 151, 152), (21, 153, 161), (22, 162, 175), (23, 176, 184),
            (24, 185, 191), (25, 192, 200), (26, 201, 206), (27, 207, 209)]


def chapter_of(page):
    """The chapter a PDF page belongs to."""
    return next(n for n, a, b in CHAPTERS if a <= page <= b)


def inside(size, band):
    """Whether a font size lies in a band."""
    return band[0] <= size <= band[1]


def lines(doc):
    """Every text line of the book with its page and spans, in reading order."""
    for index in range(doc.page_count):
        for block in doc[index].get_text('dict')['blocks']:
            for line in block.get('lines', []):
                spans = [s for s in line['spans'] if s['text'].strip()]
                if spans: yield index + 1, spans


def joined(spans):
    """A line's text from its spans. The PDF sets every span apart by the same few points, so whether a space belongs at
    a join is read from the characters there: none before a superscript or closing punctuation, none inside a number
    split after an opening bracket, one otherwise."""
    out = ''
    for span in spans:
        text = span['text']
        if out and not out.endswith(' ') and not text.startswith(' '):
            superscript = inside(span['size'], SUPER) and out.strip() != ''
            closing = re.match(r'[.,;:)\]’”]', text)
            split_number = re.search(r'\(\d+$', out) and text[:1].isdigit()
            if not (superscript or closing or split_number): out += ' '
        out += text
    return out


def clean(text):
    """Join a note's lines: collapse whitespace and rejoin words hyphenated across a line break."""
    text = re.sub(r'(\w)- (\w)', r'\1-\2', re.sub(r'\s+', ' ', text)).strip()
    return text


def main():
    doc = pymupdf.open(PDF)
    notes, current, expected = {}, None, 1
    cites = {}
    for page, spans in lines(doc):
        first = spans[0]['text'].strip()
        note_line = all(inside(s['size'], NOTE) or inside(s['size'], SUPER) for s in spans)
        start = re.match(r'^(\d{1,3})\s*(.*)$', joined(spans).strip()) if note_line else None
        # A note opens with its number and text; a number alone on a line is a citation that wrapped.
        if start and int(start.group(1)) == expected and first[:1].isdigit() and start.group(2).strip():
            current = expected
            notes[current] = {'n': current, 'page': page, 'text': start.group(2)}
            expected += 1
            continue
        if current and note_line and not first.startswith('Figure'):
            notes[current]['text'] += ' ' + joined(spans)
            continue
        current = None
        # Citations: superscript numbers in body lines, or on a line of their own where one wrapped.
        if any(inside(s['size'], (14, 16)) for s in spans) or all(inside(s['size'], SUPER) for s in spans):
            for i, s in enumerate(spans):
                if inside(s['size'], SUPER) and re.fullmatch(r'\d{1,3}(\s*,\s*\d{1,3})*', s['text'].strip()):
                    before = joined(spans[:i])
                    # A superscript straight after a digit is an exponent (10 to the 14th), not a note callout.
                    if re.search(r'\d$', before): continue
                    for n in map(int, re.findall(r'\d+', s['text'])):
                        cites.setdefault(n, []).append({'page': page, 'before': clean(before)[-120:]})
    if len(notes) != 133:
        sys.exit(f'Found {len(notes)} notes; expected 133. Last: {max(notes)}')
    out = []
    for n in sorted(notes):
        note = notes[n]
        chapter = chapter_of(note['page'])
        _, a, b = CHAPTERS[chapter]
        # A citation is a superscript of this number in the note's own chapter; exponents elsewhere are not.
        cited = [c for c in cites.get(n, []) if a <= c['page'] <= b and c['page'] != note['page'] or (c['page'] == note['page'] and c['before'])]
        cited = [c for c in cited if chapter_of(c['page']) == chapter]
        out.append({'n': n, 'chapter': chapter, 'notePage': note['page'], 'text': clean(note['text']), 'cited': cited})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('[\n' + ',\n'.join(json.dumps(e, ensure_ascii=False) for e in out) + '\n]\n', encoding='utf-8', newline='\n')  # one note a line
    print(f'Wrote {len(out)} notes to {OUT.relative_to(ROOT)}; {sum(1 for o in out if not o["cited"])} with no citation found.')


if __name__ == '__main__':
    main()
