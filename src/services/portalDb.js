const API = import.meta.env.VITE_API_BASE_URL || "/api";
const typeKey = "__schoolVisitValueType";
const operationKey = "__portalDocumentOperation";

async function call(path, options = {}) {
  const response = await fetch(`${API}/data${path}`, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...options
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Data service error (${response.status})`);
  return body;
}

export class Timestamp {
  constructor(seconds, nanoseconds = 0) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  static fromDate(date) {
    const milliseconds = date.getTime();
    return new Timestamp(Math.floor(milliseconds / 1000), (milliseconds % 1000) * 1_000_000);
  }
  static now() { return Timestamp.fromDate(new Date()); }
  toDate() { return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000)); }
  toMillis() { return this.toDate().getTime(); }
  toJSON() { return { [typeKey]: "timestamp", seconds: this.seconds, nanoseconds: this.nanoseconds }; }
}

function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    if (value[typeKey] === "timestamp") return new Timestamp(value.seconds, value.nanoseconds);
    if (value[typeKey] === "date") return new Date(value.iso);
    if (value[typeKey] === "bytes") return Uint8Array.from(atob(value.base64), (letter) => letter.charCodeAt(0));
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decode(child)]));
  }
  return value;
}

class DocumentSnapshot {
  constructor(path, data) {
    this.ref = { path, id: path.split("/").at(-1) };
    this.id = this.ref.id;
    this.value = data;
  }
  exists() { return this.value !== null; }
  data() { return this.exists() ? decode(this.value) : undefined; }
}

class QuerySnapshot {
  constructor(docs) {
    this.docs = docs.map(({ path, data }) => new DocumentSnapshot(path, data));
    this.size = this.docs.length;
    this.empty = this.size === 0;
  }
  forEach(callback) { this.docs.forEach(callback); }
}

export const db = { kind: "portal-postgres" };
export function collection(parent, ...segments) {
  const path = [parent?.path, ...segments].filter(Boolean).join("/");
  return { path, kind: "collection" };
}
export function doc(parent, ...segments) {
  const tail = segments.length ? segments : [crypto.randomUUID().replaceAll("-", "")];
  const path = [parent?.path, ...tail].filter(Boolean).join("/");
  return { path, id: path.split("/").at(-1), kind: "document" };
}
export function where(field, operator, value) { return { field, operator, value }; }
export function query(reference, ...filters) { return { path: reference.path, filters }; }
export function serverTimestamp() { return { [operationKey]: "timestamp" }; }
export function deleteField() { return { [operationKey]: "delete" }; }

export async function getDoc(reference) {
  const body = await call(`/document?path=${encodeURIComponent(reference.path)}`);
  return new DocumentSnapshot(reference.path, body.data);
}
export async function getDocs(reference) {
  const body = await call("/query", { method: "POST", body: JSON.stringify({ collectionPath: reference.path, filters: reference.filters || [] }) });
  return new QuerySnapshot(body.docs);
}
export async function getCountFromServer(reference) {
  const body = await call("/count", { method: "POST", body: JSON.stringify({ collectionPath: reference.path, filters: reference.filters || [] }) });
  return { data: () => ({ count: body.count }) };
}
export async function setDoc(reference, data, options) {
  return call(`/document?path=${encodeURIComponent(reference.path)}`, { method: "PUT", body: JSON.stringify({ data, merge: options?.merge === true }) });
}
export async function updateDoc(reference, data) {
  return call(`/document?path=${encodeURIComponent(reference.path)}`, { method: "PATCH", body: JSON.stringify({ data }) });
}
export async function deleteDoc(reference) {
  return call(`/document?path=${encodeURIComponent(reference.path)}`, { method: "DELETE" });
}
export async function addDoc(reference, data) {
  const target = doc(reference);
  await setDoc(target, data);
  return target;
}
export function writeBatch() {
  const operations = [];
  return {
    set(reference, data, options) { operations.push({ operation: "set", path: reference.path, data, merge: options?.merge === true }); return this; },
    update(reference, data) { operations.push({ operation: "update", path: reference.path, data }); return this; },
    delete(reference) { operations.push({ operation: "delete", path: reference.path }); return this; },
    async commit() { await call("/batch", { method: "POST", body: JSON.stringify({ operations }) }); }
  };
}
