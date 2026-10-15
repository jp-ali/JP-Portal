import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function MarketerRangeVisitsPanel() {
  const { cardStyle, downloadExcel, downloadPDF, getAccessibleVisitMarketers, getVisitHistoryFilteredReports, handleDeleteVisit, inputStyle, marketerFromDate, marketerToDate, renderExpandedReportChrome, renderMarketerPersonIcon, renderReportExpandButton, renderVisitReportTable, reportViewClass, selectedVisitHistoryMarketerIds, setMarketerFromDate, setMarketerToDate, setMarketerview, setSelectedVisitHistoryMarketerIds, setVisitHistoryPickerOpen, user, visitHistoryPickerOpen } = usePortalContext();
  return (<div className={reportViewClass("marketer-visit-history")}>
            {renderExpandedReportChrome("marketer-visit-history")}
            <div className="report-normal-toolbar" style={{ display:"flex", justifyContent:"space-between", marginBottom:"14px", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <button onClick={()=>setMarketerview("home")} style={{ padding:"8px 14px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"white", border:"none", borderRadius:"10px", fontWeight:700, cursor:"pointer", fontSize:"13px" }}>← Back</button>
              <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={()=>downloadExcel(getVisitHistoryFilteredReports(),"Visit_History.xlsx")} style={{ padding:"6px 12px", background:"#15803d", color:"white", border:"none", borderRadius:"8px", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>📥 Excel</button>
                <button onClick={()=>downloadPDF(getVisitHistoryFilteredReports())} style={{ padding:"6px 12px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"white", border:"none", borderRadius:"8px", fontWeight:700, fontSize:"12px", cursor:"pointer" }}>📄 PDF</button>
                {renderReportExpandButton("marketer-visit-history", "Expand visit history")}
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", marginBottom:"14px", flexWrap:"wrap" }}>
                <div>
                  <h3 style={{ margin:0, color:"#3b2329", fontSize:"17px" }}>📅 Visit History & Date Range Filter</h3>
                  <p style={{ margin:"4px 0 0", color:"#78686d", fontSize:"11px" }}>View your own visits and the marketers assigned under your account.</p>
                </div>
                {(marketerFromDate || marketerToDate) && <button className="white-range-btn" onClick={()=>{setMarketerFromDate("");setMarketerToDate("");}} style={{ padding:"5px 10px", background:"#fff", color:"#7a0f2b", border:"1px solid #d8c8cd", borderRadius:"7px", fontSize:"11px", fontWeight:800, cursor:"pointer" }}>Clear Range</button>}
              </div>
              {(() => {
const accessible = getAccessibleVisitMarketers();
const teamMembers = accessible.filter((m) => m.id !== user?.marketerId);
if (!teamMembers.length) return null;
const allTeamSelected = teamMembers.every((m) => selectedVisitHistoryMarketerIds.includes(m.id));
return (
<div style={{ marginBottom:"14px" }}>
                    <button
type="button"
onClick={() => setVisitHistoryPickerOpen((prev) => !prev)}
style={{ width:"100%", padding:"10px 12px", background:"#fff", color:"#7a0f2b", border:"1px solid #dfcbd0", borderRadius:"10px", fontSize:"12px", fontWeight:900, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 4px 12px rgba(122,15,43,.06)" }}
>
                      <span>👥 Select Marketer</span>
                      <span style={{ fontSize:"15px", transform:visitHistoryPickerOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform .2s ease" }}>⌄</span>
                    </button>
                    {visitHistoryPickerOpen && (
<div style={{ marginTop:"7px", padding:"11px", border:"1px solid #eadde0", borderRadius:"12px", background:"#fff", animation:"pageReveal .24s ease both" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"8px" }}>
                          <div style={{ color:"#6f0b24", fontWeight:900, fontSize:"11.5px" }}>Choose whose visits you want to include</div>
                          <button
type="button"
onClick={() => setSelectedVisitHistoryMarketerIds(allTeamSelected ? (user?.marketerId ? [user.marketerId] : []) : [...new Set([user?.marketerId, ...teamMembers.map((m)=>m.id)].filter(Boolean))])}
style={{ padding:"5px 9px", background:"#fff5f7", color:"#7a0f2b", border:"1px solid #e4cdd3", borderRadius:"7px", fontSize:"10.5px", fontWeight:800, cursor:"pointer" }}
>
                            {allTeamSelected ? "Clear Team" : "Select All"}
                          </button>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:"7px" }}>
                          {accessible.map((m)=>(
<label key={m.id} style={{ display:"flex", alignItems:"center", gap:"7px", padding:"8px 9px", borderRadius:"9px", cursor:"pointer", background:selectedVisitHistoryMarketerIds.includes(m.id)?"#f9ecef":"#fff", border:selectedVisitHistoryMarketerIds.includes(m.id)?"1px solid #e5cbd2":"1px solid #eee3e6" }}>
                              <input type="checkbox" checked={selectedVisitHistoryMarketerIds.includes(m.id)} onChange={()=>setSelectedVisitHistoryMarketerIds((prev)=>prev.includes(m.id)?prev.filter((id)=>id!==m.id):[...prev,m.id])} />
                              <span style={{ display:"inline-flex", color:"#8f1532" }}>{renderMarketerPersonIcon(15)}</span>
                              <span style={{ minWidth:0 }}><strong style={{ display:"block", color:"#3b2329", fontSize:"11.5px" }}>{m.id===user?.marketerId?`${m.name || "My Account"} (Me)`:(m.name || m.email)}</strong><span style={{ display:"block", color:"#78686d", fontSize:"9.5px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.email || ""}</span></span>
                            </label>
))}
                        </div>
                      </div>
)}
                  </div>
);
})()}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:"10px", marginBottom:"16px" }}>
                <div><label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>From Date</label><input type="date" lang="en-GB" value={marketerFromDate} onChange={(e)=>setMarketerFromDate(e.target.value)} style={{ ...inputStyle, padding:"10px", background:"#fff", colorScheme:"light" }} /></div>
                <div><label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>To Date</label><input type="date" lang="en-GB" value={marketerToDate} onChange={(e)=>setMarketerToDate(e.target.value)} style={{ ...inputStyle, padding:"10px", background:"#fff", colorScheme:"light" }} /></div>
              </div>
              {(!marketerFromDate || !marketerToDate) ? (
<div style={{ padding:"16px", borderRadius:"12px", background:"#fffafa", border:"1px solid #eadde0", color:"#78686d", fontSize:"12px", textAlign:"center" }}>Select a date range to view visit reports.</div>
) : (() => {
const rows = getVisitHistoryFilteredReports();
if (!rows.length) return <div style={{ padding:"16px", color:"#78686d", fontSize:"12px", textAlign:"center" }}>No visit reports found for the selected marketer(s) and date range.</div>;
return (
<>
<div style={{ marginBottom:"10px", padding:"8px 10px", borderRadius:"9px", background:"#fff4f6", border:"1px solid #ead2d8", color:"#7a0f2b", fontSize:"11px", fontWeight:800 }}>Visits in selected range: {rows.length}</div>
{renderVisitReportTable(rows, null, (r) => {
const isOwn = String(r.marketerEmail || "").toLowerCase() === String(user?.email || "").toLowerCase();
return isOwn ? <button type="button" onClick={()=>handleDeleteVisit(r.id,false)} style={{padding:"5px 7px",background:"#ef4444",color:"#fff",border:"none",borderRadius:"6px",fontSize:"9.5px",fontWeight:800,cursor:"pointer"}}>Delete</button> : <span style={{color:"#9a8a8e",fontSize:"9px"}}>View only</span>;
})}
</>
);
})()}
            </div>
          </div>);
}
