import { readFileSync } from "node:fs";
import { firestore } from "../config/firebase.js";

const image = `data:image/jpeg;base64,${readFileSync(new URL("../../assets/card-blank-template.jpg", import.meta.url)).toString("base64")}`;
const fields = [
  { id: "depotName", label: "Book depot name", x: 8.5, y: 24, fontSize: 68, color: "#242424", align: "left", bold: false },
  { id: "name", label: "Name", x: 8.5, y: 33, fontSize: 58, color: "#242424", align: "left", bold: false },
  { id: "designation", label: "Designation", x: 8.5, y: 41, fontSize: 45, color: "#555555", align: "left", bold: false },
  { id: "phone", label: "Phone", x: 13.2, y: 65.5, fontSize: 42, color: "#242424", align: "left", bold: false },
  { id: "email", label: "Email", x: 13.2, y: 75, fontSize: 42, color: "#242424", align: "left", bold: false },
  { id: "website", label: "Website", x: 64.5, y: 75, fontSize: 42, color: "#242424", align: "left", bold: false },
  { id: "address", label: "Address", x: 13.2, y: 87, fontSize: 42, color: "#242424", align: "left", bold: false }
];

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
      designation: marketer.designation || card.values?.designation || "Marketing Coordinator"
    },
    updatedAt: now
  };
}

export async function getOrCreateMarketerCard(marketerId) {
  const db = firestore();
  const marketerRef = db.collection("marketers").doc(marketerId);
  const cardRef = db.collection("savedCards").doc(marketerId);
  return db.runTransaction(async (transaction) => {
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
