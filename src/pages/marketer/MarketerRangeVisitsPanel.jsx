import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";

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
              {getAccessibleVisitMarketers().length > 1 && <div style={{ marginBottom: "14px" }}>
                <MarketerMultiSelect marketers={getAccessibleVisitMarketers()} selected={selectedVisitHistoryMarketerIds} onChange={setSelectedVisitHistoryMarketerIds} inputStyle={inputStyle} valueKey="id" emptyLabel="My Visits" />
              </div>}
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
