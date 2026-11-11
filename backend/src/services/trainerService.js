import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { portalStore } from "../config/portalStore.js";
import { findMarketerByIdentifier } from "../models/marketerModel.js";
import { currentCompany, companyContext } from './companyContext.js';

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

export async function updateTrainerProfilePhoto(id, photo) {
  if (photo !== null && (typeof photo !== "string" || photo.length > 200000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))) throw bad("Invalid profile photo. Upload a JPEG image under 150 KB.");
  const trainer = await findTrainerById(id);
  if (!trainer || trainer.deletedAt || trainer.active === false) return null;
  await trainers().doc(id).update({ profilePhoto: photo, updatedAt: new Date().toISOString() });
  return photo;
}

export async function findTrainerByIdentifier(identifier) {
  const normalized = String(identifier || "").trim().toLowerCase();
  const field = normalized.includes("@") ? "email" : "phone";
  const result = await trainers().where(field, "==", normalized).limit(1).get();
  return result.empty ? null : { id: result.docs[0].id, ...result.docs[0].data() };
}

export async function listTrainers({ archived = false } = {}) {
  const result = await trainers().get();
  return result.docs.map((snapshot) => publicTrainer({ id: snapshot.id, ...snapshot.data() }))
    .filter((trainer) => Boolean(trainer.deletedAt) === archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function setTrainerArchived(id, archived) {
  const trainer = await findTrainerById(id);
  if (!trainer || Boolean(trainer.deletedAt) === archived) return null;
  const updatedAt = new Date().toISOString();
  const changes = archived
    ? { deletedAt: updatedAt, active: false, activeBeforeArchive: trainer.active !== false, updatedAt }
    : { deletedAt: null, active: trainer.activeBeforeArchive !== false, activeBeforeArchive: null, updatedAt };
  await trainers().doc(id).update(changes);
  return publicTrainer({ ...trainer, ...changes });
}

export async function saveTrainer(input, id = null) {
  const previous = id ? await findTrainerById(id) : null;
  if (id && (!previous || previous.deletedAt)) return null;
  const name = String(input.name ?? previous?.name ?? "").trim();
  const email = String(input.email ?? previous?.email ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? previous?.phone ?? "").replace(/\s+/g, "");
  const designation = String(input.designation ?? previous?.designation ?? "Trainer").trim();
  const offlineMode = input.offlineMode === undefined ? previous?.offlineMode || "trainer" : input.offlineMode;
  const password = String(input.password || "");
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw bad("Valid trainer name and email are required");
  if (phone && !/^\+?[0-9-]{7,20}$/.test(phone)) throw bad("Invalid phone number");
  if (!designation || designation.length > 120) throw bad("Invalid designation");
  if (!["trainer", "none"].includes(offlineMode)) throw bad("Invalid trainer offline mode");
  if ((!previous || password) && password.length < 8) throw bad("Password must have at least 8 characters");
  for (const identifier of [email, phone].filter(Boolean)) {
    const trainer = await findTrainerByIdentifier(identifier);
    if (trainer && trainer.id !== id) throw bad("Email or phone already belongs to a trainer");
    if (await findMarketerByIdentifier(identifier)) throw bad("Email or phone already belongs to a marketer");
  }
  const adminEmail = companyContext.getStore()?.admin?.email || (currentCompany().id === 'javed' ? process.env.ADMIN_EMAIL || 'admin@portal.com' : '');
  if (email === adminEmail.toLowerCase()) throw bad("Email belongs to admin");
  const record = {
    name, email, phone, designation, offlineMode, active: input.active === undefined ? previous?.active !== false : input.active === true,
    profilePhoto: previous?.profilePhoto || null,
    passwordHash: password ? await bcrypt.hash(password, 12) : previous.passwordHash,
    createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  const trainerId = id || randomUUID();
  await trainers().doc(trainerId).set(record);
  return publicTrainer({ id: trainerId, ...record });
}
