import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

export function useMediaTrash({ user, reports, fetchAllReports, fetchMarketerReports, fetchAttendanceRecords, fetchDeletedMedia, getMarketerName }) {
const [fullScreenImage, setFullScreenImage] = useState(null);
const [mediaMarketer, setMediaMarketer] = useState(null);
const [selectedMediaIds, setSelectedMediaIds] = useState([]);
const [selectedDeletedMediaIds, setSelectedDeletedMediaIds] = useState([]);
const [deletedMedia, setDeletedMedia] = useState([]);
const [mediaView, setMediaView] = useState("active");
const [fullScreenMediaRecord, setFullScreenMediaRecord] = useState(null);
const softDeleteMedia = async (report) => {
if (!report?.image) return;
if (!window.confirm("Delete this picture? It will move to Recently Deleted.")) return;
try {
await addDoc(collection(db, "deleted_media"), {
originalVisitId: report.id,
image: report.image,
schoolName: report.schoolName || "",
marketerEmail: report.marketerEmail || "",
marketerName: getMarketerName(report.marketerEmail, report.marketerName || ""),
principalName: report.principalName || "",
deletedAt: serverTimestamp()
});
await updateDoc(doc(db, "visits", report.id), { image: null });
setSelectedMediaIds(prev => prev.filter(id => id !== report.id));
await fetchAllReports(true);
await fetchDeletedMedia();
} catch (err) { alert("Error deleting media: " + err.message); }
};
const bulkDeleteMedia = async (reportsToDelete) => {
const list = reportsToDelete.filter(r => r?.image);
if (!list.length) return;
if (!window.confirm(`Delete ${list.length} picture(s)? They will move to Recently Deleted.`)) return;
try {
for (const report of list) {
await addDoc(collection(db, "deleted_media"), {
originalVisitId: report.id, image: report.image, schoolName: report.schoolName || "",
marketerEmail: report.marketerEmail || "", marketerName: getMarketerName(report.marketerEmail, report.marketerName || ""), principalName: report.principalName || "", deletedAt: serverTimestamp()
});
await updateDoc(doc(db, "visits", report.id), { image: null });
}
setSelectedMediaIds([]);
await fetchAllReports(true);
await fetchDeletedMedia();
alert("Selected media moved to Recently Deleted.");
} catch (err) { alert("Error deleting media: " + err.message); }
};
const restoreMedia = async (item) => {
try {
if (!item?.image) return;
if (item.mediaType === "attendance" && item.attendanceDocId && item.attendanceField) {
await updateDoc(doc(db, "attendance", item.attendanceDocId), { [item.attendanceField]: item.image });
await deleteDoc(doc(db, "deleted_media", item.id));
await Promise.all([fetchAttendanceRecords(true), fetchDeletedMedia()]);
return;
}
if (!item.originalVisitId) return;
await updateDoc(doc(db, "visits", item.originalVisitId), { image: item.image });
await deleteDoc(doc(db, "deleted_media", item.id));
await Promise.all([fetchAllReports(true), fetchDeletedMedia()]);
} catch (err) { alert("Error restoring media: " + err.message); }
};
const restoreSelectedMedia = async () => {
const selected = deletedMedia.filter((item) => selectedDeletedMediaIds.includes(item.id));
if (!selected.length) {
alert("Please select at least one deleted picture to restore.");
return;
}
if (!window.confirm(`Restore ${selected.length} selected picture(s)?`)) return;
try {
for (const item of selected) {
if (!item?.image) continue;
if (item.mediaType === "attendance" && item.attendanceDocId && item.attendanceField) {
await updateDoc(doc(db, "attendance", item.attendanceDocId), { [item.attendanceField]: item.image });
await deleteDoc(doc(db, "deleted_media", item.id));
continue;
}
if (item.originalVisitId) {
await updateDoc(doc(db, "visits", item.originalVisitId), { image: item.image });
await deleteDoc(doc(db, "deleted_media", item.id));
}
}
setSelectedDeletedMediaIds([]);
await Promise.all([fetchAllReports(true), fetchAttendanceRecords(true), fetchDeletedMedia()]);
alert(`${selected.length} picture(s) restored successfully.`);
} catch (err) {
alert("Error restoring selected media: " + err.message);
}
};
const permanentlyDeleteMedia = async (item) => {
if (!window.confirm("Permanently delete this picture? This cannot be undone.")) return;
try {
await deleteDoc(doc(db, "deleted_media", item.id));
await fetchDeletedMedia();
} catch (err) { alert("Error permanently deleting media: " + err.message); }
};
const permanentlyDeleteAllMedia = async () => {
if (!deletedMedia.length) return;
if (!window.confirm(`Permanently delete all ${deletedMedia.length} recently deleted picture(s)?`)) return;
try {
for (const item of deletedMedia) await deleteDoc(doc(db, "deleted_media", item.id));
await fetchDeletedMedia();
} catch (err) { alert("Error clearing recently deleted media: " + err.message); }
};
const handleDeletePicture = async (id, isAdmin = false) => {
if (isAdmin) {
const report = reports.find(r => r.id === id);
if (report) {
if (!window.confirm("Delete this picture? It will move to Recently Deleted.")) return;
await softDeleteMedia(report);
}
return;
}
if (window.confirm("Are you sure you want to delete only this picture?")) {
try {
await updateDoc(doc(db, "visits", id), { image: null });
fetchMarketerReports(user.email, true);
alert("Picture deleted successfully.");
} catch (err) { alert("Error deleting picture: " + err.message); }
}
};
return { fullScreenImage, setFullScreenImage, mediaMarketer, setMediaMarketer, selectedMediaIds, setSelectedMediaIds, selectedDeletedMediaIds, setSelectedDeletedMediaIds, deletedMedia, setDeletedMedia, mediaView, setMediaView, fullScreenMediaRecord, setFullScreenMediaRecord, softDeleteMedia, bulkDeleteMedia, restoreMedia, restoreSelectedMedia, permanentlyDeleteMedia, permanentlyDeleteAllMedia, handleDeletePicture };
}
