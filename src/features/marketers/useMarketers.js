import { confirmAction } from "../../ui/confirmDialog.js";
import { useRef, useState } from "react";
import { listMarketers, listDeletedMarketers, listAccessibleMarketers, createMarketer, updateMarketer, archiveMarketer, restoreMarketer, removeDeletedMarketer } from "../../services/marketerApi.js";

export function useMarketers({ user, fetchCitiesByIds, fetchAreasForCities, fetchLocationCatalog, getValidMarketerAssignments, resetMarketerAssignmentForm, setAdminView, setAssignedAreaIds, setAssignedCityIds, setAssignedSchoolIds, setAssignmentAreaFocusId, setAssignmentCityFocusId, setAdminAreaAssignOpen, setAdminAreaSearch, setAdminCityAssignOpen, setAdminCitySearch, setAdminSchoolSearch, setNewAreaName, setNewCityName, setNewSchoolName }) {
const [marketerName, setMarketerName] = useState("");
const [marketerPhone, setMarketerPhone] = useState("");
const [marketerEmail, setMarketerEmail] = useState("");
const [marketerPass, setMarketerPass] = useState("");
const [marketerDesignation, setMarketerDesignation] = useState("");
const [marketerAssignedKms, setMarketerAssignedKms] = useState("");
const [subordinateMarketerIds, setSubordinateMarketerIds] = useState([]);
const [subordinatePickerOpen, setSubordinatePickerOpen] = useState(false);
const [subordinateSearch, setSubordinateSearch] = useState("");
const [marketerWhatsappGroupName, setMarketerWhatsappGroupName] = useState("");
const [marketerWhatsappGroupLink, setMarketerWhatsappGroupLink] = useState("");
const [marketersList, setMarketersList] = useState([]);
const marketersCache = useRef({ rows: null, loadedAt: 0, pending: null });
const accessibleCache = useRef({ rows: null, loadedAt: 0, pending: null });
const [deletedMarketersList, setDeletedMarketersList] = useState([]);
const [editingId, setEditingId] = useState(null);
const [editingReturnToMarketerDetails, setEditingReturnToMarketerDetails] = useState(false);
const fetchMarketers = (force = false) => {
const cache = marketersCache.current;
if (!force && cache.rows && Date.now() - cache.loadedAt < 60000) return Promise.resolve(cache.rows);
if (cache.pending) return cache.pending;
cache.pending = (async () => {
try {
const list = await listMarketers();
cache.rows = list;
cache.loadedAt = Date.now();
setMarketersList(list);
const assignedCityIdsFromMarketers = [...new Set(
list.flatMap((m) => Array.isArray(m.assignedCityIds) ? m.assignedCityIds : [])
)];
if (assignedCityIdsFromMarketers.length) {
fetchCitiesByIds(assignedCityIdsFromMarketers).catch(() => {});
}
return list;
} catch (err) {
console.error(err);
return cache.rows || [];
} finally {
cache.pending = null;
}
})();
return cache.pending;
};
const fetchMarketersByIds = async (ids = []) => {
const uniqueIds = [...new Set((ids || []).filter(Boolean))];
if (!uniqueIds.length) {
setMarketersList([]);
return [];
}
try {
const allowed = new Set(uniqueIds);
const cache = accessibleCache.current;
if (!cache.rows || Date.now() - cache.loadedAt >= 30000) {
if (!cache.pending) cache.pending = listAccessibleMarketers().then((rows) => {
cache.rows = rows;
cache.loadedAt = Date.now();
return rows;
}).finally(() => { cache.pending = null; });
await cache.pending;
}
const rows = (cache.rows || []).filter((item) => allowed.has(item.id));
rows.sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || "")));
setMarketersList(rows);
return rows;
} catch (err) {
console.error("Accessible marketers fetch error:", err);
return [];
}
};
const getAccessibleVisitMarketers = () => {
if (user?.role !== "marketer") return [];
const allowedIds = [...new Set([user?.marketerId, ...(user?.subordinateMarketerIds || [])].filter(Boolean))];
const byId = new Map(marketersList.map((m) => [m.id, m]));
return allowedIds.map((id) => {
const found = byId.get(id);
if (found) return found;
if (id === user?.marketerId) return { id, name: user?.name || user?.email || "My Account", email: user?.email || "" };
return null;
}).filter(Boolean);
};
const fetchDeletedMarketers = async () => {
try {
const list = await listDeletedMarketers();
setDeletedMarketersList(list);
const assignedCityIds = [...new Set(list.flatMap((m) => Array.isArray(m.assignedCityIds) ? m.assignedCityIds : []))];
if (assignedCityIds.length) fetchCitiesByIds(assignedCityIds).catch(() => {});
return list;
} catch (err) {
console.error(err);
return [];
}
};
const handleSaveMarketer = async (e) => {
e.preventDefault();
try {
const { safeCityIds, safeAreaIds } = getValidMarketerAssignments();
if (!safeCityIds.length) {
alert("Please assign at least one city to this marketer.");
return;
}
const assignedKmsValue = Number(marketerAssignedKms);
if (!Number.isFinite(assignedKmsValue) || assignedKmsValue <= 0) {
alert("Please enter Assigned KMs per litre for this marketer.");
return;
}
const safeSubordinateIds = [...new Set(subordinateMarketerIds.filter((id) => id && id !== editingId && marketersList.some((m) => m.id === id)))];
const assignmentPayload = {
assignedCityIds: safeCityIds,
assignedAreaIds: safeAreaIds,
subordinateMarketerIds: safeSubordinateIds
};
const marketerPayload = {
name: marketerName,
phone: marketerPhone,
email: marketerEmail,
password: marketerPass,
designation: marketerDesignation.trim(),
assignedKms: assignedKmsValue,
whatsappGroupName: marketerWhatsappGroupName,
whatsappGroupLink: marketerWhatsappGroupLink,
...assignmentPayload
};
if (editingId) {
await updateMarketer(editingId, marketerPayload);
if (marketerPass) {
window.prompt("Marketer updated. Copy the new password now and share it with them:", marketerPass);
} else {
alert("Marketer details and assignments updated successfully!");
}
setEditingId(null);
} else {
await createMarketer(marketerPayload);
alert("New marketer account created with assignments successfully!");
}
setMarketerName("");
setMarketerPhone("");
setMarketerEmail("");
setMarketerPass("");
setMarketerDesignation("");
setMarketerAssignedKms("");
setSubordinateMarketerIds([]);
setSubordinatePickerOpen(false);
setSubordinateSearch("");
setMarketerWhatsappGroupName("");
setMarketerWhatsappGroupLink("");
resetMarketerAssignmentForm();
await fetchMarketers(true);
if (editingReturnToMarketerDetails) {
setEditingReturnToMarketerDetails(false);
setAdminView("marketers-detail");
}
} catch (err) {
alert("Error saving marketer: " + err.message);
}
};
const handleEditMarketer = (m) => {
const cityIds = Array.isArray(m.assignedCityIds) ? m.assignedCityIds : [];
const areaIds = Array.isArray(m.assignedAreaIds) ? m.assignedAreaIds : [];
const schoolIds = Array.isArray(m.assignedSchoolIds) ? m.assignedSchoolIds : [];
setEditingId(m.id);
setMarketerName(m.name || "");
setMarketerPhone(m.phone || "");
setMarketerEmail(m.email || "");
setMarketerPass("");
setMarketerDesignation(m.designation || "");
setMarketerAssignedKms(m.assignedKms ? String(m.assignedKms) : "");
setSubordinateMarketerIds(Array.isArray(m.subordinateMarketerIds) ? m.subordinateMarketerIds.filter((id) => id !== m.id) : []);
setSubordinatePickerOpen(false);
setSubordinateSearch("");
setMarketerWhatsappGroupName(m.whatsappGroupName || "");
setMarketerWhatsappGroupLink(m.whatsappGroupLink || "");
setAssignedCityIds(cityIds);
setAssignedAreaIds(areaIds);
setAssignedSchoolIds(schoolIds);
setAssignmentCityFocusId(cityIds[0] || "");
setAssignmentAreaFocusId(areaIds[0] || "");
setAdminCitySearch("");
setAdminAreaSearch("");
setAdminSchoolSearch("");
setNewCityName("");
setNewAreaName("");
setNewSchoolName("");
setAdminCityAssignOpen(false);
setAdminAreaAssignOpen(false);
setEditingReturnToMarketerDetails(true);
setAdminView("add-marketer");
setTimeout(() => {
fetchLocationCatalog().catch((error) => console.error("Could not load location catalog:", error));
if (cityIds.length) fetchAreasForCities(cityIds).catch((error) => console.error("Could not load assigned areas:", error));
}, 0);
};
const handleDeleteMarketer = async (m) => {
if (await confirmAction(`Are you sure you want to delete ${m.name}?`)) {
try {
await archiveMarketer(m.id);
await Promise.all([fetchMarketers(true), fetchDeletedMarketers()]);
alert("Marketer moved to Old Marketers list.");
} catch (err) {
alert("Error deleting: " + err.message);
}
}
};
const handlePermanentDeleteMarketer = async (m) => {
if (await confirmAction(`Are you sure you want to permanently delete ${m.name}?`)) {
try {
await removeDeletedMarketer(m.id);
await fetchDeletedMarketers();
alert("Marketer permanently deleted.");
} catch (err) {
alert("Error permanent deleting: " + err.message);
}
}
};
const handleRestoreMarketer = async (m) => {
if (await confirmAction(`Are you sure you want to restore ${m.name}?`)) {
try {
await restoreMarketer(m.id);
await Promise.all([fetchMarketers(true), fetchDeletedMarketers()]);
alert("Marketer restored successfully!");
} catch (err) {
alert("Error restoring: " + err.message);
}
}
};
const handleBulkMarketerAction = async (items, action) => {
const operations = { archive: archiveMarketer, restore: restoreMarketer, remove: removeDeletedMarketer };
if (!operations[action]) return false;
const unique = [...new Map((items || []).filter((item) => item?.id).map((item) => [item.id, item])).values()];
if (!unique.length) return false;
const labels = {
archive: `Move ${unique.length} selected marketer(s) to Old Marketers?`,
restore: `Restore ${unique.length} selected marketer(s)?`,
remove: `Permanently delete ${unique.length} selected old marketer(s)? This cannot be undone.`
};
if (!await confirmAction(labels[action])) return false;
const results = await Promise.allSettled(unique.map((item) => operations[action](item.id)));
const succeeded = results.filter((result) => result.status === "fulfilled").length;
await Promise.all([fetchMarketers(true), fetchDeletedMarketers()]);
if (succeeded !== unique.length) {
alert(`${succeeded} of ${unique.length} marketer(s) updated. Please retry the remaining selection.`);
} else {
alert(`${succeeded} marketer(s) ${action === "archive" ? "moved to Old Marketers" : action === "restore" ? "restored" : "permanently deleted"}.`);
}
return succeeded === unique.length;
};
return { marketerName, setMarketerName, marketerPhone, setMarketerPhone, marketerEmail, setMarketerEmail, marketerPass, setMarketerPass, marketerDesignation, setMarketerDesignation, marketerAssignedKms, setMarketerAssignedKms, subordinateMarketerIds, setSubordinateMarketerIds, subordinatePickerOpen, setSubordinatePickerOpen, subordinateSearch, setSubordinateSearch, marketerWhatsappGroupName, setMarketerWhatsappGroupName, marketerWhatsappGroupLink, setMarketerWhatsappGroupLink, marketersList, setMarketersList, deletedMarketersList, setDeletedMarketersList, editingId, setEditingId, editingReturnToMarketerDetails, setEditingReturnToMarketerDetails, fetchMarketers, fetchMarketersByIds, getAccessibleVisitMarketers, fetchDeletedMarketers, handleSaveMarketer, handleEditMarketer, handleDeleteMarketer, handlePermanentDeleteMarketer, handleRestoreMarketer, handleBulkMarketerAction };
}
