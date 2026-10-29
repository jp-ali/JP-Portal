import { Router } from "express";
import { portalStore } from "../config/portalStore.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateCardTemplate } from "./cardTemplateRoutes.js";
import { convertCardsToCdr } from "../services/cardCdrExport.js";
import { alignLegacyCardFields, correctCardAddress, defaultAdminCard, getOrCreateMarketerCard, lockMarketerCard, PUBLISHER_CARD_EMAIL } from "../services/marketerCardService.js";

export const cardRoutes = Router();
cardRoutes.get("/me", requireAuth, async (request, response, next) => {
  if (request.user.role !== "marketer") return response.status(403).json({ error: "Marketer access required" });
  try { response.json({ card: await getOrCreateMarketerCard(request.user.marketerId) }); }
  catch (error) { next(error); }
});
cardRoutes.get("/admin-card", requireAuth, async (_request, response, next) => {
  try {
    const ref = portalStore().collection("savedCards").doc("admincard");
    const snapshot = await ref.get();
    if (snapshot.exists && !snapshot.data().deletedAt) {
      const card = snapshot.data();
      const fields = alignLegacyCardFields(card.fields || []);
      const values = { ...card.values, address: correctCardAddress(card.values?.address) };
      const updates = {};
      if (JSON.stringify(fields) !== JSON.stringify(card.fields)) updates.fields = fields;
      if (values.address !== card.values?.address) updates.values = values;
      if (Object.keys(updates).length) await ref.update(updates);
      return response.json({ card: { id: ref.id, ...card, fields, values } });
    }
    const card = defaultAdminCard();
    await ref.set(card);
    response.json({ card: { id: ref.id, ...card } });
  } catch (error) { next(error); }
});
cardRoutes.use(requireAuth, requireAdmin);
const cards = () => portalStore().collection("savedCards");
const summary = (snapshot) => {
  const { image, ...data } = snapshot.data();
  return { id: snapshot.id, ...data, values: { ...data.values, email: data.marketerId ? PUBLISHER_CARD_EMAIL : data.values?.email, address: correctCardAddress(data.values?.address) } };
};

export function validateCard(body) {
  const template = validateCardTemplate(body?.template);
  const values = body?.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Card details are required.");
  const cleaned = {};
  for (const field of template.fields) {
    const value = values[field.id] ?? "";
    if (typeof value !== "string" || value.length > 500) throw new Error(`Invalid ${field.label} text.`);
    cleaned[field.id] = field.id === "address" ? correctCardAddress(value) : field.id === "email" && body?.template?.marketerId ? PUBLISHER_CARD_EMAIL : value;
  }
  const title = String(values.depotName || values.name || "Untitled card").trim().slice(0, 100);
  return { ...template, values: cleaned, title };
}

cardRoutes.get("/", async (_request, response, next) => {
  try { response.json({ cards: (await cards().get()).docs.map(summary).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))) }); }
  catch (error) { next(error); }
});

cardRoutes.post("/export-cdr", async (request, response, next) => {
  try {
    let selected;
    if (Array.isArray(request.body?.ids)) {
      const ids = request.body.ids;
      if (!ids.length || ids.length > 20 || ids.some((id) => typeof id !== "string" || !/^[A-Za-z0-9]{1,128}$/.test(id))) {
        return response.status(400).json({ error: "Select 1 to 20 valid cards." });
      }
      const snapshots = await Promise.all(ids.map((id) => cards().doc(id).get()));
      if (snapshots.some((snapshot) => !snapshot.exists || snapshot.data().deletedAt)) return response.status(404).json({ error: "An active card was not found." });
      selected = snapshots.map((snapshot) => validateCard({ template: snapshot.data(), values: snapshot.data().values }));
    } else {
      selected = [validateCard(request.body)];
    }
    const file = await convertCardsToCdr(selected);
    const name = selected.length === 1 ? String(selected[0].title).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 55) || "Card" : "Cards-Corel-Sheet";
    response.set("Content-Type", "application/octet-stream");
    response.set("Content-Disposition", `attachment; filename="${name}.cdr"`);
    response.send(file);
  } catch (error) {
    if (error.message.startsWith("Invalid ") || error.message.startsWith("Upload ") || error.message.startsWith("Too many ") || error.message.startsWith("Duplicate ") || error.message === "Card details are required.") {
      return response.status(400).json({ error: error.message });
    }
    next(error);
  }
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
    if (snapshot.data().marketerId) {
      const card = await getOrCreateMarketerCard(snapshot.data().marketerId);
      return card ? response.json({ card }) : response.status(404).json({ error: "Card not found" });
    }
    const card = snapshot.data();
    response.json({ card: { id: snapshot.id, ...card, values: { ...card.values, address: correctCardAddress(card.values?.address) } } });
  } catch (error) { next(error); }
});

cardRoutes.put("/:id", async (request, response, next) => {
  try {
    let data;
    try { data = validateCard(request.body); } catch (error) { return response.status(400).json({ error: error.message }); }
    const ref = cards().doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data().deletedAt) return response.status(404).json({ error: "Active card not found" });
    if (snapshot.data().marketerId) data = lockMarketerCard(snapshot.data(), data);
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
