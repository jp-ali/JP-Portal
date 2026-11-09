import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getAdminProfilePhoto, request } from "../services/authApi.js";
import { btnPrimary, cardStyle, containerStyle, footerStyle, globalStyle, inputStyle, renderLogoutArrowIcon, renderResponsiveStyles } from "../ui/portalPresentation.jsx";
import DashboardHome from "../ui/DashboardHome.jsx";
import DesktopSectionBanner from "../ui/DesktopSectionBanner.jsx";
import PortalTopBar from "../ui/PortalTopBar.jsx";
import PhotoViewer from "../ui/PhotoViewer.jsx";
import TrainerAddVisitPanel from "./trainer/TrainerAddVisitPanel.jsx";
import TrainerPurposeField from "./trainer/TrainerPurposeField.jsx";
import TrainerVisitsPanel from "./trainer/TrainerVisitsPanel.jsx";
import TrainerWeeklyPlanForm from "./trainer/TrainerWeeklyPlanForm.jsx";
import TrainerWeeklyPlans from "./trainer/TrainerWeeklyPlans.jsx";
import TrainerArchivePanel from "./trainer/TrainerArchivePanel.jsx";
import TrainerExpensePanel from "./trainer/TrainerExpensePanel.jsx";
import TrainerDetailsPanel from "./trainer/TrainerDetailsPanel.jsx";
import MonthlyAttendance from "../ui/MonthlyAttendance.jsx";
import MarketerCardPanel from "./marketer/MarketerCardPanel.jsx";
import MarketerSupportPanel from "./marketer/MarketerSupportPanel.jsx";
import MarketerMultiSelect from "../ui/MarketerMultiSelect.jsx";
import { downloadTrainerExcel, downloadTrainerPDF } from "../services/trainerReportExports.js";
import DashboardHiddenPanel from "../ui/DashboardHiddenPanel.jsx";
import { weekDay } from "../domain/trainerWeek.js";
import adminCss from "../styles/admin.css?raw";
import adminModernCss from "../styles/adminModern.css?raw";
import marketerCss from "../styles/marketer.css?raw";
import portalShellCss from "../styles/portalShell.css?raw";
import trainerCss from "../styles/trainer.css?raw";

const sections = [
  { key: "attendance", label: "Attendance", icon: "🕘", tone: "rose", theme: "team" },
  { key: "weekly", label: "All Weekly Plans", icon: "📋", tone: "violet", theme: "reports" },
  { key: "daily", label: "Daily Action Plan", icon: "🗓️", tone: "mint", theme: "reports" }
];
const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const emptyAccount = { name: "", email: "", phone: "", designation: "Trainer", password: "", offlineMode: "trainer" };
const dateTime = (value) => value ? new Date(value).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }) : "—";
const startTime = (value) => value ? new Date(value).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" }) : "—";
const field = (icon, label, content) => <div className="marketer-form-field"><span className="marketer-form-field-icon" aria-hidden="true">{icon}</span><label className="marketer-form-field-body"><span>{label}</span>{content}</label></div>;

