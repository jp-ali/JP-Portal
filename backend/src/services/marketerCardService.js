import { readFileSync } from "node:fs";
import { firestore } from "../config/firebase.js";

const image = `data:image/jpeg;base64,${readFileSync(new URL("../../assets/card-blank-template.jpg", import.meta.url)).toString("base64")}`;
const fields = [
  { id: "depotName", label: "Book depot name", x: 50, y: 14, fontSize: 100, color: "#242424", align: "center", bold: true },
  { id: "name", label: "Name", x: 8.5, y: 24, fontSize: 68, color: "#242424", align: "left", bold: false },
  { id: "designation", label: "Designation", x: 8.5, y: 33, fontSize: 45, color: "#555555", align: "left", bold: false },
  { id: "assignedCity", label: "City", x: 8.5, y: 41, fontSize: 45, color: "#555555", align: "left", bold: false },
  { id: "phone", label: "Phone", x: 13.2, y: 67, fontSize: 42, color: "#242424", align: "left", bold: false },
  { id: "email", label: "Email", x: 13.2, y: 76.5, fontSize: 42, color: "#242424", align: "left", bold: false },
  { id: "website", label: "Website", x: 64.5, y: 76.5, fontSize: 42, color: "#242424", align: "left", bold: false },
  { id: "address", label: "Address", x: 13.2, y: 88.5, fontSize: 42, color: "#242424", align: "left", bold: false }
];

export async function assignedCityText(cityIds = []) {
  const ids = [...new Set(cityIds.filter(Boolean))];
  if (ids.length !== 1) return "";
  const snapshot = await firestore().collection("cities").doc(ids[0]).get();
  return String(snapshot.exists ? snapshot.data().name || ids[0] : ids[0]).slice(0, 500);
}

export function alignLegacyCardFields(cardFields = []) {
  const oldY = { phone: 65.5, email: 75, website: 75, address: 87 };
  return cardFields.map((field) => oldY[field.id] === field.y
    ? { ...field, y: fields.find((item) => item.id === field.id).y }
    : field);
}

export function alignMarketerHeaderFields(cardFields = []) {
  const previous = { depotName: 24, name: 33, designation: 41, assignedCity: 47 };
  return cardFields.map((field) => {
    const next = fields.find((item) => item.id === field.id);
    if (field.id === "depotName" && field.x === 50 && field.y === 14 && [50, 55, 60].includes(field.fontSize)) {
      return { ...field, fontSize: next.fontSize };
    }
    if (!next || field.x !== 8.5 || field.y !== previous[field.id]) return field;
    return { ...field, x: next.x, y: next.y, fontSize: next.fontSize, align: next.align, bold: next.bold };
  });
}

