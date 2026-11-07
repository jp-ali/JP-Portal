import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { portalStore } from "../config/portalStore.js";
import { findMarketerByIdentifier } from "../models/marketerModel.js";

const trainers = () => portalStore().collection("trainers");
const bad = (message) => Object.assign(new Error(message), { status: 400 });

export function publicTrainer(record) {
  if (!record) return null;
  const { passwordHash, password, ...safe } = record;
  return safe;
}

export async function findTrainerById(id) {
  const snapshot = await trainers().doc(id).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function findTrainerByIdentifier(identifier) {
  const normalized = String(identifier || "").trim().toLowerCase();
  const field = normalized.includes("@") ? "email" : "phone";
  const result = await trainers().where(field, "==", normalized).limit(1).get();
  return result.empty ? null : { id: result.docs[0].id, ...result.docs[0].data() };
}

export async function listTrainers() {
  const result = await trainers().get();
  return result.docs.map((snapshot) => publicTrainer({ id: snapshot.id, ...snapshot.data() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveTrainer(input, id = null) {
  const previous = id ? await findTrainerById(id) : null;
  if (id && !previous) return null;
  const name = String(input.name ?? previous?.name ?? "").trim();
  const email = String(input.email ?? previous?.email ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? previous?.phone ?? "").replace(/\s+/g, "");
  const designation = String(input.designation ?? previous?.designation ?? "Trainer").trim();
  const password = String(input.password || "");
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw bad("Valid trainer name and email are required");
  if (phone && !/^\+?[0-9-]{7,20}$/.test(phone)) throw bad("Invalid phone number");
  if (!designation || designation.length > 120) throw bad("Invalid designation");
  if ((!previous || password) && password.length < 8) throw bad("Password must have at least 8 characters");
  for (const identifier of [email, phone].filter(Boolean)) {
    const trainer = await findTrainerByIdentifier(identifier);
    if (trainer && trainer.id !== id) throw bad("Email or phone already belongs to a trainer");
    if (await findMarketerByIdentifier(identifier)) throw bad("Email or phone already belongs to a marketer");
  }
  if (email === String(process.env.ADMIN_EMAIL || "admin@portal.com").toLowerCase()) throw bad("Email belongs to admin");
  const record = {
    name, email, phone, designation, active: input.active === undefined ? previous?.active !== false : input.active === true,
    passwordHash: password ? await bcrypt.hash(password, 12) : previous.passwordHash,
    createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  const trainerId = id || randomUUID();
  await trainers().doc(trainerId).set(record);
  return publicTrainer({ id: trainerId, ...record });
}
