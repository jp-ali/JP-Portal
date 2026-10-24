import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import ReportMarketerFilterBar from "../../ui/ReportMarketerFilterBar.jsx";

export default function AdminExpenseReportPanel() {
  const { adminExpenseFromDate, adminExpenseLoading, adminExpenseMarketerIds, adminExpenseToDate, cardStyle, downloadAdminExpenseExcel, downloadAdminExpensePDF, fetchAdminExpenseReport, formatActionPlanDate, formatTime12, getFilteredAdminExpenseRows, getAdminExpenseValues, groupRowsByMarketerAndDate, inputStyle, marketersList, renderExpandedReportChrome, renderReportExpandButton, reportViewClass, setAdminExpenseFromDate, setAdminExpenseMarketerIds, getAdminExpenseMarketerName, setAdminExpenseToDate, setAdminView } = usePortalContext();
  return (<div className={`${reportViewClass("expense-report")} expense-report-page`}>
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
                  <p style={{ margin:0, color:"#78686d", fontSize:"11.5px" }}>View daily readings, calculated kilometres and other expenses.</p>
                </div>
                <ReportMarketerFilterBar fromDate={adminExpenseFromDate} toDate={adminExpenseToDate} onFromDate={setAdminExpenseFromDate} onToDate={setAdminExpenseToDate} onClear={() => { setAdminExpenseFromDate(""); setAdminExpenseToDate(""); }} marketers={marketersList} selected={adminExpenseMarketerIds} onSelected={setAdminExpenseMarketerIds} valueKey="id" onRefresh={fetchAdminExpenseReport} inputStyle={inputStyle} />
                {adminExpenseLoading ? (
<div style={{ padding:"18px", textAlign:"center", color:"#7a0f2b", fontWeight:800 }}>Loading expense report...</div>
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
const people = groupRowsByMarketerAndDate(rows, { getDateValue: (row) => row?.date || row?.updatedAt || row?.startCreatedAt || row?.endCreatedAt, getName: getAdminExpenseMarketerName });
return (
<>
<div className="expense-report-totals"><div><span>Calculated KMs</span><strong>{totalKms.toFixed(1).replace(/\.0$/,'')} KMs</strong></div><div><span>Petrol Expense</span><strong>Rs. {totalPetrol.toFixed(2)}</strong></div><div><span>Other Expense</span><strong>Rs. {totalOtherExpenses.toFixed(2)}</strong></div><div><span>Net Total</span><strong>Rs. {(totalPetrol + totalOtherExpenses).toFixed(2)}</strong></div></div>
<div className="table-scroll" style={{ overflowX:"auto", border:"1px solid #e4d7da", borderRadius:"12px", background:"#fff" }}>
                      <table style={{ width:"100%", minWidth:"1550px", borderCollapse:"collapse", background:"#fff", fontSize:"11px" }}>
                        <thead>
                          <tr>
                            {["Sr.","Marketer","Date","Sr#","Time","Day In Reading","Day Out Reading","Calculated KMs","Assigned KMs","Rate / L","Petrol Expense","Transport","Night Stay","Food","Other","Total Other Expense"].map((head)=><th key={head} style={{ padding:"10px 8px", border:"1px solid #e5d6da", background:"#f9ecef", color:"#6f0b24", textAlign:"center", fontWeight:900, whiteSpace:"nowrap" }}>{head}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {people.flatMap((person, personIndex) => {
let personWritten = false; let personSerial = 0;
return [...person.dates.entries()].flatMap(([dateKey, entries]) => entries.map((row, itemIndex) => {
const showPerson = !personWritten;
if (showPerson) personWritten = true;
const { kms, assignedKms, petrolRate, petrolExpense } = getAdminExpenseValues(row);
const totalExpense = Number(row?.transportExpense || 0)+Number(row?.nightStayExpense || 0)+Number(row?.foodExpense || 0)+Number(row?.otherExpense || 0);
return (
<tr key={row.id}>
                                {showPerson && <><td rowSpan={person.total} className="expense-report-merged-cell">{personIndex + 1}</td><td rowSpan={person.total} className="expense-report-merged-cell">{person.name}</td></>}
                                {itemIndex === 0 && <td rowSpan={entries.length} className="expense-report-merged-cell">{formatActionPlanDate(dateKey)}</td>}
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{++personSerial}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111", whiteSpace:"nowrap" }}>{formatTime12(row.startTime,"—")} - {formatTime12(row.endTime,"—")}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{row.startReading ?? "—"}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{row.endReading ?? "—"}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#7a0f2b", fontWeight:900 }}>{Number.isFinite(kms)?kms.toFixed(1).replace(/\.0$/,''):"0"}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{assignedKms.toFixed(1).replace(/\.0$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>{petrolRate === null ? "—" : `Rs. ${petrolRate.toFixed(2)}`}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {petrolExpense.toFixed(2)}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {Number(row.transportExpense || 0).toFixed(2).replace(/\.00$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {Number(row.nightStayExpense || 0).toFixed(2).replace(/\.00$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {Number(row.foodExpense || 0).toFixed(2).replace(/\.00$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111" }}>Rs. {Number(row.otherExpense || 0).toFixed(2).replace(/\.00$/,'')}</td>
                                <td style={{ padding:"9px 8px", border:"1px solid #eee3e6", textAlign:"center", color:"#111", fontWeight:800 }}>Rs. {totalExpense.toFixed(2).replace(/\.00$/,'')}</td>
                              </tr>
);
}));})}
                          <tr>
                            <td colSpan={7} style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#6f0b24", fontWeight:900, textAlign:"right" }}>TOTAL</td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7", color:"#6f0b24", fontWeight:900, textAlign:"center" }}>{totalKms.toFixed(1).replace(/\.0$/,'')} KMs</td>
                            <td style={{ padding:"11px 9px", border:"1px solid #e1cdd2", background:"#fff5f7" }}></td>
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
</>
);
})()}
              </div>
            </div>);
}
