const typeKey = "__schoolVisitValueType";
const operationKey = Symbol("portalDocumentOperation");

export class Timestamp {
  constructor(seconds, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static fromDate(date) {
    const milliseconds = date.getTime();
    return new Timestamp(Math.floor(milliseconds / 1000), (milliseconds % 1000) * 1_000_000);
  }
  static now() { return Timestamp.fromDate(new Date()); }
  toDate() { return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000)); }
  toMillis() { return this.toDate().getTime(); }
  toJSON() { return { [typeKey]: "timestamp", seconds: this.seconds, nanoseconds: this.nanoseconds }; }
}

class Operation {
  constructor(kind, values = []) { this[operationKey] = kind; this.values = values; }
}

export const FieldValue = {
  serverTimestamp: () => new Operation("timestamp"),
  delete: () => new Operation("delete"),
  arrayUnion: (...values) => new Operation("arrayUnion", values)
};

export function operationOf(value) { return value?.[operationKey] || null; }

export function decodeDocumentValue(value) {
  if (Array.isArray(value)) return value.map(decodeDocumentValue);
  if (value && typeof value === "object") {
    if (value[typeKey] === "timestamp") return new Timestamp(value.seconds, value.nanoseconds);
    if (value[typeKey] === "date") return new Date(value.iso);
    if (value[typeKey] === "bytes") return Buffer.from(value.base64, "base64");
    if (value[typeKey] === "number") return Number(value.value);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decodeDocumentValue(child)]));
  }
  return value;
}

export function encodeDocumentValue(value) {
  if (value instanceof Timestamp) return value.toJSON();
  if (value instanceof Date) return { [typeKey]: "date", iso: value.toISOString() };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { [typeKey]: "bytes", base64: Buffer.from(value).toString("base64") };
  if (Array.isArray(value)) return value.map(encodeDocumentValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encodeDocumentValue(child)]));
  return value;
}

export function applyDocumentPatch(current, patch, merge = true) {
  const result = merge ? { ...(current || {}) } : {};
  for (const [key, value] of Object.entries(patch || {})) {
    const operation = operationOf(value);
    if (operation === "delete") delete result[key];
    else if (operation === "timestamp") result[key] = Timestamp.now();
    else if (operation === "arrayUnion") {
      const before = Array.isArray(result[key]) ? result[key] : [];
      result[key] = [...before];
      for (const item of value.values) if (!result[key].some((existing) => JSON.stringify(existing) === JSON.stringify(item))) result[key].push(item);
    } else if (merge && value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Timestamp) && !Buffer.isBuffer(value) && !value[typeKey]) {
      result[key] = applyDocumentPatch(result[key], value, true);
    } else result[key] = value;
  }
  return result;
}
