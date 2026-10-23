import { showNotice as alert } from "../../ui/confirmDialog.js";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { getSession } from "../../services/authApi";
import { compressCanvasToTargetDataUrl } from "../../services/imageCompression.js";
import { formatAddressForStamp } from "../../services/visitPhotos.js";

export function createVisitFormActions({ form, user, setUser, setMarketerview, fetchTodayAttendance, areasList, citiesList, schoolsList, isUsableSchoolRecord, resetVisitAssignmentForm, fetchMarketerReports, fetchMarketerSamples, fetchCitiesByIds, fetchAreasForCities, formatTime12, refreshLoggedInMarketerAssignments, setEditingVisitSchoolId, setEditingVisitSchoolName, setNewSchoolName, setSchoolSyncMessage }) {
const { visitCityId, setVisitCityId, visitAreaId, setVisitAreaId, visitSchoolIds, setVisitSchoolIds, visitCitySearch, setVisitCitySearch, visitAreaSearch, setVisitAreaSearch, visitSchoolSearch, setVisitSchoolSearch, visitSession, setVisitSession, visitBranches, setVisitBranches, visitStrength, setVisitStrength, visitCityPickerOpen, setVisitCityPickerOpen, visitAreaPickerOpen, setVisitAreaPickerOpen, visitSchoolPickerOpen, setVisitSchoolPickerOpen, visitAddSchoolOpen, setVisitAddSchoolOpen, visitSchoolManagerOpen, setVisitSchoolManagerOpen, visitSchoolsLoading, setVisitSchoolsLoading, visitSchoolLoadError, setVisitSchoolLoadError, schoolName, setSchoolName, principalName, setPrincipalName, phone, setPhone, purpose, setPurpose, notes, setNotes, imageFile, setImageFile, loading, setLoading, successMsg, setSuccessMsg, sampleSchoolName, setSampleSchoolName, samplePrincipalName, setSamplePrincipalName, samplePhone, setSamplePhone, sampleDetailsText, setSampleDetailsText, sampleLoading, setSampleLoading, sampleSuccessMsg, setSampleSuccessMsg, isCameraActive, setIsCameraActive, videoRef, streamRef } = form;
const openAddVisit = async () => {
const attendance = await fetchTodayAttendance();
if (attendance?.status === "leave") {
alert("Leave has been submitted for today. Add Visit is closed for the day.");
return;
}
if (attendance?.endMarked) {
alert("End Time has already been marked for today. Add Visit is closed for the day.");
return;
}
if (!attendance?.startMarked) {
alert("Please mark Start Time attendance first.");
return;
}
if (!attendance?.actionPlanSent) {
alert("Please send today's Action Plan first. Add Visit will unlock after the Action Plan is submitted.");
return;
}
resetVisitAssignmentForm();
setSuccessMsg("");
setMarketerview("add-visit");
fetchCitiesByIds(user?.assignedCityIds || []).catch(() => {});
fetchAreasForCities(user?.assignedCityIds || []).catch(() => {});
refreshLoggedInMarketerAssignments().catch(() => {});
fetchMarketerReports(user.email).catch(() => {});
};
const selectVisitArea = (area) => {
if (!area?.id || area.cityId !== visitCityId) return;
setVisitAreaId(area.id);
setVisitSchoolIds([]);
setSchoolName("");
setVisitSchoolSearch("");
setNewSchoolName("");
setVisitAreaPickerOpen(false);
setVisitSchoolPickerOpen(false);
setVisitAddSchoolOpen(false);
setVisitSchoolManagerOpen(false);
setEditingVisitSchoolId("");
setEditingVisitSchoolName("");
setSchoolSyncMessage("");
setVisitSchoolLoadError("");
};
const toggleVisitSchool = (schoolId) => {
const school = schoolsList.find(s => s.id === schoolId);
if (!school || school.areaId !== visitAreaId || school.cityId !== visitCityId || !isUsableSchoolRecord(school)) return;
setVisitSchoolIds(prev => {
if (prev[0] === schoolId) {
setSchoolName("");
return [];
}
setSchoolName(school.name || "");
setVisitSchoolPickerOpen(false);
return [schoolId];
});
};
const startCamera = async () => {
setIsCameraActive(true);
try {
const constraints = {
video: { facingMode: { exact: "environment" } },
audio: false
};
let stream;
try {
stream = await navigator.mediaDevices.getUserMedia(constraints);
} catch (err) {
stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
}
streamRef.current = stream;
if (videoRef.current) {
videoRef.current.srcObject = stream;
}
} catch (err) {
alert("Camera access denied! Please check browser permissions: " + err.message);
setIsCameraActive(false);
}
};
const stopCamera = () => {
if (streamRef.current) {
streamRef.current.getTracks().forEach(track => track.stop());
streamRef.current = null;
}
setIsCameraActive(false);
};
const capturePhoto = () => {
const video = videoRef.current;
if (!video) return;
const canvas = document.createElement("canvas");
canvas.width = video.videoWidth || 1280;
canvas.height = video.videoHeight || 720;
const ctx = canvas.getContext("2d");
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
const now = new Date();
const optionsDay = { weekday: 'long' };
const dayName = now.toLocaleDateString('en-US', optionsDay);
const dateStr = now.toLocaleDateString();
const timeStr = formatTime12(now);
if (navigator.geolocation) {
navigator.geolocation.getCurrentPosition(
(position) => {
const lat = position.coords.latitude;
const lon = position.coords.longitude;
fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`)
.then(res => res.json())
.then(data => {
const address = data.address || {};
const properLocation = formatAddressForStamp(address, lat, lon) || data.display_name || `GPS: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
drawStampAndSave(canvas, ctx, properLocation, dayName, dateStr, timeStr);
})
.catch(() => {
drawStampAndSave(canvas, ctx, `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`, dayName, dateStr, timeStr);
});
},
(error) => {
console.warn("Location fetch error: ", error.message);
drawStampAndSave(canvas, ctx, "Location: Unavailable", dayName, dateStr, timeStr);
},
{ timeout: 10000, enableHighAccuracy: true }
);
} else {
drawStampAndSave(canvas, ctx, "Location: Not Supported", dayName, dateStr, timeStr);
}
};
const drawStampAndSave = (canvas, ctx, locText, dayName, dateStr, timeStr) => {
const locationText = String(locText || "Location: Unavailable");
const paddingLeft = 20;
const fontSize = Math.max(16, canvas.width * 0.022);
const lineHeight = Math.max(24, canvas.width * 0.025);
const maxChars = Math.max(42, Math.floor(canvas.width / (fontSize * 0.58)));
const words = locationText.split(/\s+/);
const locationLines = [];
let current = "";
words.forEach(word => {
const test = current ? `${current} ${word}` : word;
if (test.length > maxChars && current) {
locationLines.push(current);
current = word;
} else {
current = test;
}
});
if (current) locationLines.push(current);
const shownLocationLines = locationLines.slice(0, 6);
if (locationLines.length > 6) shownLocationLines[5] += " ...";
const boxHeight = 82 + (shownLocationLines.length * lineHeight);
ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);
ctx.fillStyle = "#ffffff";
ctx.font = `bold ${fontSize}px sans-serif`;
ctx.textBaseline = "top";
let startY = canvas.height - boxHeight + 15;
ctx.fillText(`📅 Day & Date: ${dayName}, ${dateStr}`, paddingLeft, startY);
startY += lineHeight;
ctx.fillText(`⏰ Time: ${timeStr}`, paddingLeft, startY);
startY += lineHeight;
ctx.fillText("📍 Current Location:", paddingLeft, startY);
startY += lineHeight;
shownLocationLines.forEach(line => {
ctx.font = `600 ${Math.max(14, fontSize * 0.86)}px sans-serif`;
ctx.fillText(line, paddingLeft + 18, startY);
startY += lineHeight * 0.92;
});
const dataUrl = compressCanvasToTargetDataUrl(canvas, 100 * 1024, 900, 0.50);
setImageFile(dataUrl);
stopCamera();
};
const retakePhoto = () => {
setImageFile(null);
startCamera();
};
const handleSubmitVisit = async (e) => {
e.preventDefault();
const city = citiesList.find(c => c.id === visitCityId);
const area = areasList.find(a => a.id === visitAreaId);
const selectedSchools = visitSchoolIds.map(id => schoolsList.find(s => s.id === id)).filter(Boolean);
let assignedCities = Array.isArray(user?.assignedCityIds) ? user.assignedCityIds : [];
let assignedAreas = Array.isArray(user?.assignedAreaIds) ? user.assignedAreaIds : [];
try {
const latest = await getSession();
if (latest?.role === "marketer") {
assignedCities = Array.isArray(latest.assignedCityIds) ? latest.assignedCityIds : [];
assignedAreas = Array.isArray(latest.assignedAreaIds) ? latest.assignedAreaIds : [];
setUser(prev => ({ ...prev, assignedCityIds: assignedCities, assignedAreaIds: assignedAreas }));
}
} catch (assignmentErr) {
console.error("Could not refresh assignments before visit save:", assignmentErr);
}
if (!city || !assignedCities.includes(city.id)) {
alert("Please select one of your assigned cities.");
return;
}
if (!area || area.cityId !== city.id || !assignedAreas.includes(area.id)) {
alert("Please select an assigned area for the selected city.");
return;
}
if (selectedSchools.length !== 1 || selectedSchools.some(s => s.areaId !== area.id || s.cityId !== city.id || !isUsableSchoolRecord(s))) {
alert("Please select one school from the selected area.");
return;
}
if (!visitSession) {
alert("Please select a session month.");
return;
}
if (!/^\d+$/.test(visitBranches) || Number(visitBranches) < 1 || !/^\d+$/.test(visitStrength) || Number(visitStrength) < 1) {
alert("Please enter valid branches and school strength.");
return;
}
if (!imageFile) {
alert("Taking a photo from camera is mandatory!");
return;
}
setLoading(true);
try {
const schoolNames = selectedSchools.map(s => s.name);
await addDoc(collection(db, "visits"), {
cityId: city.id,
cityName: city.name,
areaId: area.id,
areaName: area.name,
schoolIds: selectedSchools.map(s => s.id),
schoolNames,
schoolName: schoolNames[0] || "",
principalName,
phone,
purpose,
session: visitSession,
branches: visitBranches,
strength: visitStrength,
visitTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
notes,
image: imageFile,
marketerEmail: user.email,
marketerId: user.marketerId || "",
createdAt: serverTimestamp()
});
setSuccessMsg("Visit report submitted successfully!");
resetVisitAssignmentForm();
setPrincipalName("");
setPhone("");
setPurpose("");
setVisitBranches("");
setVisitStrength("");
setNotes("");
setImageFile(null);
fetchMarketerReports(user.email, true);
} catch (err) {
alert("Error submitting report: " + err.message);
}
setLoading(false);
};
const handleSubmitSample = async (e) => {
e.preventDefault();
setSampleLoading(true);
try {
await addDoc(collection(db, "samples"), {
schoolName: sampleSchoolName,
principalName: samplePrincipalName,
phone: samplePhone,
sampleDetails: sampleDetailsText,
marketerEmail: user.email,
createdAt: serverTimestamp()
});
setSampleSuccessMsg("Sample added successfully!");
setSampleSchoolName("");
setSamplePrincipalName("");
setSamplePhone("");
setSampleDetailsText("");
fetchMarketerSamples(user.email, true);
} catch (err) {
alert("Error submitting sample: " + err.message);
}
setSampleLoading(false);
};
return { openAddVisit, selectVisitArea, toggleVisitSchool, startCamera, stopCamera, capturePhoto, retakePhoto, handleSubmitVisit, handleSubmitSample };
}
