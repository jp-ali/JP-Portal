import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function AdminActionPlansPanel() {
  const { adminActionPlanFromDate, adminActionPlanSearch, adminActionPlanToDate, cardStyle, downloadActionPlanExcel, downloadActionPlanPDF, fetchActionPlans, getFilteredActionPlans, inputStyle, renderActionPlanReportTable, renderExpandedReportChrome, renderReportExpandButton, reportViewClass, setAdminActionPlanFromDate, setAdminActionPlanSearch, setAdminActionPlanToDate, setAdminView } = usePortalContext();
  return (<div className={reportViewClass("action-plans")}>
              {renderExpandedReportChrome("action-plans")}
              <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button
onClick={() => setAdminView("home")}
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
>
                  ← Back
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
type="button"
onClick={downloadActionPlanExcel}
style={{ padding: "6px 12px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                    📥 Excel
                  </button>
                  <button
type="button"
onClick={downloadActionPlanPDF}
style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                    📄 PDF
                  </button>
                  {renderReportExpandButton("action-plans", "Expand action plans")}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{ marginBottom: "14px" }}>
                  <h3 style={{ margin: 0, color: "#3b2329", fontSize: "18px" }}>🗓️ Daily Action Plans</h3>
                  <p style={{ margin: "4px 0 0", color: "#78686d", fontSize: "12px" }}>View, filter, download or delete submitted action plans.</p>
                </div>
                <div className="action-plan-range-row">
                  <div>
                    <label style={{ display: "block", color: "#78686d", fontSize: "10.5px", fontWeight: 700, marginBottom: "4px" }}>From Date</label>
                    <input className="action-plan-date-input" type="date" lang="en-GB" value={adminActionPlanFromDate} onChange={(e) => setAdminActionPlanFromDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "#78686d", fontSize: "10.5px", fontWeight: 700, marginBottom: "4px" }}>To Date</label>
                    <input className="action-plan-date-input" type="date" lang="en-GB" value={adminActionPlanToDate} onChange={(e) => setAdminActionPlanToDate(e.target.value)} style={inputStyle} />
                  </div>
                  <button type="button" className="action-plan-refresh-icon" onClick={fetchActionPlans} title="Refresh action plans" aria-label="Refresh action plans">↻</button>
                </div>
                <div className="action-plan-search-row">
                  <input type="text" value={adminActionPlanSearch} onChange={(e) => setAdminActionPlanSearch(e.target.value)} placeholder="🔍 Search marketer / area / purpose" style={inputStyle} />
                </div>
                {(() => {
const rows = getFilteredActionPlans();
return rows.length === 0 ? (
<div style={{ padding: "18px", borderRadius: "12px", background: "rgba(15,23,42,.6)", color: "#78686d", fontSize: "13px", textAlign: "center" }}>No action plans found for the selected date/filter.</div>
) : renderActionPlanReportTable(rows);
})()}
              </div>
            </div>);
}
