// Shared colors for the portal's printable reports.
export const PDF_BANNER = [122 / 255, 15 / 255, 43 / 255];
export const PDF_TABLE_HEAD = PDF_BANNER;
export const PDF_TABLE_SUBHEAD = PDF_BANNER;
export const PDF_FOOTER = PDF_BANNER;
export const pdfTextFill = (top, tableHeaderBottom = 47) => top < 29 || (top >= 38 && top < tableHeaderBottom) || top >= 197 ? "1 1 1" : "0.29 0.10 0.18";

// Standard Helvetica glyph widths (1000 units per em) used by the hand-built PDFs.
const glyphs = (letters, widths) => Object.fromEntries([...letters].map((letter, index) => [letter, widths[index]]));
const regular = {
  ...glyphs("ABCDEFGHIJKLMNOPQRSTUVWXYZ", [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611]),
  ...glyphs("abcdefghijklmnopqrstuvwxyz", [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500])
};
const bold = {
  ...glyphs("ABCDEFGHIJKLMNOPQRSTUVWXYZ", [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 667, 722, 667, 1000, 667, 667, 667]),
  ...glyphs("abcdefghijklmnopqrstuvwxyz", [556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500])
};
const punctuation = { " ": 278, ".": 278, ",": 278, ":": 278, ";": 278, "!": 278, "-": 333, "/": 278, "(": 333, ")": 333, "&": 667, "#": 556, "@": 1015, "?": 556, "'": 191, '"': 355, "_": 556, "|": 260, "+": 584, "=": 584, "%": 889 };

export function pdfTextWidth(value, fontSize, isBold = false) {
  const widths = isBold ? bold : regular;
  return [...String(value ?? "")].reduce((sum, character) => sum + (widths[character] ?? punctuation[character] ?? (/\d/.test(character) ? 556 : 556)), 0) * fontSize / 1000;
}

export function pdfCenteredTextTop(topMm, heightMm, lineCount, fontSize, pointsPerMm = 72 / 25.4) {
  const lineHeightMm = fontSize * 1.22 / pointsPerMm;
  return topMm + Math.max(0.8, (heightMm - lineCount * lineHeightMm) / 2);
}
