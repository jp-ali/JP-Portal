import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import ReportMarketerFilterBar from "../../ui/ReportMarketerFilterBar.jsx";

export default function AdminVisitsPanel() {
  const { allVisitsFromDate, allVisitsToDate, cardStyle, downloadExcel, downloadPDF, fetchAllReports, fetchMarketers, getDateKey, getMarketerName, handleDeletePicture, handleDeleteVisit, inputStyle, isDateInRange, marketersList, renderExpandedReportChrome, renderReportExpandButton, renderVisitReportTable, reportViewClass, reports, selectedAdminAllSchoolBox, selectedMarketersFilter, setAdminView, setAllVisitsFromDate, setAllVisitsToDate, setEditingVisit, setFullScreenImage, setSelectedAdminAllSchoolBox, setSelectedMarketersFilter } = usePortalContext();
  return (<div className={reportViewClass("visits")}>
              {renderExpandedReportChrome("visits")}
              <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
                <button 
onClick={() => {
if (selectedAdminAllSchoolBox) {
setSelectedAdminAllSchoolBox(null);
} else {
setAdminView("home");
}
}} 
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
>
                  ← Back
                </button>
                {(allVisitsFromDate || allVisitsToDate || selectedMarketersFilter.length > 0) && (
<div style={{ display: "flex", gap: "8px" }}>
                    {(() => {
const filteredList = reports.filter(r => {
if (!r.createdAt) return false;
const rDateStr = getDateKey(r.createdAt);
if (!isDateInRange(r.createdAt, allVisitsFromDate, allVisitsToDate)) return false;
if (selectedMarketersFilter.length > 0 && !selectedMarketersFilter.includes(r.marketerEmail)) return false;
return true;
});
return (
<>
                          <button 
onClick={() => downloadExcel(filteredList, "Selected_Visits_Report.xlsx")}
style={{ padding: "6px 12px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                            📥 Excel
                          </button>
                          <button 
onClick={() => downloadPDF(filteredList)}
style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                            📄 PDF
                          </button>
                        </>
);
})()}
                    {renderReportExpandButton("visits", "Expand all visits")}
                  </div>
)}
                {!((allVisitsFromDate || allVisitsToDate || selectedMarketersFilter.length > 0)) && <div className="report-normal-actions" style={{ marginLeft:"auto" }}>{renderReportExpandButton("visits", "Expand all visits")}</div>}
              </div>
              <div style={cardStyle}>
                {!selectedAdminAllSchoolBox ? (
<>
                    <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "14px" }}>📊 All Visits & Reports Options</h3>
                    <ReportMarketerFilterBar fromDate={allVisitsFromDate} toDate={allVisitsToDate} onFromDate={setAllVisitsFromDate} onToDate={setAllVisitsToDate} onClear={() => { setAllVisitsFromDate(""); setAllVisitsToDate(""); }} marketers={marketersList} selected={selectedMarketersFilter} onSelected={setSelectedMarketersFilter} onRefresh={() => Promise.all([fetchAllReports(), fetchMarketers()])} inputStyle={inputStyle} />
                    <h4 style={{ color: "#5c484e", fontSize: "15px", marginBottom: "10px" }}>Filtered Visits List:</h4>
                    {allVisitsFromDate && allVisitsToDate ? (
<div style={{ marginBottom: "10px", padding: "10px 12px", borderRadius: "10px", background: "rgba(143,21,50,.08)", border: "1px solid rgba(143,21,50,.18)", color: "#7a0f2b", fontSize: "13px" }}>Marketers: <strong>{selectedMarketersFilter.length ? `${selectedMarketersFilter.length} selected` : "All"}</strong> &nbsp;•&nbsp; Visits in selected range: <strong>{reports.filter(r => r.createdAt && isDateInRange(r.createdAt, allVisitsFromDate, allVisitsToDate) && (!selectedMarketersFilter.length || selectedMarketersFilter.includes(r.marketerEmail))).length}</strong></div>
) : null}
                    {(!allVisitsFromDate || !allVisitsToDate) ? (
<div style={{ padding: "16px", borderRadius: "12px", background: "rgba(250,246,247,.94)", color: "#78686d", fontSize: "13px", textAlign: "center" }}>Select a date range to view visits.</div>
) : reports.filter(r => {
if (!r.createdAt) return false;
const rDateStr = getDateKey(r.createdAt);
if (!isDateInRange(r.createdAt, allVisitsFromDate, allVisitsToDate)) return false;
if (selectedMarketersFilter.length > 0 && !selectedMarketersFilter.includes(r.marketerEmail)) return false;
return true;
}).length === 0 ? (
<p style={{ color: "#78686d", fontSize: "14px" }}>No visits match the selected range and marketer filters.</p>
) : (
renderVisitReportTable(
reports.filter(r => r.createdAt && isDateInRange(r.createdAt, allVisitsFromDate, allVisitsToDate) && (!selectedMarketersFilter.length || selectedMarketersFilter.includes(r.marketerEmail))),
(r) => setSelectedAdminAllSchoolBox(r.id),
(r) => <button type="button" onClick={() => setEditingVisit(r)} style={{ padding: "5px 8px", background: "#7a0f2b", color: "#fff", border: 0, borderRadius: "6px", cursor: "pointer" }}>Edit</button>
)
)}
                  </>
) : (
(() => {
const r = reports.find(item => item.id === selectedAdminAllSchoolBox);
if (!r) return <p style={{ color: "#78686d" }}>Report not found.</p>;
return (
<div>
                        <h3 style={{ marginTop: 0, color: "#9a2844", fontSize: "18px", marginBottom: "14px" }}>🏫 School: {r.schoolName}</h3>
                        <div style={{ border: "1px solid rgba(123,16,43,.14)", padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.94)" }}>
                          <p style={{ margin: "4px 0" }}><strong>Marketer:</strong> {getMarketerName(r.marketerEmail, r.marketerName || "N/A")}</p>
                          <p style={{ margin: "4px 0" }}><strong>Principal:</strong> {r.principalName} ({r.phone})</p>
                          <p style={{ margin: "4px 0" }}><strong>Purpose of Visit:</strong> {r.purpose || "N/A"}</p>
                          <p style={{ margin: "4px 0" }}><strong>Session:</strong> {r.session || "N/A"} &nbsp; <strong>Branches:</strong> {r.branches || "N/A"} &nbsp; <strong>Strength:</strong> {r.strength || "N/A"}</p>
                          <p style={{ margin: "4px 0" }}><strong>Remarks:</strong> {r.notes}</p>
                          <p style={{ margin: "4px 0", fontSize: "12px", color: "#78686d" }}><strong>Time:</strong> {r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleString("en-US", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:true }) : "N/A"}</p>
                          {r.image && (
<div style={{ marginTop: "12px" }}>
                              <p style={{ fontSize: "12px", color: "#b76a7b", margin: "0 0 6px 0", fontWeight: "600" }}>📷 Stamped Photo:</p>
                              <img 
src={r.image} 
alt="Visit" 
onClick={() => setFullScreenImage(r.image)}
style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", display: "block" }} 
/>
                            </div>
)}
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
                            <button type="button" onClick={() => setEditingVisit(r)} style={{ padding: "8px 14px", background: "#7a0f2b", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Edit Details</button>
                            {r.image && (
<button 
onClick={() => handleDeletePicture(r.id, true)} 
style={{ padding: "8px 14px", background: "#77102a", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
>
                                🗑️ Delete Picture
                              </button>
)}
                            <button 
onClick={() => { handleDeleteVisit(r.id, true); setSelectedAdminAllSchoolBox(null); }} 
style={{ padding: "8px 14px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
>
                              🗑️ Delete Report
                            </button>
                          </div>
                        </div>
                      </div>
);
})()
)}
              </div>
            </div>);
}
