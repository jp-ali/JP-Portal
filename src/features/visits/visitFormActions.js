import { showNotice as alert } from "../../ui/confirmDialog.js";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "../../services/dataGateway.js";
import { db } from "../../services/dataGateway.js";
import { makeSchoolVisitDetails } from "../../domain/schoolVisitDetails.js";
import { getSession } from "../../services/authApi";
import { compressCanvasToTargetDataUrl } from "../../services/imageCompression.js";
import { getRequiredVisitPosition, visitLocationStamp } from "../../services/requiredVisitLocation.js";
import { drawVisitPhotoStamp, formatVisitPhotoTimestamp } from "../../services/visitPhotos.js";
import { attachCameraPreview, cameraStartMessage, CameraPlaybackRequiredError, hasCameraFrame } from "../../services/cameraPreview.js";

export function createVisitFormActions({ form, user, setUser, setMarketerview, fetchTodayAttendance, areasList, citiesList, schoolsList, isUsableSchoolRecord, resetVisitAssignmentForm, fetchMarketerReports, fetchMarketerSamples, fetchCitiesByIds, fetchAreasForCities, fetchSchoolsForArea, mergeSchoolsIntoState, formatTime12, refreshLoggedInMarketerAssignments, setEditingVisitSchoolId, setEditingVisitSchoolName, setNewSchoolName, setSchoolSyncMessage, applySchoolVisitDetails }) {
const { visitCityId, setVisitCityId, visitAreaId, setVisitAreaId, visitSchoolIds, setVisitSchoolIds, visitCitySearch, setVisitCitySearch, visitAreaSearch, setVisitAreaSearch, visitSchoolSearch, setVisitSchoolSearch, visitSession, setVisitSession, visitBranches, setVisitBranches, visitStrength, setVisitStrength, visitCityPickerOpen, setVisitCityPickerOpen, visitAreaPickerOpen, setVisitAreaPickerOpen, visitSchoolPickerOpen, setVisitSchoolPickerOpen, visitAddSchoolOpen, setVisitAddSchoolOpen, visitSchoolManagerOpen, setVisitSchoolManagerOpen, visitSchoolsLoading, setVisitSchoolsLoading, visitSchoolLoadError, setVisitSchoolLoadError, schoolName, setSchoolName, principalName, setPrincipalName, phone, setPhone, purpose, setPurpose, notes, setNotes, imageFile, setImageFile, loading, setLoading, successMsg, setSuccessMsg, sampleSchoolName, setSampleSchoolName, samplePrincipalName, setSamplePrincipalName, samplePhone, setSamplePhone, sampleDetailsText, setSampleDetailsText, sampleLoading, setSampleLoading, sampleSuccessMsg, setSampleSuccessMsg, isCameraActive, setIsCameraActive, cameraBusy, setCameraBusy, setCameraIssue, cameraRequestRef, videoRef, streamRef } = form;
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
applySchoolVisitDetails(null);
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
if (visitSchoolIds[0] === schoolId) return;
setVisitSchoolIds([schoolId]);
setSchoolName(school.name || "");
applySchoolVisitDetails(school);
setVisitSchoolPickerOpen(false);
};
const startCamera = async () => {
if (!navigator.mediaDevices?.getUserMedia) {
  setCameraIssue("Live camera preview needs HTTPS. Use your phone camera below.");
  return null;
}
const requestId = ++cameraRequestRef.current;
setCameraBusy(true);
setCameraIssue("");
if (streamRef.current && videoRef.current) {
  try {
    const video = await attachCameraPreview(videoRef, streamRef.current);
    if (requestId !== cameraRequestRef.current) return null;
    setCameraBusy(false);
    return video;
  } catch (err) {
    if (requestId !== cameraRequestRef.current) return null;
    if (err instanceof CameraPlaybackRequiredError) {
      setCameraBusy(false);
      setCameraIssue(err.message);
      return null;
    }
  }
}
if (videoRef.current) videoRef.current.srcObject = null;
streamRef.current?.getTracks().forEach((track) => track.stop());
streamRef.current = null;
setIsCameraActive(false);
try {
  await getRequiredVisitPosition();
  if (requestId !== cameraRequestRef.current) return null;
} catch (err) {
  if (requestId !== cameraRequestRef.current) return null;
  setCameraBusy(false);
  setCameraIssue(err.message || "Allow Location access, then retry the camera.");
  return null;
}
setIsCameraActive(true);
try {
let lastError;
for (const videoConstraints of [{ facingMode: { ideal: "environment" } }, true]) {
  if (requestId !== cameraRequestRef.current) return null;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    if (requestId !== cameraRequestRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return null;
    }
    streamRef.current = stream;
    const video = await attachCameraPreview(videoRef, stream);
    if (requestId !== cameraRequestRef.current) return null;
    setCameraBusy(false);
    return video;
  } catch (err) {
    lastError = err;
    if (requestId !== cameraRequestRef.current) return null;
    if (err instanceof CameraPlaybackRequiredError) {
      setCameraBusy(false);
      setCameraIssue(err.message);
      return null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    stream?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (err?.name === "NotAllowedError" || err?.name === "SecurityError") break;
  }
}
throw lastError;
} catch (err) {
if (requestId !== cameraRequestRef.current) return null;
stopCamera();
setCameraIssue(cameraStartMessage(err));
console.warn("Camera preview unavailable:", err);
return null;
}
};
const stopCamera = () => {
cameraRequestRef.current += 1;
if (videoRef.current) videoRef.current.srcObject = null;
if (streamRef.current) {
streamRef.current.getTracks().forEach(track => track.stop());
streamRef.current = null;
}
setIsCameraActive(false);
setCameraBusy(false);
setCameraIssue("");
};
const capturePhoto = async () => {
if (cameraBusy) return;
setImageFile(null);
let video = videoRef.current;
if (!hasCameraFrame(video, streamRef.current)) {
  video = await startCamera();
  if (!hasCameraFrame(video, streamRef.current)) return;
}
setCameraBusy(true);
try {
const position = await getRequiredVisitPosition();
if (!hasCameraFrame(video, streamRef.current)) throw new Error("Camera preview stopped. Reopen the camera and retry the photo.");
const canvas = document.createElement("canvas");
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext("2d");
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
await stampVisitCanvas(canvas, ctx, position);
} catch (err) {
  stopCamera();
  setCameraIssue(err.message || "Camera frame stopped. Try again or use your phone camera below.");
  console.warn("Could not capture camera frame:", err);
}
};
const stampVisitCanvas = async (canvas, ctx, verifiedPosition) => {
const now = new Date();
const { dateText, timeText } = formatVisitPhotoTimestamp(now);
const position = verifiedPosition || await getRequiredVisitPosition();
const location = await visitLocationStamp(position);
drawStampAndSave(canvas, ctx, location, dateText, timeText);
};
const capturePhotoFromFile = async (event) => {
const file = event.target.files?.[0];
event.target.value = "";
if (!file) return;
setImageFile(null);
setCameraBusy(true);
try {
  let imageBlob = file;
  if (/\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf]$/i.test(file.type)) {
    const { default: convert } = await import("heic2any");
    const converted = await convert({ blob: file, toType: "image/jpeg" });
    imageBlob = Array.isArray(converted) ? converted[0] : converted;
  }
  const imageUrl = URL.createObjectURL(imageBlob);
  try {
    const picture = new Image();
    await new Promise((resolve, reject) => {
      picture.onload = resolve;
      picture.onerror = () => reject(new Error("Photo could not be opened."));
      picture.src = imageUrl;
    });
    const scale = Math.min(1, 1600 / Math.max(picture.naturalWidth, picture.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(picture, 0, 0, canvas.width, canvas.height);
    await stampVisitCanvas(canvas, ctx);
  } finally { URL.revokeObjectURL(imageUrl); }
} catch (err) {
  setCameraBusy(false);
  setCameraIssue(err.message || "Photo could not be opened. Please try again.");
  console.warn("Phone camera photo unavailable:", err);
}
};
const drawStampAndSave = (canvas, ctx, locText, dateText, timeText) => {
drawVisitPhotoStamp(canvas, ctx, { dateText, timeText, locationText: locText });
const dataUrl = compressCanvasToTargetDataUrl(canvas, 100 * 1024, 900, 0.50);
setImageFile(dataUrl);
stopCamera();
setCameraIssue("");
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
marketerName: user.name || "",
createdAt: serverTimestamp()
});
let detailsSaved = false;
try {
  const visitDetails = makeSchoolVisitDetails({ principalName, phone, session: visitSession, branches: visitBranches, strength: visitStrength });
  await setDoc(doc(db, "schools", selectedSchools[0].id), {
    visitDetails,
    visitDetailsUpdatedAt: serverTimestamp()
  }, { merge: true });
  detailsSaved = true;
  mergeSchoolsIntoState(area.id, schoolsList.filter((school) => school.areaId === area.id)
    .map((school) => school.id === selectedSchools[0].id ? { ...school, visitDetails } : school));
  await fetchSchoolsForArea(area.id, city.id);
} catch (schoolError) {
  console.error("Visit saved but school details could not be remembered:", schoolError);
}
setSuccessMsg(detailsSaved
  ? "Visit report submitted successfully! School details will fill automatically next time."
  : "Visit report submitted, but school details could not be saved for next time. Please retry on your next visit.");
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
return { openAddVisit, selectVisitArea, toggleVisitSchool, startCamera, stopCamera, capturePhoto, capturePhotoFromFile, retakePhoto, handleSubmitVisit, handleSubmitSample };
}
