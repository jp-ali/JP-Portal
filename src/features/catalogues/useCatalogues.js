import { confirmAction, showNotice as alert } from "../../ui/confirmDialog.js";
import { useState } from "react";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, writeBatch } from "../../services/dataGateway.js";
import { db } from "../../services/dataGateway.js";

export function useCatalogues(user) {
const [catalogues, setCatalogues] = useState([]);
const [catalogueTitle, setCatalogueTitle] = useState("");
const [catalogueLink, setCatalogueLink] = useState("");
const [catalogueUploading, setCatalogueUploading] = useState(false);
const [catalogueLoading, setCatalogueLoading] = useState(false);
const [catalogueActionId, setCatalogueActionId] = useState("");
const [catalogueSearch, setCatalogueSearch] = useState("");
const fetchCatalogues = async () => {
setCatalogueLoading(true);
try {
const snap = await getDocs(collection(db, "catalogues"));
const list = snap.docs
.map((d) => ({ id: d.id, ...d.data() }))
.filter((item) => item.status !== "deleted")
.sort((a, b) => {
const ta = a.uploadedAt?.toMillis ? a.uploadedAt.toMillis() : 0;
const tb = b.uploadedAt?.toMillis ? b.uploadedAt.toMillis() : 0;
return tb - ta || String(a.title || "").localeCompare(String(b.title || ""));
});
setCatalogues(list);
return list;
} catch (err) {
console.error("Catalogues fetch error:", err);
alert("Catalogues could not be loaded: " + err.message);
return [];
} finally {
setCatalogueLoading(false);
}
};

const formatCatalogueFileSize = (bytes) => {
const n = Number(bytes || 0);
if (!Number.isFinite(n) || n <= 0) return "0 KB";
if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
return `${(n / (1024 * 1024)).toFixed(n >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
};

const base64ToBytes = (value) => {
const binary = atob(String(value || ""));
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
return bytes;
};

const handleUploadCatalogue = async (event) => {
event?.preventDefault?.();
if (user?.role !== "admin") {
alert("Only admin can add catalogues.");
return;
}
const title = catalogueTitle.trim();
if (!title) {
alert("Please enter catalogue title.");
return;
}
let sourceUrl;
try {
sourceUrl = new URL(catalogueLink.trim());
if (sourceUrl.protocol !== "https:") throw new Error("HTTPS is required");
} catch {
alert("Enter a valid HTTPS catalogue link, such as a Dropbox share link.");
return;
}
setCatalogueUploading(true);
const catalogueRef = doc(collection(db, "catalogues"));
try {
const pathName = decodeURIComponent(sourceUrl.pathname.split("/").filter(Boolean).pop() || "");
const fileName = /\.pdf$/i.test(pathName) ? pathName : `${title}.pdf`;
await setDoc(catalogueRef, {
title,
fileName,
sourceUrl: sourceUrl.href,
sourceType: "link",
mimeType: "application/pdf",
status: "ready",
uploadedBy: user?.email || "admin",
uploadedByName: user?.name || "Admin",
uploadedAt: serverTimestamp()
});
setCatalogueTitle("");
setCatalogueLink("");
await fetchCatalogues();
alert("Catalogue link added successfully.");
} catch (err) {
console.error("Catalogue link error:", err);
alert("Catalogue link could not be added: " + err.message);
} finally {
setCatalogueUploading(false);
}
};

const openCatalogueLink = (catalogue) => {
try {
const url = new URL(catalogue.sourceUrl);
if (url.protocol !== "https:") throw new Error("Invalid catalogue link.");
window.open(url.href, "_blank", "noopener,noreferrer");
} catch {
alert("This catalogue link is invalid. Ask admin to update it.");
}
};

const buildCatalogueBlob = async (catalogue) => {
if (!catalogue?.id) throw new Error("Catalogue record not found.");
const snap = await getDocs(collection(db, "catalogues", catalogue.id, "chunks"));
const chunks = snap.docs
.map((d) => d.data())
.filter((item) => Number.isFinite(Number(item.index)) && item.data)
.sort((a, b) => Number(a.index) - Number(b.index));
if (!chunks.length) throw new Error("Catalogue PDF data is missing.");
if (catalogue.chunkCount && chunks.length !== Number(catalogue.chunkCount)) {
throw new Error("Catalogue PDF is incomplete. Please ask admin to upload it again.");
}
return new Blob(chunks.map((item) => base64ToBytes(item.data)), { type: "application/pdf" });
};

const viewCatalogue = async (catalogue) => {
if (catalogue?.sourceUrl) { openCatalogueLink(catalogue); return; }
const popup = window.open("", "_blank");
if (popup) {
try {
popup.opener = null;
popup.document.title = "Loading catalogue...";
popup.document.body.innerHTML = '<div style="font-family:Arial,sans-serif;padding:24px;color:#6f0b24;font-weight:700">Loading catalogue...</div>';
} catch (_) {}
}
setCatalogueActionId(`view:${catalogue?.id || ""}`);
try {
const blob = await buildCatalogueBlob(catalogue);
const url = URL.createObjectURL(blob);
if (popup) popup.location.href = url;
else {
const a = document.createElement("a");
a.href = url;
a.target = "_blank";
a.rel = "noopener noreferrer";
document.body.appendChild(a);
a.click();
a.remove();
}
setTimeout(() => URL.revokeObjectURL(url), 120000);
} catch (err) {
if (popup) popup.close();
alert("Catalogue could not be opened: " + err.message);
} finally {
setCatalogueActionId("");
}
};

const downloadCatalogue = async (catalogue) => {
if (catalogue?.sourceUrl) { openCatalogueLink(catalogue); return; }
setCatalogueActionId(`download:${catalogue?.id || ""}`);
try {
const blob = await buildCatalogueBlob(catalogue);
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = catalogue?.fileName || `${catalogue?.title || "Catalogue"}.pdf`;
a.style.display = "none";
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 3000);
} catch (err) {
alert("Catalogue could not be downloaded: " + err.message);
} finally {
setCatalogueActionId("");
}
};

const deleteCatalogue = async (catalogue) => {
if (user?.role !== "admin") {
alert("Only admin can delete catalogues.");
return;
}
if (!catalogue?.id) return;
if (!await confirmAction(`Delete catalogue \"${catalogue.title || catalogue.fileName || "Catalogue"}\"? Marketers will no longer be able to view or download it.`)) return;
setCatalogueActionId(`delete:${catalogue.id}`);
try {
if (!catalogue.sourceUrl) {
const chunkSnap = await getDocs(collection(db, "catalogues", catalogue.id, "chunks"));
const refs = chunkSnap.docs.map((d) => d.ref);
for (let start = 0; start < refs.length; start += 400) {
const batch = writeBatch(db);
refs.slice(start, start + 400).forEach((refItem) => batch.delete(refItem));
await batch.commit();
}
}
await deleteDoc(doc(db, "catalogues", catalogue.id));
setCatalogues((prev) => prev.filter((item) => item.id !== catalogue.id));
} catch (err) {
console.error("Catalogue delete error:", err);
alert("Catalogue could not be deleted: " + err.message);
} finally {
setCatalogueActionId("");
}
};

const getFilteredCatalogues = () => {
  const q = catalogueSearch.trim().toLowerCase();
  if (!q) return catalogues;
  return catalogues.filter((item) =>
    String(item.title || "").toLowerCase().includes(q) ||
    String(item.fileName || "").toLowerCase().includes(q)
  );
};

return { catalogues, catalogueTitle, setCatalogueTitle, catalogueLink, setCatalogueLink, catalogueUploading, catalogueLoading, catalogueActionId, catalogueSearch, setCatalogueSearch, fetchCatalogues, formatCatalogueFileSize, handleUploadCatalogue, viewCatalogue, downloadCatalogue, deleteCatalogue, getFilteredCatalogues };
}
