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
const rows = (await listAccessibleMarketers()).filter((item) => allowed.has(item.id));
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
setDeletedMarketersList(await listDeletedMarketers());
} catch (err) {
console.error(err);
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
alert("Marketer details and assignments updated successfully!");
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
const handleEditMarketer = async (m) => {
await fetchLocationCatalog();
const cityIds = Array.isArray(m.assignedCityIds) ? m.assignedCityIds : [];
const areaIds = Array.isArray(m.assignedAreaIds) ? m.assignedAreaIds : [];
const schoolIds = Array.isArray(m.assignedSchoolIds) ? m.assignedSchoolIds : [];
const loadedAreas = await fetchAreasForCities(cityIds);
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
setAssignmentAreaFocusId(areaIds.find(id => loadedAreas.find(a => a.id === id)?.cityId === cityIds[0]) || "");
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
};
const handleDeleteMarketer = async (m) => {
if (window.confirm(`Are you sure you want to delete ${m.name}?`)) {
try {
await archiveMarketer(m.id);
fetchMarketers(true);
fetchDeletedMarketers();
alert("Marketer moved to Old Marketers list.");
} catch (err) {
alert("Error deleting: " + err.message);
}
}
};
const handlePermanentDeleteMarketer = async (m) => {
if (window.confirm(`Are you sure you want to permanently delete ${m.name}?`)) {
try {
await removeDeletedMarketer(m.id);
fetchDeletedMarketers();
alert("Marketer permanently deleted.");
} catch (err) {
alert("Error permanent deleting: " + err.message);
}
}
};
const handleRestoreMarketer = async (m) => {
if (window.confirm(`Are you sure you want to restore ${m.name}?`)) {
try {
await restoreMarketer(m.id);
fetchMarketers(true);
fetchDeletedMarketers();
alert("Marketer restored successfully!");
} catch (err) {
alert("Error restoring: " + err.message);
}
}
};
return { marketerName, setMarketerName, marketerPhone, setMarketerPhone, marketerEmail, setMarketerEmail, marketerPass, setMarketerPass, marketerDesignation, setMarketerDesignation, marketerAssignedKms, setMarketerAssignedKms, subordinateMarketerIds, setSubordinateMarketerIds, subordinatePickerOpen, setSubordinatePickerOpen, subordinateSearch, setSubordinateSearch, marketerWhatsappGroupName, setMarketerWhatsappGroupName, marketerWhatsappGroupLink, setMarketerWhatsappGroupLink, marketersList, setMarketersList, deletedMarketersList, setDeletedMarketersList, editingId, setEditingId, editingReturnToMarketerDetails, setEditingReturnToMarketerDetails, fetchMarketers, fetchMarketersByIds, getAccessibleVisitMarketers, fetchDeletedMarketers, handleSaveMarketer, handleEditMarketer, handleDeleteMarketer, handlePermanentDeleteMarketer, handleRestoreMarketer };
}
