import assert from "node:assert/strict";
import test from "node:test";
import { alignLegacyCardFields, alignMarketerHeaderFields, defaultAdminCard, defaultMarketerCard, lockMarketerCard, syncMarketerCard } from "../src/services/marketerCardService.js";
import { validateCard } from "../src/routes/cardRoutes.js";

test("new marketer card uses the default artwork and marketer contact details", () => {
  const card = defaultMarketerCard("marketer123", { name: "Ali", phone: "+923001234567", email: "ali@example.com", designation: "Sales Executive" });
  assert.equal(card.marketerId, "marketer123");
  assert.equal(card.values.name, "Ali");
  assert.equal(card.values.phone, "+923001234567");
  assert.deepEqual(card.fields.filter((field) => ["depotName", "name", "designation", "assignedCity"].includes(field.id)).map(({ x, y }) => [x, y]), [[50, 14], [8.5, 24], [8.5, 33], [8.5, 41]]);
  const designation = card.fields.find((field) => field.id === "designation");
  const city = card.fields.find((field) => field.id === "assignedCity");
  assert.equal(city.fontSize, designation.fontSize);
  assert.equal(city.color, designation.color);
  assert.ok(city.y > designation.y);
  assert.equal(card.fields.find((field) => field.id === "depotName").fontSize, 60);
  assert.equal(card.title, "Ali Card");
  assert.ok(card.image.startsWith("data:image/jpeg;base64,"));
  assert.doesNotThrow(() => validateCard({ template: card, values: card.values }));
});

test("marketer city syncs with the card while other details remain", () => {
  const card = defaultMarketerCard("marketer123", { name: "Ali", assignedCity: "Lahore" });
  const change = syncMarketerCard(card, { name: "Ali", assignedCity: "Karachi" });
  assert.equal(change.values.assignedCity, "Karachi");
  assert.equal(change.values.website, card.values.website);
  const admin = defaultAdminCard();
  assert.equal(admin.values.name, "");
  assert.equal(admin.values.phone, "+92-3068482000");
  assert.deepEqual(admin.fields.filter((field) => ["depotName", "designation"].includes(field.id)).map(({ x, y }) => [x, y]), [[8.5, 24], [8.5, 41]]);
  assert.doesNotThrow(() => validateCard({ template: admin, values: admin.values }));
});

test("marketer card changes can move text without replacing its design or account data", () => {
  const original = defaultMarketerCard("marketer123", { name: "Ali", phone: "123" });
  const incoming = { ...original, image: "replaced", fields: original.fields.map((field) => field.id === "name" ? { ...field, x: 9, color: "#ff0000" } : field), values: { name: "Wrong" } };
  const locked = lockMarketerCard(original, incoming);
  assert.equal(locked.image, original.image);
  assert.equal(locked.values.name, "Ali");
  assert.equal(locked.fields.find((field) => field.id === "name").x, 9);
  assert.equal(locked.fields.find((field) => field.id === "name").color, original.fields.find((field) => field.id === "name").color);
});

test("admin can set a marketer card city without unlocking account details", () => {
  const original = defaultMarketerCard("marketer123", { name: "Ali", assignedCity: "" });
  const locked = lockMarketerCard(original, { ...original, values: { ...original.values, name: "Changed", assignedCity: "Lahore" } });
  assert.equal(locked.values.name, "Ali");
  assert.equal(locked.values.assignedCity, "Lahore");
  assert.equal(locked.manualCardCity, "Lahore");
  assert.equal(syncMarketerCard(locked, { name: "Ali", assignedCity: "Karachi" }).values.assignedCity, "Lahore");
});

test("legacy icon text positions move to the new aligned positions", () => {
  const fields = alignLegacyCardFields([{ id: "phone", y: 65.5 }, { id: "email", y: 75 }, { id: "website", y: 75 }, { id: "address", y: 87 }, { id: "phone", y: 68 }]);
  assert.deepEqual(fields.map((field) => field.y), [67, 76.5, 76.5, 88.5, 68]);
});

test("saved marketer card header moves to the new layout unless its position was customized", () => {
  const fields = alignMarketerHeaderFields([
    { id: "depotName", x: 8.5, y: 24 },
    { id: "name", x: 8.5, y: 33 },
    { id: "designation", x: 12, y: 38 },
    { id: "assignedCity", x: 8.5, y: 47 }
  ]);
  assert.deepEqual(fields.map(({ x, y }) => [x, y]), [[50, 14], [8.5, 24], [12, 38], [8.5, 41]]);
  assert.equal(fields[0].align, "center");
  assert.equal(alignMarketerHeaderFields([{ id: "depotName", x: 50, y: 14, fontSize: 50 }])[0].fontSize, 60);
  assert.equal(alignMarketerHeaderFields([{ id: "depotName", x: 50, y: 14, fontSize: 55 }])[0].fontSize, 60);
});

test("marketer contact edits retain customized card artwork and fields", () => {
  const card = defaultMarketerCard("marketer123", { name: "Ali", phone: "1" });
  card.values.address = "Custom address";
  const change = syncMarketerCard(card, { name: "Ali Khan", phone: "2" });
  assert.equal(change.title, "Ali Khan Card");
  assert.equal(change.values.phone, "2");
  assert.equal(change.values.address, "Custom address");
});
