import { PortalContext } from "../context/PortalContext.jsx";
import { visitTimeForDisplay } from "../domain/visitTime.js";
import AdminHomePanel from "./admin/AdminHomePanel.jsx";
import AdminAttendancePanel from "./admin/AdminAttendancePanel.jsx";
import AdminCataloguesPanel from "./admin/AdminCataloguesPanel.jsx";
import AdminVerificationCallsPanel from "./admin/AdminVerificationCallsPanel.jsx";
import AdminOtherReportsPanel from "./admin/AdminOtherReportsPanel.jsx";
import AdminCardDesignerPanel from "./admin/AdminCardDesignerPanel.jsx";
import AdminSavedCardsPanel from "./admin/AdminSavedCardsPanel.jsx";
import MarketerCardPanel from "./marketer/MarketerCardPanel.jsx";
import DashboardHiddenPanel from "../ui/DashboardHiddenPanel.jsx";
import AdminAttendanceMediaPanel from "./admin/AdminAttendanceMediaPanel.jsx";
import AdminActionPlansPanel from "./admin/AdminActionPlansPanel.jsx";
import AdminMediaPanel from "./admin/AdminMediaPanel.jsx";
import AdminSampleDetailsPanel from "./admin/AdminSampleDetailsPanel.jsx";
import AdminTodayVisitsPanel from "./admin/AdminTodayVisitsPanel.jsx";
import AdminVisitsPanel from "./admin/AdminVisitsPanel.jsx";
import AdminExpenseReportPanel from "./admin/AdminExpenseReportPanel.jsx";
import AdminMarketersDetailPanel from "./admin/AdminMarketersDetailPanel.jsx";
import AdminAddMarketerPanel from "./admin/AdminAddMarketerPanel.jsx";
import AdminDeleteMarketerPanel from "./admin/AdminDeleteMarketerPanel.jsx";
import AdminOldMarketersPanel from "./admin/AdminOldMarketersPanel.jsx";
import AdminNewsPanel from "./admin/AdminNewsPanel.jsx";
import React from "react";
import { useEffect, useState } from "react";
import { getAdminProfilePhoto, request } from "../services/authApi.js";
import PhotoViewer from "../ui/PhotoViewer.jsx";
import VisitEditDialog from "../ui/VisitEditDialog.jsx";
import PortalTopBar from "../ui/PortalTopBar.jsx";
import DesktopSectionBanner from "../ui/DesktopSectionBanner.jsx";
import MonthlyAttendance from "../ui/MonthlyAttendance.jsx";

