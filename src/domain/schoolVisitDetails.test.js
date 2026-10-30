import test from "node:test";
import assert from "node:assert/strict";
import { getSchoolVisitDetails, makeSchoolVisitDetails } from "./schoolVisitDetails.js";

test("new school details can be restored without carrying visit-specific fields", () => {
  const details = makeSchoolVisitDetails({
    principalName: "  Ms Ali  ", phone: " 03001234567 ", session: "October",
    branches: "2", strength: "450", purpose: "FollowUp", notes: "Discussed books"
  });
  assert.deepEqual(getSchoolVisitDetails({ visitDetails: details }), {
    principalName: "Ms Ali", phone: "03001234567", session: "October", branches: "2", strength: "450"
  });
  assert.equal("purpose" in details, false);
  assert.equal("notes" in details, false);
});

test("schools without saved details start with blank fields", () => {
  assert.deepEqual(getSchoolVisitDetails({ name: "Existing School" }), {
    principalName: "", phone: "", session: "", branches: "", strength: ""
  });
});
