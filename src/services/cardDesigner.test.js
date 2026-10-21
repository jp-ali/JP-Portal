import test from "node:test";
import assert from "node:assert/strict";
import { gunzipSync, strFromU8 } from "fflate";
import { cardRenderEntries, cardSheetSvg, cardSvg, corelShareFile, defaultCardFields, defaultCardValues } from "./cardDesigner.js";

test("Corel SVG embeds the art and keeps entered text as escaped vector text", () => {
  const svg = cardSvg({ image: "data:image/jpeg;base64,AAAA", imageWidth: 1200, imageHeight: 750, widthMm: 85.6, fields: [defaultCardFields[0]] }, { depotName: "Ali & Co <JP>" });
  assert.match(svg, /<image[^>]+xlink:href="data:image\/jpeg;base64,AAAA"/);
  assert.match(svg, /<text[^>]+text-anchor="start">Ali &amp; Co &lt;JP&gt;<\/text>/);
  assert.doesNotMatch(svg, /<JP>/);
});

test("second phone shares the first phone line and empty name lifts the role", () => {
  const fields = [...defaultCardFields];
  fields.splice(fields.findIndex((field) => field.id === "phone") + 1, 0, { ...fields.find((field) => field.id === "phone"), id: "phone2", label: "Second phone" });
  const entries = cardRenderEntries({ fields, imageWidth: 1658 }, { ...defaultCardValues, phone2: "+92-300-0000000" });
  assert.equal(entries.find(({ field }) => field.id === "phone2").value, "| +92-300-0000000");
  assert.equal(entries.find(({ field }) => field.id === "phone2").field.y, entries.find(({ field }) => field.id === "phone").field.y);
  assert.equal(entries.find(({ field }) => field.id === "designation").field.y, 33);
});

test("Corel sheet keeps several cards and their text as separate editable groups", () => {
  const card = { image: "data:image/jpeg;base64,AAAA", imageWidth: 1200, imageHeight: 750, widthMm: 85.6, fields: [defaultCardFields[0]], values: { depotName: "Ali & Co" } };
  const sheet = cardSheetSvg([card, { ...card, values: { depotName: "JP Books" } }]);
  assert.match(sheet, /width="210mm" height="297mm"/);
  assert.match(sheet, /id="card-1"/);
  assert.match(sheet, /id="card-2"/);
  assert.match(sheet, />Ali &amp; Co<\/text>/);
  assert.match(sheet, />JP Books<\/text>/);
  assert.equal((sheet.match(/<image /g) || []).length, 2);
});

test("Corel share file is a compressed SVG that retains editable text", async () => {
  const card = { image: "data:image/jpeg;base64,AAAA", imageWidth: 1200, imageHeight: 750, widthMm: 85.6, fields: [defaultCardFields[0]], values: { depotName: "Ali & Co" } };
  const compressed = corelShareFile(cardSheetSvg([card]));
  const svg = strFromU8(gunzipSync(new Uint8Array(await compressed.arrayBuffer())));
  assert.match(svg, /<svg /);
  assert.match(svg, /Ali &amp; Co<\/text>/);
});
