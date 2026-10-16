import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function MarketerTodayVisitsPanel() {
  const { canEditVisitToday, cardStyle, downloadExcel, downloadPDF, getDateKey, marketerReports, renderExpandedReportChrome, renderReportExpandButton, renderVisitReportTable, reportViewClass, setEditingVisit, setFullScreenImage, setMarketerview } = usePortalContext();
  return (<div className={reportViewClass("marketer-today-visits")}>
            {renderExpandedReportChrome("marketer-today-visits")}
            <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
              <button 
onClick={() => setMarketerview("home")} 
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
>
                ← Back
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
onClick={() => downloadExcel(marketerReports.filter(r => {
if (!r.createdAt) return false;
const rDate = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
const today = new Date();
return rDate.getDate() === today.getDate() && rDate.getMonth() === today.getMonth() && rDate.getFullYear() === today.getFullYear();
}), "My_Today_Visits.xlsx")}
style={{ padding: "6px 12px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                  📥 Excel
                </button>
                <button 
onClick={() => downloadPDF(marketerReports.filter(r => {
if (!r.createdAt) return false;
const rDate = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
const today = new Date();
return rDate.getDate() === today.getDate() && rDate.getMonth() === today.getMonth() && rDate.getFullYear() === today.getFullYear();
}))}
style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                  📄 PDF
                </button>
                {renderReportExpandButton("marketer-today-visits", "Expand today's visits")}
              </div>
            </div>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "14px" }}>☀️ Today's Visits <span style={{ display: "inline-block", marginLeft: "8px", padding: "4px 10px", borderRadius: "999px", background: "rgba(143,21,50,.10)", color: "#b6405b", fontSize: "12px" }}>{marketerReports.filter(r => r.createdAt && getDateKey(r.createdAt) === getDateKey(new Date())).length} visits</span></h3>
              {(() => {
const todayRows = marketerReports.filter(r => r.createdAt && getDateKey(r.createdAt) === getDateKey(new Date()));
if (!todayRows.length) return <p style={{ color: "#78686d", fontSize: "14px" }}>No visit reports available for today.</p>;
return renderVisitReportTable(todayRows, null, (r) => <div style={{display:"flex",gap:"4px",justifyContent:"center",flexWrap:"wrap"}}><button type="button" disabled={!r.image} onClick={()=>setFullScreenImage(r.image)} style={{padding:"4px 6px",background:"#fff",border:"1px solid #eadde0",borderRadius:"5px",cursor:r.image?"pointer":"default",fontSize:"9px"}}>View</button>{canEditVisitToday(r)&&<button type="button" onClick={()=>setEditingVisit(r)} style={{padding:"4px 6px",background:"#7a0f2b",color:"#fff",border:"none",borderRadius:"5px",cursor:"pointer",fontSize:"9px"}}>Edit</button>}</div>);
})()}
            </div>
          </div>);
}
