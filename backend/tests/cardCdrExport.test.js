import test from "node:test";
import assert from "node:assert/strict";
import { cardCdrSource } from "../src/services/cardCdrExport.js";

const card = {
  image: "data:image/jpeg;base64,AAAA",
  imageWidth: 1200,
  imageHeight: 750,
  widthMm: 85.6,
  fields: [{ id: "name", x: 10, y: 30, fontSize: 48, color: "#242424", align: "left", bold: true }],
  values: { name: "Ali & Co" }
};

test("CDR source retains the card artwork and editable text", () => {
  const svg = cardCdrSource([card]);
  assert.match(svg, /width="85\.6mm"/);
  assert.match(svg, /xlink:href="data:image\/jpeg;base64,AAAA"/);
  assert.match(svg, /<text[^>]*>Ali &amp; Co<\/text>/);
});

test("CDR sheet source includes every selected card", () => {
  const svg = cardCdrSource([card, { ...card, values: { name: "JP Books" } }]);
  assert.match(svg, /id="card-1"/);
  assert.match(svg, /id="card-2"/);
  assert.match(svg, /JP Books<\/text>/);
});
