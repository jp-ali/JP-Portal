import { columnsFromHeadings, reportColumns, rowValue } from "../domain/customReportSchema.js";
import { schoolWiseVisitPdfMatrix } from "./schoolWiseVisitPdf.js";

const text = (value) => String(value ?? "").trim();
const headingWords = /\b(date|name|city|area|phone|number|mobile|institute|school|company|remarks|marketer|contact|address|time|session|purpose|strength|branches)\b/i;
const isDateHeading = (label) => /^\s*(?:visit\s+)?date\s*$/i.test(label);
const isMarketerHeading = (label) => /^\s*(?:marketer|sale\s+officer|sales\s+officer|marketer\s+name)\s*$/i.test(label);

export function dateForImport(value, fallback) {
  const raw = text(value);
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    let [, first, second, year] = match;
    if (year.length === 2) year = `20${year}`;
    const day = Number(first) > 12 ? first : Number(second) > 12 ? second : first;
    const month = Number(first) > 12 ? second : Number(second) > 12 ? first : second;
    const result = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    if (!Number.isNaN(Date.parse(`${result}T00:00:00Z`)) && new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) === result) return result;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString().slice(0, 10);
}

export function matrixToImportPreview(matrix, filename = "", selectedHeadingRow = null) {
  const lines = matrix.map((row) => Array.isArray(row) ? row.map(text) : []);
  if (lines.filter((row) => row.some(Boolean)).length < 2) throw new Error("The file needs a heading row and at least one data row.");
  const candidates = lines.slice(0, 30).map((row, index) => {
    const values = row.filter(Boolean);
    const recognized = values.filter((value) => headingWords.test(value)).length;
    const words = values.filter((value) => /[a-z]/i.test(value) && !/@|https?:|\d{4,}/i.test(value)).length;
    const following = lines.slice(index + 1).find((next) => next.some(Boolean)) || [];
    const aligned = row.filter((value, column) => value && following[column]).length;
    const metadata = /^(downloaded|created by|report date|total rows|page \d+)/i.test(values[0] || "");
    return { index, score: recognized * 7 + words * 2 + Math.min(values.length, 12) + aligned * 2 - (metadata ? 30 : 0) - (values.some((value) => /^\d{3,}$/.test(value)) ? 8 : 0) };
  }).filter(({ index }) => lines[index].filter(Boolean).length >= 2 && lines.slice(index + 1).some((row) => row.some(Boolean)));
  if (!candidates.length) throw new Error("Could not find table headings in this file.");
  const headingIndex = selectedHeadingRow === null ? candidates.sort((a, b) => b.score - a.score || a.index - b.index)[0].index : Number(selectedHeadingRow);
  if (!lines[headingIndex]?.some(Boolean) || !lines.slice(headingIndex + 1).some((row) => row.some(Boolean))) throw new Error("Choose a heading row above the data.");
  const header = [...lines[headingIndex]];
  const parent = lines[headingIndex - 1] || [];
  if (parent.filter(Boolean).length >= 2) for (let index = 0; index < parent.length; index++) if (!header[index] && parent[index]) header[index] = parent[index];
  const data = lines.slice(headingIndex + 1).filter((row) => row.some(Boolean) && !row.every((value, index) => !value || value === header[index]) && !/^created by|^downloaded/i.test(row.find(Boolean) || ""));
  if (!data.length) throw new Error("No table rows were found after the headings.");
  const width = Math.min(80, Math.max(header.length, ...data.map((row) => row.length)));
  const headings = Array.from({ length: width }, (_, index) => ({ index, label: header[index] || `Column ${index + 1}` })).filter(({ index }) => header[index] || data.some((row) => row[index]));
  return { filename, headings, rows: data, headingRow: headingIndex, headingChoices: candidates.map(({ index }) => ({ index, summary: lines[index].filter(Boolean).slice(0, 4).join(" · ").slice(0, 100) })), sourceMatrix: matrix };
}

export function savedReportToImportPreview(report) {
  const columns = reportColumns(report);
  return matrixToImportPreview([
    columns.map((column) => column.label),
    ...(report.rows || []).map((row) => columns.map((column) => rowValue(row, column, report)))
  ], report.title);
}

