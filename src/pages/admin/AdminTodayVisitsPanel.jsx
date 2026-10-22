import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import AdminVisitActions from "../../ui/AdminVisitActions.jsx";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";

export default function AdminTodayVisitsPanel() {
  const { cardStyle, downloadExcel, downloadPDF, fetchMarketers, fetchTodayReports, getFilteredTodayVisitReports, handleDeletePicture, handleDeleteVisit, inputStyle, marketersList, renderExpandedReportChrome, renderReportExpandButton, renderVisitReportTable, reportViewClass, selectedTodayVisitMarketerEmails, setAdminView, setEditingVisit, setSelectedTodayVisitMarketerEmails, setVisitSearch, visitSearch } = usePortalContext();
  const visibleReports = getFilteredTodayVisitReports();

  return <div className={reportViewClass("today-visits")}>
    {renderExpandedReportChrome("today-visits")}
    <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
      <button onClick={() => setAdminView("home")} style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back</button>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => downloadExcel(visibleReports, "All_Today_Visits.xlsx")} style={{ padding: "6px 12px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}>📥 Excel</button>
        <button onClick={() => downloadPDF(visibleReports)} style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}>📄 PDF</button>
        {renderReportExpandButton("today-visits", "Expand today's visits")}
      </div>
    </div>
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "14px" }}>☀️ Today's Visits</h3>
      <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        <div style={{ flex: "1 1 120px", minWidth: "115px" }}>
          <label htmlFor="today-visits-search" style={{ display: "block", fontSize: "11px", color: "#5c484e", fontWeight: 700, marginBottom: "4px" }}>Search</label>
          <input id="today-visits-search" type="search" placeholder="🔍 Name or email..." value={visitSearch} onChange={(event) => setVisitSearch(event.target.value)} style={{ ...inputStyle, width: "100%", height: "42px", boxSizing: "border-box", fontSize: "13px", padding: "8px 10px" }} />
        </div>
        <div style={{ flex: "1.4 1 170px", minWidth: "170px", display: "flex" }}>
          <MarketerMultiSelect marketers={marketersList} selected={selectedTodayVisitMarketerEmails} onChange={setSelectedTodayVisitMarketerEmails} inputStyle={inputStyle} />
        </div>
        <button className="white-refresh-btn" type="button" title="Refresh today's visits" aria-label="Refresh today's visits" onClick={() => Promise.all([fetchTodayReports(true), fetchMarketers(true)])} style={{ width: "42px", minWidth: "42px", height: "42px", padding: 0, background: "#fff", color: "#7a0f2b", border: "1px solid #ddcbd0", borderRadius: "9px", fontWeight: 900, fontSize: "18px", cursor: "pointer" }}>↻</button>
      </div>
      {visibleReports.length ? renderVisitReportTable(visibleReports, null, (report) => <AdminVisitActions visit={report} onEdit={setEditingVisit} onDeletePicture={(id) => handleDeletePicture(id, true)} onDeleteReport={(id) => handleDeleteVisit(id, true)} />) : <p style={{ color: "#78686d", fontSize: "14px" }}>No visit reports available for today.</p>}
    </div>
  </div>;
}
