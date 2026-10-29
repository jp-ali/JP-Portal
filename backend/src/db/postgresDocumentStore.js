import { randomBytes } from "node:crypto";
import { postgresPool } from "../config/postgres.js";
import { applyDocumentPatch, decodeDocumentValue, encodeDocumentValue, Timestamp } from "./documentValues.js";

const id = () => randomBytes(15).toString("base64url");
const parts = (path) => String(path || "").split("/").filter(Boolean);
const validateCollection = (path) => {
  const pieces = parts(path);
  if (!pieces.length || pieces.length % 2 !== 1) throw new Error(`Invalid collection path: ${path}`);
  return pieces.join("/");
};
const validateDocument = (path) => {
  const pieces = parts(path);
  if (pieces.length < 2 || pieces.length % 2 !== 0) throw new Error(`Invalid document path: ${path}`);
  return pieces.join("/");
};

class DocumentSnapshot {
  constructor(ref, payload) {
    this.ref = ref;
    this.id = ref.id;
    this.exists = payload !== null;
    this.payload = payload;
  }
  data() { return this.exists ? decodeDocumentValue(this.payload) : undefined; }
  get(field) { return this.data()?.[field]; }
}

class QuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
  forEach(callback) { this.docs.forEach(callback); }
}

function whereSql(conditions, args) {
  const clauses = [];
  for (const { field, operator, value } of conditions) {
    const path = String(field).split(".");
    if (operator === "in") {
      if (!Array.isArray(value) || !value.length) throw new Error("An in filter needs values");
      args.push(path);
      const jsonText = `(payload #>> $${args.length}::text[])`;
      args.push(value.map(String));
      clauses.push(`${jsonText} = ANY($${args.length}::text[])`);
    } else if (["==", ">=", ">", "<=", "<"].includes(operator)) {
      const sqlOperator = operator === "==" ? "=" : operator;
      if (value instanceof Timestamp) {
        args.push([...path, "seconds"]);
        args.push(value.seconds);
        const secondsText = `(payload #>> $${args.length - 1}::text[])`;
        clauses.push(`${secondsText} IS NOT NULL AND ${secondsText}::bigint ${sqlOperator} $${args.length}::bigint`);
      } else {
        args.push(path);
        const jsonText = `(payload #>> $${args.length}::text[])`;
        args.push(value === null ? null : String(value));
        clauses.push(`${jsonText} ${sqlOperator} $${args.length}`);
      }
    } else throw new Error(`Unsupported query operator: ${operator}`);
  }
  return clauses;
}

class Query {
  constructor(store, path, conditions = [], ordering = null, maximum = null, selected = null) {
    this.store = store;
    this.path = validateCollection(path);
    this.conditions = conditions;
    this.ordering = ordering;
    this.maximum = maximum;
    this.selected = selected;
  }
  where(field, operator, value) { return new Query(this.store, this.path, [...this.conditions, { field, operator, value }], this.ordering, this.maximum, this.selected); }
  orderBy(field, direction = "asc") { return new Query(this.store, this.path, this.conditions, { field, direction }, this.maximum, this.selected); }
  limit(maximum) { return new Query(this.store, this.path, this.conditions, this.ordering, maximum, this.selected); }
  select(...fields) { return new Query(this.store, this.path, this.conditions, this.ordering, this.maximum, fields); }
  count() {
    return { get: async () => {
      const count = await this.store.countQuery(this);
      return { data: () => ({ count }) };
    } };
  }
  async get() { return this.store.getQuery(this); }
}

class CollectionReference extends Query {
  constructor(store, path) { super(store, path); this.id = parts(path).at(-1); }
  doc(documentId = id()) { return new DocumentReference(this.store, `${this.path}/${documentId}`); }
  async add(data) { const ref = this.doc(); await ref.create(data); return ref; }
}

class DocumentReference {
  constructor(store, path) {
    this.store = store;
    this.path = validateDocument(path);
    this.id = parts(path).at(-1);
  }
  collection(name) { return new CollectionReference(this.store, `${this.path}/${name}`); }
  async get() { return this.store.getDocument(this); }
  async set(data, options) { await this.store.write([{ operation: "set", ref: this, data, options }]); }
  async create(data) { await this.store.write([{ operation: "create", ref: this, data }]); }
  async update(data) { await this.store.write([{ operation: "update", ref: this, data }]); }
  async delete() { await this.store.write([{ operation: "delete", ref: this }]); }
}

class WriteBatch {
  constructor(store) { this.store = store; this.operations = []; }
  set(ref, data, options) { this.operations.push({ operation: "set", ref, data, options }); return this; }
  create(ref, data) { this.operations.push({ operation: "create", ref, data }); return this; }
  update(ref, data) { this.operations.push({ operation: "update", ref, data }); return this; }
  delete(ref) { this.operations.push({ operation: "delete", ref }); return this; }
  async commit() { await this.store.write(this.operations); return this.operations.map(() => ({})); }
}

