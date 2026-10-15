import { PortalContext } from "../context/PortalContext.jsx";
import AdminHomePanel from "./admin/AdminHomePanel.jsx";
import AdminAttendancePanel from "./admin/AdminAttendancePanel.jsx";
import AdminCataloguesPanel from "./admin/AdminCataloguesPanel.jsx";
import AdminVerificationCallsPanel from "./admin/AdminVerificationCallsPanel.jsx";
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
import React from "react";

function AdminPortalContent({ context }) {
  const { adminCss, adminSidebarOpen, adminView, containerStyle, fetchActionPlans, fetchAllReports, fetchAllSamples, fetchAttendanceRecords, fetchCatalogues, fetchDeletedMarketers, fetchDeletedMedia, fetchLocationCatalog, fetchMarketers, footerStyle, formatTime12, fullScreenImage, fullScreenMediaRecord, getTodayInputDate, globalStyle, handleLogout, marketerEmail, mediaView, openAdminExpenseReport, openVerificationCalls, pdfExportData, pdfTemplateRef, portalSkeletonLoading, renderBackgroundStationary, renderBrandingStrip, renderLogoutArrowIcon, renderMarketerPersonIcon, renderRedSkeleton, renderResponsiveStyles, reports, resetMarketerAssignmentForm, restoreMedia, setAdminActionPlanFromDate, setAdminActionPlanSearch, setAdminActionPlanToDate, setAdminAttendanceFromDate, setAdminAttendanceSearch, setAdminAttendanceToDate, setAdminSampleFromDate, setAdminSampleMarketersFilter, setAdminSampleToDate, setAdminSidebarOpen, setAdminView, setAllVisitsFromDate, setAllVisitsToDate, setCatalogueSearch, setEditingId, setEditingReturnToMarketerDetails, setFullScreenImage, setFullScreenMediaRecord, setMarketerAssignedKms, setMarketerDesignation, setMarketerEmail, setMarketerName, setMarketerPass, setMarketerPhone, setMarketerWhatsappGroupLink, setMarketerWhatsappGroupName, setMediaMarketer, setMediaView, setSelectedAdminAllBoxKey, setSelectedAdminAllSchoolBox, setSelectedAdminMarketerBox, setSelectedAdminSampleMarketerBox, setSelectedAdminSampleSchoolBox, setSelectedDeletedMediaIds, setSelectedMarketerDetailBox, setSelectedMarketersFilter, setSelectedMediaIds, setSubordinateMarketerIds, setSubordinatePickerOpen, setSubordinateSearch, softDeleteMedia } = context;

const getMarketerCountsAndList = (filteredReports) => {
const counts = {};
filteredReports.forEach(r => {
const mKey = r.marketerEmail;
counts[mKey] = (counts[mKey] || 0) + 1;
});
return counts;
};
const todayReports = reports.filter(r => {
if (!r.createdAt) return false;
const rDate = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
const today = new Date();
return (
rDate.getDate() === today.getDate() &&
rDate.getMonth() === today.getMonth() &&
rDate.getFullYear() === today.getFullYear()
);
});
const todayCounts = getMarketerCountsAndList(todayReports);
const openAdminSidebarSection = (key) => {
setAdminSidebarOpen(false);
if (key === "home") {
setAdminView("home");
return;
}
if (key === "attendance") {
setAdminAttendanceFromDate("");
setAdminAttendanceToDate("");
setAdminAttendanceSearch("");
setAdminView("attendance");
fetchAttendanceRecords();
return;
}
if (key === "action-plans") {
const today = getTodayInputDate();
setAdminActionPlanFromDate(today);
setAdminActionPlanToDate(today);
setAdminActionPlanSearch("");
setAdminView("action-plans");
fetchActionPlans();
return;
}
if (key === "today-visits") {
setAdminView("today-visits");
fetchAllReports();
setSelectedAdminMarketerBox(null);
return;
}
if (key === "visits") {
setAdminView("visits");
fetchAllReports();
setSelectedAdminAllBoxKey(null);
setSelectedAdminAllSchoolBox(null);
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
if (key === "catalogues") {
setAdminView("catalogues");
setCatalogueSearch("");
fetchCatalogues();
return;
}
if (key === "verification-calls") {
openVerificationCalls();
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
{ key: "action-plans", icon: "🗓️", label: "Action Plan", active: adminView === "action-plans" },
{ key: "today-visits", icon: "☀️", label: "Today Visits", active: adminView === "today-visits" },
{ key: "visits", icon: "📊", label: "All Visits & Reports", active: adminView === "visits" },
{ key: "sample-details", icon: "📦", label: "Sample Details", active: adminView === "sample-details" },
{ key: "expense-report", icon: "🧾", label: "Expense Report", active: adminView === "expense-report" },
{ key: "marketers-detail", icon: renderMarketerPersonIcon(18, true), label: "Marketer Details", active: adminView === "marketers-detail" },
{ key: "add-marketer", icon: "➕", label: "Add Marketer", active: adminView === "add-marketer" },
{ key: "delete-marketer", icon: "🗑️", label: "Delete Marketer", active: adminView === "delete-marketer" },
{ key: "old-marketers", icon: "🗄️", label: "Old Marketers", active: adminView === "old-marketers" },
{ key: "verification-calls", icon: "☎️", label: "Verification Calls", active: adminView === "verification-calls" },
{ key: "media-active", icon: "🖼️", label: "Media", active: adminView === "media" && mediaView === "active" },
{ key: "media-deleted", icon: "♻️", label: "Recently Deleted", active: adminView === "media" && mediaView === "deleted" }
];
return (
<div style={globalStyle}>
        {renderBackgroundStationary()}
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
            <div>
              <div className="admin-desktop-sidebar-title">Javed Publishers</div>
              <div style={{ color: "#756369", fontSize: "10.5px", marginTop: "2px" }}>Admin Panel</div>
            </div>
            <div className="admin-sidebar-head-actions">
              <button type="button" className="admin-desktop-sidebar-close" onClick={() => setAdminSidebarOpen(false)} title="Close menu" aria-label="Close menu">◀</button>
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
        </aside>
        <div className={`app-responsive admin-desktop-content ${adminSidebarOpen ? "sidebar-open" : ""}`} style={containerStyle}>
          {renderResponsiveStyles()}
          {renderBrandingStrip(() => setAdminSidebarOpen(true), adminSidebarOpen)}
          {portalSkeletonLoading && renderRedSkeleton()}
          {adminView === "home" && (
<AdminHomePanel />
)}
          {adminView === "attendance" && (
<AdminAttendancePanel />
)}
          {adminView === "catalogues" && (
<AdminCataloguesPanel />
)}
          {adminView === "verification-calls" && (
<AdminVerificationCallsPanel />
)}
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
                            <td>{formatTime12(item.visitTime || (item.createdAt && item.createdAt.toDate ? item.createdAt.toDate() : null))}</td>
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
        {fullScreenImage && (
<div onClick={() => { setFullScreenImage(null); setFullScreenMediaRecord(null); }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", cursor:"zoom-out" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "80vh", position: "relative", cursor:"default" }}>
              <img src={fullScreenImage} alt="Full View" style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: "12px", objectFit: "contain" }} />
            </div>
            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <a href={fullScreenImage} download="photo.jpg" style={{ padding: "10px 20px", background: "#8f1532", color: "white", borderRadius: "10px", textDecoration: "none", fontWeight: "600", fontSize: "14px" }}>📥 Download Image</a>
              {fullScreenMediaRecord?.type === "active" && <button onClick={async()=>{const r=fullScreenMediaRecord.record;setFullScreenImage(null);setFullScreenMediaRecord(null);await softDeleteMedia(r);}} style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>🗑️ Delete Picture</button>}
              {fullScreenMediaRecord?.type === "deleted" && <button onClick={async()=>{const r=fullScreenMediaRecord.record;setFullScreenImage(null);setFullScreenMediaRecord(null);await restoreMedia(r);}} style={{ padding: "10px 20px", background: "#86132f", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>♻️ Restore Picture</button>}
              <button onClick={() => { setFullScreenImage(null); setFullScreenMediaRecord(null); }} style={{ padding: "10px 20px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>❌ Close</button>
            </div>
          </div>
)}
        <div className="mobile-footer-area" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", margin: "0 auto", padding: "18px 0 10px", position: "relative", left: 0, right: 0 }}>
          <button className="mobile-footer-logout" onClick={handleLogout} style={{ display: "flex", width: "104px", height: "36px", margin: "0 auto 8px", padding: "0 11px", alignItems: "center", justifyContent: "center", gap:"7px", alignSelf: "center", position: "static", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 800, fontSize: "13px", lineHeight: 1, textAlign: "center", cursor: "pointer", boxShadow: "0 5px 12px rgba(122,15,43,.26)" }}>{renderLogoutArrowIcon(16)} Logout</button>
          <div style={{ ...footerStyle, width: "100%", textAlign: "center", margin: "0 auto", padding: "0" }}>Created by Ali Ashfaq</div>
        </div>
      </div>
);

}

export default function AdminPortal({ context }) {
  return <PortalContext.Provider value={context}><AdminPortalContent context={context} /></PortalContext.Provider>;
}
