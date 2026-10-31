import React, { useEffect, useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import DashboardHome from "../../ui/DashboardHome.jsx";
import { request } from "../../services/authApi.js";

export default function MarketerHomePanel({ unreadNewsCount = 0 }) {
  const c = usePortalContext();
  const [statsReady, setStatsReady] = useState({ visits: false, samples: false });
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    let active = true;
    request("/visits/summary").then((result) => {
      if (!active) return;
      setSummary(result.summary);
      setStatsReady({ visits: true, samples: true });
    }).catch(() => {
      c.fetchMarketerReports(c.user.email).then(() => { if (active) setStatsReady((current) => ({ ...current, visits: true })); }).catch(() => {});
      c.fetchMarketerSamples(c.user.email).then(() => { if (active) setStatsReady((current) => ({ ...current, samples: true })); }).catch(() => {});
    });
    return () => { active = false; };
  }, [c.user.email, c.syncState?.syncedAt]);
  const visits = c.marketerReports || [];
  const today = c.getDateKey(new Date());
  const attendance = c.todayAttendance;
  const stats = [
    { label: "My Visits", value: statsReady.visits ? summary?.visits ?? visits.length : "—", icon: "▥", tone: "rose" },
    { label: "Today's Visits", value: statsReady.visits ? summary?.todayVisits ?? visits.filter((item) => c.getDateKey(item.createdAt) === today).length : "—", icon: "▦", tone: "mint" },
    { label: "Monthly Visits", value: statsReady.visits ? summary?.monthlyVisits ?? visits.filter((item) => c.getDateKey(item.createdAt).startsWith(today.slice(0, 7))).length : "—", icon: "▥", tone: "pink" },
    { label: "My Samples", value: statsReady.samples ? summary?.samples ?? (c.marketerSamples || []).length : "—", icon: "◇", tone: "amber" }
  ];
  const sections = [
    { title: "Daily Activity", icon: "▥", description: "Start and manage your day", items: [
      { title: "Mark Attendance", description: attendance?.endMarked ? "Day completed" : attendance?.startMarked ? "End time pending" : attendance?.status === "leave" ? "Leave submitted" : "Start, end or leave", icon: "◷", tone: "rose", onClick: c.openAttendanceForm },
      { title: "Monthly Attendance", description: "View your own calendar", icon: "▦", tone: "mint", onClick: () => c.setMarketerview("monthly-attendance") },
      { title: "Daily Action Plan", description: attendance?.actionPlanSent ? "Today's plan submitted" : attendance?.startMarked ? "Send your daily plan" : "Mark start time first", icon: attendance?.actionPlanSent ? "✓" : "▣", tone: "violet", muted: !attendance?.startMarked, onClick: c.openActionPlanForm },
      { title: "Add Visit", description: attendance?.status === "leave" ? "Closed for leave" : attendance?.endMarked ? "Closed after end time" : !attendance?.startMarked ? "Mark attendance first" : !attendance?.actionPlanSent ? "Send action plan first" : "Submit a school report", icon: "+", tone: "mint", muted: !attendance?.startMarked || !attendance?.actionPlanSent || attendance?.endMarked || attendance?.status === "leave", onClick: c.openAddVisit }
    ] },
    { title: "Visits & Reports", icon: "▤", description: "Your visits and expenses", items: [
      { title: "Today's Visits", description: "Check today's reports", icon: "☀", tone: "amber", onClick: () => { c.setMarketerview("today-visits"); c.fetchMarketerReports(c.user.email); c.setSelectedAdminMarketerBox(null); } },
      { title: "Visit History", description: "Filter your past visits", icon: "▥", tone: "pink", onClick: c.openVisitHistory },
      { title: "Expense Report", description: "KMs and daily expenses", icon: "▤", tone: "rose", onClick: c.openExpenseReport }
    ] },
    { title: "Samples", icon: "◇", description: "Send and review samples", items: [
      { title: "Add Sample", description: "Add sample details", icon: "+", tone: "amber", onClick: () => { c.setMarketerview("add-sample"); c.setSampleSchoolName(""); c.setSamplePrincipalName(""); c.setSamplePhone(""); c.setSampleDetailsText(""); c.setSampleSuccessMsg(""); } },
      { title: "Sample History", description: "View your samples", icon: "▣", tone: "violet", onClick: () => { c.setMarketerview("sample-history"); c.fetchMarketerSamples(c.user.email); c.setSampleHistoryFromDate(""); c.setSampleHistoryToDate(""); c.setSampleHistorySearch(""); } }
    ] },
    { title: "Resources & Support", icon: "▰", description: "Helpful materials and support", items: [
      { title: "News", description: "Updates and expense reports", icon: "📰", tone: "rose", badge: unreadNewsCount, onClick: () => c.setMarketerview("news") },
      { title: "Catalogues", description: "View and download PDFs", icon: "▥", tone: "mint", onClick: () => { c.setMarketerview("catalogues"); c.setCatalogueSearch(""); c.fetchCatalogues(); } },
      { title: "My Card", description: "View and download your card", icon: "▣", tone: "rose", onClick: () => c.setMarketerview("my-card") },
      { title: "Support", description: "Contact admin for help", icon: "☎", tone: "violet", onClick: () => c.setMarketerview("support") }
    ] }
  ];
  return <DashboardHome role="marketer" accountId={c.user?.id || c.user?.email} stats={stats} sections={sections} />;
}
