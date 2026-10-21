import { Router } from "express";
import { firestore } from "../config/firebase.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const cardTemplateRoutes = Router();
cardTemplateRoutes.use(requireAuth, requireAdmin);

const template = () => firestore().collection("cardTemplates").doc("admin-default");
const validColor = (value) => /^#[0-9a-fA-F]{6}$/.test(value);

export function validateCardTemplate(body) {
  const { image, imageWidth, imageHeight, widthMm, fields } = body || {};
  if (typeof image !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length > 750000) {
    throw new Error("Upload a JPEG card image under 550 KB.");
  }
  if (![imageWidth, imageHeight].every((value) => Number.isInteger(value) && value >= 100 && value <= 5000)) throw new Error("Invalid card image dimensions.");
  if (!Number.isFinite(widthMm) || widthMm < 30 || widthMm > 300) throw new Error("Invalid card print width.");
  if (!Array.isArray(fields) || fields.length > 25) throw new Error("Too many card fields.");
  const cleaned = fields.map((field) => {
    const { id, label, x, y, fontSize, color, align, bold } = field || {};
    if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,50}$/.test(id)
      || typeof label !== "string" || !label.trim() || label.length > 60
      || !Number.isFinite(x) || x < 0 || x > 100
      || !Number.isFinite(y) || y < 0 || y > 100
      || !Number.isFinite(fontSize) || fontSize < 8 || fontSize > 200
      || !validColor(color) || !["left", "center", "right"].includes(align)
      || typeof bold !== "boolean") throw new Error("Invalid card field settings.");
    return { id, label: label.trim(), x, y, fontSize, color, align, bold };
  });
  if (new Set(cleaned.map((field) => field.id)).size !== cleaned.length) throw new Error("Duplicate card fields.");
  return { image, imageWidth, imageHeight, widthMm, fields: cleaned };
}

cardTemplateRoutes.get("/", async (_request, response, next) => {
  try {
    const snapshot = await template().get();
    response.json({ template: snapshot.exists ? snapshot.data() : null });
  } catch (error) { next(error); }
});

cardTemplateRoutes.put("/", async (request, response, next) => {
  try {
    let data;
    try { data = validateCardTemplate(request.body); }
    catch (error) { return response.status(400).json({ error: error.message }); }
    const saved = { ...data, updatedAt: new Date().toISOString() };
    await template().set(saved);
    response.json({ template: saved });
  } catch (error) { next(error); }
});
