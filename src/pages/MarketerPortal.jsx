import { PortalContext } from "../context/PortalContext.jsx";
import MarketerHomePanel from "./marketer/MarketerHomePanel.jsx";
import MarketerAttendancePanel from "./marketer/MarketerAttendancePanel.jsx";
import MarketerActionPlanPanel from "./marketer/MarketerActionPlanPanel.jsx";
import MarketerExpenseReportPanel from "./marketer/MarketerExpenseReportPanel.jsx";
import MarketerCataloguesPanel from "./marketer/MarketerCataloguesPanel.jsx";
import MarketerSupportPanel from "./marketer/MarketerSupportPanel.jsx";
import MarketerAddSamplePanel from "./marketer/MarketerAddSamplePanel.jsx";
import MarketerSampleHistoryPanel from "./marketer/MarketerSampleHistoryPanel.jsx";
import MarketerAddVisitPanel from "./marketer/MarketerAddVisitPanel.jsx";
import MarketerTodayVisitsPanel from "./marketer/MarketerTodayVisitsPanel.jsx";
import MarketerRangeVisitsPanel from "./marketer/MarketerRangeVisitsPanel.jsx";
import React from "react";
import PhotoViewer from "../ui/PhotoViewer.jsx";
import VisitEditDialog from "../ui/VisitEditDialog.jsx";
import PortalTopBar from "../ui/PortalTopBar.jsx";

