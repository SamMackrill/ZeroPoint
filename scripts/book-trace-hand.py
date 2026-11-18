"""Trace Fleming's Figure 7-4 (the hand of the right hand rule) from the book's PDF into a smooth SVG outline.

The figure is a line drawing embedded at 163 x 148 pixels, too small to show scaled up. This upsamples it, blurs and
thresholds it, finds its outlines, smooths them (Chaikin) and simplifies them, and writes src/book/art/fleming-hand.ts.
Needs PyMuPDF, OpenCV and NumPy. Usage: python scripts/book-trace-hand.py
"""
import re
import cv2
import numpy as np
import pymupdf

PDF, PAGE, OUT = 'docs/papers/Book - the-zero-point-universe.pdf', 65, 'src/book/art/fleming-hand.ts'


def chaikin(points, rounds=3):
    """Round off a closed polyline's corners by Chaikin's corner cutting."""
    for _ in range(rounds):
        nxt = np.roll(points, -1, axis=0)
        points = np.concatenate([0.75 * points + 0.25 * nxt, 0.25 * points + 0.75 * nxt], axis=1).reshape(-1, 2)
    return points


def main():
    doc = pymupdf.open(PDF)
    xref = doc[PAGE - 1].get_image_info(xrefs=True)[0]['xref']
    pix = pymupdf.Pixmap(doc, xref)
    if pix.n >= 4 or pix.alpha:
        pix = pymupdf.Pixmap(pymupdf.csGRAY, pix)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, 0].copy()
    k = 8
    big = cv2.GaussianBlur(cv2.resize(img, None, fx=k, fy=k, interpolation=cv2.INTER_CUBIC), (0, 0), 3.4)
    _, bw = cv2.threshold(big, 160, 255, cv2.THRESH_BINARY_INV)
    bw = cv2.morphologyEx(bw, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    paths = []
    for c in contours:
        if cv2.contourArea(c) < 150:
            continue
        a = chaikin(cv2.approxPolyDP(c, 3.0, True)[:, 0, :].astype(float)) / k
        a = cv2.approxPolyDP((a * 10).astype(np.int32).reshape(-1, 1, 2), 2, True)[:, 0, :] / 10
        paths.append('M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in a) + 'Z')
    text = open(OUT, encoding='utf-8').read()
    text = re.sub(r"export const HAND_PATH = '[^']*';", f"export const HAND_PATH = '{' '.join(paths)}';", text)
    open(OUT, 'w', encoding='utf-8', newline='').write(text)
    print(f'{len(paths)} outlines written to {OUT}')


if __name__ == '__main__':
    main()
