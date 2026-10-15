import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import { calculatedKms } from "../../features/expenses/expenseCalculations.js";

export default function MarketerExpenseReportPanel() {
  const { cardStyle, downloadExpenseReportExcel, downloadExpenseReportPDF, expenseReportFromDate, expenseReportLoading, expenseReportToDate, fetchMarketerExpenseReport, formatActionPlanDate, formatTime12, getDateKey, getFilteredExpenseReportRows, getMarketerExpensePetrol, inputStyle, renderExpandedReportChrome, renderReportExpandButton, reportViewClass, setExpenseReportFromDate, setExpenseReportToDate, setMarketerview } = usePortalContext();
  return (<div className={reportViewClass("marketer-expense")}>
            {renderExpandedReportChrome("marketer-expense")}
            <div className="report-normal-toolbar" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"14px" }}>
              <button onClick={() => setMarketerview("home")} style={{ padding:"8px 14px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"white", border:"none", borderRadius:"10px", fontWeight:700, cursor:"pointer", fontSize:"13px" }}>← Back to Menu</button>
              <div style={{ display:"flex", gap:"7px", alignItems:"center", flexWrap:"wrap" }}>
                <button type="button" onClick={downloadExpenseReportExcel} style={{ padding:"7px 11px", background:"#15803d", color:"#fff", border:"none", borderRadius:"8px", fontWeight:800, fontSize:"11px", cursor:"pointer" }}>📥 Excel</button>
                <button type="button" onClick={downloadExpenseReportPDF} style={{ padding:"7px 11px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"#fff", border:"none", borderRadius:"8px", fontWeight:800, fontSize:"11px", cursor:"pointer" }}>📄 PDF</button>
                {renderReportExpandButton("marketer-expense", "Expand expense report")}
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ marginBottom:"14px" }}>
                <h3 style={{ margin:"0 0 4px", color:"#3b2329", fontSize:"18px" }}>🧾 Expense Report</h3>
                <p style={{ margin:0, color:"#78686d", fontSize:"11.5px" }}>Your daily readings, calculated kilometres and other expenses.</p>
              </div>
              <div className="expense-report-filter-grid" style={{ display:"grid", gridTemplateColumns:"minmax(120px,1fr) minmax(120px,1fr) 88px 42px", gap:"7px", alignItems:"end", marginBottom:"14px" }}>
                <div>
                  <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>From Date</label>
                  <input type="date" lang="en-GB" value={expenseReportFromDate} onChange={(e)=>setExpenseReportFromDate(e.target.value)} style={{ ...inputStyle, height:"42px", padding:"7px 8px", background:"#fff", colorScheme:"light" }} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:700, marginBottom:"4px" }}>To Date</label>
                  <input type="date" lang="en-GB" value={expenseReportToDate} onChange={(e)=>setExpenseReportToDate(e.target.value)} style={{ ...inputStyle, height:"42px", padding:"7px 8px", background:"#fff", colorScheme:"light" }} />
                </div>
                <button className="white-range-btn expense-report-clear-btn" type="button" title="Clear date range" onClick={()=>{setExpenseReportFromDate("");setExpenseReportToDate("");}} style={{ height:"42px", padding:"0 9px", background:"#fff", color:"#7a0f2b", border:"1px solid #ddcbd0", borderRadius:"9px", fontSize:"10.5px", fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>Clear Range</button>
                <button className="white-refresh-btn expense-report-refresh-btn" type="button" title="Refresh expense report" aria-label="Refresh expense report" onClick={fetchMarketerExpenseReport} style={{ width:"42px", minWidth:"42px", height:"42px", padding:0, background:"#fff", color:"#7a0f2b", border:"1px solid #ddcbd0", borderRadius:"9px", fontWeight:900, fontSize:"18px", cursor:"pointer", boxShadow:"0 3px 10px rgba(122,15,43,.07)" }}>↻</button>
              </div>
              {expenseReportLoading ? (
<div style={{ padding:"18px", textAlign:"center", color:"#7a0f2b", fontWeight:800 }}>Loading expense report...</div>
) : (!expenseReportFromDate || !expenseReportToDate) ? (
<div style={{ padding:"18px", borderRadius:"12px", background:"#fffafa", border:"1px solid #eadde0", color:"#78686d", textAlign:"center", fontSize:"12px" }}>Select From Date and To Date to view the report.</div>
) : (() => {
const rows = getFilteredExpenseReportRows();
const totalKms = rows.reduce((sum,row)=>sum + calculatedKms(row), 0);
const totalPetrol = rows.reduce((sum,row)=>sum + getMarketerExpensePetrol(row), 0);
const totalTransport = rows.reduce((sum,row)=>sum + Number(row?.transportExpense || 0),0);
const totalNight = rows.reduce((sum,row)=>sum + Number(row?.nightStayExpense || 0),0);
const totalFood = rows.reduce((sum,row)=>sum + Number(row?.foodExpense || 0),0);
const totalOther = rows.reduce((sum,row)=>sum + Number(row?.otherExpense || 0),0);
const totalOtherExpenses = totalTransport + totalNight + totalFood + totalOther;
if (!rows.length) return <div style={{ padding:"18px", textAlign:"center", color:"#78686d", fontSize:"12px" }}>No attendance / expense data found for this range.</div>;
return (
<>
<div className="expense-report-totals"><div><span>Calculated KMs</span><strong>{totalKms.toFixed(1).replace(/\.0$/,'')} KMs</strong></div><div><span>Petrol Expense</span><strong>Rs. {totalPetrol.toFixed(2)}</strong></div><div><span>Other Expense</span><strong>Rs. {totalOtherExpenses.toFixed(2)}</strong></div></div>
<div className="table-scroll" style={{ overflowX:"auto", border:"1px solid #e4d7da", borderRadius:"12px", background:"#fff" }}>
                    <table style={{ width:"100%", minWidth:"1120px", borderCollapse:"collapse", background:"#fff", fontSize:"11px" }}>
                      <thead>
                        <tr>
                          {[
"Date","Time","Day In Reading","Day Out Reading","Calculated KMs","Petrol Expense","Transport","Night Stay","Food","Other","Total Other Expense"
].map((head)=><th key={head} style={{ padding:"10px 8px", border:"1px solid #e5d6da", background:"#f9ecef", color:"#6f0b24", textAlign:"center", fontWeight:900, whiteSpace:"nowrap" }}>{head}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row)=>{
const kms = calculatedKms(row);
const petrolExpense = getMarketerExpensePetrol(row);
const totalExpense = Number(row?.transportExpense || 0)+Number(row?.nightStayExpense || 0)+Number(row?.foodExpense || 0)+Number(row?.otherExpense || 0);
return (
<tr key={row.id}>
                              <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{formatActionPlanDate(row.date || getDateKey(row.updatedAt))}</td>
                              <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111", whiteSpace:"nowrap" }}>{formatTime12(row.startTime,"—")} - {formatTime12(row.endTime,"—")}</td>
                              <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{row.startReading ?? "—"}</td>
                              <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{row.endReading ?? "—"}</td>
                              <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#7a0f2b", fontWeight:900 }}>{Number.isFinite(kms)?kms.toFixed(1).replace(/\.0$/,''):"0"}</td>
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
</>
);
})()}
            </div>
          </div>);
}