async function applyOperation(client, { operation, ref, data, options }) {
  const { rows } = await client.query("SELECT payload FROM portal_documents WHERE path = $1 FOR UPDATE", [ref.path]);
  const oldPayload = rows[0]?.payload;
  if (operation === "delete") {
    await client.query("DELETE FROM portal_documents WHERE path = $1", [ref.path]);
    return;
  }
  if (operation === "create" && oldPayload) throw Object.assign(new Error("Document already exists"), { code: 6 });
  if (operation === "update" && !oldPayload) throw Object.assign(new Error("Document does not exist"), { code: 5 });
  const merge = operation === "update" || (operation === "set" && options?.merge === true);
  const next = applyDocumentPatch(merge && oldPayload ? decodeDocumentValue(oldPayload) : null, data, merge);
  const encoded = encodeDocumentValue(next);
  const collectionPath = parts(ref.path).slice(0, -1).join("/");
  await client.query(`
    INSERT INTO portal_documents (path, collection_path, document_id, payload)
    VALUES ($1, $2, $3, $4::jsonb)
    ON CONFLICT (path) DO UPDATE SET payload = EXCLUDED.payload,
      revision = portal_documents.revision + 1, updated_at = now()
  `, [ref.path, collectionPath, ref.id, JSON.stringify(encoded)]);
}

export class PostgresDocumentStore {
  constructor(pool = postgresPool()) { this.pool = pool; }
  collection(path) { return new CollectionReference(this, path); }
  doc(path) { return new DocumentReference(this, path); }
  batch() { return new WriteBatch(this); }
  async getDocument(ref, client = this.pool) {
    const { rows } = await client.query("SELECT payload FROM portal_documents WHERE path = $1", [ref.path]);
    return new DocumentSnapshot(ref, rows[0]?.payload ?? null);
  }
  async getAll(...refs) {
    if (!refs.length) return [];
    const { rows } = await this.pool.query("SELECT path, payload FROM portal_documents WHERE path = ANY($1::text[])", [refs.map((ref) => ref.path)]);
    const found = new Map(rows.map((row) => [row.path, row.payload]));
    return refs.map((ref) => new DocumentSnapshot(ref, found.get(ref.path) ?? null));
  }
  querySql(query, count = false) {
    const args = [query.path];
    const clauses = ["collection_path = $1", ...whereSql(query.conditions, args)];
    const base = `FROM portal_documents WHERE ${clauses.join(" AND ")}`;
    if (count) return { sql: `SELECT count(*)::integer AS count ${base}`, args };
    const projection = query.selected?.length
      ? `jsonb_strip_nulls(jsonb_build_object(${query.selected.map((field) => {
        if (!/^[A-Za-z][A-Za-z0-9_]{0,80}$/.test(field)) throw new Error("Invalid selected field");
        return `'${field}', payload -> '${field}'`;
      }).join(", ")}))`
      : "payload";
    let sql = `SELECT path, ${projection} AS payload ${base}`;
    if (query.ordering) {
      args.push(String(query.ordering.field).split("."));
      const direction = query.ordering.direction === "desc" ? "DESC" : "ASC";
      const textPath = args.length;
      args.push([...String(query.ordering.field).split("."), "seconds"]);
      sql += ` ORDER BY (payload #>> $${args.length}::text[])::bigint ${direction} NULLS LAST,
        payload #>> $${textPath}::text[] ${direction} NULLS LAST, document_id ${direction}`;
    } else sql += " ORDER BY document_id";
    if (query.maximum !== null) {
      args.push(Number(query.maximum));
      sql += ` LIMIT $${args.length}`;
    }
    return { sql, args };
  }
  async getQuery(query) {
    const { sql, args } = this.querySql(query);
    const { rows } = await this.pool.query(sql, args);
    return new QuerySnapshot(rows.map((row) => {
      let payload = row.payload;
      if (query.selected) payload = Object.fromEntries(query.selected.filter((field) => field in payload).map((field) => [field, payload[field]]));
      return new DocumentSnapshot(this.doc(row.path), payload);
    }));
  }
  async countQuery(query) {
    const { sql, args } = this.querySql(query, true);
    const { rows } = await this.pool.query(sql, args);
    return rows[0].count;
  }
  async write(operations) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const operation of operations) await applyOperation(client, operation);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  async runTransaction(callback) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        const operations = [];
        const transaction = {
          get: (ref) => this.getDocument(ref, client),
          set: (ref, data, options) => { operations.push({ operation: "set", ref, data, options }); },
          create: (ref, data) => { operations.push({ operation: "create", ref, data }); },
          update: (ref, data) => { operations.push({ operation: "update", ref, data }); },
          delete: (ref) => { operations.push({ operation: "delete", ref }); }
        };
        const result = await callback(transaction);
        for (const operation of operations) await applyOperation(client, operation);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        if (error.code !== "40001" || attempt === 2) throw error;
      } finally { client.release(); }
    }
  }
}

let store;
export function postgresDocumentStore() {
  if (!store) store = new PostgresDocumentStore();
  return store;
}
