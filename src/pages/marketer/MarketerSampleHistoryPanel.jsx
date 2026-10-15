import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function MarketerSampleHistoryPanel() {
  const { cardStyle, downloadExcel, downloadPDF, getDateKey, handleDeleteSample, inputStyle, isDateInRange, marketerSamples, renderExpandedReportChrome, renderReportExpandButton, renderSampleReportTable, reportViewClass, sampleHistoryFromDate, sampleHistorySearch, sampleHistoryToDate, setMarketerview, setSampleHistoryFromDate, setSampleHistorySearch, setSampleHistoryToDate } = usePortalContext();
  return (<div className={reportViewClass("marketer-samples")}>
            {renderExpandedReportChrome("marketer-samples")}
            <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
              <button 
onClick={() => setMarketerview("home")} 
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
>
                ← Back
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
onClick={() => {
const filtered = marketerSamples.filter(s => {
if (sampleHistorySearch && !s.schoolName.toLowerCase().includes(sampleHistorySearch.toLowerCase())) return false;
if (!s.createdAt) return false;
const sDateStr = getDateKey(s.createdAt);
if (!isDateInRange(s.createdAt, sampleHistoryFromDate, sampleHistoryToDate)) return false;
return true;
});
downloadExcel(filtered, "Sample_History.xlsx");
}}
style={{ padding: "6px 12px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                  📥 Excel
                </button>
                <button 
onClick={() => {
const filtered = marketerSamples.filter(s => {
if (sampleHistorySearch && !s.schoolName.toLowerCase().includes(sampleHistorySearch.toLowerCase())) return false;
if (!s.createdAt) return false;
const sDateStr = getDateKey(s.createdAt);
if (!isDateInRange(s.createdAt, sampleHistoryFromDate, sampleHistoryToDate)) return false;
return true;
});
downloadPDF(filtered);
}}
style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                  📄 PDF
                </button>
                {renderReportExpandButton("marketer-samples", "Expand sample history")}
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#9a2844", fontSize: "17px", marginBottom: "14px" }}>📋 Sample History</h3>
              <div style={{ marginBottom: "14px" }}>
                <input 
type="text" 
placeholder="🔍 Search school name..." 
value={sampleHistorySearch} 
onChange={(e) => setSampleHistorySearch(e.target.value)} 
style={{ ...inputStyle, marginBottom: "12px", fontSize: "14px", padding: "12px 14px" }}
/>
                <div style={{ background: "rgba(255,255,255,0.96)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(251, 191, 36, 0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#9a2844", fontWeight: "600" }}>Date Range Filter</span>
                    {(sampleHistoryFromDate || sampleHistoryToDate) && (
<button 
className="white-range-btn"
onClick={() => { setSampleHistoryFromDate(""); setSampleHistoryToDate(""); }}
style={{ padding: "4px 10px", background: "#ffffff", color: "#7a0f2b", border: "1px solid #d8c8cd", borderRadius: "7px", fontSize: "11px", fontWeight: "700", cursor: "pointer", boxShadow: "0 2px 7px rgba(15,23,42,.06)" }}
>
                        Clear Range
                      </button>
)}
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "130px" }}>
                      <span style={{ fontSize: "11px", color: "#78686d" }}>From Date:</span>
                      <input type="date" lang="en-GB" value={sampleHistoryFromDate} onChange={(e) => setSampleHistoryFromDate(e.target.value)} style={{ ...inputStyle, padding: "8px", colorScheme: "light" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: "130px" }}>
                      <span style={{ fontSize: "11px", color: "#78686d" }}>To Date:</span>
                      <input type="date" lang="en-GB" value={sampleHistoryToDate} onChange={(e) => setSampleHistoryToDate(e.target.value)} style={{ ...inputStyle, padding: "8px", colorScheme: "light" }} />
                    </div>
                  </div>
                </div>
              </div>
              {(() => {
const filtered = marketerSamples.filter(s => {
if (sampleHistorySearch && !String(s.schoolName || "").toLowerCase().includes(sampleHistorySearch.toLowerCase())) return false;
if (!s.createdAt) return false;
if (!isDateInRange(s.createdAt, sampleHistoryFromDate, sampleHistoryToDate)) return false;
return true;
});
if (!filtered.length) return <p style={{ color: "#78686d", fontSize: "14px" }}>No sample records found.</p>;
return renderSampleReportTable(filtered, null, (s) => <button type="button" onClick={() => handleDeleteSample(s.id, false)} style={{ padding:"5px 7px", background:"#ef4444", color:"#fff", border:"none", borderRadius:"6px", fontSize:"9.5px", fontWeight:800, cursor:"pointer" }}>Delete</button>);
})()}
            </div>
          </div>);
}
