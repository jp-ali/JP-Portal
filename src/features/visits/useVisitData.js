import { useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { getSession } from "../../services/authApi";

export function useVisitData({ user, setUser, getAccessibleVisitMarketers, fetchMarketersByIds, isDateInRange, setMarketerview, setSelectedAdminMarketerBox }) {
const [selectedMarketerVisitIds, setSelectedMarketerVisitIds] = useState([]);
const [longPressTimer, setLongPressTimer] = useState(null);
const [marketerFromDate, setMarketerFromDate] = useState("");
const [marketerToDate, setMarketerToDate] = useState("");
const [selectedVisitHistoryMarketerIds, setSelectedVisitHistoryMarketerIds] = useState([]);
const [visitHistoryPickerOpen, setVisitHistoryPickerOpen] = useState(false);
const [reports, setReports] = useState([]);
const [marketerReports, setMarketerReports] = useState([]);
const [samples, setSamples] = useState([]);
const [marketerSamples, setMarketerSamples] = useState([]);
const fetchAllReports = async () => {
try {
const querySnapshot = await getDocs(collection(db, "visits"));
const list = [];
querySnapshot.forEach((docSnap) => {
list.push({ id: docSnap.id, ...docSnap.data() });
});
list.sort((a, b) => {
const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
return timeA - timeB;
});
setReports(list);
} catch (err) {
console.error(err);
}
};
const fetchMarketerReportsForEmails = async (emails = []) => {
const emailMap = new Map();
(emails || []).filter(Boolean).forEach((email) => emailMap.set(String(email).toLowerCase(), String(email)));
const uniqueEmails = [...emailMap.values()];
if (!uniqueEmails.length) {
setMarketerReports([]);
return [];
}
try {
const snapshots = await Promise.all(uniqueEmails.map((email) =>
getDocs(query(collection(db, "visits"), where("marketerEmail", "==", email)))
));
const list = [];
snapshots.forEach((snap) => snap.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() })));
list.sort((a, b) => {
const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
return timeA - timeB;
});
setMarketerReports(list);
return list;
} catch (err) {
console.error("Marketer reports fetch error:", err);
return [];
}
};
const fetchMarketerReports = async (mEmail) => fetchMarketerReportsForEmails([mEmail]);
const openVisitHistory = async () => {
setMarketerview("range-visits");
setMarketerFromDate("");
setMarketerToDate("");
setSelectedAdminMarketerBox(null);
setVisitHistoryPickerOpen(false);
const ownId = user?.marketerId ? [user.marketerId] : [];
setSelectedVisitHistoryMarketerIds(ownId);
let subordinateIds = Array.isArray(user?.subordinateMarketerIds) ? user.subordinateMarketerIds : [];
if (user?.marketerId) {
try {
const profileData = await getSession();
if (profileData?.role === "marketer") {
subordinateIds = Array.isArray(profileData.subordinateMarketerIds) ? profileData.subordinateMarketerIds.filter(Boolean) : [];
setUser((prev) => ({ ...prev, subordinateMarketerIds: subordinateIds }));
}
} catch (_) {}
}
const accessibleProfiles = await fetchMarketersByIds([user?.marketerId, ...subordinateIds]);
const emails = [...new Set([user?.email, ...accessibleProfiles.map((m) => m.email)].filter(Boolean))];
await fetchMarketerReportsForEmails(emails);
};
const getVisitHistoryFilteredReports = () => {
const accessible = getAccessibleVisitMarketers();
const selectedIds = selectedVisitHistoryMarketerIds.length ? selectedVisitHistoryMarketerIds : (user?.marketerId ? [user.marketerId] : []);
const selectedEmails = new Set(accessible.filter((m) => selectedIds.includes(m.id)).map((m) => String(m.email || "").toLowerCase()));
return marketerReports.filter((r) => {
if (!r.createdAt) return false;
if (!isDateInRange(r.createdAt, marketerFromDate, marketerToDate)) return false;
return selectedEmails.has(String(r.marketerEmail || "").toLowerCase());
});
};
const fetchAllSamples = async () => {
try {
const querySnapshot = await getDocs(collection(db, "samples"));
const list = [];
querySnapshot.forEach((docSnap) => {
list.push({ id: docSnap.id, ...docSnap.data() });
});
list.sort((a, b) => {
const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
return timeA - timeB;
});
setSamples(list);
} catch (err) {
console.error(err);
}
};
const fetchMarketerSamples = async (mEmail) => {
try {
const querySnapshot = await getDocs(query(collection(db, "samples"), where("marketerEmail", "==", mEmail)));
const list = [];
querySnapshot.forEach((docSnap) => {
list.push({ id: docSnap.id, ...docSnap.data() });
});
list.sort((a, b) => {
const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
return timeA - timeB;
});
setMarketerSamples(list);
} catch (err) {
console.error(err);
}
};
const handleDeleteVisit = async (id, isAdmin = false) => {
if (window.confirm("Are you sure you want to delete this visit report?")) {
try {
await deleteDoc(doc(db, "visits", id));
if (isAdmin) {
fetchAllReports();
} else {
fetchMarketerReports(user.email);
}
alert("Visit report deleted successfully.");
} catch (err) {
alert("Error deleting visit: " + err.message);
}
}
};
const toggleMarketerVisitSelection = (id) => {
setSelectedMarketerVisitIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
};
const startMarketerVisitLongPress = (id) => {
if (longPressTimer) clearTimeout(longPressTimer);
const timer = setTimeout(() => {
toggleMarketerVisitSelection(id);
setLongPressTimer(null);
}, 3000);
setLongPressTimer(timer);
};
const cancelMarketerVisitLongPress = () => {
if (longPressTimer) {
clearTimeout(longPressTimer);
setLongPressTimer(null);
}
};
const deleteSelectedMarketerVisits = async () => {
if (!selectedMarketerVisitIds.length) return;
if (!window.confirm(`Delete ${selectedMarketerVisitIds.length} selected visit report(s)?`)) return;
try {
await Promise.all(selectedMarketerVisitIds.map(id => deleteDoc(doc(db, "visits", id))));
setSelectedMarketerVisitIds([]);
await fetchMarketerReports(user.email);
alert("Selected visit reports deleted successfully.");
} catch (err) {
alert("Error deleting selected visits: " + err.message);
}
};
const handleDeleteSample = async (id, isAdmin = false) => {
if (window.confirm("Are you sure you want to delete this sample report?")) {
try {
await deleteDoc(doc(db, "samples", id));
if (isAdmin) {
fetchAllSamples();
} else {
fetchMarketerSamples(user.email);
}
alert("Sample report deleted successfully.");
} catch (err) {
alert("Error deleting sample: " + err.message);
}
}
};
return { selectedMarketerVisitIds, setSelectedMarketerVisitIds, longPressTimer, setLongPressTimer, marketerFromDate, setMarketerFromDate, marketerToDate, setMarketerToDate, selectedVisitHistoryMarketerIds, setSelectedVisitHistoryMarketerIds, visitHistoryPickerOpen, setVisitHistoryPickerOpen, reports, setReports, marketerReports, setMarketerReports, samples, setSamples, marketerSamples, setMarketerSamples, fetchAllReports, fetchMarketerReportsForEmails, fetchMarketerReports, openVisitHistory, getVisitHistoryFilteredReports, fetchAllSamples, fetchMarketerSamples, handleDeleteVisit, toggleMarketerVisitSelection, startMarketerVisitLongPress, handleDeleteSample };
}
