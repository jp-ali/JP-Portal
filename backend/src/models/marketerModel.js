import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "../config/firebase.js";

const collection = () => firestore().collection("marketers");

export async function findMarketerByIdentifier(identifier) {
  const field = identifier.includes("@") ? "email" : "phone";
  const result = await collection().where(field, "==", identifier).limit(1).get();
  if (result.empty) return null;
  const doc = result.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function findMarketerById(id) {
  const doc = await collection().doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function migrateLegacyPassword(id, hash) {
  await collection().doc(id).update({ passwordHash: hash, password: FieldValue.delete() });
}

export function publicMarketer(marketer) {
  if (!marketer) return null;
  const { password, passwordHash, ...safe } = marketer;
  return safe;
}
