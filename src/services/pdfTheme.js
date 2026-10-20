// Shared colors for the portal's printable reports.
export const PDF_BANNER = [122 / 255, 15 / 255, 43 / 255];
export const PDF_TABLE_HEAD = PDF_BANNER;
export const PDF_TABLE_SUBHEAD = PDF_BANNER;
export const PDF_FOOTER = PDF_BANNER;
export const pdfTextFill = (top, tableHeaderBottom = 47) => top < 29 || (top >= 38 && top < tableHeaderBottom) || top >= 197 ? "1 1 1" : "0.29 0.10 0.18";