async function readExcel(file) {
  const module = await import("xlsx-js-style");
  const XLSX = module.default || module;
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheets = [];
  for (const sheetName of workbook.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "", raw: false });
    try {
      const preview = matrixToImportPreview(matrix, file.name);
      const recognized = preview.headings.filter(({ label }) => headingWords.test(label)).length;
      sheets.push({ name: sheetName, matrix, preview, score: recognized * 10 + preview.headings.length + Math.min(preview.rows.length, 100) / 10 });
    } catch { /* Ignore title and empty sheets; the user can choose any sheet with a table. */ }
  }
  if (sheets.length) {
    const best = [...sheets].sort((a, b) => b.score - a.score)[0];
    return { ...best.preview, sheetName: best.name, availableSheets: sheets.map(({ name, matrix }) => ({ name, matrix })) };
  }
  throw new Error("No table was found in the Excel workbook.");
}

export function pdfLines(items) {
  const lines = [];
  for (const item of items.filter((entry) => text(entry.str)).sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])) {
    const y = item.transform[5];
    const line = lines.find((entry) => Math.abs(entry.y - y) <= 3);
    if (line) line.items.push(item);
    else lines.push({ y, items: [item] });
  }
  return lines.map((line) => line.items.sort((a, b) => a.transform[4] - b.transform[4]));
}

export function pdfPagesToImportPreview(pages, filename = "") {
  const allLines = pages.flat();
  const headingLine = allLines.find((line) => line.length >= 2 && line.filter((item) => headingWords.test(item.str)).length >= 2);
  if (!headingLine) throw new Error("No selectable PDF table headings were found. Scanned image PDFs need text recognition first.");
  const headingPage = pages.findIndex((page) => page.includes(headingLine));
  const headingIndex = pages[headingPage].indexOf(headingLine);
  const anchors = headingLine.map((item) => item.transform[4]);
  const header = headingLine.map((item) => text(item.str));
  const matrix = [header];
  pages.slice(headingPage).forEach((page, pageOffset) => {
    page.slice(pageOffset === 0 ? headingIndex + 1 : 0).forEach((line) => {
      if (line.filter((item) => headingWords.test(item.str)).length >= 2 && line.length === headingLine.length) return;
      if (/^(downloaded|created by|page \d+)/i.test(text(line[0]?.str))) return;
      const row = Array(anchors.length).fill("");
      for (const item of line) {
        const x = item.transform[4];
        let closest = 0;
        for (let index = 1; index < anchors.length; index++) if (Math.abs(anchors[index] - x) < Math.abs(anchors[closest] - x)) closest = index;
        row[closest] = `${row[closest]} ${text(item.str)}`.trim();
      }
      if (row.filter(Boolean).length >= 2) matrix.push(row);
    });
  });
  return matrixToImportPreview(matrix, filename);
}

async function readPdf(file, canvasFactory) {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist/legacy/build/pdf.mjs"), import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")]);
  if (typeof worker.default === "string") pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  if (document.numPages > 100) {
    await loadingTask.destroy();
    throw new Error("Import PDFs of up to 100 pages. Split larger files first.");
  }
  const pages = [];
  let scannedPage = false;
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const items = (await page.getTextContent()).items;
    if (items.filter((item) => text(item.str)).length < 4) scannedPage = true;
    pages.push(pdfLines(items));
  }
  const schoolWiseMatrix = schoolWiseVisitPdfMatrix(pages);
  if (schoolWiseMatrix) {
    const preview = matrixToImportPreview(schoolWiseMatrix, file.name);
    await loadingTask.destroy();
    return preview;
  }
  if (!scannedPage) {
    try {
      const preview = pdfPagesToImportPreview(pages, file.name);
      await loadingTask.destroy();
      return preview;
    }
    catch { /* Some PDFs contain a text layer without usable table cells. Read their rendered pages instead. */ }
  }
  const [{ createWorker }, { imageTsvToMatrix, ocrMatrixToPreview }] = await Promise.all([import("tesseract.js"), import("./imageReportOcr.js")]);
  const ocrWorker = await createWorker("eng");
  const matrices = [];
  let reference = null;
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, 2200 / Math.max(baseViewport.width, baseViewport.height)) });
      const canvas = canvasFactory ? canvasFactory() : globalThis.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const ocrInput = typeof canvas.toBuffer === "function" ? canvas.toBuffer("image/png") : canvas;
      const { data } = await ocrWorker.recognize(ocrInput, {}, { tsv: true });
      canvas.width = 0;
      canvas.height = 0;
      try {
        const matrix = imageTsvToMatrix(data.tsv, reference);
        if (!reference && matrix[0].length > 1 && matrix.columnBoundaries?.length) reference = { headings: matrix[0], boundaries: matrix.columnBoundaries };
        matrices.push(matrix);
      } catch (error) {
        if (!/No readable text/.test(error.message)) throw error;
      }
    }
  } finally {
    await ocrWorker.terminate();
    await loadingTask.destroy();
  }
  if (!matrices.length) throw new Error("No readable text was found in this PDF. Try a clearer scan.");
  const primary = matrices.find((matrix) => matrix[0].length > 1) || matrices[0];
  const headings = primary[0];
  const combined = [headings];
  for (const matrix of matrices) {
    const sameHeadings = matrix[0].length === headings.length && matrix[0].every((label, index) => label.toLowerCase() === headings[index].toLowerCase());
    const rows = matrix.slice(1);
    if (sameHeadings || matrix[0].length === headings.length) combined.push(...rows);
    else if (headings.length === 1) combined.push(...rows.map((row) => [row.join(" ")]));
    else combined.push(...rows.map((row) => [row.join(" "), ...Array(headings.length - 1).fill("")]));
  }
  return ocrMatrixToPreview(combined, file.name);
}

