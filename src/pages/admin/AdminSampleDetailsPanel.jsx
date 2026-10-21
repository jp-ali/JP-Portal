import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import ReportMarketerFilterBar from "../../ui/ReportMarketerFilterBar.jsx";

export default function AdminSampleDetailsPanel() {
  const { adminSampleFromDate, adminSampleMarketersFilter, adminSampleToDate, cardStyle, downloadExcel, downloadPDF, downloadSingleSample, fetchAllSamples, fetchMarketers, getMarketerName, handleDeleteSample, inputStyle, isDateInRange, marketersList, renderExpandedReportChrome, renderReportExpandButton, renderSampleReportTable, reportViewClass, samples, selectedAdminSampleSchoolBox, setAdminSampleFromDate, setAdminSampleMarketersFilter, setAdminSampleToDate, setAdminView, setSelectedAdminSampleMarketerBox, setSelectedAdminSampleSchoolBox } = usePortalContext();
  return (<div className={reportViewClass("sample-details")}>
              {renderExpandedReportChrome("sample-details")}
              <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
                <button 
onClick={() => {
if (selectedAdminSampleSchoolBox) {
setSelectedAdminSampleSchoolBox(null);
setSelectedAdminSampleMarketerBox(null);
} else {
setAdminView("home");
}
}} 
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
>
                  ← Back
                </button>
                {(adminSampleFromDate || adminSampleToDate || adminSampleMarketersFilter.length > 0) && (
<div style={{ display: "flex", gap: "8px" }}>
                    {(() => {
const filteredList = samples.filter(s => {
if (!s.createdAt) return false;
if (!isDateInRange(s.createdAt, adminSampleFromDate, adminSampleToDate)) return false;
if (adminSampleMarketersFilter.length > 0 && !adminSampleMarketersFilter.includes(s.marketerEmail)) return false;
return true;
});
return (
<>
                          <button 
onClick={() => downloadExcel(filteredList, "Selected_Samples_Report.xlsx")}
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
                    {renderReportExpandButton("sample-details", "Expand sample details")}
                  </div>
)}
                {!((adminSampleFromDate || adminSampleToDate || adminSampleMarketersFilter.length > 0)) && <div className="report-normal-actions" style={{ marginLeft:"auto" }}>{renderReportExpandButton("sample-details", "Expand sample details")}</div>}
              </div>
              <div style={cardStyle}>
                {!selectedAdminSampleSchoolBox ? (
<>
                    <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "14px" }}>📦 All Sample Details</h3>
                    <ReportMarketerFilterBar fromDate={adminSampleFromDate} toDate={adminSampleToDate} onFromDate={setAdminSampleFromDate} onToDate={setAdminSampleToDate} onClear={() => { setAdminSampleFromDate(""); setAdminSampleToDate(""); }} marketers={marketersList} selected={adminSampleMarketersFilter} onSelected={setAdminSampleMarketersFilter} onRefresh={() => Promise.all([fetchAllSamples(), fetchMarketers()])} inputStyle={inputStyle} />
                    {(() => {
const filteredSamples = samples.filter(s => s.createdAt && isDateInRange(s.createdAt, adminSampleFromDate, adminSampleToDate) && (!adminSampleMarketersFilter.length || adminSampleMarketersFilter.includes(s.marketerEmail)));
return filteredSamples.length ? <div style={{marginTop:"18px"}}><h4 style={{margin:"0 0 9px",color:"#5c484e",fontSize:"14px"}}>Merged Sample Report</h4>{renderSampleReportTable(filteredSamples,(s)=>setSelectedAdminSampleSchoolBox(s.id))}</div> : <p style={{color:"#78686d",fontSize:"13px"}}>No sample records match the selected filters.</p>;
})()}
                  </>
) : (
(() => {
const s = samples.find(item => item.id === selectedAdminSampleSchoolBox);
if (!s) return <p style={{ color: "#78686d" }}>Sample report not found.</p>;
return (
<div>
                        <h3 style={{ marginTop: 0, color: "#9a2844", fontSize: "18px", marginBottom: "14px" }}>🏫 School: {s.schoolName}</h3>
                        <div style={{ border: "1px solid rgba(123,16,43,.18)", padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.94)" }}>
                          <p style={{ margin: "4px 0" }}><strong>Marketer:</strong> {getMarketerName(s.marketerEmail, s.marketerName || "N/A")}</p>
                          <p style={{ margin: "4px 0" }}><strong>Principal:</strong> {s.principalName} ({s.phone})</p>
                          <p style={{ margin: "4px 0" }}><strong>Sample Details:</strong> {s.sampleDetails || "N/A"}</p>
                          <p style={{ margin: "4px 0", fontSize: "12px", color: "#78686d" }}><strong>Time:</strong> {s.createdAt && s.createdAt.toDate ? s.createdAt.toDate().toLocaleString("en-US", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:true }) : "N/A"}</p>
                          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
                            <button 
onClick={() => downloadSingleSample(s)}
style={{ padding: "8px 14px", background: "#86132f", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
>
                              📥 Download Sample
                            </button>
                            <button 
onClick={() => downloadPDF([s])}
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
>
                              📄 Download PDF
                            </button>
                            <button 
onClick={() => { handleDeleteSample(s.id, true); setSelectedAdminSampleSchoolBox(null); }} 
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
>
                              🗑️ Delete Sample Report
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
