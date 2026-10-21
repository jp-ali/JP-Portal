import test from "node:test";
import assert from "node:assert/strict";
import { validateCardTemplate } from "../src/routes/cardTemplateRoutes.js";

const sample = () => ({
  image: `data:image/jpeg;base64,${"A".repeat(400)}`,
  imageWidth: 1200,
  imageHeight: 750,
  widthMm: 85.6,
  fields: [{ id: "name", label: "Name", x: 50, y: 45, fontSize: 48, color: "#73102b", align: "center", bold: true }]
});

test("card template accepts editable text placement", () => {
  assert.equal(validateCardTemplate(sample()).fields[0].label, "Name");
});

test("card template rejects oversized images and invalid field positions", () => {
  assert.throws(() => validateCardTemplate({ ...sample(), image: `data:image/jpeg;base64,${"A".repeat(750000)}` }), /under 550 KB/);
  const bad = sample();
  bad.fields[0].x = 101;
  assert.throws(() => validateCardTemplate(bad), /Invalid card field/);
});
