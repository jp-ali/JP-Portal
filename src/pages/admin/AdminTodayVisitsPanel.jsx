import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import AdminVisitActions from "../../ui/AdminVisitActions.jsx";

export default function AdminTodayVisitsPanel() {
  const { cardStyle, downloadExcel, downloadPDF, fetchTodayReports, getDateKey, getMarketerName, handleDeletePicture, handleDeleteVisit, inputStyle, renderExpandedReportChrome, renderReportExpandButton, renderVisitReportTable, reportViewClass, reports, setAdminView, setEditingVisit, setVisitSearch, visitSearch } = usePortalContext();
  const todayKey = getDateKey(new Date());
  const todayReports = reports.filter((report) => report.createdAt && getDateKey(report.createdAt) === todayKey);
  const search = visitSearch.trim().toLowerCase();
  const visibleReports = todayReports.filter((report) => {
    const name = getMarketerName(report.marketerEmail, report.marketerName || report.marketerEmail || "");
    return !search || String(report.marketerEmail || "").toLowerCase().includes(search) || String(name).toLowerCase().includes(search);
  });

  return <div className={reportViewClass("today-visits")}>
    {renderExpandedReportChrome("today-visits")}
    <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
      <button onClick={() => setAdminView("home")} style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back</button>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="white-refresh-btn" type="button" title="Refresh today's visits" aria-label="Refresh today's visits" onClick={() => fetchTodayReports(true)} style={{ width: "38px", height: "38px", padding: 0, background: "#fff", color: "#7a0f2b", border: "1px solid #ddcbd0", borderRadius: "9px", fontWeight: 900, fontSize: "18px", cursor: "pointer" }}>↻</button>
        <button onClick={() => downloadExcel(visibleReports, "All_Today_Visits.xlsx")} style={{ padding: "6px 12px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}>📥 Excel</button>
        <button onClick={() => downloadPDF(visibleReports)} style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}>📄 PDF</button>
        {renderReportExpandButton("today-visits", "Expand today's visits")}
      </div>
    </div>
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "14px" }}>☀️ Today's Visits</h3>
      <input type="text" placeholder="🔍 Search marketer name or email..." value={visitSearch} onChange={(event) => setVisitSearch(event.target.value)} style={{ ...inputStyle, marginBottom: "16px", fontSize: "14px", padding: "12px 14px" }} />
      {visibleReports.length ? renderVisitReportTable(visibleReports, null, (report) => <AdminVisitActions visit={report} onEdit={setEditingVisit} onDeletePicture={(id) => handleDeletePicture(id, true)} onDeleteReport={(id) => handleDeleteVisit(id, true)} />) : <p style={{ color: "#78686d", fontSize: "14px" }}>No visit reports available for today.</p>}
    </div>
  </div>;
}
