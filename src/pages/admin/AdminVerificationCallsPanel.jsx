import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import ReportMarketerFilterBar from "../../ui/ReportMarketerFilterBar.jsx";

export default function AdminVerificationCallsPanel() {
  const { cardStyle, downloadVerificationExcel, downloadVerificationPDF, fetchAllReports, fetchMarketers, getFilteredVerificationRows, inputStyle, marketersList, renderExpandedReportChrome, renderReportExpandButton, renderVerificationReportTable, reportViewClass, setAdminView, setVerificationFromDate, setVerificationMarketerIds, setVerificationPickerOpen, setVerificationToDate, verificationFromDate, verificationMarketerIds, verificationPickerOpen, verificationToDate } = usePortalContext();
  return (<div className={reportViewClass("verification-calls")}>
              {renderExpandedReportChrome("verification-calls")}
              <div className="report-normal-toolbar" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"14px" }}>
                <button type="button" onClick={() => setAdminView("verification-reports")} style={{ padding:"8px 14px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"white", border:"none", borderRadius:"10px", fontWeight:700, cursor:"pointer", fontSize:"13px" }}>← Back to Verification</button>
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
                <ReportMarketerFilterBar fromDate={verificationFromDate} toDate={verificationToDate} onFromDate={setVerificationFromDate} onToDate={setVerificationToDate} onClear={() => { setVerificationFromDate(""); setVerificationToDate(""); }} marketers={marketersList} selected={verificationMarketerIds} onSelected={setVerificationMarketerIds} valueKey="id" onRefresh={() => Promise.all([fetchAllReports(), fetchMarketers()])} inputStyle={inputStyle} />
                {(() => {
const rows=getFilteredVerificationRows();
if(!rows.length) return <div style={{ padding:"18px", textAlign:"center", color:"#78686d", border:"1px dashed #decbd0", borderRadius:"12px" }}>No visit records found for the selected range / marketers.</div>;
return renderVerificationReportTable(rows);
})()}
              </div>
            </div>);
}
