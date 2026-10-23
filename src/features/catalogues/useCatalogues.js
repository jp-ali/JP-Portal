import { confirmAction, showNotice as alert } from "../../ui/confirmDialog.js";
import { useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../../services/firebase";

export function useCatalogues(user) {
const [catalogues, setCatalogues] = useState([]);
const [catalogueTitle, setCatalogueTitle] = useState("");
const [catalogueFile, setCatalogueFile] = useState(null);
const [catalogueUploading, setCatalogueUploading] = useState(false);
const [catalogueUploadProgress, setCatalogueUploadProgress] = useState(0);
const [catalogueLoading, setCatalogueLoading] = useState(false);
const [catalogueActionId, setCatalogueActionId] = useState("");
const [catalogueSearch, setCatalogueSearch] = useState("");
const catalogueFileInputRef = useRef(null);
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

const bytesToBase64 = (bytes) => {
let binary = "";
const STEP = 0x8000;
for (let i = 0; i < bytes.length; i += STEP) {
binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + STEP, bytes.length)));
}
return btoa(binary);
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
alert("Only admin can upload catalogues.");
return;
}
const title = catalogueTitle.trim();
const file = catalogueFile;
if (!title) {
alert("Please enter catalogue title.");
return;
}
if (!file) {
alert("Please select a PDF catalogue.");
return;
}
const isPdf = file.type === "application/pdf" || String(file.name || "").toLowerCase().endsWith(".pdf");
if (!isPdf) {
alert("Only PDF files can be uploaded in Catalogues.");
return;
}
if (!file.size) {
alert("The selected PDF is empty.");
return;
}
setCatalogueUploading(true);
setCatalogueUploadProgress(0);
const catalogueRef = doc(collection(db, "catalogues"));
const createdChunkRefs = [];
try {
const buffer = await file.arrayBuffer();
const bytes = new Uint8Array(buffer);
const RAW_CHUNK_SIZE = 480 * 1024;
const chunkCount = Math.ceil(bytes.length / RAW_CHUNK_SIZE);
for (let index = 0; index < chunkCount; index++) {
const start = index * RAW_CHUNK_SIZE;
const end = Math.min(start + RAW_CHUNK_SIZE, bytes.length);
const chunkRef = doc(db, "catalogues", catalogueRef.id, "chunks", String(index).padStart(5, "0"));
createdChunkRefs.push(chunkRef);
await setDoc(chunkRef, {
index,
data: bytesToBase64(bytes.subarray(start, end))
});
setCatalogueUploadProgress(Math.round(((index + 1) / chunkCount) * 100));
}
await setDoc(catalogueRef, {
title,
fileName: file.name || `${title}.pdf`,
fileSize: file.size,
mimeType: "application/pdf",
chunkCount,
status: "ready",
uploadedBy: user?.email || "admin",
uploadedByName: user?.name || "Admin",
uploadedAt: serverTimestamp()
});
setCatalogueTitle("");
setCatalogueFile(null);
if (catalogueFileInputRef.current) catalogueFileInputRef.current.value = "";
await fetchCatalogues();
alert("Catalogue uploaded successfully.");
} catch (err) {
console.error("Catalogue upload error:", err);
for (const refItem of createdChunkRefs) {
try { await deleteDoc(refItem); } catch (_) {}
}
try { await deleteDoc(catalogueRef); } catch (_) {}
alert("Catalogue could not be uploaded: " + err.message);
} finally {
setCatalogueUploading(false);
setCatalogueUploadProgress(0);
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
const chunkSnap = await getDocs(collection(db, "catalogues", catalogue.id, "chunks"));
const refs = chunkSnap.docs.map((d) => d.ref);
for (let start = 0; start < refs.length; start += 400) {
const batch = writeBatch(db);
refs.slice(start, start + 400).forEach((refItem) => batch.delete(refItem));
await batch.commit();
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

return { catalogues, catalogueTitle, setCatalogueTitle, catalogueFile, setCatalogueFile, catalogueUploading, catalogueUploadProgress, catalogueLoading, catalogueActionId, catalogueSearch, setCatalogueSearch, catalogueFileInputRef, fetchCatalogues, formatCatalogueFileSize, handleUploadCatalogue, viewCatalogue, downloadCatalogue, deleteCatalogue, getFilteredCatalogues };
}
