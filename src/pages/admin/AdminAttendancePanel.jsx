import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import ReportMarketerFilterBar from "../../ui/ReportMarketerFilterBar.jsx";

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
const selectedMarketer = adminAttendanceMarketerFilter.length === 1 ? marketersList.find((m) => String(m.email || "").toLowerCase() === String(adminAttendanceMarketerFilter[0]).toLowerCase()) : null;
setAttendanceMediaMarketer(selectedMarketer?.id || null);
fetchAttendanceRecords();
setAdminView("attendance-media");
}} style={{ padding: "8px 11px", background: "#a42243", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "11px" }}>🖼️ Media</button>
                    <button type="button" onClick={downloadAttendanceExcel} style={{ padding: "8px 11px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "11px" }}>📥 Excel</button>
                    <button type="button" onClick={downloadAttendancePDF} style={{ padding: "8px 11px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "11px" }}>📄 PDF</button>
                    {renderReportExpandButton("attendance", "Expand attendance")}
                  </div>
                </div>
                <ReportMarketerFilterBar fromDate={adminAttendanceFromDate} toDate={adminAttendanceToDate} onFromDate={setAdminAttendanceFromDate} onToDate={setAdminAttendanceToDate} onClear={() => { const today = getTodayInputDate(); setAdminAttendanceFromDate(today); setAdminAttendanceToDate(today); }} marketers={marketersList} selected={adminAttendanceMarketerFilter} onSelected={setAdminAttendanceMarketerFilter} onRefresh={() => fetchAttendanceRecords(true)} inputStyle={inputStyle} rateControl={<><label>Petrol / L</label><input type="number" min="0" step="0.01" value={adminAttendancePetrolRate} onChange={(e)=>{ const value=e.target.value; setAdminAttendancePetrolRate(value); const dateKey=adminAttendanceToDate||getTodayInputDate(); setAttendancePetrolRates(prev=>({...prev,[dateKey]:value})); }} onBlur={saveAttendancePetrolRate} onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); saveAttendancePetrolRate(); e.currentTarget.blur(); } }} placeholder="Rate" title="Petrol rate per litre used in Petrol Expense calculation" style={{...inputStyle,textAlign:"center"}} /></>} />
                {getFilteredAttendance().length === 0 ? (
<div style={{ padding:"22px", textAlign:"center", color:"#78686d", border:"1px dashed rgba(143,21,50,.20)", borderRadius:"12px" }}>No attendance record found for this range.</div>
) : renderAttendanceReportTable(getFilteredAttendance())}
              </div>
            </div>);
}
