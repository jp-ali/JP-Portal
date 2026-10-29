import { matrixToImportPreview } from "./reportImport.js";

const headingWords = /\b(date|name|city|area|phone|number|mobile|institute|school|company|remarks|marketer|contact|address|time|session|purpose|strength|branches)\b/i;

export function imageTsvToMatrix(tsv, reference = null) {
  const groups = new Map();
  for (const line of String(tsv || "").split(/\r?\n/).slice(1)) {
    const fields = line.split("\t");
    if (fields.length < 12 || Number(fields[0]) !== 5) continue;
    const value = fields.slice(11).join("\t").trim();
    if (!value || Number(fields[10]) < 0) continue;
    const word = { text: value, left: Number(fields[6]), top: Number(fields[7]), width: Number(fields[8]), height: Number(fields[9]) };
    if (![word.left, word.top, word.width, word.height].every(Number.isFinite)) continue;
    const key = fields.slice(1, 5).join(":");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  const lines = [...groups.values()].map((words) => ({
    top: Math.min(...words.map((word) => word.top)),
    words: words.sort((a, b) => a.left - b.left)
  })).sort((a, b) => a.top - b.top);
  if (!lines.length) throw new Error("No readable text was found in this picture. Try a clearer image.");
  const textRows = () => [["Text"], ...lines.map((line) => [line.words.map((word) => word.text).join(" ")])];
  const rowFromWords = (words, boundaries, width) => {
    const row = Array(width).fill("");
    for (const word of words) {
      const middle = word.left + word.width / 2;
      const column = boundaries.findIndex((boundary) => middle < boundary);
      const index = column < 0 ? row.length - 1 : column;
      row[index] = `${row[index]} ${word.text}`.trim();
    }
    return row;
  };
  if (lines.length < 2 && !reference?.boundaries?.length) return textRows();

  const candidateLines = lines.slice(0, 30).map((line, index) => {
    const heights = line.words.map((word) => word.height).sort((a, b) => a - b);
    const gapLimit = Math.max(12, (heights[Math.floor(heights.length / 2)] || 12) * 1.5);
    const cells = [];
    for (const word of line.words) {
      const last = cells[cells.length - 1];
      if (!last || word.left - last.right > gapLimit) cells.push({ left: word.left, right: word.left + word.width, text: word.text });
      else { last.right = Math.max(last.right, word.left + word.width); last.text += ` ${word.text}`; }
    }
    const recognized = cells.filter((cell) => headingWords.test(cell.text)).length;
    const dataLines = lines.slice(index + 1).filter((next) => next.words.length >= 2).length;
    return { index, cells, recognized, score: recognized * 10 + Math.min(cells.length, 18) * 2 + Math.min(dataLines, 5) };
  }).filter(({ cells, index }) => cells.length >= 2 && index < lines.length - 1);
  if (reference?.boundaries?.length && !candidateLines.some((line) => line.recognized >= 2)) {
    return [reference.headings, ...lines.map((line) => rowFromWords(line.words, reference.boundaries, reference.headings.length)).filter((row) => row.some(Boolean))];
  }
  if (!candidateLines.length) return textRows();
  const header = candidateLines.sort((a, b) => b.score - a.score || a.index - b.index)[0];
  const boundaries = header.cells.slice(1).map((cell, index) => (header.cells[index].right + cell.left) / 2);
  const matrix = [header.cells.map((cell) => cell.text)];
  Object.defineProperty(matrix, "columnBoundaries", { value: boundaries });
  for (const line of lines.slice(header.index + 1)) {
    const row = rowFromWords(line.words, boundaries, header.cells.length);
    if (row.filter(Boolean).length >= 2 && row.join("|").toLowerCase() !== matrix[0].join("|").toLowerCase()) matrix.push(row);
  }
  if (matrix.length < 2) return textRows();
  return matrix;
}

export function ocrMatrixToPreview(matrix, filename) {
  if (matrix[0].length === 1) return { filename, sourceKind: "image", headings: [{ index: 0, label: "Text" }], rows: matrix.slice(1), headingRow: 0, headingChoices: [], sourceMatrix: matrix };
  return { ...matrixToImportPreview(matrix, filename, 0), sourceKind: "image" };
}

async function pictureForOcr(file) {
  let image = file;
  if (/\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf]$/i.test(file.type)) {
    const { default: convert } = await import("heic2any");
    const converted = await convert({ blob: file, toType: "image/png" });
    return Array.isArray(converted) ? converted[0] : converted;
  }
  if (/\.tiff?$/i.test(file.name) || /^image\/tiff?$/i.test(file.type)) {
    const module = await import("utif");
    const UTIF = module.default || module;
    const buffer = await file.arrayBuffer();
    const page = UTIF.decode(buffer)[0];
    if (!page) throw new Error("This TIFF has no readable picture.");
    UTIF.decodeImage(buffer, page);
    const canvas = document.createElement("canvas");
    canvas.width = page.width;
    canvas.height = page.height;
    canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(page)), page.width, page.height), 0, 0);
    return canvas;
  }
  if (!/\.(png|jpe?g|webp|bmp|gif|pbm)$/i.test(file.name)) {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0);
      bitmap.close();
      image = canvas;
    } catch {
      throw new Error("This picture format could not be opened on this device. Save it as JPG or PNG and try again.");
    }
  }
  return image;
}

export async function readImageReport(file) {
  const { createWorker } = await import("tesseract.js");
  const image = await pictureForOcr(file);
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(image, {}, { tsv: true });
    return ocrMatrixToPreview(imageTsvToMatrix(data.tsv), file.name);
  } finally {
    await worker.terminate();
  }
}
