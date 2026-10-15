import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function AdminAttendancePanel() {
  const { adminAttendanceFromDate, adminAttendanceMarketerFilter, adminAttendancePetrolRate, adminAttendanceToDate, cardStyle, downloadAttendanceExcel, downloadAttendancePDF, fetchAttendanceRecords, getFilteredAttendance, getTodayInputDate, inputStyle, marketersList, renderAttendanceReportTable, renderExpandedReportChrome, renderReportExpandButton, reportViewClass, saveAttendancePetrolRate, setAdminAttendanceFromDate, setAdminAttendanceMarketerFilter, setAdminAttendancePetrolRate, setAdminAttendanceToDate, setAdminView, setAttendanceMediaFromDate, setAttendanceMediaMarketer, setAttendanceMediaToDate, setAttendancePetrolRates, setSelectedAttendanceMediaIds } = usePortalContext();
  return (<div className={reportViewClass("attendance")}>
              {renderExpandedReportChrome("attendance")}
              <button className="report-normal-back" onClick={() => setAdminView("home")} style={{ marginBottom: "14px", padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back to Menu</button>
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#3b2329", fontSize: "18px" }}>🕘 Daily Attendance</h3>
                    <p style={{ margin: "5px 0 0", color: "#78686d", fontSize: "11px" }}>Daily attendance register with readings, petrol expense, other expenses and picture proofs.</p>
                  </div>
                  <div className="report-normal-actions" style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => {
setAttendanceMediaFromDate(adminAttendanceFromDate);
setAttendanceMediaToDate(adminAttendanceToDate);
setSelectedAttendanceMediaIds([]);
const selectedMarketer = marketersList.find((m) => String(m.email || "").toLowerCase() === String(adminAttendanceMarketerFilter || "").toLowerCase());
setAttendanceMediaMarketer(adminAttendanceMarketerFilter ? (selectedMarketer?.id || adminAttendanceMarketerFilter) : null);
fetchAttendanceRecords();
setAdminView("attendance-media");
}} style={{ padding: "8px 11px", background: "#a42243", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "11px" }}>🖼️ Media</button>
                    <button type="button" onClick={downloadAttendanceExcel} style={{ padding: "8px 11px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "11px" }}>📥 Excel</button>
                    <button type="button" onClick={downloadAttendancePDF} style={{ padding: "8px 11px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "11px" }}>📄 PDF</button>
                    {renderReportExpandButton("attendance", "Expand attendance")}
                  </div>
                </div>
                <div className="attendance-filter-grid" style={{ display: "grid", gridTemplateColumns: "minmax(105px,1fr) minmax(105px,1fr) 76px minmax(145px,1.25fr) 88px 40px", gap: "6px", alignItems: "end", marginBottom: "14px" }}>
                  <div className="attendance-from-field"><label style={{ fontSize: "9.5px", color: "#78686d", display: "block", marginBottom: "3px" }}>From Date</label><input type="date" lang="en-GB" value={adminAttendanceFromDate} onChange={(e)=>setAdminAttendanceFromDate(e.target.value)} style={{...inputStyle,height:"38px",padding:"6px 7px",fontSize:"10.5px"}} /></div>
                  <div className="attendance-to-field"><label style={{ fontSize: "9.5px", color: "#78686d", display: "block", marginBottom: "3px" }}>To Date</label><input type="date" lang="en-GB" value={adminAttendanceToDate} onChange={(e)=>setAdminAttendanceToDate(e.target.value)} style={{...inputStyle,height:"38px",padding:"6px 7px",fontSize:"10.5px"}} /></div>
                  <button className="attendance-clear-range-btn" type="button" title="Clear date range" onClick={()=>{ setAdminAttendanceFromDate(""); setAdminAttendanceToDate(""); }} style={{height:"38px",padding:"0 8px",border:"1px solid rgba(148,163,184,.30)",borderRadius:"9px",background:"#ffffff",color:"#7a0f2b",fontSize:"10px",fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>Clear</button>
                  <div className="attendance-marketer-field">
                    <label style={{ fontSize: "9.5px", color: "#78686d", display: "block", marginBottom: "3px" }}>Select Marketer</label>
                    <select value={adminAttendanceMarketerFilter} onChange={(e)=>setAdminAttendanceMarketerFilter(e.target.value)} style={{...inputStyle,height:"38px",padding:"6px 8px",fontSize:"10.5px"}}>
                      <option value="">All Marketers</option>
                      {[...marketersList].sort((a,b)=>String(a.name||a.email||"").localeCompare(String(b.name||b.email||""))).map((m)=>(
<option key={m.id} value={m.email || ""}>{m.name || m.email || "Marketer"}</option>
))}
                    </select>
                  </div>
                  <div className="attendance-petrol-field"><label style={{ fontSize: "9.5px", color: "#78686d", display: "block", marginBottom: "3px" }}>Petrol / L</label><input type="number" min="0" step="0.01" value={adminAttendancePetrolRate} onChange={(e)=>{ const value=e.target.value; setAdminAttendancePetrolRate(value); const dateKey=adminAttendanceToDate||getTodayInputDate(); setAttendancePetrolRates(prev=>({...prev,[dateKey]:value})); }} onBlur={saveAttendancePetrolRate} onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); saveAttendancePetrolRate(); e.currentTarget.blur(); } }} placeholder="Rate" title="Petrol rate per litre used in Petrol Expense calculation" style={{...inputStyle,height:"38px",padding:"6px 7px",fontSize:"10.5px",textAlign:"center"}} /></div>
                  <button className="attendance-refresh-btn" type="button" title="Refresh" onClick={()=>fetchAttendanceRecords()} style={{ height:"38px", width:"40px", border:"1px solid rgba(143,21,50,.28)", borderRadius:"9px", background:"#ffffff", color:"#7a0f2b", fontSize:"18px", cursor:"pointer" }}>↻</button>
                </div>
                {getFilteredAttendance().length === 0 ? (
<div style={{ padding:"22px", textAlign:"center", color:"#78686d", border:"1px dashed rgba(143,21,50,.20)", borderRadius:"12px" }}>No attendance record found for this range.</div>
) : renderAttendanceReportTable(getFilteredAttendance())}
              </div>
            </div>);
}