function AdminPortalContent({ context }) {
  const { setMarketerCnic } = context;
  useEffect(() => {
    let active = true;
    getAdminProfilePhoto().then(({ profilePhoto }) => {
      if (active) context.setUser((current) => ({ ...current, profilePhoto }));
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const [customReports, setCustomReports] = useState([]);
  const [selectedCustomReportId, setSelectedCustomReportId] = useState("");
  const [customReportsLoading, setCustomReportsLoading] = useState(false);
  const [customReportsError, setCustomReportsError] = useState("");
  const [customReportOrigin, setCustomReportOrigin] = useState("other");
  const [selectedSavedCardId, setSelectedSavedCardId] = useState("");
  useEffect(() => { if (context.adminView === "home") setSelectedSavedCardId(""); }, [context.adminView]);
  const reloadCustomReports = async () => {
    setCustomReportsLoading(true);
    try { const result = await request("/custom-reports"); setCustomReports((result.reports || []).filter((report) => !report.deletedAt)); setCustomReportsError(""); }
    catch (error) { setCustomReportsError(error.message); }
    finally { setCustomReportsLoading(false); }
  };
  useEffect(() => { if (["other-reports", "verification-reports"].includes(context.adminView)) { reloadCustomReports(); context.fetchMarketers(); } }, [context.adminView]);
  const { adminCss, adminSidebarOpen, adminView, containerStyle, fetchActionPlans, fetchAllReports, fetchAllSamples, fetchAttendanceRecords, fetchCatalogues, fetchDeletedMarketers, fetchDeletedMedia, fetchLocationCatalog, fetchMarketers, footerStyle, formatTime12, fullScreenImage, fullScreenMediaRecord, getTodayInputDate, globalStyle, handleLogout, marketerEmail, mediaView, openAdminExpenseReport, openVerificationCalls, pdfExportData, pdfTemplateRef, portalSkeletonLoading, renderBackgroundStationary, renderBrandingStrip, renderLogoutArrowIcon, renderMarketerPersonIcon, renderRedSkeleton, renderResponsiveStyles, reports, resetMarketerAssignmentForm, restoreMedia, setAdminActionPlanFromDate, setAdminActionPlanMarketerIds, setAdminActionPlanToDate, setAdminAttendanceFromDate, setAdminAttendanceSearch, setAdminAttendanceToDate, setAdminSampleFromDate, setAdminSampleMarketersFilter, setAdminSampleToDate, setAdminSidebarOpen, setAdminView, setAllVisitsFromDate, setAllVisitsToDate, setCatalogueSearch, setEditingId, setEditingReturnToMarketerDetails, setFullScreenImage, setFullScreenMediaRecord, setMarketerAssignedKms, setMarketerDesignation, setMarketerEmail, setMarketerName, setMarketerPass, setMarketerPhone, setMarketerWhatsappGroupLink, setMarketerWhatsappGroupName, setMediaMarketer, setMediaView, setSelectedAdminAllBoxKey, setSelectedAdminMarketerBox, setSelectedAdminSampleMarketerBox, setSelectedAdminSampleSchoolBox, setSelectedDeletedMediaIds, setSelectedMarketerDetailBox, setSelectedMarketersFilter, setSelectedMediaIds, setSubordinateMarketerIds, setSubordinatePickerOpen, setSubordinateSearch, softDeleteMedia } = context;

const openAdminSidebarSection = (key) => {
setAdminSidebarOpen(false);
if (key === "home") {
setAdminView("home");
return;
}
if (key === "attendance") {
setAdminAttendanceFromDate(getTodayInputDate());
setAdminAttendanceToDate(getTodayInputDate());
setAdminAttendanceSearch("");
setAdminView("attendance");
fetchAttendanceRecords();
return;
}
if (key === "monthly-attendance") {
setAdminView("monthly-attendance");
fetchMarketers();
return;
}
if (key === "action-plans") {
const today = getTodayInputDate();
setAdminActionPlanFromDate(today);
setAdminActionPlanToDate(today);
setAdminActionPlanMarketerIds([]);
setAdminView("action-plans");
fetchActionPlans();
return;
}
if (key === "today-visits") {
setAdminView("today-visits");
context.fetchTodayReports();
setSelectedAdminMarketerBox(null);
return;
}
if (key === "visits") {
setAdminView("visits");
fetchAllReports();
fetchMarketers();
setSelectedAdminAllBoxKey(null);

setAllVisitsFromDate("");
setAllVisitsToDate("");
setSelectedMarketersFilter([]);
return;
}
if (key === "sample-details") {
setAdminView("sample-details");
fetchAllSamples();
fetchMarketers();
setSelectedAdminSampleMarketerBox(null);
setSelectedAdminSampleSchoolBox(null);
setAdminSampleFromDate("");
setAdminSampleToDate("");
setAdminSampleMarketersFilter([]);
return;
}
if (key === "expense-report") {
openAdminExpenseReport();
return;
}
if (key === "news") {
setAdminView("news-add");
return;
}
if (key === "catalogues") {
setAdminView("catalogues");
setCatalogueSearch("");
fetchCatalogues();
return;
}
if (key === "verification-calls") {
setAdminView("verification-reports");
return;
}
if (key === "other-reports") {
setAdminView("other-reports");
return;
}
if (key === "card-designer") {
setSelectedSavedCardId("");
setAdminView("card-designer");
return;
}
if (key === "admin-my-card") {
setAdminView("admin-my-card");
return;
}
if (key === "saved-cards") {
setAdminView("saved-cards");
return;
}
if (key === "hidden") {
setAdminView("hidden");
return;
}
if (key === "marketers-detail") {
setAdminView("marketers-detail");
fetchMarketers();
setSelectedMarketerDetailBox(null);
return;
}
if (key === "add-marketer") {
setEditingId(null);
setEditingReturnToMarketerDetails(false);
setMarketerName("");
setMarketerPhone("");
setMarketerEmail("");
setMarketerCnic("");
setMarketerPass("");
setMarketerDesignation("");
setMarketerAssignedKms("");
setSubordinateMarketerIds([]);
setSubordinatePickerOpen(false);
setSubordinateSearch("");
setMarketerWhatsappGroupName("");
setMarketerWhatsappGroupLink("");
resetMarketerAssignmentForm();
setAdminView("add-marketer");
fetchLocationCatalog().catch(() => {});
return;
}
if (key === "delete-marketer") {
setAdminView("delete-marketer");
fetchMarketers();
return;
}
if (key === "old-marketers") {
setAdminView("old-marketers");
fetchDeletedMarketers();
return;
}
if (key === "media-active") {
setAdminView("media");
fetchAllReports();
fetchDeletedMedia();
setMediaMarketer(null);
setSelectedMediaIds([]);
setSelectedDeletedMediaIds([]);
setMediaView("active");
return;
}
if (key === "media-deleted") {
setAdminView("media");
fetchAllReports();
fetchDeletedMedia();
setMediaMarketer(null);
setSelectedMediaIds([]);
setSelectedDeletedMediaIds([]);
setMediaView("deleted");
}
};
const adminSidebarItems = [
{ key: "home", icon: "🏠", label: "Home", active: adminView === "home" },
{ key: "attendance", icon: "🕘", label: "Attendance", active: adminView === "attendance" || adminView === "attendance-media" },
{ key: "monthly-attendance", icon: "📅", label: "Monthly Attendance", active: adminView === "monthly-attendance" },
{ key: "action-plans", icon: "🗓️", label: "Action Plan", active: adminView === "action-plans" },
{ key: "today-visits", icon: "☀️", label: "Today Visits", active: adminView === "today-visits" },
{ key: "visits", icon: "📊", label: "All Visits & Reports", active: adminView === "visits" },
{ key: "sample-details", icon: "📦", label: "Sample Details", active: adminView === "sample-details" },
{ key: "expense-report", icon: "🧾", label: "Expense Report", active: adminView === "expense-report" },
{ key: "news", icon: "📰", label: "News", active: ["news", "news-add", "news-expense", "news-old", "news-deleted"].includes(adminView) },
{ key: "marketers-detail", icon: renderMarketerPersonIcon(18, true), label: "Marketer Details", active: adminView === "marketers-detail" },
{ key: "add-marketer", icon: "➕", label: "Add Marketer", active: adminView === "add-marketer" },
{ key: "delete-marketer", icon: "🗑️", label: "Delete Marketer", active: adminView === "delete-marketer" },
{ key: "old-marketers", icon: "🗄️", label: "Old Marketers", active: adminView === "old-marketers" },
{ key: "catalogues", icon: "📚", label: "Catalogues", active: adminView === "catalogues" },
{ key: "media-active", icon: "🖼️", label: "Media", active: adminView === "media" && mediaView === "active" },
{ key: "verification-calls", icon: "☎️", label: "Verification Calls", active: ["verification-reports", "verification-calls"].includes(adminView) },
{ key: "other-reports", icon: "📋", label: "Other Reports", active: adminView === "other-reports" || adminView === "custom-report" },
{ key: "media-deleted", icon: "♻️", label: "Recently Deleted", active: adminView === "media" && mediaView === "deleted" },
{ key: "card-designer", icon: "🎨", label: "Card Designer", active: adminView === "card-designer" },
{ key: "admin-my-card", icon: "▣", label: "My Card", active: adminView === "admin-my-card" },
{ key: "saved-cards", icon: "🪪", label: "Saved Cards", active: adminView === "saved-cards" },
{ key: "hidden", icon: "🙈", label: "Hidden", active: adminView === "hidden" }
];
return (
<div className="portal-shell portal-admin-shell" style={globalStyle}>
        <style>{adminCss}</style>
        <button
type="button"
className={`admin-desktop-menu-toggle ${adminSidebarOpen ? "sidebar-is-open" : ""}`}
onClick={() => setAdminSidebarOpen(true)}
aria-label="Open admin menu"
title="Open Admin Menu"
>☰</button>
        <div className={`admin-sidebar-backdrop ${adminSidebarOpen ? "open" : ""}`} onClick={() => setAdminSidebarOpen(false)} aria-hidden="true" />
        <aside className={`admin-desktop-sidebar ${adminSidebarOpen ? "open" : ""}`}>
          <div className="admin-desktop-sidebar-head">
            <div className="portal-sidebar-brand"><span className="portal-sidebar-logo">JP<span>.</span></span><strong>JAVED PUBLISHERS</strong></div>
            <div className="admin-sidebar-head-actions">
              <button type="button" className="admin-desktop-sidebar-close" onClick={() => setAdminSidebarOpen(false)} title="Close menu" aria-label="Close menu"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m14 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
              <button type="button" className="admin-sidebar-logout" onClick={() => { setAdminSidebarOpen(false); handleLogout(); }} title="Logout" aria-label="Logout">{renderLogoutArrowIcon(18)}</button>
            </div>
          </div>
          <nav className="admin-desktop-sidebar-nav">
            {adminSidebarItems.map((item) => (
<button
type="button"
key={item.key}
className={`admin-desktop-sidebar-item ${item.active ? "active" : ""}`}
onClick={() => openAdminSidebarSection(item.key)}
>
                <span className="admin-desktop-sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
))}
          </nav>
          <div className="portal-sidebar-footer"><div className="portal-sidebar-profile"><span className="portal-sidebar-avatar">{context.user?.profilePhoto ? <img src={context.user.profilePhoto} alt="" /> : "A"}</span><span><strong>Admin</strong><small>Javed Publishers</small></span></div><button type="button" onClick={handleLogout}>{renderLogoutArrowIcon(16)} Logout</button></div>
        </aside>
        <div className={`app-responsive admin-desktop-content ${adminSidebarOpen ? "sidebar-open" : ""}`} style={containerStyle}>
          {renderResponsiveStyles()}
          <PortalTopBar role="admin" name="Admin" items={adminSidebarItems} onNavigate={openAdminSidebarSection} onMenu={() => setAdminSidebarOpen(true)} onLogout={handleLogout} profilePhoto={context.user?.profilePhoto} onProfilePhotoChange={(photo) => context.setUser((current) => ({ ...current, profilePhoto: photo }))} onExpandProfilePhoto={setFullScreenImage} />
          {!(["delete-marketer", "old-marketers", "news", "news-add", "news-expense", "news-old", "news-deleted"].includes(adminView)) && <DesktopSectionBanner view={adminView} role="admin" accountId={context.user?.id || context.user?.email || "admin"} title={adminView === "media" && mediaView === "deleted" ? "Recently Deleted" : undefined} />}
          {portalSkeletonLoading && renderRedSkeleton()}
          {adminView === "home" && (
<AdminHomePanel />
)}
          {adminView === "attendance" && (
<AdminAttendancePanel />
)}
          {adminView === "monthly-attendance" && <MonthlyAttendance role="admin" marketers={context.marketersList} onBack={() => setAdminView("home")} />}
          {adminView === "catalogues" && (
<AdminCataloguesPanel />
)}
          {adminView === "verification-calls" && (
<AdminVerificationCallsPanel />
)}
          {["other-reports", "verification-reports", "custom-report"].includes(adminView) && (
<AdminOtherReportsPanel mode={adminView === "custom-report" ? customReportOrigin : adminView === "verification-reports" ? "verification" : "other"} reports={customReports} setReports={setCustomReports} selectedId={selectedCustomReportId} setSelectedId={setSelectedCustomReportId} loading={customReportsLoading} loadError={customReportsError} reload={reloadCustomReports} onOrigin={setCustomReportOrigin} />
)}
          {adminView === "card-designer" && <AdminCardDesignerPanel cardId={selectedSavedCardId} onSaved={setSelectedSavedCardId} onOpenSaved={() => setAdminView("saved-cards")} onBack={() => setAdminView(selectedSavedCardId === "admincard" ? "admin-my-card" : selectedSavedCardId ? "saved-cards" : "home")} />}
          {adminView === "admin-my-card" && <MarketerCardPanel endpoint="/cards/admin-card" title="My Card" onBack={() => setAdminView("home")} onEdit={(id) => { setSelectedSavedCardId(id); setAdminView("card-designer"); }} />}
          {adminView === "saved-cards" && <AdminSavedCardsPanel onBack={() => setAdminView("home")} onEdit={(id) => { setSelectedSavedCardId(id); setAdminView("card-designer"); }} onNew={() => { setSelectedSavedCardId(""); setAdminView("card-designer"); }} />}
          {adminView === "hidden" && <DashboardHiddenPanel role="admin" accountId={context.user?.id || context.user?.email || "admin"} onBack={() => setAdminView("home")} />}
          {adminView === "attendance-media" && (
<AdminAttendanceMediaPanel />
)}
          {adminView === "action-plans" && (
<AdminActionPlansPanel />
)}
          {adminView === "media" && (
<AdminMediaPanel />
)}
          {adminView === "sample-details" && (
<AdminSampleDetailsPanel />
)}
          {adminView === "today-visits" && (
<AdminTodayVisitsPanel />
)}
          {adminView === "visits" && (
<AdminVisitsPanel />
)}
          {adminView === "expense-report" && (
<AdminExpenseReportPanel />
)}
          {["news", "news-add", "news-expense", "news-old", "news-deleted"].includes(adminView) && <AdminNewsPanel mode={adminView === "news-expense" ? "expense" : adminView === "news-old" ? "old" : adminView === "news-deleted" ? "deleted" : "add"} />}
          {adminView === "marketers-detail" && (
<AdminMarketersDetailPanel />
)}
          {adminView === "add-marketer" && (
<AdminAddMarketerPanel />
)}
          {adminView === "delete-marketer" && (
<AdminDeleteMarketerPanel />
)}
          {adminView === "old-marketers" && (
<AdminOldMarketersPanel />
)}
        </div>
        <div ref={pdfTemplateRef} style={{ position: 'absolute', left: '-9999px', width: '1100px', background: 'white', padding: '20px', fontFamily: 'Arial, sans-serif', color: '#000' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} className="pdf-table">
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th>Sr.</th>
                        <th>Name</th>
                        <th>Date</th>
                        <th>School Name</th>
                        <th>City</th>
                        <th>Area</th>
                        <th>Contact Person</th>
                        <th>Phone No</th>
                        <th>Time</th>
                        <th>Session</th>
                        <th>Purpose / Details</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {pdfExportData.map((item, idx) => (
<tr key={item.id || idx}>
                            <td>{idx + 1}</td>
                            <td>{item.marketerEmail}</td>
                            <td>{item.createdAt && item.createdAt.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                            <td>{item.schoolName}</td>
                            <td>{item.cityName || 'N/A'}</td>
                            <td>{item.areaName || 'N/A'}</td>
                            <td>{item.principalName}</td>
                            <td>{item.phone}</td>
                            <td>{formatTime12(visitTimeForDisplay(item))}</td>
                            <td>{item.session || 'N/A'}</td>
                            <td>{item.purpose || item.sampleDetails || 'N/A'}</td>
                            <td style={{ textAlign: 'left' }}>{item.notes || 'N/A'}</td>
                        </tr>
))}
                </tbody>
            </table>
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <div><strong>Signature:</strong> _______________________</div>
                <div>Page 1 of 1</div>
            </div>
        </div>
        {context.editingVisit && <VisitEditDialog key={context.editingVisit.id} visit={context.editingVisit} onClose={() => context.setEditingVisit(null)} onSave={context.saveVisitEdit} inputStyle={context.inputStyle} />}
        <PhotoViewer
          image={fullScreenImage}
          mediaRecord={fullScreenMediaRecord}
          onClose={() => { setFullScreenImage(null); setFullScreenMediaRecord(null); }}
          onDelete={async (record) => { setFullScreenImage(null); setFullScreenMediaRecord(null); await softDeleteMedia(record); }}
          onRestore={async (record) => { setFullScreenImage(null); setFullScreenMediaRecord(null); await restoreMedia(record); }}
        />
        <div className="mobile-footer-area" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", margin: "0 auto", padding: "18px 0 10px", position: "relative", left: 0, right: 0 }}>
          <button className="mobile-footer-logout" onClick={handleLogout} style={{ display: "flex", width: "104px", height: "36px", margin: "0 auto 8px", padding: "0 11px", alignItems: "center", justifyContent: "center", gap:"7px", alignSelf: "center", position: "static", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 800, fontSize: "13px", lineHeight: 1, textAlign: "center", cursor: "pointer", boxShadow: "0 5px 12px rgba(122,15,43,.26)" }}>{renderLogoutArrowIcon(16)} Logout</button>
          <div style={{ ...footerStyle, width: "100%", textAlign: "center", margin: "0 auto", padding: "0" }}>Developed by Ali Ashfaq</div>
        </div>
      </div>
);

}

export default function AdminPortal({ context }) {
  return <PortalContext.Provider value={context}><AdminPortalContent context={context} /></PortalContext.Provider>;
}
