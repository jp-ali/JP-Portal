import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import MarketerSingleSelect from "../../ui/MarketerSingleSelect.jsx";

export default function AdminExpenseReportPanel() {
  const { adminExpenseFromDate, adminExpenseLoading, adminExpenseMarketerId, adminExpenseToDate, cardStyle, downloadAdminExpenseExcel, downloadAdminExpensePDF, fetchAdminExpenseReport, formatActionPlanDate, formatTime12, getDateKey, getFilteredAdminExpenseRows, getAdminExpenseValues, inputStyle, marketersList, renderExpandedReportChrome, renderReportExpandButton, reportViewClass, setAdminExpenseFromDate, setAdminExpenseMarketerId, setAdminExpenseRows, setAdminExpenseToDate, setAdminView } = usePortalContext();
  return (<div className={reportViewClass("expense-report")}>
              {renderExpandedReportChrome("expense-report")}
              <div className="report-normal-toolbar" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"14px" }}>
                <button onClick={() => setAdminView("home")} style={{ padding:"8px 14px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"white", border:"none", borderRadius:"10px", fontWeight:700, cursor:"pointer", fontSize:"13px" }}>← Back to Menu</button>
                <div style={{ display:"flex", gap:"7px", alignItems:"center", flexWrap:"wrap" }}>
                  <button type="button" onClick={downloadAdminExpenseExcel} style={{ padding:"7px 11px", background:"#15803d", color:"#fff", border:"none", borderRadius:"8px", fontWeight:800, fontSize:"11px", cursor:"pointer" }}>📥 Excel</button>
                  <button type="button" onClick={downloadAdminExpensePDF} style={{ padding:"7px 11px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"#fff", border:"none", borderRadius:"8px", fontWeight:800, fontSize:"11px", cursor:"pointer" }}>📄 PDF</button>
                  {renderReportExpandButton("expense-report", "Expand expense report")}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{ marginBottom:"14px" }}>
                  <h3 style={{ margin:"0 0 4px", color:"#3b2329", fontSize:"18px" }}>🧾 Expense Report</h3>
                  <p style={{ margin:0, color:"#78686d", fontSize:"11.5px" }}>Select a marketer to view daily readings, calculated kilometres and other expenses.</p>
                </div>
                <div className="admin-expense-filter-grid" style={{ display:"grid", gridTemplateColumns:"minmax(160px,1.25fr) minmax(120px,1fr) minmax(120px,1fr) 88px 42px", gap:"7px", alignItems:"end", marginBottom:"14px" }}>
                  <div>
                    <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>Select Marketer</label>
                    <MarketerSingleSelect marketers={marketersList} selected={adminExpenseMarketerId} onChange={(id) => { setAdminExpenseMarketerId(id); setAdminExpenseRows([]); if (id) fetchAdminExpenseReport(id); }} inputStyle={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>From Date</label>
                    <input type="date" lang="en-GB" value={adminExpenseFromDate} onChange={(e)=>setAdminExpenseFromDate(e.target.value)} style={{ ...inputStyle, height:"42px", padding:"7px 8px", background:"#fff", colorScheme:"light" }} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>To Date</label>
                    <input type="date" lang="en-GB" value={adminExpenseToDate} onChange={(e)=>setAdminExpenseToDate(e.target.value)} style={{ ...inputStyle, height:"42px", padding:"7px 8px", background:"#fff", colorScheme:"light" }} />
                  </div>
                  <button className="white-range-btn admin-expense-clear-btn" type="button" title="Clear filters" onClick={()=>{setAdminExpenseFromDate("");setAdminExpenseToDate("");}} style={{ height:"42px", padding:"0 9px", background:"#fff", color:"#7a0f2b", border:"1px solid #ddcbd0", borderRadius:"9px", fontSize:"10.5px", fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>Clear Range</button>
                  <button className="white-refresh-btn admin-expense-refresh-btn" type="button" title="Refresh expense report" aria-label="Refresh expense report" onClick={()=>fetchAdminExpenseReport()} style={{ width:"42px", minWidth:"42px", height:"42px", padding:0, background:"#fff", color:"#7a0f2b", border:"1px solid #ddcbd0", borderRadius:"9px", fontWeight:900, fontSize:"18px", cursor:"pointer", boxShadow:"0 3px 10px rgba(122,15,43,.07)" }}>↻</button>
                </div>
                {adminExpenseLoading ? (
<div style={{ padding:"18px", textAlign:"center", color:"#7a0f2b", fontWeight:800 }}>Loading expense report...</div>
) : !adminExpenseMarketerId ? (
<div style={{ padding:"18px", borderRadius:"12px", background:"#fffafa", border:"1px solid #eadde0", color:"#78686d", textAlign:"center", fontSize:"12px" }}>Select a marketer to view the expense report.</div>
) : (!adminExpenseFromDate || !adminExpenseToDate) ? (
<div style={{ padding:"18px", borderRadius:"12px", background:"#fffafa", border:"1px solid #eadde0", color:"#78686d", textAlign:"center", fontSize:"12px" }}>Select From Date and To Date to view the report.</div>
) : (() => {
const rows = getFilteredAdminExpenseRows();
const totalKms = rows.reduce((sum,row)=>sum + getAdminExpenseValues(row).kms, 0);
const totalPetrol = rows.reduce((sum,row)=>sum + getAdminExpenseValues(row).petrolExpense, 0);
const totalTransport = rows.reduce((sum,row)=>sum + Number(row?.transportExpense || 0),0);
const totalNight = rows.reduce((sum,row)=>sum + Number(row?.nightStayExpense || 0),0);
const totalFood = rows.reduce((sum,row)=>sum + Number(row?.foodExpense || 0),0);
const totalOther = rows.reduce((sum,row)=>sum + Number(row?.otherExpense || 0),0);
const totalOtherExpenses = totalTransport + totalNight + totalFood + totalOther;
if (!rows.length) return <div style={{ padding:"18px", textAlign:"center", color:"#78686d", fontSize:"12px" }}>No attendance / expense data found for this range.</div>;
return (
<div className="table-scroll" style={{ overflowX:"auto", border:"1px solid #e4d7da", borderRadius:"12px", background:"#fff" }}>
                      <table style={{ width:"100%", minWidth:"1250px", borderCollapse:"collapse", background:"#fff", fontSize:"11px" }}>
                        <thead>
                          <tr>
                            {["Date","Time","Day In Reading","Day Out Reading","Calculated KMs","Assigned KMs / Litre","Petrol Expense","Transport","Night Stay","Food","Other","Total Other Expense"].map((head)=><th key={head} style={{ padding:"10px 8px", border:"1px solid #e5d6da", background:"#f9ecef", color:"#6f0b24", textAlign:"center", fontWeight:900, whiteSpace:"nowrap" }}>{head}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row)=>{
const { kms, assignedKms, petrolExpense } = getAdminExpenseValues(row);
const totalExpense = Number(row?.transportExpense || 0)+Number(row?.nightStayExpense || 0)+Number(row?.foodExpense || 0)+Number(row?.otherExpense || 0);
return (
<tr key={row.id}>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{formatActionPlanDate(row.date || getDateKey(row.updatedAt))}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111", whiteSpace:"nowrap" }}>{formatTime12(row.startTime,"—")} - {formatTime12(row.endTime,"—")}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{row.startReading ?? "—"}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{row.endReading ?? "—"}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#7a0f2b", fontWeight:900 }}>{Number.isFinite(kms)?kms.toFixed(1).replace(/\.0$/,''):"0"}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{assignedKms.toFixed(1).replace(/\.0$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {petrolExpense.toFixed(2)}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {Number(row.transportExpense || 0).toFixed(2).replace(/\.00$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {Number(row.nightStayExpense || 0).toFixed(2).replace(/\.00$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {Number(row.foodExpense || 0).toFixed(2).replace(/\.00$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {Number(row.otherExpense || 0).toFixed(2).replace(/\.00$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111", fontWeight:800 }}>Rs. {totalExpense.toFixed(2).replace(/\.00$/,'')}</td>
                              </tr>
);
})}
                          <tr>
                            <td colSpan={4} style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#6f0b24", fontWeight:900, textAlign:"right" }}>TOTAL</td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#6f0b24", fontWeight:900, textAlign:"center" }}>{totalKms.toFixed(1).replace(/\.0$/,'')} KMs</td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7" }}></td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#6f0b24", fontWeight:900, textAlign:"center" }}>Rs. {totalPetrol.toFixed(2)}</td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#111", fontWeight:800, textAlign:"center" }}>Rs. {totalTransport.toFixed(2).replace(/\.00$/,'')}</td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#111", fontWeight:800, textAlign:"center" }}>Rs. {totalNight.toFixed(2).replace(/\.00$/,'')}</td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#111", fontWeight:800, textAlign:"center" }}>Rs. {totalFood.toFixed(2).replace(/\.00$/,'')}</td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#111", fontWeight:800, textAlign:"center" }}>Rs. {totalOther.toFixed(2).replace(/\.00$/,'')}</td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#6f0b24", fontWeight:900, textAlign:"center" }}>Rs. {totalOtherExpenses.toFixed(2).replace(/\.00$/,'')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
);
})()}
              </div>
            </div>);
}
