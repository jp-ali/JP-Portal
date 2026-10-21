import { Router } from "express";
import { firestore } from "../config/firebase.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateCardTemplate } from "./cardTemplateRoutes.js";

export const cardRoutes = Router();
cardRoutes.use(requireAuth, requireAdmin);
const cards = () => firestore().collection("savedCards");
const summary = (snapshot) => {
  const { image, ...data } = snapshot.data();
  return { id: snapshot.id, ...data };
};

function validateCard(body) {
  const template = validateCardTemplate(body?.template);
  const values = body?.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Card details are required.");
  const cleaned = {};
  for (const field of template.fields) {
    const value = values[field.id] ?? "";
    if (typeof value !== "string" || value.length > 500) throw new Error(`Invalid ${field.label} text.`);
    cleaned[field.id] = value;
  }
  const title = String(values.depotName || values.name || "Untitled card").trim().slice(0, 100);
  return { ...template, values: cleaned, title };
}

cardRoutes.get("/", async (_request, response, next) => {
  try { response.json({ cards: (await cards().get()).docs.map(summary).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))) }); }
  catch (error) { next(error); }
});

cardRoutes.post("/", async (request, response, next) => {
  try {
    let data;
    try { data = validateCard(request.body); } catch (error) { return response.status(400).json({ error: error.message }); }
    const now = new Date().toISOString();
    const doc = await cards().add({ ...data, createdAt: now, updatedAt: now, deletedAt: null });
    response.status(201).json({ card: { id: doc.id, ...data, createdAt: now, updatedAt: now, deletedAt: null } });
  } catch (error) { next(error); }
});

cardRoutes.get("/:id", async (request, response, next) => {
  try {
    const snapshot = await cards().doc(request.params.id).get();
    if (!snapshot.exists) return response.status(404).json({ error: "Card not found" });
    response.json({ card: { id: snapshot.id, ...snapshot.data() } });
  } catch (error) { next(error); }
});

cardRoutes.put("/:id", async (request, response, next) => {
  try {
    let data;
    try { data = validateCard(request.body); } catch (error) { return response.status(400).json({ error: error.message }); }
    const ref = cards().doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data().deletedAt) return response.status(404).json({ error: "Active card not found" });
    const updatedAt = new Date().toISOString();
    await ref.update({ ...data, updatedAt });
    response.json({ card: { id: ref.id, ...snapshot.data(), ...data, updatedAt } });
  } catch (error) { next(error); }
});

cardRoutes.delete("/:id", async (request, response, next) => {
  try {
    const ref = cards().doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data().deletedAt) return response.status(404).json({ error: "Active card not found" });
    await ref.update({ deletedAt: new Date().toISOString() });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

cardRoutes.post("/:id/restore", async (request, response, next) => {
  try {
    const ref = cards().doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists || !snapshot.data().deletedAt) return response.status(404).json({ error: "Deleted card not found" });
    await ref.update({ deletedAt: null, updatedAt: new Date().toISOString() });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

cardRoutes.delete("/:id/permanent", async (request, response, next) => {
  try {
    const ref = cards().doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists || !snapshot.data().deletedAt) return response.status(404).json({ error: "Deleted card not found" });
    await ref.delete();
    response.json({ ok: true });
  } catch (error) { next(error); }
});
