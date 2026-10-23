import { showNotice as alert } from "../ui/confirmDialog.js";
let pendingExcel;

export async function ensureExcelReady() {
  if (window.XLSX) return window.XLSX;
  if (!pendingExcel) {
    pendingExcel = import("xlsx-js-style")
      .then(({ default: XLSX }) => {
        window.XLSX = XLSX;
        return XLSX;
      })
      .catch((error) => {
        pendingExcel = null;
        console.error("Excel exporter could not load:", error);
        alert("Excel exporter could not load. Check your connection and try again.");
        return null;
      });
  }
  return pendingExcel;
}
