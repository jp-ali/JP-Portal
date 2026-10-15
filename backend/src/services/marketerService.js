import bcrypt from "bcryptjs";
import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "../config/firebase.js";
import { publicMarketer } from "../models/marketerModel.js";

const fields = ["name", "phone", "email", "designation", "assignedKms", "whatsappGroupName", "whatsappGroupLink", "assignedCityIds", "assignedAreaIds", "assignedSchoolIds", "subordinateMarketerIds"];
const arrayFields = new Set(["assignedCityIds", "assignedAreaIds", "assignedSchoolIds", "subordinateMarketerIds"]);

function validate(input, creating) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid marketer data");
  const data = {};
  for (const field of fields) {
    if (!(field in input)) continue;
    if (arrayFields.has(field)) {
      if (!Array.isArray(input[field]) || input[field].some((item) => typeof item !== "string" || item.length > 200)) throw new Error(`Invalid ${field}`);
      data[field] = [...new Set(input[field])];
    } else if (field === "assignedKms") {
      const value = Number(input[field]);
      if (!Number.isFinite(value) || value < 0 || value > 100000) throw new Error("Invalid assignedKms");
      data[field] = value;
    } else {
      if (typeof input[field] !== "string" || input[field].length > 500) throw new Error(`Invalid ${field}`);
      data[field] = input[field].trim();
    }
  }
  if (creating && (!data.name || !data.email || !data.phone || !input.password)) throw new Error("Name, email, phone and password are required");
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Invalid email");
  if ("password" in input && input.password !== "") {
    if (typeof input.password !== "string" || input.password.length < 8 || input.password.length > 1024) throw new Error("Password must be 8 to 1024 characters");
    data.passwordHash = bcrypt.hashSync(input.password, 12);
    data.password = FieldValue.delete();
  }
  return data;
}

export async function listMarketers(deleted = false) {
  const name = deleted ? "deleted_marketers" : "marketers";
  const snap = await firestore().collection(name).get();
  return snap.docs.map((doc) => publicMarketer({ id: doc.id, ...doc.data() }));
}

export async function accessibleMarketers(profile) {
  if (profile.role !== "marketer") return [];
  const ids = [...new Set([profile.marketerId, ...(profile.subordinateMarketerIds || [])].filter(Boolean))];
  const docs = await Promise.all(ids.map((id) => firestore().collection("marketers").doc(id).get()));
  return docs.filter((doc) => doc.exists).map((doc) => publicMarketer({ id: doc.id, ...doc.data() }));
}

export async function createMarketer(input) {
  const data = validate(input, true);
  delete data.password;
  data.createdAt = FieldValue.serverTimestamp();
  const ref = await firestore().collection("marketers").add(data);
  return publicMarketer({ id: ref.id, ...data });
}

export async function updateMarketer(id, input) {
  const ref = firestore().collection("marketers").doc(id);
  if (!(await ref.get()).exists) return null;
  const data = validate(input, false);
  if (!Object.keys(data).length) throw new Error("No changes supplied");
  await ref.update(data);
  return publicMarketer({ id, ...(await ref.get()).data() });
}

export async function archiveMarketer(id) {
  const db = firestore();
  const ref = db.collection("marketers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const { password, ...record } = snap.data();
  if (password && !record.passwordHash) record.passwordHash = await bcrypt.hash(password, 12);
  const archived = db.collection("deleted_marketers").doc();
  const batch = db.batch();
  batch.set(archived, { ...record, originalMarketerId: id, deletedAt: FieldValue.serverTimestamp() });
  batch.delete(ref);
  await batch.commit();
  return true;
}

export async function restoreMarketer(id) {
  const db = firestore();
  const oldRef = db.collection("deleted_marketers").doc(id);
  const snap = await oldRef.get();
  if (!snap.exists) return null;
  const { password, deletedAt, originalMarketerId, ...record } = snap.data();
  if (password && !record.passwordHash) record.passwordHash = await bcrypt.hash(password, 12);
  const targetId = originalMarketerId || id;
  const target = db.collection("marketers").doc(targetId);
  if ((await target.get()).exists) throw new Error("Original marketer ID is already in use");
  const batch = db.batch();
  batch.set(target, { ...record, createdAt: record.createdAt || FieldValue.serverTimestamp() });
  batch.delete(oldRef);
  await batch.commit();
  return publicMarketer({ id: targetId, ...record });
}

export async function deleteArchivedMarketer(id) {
  const ref = firestore().collection("deleted_marketers").doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.delete();
  return true;
}
