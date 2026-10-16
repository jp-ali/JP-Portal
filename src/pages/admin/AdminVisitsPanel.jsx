import React from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import AdminVisitActions from "../../ui/AdminVisitActions.jsx";
import ReportMarketerFilterBar from "../../ui/ReportMarketerFilterBar.jsx";

export default function AdminVisitsPanel() {
  const {
    allVisitsFromDate, allVisitsToDate, cardStyle, downloadExcel, downloadPDF,
    fetchAllReports, fetchMarketers, handleDeletePicture, handleDeleteVisit,
    inputStyle, isDateInRange, marketersList, renderExpandedReportChrome,
    renderReportExpandButton, renderVisitReportTable, reportViewClass, reports,
    selectedMarketersFilter, setAdminView, setAllVisitsFromDate, setAllVisitsToDate,
    setEditingVisit, setSelectedMarketersFilter
  } = usePortalContext();

  const hasRange = Boolean(allVisitsFromDate && allVisitsToDate);
  const filtered = hasRange ? reports.filter((report) =>
    report.createdAt && isDateInRange(report.createdAt, allVisitsFromDate, allVisitsToDate)
    && (!selectedMarketersFilter.length || selectedMarketersFilter.includes(report.marketerEmail))
  ) : [];
  const exportButton = { padding: "6px 12px", border: 0, borderRadius: "8px", color: "#fff", fontWeight: 600, fontSize: "12px", cursor: "pointer" };

  return <div className={reportViewClass("visits")}>
    {renderExpandedReportChrome("visits")}
    <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
      <button type="button" onClick={() => setAdminView("home")} style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: 0, borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>← Back</button>
      <div className="report-normal-actions" style={{ display: "flex", gap: "8px" }}>
        {hasRange && <>
          <button type="button" onClick={() => downloadExcel(filtered, "Selected_Visits_Report.xlsx")} style={{ ...exportButton, background: "#15803d" }}>Excel</button>
          <button type="button" onClick={() => downloadPDF(filtered)} style={{ ...exportButton, background: "#7a0f2b" }}>PDF</button>
        </>}
        {renderReportExpandButton("visits", "Expand all visits")}
      </div>
    </div>
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "14px" }}>All Visits & Reports</h3>
      <ReportMarketerFilterBar fromDate={allVisitsFromDate} toDate={allVisitsToDate} onFromDate={setAllVisitsFromDate} onToDate={setAllVisitsToDate} onClear={() => { setAllVisitsFromDate(""); setAllVisitsToDate(""); }} marketers={marketersList} selected={selectedMarketersFilter} onSelected={setSelectedMarketersFilter} onRefresh={() => Promise.all([fetchAllReports(), fetchMarketers()])} inputStyle={inputStyle} />
      {!hasRange ? <div style={{ padding: "16px", borderRadius: "12px", background: "#faf6f7", color: "#78686d", fontSize: "13px", textAlign: "center" }}>Select a date range to view visits.</div>
        : !filtered.length ? <p style={{ color: "#78686d", fontSize: "14px" }}>No visits match the selected range and marketer filters.</p>
        : <>
          <div style={{ marginBottom: "10px", padding: "10px 12px", borderRadius: "10px", background: "rgba(143,21,50,.08)", color: "#7a0f2b", fontSize: "13px" }}>Visits in selected range: <strong>{filtered.length}</strong></div>
          {renderVisitReportTable(filtered, null, (visit) => <AdminVisitActions visit={visit} onEdit={setEditingVisit} onDeletePicture={(id) => handleDeletePicture(id, true)} onDeleteReport={(id) => handleDeleteVisit(id, true)} />)}
        </>}
    </div>
  </div>;
}
