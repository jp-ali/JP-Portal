import { useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, Timestamp, where } from "firebase/firestore";
import { db } from "../../services/firebase";

export function useVisitData({ user, getAccessibleVisitMarketers, fetchMarketersByIds, isDateInRange, setMarketerview, setSelectedAdminMarketerBox }) {
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
const reportsCache = useRef({ rows: null, loadedAt: 0, pending: null });
const reportsScope = useRef("all");
const requestedReportsScope = useRef("all");
const todayReportsCache = useRef({ key: "", rows: null, loadedAt: 0, pending: null });
const marketerReportsCache = useRef({ key: "", rows: null, loadedAt: 0, pending: null });
const samplesCache = useRef({ rows: null, loadedAt: 0, pending: null });
const marketerSamplesCache = useRef({ key: "", rows: null, loadedAt: 0, pending: null });
const fetchAllReports = (force = false) => {
requestedReportsScope.current = "all";
const cache = reportsCache.current;
if (!force && cache.rows && Date.now() - cache.loadedAt < 30000) {
if (reportsScope.current === "today") { setReports(cache.rows); reportsScope.current = "all"; }
return Promise.resolve(cache.rows);
}
if (cache.pending) return force ? cache.pending.then(() => fetchAllReports(true)) : cache.pending;
cache.pending = (async () => {
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
if (requestedReportsScope.current === "all") { setReports(list); reportsScope.current = "all"; }
cache.rows = list;
cache.loadedAt = Date.now();
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
const fetchTodayReports = (force = false) => {
requestedReportsScope.current = "today";
const start = new Date();
start.setHours(0, 0, 0, 0);
const end = new Date(start);
end.setDate(end.getDate() + 1);
const full = reportsCache.current;
if (!force && full.rows && Date.now() - full.loadedAt < 30000) {
const rows = full.rows.filter((row) => {
const date = row.createdAt?.toDate?.();
return date && date >= start && date < end;
});
setReports(rows);
reportsScope.current = "today";
return Promise.resolve(rows);
}
const cache = todayReportsCache.current;
const key = start.toISOString();
if (!force && cache.key === key && cache.rows && Date.now() - cache.loadedAt < 30000) { setReports(cache.rows); reportsScope.current = "today"; return Promise.resolve(cache.rows); }
if (cache.pending && cache.key === key) return force ? cache.pending.then(() => fetchTodayReports(true)) : cache.pending;
cache.key = key;
cache.pending = (async () => {
try {
const snap = await getDocs(query(collection(db, "visits"), where("createdAt", ">=", Timestamp.fromDate(start)), where("createdAt", "<", Timestamp.fromDate(end))));
const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
rows.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0));
if (cache.key === key) {
cache.rows = rows;
cache.loadedAt = Date.now();
if (requestedReportsScope.current === "today") { setReports(rows); reportsScope.current = "today"; }
}
return rows;
} catch (error) {
console.error("Today visits fetch error:", error);
return fetchAllReports().then((rows) => rows.filter((row) => {
const date = row.createdAt?.toDate?.();
return date && date >= start && date < end;
}));
} finally {
if (cache.key === key) cache.pending = null;
}
})();
return cache.pending;
};
const fetchMarketerReportsForEmails = (emails = [], force = false) => {
const emailMap = new Map();
(emails || []).filter(Boolean).forEach((email) => emailMap.set(String(email).toLowerCase(), String(email)));
const uniqueEmails = [...emailMap.values()];
if (!uniqueEmails.length) {
setMarketerReports([]);
return Promise.resolve([]);
}
const cache = marketerReportsCache.current;
const key = uniqueEmails.map((email) => email.toLowerCase()).sort().join("|");
if (!force && cache.key === key && cache.rows && Date.now() - cache.loadedAt < 30000) return Promise.resolve(cache.rows);
if (cache.pending && cache.key === key) return force ? cache.pending.then(() => fetchMarketerReportsForEmails(emails, true)) : cache.pending;
if (cache.key !== key) { cache.key = key; cache.rows = null; cache.loadedAt = 0; }
cache.pending = (async () => {
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
if (cache.key === key) {
setMarketerReports(list);
cache.rows = list;
cache.loadedAt = Date.now();
}
return list;
} catch (err) {
console.error("Marketer reports fetch error:", err);
return cache.rows || [];
} finally {
if (cache.key === key) cache.pending = null;
}
})();
return cache.pending;
};
const fetchMarketerReports = (mEmail, force = false) => fetchMarketerReportsForEmails([mEmail], force);
const openVisitHistory = async () => {
setMarketerview("range-visits");
setMarketerFromDate("");
setMarketerToDate("");
setSelectedAdminMarketerBox(null);
setVisitHistoryPickerOpen(false);
const ownId = user?.marketerId ? [user.marketerId] : [];
setSelectedVisitHistoryMarketerIds(ownId);
const subordinateIds = Array.isArray(user?.subordinateMarketerIds) ? user.subordinateMarketerIds : [];
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
const fetchAllSamples = (force = false) => {
const cache = samplesCache.current;
if (!force && cache.rows && Date.now() - cache.loadedAt < 30000) return Promise.resolve(cache.rows);
if (cache.pending) return force ? cache.pending.then(() => fetchAllSamples(true)) : cache.pending;
cache.pending = (async () => {
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
cache.rows = list;
cache.loadedAt = Date.now();
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
const fetchMarketerSamples = (mEmail, force = false) => {
const cache = marketerSamplesCache.current;
const key = String(mEmail || "").toLowerCase();
if (!force && cache.key === key && cache.rows && Date.now() - cache.loadedAt < 30000) return Promise.resolve(cache.rows);
if (cache.pending && cache.key === key) return force ? cache.pending.then(() => fetchMarketerSamples(mEmail, true)) : cache.pending;
if (cache.key !== key) { cache.key = key; cache.rows = null; cache.loadedAt = 0; }
cache.pending = (async () => {
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
if (cache.key === key) {
setMarketerSamples(list);
cache.rows = list;
cache.loadedAt = Date.now();
}
return list;
} catch (err) {
console.error(err);
return cache.rows || [];
} finally {
if (cache.key === key) cache.pending = null;
}
})();
return cache.pending;
};
const handleDeleteVisit = async (id, isAdmin = false) => {
if (window.confirm("Are you sure you want to delete this visit report?")) {
try {
await deleteDoc(doc(db, "visits", id));
if (isAdmin) {
fetchAllReports(true);
} else {
fetchMarketerReports(user.email, true);
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
await fetchMarketerReports(user.email, true);
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
fetchAllSamples(true);
} else {
fetchMarketerSamples(user.email, true);
}
alert("Sample report deleted successfully.");
} catch (err) {
alert("Error deleting sample: " + err.message);
}
}
};
return { selectedMarketerVisitIds, setSelectedMarketerVisitIds, longPressTimer, setLongPressTimer, marketerFromDate, setMarketerFromDate, marketerToDate, setMarketerToDate, selectedVisitHistoryMarketerIds, setSelectedVisitHistoryMarketerIds, visitHistoryPickerOpen, setVisitHistoryPickerOpen, reports, setReports, marketerReports, setMarketerReports, samples, setSamples, marketerSamples, setMarketerSamples, fetchAllReports, fetchTodayReports, fetchMarketerReportsForEmails, fetchMarketerReports, openVisitHistory, getVisitHistoryFilteredReports, fetchAllSamples, fetchMarketerSamples, handleDeleteVisit, toggleMarketerVisitSelection, startMarketerVisitLongPress, handleDeleteSample };
}
