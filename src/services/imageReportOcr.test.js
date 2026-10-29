import assert from "node:assert/strict";
import test from "node:test";
import { buildImportPayload } from "./reportImport.js";
import { imageTsvToMatrix } from "./imageReportOcr.js";

const heading = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext";
const word = (line, number, left, top, value, width = 50) => `5\t1\t1\t1\t${line}\t${number}\t${left}\t${top}\t${width}\t20\t95\t${value}`;

test("picture OCR positions become report headings and data rows", () => {
  const tsv = [heading,
    word(1, 1, 20, 10, "Contacts", 90),
    word(2, 1, 20, 55, "Name"), word(2, 2, 180, 55, "City"), word(2, 3, 340, 55, "Phone"),
    word(3, 1, 20, 90, "Ali"), word(3, 2, 180, 90, "Lahore"), word(3, 3, 340, 90, "03001234567"),
    word(4, 1, 20, 125, "Sara"), word(4, 2, 180, 125, "Karachi"), word(4, 3, 340, 125, "03007654321")
  ].join("\n");
  const matrix = imageTsvToMatrix(tsv);
  assert.deepEqual(matrix, [["Name", "City", "Phone"], ["Ali", "Lahore", "03001234567"], ["Sara", "Karachi", "03007654321"]]);
  const preview = { headings: matrix[0].map((label, index) => ({ label, index })), rows: matrix.slice(1) };
  const report = buildImportPayload(preview, [0, 1, 2], "Contacts", "2026-10-26");
  assert.equal(report.rows[1].city, "Karachi");
  assert.equal(report.rows[0].phone, "03001234567");
});

test("plain picture text becomes report rows and a blank picture gives a useful error", () => {
  const tsv = [heading, word(1, 1, 20, 10, "Meeting"), word(1, 2, 80, 10, "notes"), word(2, 1, 20, 45, "Call"), word(2, 2, 80, 45, "Ali")].join("\n");
  assert.deepEqual(imageTsvToMatrix(tsv), [["Text"], ["Meeting notes"], ["Call Ali"]]);
  assert.throws(() => imageTsvToMatrix(heading), /No readable text/);
});
