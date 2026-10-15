import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function AdminVerificationCallsPanel() {
  const { cardStyle, downloadVerificationExcel, downloadVerificationPDF, fetchAllReports, fetchMarketers, getFilteredVerificationRows, inputStyle, marketersList, renderExpandedReportChrome, renderReportExpandButton, renderVerificationReportTable, reportViewClass, setAdminView, setVerificationFromDate, setVerificationMarketerIds, setVerificationPickerOpen, setVerificationToDate, verificationFromDate, verificationMarketerIds, verificationPickerOpen, verificationToDate } = usePortalContext();
  return (<div className={reportViewClass("verification-calls")}>
              {renderExpandedReportChrome("verification-calls")}
              <div className="report-normal-toolbar" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"14px" }}>
                <button type="button" onClick={() => setAdminView("home")} style={{ padding:"8px 14px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"white", border:"none", borderRadius:"10px", fontWeight:700, cursor:"pointer", fontSize:"13px" }}>← Back to Menu</button>
                <div style={{ display:"flex", gap:"7px", alignItems:"center", flexWrap:"wrap" }}>
                  <button type="button" onClick={downloadVerificationExcel} style={{ padding:"7px 11px", background:"#15803d", color:"#fff", border:"none", borderRadius:"8px", fontWeight:800, fontSize:"11px", cursor:"pointer" }}>📥 Excel</button>
                  <button type="button" onClick={downloadVerificationPDF} style={{ padding:"7px 11px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"#fff", border:"none", borderRadius:"8px", fontWeight:800, fontSize:"11px", cursor:"pointer" }}>📄 PDF</button>
                  {renderReportExpandButton("verification-calls", "Expand verification calls")}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{ marginBottom:"14px" }}>
                  <h3 style={{ margin:"0 0 4px", color:"#3b2329", fontSize:"18px" }}>☎️ Verification Calls</h3>
                  <p style={{ margin:0, color:"#78686d", fontSize:"11.5px" }}>Verify school visits, call principals directly and save call remarks for later review.</p>
                </div>
                <div className="admin-expense-filter-grid verification-filter-grid" style={{ display:"grid", gridTemplateColumns:"minmax(120px,1fr) minmax(120px,1fr) minmax(180px,1.4fr) 88px 42px", gap:"7px", alignItems:"end", marginBottom:"14px" }}>
                  <div className="verification-date-from">
                    <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>From Date</label>
                    <input type="date" lang="en-GB" value={verificationFromDate} onChange={(e)=>setVerificationFromDate(e.target.value)} style={{ ...inputStyle, height:"42px", padding:"7px 8px", background:"#fff", colorScheme:"light" }} />
                  </div>
                  <div className="verification-date-to">
                    <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>To Date</label>
                    <input type="date" lang="en-GB" value={verificationToDate} onChange={(e)=>setVerificationToDate(e.target.value)} style={{ ...inputStyle, height:"42px", padding:"7px 8px", background:"#fff", colorScheme:"light" }} />
                  </div>
                  <div className="verification-marketer-field" style={{ position:"relative" }}>
                    <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>Select Marketer(s)</label>
                    <button type="button" onClick={()=>setVerificationPickerOpen(v=>!v)} style={{ ...inputStyle, width:"100%", height:"42px", padding:"7px 10px", background:"#fff", color:"#111", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", textAlign:"left" }}>
                      <span>{verificationMarketerIds.length ? `${verificationMarketerIds.length} Marketer(s) Selected` : "All Marketers"}</span><span>▾</span>
                    </button>
                    {verificationPickerOpen && (
<div className="verification-marketer-picker">
                        <div style={{ display:"flex", justifyContent:"space-between", gap:"6px", marginBottom:"8px" }}>
                          <button type="button" onClick={()=>setVerificationMarketerIds(marketersList.map(m=>m.id))} style={{ padding:"6px 9px", border:"none", borderRadius:"7px", background:"#7a0f2b", color:"#fff", fontSize:"10.5px", fontWeight:800, cursor:"pointer" }}>Select All</button>
                          <button type="button" onClick={()=>setVerificationMarketerIds([])} style={{ padding:"6px 9px", border:"1px solid #ddcbd0", borderRadius:"7px", background:"#fff", color:"#7a0f2b", fontSize:"10.5px", fontWeight:800, cursor:"pointer" }}>Clear</button>
                          <button type="button" onClick={()=>setVerificationPickerOpen(false)} style={{ padding:"6px 9px", border:"1px solid #ddcbd0", borderRadius:"7px", background:"#fff", color:"#333", fontSize:"10.5px", fontWeight:800, cursor:"pointer" }}>Done</button>
                        </div>
                        {marketersList.slice().sort((a,b)=>String(a.name||a.email||"").localeCompare(String(b.name||b.email||""))).map((m)=>{
const checked=verificationMarketerIds.includes(m.id);
return <label key={m.id} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"7px 6px", borderRadius:"7px", cursor:"pointer", background:checked?"#fff2f5":"transparent", color:"#35262a", fontSize:"11.5px" }}><input type="checkbox" checked={checked} onChange={()=>setVerificationMarketerIds(prev=>checked?prev.filter(id=>id!==m.id):[...prev,m.id])} /> <span>{m.name || m.email || "Marketer"}</span></label>;
})}
                      </div>
)}
                  </div>
                  <button className="verification-clear-range" type="button" title="Clear date range" onClick={()=>{setVerificationFromDate("");setVerificationToDate("");}} style={{ height:"42px", padding:"0 9px", background:"#fff", color:"#7a0f2b", border:"1px solid #ddcbd0", borderRadius:"9px", fontSize:"10.5px", fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>Clear Range</button>
                  <button className="verification-refresh" type="button" title="Refresh verification calls" onClick={()=>Promise.all([fetchAllReports(),fetchMarketers()])} style={{ width:"42px", minWidth:"42px", height:"42px", padding:0, background:"#fff", color:"#7a0f2b", border:"1px solid #ddcbd0", borderRadius:"9px", fontWeight:900, fontSize:"18px", cursor:"pointer" }}>↻</button>
                </div>
                {(() => {
const rows=getFilteredVerificationRows();
if(!rows.length) return <div style={{ padding:"18px", textAlign:"center", color:"#78686d", border:"1px dashed #decbd0", borderRadius:"12px" }}>No visit records found for the selected range / marketers.</div>;
return renderVerificationReportTable(rows);
})()}
              </div>
            </div>);
}
