import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import ReportMarketerFilterBar from "../../ui/ReportMarketerFilterBar.jsx";

export default function MarketerRangeVisitsPanel() {
  const { canEditVisitToday, cardStyle, downloadExcel, downloadPDF, fetchMarketerReportsForEmails, getAccessibleVisitMarketers, getVisitHistoryFilteredReports, inputStyle, marketerFromDate, marketerToDate, renderExpandedReportChrome, renderReportExpandButton, renderVisitReportTable, reportViewClass, selectedVisitHistoryMarketerIds, setEditingVisit, setFullScreenImage, setMarketerFromDate, setMarketerToDate, setMarketerview, setSelectedVisitHistoryMarketerIds } = usePortalContext();
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
              </div>
              <ReportMarketerFilterBar fromDate={marketerFromDate} toDate={marketerToDate} onFromDate={setMarketerFromDate} onToDate={setMarketerToDate} onClear={() => { setMarketerFromDate(""); setMarketerToDate(""); }} marketers={getAccessibleVisitMarketers()} selected={selectedVisitHistoryMarketerIds} onSelected={setSelectedVisitHistoryMarketerIds} valueKey="id" emptyLabel="My Visits" onRefresh={() => fetchMarketerReportsForEmails(getAccessibleVisitMarketers().map((m) => m.email))} inputStyle={inputStyle} />
              {(!marketerFromDate || !marketerToDate) ? (
<div style={{ padding:"16px", borderRadius:"12px", background:"#fffafa", border:"1px solid #eadde0", color:"#78686d", fontSize:"12px", textAlign:"center" }}>Select a date range to view visit reports.</div>
) : (() => {
const rows = getVisitHistoryFilteredReports();
if (!rows.length) return <div style={{ padding:"16px", color:"#78686d", fontSize:"12px", textAlign:"center" }}>No visit reports found for the selected marketer(s) and date range.</div>;
return (
<>
<div style={{ marginBottom:"10px", padding:"8px 10px", borderRadius:"9px", background:"#fff4f6", border:"1px solid #ead2d8", color:"#7a0f2b", fontSize:"11px", fontWeight:800 }}>Visits in selected range: {rows.length}</div>
{renderVisitReportTable(rows, null, (r) => <div style={{display:"flex",gap:"4px",justifyContent:"center"}}><button type="button" disabled={!r.image} onClick={()=>setFullScreenImage(r.image)} style={{padding:"5px 7px",background:"#fff",border:"1px solid #eadde0",borderRadius:"6px",fontSize:"9.5px",cursor:r.image?"pointer":"default"}}>View</button>{canEditVisitToday(r)&&<button type="button" onClick={()=>setEditingVisit(r)} style={{padding:"5px 7px",background:"#7a0f2b",color:"#fff",border:0,borderRadius:"6px",fontSize:"9.5px",fontWeight:800,cursor:"pointer"}}>Edit</button>}</div>)}
</>
);
})()}
            </div>
          </div>);
}
