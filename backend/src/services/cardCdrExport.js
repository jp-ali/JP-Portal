import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const script = fileURLToPath(new URL("./convertCardToCdr.ps1", import.meta.url));
const escapeXml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
const linesFor = (value) => String(value ?? "").split(/\r?\n/).filter(Boolean);

function cardObjects(card) {
  const { image, imageWidth: width, imageHeight: height, fields, values } = card;
  const labels = fields.flatMap((field) => {
    let value = String(values[field.id] || "");
    let { x, y } = field;
    if (field.id === "phone2") {
      const first = fields.find((item) => item.id === "phone");
      if (!first || !values.phone || !value) return [];
      x = Math.min(98, first.x + String(values.phone).length * first.fontSize * 0.55 / width * 100 + 1.2);
      y = first.y;
      value = `| ${value}`;
    }
    if (field.id === "designation" && !values.name && y === 41) y = 33;
    return linesFor(value).map((line, index) => `<text x="${x * width / 100}" y="${y * height / 100 + index * field.fontSize * 1.2}" fill="${field.color}" font-family="Arial, sans-serif" font-size="${field.fontSize}" font-weight="${field.bold ? 700 : 400}" text-anchor="${{ left: "start", center: "middle", right: "end" }[field.align]}">${escapeXml(line)}</text>`);
  }).join("\n");
  return `<image x="0" y="0" width="${width}" height="${height}" xlink:href="${image}"/>\n${labels}`;
}

export function cardCdrSource(cards) {
  if (!cards.length) throw new Error("Select at least one card.");
  if (cards.length === 1) {
    const card = cards[0];
    const heightMm = card.widthMm * card.imageHeight / card.imageWidth;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${card.widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${card.imageWidth} ${card.imageHeight}">\n${cardObjects(card)}\n</svg>`;
  }
  const pages = Math.ceil(cards.length / 10);
  const items = cards.map((card, index) => {
    const page = Math.floor(index / 10);
    const position = index % 10;
    const scale = Math.min(90 / card.imageWidth, 52 / card.imageHeight);
    const width = card.imageWidth * scale;
    const height = card.imageHeight * scale;
    const x = 10 + position % 2 * 100 + (90 - width) / 2;
    const y = page * 297 + 10 + Math.floor(position / 2) * 56 + (52 - height) / 2;
    return `<g id="card-${index + 1}"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" stroke="#dddddd" stroke-width="0.15"/><g transform="translate(${x} ${y}) scale(${scale})">${cardObjects(card)}</g></g>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="210mm" height="${pages * 297}mm" viewBox="0 0 210 ${pages * 297}">\n${items}\n</svg>`;
}

export async function convertCardsToCdr(cards) {
  if (process.platform !== "win32") {
    const error = new Error("CDR export needs CorelDRAW installed on the Windows API computer. Download the Corel SVG and save it as CDR in CorelDRAW.");
    error.status = 503;
    throw error;
  }
  const tempDir = await mkdtemp(join(tmpdir(), "school-card-cdr-"));
  const svgPath = join(tempDir, "card.svg");
  const cdrPath = join(tempDir, "card.cdr");
  try {
    await writeFile(svgPath, cardCdrSource(cards), "utf8");
    await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-InputPath", svgPath, "-OutputPath", cdrPath], { windowsHide: true, timeout: 120000, maxBuffer: 20000 });
    const info = await stat(cdrPath);
    if (info.size < 100) throw new Error("CorelDRAW created an empty CDR file.");
    return await readFile(cdrPath);
  } catch (cause) {
    const error = new Error("CorelDRAW could not create the CDR file on this computer. Open CorelDRAW and try again, or download the Corel SVG and save it as CDR there.");
    error.status = 503;
    error.cause = cause;
    throw error;
  } finally {
    const tempRoot = resolve(tmpdir()) + sep;
    if (resolve(tempDir).startsWith(tempRoot)) await rm(tempDir, { recursive: true, force: true });
  }
}
