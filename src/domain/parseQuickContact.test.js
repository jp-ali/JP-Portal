import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuickContact } from "./parseQuickContact.js";

test("quick paste maps labeled contact data into editable report columns", () => {
  assert.deepEqual(parseQuickContact("Hassan Saif\nCity: Karachi\nCompany name: Merchant Navy\nWhatsApp number: +923052192103"), {
    name: "Hassan Saif", number: "+923052192103", city: "Karachi", institute: "Merchant Navy", remarks: ""
  });
});

test("quick paste accepts explicit names, schools and notes", () => {
  assert.deepEqual(parseQuickContact("Name: Ali\nSchool: Javed School\nPhone: 03001234567\nNotes: Call tomorrow"), {
    name: "Ali", number: "03001234567", city: "", institute: "Javed School", remarks: "Call tomorrow"
  });
});
