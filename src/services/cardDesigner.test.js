import test from "node:test";
import assert from "node:assert/strict";
import { cardSvg, defaultCardFields } from "./cardDesigner.js";

test("Corel SVG embeds the art and keeps entered text as escaped vector text", () => {
  const svg = cardSvg({ image: "data:image/jpeg;base64,AAAA", imageWidth: 1200, imageHeight: 750, widthMm: 85.6, fields: [defaultCardFields[0]] }, { name: "Ali & Co <JP>" });
  assert.match(svg, /<image[^>]+xlink:href="data:image\/jpeg;base64,AAAA"/);
  assert.match(svg, /<text[^>]+text-anchor="start">Ali &amp; Co &lt;JP&gt;<\/text>/);
  assert.doesNotMatch(svg, /<JP>/);
});
