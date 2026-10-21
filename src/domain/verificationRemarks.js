export const VERIFICATION_REMARK_OPTIONS = [
  "Sample Required",
  "Verified & Confirmed",
  "Unreachable / No Answer",
  "Busy / Line Engaged",
  "Invalid / Wrong Number",
  "Callback Requested",
  "Marketer Did Not Arrive",
  "Meeting Not Held",
  "Others"
];

export const isPhoneColumn = (column) => /(?:phone|mobile|number|whatsapp|contact)/i.test(`${column.key} ${column.label}`);

export const phoneHref = (value) => {
  const number = String(value || "").trim().replace(/[^\d+]/g, "");
  return number ? `tel:${number}` : "";
};