export function defaultMarketerCard(marketerId, marketer, now = new Date().toISOString()) {
  return {
    marketerId,
    image,
    imageWidth: 1657,
    imageHeight: 949,
    widthMm: 85.6,
    fields: fields.map((field) => ({ ...field })),
    values: {
      depotName: "JAVED PUBLISHERS",
      name: marketer.name || "Marketer",
      designation: marketer.designation || "Marketing Coordinator",
      assignedCity: marketer.assignedCity || "",
      phone: marketer.phone || "",
      email: marketer.email || "",
      website: "javedpublishers.com",
      address: "Main outfall road, sanint nagar, Lahore, Punjab"
    },
    title: `${marketer.name || "Marketer"} Card`,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}

export function syncMarketerCard(card, marketer, now = new Date().toISOString()) {
  return {
    title: `${marketer.name || "Marketer"} Card`,
    values: {
      ...card.values,
      name: marketer.name || card.values?.name || "Marketer",
      phone: marketer.phone || card.values?.phone || "",
      email: marketer.email || card.values?.email || "",
      designation: marketer.designation || card.values?.designation || "Marketing Coordinator",
      assignedCity: card.manualCardCity || marketer.assignedCity || ""
    },
    updatedAt: now
  };
}

export async function getOrCreateMarketerCard(marketerId) {
  const db = firestore();
  const marketerRef = db.collection("marketers").doc(marketerId);
  const cardRef = db.collection("savedCards").doc(marketerId);
  const [marketerSnapshot, cardSnapshot] = await Promise.all([marketerRef.get(), cardRef.get()]);
  if (!marketerSnapshot.exists) return null;
  let result;
  if (cardSnapshot.exists) {
    result = cardSnapshot.data().deletedAt ? null : { id: cardSnapshot.id, ...cardSnapshot.data() };
  } else if (!marketerSnapshot.data().cardProvisionedAt) {
    result = await db.runTransaction(async (transaction) => {
      const [marketer, card] = await Promise.all([transaction.get(marketerRef), transaction.get(cardRef)]);
      if (!marketer.exists) return null;
      if (card.exists) return card.data().deletedAt ? null : { id: card.id, ...card.data() };
      if (marketer.data().cardProvisionedAt) return null;
      const now = new Date().toISOString();
      const created = defaultMarketerCard(marketerId, marketer.data(), now);
      transaction.set(cardRef, created);
      transaction.update(marketerRef, { cardProvisionedAt: now });
      return { id: cardRef.id, ...created };
    });
  }
  if (!result) return null;
  const cityIds = [...new Set((marketerSnapshot.data().assignedCityIds || []).filter(Boolean))];
  const cityIdsUnchanged = JSON.stringify(cityIds) === JSON.stringify(result.syncedAssignedCityIds);
  const city = (result.manualCardCity || cityIdsUnchanged)
    ? result.values?.assignedCity || ""
    : await assignedCityText(cityIds);
  const additions = {};
  const updatedFields = alignMarketerHeaderFields(alignLegacyCardFields((result.fields || []).map((field) => field.id === "assignedArea" ? { ...field, id: "assignedCity", label: "City" } : field)));
  if (!updatedFields.some((field) => field.id === "assignedCity")) updatedFields.push({ ...fields.find((field) => field.id === "assignedCity") });
  if (JSON.stringify(updatedFields) !== JSON.stringify(result.fields)) additions.fields = updatedFields;
  const updatedValues = { ...result.values, depotName: "JAVED PUBLISHERS", assignedCity: result.manualCardCity || city };
  delete updatedValues.assignedArea;
  if (JSON.stringify(updatedValues) !== JSON.stringify(result.values)) additions.values = updatedValues;
  if (!cityIdsUnchanged) additions.syncedAssignedCityIds = cityIds;
  if (Object.keys(additions).length) {
    await cardRef.update(additions);
    return { ...result, ...additions };
  }
  return result;
}

export function defaultAdminCard(now = new Date().toISOString()) {
  const { marketerId, ...card } = defaultMarketerCard("", {
    name: "Muhammad Ali Ashfaq",
    designation: "Marketing Coordinator",
    phone: "+92-3068482000",
    email: "info@javedpublishers.com"
  }, now);
  const adminHeader = { depotName: { x: 8.5, y: 24, fontSize: 68, align: "left", bold: false }, name: { x: 8.5, y: 33, fontSize: 58, align: "left", bold: false }, designation: { x: 8.5, y: 41 }, assignedCity: { x: 8.5, y: 47 } };
  return { ...card, title: "Admin Card", fields: card.fields.map((field) => ({ ...field, ...adminHeader[field.id] })), values: { ...card.values, depotName: "Muhammad Ali Ashfaq", name: "", assignedCity: "" } };
}

export function lockMarketerCard(original, incoming) {
  return {
    ...incoming,
    image: original.image,
    imageWidth: original.imageWidth,
    imageHeight: original.imageHeight,
    widthMm: original.widthMm,
    fields: original.fields.map((field) => {
      const moved = incoming.fields.find((item) => item.id === field.id);
      return moved ? { ...field, x: moved.x, y: moved.y } : field;
    }),
    values: { ...original.values, assignedCity: String(incoming.values?.assignedCity ?? original.values?.assignedCity ?? "") },
    manualCardCity: String(incoming.values?.assignedCity ?? original.values?.assignedCity ?? "") !== String(original.values?.assignedCity ?? "")
      ? String(incoming.values.assignedCity).trim()
      : original.manualCardCity || "",
    title: original.title
  };
}
