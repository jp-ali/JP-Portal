import { createReportTables } from "./ui/reportTables.jsx";
import PortalLoading from "./ui/PortalLoading.jsx";
import { globalStyle, containerStyle, cardStyle, inputStyle, btnPrimary, footerStyle, renderRedSkeleton, renderBrandingStrip, renderMarketerPersonIcon, renderLogoutArrowIcon, renderResponsiveStyles, renderBackgroundStationary } from "./ui/portalPresentation.jsx";
import { useMediaTrash } from "./features/media/useMediaTrash.js";
import { useVisitFormState } from "./features/visits/useVisitFormState.js";
import { createVisitFormActions } from "./features/visits/visitFormActions.js";
import { useVisitData } from "./features/visits/useVisitData.js";
import { useVerificationCalls } from "./features/verification/useVerificationCalls.js";
import { useMarketers } from "./features/marketers/useMarketers.js";
import { useLocationAssignments } from "./features/locations/useLocationAssignments.js";
import { useLocationCatalog } from "./features/locations/useLocationCatalog.js";
import { useAttendance } from "./features/attendance/useAttendance.js";
import { useActionPlans } from "./features/actionPlans/useActionPlans.js";
import { formatActionPlanDate } from "./domain/dates.js";
import { useExpenseReports } from "./features/expenses/useExpenseReports.js";
import { useCatalogues } from "./features/catalogues/useCatalogues.js";
import { createReportExporters } from "./services/reportExports.js";
import adminCss from "./styles/admin.css?raw";
import adminModernCss from "./styles/adminModern.css?raw";
import portalShellCss from "./styles/portalShell.css?raw";
import marketerCss from "./styles/marketer.css?raw";
import React, { lazy, Suspense, useState, useRef, useEffect, useLayoutEffect } from "react";
import { db } from "./services/firebase";
import { request } from "./services/authApi.js";
import { cacheOfflineVisitCatalog } from "./services/offlineVisitCatalog.js";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
const AdminPortal = lazy(() => import("./pages/AdminPortal.jsx"));
const MarketerPortal = lazy(() => import("./pages/MarketerPortal.jsx"));
export default function PortalApp({ initialUser, onLogout, onSync, syncState, online }) {
const [user, setUser] = useState(initialUser);
const [adminView, setAdminView] = useState("home");
const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
const [marketerSidebarOpen, setMarketerSidebarOpen] = useState(false);
const [selectedMarketerForVisits, setSelectedMarketerForVisits] = useState(null);
const [editingVisit, setEditingVisit] = useState(null);
const [marketerView, setMarketerview] = useState("home");
const [expandedReportKey, setExpandedReportKey] = useState("");
const homeEscapeCountRef = useRef({ count: 0, lastAt: 0 });
useEffect(() => { homeEscapeCountRef.current = { count: 0, lastAt: 0 }; }, [adminView, marketerView, expandedReportKey]);
useEffect(() => {
if (!expandedReportKey) { document.body.classList.remove("report-fullscreen-active"); return; }
const previousOverflow = document.body.style.overflow;
document.body.style.overflow = "hidden";
document.body.classList.add("report-fullscreen-active");
setAdminSidebarOpen(false);
setMarketerSidebarOpen(false);
return () => {
document.body.style.overflow = previousOverflow;
document.body.classList.remove("report-fullscreen-active");
};
}, [expandedReportKey]);
useEffect(() => { setExpandedReportKey(""); }, [adminView, marketerView]);
useEffect(() => {
  if (!expandedReportKey) return;
  let observer;
  const frame = requestAnimationFrame(() => {
    const report = document.querySelector(".admin-report-expanded");
    if (!report) return;
    const showTable = () => {
      const table = report.querySelector(".pdf-like-table-shell, .table-scroll, .attendance-admin-table-wrap");
      if (!table) return false;
      const toolbar = report.querySelector(".report-expanded-toolbar");
      report.scrollTop += table.getBoundingClientRect().top - report.getBoundingClientRect().top - (toolbar?.offsetHeight || 0) - 16;
      return true;
    };
    if (!showTable()) {
      observer = new MutationObserver(() => {
        if (showTable()) observer.disconnect();
      });
      observer.observe(report, { childList: true, subtree: true });
    }
  });
  return () => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
  };
}, [expandedReportKey]);
const [selectedAdminMarketerBox, setSelectedAdminMarketerBox] = useState(null);
const [selectedAdminAllBoxKey, setSelectedAdminAllBoxKey] = useState(null);
const [selectedMarketerDetailBox, setSelectedMarketerDetailBox] = useState(null);
const [selectedAdminSampleMarketerBox, setSelectedAdminSampleMarketerBox] = useState(null);
const [selectedAdminSampleSchoolBox, setSelectedAdminSampleSchoolBox] = useState(null);
const [marketerSearch, setMarketerSearch] = useState("");
const [deleteSearch, setDeleteSearch] = useState("");
const [visitSearch, setVisitSearch] = useState("");
const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");
const [allVisitsFromDate, setAllVisitsFromDate] = useState("");
const [allVisitsToDate, setAllVisitsToDate] = useState("");
const [selectedMarketersFilter, setSelectedMarketersFilter] = useState([]);
const [adminSampleFromDate, setAdminSampleFromDate] = useState("");
const [adminSampleToDate, setAdminSampleToDate] = useState("");
const [adminSampleMarketersFilter, setAdminSampleMarketersFilter] = useState([]);
const [sampleHistoryFromDate, setSampleHistoryFromDate] = useState("");
const [sampleHistoryToDate, setSampleHistoryToDate] = useState("");
const [sampleHistorySearch, setSampleHistorySearch] = useState("");
const [assignmentAreaFocusId, setAssignmentAreaFocusId] = useState("");
const getTodayInputDate = () => {
const d = new Date();
const y = d.getFullYear();
const m = String(d.getMonth() + 1).padStart(2, "0");
const day = String(d.getDate()).padStart(2, "0");
return `${y}-${m}-${day}`;
};
const visitForm = useVisitFormState();
const { visitCityId, setVisitCityId, visitAreaId, setVisitAreaId, visitSchoolIds, setVisitSchoolIds, visitCitySearch, setVisitCitySearch, visitAreaSearch, setVisitAreaSearch, visitSchoolSearch, setVisitSchoolSearch, visitSession, setVisitSession, visitBranches, setVisitBranches, visitStrength, setVisitStrength, visitCityPickerOpen, setVisitCityPickerOpen, visitAreaPickerOpen, setVisitAreaPickerOpen, visitSchoolPickerOpen, setVisitSchoolPickerOpen, visitAddSchoolOpen, setVisitAddSchoolOpen, visitSchoolManagerOpen, setVisitSchoolManagerOpen, visitSchoolsLoading, setVisitSchoolsLoading, visitSchoolLoadError, setVisitSchoolLoadError, schoolName, setSchoolName, principalName, setPrincipalName, phone, setPhone, purpose, setPurpose, notes, setNotes, imageFile, setImageFile, loading, setLoading, successMsg, setSuccessMsg, sampleSchoolName, setSampleSchoolName, samplePrincipalName, setSamplePrincipalName, samplePhone, setSamplePhone, sampleDetailsText, setSampleDetailsText, sampleLoading, setSampleLoading, sampleSuccessMsg, setSampleSuccessMsg, isCameraActive, setIsCameraActive, videoRef, streamRef } = visitForm;
const { catalogues, catalogueTitle, setCatalogueTitle, catalogueFile, setCatalogueFile, catalogueUploading, catalogueUploadProgress, catalogueLoading, catalogueActionId, catalogueSearch, setCatalogueSearch, catalogueFileInputRef, fetchCatalogues, formatCatalogueFileSize, handleUploadCatalogue, viewCatalogue, downloadCatalogue, deleteCatalogue, getFilteredCatalogues } = useCatalogues(user);
const pdfTemplateRef = useRef(null);
const [pdfExportData, setPdfExportData] = useState([]);
const getDateKey = (value) => {
if (!value) return "";
let d;
if (value?.toDate) d = value.toDate();
else if (value instanceof Date) d = value;
else d = new Date(value);
if (Number.isNaN(d.getTime())) return "";
const y = d.getFullYear();
const m = String(d.getMonth() + 1).padStart(2, "0");
const day = String(d.getDate()).padStart(2, "0");
return `${y}-${m}-${day}`;
};
const formatTime12 = (value, fallback = "N/A") => {
if (value === null || value === undefined || value === "") return fallback;
try {
const dateValue = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
return dateValue.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
const raw = String(value).trim();
const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
if (match) {
let hour = Number(match[1]);
const minute = match[2];
const suffix = match[4]?.toUpperCase();
if (suffix) {
if (hour === 0) hour = 12;
return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
}
const period = hour >= 12 ? "PM" : "AM";
hour = hour % 12 || 12;
return `${String(hour).padStart(2, "0")}:${minute} ${period}`;
}
const parsed = new Date(raw);
if (!Number.isNaN(parsed.getTime())) {
return parsed.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
return raw || fallback;
} catch (_) {
return String(value || fallback);
}
};
const isDateInRange = (value, fromDate, toDate) => {
const key = getDateKey(value);
if (!key) return false;
if (fromDate && key < fromDate) return false;
if (toDate && key > toDate) return false;
return true;
};
const getMarketerName = (email, fallback = "N/A") => {
if (!email) return fallback;
const found = marketersList.find(m => String(m.email || "").toLowerCase() === String(email).toLowerCase());
return found?.name || fallback;
};
const { downloadExcel, downloadPDF, downloadSingleSample, downloadMarketersExcel, downloadMarketersPDF } = createReportExporters({ formatTime12, getMarketerName });
const handleLogout = onLogout;
const fetchDeletedMedia = async () => {
try {
const snap = await getDocs(collection(db, "deleted_media"));
const list = [];
snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
list.sort((a,b) => {
const ta = a.deletedAt?.toDate ? a.deletedAt.toDate().getTime() : 0;
const tb = b.deletedAt?.toDate ? b.deletedAt.toDate().getTime() : 0;
return tb - ta;
});
setDeletedMedia(list);
} catch (err) { console.error(err); }
};
const groupRowsByMarketerAndDate = (rows, options = {}) => {
const list = Array.isArray(rows) ? rows : [];
const people = [];
const personMap = new Map();
const dateOf = (item) => {
const raw = options.getDateValue ? options.getDateValue(item) : (item?.createdAt || item?.date || item?.updatedAt || "");
if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
return getDateKey(raw) || String(raw || "N/A");
};
list.forEach((item) => {
const name = options.getName ? options.getName(item) : getMarketerName(item?.marketerEmail, item?.marketerName || item?.marketerEmail || "N/A");
const rawKey = options.getPersonKey ? options.getPersonKey(item) : (item?.marketerId || item?.marketerEmail || name);
const personKey = String(rawKey || name || "N/A").trim().toLowerCase();
const dateKey = dateOf(item) || "N/A";
if (!personMap.has(personKey)) {
const person = { key: personKey, name, dates: new Map(), total: 0 };
personMap.set(personKey, person);
people.push(person);
}
const person = personMap.get(personKey);
if (!person.dates.has(dateKey)) person.dates.set(dateKey, []);
person.dates.get(dateKey).push(item);
person.total += 1;
});
return people;
};

const { citiesList, setCitiesList, areasList, setAreasList, schoolsList, setSchoolsList, cityCatalogSyncing, setCityCatalogSyncing, cityCatalogSyncMessage, setCityCatalogSyncMessage, areaSyncingCityId, setAreaSyncingCityId, areaSyncMessage, setAreaSyncMessage, schoolSyncingAreaId, setSchoolSyncingAreaId, schoolSyncMessage, setSchoolSyncMessage, mergeSchoolsIntoState, readCachedSchoolsForArea, mergeAreasIntoState, readCachedAreasForCity, fetchAreasForCity, fetchAreasForCities, getLightBaseCities, mergeCitiesIntoState, fetchLocationCatalog, fetchCitiesByIds, isUsableSchoolRecord, fetchSchoolsForArea, prefetchAssignedAreaSchools, ensurePakistanCitiesSeeded, syncPakistanCitiesFromOpenStreetMap, syncAreasForCityFromOpenStreetMap, syncSchoolsForAreaFromOpenStreetMap } = useLocationCatalog({ visitAreaId, visitCityId, assignmentAreaFocusId, setSchoolName, setVisitSchoolIds, setVisitSchoolLoadError, setVisitSchoolSearch, setVisitSchoolsLoading });
const { assignedCityIds, setAssignedCityIds, assignedAreaIds, setAssignedAreaIds, assignedSchoolIds, setAssignedSchoolIds, assignmentCityFocusId, setAssignmentCityFocusId, adminCitySearch, setAdminCitySearch, adminAreaSearch, setAdminAreaSearch, adminSchoolSearch, setAdminSchoolSearch, newCityName, setNewCityName, newAreaName, setNewAreaName, newSchoolName, setNewSchoolName, adminCityAssignOpen, setAdminCityAssignOpen, adminAreaAssignOpen, setAdminAreaAssignOpen, editingVisitSchoolId, setEditingVisitSchoolId, editingVisitSchoolName, setEditingVisitSchoolName, handleAddVisitSchool, isOwnManualSchool, startEditVisitSchool, cancelEditVisitSchool, saveEditedVisitSchool, removeOwnVisitSchool, resetMarketerAssignmentForm, resetVisitAssignmentForm, getValidMarketerAssignments, toggleCityAssignment, toggleAreaAssignment, toggleSchoolAssignment, handleAddCity, handleAddArea, handleAddSchool, refreshLoggedInMarketerAssignments } = useLocationAssignments({ user, setUser, assignmentAreaFocusId, setAssignmentAreaFocusId, citiesList, areasList, schoolsList, fetchAreasForCity, fetchSchoolsForArea, mergeCitiesIntoState, readCachedAreasForCity, readCachedSchoolsForArea, syncAreasForCityFromOpenStreetMap, setAreaSyncMessage, setSchoolSyncMessage, visitAreaId, visitCityId, visitSchoolIds, setVisitAreaId, setVisitCityId, setVisitSchoolIds, setSchoolName, setVisitAddSchoolOpen, setVisitAreaPickerOpen, setVisitAreaSearch, setVisitCityPickerOpen, setVisitCitySearch, setVisitSchoolLoadError, setVisitSchoolManagerOpen, setVisitSchoolPickerOpen, setVisitSchoolSearch, setVisitSession });
const { marketerName, setMarketerName, marketerPhone, setMarketerPhone, marketerEmail, setMarketerEmail, marketerPass, setMarketerPass, marketerDesignation, setMarketerDesignation, marketerAssignedKms, setMarketerAssignedKms, subordinateMarketerIds, setSubordinateMarketerIds, subordinatePickerOpen, setSubordinatePickerOpen, subordinateSearch, setSubordinateSearch, marketerWhatsappGroupName, setMarketerWhatsappGroupName, marketerWhatsappGroupLink, setMarketerWhatsappGroupLink, marketersList, setMarketersList, deletedMarketersList, setDeletedMarketersList, editingId, setEditingId, editingReturnToMarketerDetails, setEditingReturnToMarketerDetails, fetchMarketers, fetchMarketersByIds, getAccessibleVisitMarketers, fetchDeletedMarketers, handleSaveMarketer, handleEditMarketer, handleDeleteMarketer, handlePermanentDeleteMarketer, handleRestoreMarketer } = useMarketers({ user, fetchCitiesByIds, fetchAreasForCities, fetchLocationCatalog, getValidMarketerAssignments, resetMarketerAssignmentForm, setAdminView, setAssignedAreaIds, setAssignedCityIds, setAssignedSchoolIds, setAssignmentAreaFocusId, setAssignmentCityFocusId, setAdminAreaAssignOpen, setAdminAreaSearch, setAdminCityAssignOpen, setAdminCitySearch, setAdminSchoolSearch, setNewAreaName, setNewCityName, setNewSchoolName });
useEffect(() => { if (user?.role === "admin") fetchMarketers(); }, [user?.role]);
useEffect(() => { cacheOfflineVisitCatalog(user, citiesList, areasList, schoolsList); }, [user?.email, user?.assignedCityIds, user?.assignedAreaIds, citiesList, areasList, schoolsList]);
useEffect(() => {
  if (user?.role !== "marketer" || !online) return;
  const timer = window.setTimeout(async () => {
    await Promise.allSettled([fetchLocationCatalog(), fetchAreasForCities(user.assignedCityIds || [])]);
    for (const areaId of [...new Set(user.assignedAreaIds || [])]) await fetchSchoolsForArea(areaId);
  }, 1500);
  return () => window.clearTimeout(timer);
}, [user?.email, online]);
const { selectedMarketerVisitIds, setSelectedMarketerVisitIds, longPressTimer, setLongPressTimer, marketerFromDate, setMarketerFromDate, marketerToDate, setMarketerToDate, selectedVisitHistoryMarketerIds, setSelectedVisitHistoryMarketerIds, visitHistoryPickerOpen, setVisitHistoryPickerOpen, reports, setReports, marketerReports, setMarketerReports, samples, setSamples, marketerSamples, setMarketerSamples, fetchAllReports, fetchTodayReports, fetchMarketerReportsForEmails, fetchMarketerReports, openVisitHistory, getVisitHistoryFilteredReports, fetchAllSamples, fetchMarketerSamples, handleDeleteVisit, toggleMarketerVisitSelection, startMarketerVisitLongPress, handleDeleteSample } = useVisitData({ user, getAccessibleVisitMarketers, fetchMarketersByIds, isDateInRange, setMarketerview, setSelectedAdminMarketerBox });
useEffect(() => {
  if (user?.role === "marketer" && syncState?.syncedAt) fetchMarketerReports(user.email, true).catch(() => {});
}, [syncState?.syncedAt, user?.email]);
const canEditVisitToday = (visit) => {
  if (user?.role === "admin") return true;
  const ownsVisit = visit.marketerId ? visit.marketerId === user?.marketerId : String(visit.marketerEmail || "").toLowerCase() === String(user?.email || "").toLowerCase();
  return ownsVisit && getDateKey(visit.createdAt) === getTodayInputDate();
};
const saveVisitEdit = async (id, values) => {
  await request(`/visits/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) });
  const applyUpdate = (rows) => rows.map((row) => row.id === id ? { ...row, ...values, schoolNames: [values.schoolName] } : row);
  setReports(applyUpdate);
  setMarketerReports(applyUpdate);
  if (user?.role === "admin") fetchAllReports(true).catch(() => {});
  else fetchMarketerReportsForEmails([...new Set([user.email, ...marketerReports.map((row) => row.marketerEmail)].filter(Boolean))], true).catch(() => {});
};
const activeMedia = reports.filter((report) => report.image);
const { verificationFromDate, setVerificationFromDate, verificationToDate, setVerificationToDate, verificationMarketerIds, setVerificationMarketerIds, verificationPickerOpen, setVerificationPickerOpen, verificationSavingId, setVerificationSavingId, verificationRemarkOptions, openVerificationCalls, getFilteredVerificationRows, saveVerificationRemark, downloadVerificationExcel, downloadVerificationPDF } = useVerificationCalls({ reports, setReports, marketersList, fetchAllReports, fetchMarketers, formatTime12, getMarketerName, getTodayInputDate, groupRowsByMarketerAndDate, setAdminView, setExpandedReportKey, isDateInRange });
const { attendanceType, setAttendanceType, attendanceStartReading, setAttendanceStartReading, attendanceEndReading, setAttendanceEndReading, attendanceLeaveReason, setAttendanceLeaveReason, attendanceOtherExpense, setAttendanceOtherExpense, attendanceTransportExpense, setAttendanceTransportExpense, attendanceFoodExpense, setAttendanceFoodExpense, attendanceNightStayExpense, setAttendanceNightStayExpense, attendanceStartPhoto, setAttendanceStartPhoto, attendanceEndPhoto, setAttendanceEndPhoto, attendanceOtherExpensePhoto, setAttendanceOtherExpensePhoto, attendanceTransportExpensePhoto, setAttendanceTransportExpensePhoto, attendanceFoodExpensePhoto, setAttendanceFoodExpensePhoto, attendanceNightStayExpensePhoto, attendanceCameraTarget, setAttendanceCameraTarget, attendanceCameraActive, setAttendanceCameraActive, attendanceSubmitting, setAttendanceSubmitting, todayAttendance, setTodayAttendance, attendanceRecords, setAttendanceRecords, adminAttendanceFromDate, setAdminAttendanceFromDate, adminAttendanceToDate, setAdminAttendanceToDate, adminAttendanceSearch, setAdminAttendanceSearch, adminAttendanceMarketerFilter, setAdminAttendanceMarketerFilter, attendancePetrolRates, setAttendancePetrolRates, adminAttendancePetrolRate, setAdminAttendancePetrolRate, attendanceMediaFromDate, setAttendanceMediaFromDate, attendanceMediaToDate, setAttendanceMediaToDate, selectedAttendanceMediaIds, setSelectedAttendanceMediaIds, attendanceMediaMarketer, setAttendanceMediaMarketer, attendanceVideoRef, getAttendanceDocId, fetchTodayAttendance, fetchAttendanceRecords, getFilteredAttendance, getFilteredAttendanceMedia, softDeleteAttendanceMedia, deleteSelectedAttendanceMedia, getAttendanceTotalKms, getAttendancePetrolRate, getAttendanceAssignedKms, getAttendancePetrolExpense, getAttendanceTotalOtherExpense, saveAttendancePetrolRate, saveAttendanceAssignedKms, startAttendanceCamera, stopAttendanceCamera, captureAttendancePhoto, submitAttendanceStart, submitAttendanceEnd, submitAttendanceLeave, openAttendanceForm, downloadAttendanceExcel, downloadAttendancePDF } = useAttendance({ user, getTodayInputDate, formatTime12, groupRowsByMarketerAndDate, setMarketerview, fetchDeletedMedia, fetchMarketers });
const { openAddVisit, selectVisitArea, toggleVisitSchool, startCamera, stopCamera, capturePhoto, retakePhoto, handleSubmitVisit, handleSubmitSample } = createVisitFormActions({ form: visitForm, user, setUser, setMarketerview, fetchTodayAttendance, areasList, citiesList, schoolsList, isUsableSchoolRecord, resetVisitAssignmentForm, fetchMarketerReports, fetchMarketerSamples, fetchCitiesByIds, fetchAreasForCities, formatTime12, refreshLoggedInMarketerAssignments, setEditingVisitSchoolId, setEditingVisitSchoolName, setNewSchoolName, setSchoolSyncMessage });
const { fullScreenImage, setFullScreenImage, mediaMarketer, setMediaMarketer, selectedMediaIds, setSelectedMediaIds, selectedDeletedMediaIds, setSelectedDeletedMediaIds, deletedMedia, setDeletedMedia, mediaView, setMediaView, fullScreenMediaRecord, setFullScreenMediaRecord, softDeleteMedia, bulkDeleteMedia, restoreMedia, restoreSelectedMedia, permanentlyDeleteMedia, permanentlyDeleteAllMedia, handleDeletePicture } = useMediaTrash({ user, reports, fetchAllReports, fetchMarketerReports, fetchAttendanceRecords, fetchDeletedMedia, getMarketerName });
const portalSide = user?.role === "admin" ? "admin" : "marketer";
const portalView = portalSide === "admin" ? adminView : marketerView;
const routeParts = [portalSide, portalView];
if (portalSide === "admin") {
  if (adminView === "today-visits" && selectedAdminMarketerBox) routeParts.push(selectedAdminMarketerBox);
  if (adminView === "visits" && selectedAdminAllBoxKey) routeParts.push(selectedAdminAllBoxKey);
  if (adminView === "sample-details") {
    if (selectedAdminSampleMarketerBox) routeParts.push(selectedAdminSampleMarketerBox);
    if (selectedAdminSampleSchoolBox) routeParts.push(selectedAdminSampleSchoolBox);
  }
  if (adminView === "marketers-detail" && selectedMarketerDetailBox) routeParts.push(selectedMarketerDetailBox);
  if (adminView === "media") {
    routeParts.push(mediaView);
    if (mediaMarketer) routeParts.push(mediaMarketer);
  }
  if (adminView === "attendance-media" && attendanceMediaMarketer) routeParts.push(attendanceMediaMarketer);
}
const routeKey = JSON.stringify(routeParts);
const routeSnapshot = {
  key: routeKey, view: portalView, selectedAdminMarketerBox, selectedAdminSampleMarketerBox,
  selectedAdminSampleSchoolBox, selectedMarketerDetailBox, mediaView, mediaMarketer,
  attendanceMediaMarketer, selectedAdminAllBoxKey, selectedMarketerForVisits
};
const routeHistoryRef = useRef([routeSnapshot]);
const browserGuardRef = useRef(`jp-portal-${Date.now()}-${Math.random().toString(36).slice(2)}`);
useEffect(() => {
  window.history.pushState({ ...window.history.state, jpPortalGuard: browserGuardRef.current }, "", window.location.href);
}, []);
useEffect(() => {
  const history = routeHistoryRef.current;
  if (history.at(-1)?.key === routeKey) { history[history.length - 1] = routeSnapshot; return; }
  const earlier = history.map((entry) => entry.key).lastIndexOf(routeKey);
  if (earlier >= 0) history.splice(earlier + 1);
  else history.push(routeSnapshot);
}, [routeKey]);
const scrollPositionsRef = useRef(new Map());
const currentRouteKeyRef = useRef(routeKey);
const previousRouteRef = useRef(routeParts);
useEffect(() => {
  const rememberScroll = () => scrollPositionsRef.current.set(currentRouteKeyRef.current, window.scrollY);
  rememberScroll();
  window.addEventListener("scroll", rememberScroll, { passive: true });
  return () => window.removeEventListener("scroll", rememberScroll);
}, [routeKey]);
useLayoutEffect(() => {
  const previousParts = previousRouteRef.current;
  const previousKey = JSON.stringify(previousParts);
  currentRouteKeyRef.current = routeKey;
  if (previousKey === routeKey) return;
  previousRouteRef.current = routeParts;
  const returningToParent = previousParts.length > routeParts.length && routeParts.every((part, index) => previousParts[index] === part);
  const target = portalView === "home" || returningToParent ? scrollPositionsRef.current.get(routeKey) || 0 : 0;
  window.scrollTo(0, target);
  const frame = requestAnimationFrame(() => window.scrollTo(0, target));
  return () => cancelAnimationFrame(frame);
}, [routeKey]);
useEffect(() => {
  const goBack = () => {
    const cardClose = document.querySelector(".card-designer-preview-modal .card-designer-preview-dialog-head button");
    if (cardClose) { cardClose.click(); return true; }
    if (fullScreenImage) {
      setFullScreenImage(null);
      setFullScreenMediaRecord(null);
      return true;
    }
    const escapeClose = document.querySelector('[data-escape-close][aria-expanded="true"]');
    if (escapeClose) { escapeClose.click(); return true; }
    if (editingVisit) { setEditingVisit(null); return true; }
    if (expandedReportKey) { setExpandedReportKey(""); return true; }
    if (adminSidebarOpen || marketerSidebarOpen) {
      setAdminSidebarOpen(false);
      setMarketerSidebarOpen(false);
      return true;
    }
    const activeView = user?.role === "admin" ? adminView : marketerView;
    if (activeView === "home") return false;
    const history = routeHistoryRef.current;
    const previous = history.length > 1 ? (history.pop(), history.at(-1)) : null;
    if (user?.role !== "admin") {
      if (marketerView === "attendance") stopAttendanceCamera();
      if (marketerView === "add-visit") stopCamera();
      setMarketerview(previous?.view || "home");
      setSelectedMarketerForVisits(previous?.selectedMarketerForVisits || null);
    } else {
      if (previous) {
        setSelectedAdminMarketerBox(previous.selectedAdminMarketerBox);
        setSelectedAdminSampleMarketerBox(previous.selectedAdminSampleMarketerBox);
        setSelectedAdminSampleSchoolBox(previous.selectedAdminSampleSchoolBox);
        setSelectedMarketerDetailBox(previous.selectedMarketerDetailBox);
        setMediaView(previous.mediaView);
        setMediaMarketer(previous.mediaMarketer);
        setAttendanceMediaMarketer(previous.attendanceMediaMarketer);
        setSelectedAdminAllBoxKey(previous.selectedAdminAllBoxKey);
        setSelectedMarketerForVisits(previous.selectedMarketerForVisits);
      }
      setAdminView(previous?.view || "home");
    }
    return true;
  };
  const onKeyDown = (event) => {
    if (event.key !== "Escape") { homeEscapeCountRef.current = { count: 0, lastAt: 0 }; return; }
    if (event.repeat) return;
    if (document.querySelector(".card-designer-preview-modal")) return;
    event.preventDefault();
    if (goBack()) {
      homeEscapeCountRef.current = { count: 0, lastAt: 0 };
    } else {
      const now = Date.now();
      const previous = homeEscapeCountRef.current;
      const count = now - previous.lastAt <= 2500 ? previous.count + 1 : 1;
      homeEscapeCountRef.current = { count, lastAt: now };
      if (count >= 3) {
        homeEscapeCountRef.current = { count: 0, lastAt: 0 };
        onLogout();
      }
    }
  };
  const onBrowserBack = () => {
    window.history.pushState({ ...window.history.state, jpPortalGuard: browserGuardRef.current }, "", window.location.href);
    homeEscapeCountRef.current = { count: 0, lastAt: 0 };
    goBack();
  };
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("popstate", onBrowserBack);
  return () => { window.removeEventListener("keydown", onKeyDown, true); window.removeEventListener("popstate", onBrowserBack); };
}, [editingVisit, fullScreenImage, expandedReportKey, adminSidebarOpen, marketerSidebarOpen, user?.role, adminView, marketerView, setFullScreenImage, setFullScreenMediaRecord, stopAttendanceCamera, stopCamera, onLogout]);
const { actionPlanDate, setActionPlanDate, actionPlanAreaText, setActionPlanAreaText, actionPlanPurpose, setActionPlanPurpose, actionPlanSubmitting, actionPlanSuccess, adminActionPlanFromDate, setAdminActionPlanFromDate, adminActionPlanToDate, setAdminActionPlanToDate, adminActionPlanMarketerIds, setAdminActionPlanMarketerIds, buildActionPlanMessage, fetchActionPlans, getFilteredActionPlans, downloadActionPlanExcel, downloadActionPlanPDF, openActionPlanForm, handleSendActionPlan, handleDeleteActionPlan } = useActionPlans({ user, setUser, setMarketerview, marketersList, getTodayInputDate, formatTime12, groupRowsByMarketerAndDate, fetchTodayAttendance, getAttendanceDocId });
const { expenseReportFromDate, setExpenseReportFromDate, expenseReportToDate, setExpenseReportToDate, expenseReportLoading, getMarketerExpensePetrol, adminExpenseFromDate, setAdminExpenseFromDate, adminExpenseToDate, setAdminExpenseToDate, adminExpenseMarketerIds, setAdminExpenseMarketerIds, adminExpenseRows, setAdminExpenseRows, adminExpenseLoading, fetchMarketerExpenseReport, openExpenseReport, getFilteredExpenseReportRows, downloadExpenseReportExcel, downloadExpenseReportPDF, fetchAdminExpenseReport, openAdminExpenseReport, getFilteredAdminExpenseRows, getAdminExpenseValues, getAdminExpenseMarketerName, downloadAdminExpenseExcel, downloadAdminExpensePDF } = useExpenseReports({ user, setMarketerview, setAdminView, marketersList, fetchMarketers, getDateKey, formatActionPlanDate, formatTime12, groupRowsByMarketerAndDate });
const { renderVisitReportTable, renderSampleReportTable, renderActionPlanReportTable, renderVerificationReportTable, renderAttendanceReportTable } = createReportTables({ formatActionPlanDate, formatTime12, getAttendanceAssignedKms, getAttendancePetrolExpense, getAttendanceTotalKms, getAttendanceTotalOtherExpense, getTodayInputDate, groupRowsByMarketerAndDate, handleDeleteActionPlan, inputStyle, saveAttendanceAssignedKms, saveVerificationRemark, setFullScreenImage, setReports, verificationRemarkOptions, verificationSavingId });
const reportViewClass = (key) => expandedReportKey === key ? "admin-report-view admin-report-expanded" : "admin-report-view";
const renderReportExpandButton = (key, title = "Expand report") => expandedReportKey === key ? null : (
<button type="button" className="report-expand-btn" title={title} aria-label={title} onClick={() => {
  setAdminSidebarOpen(false);
  setMarketerSidebarOpen(false);
  setExpandedReportKey(key);
}}>
<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
</button>
);
const renderExpandedReportChrome = (key) => {
if (expandedReportKey !== key) return null;
let excelAction = null;
let pdfAction = null;
let refreshAction = null;
if (key === "attendance") { excelAction = downloadAttendanceExcel; pdfAction = downloadAttendancePDF; }
else if (key === "verification-calls") { excelAction = downloadVerificationExcel; pdfAction = downloadVerificationPDF; }
else if (key === "action-plans") { excelAction = downloadActionPlanExcel; pdfAction = downloadActionPlanPDF; }
else if (key === "expense-report") { excelAction = downloadAdminExpenseExcel; pdfAction = downloadAdminExpensePDF; }
else if (key === "marketer-expense") { excelAction = downloadExpenseReportExcel; pdfAction = downloadExpenseReportPDF; }
else if (key === "sample-details") {
const list = samples.filter((item) => {
if (!item.createdAt || !isDateInRange(item.createdAt, adminSampleFromDate, adminSampleToDate)) return false;
if (selectedAdminSampleMarketerBox && item.marketerEmail !== selectedAdminSampleMarketerBox) return false;
if (adminSampleMarketersFilter.length && !adminSampleMarketersFilter.includes(item.marketerEmail)) return false;
return true;
});
excelAction = () => downloadExcel(list, "Selected_Samples_Report.xlsx");
pdfAction = () => downloadPDF(list);
}
else if (key === "today-visits") {
refreshAction = () => fetchTodayReports(true);
const todayReports = reports.filter((r) => r.createdAt && getDateKey(r.createdAt) === getDateKey(new Date()));
const list = selectedAdminMarketerBox ? todayReports.filter((item) => item.marketerEmail === selectedAdminMarketerBox) : todayReports;
excelAction = () => downloadExcel(list, selectedAdminMarketerBox ? `${selectedAdminMarketerBox}_Today_Visits.xlsx` : "All_Today_Visits.xlsx");
pdfAction = () => downloadPDF(list);
}
else if (key === "visits") {
const list = reports.filter((item) => item.createdAt && isDateInRange(item.createdAt, allVisitsFromDate, allVisitsToDate) && (!selectedMarketersFilter.length || selectedMarketersFilter.includes(item.marketerEmail)));
excelAction = () => downloadExcel(list, "Selected_Visits_Report.xlsx");
pdfAction = () => downloadPDF(list);
}
else if (key === "marketers-detail") {
const list = selectedMarketerDetailBox ? marketersList.filter((item) => item.id === selectedMarketerDetailBox) : marketersList.filter((item) => { const q = marketerSearch.toLowerCase(); return (item.name && item.name.toLowerCase().includes(q)) || (item.email && item.email.toLowerCase().includes(q)); });
const selected = list[0];
const safeName = String(selected?.name || "All_Marketers").replace(/[^a-z0-9_-]+/gi, "_");
excelAction = () => downloadMarketersExcel(list, selectedMarketerDetailBox ? `${safeName}_Marketer_Details.xlsx` : "All_Marketers_Details.xlsx", citiesList);
pdfAction = () => downloadMarketersPDF(list, selectedMarketerDetailBox ? `${safeName}_Marketer_Details` : "All_Marketers_Details", citiesList);
}
else if (key === "marketer-samples") {
const list = marketerSamples.filter((item) => { if (sampleHistorySearch && !String(item.schoolName || "").toLowerCase().includes(sampleHistorySearch.toLowerCase())) return false; return !!item.createdAt && isDateInRange(item.createdAt, sampleHistoryFromDate, sampleHistoryToDate); });
excelAction = () => downloadExcel(list, "Sample_History.xlsx");
pdfAction = () => downloadPDF(list);
}
else if (key === "marketer-today-visits") {
refreshAction = () => fetchMarketerReports(user.email, true);
const list = marketerReports.filter((item) => { if (!item.createdAt) return false; const d = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt); const now = new Date(); return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
excelAction = () => downloadExcel(list, "My_Today_Visits.xlsx");
pdfAction = () => downloadPDF(list);
}
else if (key === "marketer-visit-history") {
excelAction = () => downloadExcel(getVisitHistoryFilteredReports(), "Visit_History.xlsx");
pdfAction = () => downloadPDF(getVisitHistoryFilteredReports());
}
return (
<div className="report-expanded-toolbar">
<button type="button" className="report-expanded-back" onClick={() => setExpandedReportKey("")} title="Back" aria-label="Back">
<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
</button>
{(refreshAction || excelAction || pdfAction) && <div className="report-expanded-exports">
{refreshAction && <button type="button" className="white-refresh-btn" onClick={refreshAction} title="Refresh today's visits" aria-label="Refresh today's visits" style={{ width: 32, minWidth: 32, padding: 0, background: "#fff", color: "#7a0f2b", border: "1px solid #ddcbd0", fontSize: 18 }}>↻</button>}
{excelAction && <button type="button" className="report-expanded-excel" onClick={excelAction}>Excel</button>}
{pdfAction && <button type="button" className="report-expanded-pdf" onClick={pdfAction}>PDF</button>}
</div>}
</div>
);
};
if (user.role === "admin") return <Suspense fallback={<PortalLoading />}><AdminPortal context={{
    setUser,
    activeMedia,
    adminActionPlanFromDate,
    adminActionPlanMarketerIds,
    adminActionPlanToDate,
    adminAreaAssignOpen,
    adminAreaSearch,
    adminAttendanceFromDate,
    adminAttendanceMarketerFilter,
    adminAttendancePetrolRate,
    adminAttendanceToDate,
    adminCityAssignOpen,
    adminCitySearch,
    adminCss: `${adminCss}\n${adminModernCss}\n${portalShellCss}`,
    adminExpenseFromDate,
    adminExpenseLoading,
    adminExpenseMarketerIds,
    setAdminExpenseMarketerIds,
    getAdminExpenseMarketerName,
    adminExpenseToDate,
    adminSampleFromDate,
    adminSampleMarketersFilter,
    adminSampleToDate,
    adminSidebarOpen,
    adminView,
    allVisitsFromDate,
    allVisitsToDate,
    areaSyncMessage,
    areaSyncingCityId,
    areasList,
    assignedAreaIds,
    assignedCityIds,
    assignmentCityFocusId,
    attendanceMediaFromDate,
    attendanceMediaMarketer,
    attendanceMediaToDate,
    btnPrimary,
    bulkDeleteMedia,
    cardStyle,
    catalogueActionId,
    catalogueFileInputRef,
    catalogueLoading,
    catalogueSearch,
    catalogueTitle,
    catalogueUploadProgress,
    catalogueUploading,
    citiesList,
    containerStyle,
    db,
    deleteCatalogue,
    deleteDoc,
    deleteSearch,
    deleteSelectedAttendanceMedia,
    deletedMarketersList,
    deletedMedia,
    doc,
    downloadActionPlanExcel,
    downloadActionPlanPDF,
    downloadAdminExpenseExcel,
    downloadAdminExpensePDF,
    downloadAttendanceExcel,
    downloadAttendancePDF,
    downloadCatalogue,
    downloadExcel,
    downloadMarketersExcel,
    downloadMarketersPDF,
    downloadPDF,
    downloadSingleSample,
    downloadVerificationExcel,
    downloadVerificationPDF,
    editingId,
    editingReturnToMarketerDetails,
    fetchActionPlans,
    fetchAdminExpenseReport,
    fetchAllReports,
    fetchTodayReports,
    fetchAllSamples,
    fetchAreasForCity,
    fetchAttendanceRecords,
    fetchCatalogues,
    fetchDeletedMarketers,
    fetchDeletedMedia,
    fetchLocationCatalog,
    fetchMarketers,
    footerStyle,
    formatActionPlanDate,
    formatCatalogueFileSize,
    formatTime12,
    fullScreenImage,
    fullScreenMediaRecord,
    getDateKey,
    getFilteredActionPlans,
    getFilteredAdminExpenseRows,
    getAdminExpenseValues,
    getFilteredAttendance,
    getFilteredAttendanceMedia,
    getFilteredCatalogues,
    getFilteredVerificationRows,
    getMarketerName,
    groupRowsByMarketerAndDate,
    getTodayInputDate,
    globalStyle,
    handleAddArea,
    handleAddCity,
    handleDeleteMarketer,
    handleDeletePicture,
    handleDeleteSample,
    handleDeleteVisit,
    canEditVisitToday,
    editingVisit,
    setEditingVisit,
    saveVisitEdit,
    handleEditMarketer,
    handleLogout,
    handlePermanentDeleteMarketer,
    handleRestoreMarketer,
    handleSaveMarketer,
    handleUploadCatalogue,
    inputStyle,
    isDateInRange,
    marketerAssignedKms,
    marketerDesignation,
    marketerEmail,
    marketerName,
    marketerPass,
    marketerPhone,
    marketerSearch,
    marketersList,
    setMarketersList,
    mediaMarketer,
    mediaView,
    newAreaName,
    newCityName,
    openAdminExpenseReport,
    openVerificationCalls,
    pdfExportData,
    pdfTemplateRef,
    permanentlyDeleteAllMedia,
    permanentlyDeleteMedia,
    portalSkeletonLoading: false,
    readCachedAreasForCity,
    renderActionPlanReportTable,
    renderAttendanceReportTable,
    renderBackgroundStationary,
    renderBrandingStrip,
    renderExpandedReportChrome,
    renderLogoutArrowIcon,
    renderMarketerPersonIcon,
    renderRedSkeleton,
    renderReportExpandButton,
    renderResponsiveStyles,
    renderSampleReportTable,
    renderVerificationReportTable,
    renderVisitReportTable,
    reportViewClass,
    expandedReportKey,
    setExpandedReportKey,
    reports,
    resetMarketerAssignmentForm,
    restoreMedia,
    restoreSelectedMedia,
    samples,
    saveAttendancePetrolRate,
    selectedAdminMarketerBox,
    selectedAdminSampleMarketerBox,
    selectedAdminSampleSchoolBox,
    selectedAttendanceMediaIds,
    selectedDeletedMediaIds,
    selectedMarketerDetailBox,
    selectedMarketersFilter,
    selectedMediaIds,
    setAdminActionPlanFromDate,
    setAdminActionPlanMarketerIds,
    setAdminActionPlanToDate,
    setAdminAreaAssignOpen,
    setAdminAreaSearch,
    setAdminAttendanceFromDate,
    setAdminAttendanceMarketerFilter,
    setAdminAttendancePetrolRate,
    setAdminAttendanceSearch,
    setAdminAttendanceToDate,
    setAdminCityAssignOpen,
    setAdminCitySearch,
    setAdminExpenseFromDate,
    setAdminExpenseRows,
    setAdminExpenseToDate,
    setAdminSampleFromDate,
    setAdminSampleMarketersFilter,
    setAdminSampleToDate,
    setAdminSchoolSearch,
    setAdminSidebarOpen,
    setAdminView,
    setAllVisitsFromDate,
    setAllVisitsToDate,
    setAssignmentAreaFocusId,
    setAssignmentCityFocusId,
    setAttendanceMediaFromDate,
    setAttendanceMediaMarketer,
    setAttendanceMediaToDate,
    setAttendancePetrolRates,
    setCatalogueFile,
    setCatalogueSearch,
    setCatalogueTitle,
    setDeleteSearch,
    setEditingId,
    setEditingReturnToMarketerDetails,
    setFullScreenImage,
    setFullScreenMediaRecord,
    setMarketerAssignedKms,
    setMarketerDesignation,
    setMarketerEmail,
    setMarketerName,
    setMarketerPass,
    setMarketerPhone,
    setMarketerSearch,
    setMarketerWhatsappGroupLink,
    setMarketerWhatsappGroupName,
    setMediaMarketer,
    setMediaView,
    setNewAreaName,
    setNewCityName,
    setSelectedAdminAllBoxKey,
    setSelectedAdminMarketerBox,
    setSelectedAdminSampleMarketerBox,
    setSelectedAdminSampleSchoolBox,
    setSelectedAttendanceMediaIds,
    setSelectedDeletedMediaIds,
    setSelectedMarketerDetailBox,
    setSelectedMarketersFilter,
    setSelectedMediaIds,
    setSubordinateMarketerIds,
    setSubordinatePickerOpen,
    setSubordinateSearch,
    setVerificationFromDate,
    setVerificationMarketerIds,
    setVerificationPickerOpen,
    setVerificationToDate,
    setVisitSearch,
    softDeleteAttendanceMedia,
    softDeleteMedia,
    subordinateMarketerIds,
    subordinatePickerOpen,
    subordinateSearch,
    syncAreasForCityFromOpenStreetMap,
    toggleAreaAssignment,
    toggleCityAssignment,
    verificationFromDate,
    verificationMarketerIds,
    verificationPickerOpen,
    verificationToDate,
    viewCatalogue,
    visitSearch,
    user
}} /></Suspense>;
return <Suspense fallback={<PortalLoading />}><MarketerPortal context={{
    onSync,
    syncState,
    online,
    actionPlanAreaText,
    actionPlanDate,
    actionPlanPurpose,
    actionPlanSubmitting,
    actionPlanSuccess,
    areasList,
    attendanceCameraActive,
    attendanceCameraTarget,
    attendanceEndPhoto,
    attendanceEndReading,
    attendanceFoodExpense,
    attendanceFoodExpensePhoto,
    attendanceLeaveReason,
    attendanceNightStayExpense,
    attendanceNightStayExpensePhoto,
    attendanceOtherExpense,
    attendanceOtherExpensePhoto,
    attendanceStartPhoto,
    attendanceStartReading,
    attendanceSubmitting,
    attendanceTransportExpense,
    attendanceTransportExpensePhoto,
    attendanceType,
    attendanceVideoRef,
    btnPrimary,
    buildActionPlanMessage,
    cancelEditVisitSchool,
    captureAttendancePhoto,
    capturePhoto,
    cardStyle,
    catalogueActionId,
    catalogueLoading,
    catalogueSearch,
    citiesList,
    containerStyle,
    downloadCatalogue,
    downloadExcel,
    downloadExpenseReportExcel,
    downloadExpenseReportPDF,
    downloadPDF,
    editingVisitSchoolId,
    editingVisitSchoolName,
    expenseReportFromDate,
    expenseReportLoading,
    expenseReportToDate,
    fetchAreasForCity,
    fetchCatalogues,
    fetchMarketerExpenseReport,
    fetchMarketerReports,
    fetchMarketerReportsForEmails,
    fetchMarketerSamples,
    fetchSchoolsForArea,
    footerStyle,
    formatActionPlanDate,
    formatCatalogueFileSize,
    formatTime12,
    fullScreenImage,
    fullScreenMediaRecord,
    getAccessibleVisitMarketers,
    getDateKey,
    getFilteredCatalogues,
    getFilteredExpenseReportRows,
    getMarketerExpensePetrol,
    getMarketerName,
    getTodayInputDate,
    getVisitHistoryFilteredReports,
    globalStyle,
    handleAddVisitSchool,
    handleDeletePicture,
    handleDeleteSample,
    handleDeleteVisit,
    canEditVisitToday,
    editingVisit,
    setEditingVisit,
    saveVisitEdit,
    handleLogout,
    handleSendActionPlan,
    handleSubmitSample,
    handleSubmitVisit,
    imageFile,
    inputStyle,
    isCameraActive,
    isDateInRange,
    isOwnManualSchool,
    isUsableSchoolRecord,
    loading,
    marketerCss: `${marketerCss}\n${portalShellCss}`,
    marketerFromDate,
    marketerReports,
    marketerSamples,
    marketerSidebarOpen,
    marketerToDate,
    marketerView,
    newSchoolName,
    notes,
    openActionPlanForm,
    openAddVisit,
    openAttendanceForm,
    openExpenseReport,
    openVisitHistory,
    pdfExportData,
    pdfTemplateRef,
    phone,
    portalSkeletonLoading: false,
    principalName,
    purpose,
    readCachedAreasForCity,
    removeOwnVisitSchool,
    renderBackgroundStationary,
    renderBrandingStrip,
    renderExpandedReportChrome,
    renderLogoutArrowIcon,
    renderMarketerPersonIcon,
    renderRedSkeleton,
    renderReportExpandButton,
    renderResponsiveStyles,
    renderSampleReportTable,
    renderVisitReportTable,
    reportViewClass,
    restoreMedia,
    retakePhoto,
    sampleDetailsText,
    sampleHistoryFromDate,
    sampleHistorySearch,
    sampleHistoryToDate,
    sampleLoading,
    samplePhone,
    samplePrincipalName,
    sampleSchoolName,
    sampleSuccessMsg,
    saveEditedVisitSchool,
    schoolsList,
    selectVisitArea,
    selectedVisitHistoryMarketerIds,
    setActionPlanAreaText,
    setActionPlanDate,
    setActionPlanPurpose,
    setAttendanceEndReading,
    setAttendanceFoodExpense,
    setAttendanceLeaveReason,
    setAttendanceNightStayExpense,
    setAttendanceOtherExpense,
    setAttendanceStartReading,
    setAttendanceTransportExpense,
    setAttendanceType,
    setCatalogueSearch,
    setEditingVisitSchoolId,
    setEditingVisitSchoolName,
    setExpenseReportFromDate,
    setExpenseReportToDate,
    setFullScreenImage,
    setFullScreenMediaRecord,
    setMarketerFromDate,
    setMarketerSidebarOpen,
    setMarketerToDate,
    setMarketerview,
    setNewSchoolName,
    setNotes,
    setPhone,
    setPrincipalName,
    setPurpose,
    setSampleDetailsText,
    setSampleHistoryFromDate,
    setSampleHistorySearch,
    setSampleHistoryToDate,
    setSamplePhone,
    setSamplePrincipalName,
    setSampleSchoolName,
    setSampleSuccessMsg,
    setSchoolName,
    setSelectedAdminMarketerBox,
    setSelectedVisitHistoryMarketerIds,
    setVisitAddSchoolOpen,
    setVisitAreaId,
    setVisitAreaPickerOpen,
    setVisitAreaSearch,
    setVisitCityId,
    setVisitCityPickerOpen,
    setVisitCitySearch,
    setVisitHistoryPickerOpen,
    setVisitSchoolIds,
    setVisitSchoolLoadError,
    setVisitSchoolManagerOpen,
    setVisitSchoolPickerOpen,
    setVisitSchoolSearch,
    setVisitSchoolsLoading,
    setVisitSession,
    softDeleteMedia,
    startAttendanceCamera,
    startCamera,
    startEditVisitSchool,
    stopAttendanceCamera,
    stopCamera,
    submitAttendanceEnd,
    submitAttendanceLeave,
    submitAttendanceStart,
    successMsg,
    syncAreasForCityFromOpenStreetMap,
    todayAttendance,
    toggleVisitSchool,
    user,
    setUser,
    videoRef,
    viewCatalogue,
    visitAddSchoolOpen,
    visitAreaId,
    visitAreaPickerOpen,
    visitAreaSearch,
    visitCityId,
    visitCityPickerOpen,
    visitCitySearch,
    visitHistoryPickerOpen,
    visitSchoolIds,
    visitSchoolLoadError,
    visitSchoolManagerOpen,
    visitSchoolPickerOpen,
    visitSchoolSearch,
    visitSchoolsLoading,
    visitSession,
    visitBranches,
    setVisitBranches,
    visitStrength,
    setVisitStrength
}} /></Suspense>;}
