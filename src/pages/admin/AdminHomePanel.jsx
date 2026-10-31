import React, { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs, query, Timestamp, where } from "../../services/dataGateway.js";
import { usePortalContext } from "../../context/PortalContext.jsx";
import DashboardHome from "../../ui/DashboardHome.jsx";

export default function AdminHomePanel() {
  const c = usePortalContext();
  const [statsReady, setStatsReady] = useState({ reports: false, marketers: false, attendance: false, plans: false });
  const [todayCounts, setTodayCounts] = useState({ attendance: 0, plans: 0, visits: 0 });
  useEffect(() => {
    let active = true;
    const today = c.getTodayInputDate();
    const countPeople = (snapshot, predicate = () => true) => new Set(snapshot.docs.filter((doc) => predicate(doc.data())).map((doc) => {
      const row = doc.data();
      return String(row.marketerId || row.marketerEmail || doc.id).toLowerCase();
    })).size;
    const start = new Date(`${today}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    getCountFromServer(query(collection(c.db, "visits"), where("createdAt", ">=", Timestamp.fromDate(start)), where("createdAt", "<", Timestamp.fromDate(end)))).then((snapshot) => {
      if (!active) return;
      setTodayCounts((current) => ({ ...current, visits: snapshot.data().count }));
      setStatsReady((current) => ({ ...current, reports: true }));
    }).catch((error) => {
      console.error("Dashboard visit count error:", error);
      return c.fetchAllReports().then((rows) => {
        if (!active) return;
        setTodayCounts((current) => ({ ...current, visits: rows.filter((item) => c.getDateKey(item.createdAt) === today).length }));
        setStatsReady((current) => ({ ...current, reports: true }));
      });
    });
    c.fetchMarketers().then(() => { if (active) setStatsReady((current) => ({ ...current, marketers: true })); }).catch(() => {});
    getDocs(query(collection(c.db, "attendance"), where("date", "==", today))).then((snapshot) => {
      if (!active) return;
      setTodayCounts((current) => ({ ...current, attendance: countPeople(snapshot, (row) => row.startMarked || row.endMarked) }));
      setStatsReady((current) => ({ ...current, attendance: true }));
    }).catch((error) => { console.error("Dashboard attendance count error:", error); });
    getDocs(query(collection(c.db, "action_plans"), where("date", "==", today))).then((snapshot) => {
      if (!active) return;
      setTodayCounts((current) => ({ ...current, plans: countPeople(snapshot) }));
      setStatsReady((current) => ({ ...current, plans: true }));
    }).catch((error) => { console.error("Dashboard action plan count error:", error); });
    return () => { active = false; };
  }, []);
  const openAttendance = () => { const day = c.getTodayInputDate(); c.setAdminAttendanceFromDate(day); c.setAdminAttendanceToDate(day); c.setAdminAttendanceSearch(""); c.setAdminView("attendance"); c.fetchAttendanceRecords(); };
  const openActionPlans = () => { const day = c.getTodayInputDate(); c.setAdminActionPlanFromDate(day); c.setAdminActionPlanToDate(day); c.setAdminActionPlanMarketerIds([]); c.setAdminView("action-plans"); c.fetchActionPlans(); };
  const openTodayVisits = () => { c.setAdminView("today-visits"); c.fetchTodayReports(); c.setSelectedAdminMarketerBox(null); };
  const openMarketers = () => { c.setAdminView("marketers-detail"); c.fetchMarketers(); c.setSelectedMarketerDetailBox(null); };
  const stats = [
    { label: "All Marketers", value: statsReady.marketers ? (c.marketersList || []).length : "—", icon: "♟", tone: "rose", onClick: openMarketers },
    { label: "Today's Attendance", value: statsReady.attendance ? todayCounts.attendance : "—", icon: "◷", tone: "mint", onClick: openAttendance },
    { label: "Today's Action Plan", value: statsReady.plans ? todayCounts.plans : "—", icon: "▤", tone: "pink", onClick: openActionPlans },
    { label: "Today's Visits", value: statsReady.reports ? todayCounts.visits : "—", icon: "▦", tone: "amber", onClick: openTodayVisits }
  ];
  const openVisits = () => { c.setAdminView("visits"); c.fetchAllReports(); c.fetchMarketers(); c.setSelectedAdminAllBoxKey(null); c.setAllVisitsFromDate(""); c.setAllVisitsToDate(""); c.setSelectedMarketersFilter([]); };
  const sections = [
    { title: "Overview", icon: "▥", description: "Quick access to daily activities", items: [
      { title: "Attendance", description: "Daily readings and expenses", icon: "◷", tone: "rose", onClick: openAttendance },
      { title: "Monthly Attendance", description: "View one marketer's calendar", icon: "▦", tone: "mint", onClick: () => { c.setAdminView("monthly-attendance"); c.fetchMarketers(); } },
      { title: "View Today Visits", description: "Check today's marketer visits", icon: "☀", tone: "amber", onClick: openTodayVisits },
      { title: "All Visits and Reports", description: "See all marketer visits", icon: "▥", tone: "mint", onClick: openVisits }
    ] },
    { title: "Reports & Planning", icon: "▤", description: "Plans, expenses and samples", items: [
      { title: "Action Plan", description: "See marketers' daily plans", icon: "▣", tone: "rose", onClick: openActionPlans },
      { title: "Expense Report", description: "Kilometres and expenses", icon: "▤", tone: "violet", onClick: c.openAdminExpenseReport },
      { title: "Sample Details", description: "Check sample items", icon: "◇", tone: "amber", onClick: () => { c.setAdminView("sample-details"); c.fetchAllSamples(); c.fetchMarketers(); c.setSelectedAdminSampleMarketerBox(null); c.setSelectedAdminSampleSchoolBox(null); c.setAdminSampleFromDate(""); c.setAdminSampleToDate(""); c.setAdminSampleMarketersFilter([]); } },
      { title: "Other Reports", description: "Create custom reports", icon: "▧", tone: "violet", onClick: () => c.setAdminView("other-reports") }
    ] },
    { title: "Team Management", icon: "♟", description: "Manage your marketers", items: [
      { title: "Marketers Details", description: "View active marketers", icon: "♟", tone: "rose", onClick: openMarketers },
      { title: "Add Marketer", description: "Create a new account", icon: "+", tone: "violet", onClick: () => { c.setEditingId(null); c.setEditingReturnToMarketerDetails(false); c.setMarketerName(""); c.setMarketerPhone(""); c.setMarketerEmail(""); c.setMarketerCnic(""); c.setMarketerPass(""); c.setMarketerDesignation(""); c.setMarketerAssignedKms(""); c.setCardCity(""); c.setShowCardCity(false); c.setSubordinateMarketerIds([]); c.setSubordinatePickerOpen(false); c.setSubordinateSearch(""); c.setMarketerWhatsappGroupName(""); c.setMarketerWhatsappGroupLink(""); c.resetMarketerAssignmentForm(); c.setAdminView("add-marketer"); c.fetchLocationCatalog().catch(() => {}); } },
      { title: "Delete Marketer", description: "Remove active marketer", icon: "▣", tone: "rose", onClick: () => { c.setAdminView("delete-marketer"); c.fetchMarketers(); } },
      { title: "Old Marketers", description: "Restore deleted marketers", icon: "▤", tone: "pink", onClick: () => { c.setAdminView("old-marketers"); c.fetchDeletedMarketers(); } }
    ] },
    { title: "Resources & Communication", icon: "▰", description: "Catalogues, verification and media", items: [
      { title: "Catalogues", description: "Manage catalogue links", icon: "▥", tone: "mint", onClick: () => { c.setAdminView("catalogues"); c.setCatalogueSearch(""); c.fetchCatalogues(); } },
      { title: "Verification Calls", description: "Verify school visits", icon: "☎", tone: "violet", onClick: () => c.setAdminView("verification-reports") },
      { title: "Media", description: "Manage visit pictures", icon: "▧", tone: "violet", onClick: () => { c.setAdminView("media"); c.fetchAllReports(); c.fetchDeletedMedia(); c.setMediaMarketer(null); c.setSelectedMediaIds([]); c.setSelectedDeletedMediaIds([]); c.setMediaView("active"); } },
      { title: "Recently Deleted", description: "Restore removed media", icon: "♻", tone: "mint", onClick: () => { c.setAdminView("media"); c.fetchAllReports(); c.fetchDeletedMedia(); c.setMediaMarketer(null); c.setSelectedMediaIds([]); c.setSelectedDeletedMediaIds([]); c.setMediaView("deleted"); } }
    ] }
  ];
  sections.push({ title: "Card Studio", icon: "🎨", description: "Create printable cards", items: [
    { title: "My Card", description: "View and download your card", icon: "▣", tone: "rose", onClick: () => c.setAdminView("admin-my-card") },
    { title: "Card Designer", description: "Create and edit card designs", icon: "🎨", tone: "rose", onClick: () => c.setAdminView("card-designer") },
    { title: "Saved Cards", description: "Find, download or restore cards", icon: "🪪", tone: "violet", onClick: () => c.setAdminView("saved-cards") }
  ] });
  sections.push({ title: "News", icon: "📰", description: "Send updates and expense reports", items: [
    { title: "Add News", description: "Write and send an update", icon: "✉️", tone: "rose", onClick: () => c.setAdminView("news-add") },
    { title: "Expense News", description: "Send expense report PDFs", icon: "📄", tone: "mint", onClick: () => c.setAdminView("news-expense") },
    { title: "Old News", description: "Review sent news", icon: "🗂️", tone: "violet", onClick: () => c.setAdminView("news-old") },
    { title: "Deleted News", description: "Restore removed news", icon: "♻", tone: "amber", onClick: () => c.setAdminView("news-deleted") }
  ] });
  return <DashboardHome role="admin" accountId={c.user?.id || c.user?.email || "admin"} stats={stats} sections={sections} />;
}