export async function readImportFile(file, { canvasFactory } = {}) {
  if (!file) throw new Error("Choose a PDF, spreadsheet or picture.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Choose a file under 25 MB.");
  if (/\.pdf$/i.test(file.name)) return readPdf(file, canvasFactory);
  if (/\.(xlsx|xls|xlsm|csv|tsv|ods)$/i.test(file.name)) return readExcel(file);
  if (/\.(png|jpe?g|webp|bmp|gif|pbm|tiff?|heic|heif|avif)$/i.test(file.name) || /^image\//i.test(file.type)) {
    const { readImageReport } = await import("./imageReportOcr.js");
    return readImageReport(file);
  }
  throw new Error("Choose a PDF, spreadsheet or picture file.");
}

export function buildImportPayload(preview, selectedIndices, title, reportDate) {
  const selected = preview.headings.filter(({ index }) => selectedIndices.includes(index));
  if (!selected.length) throw new Error("Select at least one heading to show.");
  if (selected.length > 18) throw new Error("Select up to 18 headings for one report.");
  const dateSource = selected.find(({ label }) => isDateHeading(label));
  const marketerSource = selected.find(({ label }) => isMarketerHeading(label));
  const detailSources = selected.filter((item) => item !== dateSource && item !== marketerSource);
  if (!detailSources.length) throw new Error("Select at least one data heading besides Date or Marketer.");
  const detailColumns = columnsFromHeadings(detailSources.map(({ label }) => label.replaceAll(",", " ")).join(","));
  const columns = [{ key: "date", label: "Date", type: "date" }, ...(marketerSource ? [{ key: "marketer", label: "Marketer", type: "marketer" }] : []), ...detailColumns];
  let previousDate = reportDate;
  let previousMarketer = "";
  let previousName = "";
  const rows = preview.rows.map((source) => {
    const dateValue = dateSource ? text(source[dateSource.index]) : "";
    if (dateValue) previousDate = dateForImport(dateValue, reportDate);
    const row = { date: previousDate };
    if (marketerSource) {
      previousMarketer = text(source[marketerSource.index]) || previousMarketer;
      row.marketer = previousMarketer.slice(0, 300);
    }
    detailSources.forEach(({ index }, position) => {
      const column = detailColumns[position];
      let value = text(source[index]);
      if (column.key === "name") { previousName = value || previousName; value = previousName; }
      row[column.key] = value.slice(0, column.type === "remarks" ? 1000 : 300);
    });
    return row;
  }).filter((row) => detailColumns.some((column) => row[column.key]));
  if (!rows.length) throw new Error("Selected headings have no data rows.");
  if (rows.length > 400) throw new Error("This file has more than 400 rows. Split it into smaller reports before importing.");
  if (new TextEncoder().encode(JSON.stringify(rows)).length > 700000) throw new Error("Selected data is too large. Split it into smaller reports before importing.");
  return { title: title.trim(), date: reportDate, columns, options: { includeMarketers: Boolean(marketerSource), dateRange: false, hideDate: true, filterKeys: detailColumns.some((column) => column.key === "city") ? ["city"] : [] }, rows };
}
