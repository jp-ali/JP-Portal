import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { usePortalContext } from "../../context/PortalContext.jsx";
import DashboardHome from "../../ui/DashboardHome.jsx";

export default function AdminHomePanel() {
  const c = usePortalContext();
  const [statsReady, setStatsReady] = useState({ reports: false, marketers: false, attendance: false, plans: false });
  const [todayCounts, setTodayCounts] = useState({ attendance: 0, plans: 0 });
  useEffect(() => {
    let active = true;
    const today = c.getTodayInputDate();
    const countPeople = (snapshot, predicate = () => true) => new Set(snapshot.docs.filter((doc) => predicate(doc.data())).map((doc) => {
      const row = doc.data();
      return String(row.marketerId || row.marketerEmail || doc.id).toLowerCase();
    })).size;
    Promise.allSettled([
      c.fetchAllReports(),
      c.fetchMarketers(),
      getDocs(query(collection(c.db, "attendance"), where("date", "==", today))),
      getDocs(query(collection(c.db, "action_plans"), where("date", "==", today)))
    ]).then(([reportsResult, marketersResult, attendanceResult, plansResult]) => {
      if (!active) return;
      setStatsReady({ reports: reportsResult.status === "fulfilled", marketers: marketersResult.status === "fulfilled", attendance: attendanceResult.status === "fulfilled", plans: plansResult.status === "fulfilled" });
      setTodayCounts({
        attendance: attendanceResult.status === "fulfilled" ? countPeople(attendanceResult.value, (row) => row.startMarked || row.endMarked) : 0,
        plans: plansResult.status === "fulfilled" ? countPeople(plansResult.value) : 0
      });
    });
    return () => { active = false; };
  }, []);
  const today = c.getDateKey(new Date());
  const visits = c.reports || [];
  const openAttendance = () => { const day = c.getTodayInputDate(); c.setAdminAttendanceFromDate(day); c.setAdminAttendanceToDate(day); c.setAdminAttendanceSearch(""); c.setAdminView("attendance"); c.fetchAttendanceRecords(); };
  const openActionPlans = () => { const day = c.getTodayInputDate(); c.setAdminActionPlanFromDate(day); c.setAdminActionPlanToDate(day); c.setAdminActionPlanMarketerIds([]); c.setAdminView("action-plans"); c.fetchActionPlans(); };
  const openTodayVisits = () => { c.setAdminView("today-visits"); c.fetchAllReports(); c.setSelectedAdminMarketerBox(null); };
  const openMarketers = () => { c.setAdminView("marketers-detail"); c.fetchMarketers(); c.setSelectedMarketerDetailBox(null); };
  const stats = [
    { label: "All Marketers", value: statsReady.marketers ? (c.marketersList || []).length : "—", icon: "♟", tone: "rose", onClick: openMarketers },
    { label: "Today's Attendance", value: statsReady.attendance ? todayCounts.attendance : "—", icon: "◷", tone: "mint", onClick: openAttendance },
    { label: "Today's Action Plan", value: statsReady.plans ? todayCounts.plans : "—", icon: "▤", tone: "pink", onClick: openActionPlans },
    { label: "Today's Visits", value: statsReady.reports ? visits.filter((item) => c.getDateKey(item.createdAt) === today).length : "—", icon: "▦", tone: "amber", onClick: openTodayVisits }
  ];
  const openVisits = () => { c.setAdminView("visits"); c.fetchAllReports(); c.fetchMarketers(); c.setSelectedAdminAllBoxKey(null); c.setAllVisitsFromDate(""); c.setAllVisitsToDate(""); c.setSelectedMarketersFilter([]); };
  const sections = [
    { title: "Overview", icon: "▥", description: "Quick access to daily activities", items: [
      { title: "Attendance", description: "Daily readings and expenses", icon: "◷", tone: "rose", onClick: openAttendance },
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
      { title: "Add Marketer", description: "Create a new account", icon: "+", tone: "violet", onClick: () => { c.setEditingId(null); c.setEditingReturnToMarketerDetails(false); c.setMarketerName(""); c.setMarketerPhone(""); c.setMarketerEmail(""); c.setMarketerPass(""); c.setMarketerDesignation(""); c.setMarketerAssignedKms(""); c.setSubordinateMarketerIds([]); c.setSubordinatePickerOpen(false); c.setSubordinateSearch(""); c.setMarketerWhatsappGroupName(""); c.setMarketerWhatsappGroupLink(""); c.resetMarketerAssignmentForm(); c.setAdminView("add-marketer"); c.fetchLocationCatalog().catch(() => {}); } },
      { title: "Delete Marketer", description: "Remove active marketer", icon: "▣", tone: "rose", onClick: () => { c.setAdminView("delete-marketer"); c.fetchMarketers(); } },
      { title: "Old Marketers", description: "Restore deleted marketers", icon: "▤", tone: "pink", onClick: () => { c.setAdminView("old-marketers"); c.fetchDeletedMarketers(); } }
    ] },
    { title: "Resources & Communication", icon: "▰", description: "Catalogues, media and verification", items: [
      { title: "Catalogues", description: "Upload and manage PDFs", icon: "▥", tone: "mint", onClick: () => { c.setAdminView("catalogues"); c.setCatalogueSearch(""); c.fetchCatalogues(); } },
      { title: "Media", description: "Manage visit pictures", icon: "▧", tone: "violet", onClick: () => { c.setAdminView("media"); c.fetchAllReports(); c.fetchDeletedMedia(); c.setMediaMarketer(null); c.setSelectedMediaIds([]); c.setSelectedDeletedMediaIds([]); c.setMediaView("active"); } },
      { title: "Verification Calls", description: "Verify school visits", icon: "☎", tone: "violet", onClick: () => c.setAdminView("verification-reports") },
      { title: "Recently Deleted", description: "Restore removed media", icon: "♻", tone: "mint", onClick: () => { c.setAdminView("media"); c.fetchAllReports(); c.fetchDeletedMedia(); c.setMediaMarketer(null); c.setSelectedMediaIds([]); c.setSelectedDeletedMediaIds([]); c.setMediaView("deleted"); } }
    ] }
  ];
  sections.push({ title: "Card Studio", icon: "🎨", description: "Create printable cards", items: [
    { title: "Card Designer", description: "Add details to your card design", icon: "🎨", tone: "rose", onClick: () => c.setAdminView("card-designer") }
  ] });
  return <DashboardHome role="admin" stats={stats} sections={sections} />;
}
