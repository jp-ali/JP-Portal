import { request } from "./authApi.js";

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
const safeName = (value) => String(value || "photo").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 70);

export async function downloadTrainerPhotoArchive(items, filename) {
  if (!items.length) return;
  const { zipSync } = await import("fflate");
  const files = {};
  for (const item of items) {
    let bytes;
    let mime;
    if (item.type === "visit") {
      const response = await fetch(`${apiBase}/trainers/visits/${encodeURIComponent(item.id)}/photo`, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Could not download the photo for ${item.name || "a visit"}.`);
      mime = response.headers.get("content-type");
      bytes = new Uint8Array(await response.arrayBuffer());
    } else {
      const { proof } = await request(`/trainers/expenses/${encodeURIComponent(item.id)}/proof`);
      const base64 = String(proof || "").split(",")[1];
      if (!base64) throw new Error(`Could not download the proof for ${item.name || "an expense"}.`);
      mime = String(proof).split(",")[0];
      bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    }
    const extension = /image\/png/i.test(mime) ? "png" : /image\/webp/i.test(mime) ? "webp" : "jpg";
    files[`${safeName(item.name)}_${safeName(item.date)}_${safeName(item.id)}.${extension}`] = bytes;
  }
  const url = URL.createObjectURL(new Blob([zipSync(files, { level: 0 })], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