function MarketerPortalContent({ context }) {
  const { containerStyle, fetchCatalogues, fetchMarketerReports, fetchMarketerSamples, footerStyle, formatTime12, fullScreenImage, fullScreenMediaRecord, getMarketerName, globalStyle, handleLogout, marketerCss, marketerSidebarOpen, marketerView, notes, openActionPlanForm, openAddVisit, openAttendanceForm, openExpenseReport, openVisitHistory, pdfExportData, pdfTemplateRef, phone, portalSkeletonLoading, principalName, purpose, renderBackgroundStationary, renderBrandingStrip, renderLogoutArrowIcon, renderRedSkeleton, renderResponsiveStyles, restoreMedia, setCatalogueSearch, setFullScreenImage, setFullScreenMediaRecord, setMarketerSidebarOpen, setMarketerview, setSampleDetailsText, setSampleHistoryFromDate, setSampleHistorySearch, setSampleHistoryToDate, setSamplePhone, setSamplePrincipalName, setSampleSchoolName, setSampleSuccessMsg, setSelectedAdminMarketerBox, softDeleteMedia, user } = context;
const openMarketerSidebarSection = (key) => {
setMarketerSidebarOpen(false);
if (key === "home") { setMarketerview("home"); return; }
if (key === "attendance") { openAttendanceForm(); return; }
if (key === "action-plan") { openActionPlanForm(); return; }
if (key === "add-visit") { openAddVisit(); return; }
if (key === "today-visits") { setMarketerview("today-visits"); fetchMarketerReports(user.email); setSelectedAdminMarketerBox(null); return; }
if (key === "range-visits") { openVisitHistory(); return; }
if (key === "add-sample") { setMarketerview("add-sample"); setSampleSchoolName(""); setSamplePrincipalName(""); setSamplePhone(""); setSampleDetailsText(""); setSampleSuccessMsg(""); return; }
if (key === "sample-history") { setMarketerview("sample-history"); fetchMarketerSamples(user.email); setSampleHistoryFromDate(""); setSampleHistoryToDate(""); setSampleHistorySearch(""); return; }
if (key === "expense-report") { openExpenseReport(); return; }
if (key === "catalogues") { setMarketerview("catalogues"); setCatalogueSearch(""); fetchCatalogues(); return; }
if (key === "support") { setMarketerview("support"); return; }
};
const marketerSidebarItems = [
{ key: "home", icon: "⌂", label: "Home", active: marketerView === "home" },
{ key: "attendance", icon: "🕘", label: "Mark Attendance", active: marketerView === "attendance" },
{ key: "action-plan", icon: "🗓️", label: "Daily Action Plan", active: marketerView === "action-plan" },
{ key: "add-visit", icon: "➕", label: "Add Visit", active: marketerView === "add-visit" },
{ key: "today-visits", icon: "☀️", label: "Today's Visits", active: marketerView === "today-visits" },
{ key: "range-visits", icon: "📅", label: "Visit History", active: marketerView === "range-visits" },
{ key: "add-sample", icon: "📦", label: "Add Sample", active: marketerView === "add-sample" },
{ key: "sample-history", icon: "📋", label: "Sample History", active: marketerView === "sample-history" },
{ key: "expense-report", icon: "🧾", label: "Expense Report", active: marketerView === "expense-report" },
{ key: "catalogues", icon: "📚", label: "Catalogues", active: marketerView === "catalogues" },
{ key: "support", icon: "🎧", label: "Support", active: marketerView === "support" },
];
return (
<div className="portal-shell portal-marketer-shell" style={globalStyle}>
      <style>{marketerCss}</style>
      <button type="button" className={`marketer-menu-toggle ${marketerSidebarOpen ? "sidebar-is-open" : ""}`} onClick={() => setMarketerSidebarOpen(true)} aria-label="Open marketer menu" title="Open Menu">☰</button>
      <div className={`marketer-sidebar-backdrop ${marketerSidebarOpen ? "open" : ""}`} onClick={() => setMarketerSidebarOpen(false)} aria-hidden="true" />
      <aside className={`marketer-sidebar ${marketerSidebarOpen ? "open" : ""}`}>
        <div className="marketer-sidebar-head">
          <div className="portal-sidebar-brand"><span className="portal-sidebar-logo">JP<span>.</span></span><strong>JAVED PUBLISHERS</strong></div>
          <div className="marketer-sidebar-head-actions">
            <button type="button" className="marketer-sidebar-close" onClick={() => setMarketerSidebarOpen(false)} title="Close menu" aria-label="Close menu">◀</button>
            <button type="button" className="marketer-sidebar-logout" onClick={() => { setMarketerSidebarOpen(false); handleLogout(); }} title="Logout" aria-label="Logout">{renderLogoutArrowIcon(18)}</button>
          </div>
        </div>
        <nav className="marketer-sidebar-nav">
          {marketerSidebarItems.map((item) => (
<button type="button" key={item.key} className={`marketer-sidebar-item ${item.active ? "active" : ""}`} onClick={() => openMarketerSidebarSection(item.key)}>
              <span className="marketer-sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
))}
        </nav>
        <div className="portal-sidebar-footer"><div className="portal-sidebar-profile"><span className="portal-sidebar-avatar">{(user?.name || "M").charAt(0).toUpperCase()}</span><span><strong>{user?.name || "Marketer"}</strong><small>Javed Publishers</small></span></div><button type="button" onClick={handleLogout}>{renderLogoutArrowIcon(16)} Logout</button></div>
      </aside>
      <div className={`app-responsive marketer-portal-content ${marketerSidebarOpen ? "sidebar-open" : ""}`} style={containerStyle}>
        {renderResponsiveStyles()}
        <PortalTopBar role="marketer" name={user?.name || "Marketer"} items={marketerSidebarItems} onNavigate={openMarketerSidebarSection} onMenu={() => setMarketerSidebarOpen(true)} onLogout={handleLogout} />
        {portalSkeletonLoading && renderRedSkeleton()}
        {marketerView === "home" && (
<MarketerHomePanel />
)}
        {marketerView === "attendance" && (
<MarketerAttendancePanel />
)}
        {marketerView === "action-plan" && (
<MarketerActionPlanPanel />
)}
        {marketerView === "expense-report" && (
<MarketerExpenseReportPanel />
)}
        {marketerView === "catalogues" && (
<MarketerCataloguesPanel />
)}
        {marketerView === "support" && (
<MarketerSupportPanel />
)}
        {marketerView === "add-sample" && (
<MarketerAddSamplePanel />
)}
        {marketerView === "sample-history" && (
<MarketerSampleHistoryPanel />
)}
        {marketerView === "add-visit" && (
<MarketerAddVisitPanel />
)}
        {marketerView === "today-visits" && (
<MarketerTodayVisitsPanel />
)}
        {marketerView === "range-visits" && (
<MarketerRangeVisitsPanel />
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
                          <td>{getMarketerName(item.marketerEmail, item.marketerName || "N/A")}</td>
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
      {context.editingVisit && <VisitEditDialog key={context.editingVisit.id} visit={context.editingVisit} onClose={() => context.setEditingVisit(null)} onSave={context.saveVisitEdit} inputStyle={context.inputStyle} />}
      <PhotoViewer
          viewOnly
          image={fullScreenImage}
          mediaRecord={fullScreenMediaRecord}
          onClose={() => { setFullScreenImage(null); setFullScreenMediaRecord(null); }}
          onRestore={async (record) => { setFullScreenImage(null); setFullScreenMediaRecord(null); await restoreMedia(record); }}
        />
        <div className="mobile-footer-area" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", margin: "0 auto", padding: "18px 0 10px", position: "relative", left: 0, right: 0 }}>
        <button className="mobile-footer-logout" onClick={handleLogout} style={{ display: "flex", width: "104px", height: "36px", margin: "0 auto 8px", padding: "0 11px", alignItems: "center", justifyContent: "center", gap:"7px", alignSelf: "center", position: "static", left: "auto", right: "auto", transform: "none", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 800, fontSize: "13px", lineHeight: 1, textAlign: "center", cursor: "pointer", boxShadow: "0 5px 12px rgba(122,15,43,.26)" }}>{renderLogoutArrowIcon(16)} Logout</button>
        <div style={{ ...footerStyle, width: "100%", textAlign: "center", margin: "0 auto", padding: "0" }}>Created by Ali Ashfaq</div>
      </div>
    </div>
);

}

export default function MarketerPortal({ context }) {
  return <PortalContext.Provider value={context}><MarketerPortalContent context={context} /></PortalContext.Provider>;
}