export default function TrainerPortal({ user, onLogout, onBack }) {
  const admin = user.role === "admin";
  const [view, setView] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const [oldTrainers, setOldTrainers] = useState([]);
  const [selectedTrainerIds, setSelectedTrainerIds] = useState([]);
  const [selectedTrainerDetailId, setSelectedTrainerDetailId] = useState("");
  const [trainerSearch, setTrainerSearch] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [records, setRecords] = useState([]);
  const [selectedWeeklyId, setSelectedWeeklyId] = useState("");
  const [visits, setVisits] = useState([]);
  const [loadedVisitsKey, setLoadedVisitsKey] = useState("");
  const [account, setAccount] = useState(emptyAccount);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editId, setEditId] = useState("");
  const [plan, setPlan] = useState({ date: localDate(), area: "", purpose: "" });
  const [planSource, setPlanSource] = useState("");
  const [editingWeekly, setEditingWeekly] = useState(null);
  const [attendanceAction, setAttendanceAction] = useState("");
  const [remarks, setRemarks] = useState("");
  const [filter, setFilter] = useState({ from: "", to: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || null);
  const [expandedProfilePhoto, setExpandedProfilePhoto] = useState(null);
  useEffect(() => {
    if (!admin) return undefined;
    let active = true;
    getAdminProfilePhoto().then(({ profilePhoto: photo }) => { if (active) setProfilePhoto(photo); }).catch(() => {});
    return () => { active = false; };
  }, [admin]);
  const [expandedView, setExpandedView] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [loadedRecordsKey, setLoadedRecordsKey] = useState("");
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const recordsRequest = useRef(0);
  const visitsRequest = useRef(0);
  const planDraftEdited = useRef(false);
  const scrollPositions = useRef(new Map());
  const previousView = useRef("home");
  const recordsKey = `${view}|${trainerId}|${filter.from}|${filter.to}`;
  const selectedWeeklyRecord = records.find((record) => record.id === selectedWeeklyId);
  const visibleTrainers = selectedTrainerDetailId ? trainers.filter((trainer) => trainer.id === selectedTrainerDetailId) : trainers.filter((trainer) => {
    if (selectedTrainerIds.length && !selectedTrainerIds.includes(trainer.id)) return false;
    const query = trainerSearch.trim().toLowerCase();
    return !query || `${trainer.name || ""} ${trainer.email || ""} ${trainer.phone || ""} ${trainer.designation || ""}`.toLowerCase().includes(query);
  });
  const selectedTrainerDetail = trainers.find((trainer) => trainer.id === selectedTrainerDetailId);
  const visitsKey = `${view}|${trainerId}|${view === "visits" ? filter.from : ""}|${view === "visits" ? filter.to : ""}`;
  const reportReady = (kind) => kind === "details" || (["today-visits", "visits"].includes(kind) ? loadedVisitsKey === visitsKey : loadedRecordsKey === recordsKey && (kind !== "weekly" || Boolean(selectedWeeklyRecord)));

  const navigate = (key) => {
    if (key !== view) scrollPositions.current.set(view, window.scrollY);
    setView(key); setSelectedWeeklyId(""); setExpandedView(""); setSidebarOpen(false); setError(""); setNotice("");
  };
  useLayoutEffect(() => {
    if (previousView.current === view) return undefined;
    previousView.current = view;
    const target = scrollPositions.current.get(view) || 0;
    window.scrollTo(0, target);
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, target));
    return () => window.cancelAnimationFrame(frame);
  }, [view]);
  useEffect(() => {
    window.history.pushState({ ...window.history.state, jpTrainerGuard: true }, "", window.location.href);
  }, []);
  useEffect(() => {
    const goBackWithinTrainer = () => {
      if (expandedProfilePhoto) { setExpandedProfilePhoto(null); return true; }
      const photoClose = document.querySelector(".trainer-photo-modal button, .trainer-expense-proof-overlay button");
      if (photoClose) { photoClose.click(); return true; }
      const expenseExpandClose = document.querySelector(".trainer-expense-expanded .report-expanded-back");
      if (expenseExpandClose) { expenseExpandClose.click(); return true; }
      if (expandedView) { setExpandedView(""); return true; }
      const openPicker = document.querySelector('.trainer-portal .verification-marketer-field button[aria-expanded="true"], .trainer-expense-proof-button[aria-expanded="true"]');
      if (openPicker) { openPicker.click(); return true; }
      if (sidebarOpen) { setSidebarOpen(false); return true; }
      if (view === "details" && selectedTrainerDetailId) { setSelectedTrainerDetailId(""); return true; }
      if (view === "weekly" && selectedWeeklyId) { setSelectedWeeklyId(""); return true; }
      if (view !== "home") { navigate(view === "weekly-edit" ? "weekly" : "home"); return true; }
      return false;
    };
    const onEscape = (event) => {
      if (event.key !== "Escape" || event.repeat || document.querySelector("[data-confirm-dialog]")) return;
      if (document.querySelector(".trainer-photo-modal, .trainer-expense-proof-overlay, .trainer-expense-expanded")) return;
      if (goBackWithinTrainer()) event.preventDefault();
    };
    const onBrowserBack = () => {
      window.history.pushState({ ...window.history.state, jpTrainerGuard: true }, "", window.location.href);
      goBackWithinTrainer();
    };
    window.addEventListener("keydown", onEscape, true);
    window.addEventListener("popstate", onBrowserBack);
    return () => { window.removeEventListener("keydown", onEscape, true); window.removeEventListener("popstate", onBrowserBack); };
  }, [view, sidebarOpen, expandedView, selectedWeeklyId, selectedTrainerDetailId, expandedProfilePhoto]);
  useEffect(() => {
    if (!expandedView) return undefined;
    document.body.classList.add("report-fullscreen-active");
    return () => { document.body.classList.remove("report-fullscreen-active"); };
  }, [expandedView]);
  const exportReport = async (kind, format) => {
    if (exportBusy || !reportReady(kind)) return;
    setExportBusy(true); setError("");
    try {
      const rows = kind === "details" ? visibleTrainers : ["today-visits", "visits"].includes(kind) ? visits : kind === "weekly" ? [selectedWeeklyRecord] : records;
      const options = { showTrainer: admin && !trainerId, compactAttendance: admin };
      await (format === "excel" ? downloadTrainerExcel(kind, rows, options) : downloadTrainerPDF(kind, rows, options));
    } catch (cause) { setError(cause.message || "Report download failed."); }
    finally { setExportBusy(false); }
  };
  const reportControls = (kind, refresh) => <>
    <div className="trainer-toolbar report-normal-toolbar"><button type="button" className="trainer-back" onClick={() => kind === "details" && selectedTrainerDetailId ? setSelectedTrainerDetailId("") : navigate("home")}>← Back</button><div className="trainer-toolbar-actions"><button type="button" className="trainer-refresh" onClick={refresh}>↻ Refresh</button><button type="button" className="report-expanded-excel" disabled={exportBusy || !reportReady(kind)} onClick={() => exportReport(kind, "excel")}>Excel</button><button type="button" className="report-expanded-pdf" disabled={exportBusy || !reportReady(kind)} onClick={() => exportReport(kind, "pdf")}>PDF</button><button type="button" className="report-expand-btn" title="Expand report" aria-label="Expand report" onClick={() => { setSidebarOpen(false); setExpandedView(kind); }}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button></div></div>
    {expandedView === kind && <div className="report-expanded-toolbar"><button type="button" className="report-expanded-back" title="Exit expanded report" aria-label="Exit expanded report" onClick={() => setExpandedView("")}>←</button><div className="report-expanded-exports"><button type="button" className="trainer-refresh" onClick={refresh}>↻</button><button type="button" className="report-expanded-excel" disabled={exportBusy || !reportReady(kind)} onClick={() => exportReport(kind, "excel")}>Excel</button><button type="button" className="report-expanded-pdf" disabled={exportBusy || !reportReady(kind)} onClick={() => exportReport(kind, "pdf")}>PDF</button></div></div>}
  </>;
  const loadTrainers = useCallback(async () => {
    if (admin) setTrainers((await request("/trainers")).trainers || []);
  }, [admin]);
  const loadOldTrainers = useCallback(async () => {
    if (admin) setOldTrainers((await request("/trainers?archived=1")).trainers || []);
  }, [admin]);
  useEffect(() => { if (view === "old-trainers") loadOldTrainers().catch((cause) => setError(cause.message)); }, [view, loadOldTrainers]);
  useEffect(() => {
    const ids = new Set(trainers.map((trainer) => trainer.id));
    setSelectedTrainerIds((current) => current.filter((id) => ids.has(id)));
    setSelectedTrainerDetailId((current) => current && !ids.has(current) ? "" : current);
  }, [trainers]);
  const loadRecords = useCallback(async () => {
    if (!sections.some((item) => item.key === view)) return;
    const requestId = ++recordsRequest.current;
    const key = `${view}|${trainerId}|${filter.from}|${filter.to}`;
    setLoadedRecordsKey("");
    setRecords([]);
    const params = new URLSearchParams();
    if (admin && trainerId) params.set("trainerId", trainerId);
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    const result = await request(`/trainers/records/${view}?${params}`);
    if (requestId === recordsRequest.current) {
      setRecords(result.records || []);
      setLoadedRecordsKey(key);
    }
  }, [admin, trainerId, view, filter.from, filter.to]);
  const loadVisits = useCallback(async () => {
    if (!["today-visits", "visits"].includes(view)) return;
    const requestId = ++visitsRequest.current;
    const key = `${view}|${trainerId}|${view === "visits" ? filter.from : ""}|${view === "visits" ? filter.to : ""}`;
    setLoadedVisitsKey(""); setVisits([]);
    const params = new URLSearchParams();
    if (admin && trainerId) params.set("trainerId", trainerId);
    if (view === "today-visits") params.set("today", "1");
    else { if (filter.from) params.set("from", filter.from); if (filter.to) params.set("to", filter.to); }
    const result = await request(`/trainers/visits?${params}`);
    if (requestId === visitsRequest.current) { setVisits(result.visits || []); setLoadedVisitsKey(key); }
  }, [admin, trainerId, view, filter.from, filter.to]);
  useEffect(() => { loadTrainers().catch((cause) => setError(cause.message)); }, [loadTrainers]);
  useEffect(() => { loadRecords().catch((cause) => setError(cause.message)); }, [loadRecords]);
  useEffect(() => { loadVisits().catch((cause) => setError(cause.message)); }, [loadVisits]);
  useEffect(() => {
    if (view !== "home") return undefined;
    let active = true;
    setDashboardSummary(null);
    const refreshSummary = () => request("/trainers/dashboard-summary").then((summary) => { if (active) setDashboardSummary(summary); }).catch((cause) => { if (active) setError(cause.message); });
    refreshSummary();
    const onVisible = () => { if (document.visibilityState === "visible") refreshSummary(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(refreshSummary, 60000);
    return () => { active = false; document.removeEventListener("visibilitychange", onVisible); window.clearInterval(timer); };
  }, [view]);
  useEffect(() => { planDraftEdited.current = false; setPlan({ date: localDate(), area: "", purpose: "" }); setPlanSource(""); }, [view]);
  useEffect(() => {
    if (admin || view !== "daily" || !plan.date) return undefined;
    let active = true;
    setPlanSource("");
    request(`/trainers/plan-for-date?date=${encodeURIComponent(plan.date)}`).then(({ source, plan: saved }) => {
      if (!active || planDraftEdited.current) return;
      setPlan((current) => current.date === plan.date ? { date: current.date, area: saved?.area || "", purpose: saved?.purpose || "" } : current);
      setPlanSource(source || "");
    }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [admin, view, plan.date]);

  async function saveAccount(event) {
    event.preventDefault();
    if (account.password !== confirmPassword) { setError("Password and confirmation must match."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await request(editId ? `/trainers/${editId}` : "/trainers", { method: editId ? "PATCH" : "POST", body: JSON.stringify(account) });
      setNotice(editId ? "Trainer updated." : "Trainer account created.");
      setAccount(emptyAccount); setConfirmPassword(""); setEditId(""); await loadTrainers();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function toggleActive(trainer) {
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/trainers/${trainer.id}`, { method: "PATCH", body: JSON.stringify({ active: !trainer.active }) });
      setNotice(trainer.active ? "Trainer deactivated." : "Trainer activated."); await loadTrainers();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function changeArchive(rows, action) {
    setBusy(true); setError(""); setNotice("");
    try {
      for (const trainer of rows) await request(`/trainers/${trainer.id}/${action}`, { method: "PATCH" });
      await Promise.all([loadTrainers(), loadOldTrainers()]);
      setNotice(`${rows.length} trainer${rows.length === 1 ? "" : "s"} ${action === "archive" ? "moved to Old Trainers" : "restored"}.`);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function saveRecord(payload) {
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/trainers/records/${view}`, { method: "POST", body: JSON.stringify(payload) });
      setNotice(view === "attendance" ? "Attendance saved." : "Action plan saved.");
      await loadRecords();
      return true;
    } catch (cause) { setError(cause.message); return false; } finally { setBusy(false); }
  }
  const shareDailyPlan = async (payload) => {
    const saved = await saveRecord(payload);
    if (!saved) return;
    const message = `Assalam U Alaikum!!\nAction Plan\n${payload.date}\nArea: ${payload.area}\npurpose : ${payload.purpose}\nRegards : ${user.designation || "Trainer"}\n${user.name || "Trainer"}`;
    if (typeof navigator.share === "function") {
      try { await navigator.share({ text: message }); return; } catch (cause) { if (cause?.name === "AbortError") { setNotice("Action plan saved. WhatsApp sharing was cancelled."); return; } }
    }
    window.location.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };
  const todayRecord = view === "attendance" ? records.find((item) => item.date === localDate()) : null;
  const navItems = [
    { key: "home", label: "Home", icon: "🏠" },
    ...(admin ? [{ key: "trainers", label: "Add Trainer", icon: "➕" }, { key: "details", label: "Trainer Details", icon: "👥" }, { key: "delete-trainer", label: "Delete Trainer", icon: "🗑️" }, { key: "old-trainers", label: "Old Trainers", icon: "↺" }] : []),
    { ...sections[0], icon: "🕘" }, { ...sections[2], icon: "🗓️" },
    { key: "monthly-attendance", label: "Monthly Attendance", icon: "📅" },
    ...(!admin ? [{ key: "add-visit", label: "Add Visit", icon: "➕" }] : []),
    ...(!admin ? [{ key: "weekly-add", label: "Add Weekly Plan", icon: "📅" }] : []),
    { ...sections[1], icon: "📋" },
    ...(!admin ? [{ key: "expenses-add", label: "Add Expense", icon: "➕" }, { key: "expenses-all", label: "All Expenses", icon: "🧾" }] : []),
    { key: "today-visits", label: "Today's Visits", icon: "☀️" },
    { key: "visits", label: "All Visits", icon: "📊" },
    ...(admin ? [{ key: "today-expenses", label: "Today Expenses", icon: "🧾" }, { key: "expense-report", label: "Expense Report", icon: "💰" }] : []),
    ...(!admin ? [{ key: "my-card", label: "My Card", icon: "▣" }, { key: "support", label: "Support", icon: "🎧" }] : []),
    ...(admin ? [{ key: "hidden", label: "Hidden", icon: "🙈" }] : [])
  ].map((item) => ({ ...item, active: view === item.key }));
  const sidebar = admin ? "admin-desktop-sidebar" : "marketer-sidebar";
  const sidebarHead = admin ? "admin-desktop-sidebar-head" : "marketer-sidebar-head";
  const sidebarNav = admin ? "admin-desktop-sidebar-nav" : "marketer-sidebar-nav";
  const sidebarItem = admin ? "admin-desktop-sidebar-item" : "marketer-sidebar-item";
  const sidebarIcon = admin ? "admin-desktop-sidebar-icon" : "marketer-sidebar-icon";
  const currentSection = sections.find((item) => item.key === view);
  const selectedTrainer = trainers.find((item) => item.id === trainerId);

  const dashboardStats = admin ? [
    { label: "All Trainers", value: trainers.length, icon: "👥", tone: "rose", onClick: () => navigate("details") },
    { label: "Attendance", value: dashboardSummary?.attendanceCount ?? "...", icon: "🕘", tone: "mint", onClick: () => navigate("attendance") },
    { label: "Daily Plans", value: dashboardSummary?.dailyPlanCount ?? "...", icon: "🗓️", tone: "pink", onClick: () => navigate("daily") },
    { label: "Today's Visits", value: dashboardSummary?.visitCount ?? "...", icon: "☀️", tone: "amber", onClick: () => navigate("today-visits") }
  ] : [
    { label: "Attendance", value: dashboardSummary ? dashboardSummary.attendanceMarked ? "Marked" : "Not Marked" : "...", compact: true, icon: "🕘", tone: "rose", onClick: () => navigate("attendance") },
    { label: "Daily Plan", value: dashboardSummary ? dashboardSummary.dailyPlanMarked ? "Marketed" : "Non Marketed" : "...", compact: true, icon: "🗓️", tone: "mint", onClick: () => navigate("daily") },
    { label: "Add Visit", value: dashboardSummary?.visitCount ?? "...", icon: "➕", tone: "pink", onClick: () => navigate("add-visit") },
    { label: "Add Weekly Plan", value: "Open", icon: "📅", tone: "amber", onClick: () => navigate("weekly-add") }
  ];
  const dashboardSections = admin ? [
    { title: "Reports & Planning", icon: "📋", description: "Review training activity", items: [
      { title: "Attendance", description: "Review trainer attendance", icon: "🕘", tone: "rose", onClick: () => navigate("attendance") },
      { title: "Daily Action Plan", description: "Review daily trainer plans", icon: "🗓️", tone: "violet", onClick: () => navigate("daily") },
      { title: "Today's Visits", description: "See trainer visits recorded today", icon: "☀️", tone: "mint", onClick: () => navigate("today-visits") },
      { title: "Monthly Attendance", description: "Trainer calendar and monthly exports", icon: "📅", tone: "pink", onClick: () => navigate("monthly-attendance") }
    ] },
    { title: "Visits & Weekly Plans", icon: "📊", description: "Browse all trainer activity", items: [
      { title: "Weekly Action Plan", description: "Review weekly trainer plans", icon: "📋", tone: "violet", onClick: () => navigate("weekly") },
      { title: "All Visits", description: "Browse trainer visit history", icon: "📊", tone: "mint", onClick: () => navigate("visits") }
    ] },
    { title: "Team Management", icon: "👥", description: "Manage your trainers", items: [
      { title: "Add Trainer", description: "Create a new trainer account", icon: "➕", tone: "violet", onClick: () => navigate("trainers") },
      { title: "Trainer Details", description: "View and update trainer accounts", icon: "👥", tone: "rose", onClick: () => navigate("details") },
      { title: "Delete Trainer", description: "Move a trainer to the old list", icon: "🗑️", tone: "pink", onClick: () => navigate("delete-trainer") },
      { title: "Old Trainers", description: "View and restore archived trainers", icon: "↺", tone: "mint", onClick: () => navigate("old-trainers") }
    ] },
    { title: "Expenses", icon: "💰", description: "Review trainer expenses", items: [
      { title: "Today Expenses", description: "See today's expenses for all trainers", icon: "🧾", tone: "rose", onClick: () => navigate("today-expenses") },
      { title: "Expense Report", description: "Filter all trainer expenses and download reports", icon: "💰", tone: "amber", onClick: () => navigate("expense-report") }
    ] }
  ] : [
    { title: "Daily Activity", icon: "🗓️", description: "Start and manage your day", items: [
      { title: "Mark Attendance", description: "Check in, check out or mark leave", icon: "🕘", tone: "rose", onClick: () => navigate("attendance") },
      { title: "Daily Action Plan", description: "Record today's area and purpose", icon: "🗓️", tone: "violet", onClick: () => navigate("daily") },
      { title: "Add Visit", description: "Submit a school visit report and photo", icon: "➕", tone: "mint", onClick: () => navigate("add-visit") },
      { title: "Monthly Attendance", description: "View your attendance calendar", icon: "📅", tone: "amber", onClick: () => navigate("monthly-attendance") }
    ] },
    { title: "Visits & Reports", icon: "📊", description: "Review your school visits", items: [
      { title: "Today's Visits", description: "Check today's reports", icon: "☀️", tone: "amber", onClick: () => navigate("today-visits") },
      { title: "All Visits", description: "Browse your visit history", icon: "📊", tone: "rose", onClick: () => navigate("visits") }
    ] },
    { title: "Weekly Action Plan", icon: "📅", description: "Plan and review your weeks", items: [
      { title: "Add Weekly Plan", description: "Plan the next available week", icon: "📅", tone: "mint", onClick: () => navigate("weekly-add") },
      { title: "All Weekly Plans", description: "View and edit saved weekly plans", icon: "📋", tone: "violet", onClick: () => navigate("weekly") }
    ] },
    { title: "Expenses", icon: "🧾", description: "Record and review your expenses", items: [
      { title: "Add Expense", description: "Save travel, food and other expenses", icon: "➕", tone: "rose", onClick: () => navigate("expenses-add") },
      { title: "All Expenses", description: "View your expenses and total", icon: "🧾", tone: "amber", onClick: () => navigate("expenses-all") }
    ] },
    { title: "Resources & Support", icon: "▰", description: "Helpful materials and support", items: [
      { title: "My Card", description: "View and download your card", icon: "▣", tone: "rose", onClick: () => navigate("my-card") },
      { title: "Support", description: "Contact admin for help", icon: "☎", tone: "violet", onClick: () => navigate("support") }
    ] }
  ];

  return <div className={`portal-shell ${admin ? "portal-admin-shell" : "portal-marketer-shell"} trainer-portal`} style={globalStyle}>
    <style>{`${admin ? `${adminCss}\n${adminModernCss}` : marketerCss}\n${portalShellCss}\n${trainerCss}`}</style>
    <button type="button" className={admin ? "admin-desktop-menu-toggle" : "marketer-menu-toggle"} onClick={() => setSidebarOpen(true)} aria-label="Open trainer menu">☰</button>
    <div className={`${admin ? "admin-sidebar-backdrop" : "marketer-sidebar-backdrop"} ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
    <aside className={`${sidebar} ${sidebarOpen ? "open" : ""}`}>
      <div className={sidebarHead}><div className="portal-sidebar-brand"><span className="portal-sidebar-logo">JP<span>.</span></span><strong>JAVED PUBLISHERS</strong></div><div className={admin ? "admin-sidebar-head-actions" : "marketer-sidebar-head-actions"}><button type="button" className={admin ? "admin-desktop-sidebar-close" : "marketer-sidebar-close"} onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button></div></div>
      <nav className={sidebarNav}>{navItems.map((item) => <button type="button" key={item.key} className={`${sidebarItem} ${item.active ? "active" : ""}`} onClick={() => navigate(item.key)}><span className={sidebarIcon}>{item.icon}</span><span>{item.label}</span></button>)}</nav>
      <div className="portal-sidebar-footer"><div className="portal-sidebar-profile"><span className="portal-sidebar-avatar">{profilePhoto ? <img src={profilePhoto} alt="" /> : (user.name || (admin ? "Admin" : "Trainer")).charAt(0).toUpperCase()}</span><span><strong>{admin ? "Admin" : user.name}</strong><small>Javed Publishers</small></span></div>{onBack && <button type="button" onClick={onBack}>← Switch to Marketer</button>}<button type="button" onClick={onLogout}>{renderLogoutArrowIcon(16)} Logout</button></div>
    </aside>
    <div className={`app-responsive ${admin ? "admin-desktop-content" : "marketer-portal-content"} ${sidebarOpen ? "sidebar-open" : ""}`} style={containerStyle}>
      {renderResponsiveStyles()}
      <PortalTopBar role={admin ? "admin" : "trainer"} name={admin ? "Admin" : user.name} items={navItems} onNavigate={navigate} onMenu={() => setSidebarOpen(true)} onLogout={onLogout} profilePhoto={profilePhoto} onProfilePhotoChange={setProfilePhoto} onExpandProfilePhoto={setExpandedProfilePhoto} />
      <PhotoViewer image={expandedProfilePhoto} onClose={() => setExpandedProfilePhoto(null)} viewOnly allowDownload />
      {view !== "home" && view !== "hidden" && <DesktopSectionBanner view={view} role={admin ? "admin" : "marketer"} accountId={`${user.email || user.trainerId}:trainer`} title={view === "trainers" ? (editId ? "Edit Trainer" : "Add Trainer") : view === "details" ? "Trainer Details" : view === "delete-trainer" ? "Delete Trainer" : view === "old-trainers" ? "Old Trainers" : view === "today-visits" ? "Today's Visits" : view === "visits" ? "All Visits" : view === "add-visit" ? "Add Visit" : view === "weekly-add" ? "Add Weekly Plan" : view === "weekly-edit" ? "Edit Weekly Plan" : view === "expenses-add" ? "Add Expense" : view === "expenses-all" ? "All Expenses" : view === "today-expenses" ? "Today Expenses" : view === "expense-report" ? "Expense Report" : currentSection?.label} description={view === "trainers" ? "Create or update a trainer account." : view === "details" ? "View the trainers on your team." : view === "delete-trainer" ? "Archive trainer accounts while keeping their records." : view === "old-trainers" ? "Restore archived trainer accounts." : view === "expenses-add" ? "Record your training expenses." : view === "expenses-all" ? "Review your expense history." : view === "today-expenses" ? "Review today's trainer expenses." : view === "expense-report" ? "Review all trainer expenses." : admin ? "Review trainer activity and reports." : "Keep your training activity organized."} theme={["trainers", "details", "delete-trainer", "old-trainers"].includes(view) ? "team" : currentSection?.theme || "reports"} />}
      {error && <div className="trainer-alert error" role="alert">{error}</div>}{notice && <div className="trainer-alert" role="status">{notice}</div>}
      {view === "home" && <DashboardHome role={admin ? "admin" : "marketer"} accountId={`${user.email || user.trainerId}:trainer`} title={admin ? "Trainer Admin Dashboard" : "Trainer Dashboard"} description={admin ? "Manage trainers and review attendance and action plans." : "Plan your week, mark attendance and record daily activity."} stats={dashboardStats} sections={dashboardSections} />}
      {view === "monthly-attendance" && <MonthlyAttendance role={admin ? "admin" : "trainer"} audience="trainer" marketers={trainers} currentUser={user} onBack={() => navigate("home")} />}
      {admin && view === "hidden" && <DashboardHiddenPanel role="admin" accountId={`${user.email || user.trainerId}:trainer`} onBack={() => navigate("home")} />}
      {admin && ["delete-trainer", "old-trainers"].includes(view) && <TrainerArchivePanel mode={view === "old-trainers" ? "old" : "delete"} trainers={view === "old-trainers" ? oldTrainers : trainers} busy={busy} onAction={changeArchive} onBack={() => navigate("home")} inputStyle={inputStyle} />}
      {!admin && view === "add-visit" && <TrainerAddVisitPanel email={user.email} trainerId={user.trainerId} onBack={() => navigate("home")} />}
      {!admin && view === "my-card" && <MarketerCardPanel account={user} endpoint="/cards/trainer/me" onBack={() => navigate("home")} />}
      {!admin && view === "support" && <MarketerSupportPanel account={user} style={cardStyle} onBack={() => navigate("home")} />}
      {!admin && view === "weekly-add" && <TrainerWeeklyPlanForm onBack={() => navigate("home")} onSaved={(record) => { navigate("weekly"); setSelectedWeeklyId(record.id); setNotice("Weekly plan saved."); }} />}
      {!admin && view === "weekly-edit" && editingWeekly && <TrainerWeeklyPlanForm key={editingWeekly.id} editing={editingWeekly} onBack={() => { navigate("weekly"); setSelectedWeeklyId(editingWeekly.id); }} onSaved={(record) => { navigate("weekly"); setSelectedWeeklyId(record.id); setNotice("Weekly plan updated."); }} />}
      {((!admin && ["expenses-add", "expenses-all"].includes(view)) || (admin && ["today-expenses", "expense-report"].includes(view))) && <TrainerExpensePanel mode={view === "expenses-add" ? "add" : view === "expenses-all" ? "all" : view === "today-expenses" ? "today" : "report"} trainers={trainers} onBack={() => navigate("home")} onNavigate={navigate} inputStyle={inputStyle} cardStyle={cardStyle} btnPrimary={btnPrimary} />}
      {["today-visits", "visits"].includes(view) && <TrainerVisitsPanel view={view} admin={admin} visits={visits} trainers={trainers} trainerId={trainerId} setTrainerId={setTrainerId} filter={filter} setFilter={setFilter} expandedView={expandedView} reportControls={reportControls} refresh={() => loadVisits().catch((cause) => setError(cause.message))} />}
      {admin && view === "trainers" && <div className="marketer-form-page"><button type="button" className="marketer-form-back" onClick={() => navigate(editId ? "details" : "home")}>← Back</button><div className="marketer-form-hero"><span className="marketer-form-hero-icon">♟</span><div><h2>{editId ? "Edit Trainer Details" : "Add Trainer"}</h2><p>{editId ? "Update this trainer's account." : "Create a trainer account for attendance and action plans."}</p></div></div><form onSubmit={saveAccount}>
        <section className="marketer-form-section"><h3><span>♟</span> Basic Information</h3><div className="marketer-form-grid">
          {field("♟", "Name *", <input required maxLength="120" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} placeholder="Full name" />)}
          {field("✉", "Email *", <input required type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} placeholder="Email address" />)}
          {field("☎", "Phone", <input type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} placeholder="Phone number" />)}
          {field("▣", "Designation *", <input required value={account.designation} onChange={(e) => setAccount({ ...account, designation: e.target.value })} placeholder="Designation" />)}
        </div></section>
        <section className="marketer-form-section"><h3><span>📱</span> Offline Mode</h3><p className="marketer-form-hint">Allow this trainer to save visits offline and sync them after signing in.</p><div className="marketer-offline-modes trainer-offline-modes"><div className="marketer-offline-mode"><span>Trainer visits</span><button type="button" role="switch" aria-label="Trainer offline visits" aria-checked={account.offlineMode !== "none"} className={`portal-hide-controls-switch ${account.offlineMode !== "none" ? "is-on" : ""}`} onClick={() => setAccount((current) => ({ ...current, offlineMode: current.offlineMode === "none" ? "trainer" : "none" }))}><span /></button></div></div></section>
        <section className="marketer-form-section"><h3><span>♙</span> {editId ? "Change Password" : "Set Password"}</h3><p className="marketer-form-hint">{editId ? "Leave both password fields blank to keep the current password." : "Use at least 8 characters."}</p><div className="marketer-form-grid">
          {field("♙", editId ? "New Password" : "Password *", <input type="password" required={!editId} minLength="8" autoComplete="new-password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />)}
          {field("♙", "Confirm Password", <input type="password" required={!editId} minLength={account.password ? 8 : undefined} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />)}
        </div></section>
        <div className="marketer-form-footer"><button type="submit" disabled={busy}>{busy ? "Saving..." : editId ? "Update Trainer" : "Create Trainer"}</button><button type="button" onClick={() => { setAccount(emptyAccount); setConfirmPassword(""); setEditId(""); navigate("home"); }}>Cancel</button></div>
      </form></div>}
      {admin && view === "details" && <div className={"trainer-report " + (expandedView === "details" ? "admin-report-expanded" : "")}>
        {reportControls("details", () => loadTrainers().catch((cause) => setError(cause.message)))}
        <div style={cardStyle}>
          <TrainerDetailsPanel
            trainers={trainers}
            selectedIds={selectedTrainerIds}
            onSelectIds={setSelectedTrainerIds}
            search={trainerSearch}
            onSearch={setTrainerSearch}
            selectedTrainer={selectedTrainerDetail}
            onSelectTrainer={setSelectedTrainerDetailId}
            onRefresh={() => loadTrainers().catch((cause) => setError(cause.message))}
            onEdit={(trainer) => { setEditId(trainer.id); setAccount({ name: trainer.name, email: trainer.email, phone: trainer.phone || "", designation: trainer.designation, password: "", offlineMode: trainer.offlineMode === "none" ? "none" : "trainer" }); setConfirmPassword(""); navigate("trainers"); }}
            onArchive={(trainer) => { if (window.confirm("Archive " + (trainer.name || "this trainer") + "? Their records will be kept and the account can be restored from Old Trainers.")) changeArchive([trainer], "archive"); }}
            onToggleActive={toggleActive}
            onExpandPhoto={setExpandedProfilePhoto}
            busy={busy}
            inputStyle={inputStyle}
          />
        </div>
      </div>}
      {currentSection && <div className={`trainer-report ${expandedView === view ? "admin-report-expanded" : ""}`}>{reportControls(view, () => loadRecords().catch((cause) => setError(cause.message)))}<div style={cardStyle}><h3>{currentSection.icon} {currentSection.label}</h3><p>{admin ? "View trainer reports and filter by person or date." : view === "attendance" ? `${localDate()} · ${user.name}` : "Enter the area and purpose, then save your action plan."}</p>
        {admin ? <div className="trainer-filters"><label>Trainer<select style={inputStyle} value={trainerId} onChange={(e) => setTrainerId(e.target.value)}><option value="">All trainers</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></label><label>From<input style={inputStyle} type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></label><label>To<input style={inputStyle} type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></label></div>
          : view === "attendance" ? <div className="trainer-attendance-form"><div className="trainer-attendance-summary"><div><small>Start Time</small><strong>{dateTime(todayRecord?.checkInAt)}</strong></div><div><small>Status</small><strong>{todayRecord?.status || "Not marked"}</strong></div></div><label>Select Attendance Type<select style={inputStyle} value={attendanceAction} onChange={(e) => setAttendanceAction(e.target.value)}><option value="">Select Attendance Type</option><option value="check-in" disabled={Boolean(todayRecord)}>Start Time</option><option value="leave" disabled={Boolean(todayRecord)}>Leave</option></select></label>{attendanceAction === "leave" && <label>Leave Reason<textarea style={inputStyle} rows="3" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label>}<button type="button" style={btnPrimary} disabled={busy || !attendanceAction || Boolean(todayRecord)} onClick={async () => { if (await saveRecord({ action: attendanceAction, remarks })) setAttendanceAction(""); }}>{busy ? "Saving..." : attendanceAction === "leave" ? "Submit Leave" : "Mark Start Time"}</button></div>
            : view === "daily" ? <form className="trainer-plan-form" onSubmit={(event) => { event.preventDefault(); shareDailyPlan(plan); }}><div className="trainer-plan-row"><label>Date<input type="date" style={inputStyle} required value={plan.date} onChange={(e) => { planDraftEdited.current = false; setPlan({ date: e.target.value, area: "", purpose: "" }); setPlanSource(""); }} /></label><label>Trainer Name<input type="text" style={inputStyle} readOnly value={user.name || ""} /></label></div>{planSource && <small className="trainer-plan-source">{planSource === "weekly" ? "Filled from this day's weekly plan. You can edit it before sending." : "Your saved daily plan is ready to edit and resend."}</small>}<label>Area<input type="text" style={inputStyle} required value={plan.area} onChange={(e) => { planDraftEdited.current = true; setPlan({ ...plan, area: e.target.value }); }} placeholder="Type area" /></label><TrainerPurposeField value={plan.purpose} onChange={(value) => { planDraftEdited.current = true; setPlan({ ...plan, purpose: value }); }} inputStyle={inputStyle} resetKey={plan.date} /><button type="submit" style={btnPrimary} disabled={busy}>{busy ? "Saving..." : "💬 Send to WhatsApp"}</button></form> : null}
        {view === "weekly" ? <TrainerWeeklyPlans records={records} loading={loadedRecordsKey !== recordsKey && !error} selectedId={selectedWeeklyId} onSelect={setSelectedWeeklyId} showTrainer={admin && !trainerId} onEdit={admin ? undefined : (record) => { setEditingWeekly(record); navigate("weekly-edit"); }} /> : <div className={`trainer-table-wrap ${view === "attendance" ? "trainer-attendance-table-wrap" : ""}`}><table className={`trainer-report-table ${view === "attendance" ? "trainer-attendance-table" : ""}`}><thead><tr>{admin && !trainerId && view === "attendance" && <th>Trainer</th>}<th>Date</th>{view === "weekly" && <th>From – To</th>}{admin && !trainerId && view !== "attendance" && <th>Trainer</th>}{view === "attendance" ? <><th>Status</th><th>Start Time</th>{!admin && <th>Leave Reason</th>}</> : <><th>Area</th><th>Purpose</th></>}</tr></thead><tbody>{records.flatMap((item) => view === "weekly" && Array.isArray(item.days) ? item.days.map((day) => ({ ...day, id: `${item.id}_${day.date}`, trainerName: item.trainerName, range: `${item.date} – ${item.toDate}` })) : [item]).map((item) => <tr key={item.id}>{admin && !trainerId && view === "attendance" && <td>{item.trainerName || selectedTrainer?.name || "—"}</td>}<td>{view === "weekly" ? `${item.date} · ${weekDay(item.date)}` : item.date}</td>{view === "weekly" && <td>{item.range || item.date}</td>}{admin && !trainerId && view !== "attendance" && <td>{item.trainerName || selectedTrainer?.name || "—"}</td>}{view === "attendance" ? <><td>{item.status === "present" ? "Present" : item.status === "leave" ? "Leave" : item.status}</td><td>{startTime(item.checkInAt)}</td>{!admin && <td>{item.remarks || "—"}</td>}</> : <><td>{item.area}</td><td>{item.purpose}</td></>}</tr>)}</tbody></table>{!records.length && <div className="trainer-empty">No records yet.</div>}</div>}
      </div></div>}
      <div className="mobile-footer-area trainer-mobile-footer">{onBack && <button type="button" onClick={onBack}>Switch to Marketer</button>}<button type="button" onClick={onLogout}>{renderLogoutArrowIcon(16)} Logout</button><div style={footerStyle}>Developed by Ali Ashfaq</div></div>
    </div>
  </div>;
}
