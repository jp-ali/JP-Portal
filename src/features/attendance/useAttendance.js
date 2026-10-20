import { useEffect, useRef, useState } from "react";
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { listMarketers } from "../../services/marketerApi";
import { formatActionPlanDate } from "../../domain/dates.js";
import { compressCanvasToTargetDataUrl } from "../../services/imageCompression.js";
import { mergedReportSheet } from "../../services/mergedReportSheet.js";
import { PDF_BANNER, PDF_TABLE_HEAD, PDF_TABLE_SUBHEAD, PDF_FOOTER, pdfTextFill } from "../../services/pdfTheme.js";

export function useAttendance({ user, getTodayInputDate, formatTime12, groupRowsByMarketerAndDate, setMarketerview, fetchDeletedMedia }) {
const [attendanceType, setAttendanceType] = useState("");
const [attendanceStartReading, setAttendanceStartReading] = useState("");
const [attendanceEndReading, setAttendanceEndReading] = useState("");
const [attendanceLeaveReason, setAttendanceLeaveReason] = useState("");
const [attendanceOtherExpense, setAttendanceOtherExpense] = useState("");
const [attendanceTransportExpense, setAttendanceTransportExpense] = useState("");
const [attendanceFoodExpense, setAttendanceFoodExpense] = useState("");
const [attendanceNightStayExpense, setAttendanceNightStayExpense] = useState("");
const [attendanceStartPhoto, setAttendanceStartPhoto] = useState(null);
const [attendanceEndPhoto, setAttendanceEndPhoto] = useState(null);
const [attendanceOtherExpensePhoto, setAttendanceOtherExpensePhoto] = useState(null);
const [attendanceTransportExpensePhoto, setAttendanceTransportExpensePhoto] = useState(null);
const [attendanceFoodExpensePhoto, setAttendanceFoodExpensePhoto] = useState(null);
const [attendanceNightStayExpensePhoto, setAttendanceNightStayExpensePhoto] = useState(null);
const [attendanceCameraTarget, setAttendanceCameraTarget] = useState("");
const [attendanceCameraActive, setAttendanceCameraActive] = useState(false);
const attendanceVideoRef = useRef(null);
const attendanceStreamRef = useRef(null);
const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
const [todayAttendance, setTodayAttendance] = useState(null);
const [attendanceRecords, setAttendanceRecords] = useState([]);
const [adminAttendanceFromDate, setAdminAttendanceFromDate] = useState(getTodayInputDate);
const [adminAttendanceToDate, setAdminAttendanceToDate] = useState(getTodayInputDate);
const [adminAttendanceSearch, setAdminAttendanceSearch] = useState("");
const [adminAttendanceMarketerFilter, setAdminAttendanceMarketerFilter] = useState([]);
const [attendancePetrolRates, setAttendancePetrolRates] = useState({});
const [adminAttendancePetrolRate, setAdminAttendancePetrolRate] = useState("");
const [attendanceMediaFromDate, setAttendanceMediaFromDate] = useState(getTodayInputDate());
const [attendanceMediaToDate, setAttendanceMediaToDate] = useState(getTodayInputDate());
const [selectedAttendanceMediaIds, setSelectedAttendanceMediaIds] = useState([]);
const [attendanceMediaMarketer, setAttendanceMediaMarketer] = useState(null);
useEffect(() => {
const dateKey = adminAttendanceToDate || getTodayInputDate();
const saved = attendancePetrolRates[dateKey];
setAdminAttendancePetrolRate(saved === undefined || saved === null ? "" : String(saved));
}, [adminAttendanceToDate, attendancePetrolRates]);
useEffect(() => {
if (user?.role === "marketer" && (user?.marketerId || user?.email)) {
fetchTodayAttendance(user.marketerId, user.email).catch(() => {});
} else if (!user) {
setTodayAttendance(null);
}
}, [user?.role, user?.marketerId, user?.email]);
const getAttendanceDocId = (marketerId, email, dateValue = getTodayInputDate()) => {
const owner = String(marketerId || email || "marketer").replace(/[^a-zA-Z0-9_-]/g, "_");
return `${owner}_${dateValue}`;
};
const getClockTime = () => new Date().toLocaleTimeString("en-US", {
hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
});
const resetAttendanceForm = () => {
setAttendanceType("");
setAttendanceStartReading("");
setAttendanceEndReading("");
setAttendanceLeaveReason("");
setAttendanceOtherExpense("");
setAttendanceTransportExpense("");
setAttendanceFoodExpense("");
setAttendanceNightStayExpense("");
setAttendanceStartPhoto(null);
setAttendanceEndPhoto(null);
setAttendanceOtherExpensePhoto(null);
setAttendanceTransportExpensePhoto(null);
setAttendanceFoodExpensePhoto(null);
setAttendanceNightStayExpensePhoto(null);
stopAttendanceCamera();
};
const fetchTodayAttendance = async (marketerId = user?.marketerId, email = user?.email) => {
if (!marketerId && !email) return null;
try {
const id = getAttendanceDocId(marketerId, email, getTodayInputDate());
const snap = await getDoc(doc(db, "attendance", id));
const row = snap.exists() ? { id: snap.id, ...snap.data() } : null;
setTodayAttendance(row);
return row;
} catch (err) {
console.error("Today attendance fetch error:", err);
return null;
}
};
const fetchAttendanceRecords = async () => {
try {
const [attendanceSnap, actionPlanSnap, marketerRows, petrolRateSnap] = await Promise.all([
getDocs(collection(db, "attendance")),
getDocs(collection(db, "action_plans")),
listMarketers(),
getDocs(collection(db, "petrol_rates"))
]);
const areaByMarketerDate = new Map();
actionPlanSnap.docs.forEach((d) => {
const p = d.data();
const email = String(p.marketerEmail || "").trim().toLowerCase();
const marketerId = String(p.marketerId || "").trim();
const date = String(p.date || "").trim();
const areaName = String(p.areaName || p.area || "").trim();
if (!date || !areaName) return;
if (email) areaByMarketerDate.set(`email:${email}|${date}`, areaName);
if (marketerId) areaByMarketerDate.set(`id:${marketerId}|${date}`, areaName);
});
const marketerById = new Map();
const marketerByEmail = new Map();
marketerRows.forEach((data) => {
marketerById.set(data.id, data);
const email = String(data.email || "").trim().toLowerCase();
if (email) marketerByEmail.set(email, data);
});
const rateMap = {};
petrolRateSnap.docs.forEach((d) => {
const data = d.data();
const date = String(data.date || d.id || "").trim();
const rate = Number(data.rate);
if (date && Number.isFinite(rate) && rate >= 0) rateMap[date] = rate;
});
setAttendancePetrolRates(rateMap);
const rows = attendanceSnap.docs.map((d) => {
const row = { id: d.id, ...d.data() };
const email = String(row.marketerEmail || "").trim().toLowerCase();
const marketerId = String(row.marketerId || "").trim();
const date = String(row.date || "").trim();
const marketerProfile = (marketerId && marketerById.get(marketerId)) || (email && marketerByEmail.get(email)) || {};
const linkedArea =
row.areaName ||
(marketerId ? areaByMarketerDate.get(`id:${marketerId}|${date}`) : "") ||
(email ? areaByMarketerDate.get(`email:${email}|${date}`) : "") ||
"";
const assignedKms = Number(row.assignedKms || marketerProfile.assignedKms || 0);
return {
...row,
areaName: linkedArea,
assignedKms: Number.isFinite(assignedKms) && assignedKms > 0 ? assignedKms : 0
};
});
rows.sort((a, b) => {
const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
if (dateCompare !== 0) return dateCompare;
const ta = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
const tb = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
return tb - ta;
});
setAttendanceRecords(rows);
return rows;
} catch (err) {
console.error("Attendance fetch error:", err);
return [];
}
};
const getFilteredAttendance = () => {
return attendanceRecords.filter((r) => {
const d = String(r.date || "");
const inRange = (!adminAttendanceFromDate || d >= adminAttendanceFromDate) &&
(!adminAttendanceToDate || d <= adminAttendanceToDate);
const matchesMarketer = !adminAttendanceMarketerFilter.length ||
adminAttendanceMarketerFilter.some((email) => String(r.marketerEmail || "").toLowerCase() === String(email).toLowerCase());
return inRange && matchesMarketer;
});
};
const ATTENDANCE_MEDIA_FIELDS = [
["startPhoto", "Day In"],
["endPhoto", "Day Out"],
["transportExpensePhoto", "Transport"],
["nightStayExpensePhoto", "Night Stay"],
["foodExpensePhoto", "Food"],
["otherExpensePhoto", "Other Expense"]
];
const getAttendanceMediaItems = () => {
const items = [];
attendanceRecords.forEach((record) => {
ATTENDANCE_MEDIA_FIELDS.forEach(([field, label]) => {
const image = record?.[field];
if (!image) return;
items.push({
id: `${record.id}:${field}`,
attendanceDocId: record.id,
field,
label,
image,
date: String(record.date || ""),
marketerId: record.marketerId || "",
marketerEmail: record.marketerEmail || "",
marketerName: record.marketerName || record.marketerEmail || "Marketer",
areaName: record.areaName || "",
amount:
field === "transportExpensePhoto" ? Number(record.transportExpense || 0) :
field === "nightStayExpensePhoto" ? Number(record.nightStayExpense || 0) :
field === "foodExpensePhoto" ? Number(record.foodExpense || 0) :
field === "otherExpensePhoto" ? Number(record.otherExpense || 0) : null
});
});
});
return items;
};
const getFilteredAttendanceMedia = () => getAttendanceMediaItems().filter((item) => {
const d = String(item.date || "");
const matchesDate = (!attendanceMediaFromDate || d >= attendanceMediaFromDate) &&
(!attendanceMediaToDate || d <= attendanceMediaToDate);
const matchesMarketer = !adminAttendanceMarketerFilter.length ||
adminAttendanceMarketerFilter.some((email) => String(item.marketerEmail || "").toLowerCase() === String(email).toLowerCase());
return matchesDate && matchesMarketer;
});
const softDeleteAttendanceMedia = async (item, skipConfirm = false) => {
if (!item?.image || !item?.attendanceDocId || !item?.field) return;
if (!skipConfirm && !window.confirm(`Delete ${item.label} picture? It will move to Recently Deleted.`)) return;
try {
await addDoc(collection(db, "deleted_media"), {
mediaType: "attendance",
attendanceDocId: item.attendanceDocId,
attendanceField: item.field,
attendanceLabel: item.label,
image: item.image,
marketerId: item.marketerId || "",
marketerEmail: item.marketerEmail || "",
marketerName: item.marketerName || "Marketer",
areaName: item.areaName || "",
date: item.date || "",
deletedAt: serverTimestamp()
});
await updateDoc(doc(db, "attendance", item.attendanceDocId), { [item.field]: null });
setSelectedAttendanceMediaIds((prev) => prev.filter((id) => id !== item.id));
await Promise.all([fetchAttendanceRecords(), fetchDeletedMedia()]);
} catch (err) {
alert("Error deleting attendance media: " + err.message);
}
};
const deleteSelectedAttendanceMedia = async () => {
const selected = getFilteredAttendanceMedia().filter((item) => selectedAttendanceMediaIds.includes(item.id));
if (!selected.length) return;
if (!window.confirm(`Delete ${selected.length} selected attendance picture(s)? They will move to Recently Deleted.`)) return;
try {
for (const item of selected) {
await addDoc(collection(db, "deleted_media"), {
mediaType: "attendance",
attendanceDocId: item.attendanceDocId,
attendanceField: item.field,
attendanceLabel: item.label,
image: item.image,
marketerId: item.marketerId || "",
marketerEmail: item.marketerEmail || "",
marketerName: item.marketerName || "Marketer",
areaName: item.areaName || "",
date: item.date || "",
deletedAt: serverTimestamp()
});
await updateDoc(doc(db, "attendance", item.attendanceDocId), { [item.field]: null });
}
setSelectedAttendanceMediaIds([]);
await Promise.all([fetchAttendanceRecords(), fetchDeletedMedia()]);
} catch (err) {
alert("Error deleting selected attendance media: " + err.message);
}
};
const getAttendanceTotalKms = (row) => {
const start = Number(row?.startReading);
const end = Number(row?.endReading);
if (!Number.isFinite(start) || !Number.isFinite(end)) return "N/A";
return Math.max(0, end - start).toFixed(1).replace(/\.0$/, "");
};
const getAttendancePetrolRate = (row) => {
const dateKey = String(row?.date || "").trim();
const savedRate = Number(attendancePetrolRates[dateKey]);
if (Number.isFinite(savedRate) && savedRate >= 0) return savedRate;
const rowRate = Number(row?.petrolRate);
if (Number.isFinite(rowRate) && rowRate >= 0) return rowRate;
const typedRate = Number(adminAttendancePetrolRate);
const rateInputDate = adminAttendanceToDate || getTodayInputDate();
if (dateKey === rateInputDate && String(adminAttendancePetrolRate || "").trim() !== "" && Number.isFinite(typedRate) && typedRate >= 0) return typedRate;
return null;
};
const getAttendanceAssignedKms = (row) => {
const assigned = Number(row?.assignedKms || 0);
return Number.isFinite(assigned) && assigned > 0
? assigned.toFixed(1).replace(/\.0$/, "")
: "—";
};
const getAttendancePetrolExpense = (row) => {
const totalKms = Number(getAttendanceTotalKms(row));
const assignedKms = Number(row?.assignedKms || 0);
const petrolRate = getAttendancePetrolRate(row);
if (
!Number.isFinite(totalKms) || totalKms < 0 ||
!Number.isFinite(assignedKms) || assignedKms <= 0 ||
petrolRate === null || !Number.isFinite(Number(petrolRate))
) return "—";
const petrolExpense = (totalKms / assignedKms) * Number(petrolRate);
return Number.isFinite(petrolExpense) ? petrolExpense.toFixed(2).replace(/\.00$/, "") : "—";
};
const getAttendanceTotalOtherExpense = (row) => {
const total =
Number(row?.transportExpense || 0) +
Number(row?.nightStayExpense || 0) +
Number(row?.foodExpense || 0) +
Number(row?.otherExpense || 0);
return Number.isFinite(total) ? total.toFixed(2).replace(/\.00$/, "") : "0";
};
const saveAttendancePetrolRate = async () => {
const dateKey = adminAttendanceToDate || getTodayInputDate();
const rate = Number(adminAttendancePetrolRate);
if (!adminAttendancePetrolRate.trim()) return;
if (!Number.isFinite(rate) || rate < 0) {
alert("Please enter a valid petrol rate per litre.");
return;
}
try {
await setDoc(doc(db, "petrol_rates", dateKey), {
date: dateKey,
rate,
updatedAt: serverTimestamp()
}, { merge: true });
setAttendancePetrolRates((prev) => ({ ...prev, [dateKey]: rate }));
} catch (err) {
alert("Petrol rate could not be saved: " + err.message);
}
};
const saveAttendanceAssignedKms = async (row, rawValue) => {
if (!row?.id) return;
const todayKey = getTodayInputDate();
const rowDate = String(row?.date || "");
// Admin may override Assigned KMs for the current date only.
// The value becomes locked automatically once the calendar day has ended.
const locked = !rowDate || rowDate !== todayKey;
if (locked) return;
const raw = String(rawValue ?? "").trim();
if (!raw) return;
const value = Number(raw);
if (!Number.isFinite(value) || value <= 0) {
alert("Please enter valid Assigned KMs per litre.");
await fetchAttendanceRecords();
return;
}
try {
await updateDoc(doc(db, "attendance", row.id), { assignedKms: value, updatedAt: serverTimestamp() });
setAttendanceRecords((prev) => prev.map((item) => item.id === row.id ? { ...item, assignedKms: value } : item));
} catch (err) {
alert("Assigned KMs could not be saved: " + err.message);
await fetchAttendanceRecords();
}
};

const startAttendanceCamera = async (target) => {
stopAttendanceCamera();
setAttendanceCameraTarget(target);
setAttendanceCameraActive(true);
try {
let stream;
try {
stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false });
} catch (_) {
stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
}
attendanceStreamRef.current = stream;
setTimeout(() => {
if (attendanceVideoRef.current) attendanceVideoRef.current.srcObject = stream;
}, 0);
} catch (err) {
setAttendanceCameraActive(false);
setAttendanceCameraTarget("");
alert("Camera access denied. Please allow camera permission and try again.");
}
};
const stopAttendanceCamera = () => {
if (attendanceStreamRef.current) {
attendanceStreamRef.current.getTracks().forEach((track) => track.stop());
attendanceStreamRef.current = null;
}
setAttendanceCameraActive(false);
setAttendanceCameraTarget("");
};
const setAttendancePhotoForTarget = (target, dataUrl) => {
if (target === "start") setAttendanceStartPhoto(dataUrl);
else if (target === "end") setAttendanceEndPhoto(dataUrl);
else if (target === "other") setAttendanceOtherExpensePhoto(dataUrl);
else if (target === "transport") setAttendanceTransportExpensePhoto(dataUrl);
else if (target === "food") setAttendanceFoodExpensePhoto(dataUrl);
else if (target === "night") setAttendanceNightStayExpensePhoto(dataUrl);
};
const captureAttendancePhoto = () => {
const video = attendanceVideoRef.current;
if (!video || !attendanceCameraTarget) return;
const canvas = document.createElement("canvas");
const rawW = video.videoWidth || 1280;
const rawH = video.videoHeight || 720;
const maxW = 720;
const scale = Math.min(1, maxW / rawW);
canvas.width = Math.max(1, Math.round(rawW * scale));
canvas.height = Math.max(1, Math.round(rawH * scale));
const ctx = canvas.getContext("2d");
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
const now = new Date();
const labelMap = {
start: "START TIME / DAY IN READING",
end: "END TIME / DAY OUT READING",
other: "OTHER EXPENSE",
transport: "TRANSPORT EXPENSE",
food: "FOOD EXPENSE",
night: "NIGHT STAY EXPENSE"
};
const fontSize = Math.max(17, Math.round(canvas.width * 0.021));
const boxHeight = Math.max(110, fontSize * 4.5);
ctx.fillStyle = "rgba(0,0,0,.72)";
ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);
ctx.fillStyle = "#fff";
ctx.font = `bold ${fontSize}px sans-serif`;
ctx.textBaseline = "top";
ctx.fillText(labelMap[attendanceCameraTarget] || "ATTENDANCE", 20, canvas.height - boxHeight + 14);
ctx.font = `600 ${Math.max(15, fontSize * .85)}px sans-serif`;
ctx.fillText(`${now.toLocaleDateString("en-GB")}  ${formatTime12(now)}`, 20, canvas.height - boxHeight + 14 + fontSize * 1.5);
ctx.fillText(user?.name || user?.email || "Marketer", 20, canvas.height - boxHeight + 14 + fontSize * 2.8);
const dataUrl = compressCanvasToTargetDataUrl(canvas, 65 * 1024, 560, 0.48);
setAttendancePhotoForTarget(attendanceCameraTarget, dataUrl);
stopAttendanceCamera();
};
const submitAttendanceStart = async () => {
if (!attendanceStartReading.trim()) {
alert("Please enter Day In / Start reading.");
return;
}
const reading = Number(attendanceStartReading);
if (!Number.isFinite(reading) || reading < 0) {
alert("Please enter a valid start reading.");
return;
}
if (!attendanceStartPhoto) {
alert("Start Time picture is mandatory.");
return;
}
const latest = await fetchTodayAttendance();
if (latest?.startMarked) {
alert("Start Time has already been marked for today.");
return;
}
if (latest?.status === "leave") {
alert("Leave has already been submitted for today.");
return;
}
setAttendanceSubmitting(true);
try {
const dateValue = getTodayInputDate();
const id = getAttendanceDocId(user?.marketerId, user?.email, dateValue);
await setDoc(doc(db, "attendance", id), {
marketerId: user?.marketerId || "",
marketerEmail: user?.email || "",
marketerName: user?.name || user?.email || "Marketer",
designation: user?.designation || "Regional Manager",
assignedKms: Number(user?.assignedKms || 0),
date: dateValue,
status: "started",
startMarked: true,
startTime: getClockTime(),
startReading: reading,
startPhoto: attendanceStartPhoto,
startCreatedAt: serverTimestamp(),
updatedAt: serverTimestamp()
}, { merge: true });
await fetchTodayAttendance();
setAttendanceStartReading("");
setAttendanceStartPhoto(null);
setAttendanceType("");
alert("Start Time attendance marked successfully.");
} catch (err) {
alert("Error marking Start Time: " + err.message);
} finally {
setAttendanceSubmitting(false);
}
};
const submitAttendanceEnd = async () => {
const latest = await fetchTodayAttendance();
if (!latest?.startMarked) {
alert("Please mark Start Time first.");
return;
}
if (latest?.endMarked) {
alert("End Time has already been marked for today.");
return;
}
if (!attendanceEndReading.trim()) {
alert("Please enter Day Out / End reading.");
return;
}
const endReading = Number(attendanceEndReading);
const startReading = Number(latest.startReading);
if (!Number.isFinite(endReading) || endReading < 0) {
alert("Please enter a valid end reading.");
return;
}
if (Number.isFinite(startReading) && endReading < startReading) {
alert("End reading cannot be less than start reading.");
return;
}
if (!attendanceEndPhoto) {
alert("End Time picture is mandatory.");
return;
}
const numberOrZero = (value) => {
const n = Number(value || 0);
return Number.isFinite(n) && n >= 0 ? n : 0;
};
const otherExpense = numberOrZero(attendanceOtherExpense);
const transportExpense = numberOrZero(attendanceTransportExpense);
const foodExpense = numberOrZero(attendanceFoodExpense);
const nightStayExpense = numberOrZero(attendanceNightStayExpense);
setAttendanceSubmitting(true);
try {
const dateValue = getTodayInputDate();
const id = getAttendanceDocId(user?.marketerId, user?.email, dateValue);
await setDoc(doc(db, "attendance", id), {
status: "completed",
endMarked: true,
endTime: getClockTime(),
endReading,
totalKms: Math.max(0, endReading - startReading),
endPhoto: attendanceEndPhoto,
otherExpense,
transportExpense,
foodExpense,
nightStayExpense,
otherExpensePhoto: attendanceOtherExpensePhoto || null,
transportExpensePhoto: attendanceTransportExpensePhoto || null,
foodExpensePhoto: attendanceFoodExpensePhoto || null,
nightStayExpensePhoto: attendanceNightStayExpensePhoto || null,
endCreatedAt: serverTimestamp(),
updatedAt: serverTimestamp()
}, { merge: true });
await fetchTodayAttendance();
setAttendanceEndReading("");
setAttendanceEndPhoto(null);
setAttendanceOtherExpense("");
setAttendanceTransportExpense("");
setAttendanceFoodExpense("");
setAttendanceNightStayExpense("");
setAttendanceOtherExpensePhoto(null);
setAttendanceTransportExpensePhoto(null);
setAttendanceFoodExpensePhoto(null);
setAttendanceNightStayExpensePhoto(null);
setAttendanceType("");
alert("End Time attendance marked successfully.");
} catch (err) {
alert("Error marking End Time: " + err.message);
} finally {
setAttendanceSubmitting(false);
}
};
const submitAttendanceLeave = async () => {
const reason = attendanceLeaveReason.trim();
if (!reason) {
alert("Please enter leave reason.");
return;
}
const latest = await fetchTodayAttendance();
if (latest?.startMarked || latest?.endMarked) {
alert("Attendance has already been started for today. Leave cannot be submitted now.");
return;
}
setAttendanceSubmitting(true);
try {
const dateValue = getTodayInputDate();
const id = getAttendanceDocId(user?.marketerId, user?.email, dateValue);
await setDoc(doc(db, "attendance", id), {
marketerId: user?.marketerId || "",
marketerEmail: user?.email || "",
marketerName: user?.name || user?.email || "Marketer",
designation: user?.designation || "Regional Manager",
date: dateValue,
status: "leave",
leaveReason: reason,
leaveTime: getClockTime(),
leaveCreatedAt: serverTimestamp(),
updatedAt: serverTimestamp()
}, { merge: true });
await fetchTodayAttendance();
setAttendanceLeaveReason("");
setAttendanceType("");
alert("Leave submitted successfully.");
} catch (err) {
alert("Error submitting leave: " + err.message);
} finally {
setAttendanceSubmitting(false);
}
};
const openAttendanceForm = async () => {
resetAttendanceForm();
await fetchTodayAttendance();
setMarketerview("attendance");
};
const downloadAttendanceExcel = () => {
const rows = getFilteredAttendance();
if (!rows.length) {
alert("No attendance records found in the selected range.");
return;
}
if (!window.XLSX) {
alert("Excel library is still loading. Please try again in a moment.");
return;
}
const formatted = rows.map((r, idx) => ({
"SR#": idx + 1,
"SALE OFFICER": r.marketerName || r.marketerEmail || "Marketer",
"AREA NAME": r.areaName || "N/A",
"DAY IN": `${formatActionPlanDate(r.date)}${r.startTime ? ` ${formatTime12(r.startTime)}` : ""}`,
"DAY OUT": r.endTime ? `${formatActionPlanDate(r.date)} ${formatTime12(r.endTime)}` : "N/A",
"START": r.startReading ?? "N/A",
"END": r.endReading ?? "N/A",
"KMS": r.endMarked ? getAttendanceTotalKms(r) : "N/A",
"ASSIGNED KMS": getAttendanceAssignedKms(r),
"RATE": getAttendancePetrolRate(r) === null ? "N/A" : getAttendancePetrolRate(r),
"PETROL EXPENSE": getAttendancePetrolExpense(r),
"TRANSPORT": Number(r.transportExpense || 0),
"NIGHT STAY": Number(r.nightStayExpense || 0),
"FOOD": Number(r.foodExpense || 0),
"OTHER EXPENSE": Number(r.otherExpense || 0),
"TOTAL OTHER EXPENSE": getAttendanceTotalOtherExpense(r),
"DAY IN PROOF": r.startPhoto ? "Available" : "Not uploaded",
"DAY OUT PROOF": r.endPhoto ? "Available" : "Not uploaded",
"TRANSPORT PROOF": r.transportExpensePhoto ? "Available" : "Not uploaded",
"NIGHT STAY PROOF": r.nightStayExpensePhoto ? "Available" : "Not uploaded",
"FOOD PROOF": r.foodExpensePhoto ? "Available" : "Not uploaded",
"OTHER PROOF": r.otherExpensePhoto ? "Available" : "Not uploaded"
}));
const worksheet = mergedReportSheet(window.XLSX, formatted, "Attendance Report");
worksheet["!cols"] = Object.keys(formatted[0]).map((key) => ({
wch: key.includes("PROOF") ? 18 : key === "SALE OFFICER" ? 22 : key === "AREA NAME" ? 20 : 14
}));
const workbook = window.XLSX.utils.book_new();
window.XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
window.XLSX.writeFile(workbook, `Attendance_${adminAttendanceFromDate || "All"}_to_${adminAttendanceToDate || "All"}.xlsx`);
};
const downloadAttendancePDF = () => {
const rows = getFilteredAttendance();
if (!rows.length) { alert("No attendance records found in the selected range."); return; }
try {
const clean=(v)=>String(v??"N/A").replace(/[\r\n]+/g," ").trim()||"N/A",ascii=(v)=>clean(v).replace(/[^\x20-\x7E]/g,"?");
const PAGE_W=841.89,PAGE_H=595.28,MM=72/25.4,LEFT=7,RIGHT=290,TABLE_TOP=38,CONTENT_BOTTOM=193;
const columns=[["SR#",7],["SALE OFFICER",32],["AREA NAME",28],["DAY IN",24],["DAY OUT",24],["START",12],["END",12],["ASSIGNED KMS",18],["KMS",11],["RATE",15],["PETROL EXPENSE",20],["TRANSPORT",15],["NIGHT STAY",15],["FOOD",13],["OTHER",13],["TOTAL OTHER EXPENSE",24]];
const esc=(v)=>ascii(v).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)"),textWidth=(txt,size)=>ascii(txt).length*size*.50,wrapText=(value,maxWidth,size)=>{const txt=ascii(value),maxChars=Math.max(1,Math.floor(maxWidth/(size*.50))),words=txt.split(/\s+/),lines=[];let line="";words.forEach(word=>{const cand=line?`${line} ${word}`:word;if(cand.length<=maxChars)line=cand;else{if(line)lines.push(line);line=word;}});if(line)lines.push(line);return lines.length?lines:["N/A"];};
const topToPdfY=(top)=>PAGE_H-top*MM,rectCmd=(x,top,w,h,stroke=.45,fill=null)=>{const parts=[];if(fill)parts.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);parts.push(`${stroke} w`,`${(x*MM).toFixed(2)} ${(PAGE_H-(top+h)*MM).toFixed(2)} ${(w*MM).toFixed(2)} ${(h*MM).toFixed(2)} re`,fill?"B":"S");return parts.join("\n");},drawText=(x,top,txt,size=6.2,align="center",bold=false)=>{let xx=x*MM,width=textWidth(txt,size);if(align==="center")xx-=width/2;if(align==="right")xx-=width;return `BT ${bold?"/F2":"/F1"} ${size} Tf ${pdfTextFill(top, 52)} rg 1 0 0 1 ${xx.toFixed(2)} ${(topToPdfY(top)-size*.80).toFixed(2)} Tm (${esc(txt)}) Tj ET`;},drawWrapped=(x,top,w,h,txt,size=4.8,bold=false)=>{const innerWidth=Math.max(2*MM,w*MM-4.6*MM),lines=wrapText(txt,innerWidth,size),lineH=size*1.16,maxLines=Math.max(1,Math.floor((h*MM-3.3*MM)/lineH)),visible=lines.slice(0,maxLines);if(lines.length>maxLines&&visible.length){const last=visible[visible.length-1];visible[visible.length-1]=`${last.slice(0,Math.max(1,last.length-3))}..`;}const blockH=visible.length*lineH,startTop=top+Math.max(1.8,(h*MM-blockH)/MM/2+size*.62/MM);return visible.map((line,i)=>drawText(x+w/2,startTop+i*lineH/MM,line,size,"center",bold)).join("\n");};
const pages=[],rangeLabel=`${adminAttendanceFromDate?formatActionPlanDate(adminAttendanceFromDate):"All"} to ${adminAttendanceToDate?formatActionPlanDate(adminAttendanceToDate):"All"}`;
const makeHeader=()=>{const c=[];c.push(rectCmd(LEFT,5,RIGHT-LEFT,24,.55,PDF_BANNER),drawText(148.5,9,"JAVED PUBLISHERS",18,"center",true),drawText(148.5,15.5,"DAILY ATTENDANCE REPORT",11.5,"center",true),drawText(10,22.5,`Report Date: ${new Date().toLocaleDateString("en-GB")}`,6.5,"left"),drawText(148.5,22.5,`Total Records: ${rows.length}`,6.5,"center"),drawText(287,22.5,`Range: ${rangeLabel}`,6.0,"right"),drawText(148.5,32.2,"Petrol Expense = Total KMs / Assigned KMs per Litre x Petrol Rate for that date",5.2,"center"));const topH=6,subH=8;let x=LEFT;[0,1,2,3,4].forEach(idx=>{const[h,w]=columns[idx];c.push(rectCmd(x,TABLE_TOP,w,topH+subH,.55,PDF_TABLE_HEAD),drawWrapped(x,TABLE_TOP,w,topH+subH,h,4.75,true));x+=w;});const readingsW=columns.slice(5,9).reduce((a,b)=>a+b[1],0);c.push(rectCmd(x,TABLE_TOP,readingsW,topH,.55,PDF_TABLE_HEAD),drawWrapped(x,TABLE_TOP,readingsW,topH,"READINGS",4.8,true));let sx=x;columns.slice(5,9).forEach(([h,w])=>{c.push(rectCmd(sx,TABLE_TOP+topH,w,subH,.55,PDF_TABLE_SUBHEAD),drawWrapped(sx,TABLE_TOP+topH,w,subH,h,4.35,true));sx+=w;});x+=readingsW;const petrolW=columns.slice(9,11).reduce((a,b)=>a+b[1],0);c.push(rectCmd(x,TABLE_TOP,petrolW,topH,.55,PDF_TABLE_HEAD),drawWrapped(x,TABLE_TOP,petrolW,topH,"PETROL",4.8,true));sx=x;columns.slice(9,11).forEach(([h,w])=>{c.push(rectCmd(sx,TABLE_TOP+topH,w,subH,.55,PDF_TABLE_SUBHEAD),drawWrapped(sx,TABLE_TOP+topH,w,subH,h,4.2,true));sx+=w;});x+=petrolW;const expenseW=columns.slice(11,16).reduce((a,b)=>a+b[1],0);c.push(rectCmd(x,TABLE_TOP,expenseW,topH,.55,PDF_TABLE_HEAD),drawWrapped(x,TABLE_TOP,expenseW,topH,"EXPENSES",4.8,true));sx=x;columns.slice(11,16).forEach(([h,w])=>{c.push(rectCmd(sx,TABLE_TOP+topH,w,subH,.55,PDF_TABLE_SUBHEAD),drawWrapped(sx,TABLE_TOP+topH,w,subH,h,4.15,true));sx+=w;});return{content:c,y:TABLE_TOP+topH+subH};};
let page=makeHeader();pages.push(page);const drawCell=(x,top,w,h,val,bold=false,size=4.35,fill=null)=>{page.content.push(rectCmd(x,top,w,h,.42,fill),drawWrapped(x,top,w,h,val,size,bold));};
const people=groupRowsByMarketerAndDate(rows,{getDateValue:(r)=>r?.date});
people.forEach((person,personIndex)=>{const flat=[];[...person.dates.entries()].forEach(([dateKey,entries])=>entries.forEach((item,itemIndex)=>flat.push({dateKey,item,itemIndex})));let offset=0;while(offset<flat.length){let available=CONTENT_BOTTOM-page.y;if(available<8.8){page=makeHeader();pages.push(page);available=CONTENT_BOTTOM-page.y;}const chunk=[];let used=0;for(let i=offset;i<flat.length;i++){const e=flat[i],r=e.item,petrolExpense=getAttendancePetrolExpense(r),vals=[r.areaName||"-",`${formatActionPlanDate(r.date)}${r.startTime?` ${formatTime12(r.startTime)}`:""}`,r.endTime?`${formatActionPlanDate(r.date)} ${formatTime12(r.endTime)}`:"-",r.startReading??"-",r.endReading??"-",getAttendanceAssignedKms(r),r.endMarked?getAttendanceTotalKms(r):"-",getAttendancePetrolRate(r)===null?"-":`Rs. ${getAttendancePetrolRate(r)}`,petrolExpense==="—"?"-":`Rs. ${petrolExpense}`,Number(r.transportExpense||0),Number(r.nightStayExpense||0),Number(r.foodExpense||0),Number(r.otherExpense||0),`Rs. ${getAttendanceTotalOtherExpense(r)}`],widths=columns.slice(2).map(c=>c[1]),h=Math.min(19,Math.max(8.8,...vals.map((v,k)=>3.2+wrapText(v,Math.max(2*MM,widths[k]*MM-4.6*MM),4.35).length*2.75)));if(chunk.length&&used+h>available)break;if(!chunk.length&&h>available)break;chunk.push({...e,h,vals});used+=h;}if(!chunk.length){page=makeHeader();pages.push(page);continue;}drawCell(LEFT,page.y,7,used,personIndex+1,true,4.45,[.985,.985,.985]);drawCell(LEFT+7,page.y,32,used,person.name,true,4.45,[.985,.985,.985]);let yy=page.y;chunk.forEach((e,idx)=>{let x=LEFT+39,fill=idx%2?[.995,.995,.995]:null;e.vals.forEach((v,k)=>{drawCell(x,yy,columns[k+2][1],e.h,v,false,4.35,fill);x+=columns[k+2][1];});yy+=e.h;});page.y+=used;offset+=chunk.length;}});
const totalKms=rows.reduce((sum,row)=>{if(!row?.endMarked)return sum;const value=Number(getAttendanceTotalKms(row));return Number.isFinite(value)?sum+value:sum;},0),totalPetrolExpense=rows.reduce((sum,row)=>{const value=Number(getAttendancePetrolExpense(row));return Number.isFinite(value)?sum+value:sum;},0),totalOtherExpense=rows.reduce((sum,row)=>{const value=Number(getAttendanceTotalOtherExpense(row));return Number.isFinite(value)?sum+value:sum;},0),totalRowH=8.5;if(page.y+totalRowH>CONTENT_BOTTOM){page=makeHeader();pages.push(page);}const totalStartIndex=7;let totalX=LEFT+columns.slice(0,totalStartIndex).reduce((sum,col)=>sum+col[1],0);for(let i=totalStartIndex;i<columns.length;i++){let value="";if(i===7)value="TOTAL";else if(i===8)value=totalKms.toFixed(1).replace(/\.0$/,"");else if(i===10)value=`Rs. ${totalPetrolExpense.toFixed(2)}`;else if(i===15)value=`Rs. ${totalOtherExpense.toFixed(2)}`;page.content.push(rectCmd(totalX,page.y,columns[i][1],totalRowH,.55,[.995,.945,.955]));if(value)page.content.push(drawWrapped(totalX,page.y,columns[i][1],totalRowH,value,4.7,true));totalX+=columns[i][1];}page.y+=totalRowH;
pages.forEach((pg,idx)=>{pg.content.push(rectCmd(LEFT,197,RIGHT-LEFT,10,.45,PDF_FOOTER),drawText(148.5,203,"Created by Ali Ashfaq",7.5,"center",true),drawText(10,203,"Daily Attendance Report",6.3,"left"),drawText(287,203,`Page ${idx+1} of ${pages.length}`,6.3,"right"));});
const objects=[],addObject=(body)=>{objects.push(body);return objects.length;},f1=addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),f2=addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),contentIds=[],pageIds=[];pages.forEach(pg=>{const stream=pg.content.join("\n")+"\n";contentIds.push(addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));pageIds.push(0);});const pagesId=addObject("");pages.forEach((pg,i)=>{pageIds[i]=addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`);});objects[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;const catalogId=addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);let pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",offsets=[0];objects.forEach((obj,i)=>{offsets[i+1]=pdf.length;pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;});const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;const bytes=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&0xff;const blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`Attendance_Report_${new Date().toISOString().slice(0,10)}.pdf`;a.style.display="none";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
} catch(err){console.error("Attendance PDF error:",err);alert("Attendance PDF could not be downloaded.");}
};
return { attendanceType, setAttendanceType, attendanceStartReading, setAttendanceStartReading, attendanceEndReading, setAttendanceEndReading, attendanceLeaveReason, setAttendanceLeaveReason, attendanceOtherExpense, setAttendanceOtherExpense, attendanceTransportExpense, setAttendanceTransportExpense, attendanceFoodExpense, setAttendanceFoodExpense, attendanceNightStayExpense, setAttendanceNightStayExpense, attendanceStartPhoto, setAttendanceStartPhoto, attendanceEndPhoto, setAttendanceEndPhoto, attendanceOtherExpensePhoto, setAttendanceOtherExpensePhoto, attendanceTransportExpensePhoto, setAttendanceTransportExpensePhoto, attendanceFoodExpensePhoto, setAttendanceFoodExpensePhoto, attendanceNightStayExpensePhoto, setAttendanceNightStayExpensePhoto, attendanceCameraTarget, setAttendanceCameraTarget, attendanceCameraActive, setAttendanceCameraActive, attendanceSubmitting, setAttendanceSubmitting, todayAttendance, setTodayAttendance, attendanceRecords, setAttendanceRecords, adminAttendanceFromDate, setAdminAttendanceFromDate, adminAttendanceToDate, setAdminAttendanceToDate, adminAttendanceSearch, setAdminAttendanceSearch, adminAttendanceMarketerFilter, setAdminAttendanceMarketerFilter, attendancePetrolRates, setAttendancePetrolRates, adminAttendancePetrolRate, setAdminAttendancePetrolRate, attendanceMediaFromDate, setAttendanceMediaFromDate, attendanceMediaToDate, setAttendanceMediaToDate, selectedAttendanceMediaIds, setSelectedAttendanceMediaIds, attendanceMediaMarketer, setAttendanceMediaMarketer, attendanceVideoRef, getAttendanceDocId, fetchTodayAttendance, fetchAttendanceRecords, getFilteredAttendance, getFilteredAttendanceMedia, softDeleteAttendanceMedia, deleteSelectedAttendanceMedia, getAttendanceTotalKms, getAttendancePetrolRate, getAttendanceAssignedKms, getAttendancePetrolExpense, getAttendanceTotalOtherExpense, saveAttendancePetrolRate, saveAttendanceAssignedKms, startAttendanceCamera, stopAttendanceCamera, captureAttendancePhoto, submitAttendanceStart, submitAttendanceEnd, submitAttendanceLeave, openAttendanceForm, downloadAttendanceExcel, downloadAttendancePDF };
}
