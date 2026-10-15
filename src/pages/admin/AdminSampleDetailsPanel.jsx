import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";

export default function AdminSampleDetailsPanel() {
  const { adminSampleFromDate, adminSampleMarketersFilter, adminSampleToDate, cardStyle, downloadExcel, downloadPDF, downloadSingleSample, getDateKey, getMarketerName, handleDeleteSample, inputStyle, isDateInRange, marketersList, renderExpandedReportChrome, renderMarketerPersonIcon, renderReportExpandButton, renderSampleReportTable, reportViewClass, samples, selectedAdminSampleMarketerBox, selectedAdminSampleSchoolBox, setAdminSampleFromDate, setAdminSampleMarketersFilter, setAdminSampleToDate, setAdminView, setSelectedAdminSampleMarketerBox, setSelectedAdminSampleSchoolBox } = usePortalContext();
  return (<div className={reportViewClass("sample-details")}>
              {renderExpandedReportChrome("sample-details")}
              <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
                <button 
onClick={() => {
if (selectedAdminSampleSchoolBox) {
setSelectedAdminSampleSchoolBox(null);
} else if (selectedAdminSampleMarketerBox) {
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
const sDateStr = getDateKey(s.createdAt);
if (!isDateInRange(s.createdAt, adminSampleFromDate, adminSampleToDate)) return false;
if (selectedAdminSampleMarketerBox && s.marketerEmail !== selectedAdminSampleMarketerBox) return false;
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
                {!selectedAdminSampleMarketerBox && !selectedAdminSampleSchoolBox ? (
<>
                    <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "14px" }}>📦 All Sample Details</h3>
                    <div style={{ background: "rgba(255,255,255,0.96)", padding: "14px", borderRadius: "12px", marginBottom: "12px", border: "1px solid rgba(143,21,50,.25)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#77102a" }}>1. Select Date Range</label>
                        {(adminSampleFromDate || adminSampleToDate) && (
<button 
className="white-range-btn"
onClick={() => { setAdminSampleFromDate(""); setAdminSampleToDate(""); }}
style={{ padding: "4px 10px", background: "#ffffff", color: "#7a0f2b", border: "1px solid #d8c8cd", borderRadius: "7px", fontSize: "11px", fontWeight: "700", cursor: "pointer", boxShadow: "0 2px 7px rgba(15,23,42,.06)" }}
>
                            Clear Range
                          </button>
)}
                      </div>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: "130px" }}>
                          <span style={{ fontSize: "11px", color: "#78686d" }}>From Date:</span>
                          <input type="date" lang="en-GB" value={adminSampleFromDate} onChange={(e) => setAdminSampleFromDate(e.target.value)} style={{ ...inputStyle, padding: "8px", colorScheme: "light" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: "130px" }}>
                          <span style={{ fontSize: "11px", color: "#78686d" }}>To Date:</span>
                          <input type="date" lang="en-GB" value={adminSampleToDate} onChange={(e) => setAdminSampleToDate(e.target.value)} style={{ ...inputStyle, padding: "8px", colorScheme: "light" }} />
                        </div>
                        <MarketerMultiSelect marketers={marketersList} selected={adminSampleMarketersFilter} onChange={setAdminSampleMarketersFilter} inputStyle={inputStyle} />
                      </div>
                    </div>
                    <h4 style={{ color: "#5c484e", fontSize: "15px", marginBottom: "10px" }}>Marketers Sample Summary:</h4>
                    {(() => {
const filteredSamples = samples.filter(s => {
if (!s.createdAt) return false;
const sDateStr = getDateKey(s.createdAt);
if (!isDateInRange(s.createdAt, adminSampleFromDate, adminSampleToDate)) return false;
if (adminSampleMarketersFilter.length > 0 && !adminSampleMarketersFilter.includes(s.marketerEmail)) return false;
return true;
});
const counts = {};
filteredSamples.forEach(s => {
counts[s.marketerEmail] = (counts[s.marketerEmail] || 0) + 1;
});
if (Object.keys(counts).length === 0) {
return <p style={{ color: "#78686d", fontSize: "14px" }}>No sample records match the criteria.</p>;
}
return (
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
                          {Object.entries(counts).map(([mEmail, count]) => {
const mObj = marketersList.find(m => m.email === mEmail);
const mDisplayName = mObj ? mObj.name : mEmail;
return (
<div 
key={mEmail}
onClick={() => setSelectedAdminSampleMarketerBox(mEmail)}
style={{ 
background: "rgba(255,255,255,0.96)", 
border: "1px solid rgba(245, 158, 11, 0.3)", 
borderRadius: "14px", 
padding: "16px", 
cursor: "pointer"
}}
>
                                <h4 style={{ margin: "0 0 6px 0", color: "#77102a", fontSize: "15px" }}><span style={{display:"inline-flex",verticalAlign:"middle",marginRight:"6px"}}>{renderMarketerPersonIcon(18)}</span>{mDisplayName}</h4>
                                <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#78686d" }}>{mEmail}</p>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ background: "rgba(143,21,50,.12)", color: "#77102a", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                                    Samples: {count}
                                  </span>
                                  <span style={{ fontSize: "13px", color: "#5c484e" }}>View →</span>
                                </div>
                              </div>
);
})}
                        </div>
);
})()}
                    {(() => {
const filteredSamples = samples.filter(s => s.createdAt && isDateInRange(s.createdAt, adminSampleFromDate, adminSampleToDate) && (!adminSampleMarketersFilter.length || adminSampleMarketersFilter.includes(s.marketerEmail)));
return filteredSamples.length ? <div style={{marginTop:"18px"}}><h4 style={{margin:"0 0 9px",color:"#5c484e",fontSize:"14px"}}>Merged Sample Report</h4>{renderSampleReportTable(filteredSamples,(s)=>{setSelectedAdminSampleMarketerBox(s.marketerEmail);setSelectedAdminSampleSchoolBox(s.id);})}</div> : null;
})()}
                  </>
) : selectedAdminSampleMarketerBox && !selectedAdminSampleSchoolBox ? (
<>
                    <h3 style={{ marginTop: 0, color: "#77102a", fontSize: "17px", marginBottom: "14px" }}>
                      Samples by Marketer: {marketersList.find(m => m.email === selectedAdminSampleMarketerBox)?.name || selectedAdminSampleMarketerBox}
                    </h3>
                    {(() => {
const filtered = samples.filter(s => s.marketerEmail === selectedAdminSampleMarketerBox && s.createdAt && isDateInRange(s.createdAt, adminSampleFromDate, adminSampleToDate));
return filtered.length ? renderSampleReportTable(filtered,(s)=>setSelectedAdminSampleSchoolBox(s.id)) : <p style={{color:"#78686d",fontSize:"13px"}}>No sample records found for this marketer.</p>;
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
