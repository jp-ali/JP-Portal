import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import AdminVisitActions from "../../ui/AdminVisitActions.jsx";

export default function AdminTodayVisitsPanel() {
  const { cardStyle, downloadExcel, downloadPDF, formatTime12, getDateKey, getMarketerName, handleDeletePicture, handleDeleteVisit, inputStyle, marketersList, renderExpandedReportChrome, renderMarketerPersonIcon, renderReportExpandButton, renderVisitReportTable, reportViewClass, reports, selectedAdminMarketerBox, setAdminView, setEditingVisit, setFullScreenImage, setSelectedAdminMarketerBox, setVisitSearch, visitSearch } = usePortalContext();
  const todayKey = getDateKey(new Date());
  const todayReports = reports.filter((report) => report.createdAt && getDateKey(report.createdAt) === todayKey);
  const todayCounts = todayReports.reduce((counts, report) => {
    const email = String(report.marketerEmail || "Unknown marketer");
    counts[email] = (counts[email] || 0) + 1;
    return counts;
  }, {});
  return (<div className={reportViewClass("today-visits")}>
              {renderExpandedReportChrome("today-visits")}
              <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
                <button 
onClick={() => {
if (selectedAdminMarketerBox) {
setSelectedAdminMarketerBox(null);
} else {
setAdminView("home");
}
}} 
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
>
                  ← Back
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
onClick={() => {
const listToDownload = selectedAdminMarketerBox 
? todayReports.filter(r => r.marketerEmail === selectedAdminMarketerBox)
: todayReports;
downloadExcel(listToDownload, selectedAdminMarketerBox ? `${selectedAdminMarketerBox}_Today_Visits.xlsx` : "All_Today_Visits.xlsx");
}}
style={{ padding: "6px 12px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                    📥 Excel
                  </button>
                  <button 
onClick={() => {
const listToDownload = selectedAdminMarketerBox 
? todayReports.filter(r => r.marketerEmail === selectedAdminMarketerBox)
: todayReports;
downloadPDF(listToDownload);
}}
style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                    📄 PDF
                  </button>
                  {renderReportExpandButton("today-visits", "Expand today's visits")}
                </div>
              </div>
              <div style={cardStyle}>
                {!selectedAdminMarketerBox ? (
<>
                    <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "14px" }}>☀️ Today's Visits</h3>
                    <input 
type="text" 
placeholder="🔍 Search marketer name or email..." 
value={visitSearch} 
onChange={(e) => setVisitSearch(e.target.value)} 
style={{ ...inputStyle, marginBottom: "16px", fontSize: "14px", padding: "12px 14px" }}
/>
                    {Object.keys(todayCounts).length === 0 ? (
<p style={{ color: "#78686d", fontSize: "14px" }}>No visit reports available for today.</p>
) : (
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
                        {Object.entries(todayCounts)
.filter(([mEmail]) => {
const mObj = marketersList.find(m => m.email === mEmail);
const mName = mObj ? mObj.name || "" : "";
const searchLower = visitSearch.toLowerCase();
return mEmail.toLowerCase().includes(searchLower) || mName.toLowerCase().includes(searchLower);
})
.map(([mEmail, count]) => {
const mObj = marketersList.find(m => m.email === mEmail);
const mDisplayName = mObj ? mObj.name : mEmail;
return (
<div 
key={mEmail}
onClick={() => setSelectedAdminMarketerBox(mEmail)}
style={{ 
background: "rgba(255,255,255,0.96)", 
border: "1px solid rgba(143,21,50,.22)", 
borderRadius: "14px", 
padding: "16px", 
cursor: "pointer",
transition: "transform 0.2s"
}}
>
                                <h4 style={{ margin: "0 0 6px 0", color: "#b6405b", fontSize: "15px" }}><span style={{display:"inline-flex",verticalAlign:"middle",marginRight:"6px"}}>{renderMarketerPersonIcon(18)}</span>{mDisplayName}</h4>
                                <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#78686d" }}>{mEmail}</p>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#b6405b", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                                    Total Visits: {count}
                                  </span>
                                  <span style={{ fontSize: "13px", color: "#5c484e" }}>View Schools →</span>
                                </div>
                              </div>
);
})}
                      </div>
)}
                    {(() => {
const searchLower = visitSearch.toLowerCase();
const mergedTodayRows = todayReports.filter((r) => {
const mName = getMarketerName(r.marketerEmail, r.marketerName || r.marketerEmail || "");
return !searchLower || String(r.marketerEmail || "").toLowerCase().includes(searchLower) || String(mName || "").toLowerCase().includes(searchLower);
});
return mergedTodayRows.length ? <div style={{marginTop:"18px"}}><h4 style={{margin:"0 0 9px",color:"#5c484e",fontSize:"14px"}}>Merged Visit Report</h4>{renderVisitReportTable(mergedTodayRows,null,(r)=><AdminVisitActions visit={r} onEdit={setEditingVisit} onDeletePicture={(id)=>handleDeletePicture(id,true)} onDeleteReport={(id)=>handleDeleteVisit(id,true)} />)}</div> : null;
})()}
                  </>
) : (
<>
                    <h3 style={{ marginTop: 0, color: "#b6405b", fontSize: "17px", marginBottom: "14px" }}>
                      Schools Visited by: {marketersList.find(m => m.email === selectedAdminMarketerBox)?.name || selectedAdminMarketerBox}
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
                      {todayReports
.filter(r => r.marketerEmail === selectedAdminMarketerBox)
.map((r) => (
<div 
key={r.id}
style={{ 
background: "rgba(255,255,255,0.97)", 
border: "1px solid rgba(143,21,50,.30)", 
borderRadius: "14px", 
padding: "16px" 
}}
>
                            <h4 style={{ margin: "0 0 6px 0", color: "#9a2844", fontSize: "16px" }}>🏫 {r.schoolName}</h4>
                            <p style={{ margin: "2px 0", fontSize: "13px" }}><strong>Principal:</strong> {r.principalName} ({r.phone})</p>
                            <p style={{ margin: "2px 0", fontSize: "13px" }}><strong>Purpose:</strong> {r.purpose || "N/A"}</p>
                            <p style={{ margin: "2px 0", fontSize: "13px" }}><strong>Branches:</strong> {r.branches || "N/A"} &nbsp; <strong>Strength:</strong> {r.strength || "N/A"}</p>
                            <p style={{ margin: "2px 0", fontSize: "13px" }}><strong>Remarks:</strong> {r.notes}</p>
                            <p style={{ margin: "4px 0 10px 0", fontSize: "11px", color: "#78686d" }}><strong>Time:</strong> {formatTime12(r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : null)}</p>
                            {r.image && (
<div style={{ marginBottom: "10px" }}>
                                <img 
src={r.image} 
alt="Visit" 
onClick={() => setFullScreenImage(r.image)}
style={{ width: "90px", height: "90px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer" }} 
/>
                              </div>
)}
                            <AdminVisitActions visit={r} onEdit={setEditingVisit} onDeletePicture={(id) => handleDeletePicture(id, true)} onDeleteReport={(id) => handleDeleteVisit(id, true)} />
                          </div>
))}
                    </div>
                  </>
)}
              </div>
            </div>);
}
