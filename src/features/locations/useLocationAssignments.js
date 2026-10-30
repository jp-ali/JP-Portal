import { confirmAction, showNotice as alert } from "../../ui/confirmDialog.js";
import { useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "../../services/dataGateway.js";
import { db } from "../../services/dataGateway.js";
import { getSession } from "../../services/authApi";
import { normalizeEntityName, makeCityId, makeAreaId, makeSchoolId } from "../../domain/catalog.js";
import { makeMarketerSchoolId } from "../../domain/schoolOwnership.js";

export function useLocationAssignments({ user, setUser, assignmentAreaFocusId, setAssignmentAreaFocusId, citiesList, areasList, schoolsList, fetchAreasForCity, fetchSchoolsForArea, mergeCitiesIntoState, readCachedAreasForCity, readCachedSchoolsForArea, syncAreasForCityFromOpenStreetMap, setAreaSyncMessage, setSchoolSyncMessage, visitAreaId, visitCityId, visitSchoolIds, setVisitAreaId, setVisitCityId, setVisitSchoolIds, setSchoolName, setVisitAddSchoolOpen, setVisitAreaPickerOpen, setVisitAreaSearch, setVisitCityPickerOpen, setVisitCitySearch, setVisitSchoolLoadError, setVisitSchoolManagerOpen, setVisitSchoolPickerOpen, setVisitSchoolSearch, setVisitSession, applySchoolVisitDetails }) {
const [assignedCityIds, setAssignedCityIds] = useState([]);
const [assignedAreaIds, setAssignedAreaIds] = useState([]);
const [assignedSchoolIds, setAssignedSchoolIds] = useState([]);
const [assignmentCityFocusId, setAssignmentCityFocusId] = useState("");
const [adminCitySearch, setAdminCitySearch] = useState("");
const [adminAreaSearch, setAdminAreaSearch] = useState("");
const [adminSchoolSearch, setAdminSchoolSearch] = useState("");
const [newCityName, setNewCityName] = useState("");
const [newAreaName, setNewAreaName] = useState("");
const [newSchoolName, setNewSchoolName] = useState("");
const [adminCityAssignOpen, setAdminCityAssignOpen] = useState(false);
const [adminAreaAssignOpen, setAdminAreaAssignOpen] = useState(false);
const [editingVisitSchoolId, setEditingVisitSchoolId] = useState("");
const [editingVisitSchoolName, setEditingVisitSchoolName] = useState("");
const handleAddVisitSchool = async () => {
const area = areasList.find((a) => a.id === visitAreaId);
const city = citiesList.find((c) => c.id === visitCityId);
if (!area || !city || area.cityId !== city.id) return alert("Please select your city and area first.");
if (!(user?.assignedCityIds || []).includes(city.id) || !(user?.assignedAreaIds || []).includes(area.id)) {
return alert("You can only add a school inside your assigned city and area.");
}
const name = String(newSchoolName || "").trim().replace(/\s+/g, " ");
if (!name) return alert("Please enter a school name.");
const existing = schoolsList.find((school) => school.areaId === area.id && normalizeEntityName(school.name) === normalizeEntityName(name));
if (existing) {
setVisitSchoolIds([existing.id]);
setSchoolName(existing.name);
applySchoolVisitDetails(existing);
setVisitSchoolLoadError("");
setNewSchoolName("");
setVisitAddSchoolOpen(false);
setVisitSchoolPickerOpen(false);
return alert("This school already exists in the selected area. It has been selected for you.");
}
try {
const id = makeMarketerSchoolId(area.id, name, user.email);
await setDoc(doc(db, "schools", id), {
name,
normalizedName: normalizeEntityName(name),
cityId: city.id,
city: city.name,
cityName: city.name,
areaId: area.id,
area: area.name,
areaName: area.name,
source: "manual-marketer",
addedByMarketerEmail: user?.email || "",
createdAt: serverTimestamp()
}, { merge: true });
await fetchSchoolsForArea(area.id, city.id);
setVisitSchoolIds([id]);
setSchoolName(name);
applySchoolVisitDetails(null);
setVisitSchoolLoadError("");
setNewSchoolName("");
setVisitAddSchoolOpen(false);
setVisitSchoolPickerOpen(false);
} catch (err) {
alert("Error adding school: " + err.message);
}
};
const isOwnManualSchool = (school) => {
if (!school) return false;
return school.source === "manual-marketer"
&& school.areaId === visitAreaId
&& normalizeEntityName(school.addedByMarketerEmail || "") === normalizeEntityName(user?.email || "");
};
const startEditVisitSchool = (school) => {
if (!isOwnManualSchool(school)) return;
setEditingVisitSchoolId(school.id);
setEditingVisitSchoolName(school.name || "");
};
const cancelEditVisitSchool = () => {
setEditingVisitSchoolId("");
setEditingVisitSchoolName("");
};
const saveEditedVisitSchool = async (school) => {
if (!isOwnManualSchool(school)) return alert("You can edit only the schools you added yourself.");
const name = String(editingVisitSchoolName || "").trim().replace(/\s+/g, " ");
if (!name) return alert("School name cannot be empty.");
const duplicate = schoolsList.find((item) => item.id !== school.id && item.areaId === school.areaId && normalizeEntityName(item.name) === normalizeEntityName(name));
if (duplicate) return alert("A school with this name already exists in the selected area.");
try {
const newId = makeMarketerSchoolId(school.areaId, name, user.email);
const updatedData = {
...school,
name,
normalizedName: normalizeEntityName(name),
source: "manual-marketer",
addedByMarketerEmail: user?.email || school.addedByMarketerEmail || "",
updatedAt: serverTimestamp()
};
delete updatedData.id;
await setDoc(doc(db, "schools", newId), updatedData, { merge: true });
if (newId !== school.id) await deleteDoc(doc(db, "schools", school.id));
setVisitSchoolIds((prev) => prev.includes(school.id) ? [newId] : prev);
setSchoolName((prev) => normalizeEntityName(prev || "") === normalizeEntityName(school.name || "") ? name : prev);
await fetchSchoolsForArea(school.areaId, school.cityId);
cancelEditVisitSchool();
} catch (err) {
alert("Error updating school: " + err.message);
}
};
const removeOwnVisitSchool = async (school) => {
if (!isOwnManualSchool(school)) return alert("You can remove only the schools you added yourself.");
if (!await confirmAction(`Remove ${school.name}?`)) return;
try {
await deleteDoc(doc(db, "schools", school.id));
const wasSelected = visitSchoolIds.includes(school.id);
if (wasSelected) {
setVisitSchoolIds([]);
setSchoolName("");
}
if (editingVisitSchoolId === school.id) cancelEditVisitSchool();
await fetchSchoolsForArea(school.areaId, school.cityId);
} catch (err) {
alert("Error removing school: " + err.message);
}
};
const resetMarketerAssignmentForm = () => {
setAssignedCityIds([]);
setAssignedAreaIds([]);
setAssignedSchoolIds([]);
setAssignmentCityFocusId("");
setAssignmentAreaFocusId("");
setAdminCitySearch("");
setAdminAreaSearch("");
setAdminSchoolSearch("");
setNewCityName("");
setNewAreaName("");
setNewSchoolName("");
setAreaSyncMessage("");
setAdminCityAssignOpen(false);
setAdminAreaAssignOpen(false);
};
const resetVisitAssignmentForm = () => {
setVisitCityId("");
setVisitAreaId("");
setVisitSchoolIds([]);
setVisitCitySearch("");
setVisitAreaSearch("");
setVisitSchoolSearch("");
setSchoolName("");
setNewSchoolName("");
setVisitSession("");
setVisitCityPickerOpen(false);
setVisitAreaPickerOpen(false);
setVisitSchoolPickerOpen(false);
setVisitAddSchoolOpen(false);
setVisitSchoolManagerOpen(false);
setEditingVisitSchoolId("");
setEditingVisitSchoolName("");
setSchoolSyncMessage("");
};
const getValidMarketerAssignments = () => {
const safeCityIds = [...new Set(assignedCityIds.filter(id => citiesList.some(c => c.id === id)))];
const safeAreaIds = [...new Set(assignedAreaIds.filter(id => {
const area = areasList.find(a => a.id === id);
return area && safeCityIds.includes(area.cityId);
}))];
const safeSchoolIds = [...new Set(assignedSchoolIds.filter(id => {
const school = schoolsList.find(s => s.id === id);
return school && safeCityIds.includes(school.cityId) && safeAreaIds.includes(school.areaId);
}))];
return { safeCityIds, safeAreaIds, safeSchoolIds };
};
const toggleCityAssignment = (cityId) => {
setAssignedCityIds(prev => {
if (prev.includes(cityId)) {
const removedAreaIds = areasList.filter(a => a.cityId === cityId).map(a => a.id);
setAssignedAreaIds(old => old.filter(id => !removedAreaIds.includes(id)));
setAssignedSchoolIds(old => old.filter(id => {
const school = schoolsList.find(s => s.id === id);
return school?.cityId !== cityId;
}));
if (assignmentCityFocusId === cityId) {
setAssignmentCityFocusId("");
setAssignmentAreaFocusId("");
}
return prev.filter(id => id !== cityId);
}
const next = [...prev, cityId];
if (!assignmentCityFocusId) setAssignmentCityFocusId(cityId);
const city = citiesList.find(c => c.id === cityId);
if (city) {
readCachedAreasForCity(city.id);
fetchAreasForCity(city.id).then((rows) => {
if (!rows.length) {
syncAreasForCityFromOpenStreetMap(city, false);
}
}).catch(() => {});
}
return next;
});
};
const toggleAreaAssignment = (areaId) => {
const area = areasList.find(a => a.id === areaId);
if (!area || !assignedCityIds.includes(area.cityId)) return;
const adding = !assignedAreaIds.includes(areaId);
setAssignedAreaIds(prev => {
if (prev.includes(areaId)) {
setAssignedSchoolIds(old => old.filter(id => schoolsList.find(s => s.id === id)?.areaId !== areaId));
if (assignmentAreaFocusId === areaId) setAssignmentAreaFocusId("");
return prev.filter(id => id !== areaId);
}
const next = [...prev, areaId];
if (!assignmentAreaFocusId) setAssignmentAreaFocusId(areaId);
return next;
});
if (adding) {
readCachedSchoolsForArea(area.id);
}
};
const toggleSchoolAssignment = (schoolId) => {
const school = schoolsList.find(s => s.id === schoolId);
if (!school || !assignedCityIds.includes(school.cityId) || !assignedAreaIds.includes(school.areaId)) return;
setAssignedSchoolIds(prev => prev.includes(schoolId) ? prev.filter(id => id !== schoolId) : [...prev, schoolId]);
};
const handleAddCity = async () => {
const name = String(newCityName || "").trim().replace(/\s+/g, " ");
if (!name) return alert("Please enter a city name.");
const existing = citiesList.find(c => normalizeEntityName(c.name) === normalizeEntityName(name));
if (existing) {
if (!assignedCityIds.includes(existing.id)) setAssignedCityIds(prev => [...prev, existing.id]);
setAssignmentCityFocusId(existing.id);
setNewCityName("");
return alert("This city already exists. It has been selected instead of creating a duplicate.");
}
try {
const id = makeCityId(name);
const cityRecord = {
id,
name,
normalizedName: normalizeEntityName(name),
country: "Pakistan",
source: "manual-admin"
};
await setDoc(doc(db, "cities", id), {
name,
normalizedName: normalizeEntityName(name),
country: "Pakistan",
source: "manual-admin",
createdAt: serverTimestamp()
}, { merge: true });
mergeCitiesIntoState([cityRecord]);
try {
const current = JSON.parse(localStorage.getItem("javed_portal_manual_cities_v1") || "[]");
const map = new Map((Array.isArray(current) ? current : []).map((c) => [c.id, c]));
map.set(id, cityRecord);
localStorage.setItem("javed_portal_manual_cities_v1", JSON.stringify([...map.values()]));
} catch (_) {}
setAssignedCityIds(prev => prev.includes(id) ? prev : [...prev, id]);
setAssignmentCityFocusId(id);
setNewCityName("");
} catch (err) {
alert("Error adding city: " + err.message);
}
};
const handleAddArea = async () => {
const city = citiesList.find(c => c.id === assignmentCityFocusId);
if (!city) return alert("Please select an assigned city first.");
const name = String(newAreaName || "").trim().replace(/\s+/g, " ");
if (!name) return alert("Please enter an area name.");
const existing = areasList.find(a => a.cityId === city.id && normalizeEntityName(a.name) === normalizeEntityName(name));
if (existing) {
if (!assignedAreaIds.includes(existing.id)) setAssignedAreaIds(prev => [...prev, existing.id]);
setAssignmentAreaFocusId(existing.id);
setNewAreaName("");
return alert("This area already exists in the selected city. It has been selected instead.");
}
try {
const id = makeAreaId(city.id, name);
await setDoc(doc(db, "areas", id), {
name,
normalizedName: normalizeEntityName(name),
cityId: city.id,
cityName: city.name,
createdAt: serverTimestamp()
}, { merge: true });
await fetchAreasForCity(city.id);
setAssignedAreaIds(prev => prev.includes(id) ? prev : [...prev, id]);
setAssignmentAreaFocusId(id);
setNewAreaName("");
} catch (err) {
alert("Error adding area: " + err.message);
}
};
const handleAddSchool = async () => {
const area = areasList.find(a => a.id === assignmentAreaFocusId);
const city = citiesList.find(c => c.id === area?.cityId);
if (!area || !city || !assignedAreaIds.includes(area.id)) return alert("Please select an assigned area first.");
const name = String(newSchoolName || "").trim().replace(/\s+/g, " ");
if (!name) return alert("Please enter a school name.");
const existing = schoolsList.find(s => s.areaId === area.id && normalizeEntityName(s.name) === normalizeEntityName(name));
if (existing) {
if (!assignedSchoolIds.includes(existing.id)) setAssignedSchoolIds(prev => [...prev, existing.id]);
setNewSchoolName("");
return alert("This school already exists in the selected area. It has been selected instead.");
}
try {
const id = makeSchoolId(area.id, name);
await setDoc(doc(db, "schools", id), {
name,
normalizedName: normalizeEntityName(name),
cityId: city.id,
city: city.name,
cityName: city.name,
areaId: area.id,
area: area.name,
areaName: area.name,
createdAt: serverTimestamp()
}, { merge: true });
await fetchSchoolsForArea(area.id, city.id);
setAssignedSchoolIds(prev => prev.includes(id) ? prev : [...prev, id]);
setNewSchoolName("");
} catch (err) {
alert("Error adding school: " + err.message);
}
};
const refreshLoggedInMarketerAssignments = async () => {
if (!user?.email || user?.role !== "marketer") return;
try {
const profile = await getSession();
if (profile?.role === "marketer") setUser(profile);
} catch (err) {
console.error("Assignment refresh error:", err);
}
};
return { assignedCityIds, setAssignedCityIds, assignedAreaIds, setAssignedAreaIds, assignedSchoolIds, setAssignedSchoolIds, assignmentCityFocusId, setAssignmentCityFocusId, adminCitySearch, setAdminCitySearch, adminAreaSearch, setAdminAreaSearch, adminSchoolSearch, setAdminSchoolSearch, newCityName, setNewCityName, newAreaName, setNewAreaName, newSchoolName, setNewSchoolName, adminCityAssignOpen, setAdminCityAssignOpen, adminAreaAssignOpen, setAdminAreaAssignOpen, editingVisitSchoolId, setEditingVisitSchoolId, editingVisitSchoolName, setEditingVisitSchoolName, handleAddVisitSchool, isOwnManualSchool, startEditVisitSchool, cancelEditVisitSchool, saveEditedVisitSchool, removeOwnVisitSchool, resetMarketerAssignmentForm, resetVisitAssignmentForm, getValidMarketerAssignments, toggleCityAssignment, toggleAreaAssignment, toggleSchoolAssignment, handleAddCity, handleAddArea, handleAddSchool, refreshLoggedInMarketerAssignments };
}
