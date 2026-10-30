const clean = (value) => String(value ?? "").trim();

export function getSchoolVisitDetails(school) {
  const details = school?.visitDetails;
  return {
    principalName: clean(details?.principalName),
    phone: clean(details?.phone),
    session: clean(details?.session),
    branches: clean(details?.branches),
    strength: clean(details?.strength)
  };
}

export function makeSchoolVisitDetails({ principalName, phone, session, branches, strength }) {
  return {
    principalName: clean(principalName),
    phone: clean(phone),
    session: clean(session),
    branches: clean(branches),
    strength: clean(strength)
  };
}
