import assert from "node:assert/strict";
import test from "node:test";
import { defaultMarketerCard, syncMarketerCard } from "../src/services/marketerCardService.js";
import { validateCard } from "../src/routes/cardRoutes.js";

test("new marketer card uses the default artwork and marketer contact details", () => {
  const card = defaultMarketerCard("marketer123", { name: "Ali", phone: "+923001234567", email: "ali@example.com", designation: "Sales Executive" });
  assert.equal(card.marketerId, "marketer123");
  assert.equal(card.values.name, "Ali");
  assert.equal(card.values.phone, "+923001234567");
  assert.equal(card.title, "Ali Card");
  assert.ok(card.image.startsWith("data:image/jpeg;base64,"));
  assert.doesNotThrow(() => validateCard({ template: card, values: card.values }));
});

test("marketer contact edits retain customized card artwork and fields", () => {
  const card = defaultMarketerCard("marketer123", { name: "Ali", phone: "1" });
  card.values.address = "Custom address";
  const change = syncMarketerCard(card, { name: "Ali Khan", phone: "2" });
  assert.equal(change.title, "Ali Khan Card");
  assert.equal(change.values.phone, "2");
  assert.equal(change.values.address, "Custom address");
});
