import { postgresDocumentStore } from "../db/postgresDocumentStore.js";
export { FieldValue, Timestamp } from "../db/documentValues.js";

export const portalStore = () => postgresDocumentStore();
