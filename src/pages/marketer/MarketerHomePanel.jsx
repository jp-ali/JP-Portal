import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function MarketerHomePanel() {
  const { fetchCatalogues, fetchMarketerReports, fetchMarketerSamples, openActionPlanForm, openAddVisit, openAttendanceForm, openExpenseReport, openVisitHistory, setCatalogueSearch, setMarketerview, setSampleDetailsText, setSampleHistoryFromDate, setSampleHistorySearch, setSampleHistoryToDate, setSamplePhone, setSamplePrincipalName, setSampleSchoolName, setSampleSuccessMsg, setSelectedAdminMarketerBox, todayAttendance, user } = usePortalContext();
  return (<div className="square-grid" style={{ marginTop: "10px" }}>
            <div
className="square-card shaking-card"
onClick={openAttendanceForm}
style={{ borderTop: "4px solid #a42243" }}
>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>🕘</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Mark Attendance</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>{todayAttendance?.endMarked ? "Day completed" : todayAttendance?.startMarked ? "Start marked • End pending" : todayAttendance?.status === "leave" ? "Leave submitted" : "Start / End / Leave"}</p>
            </div>
            <div
className="square-card shaking-card"
onClick={openActionPlanForm}
style={{ borderTop: "4px solid #941a39", opacity: todayAttendance?.startMarked && todayAttendance?.status !== "leave" ? 1 : .58 }}
>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>{todayAttendance?.actionPlanSent ? "✅" : todayAttendance?.startMarked ? "🗓️" : "🔒"}</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Daily Action Plan</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>{todayAttendance?.actionPlanSent ? "Today's Action Plan submitted" : todayAttendance?.startMarked ? "Send Action Plan to unlock Add Visit" : "Mark Start Time to unlock"}</p>
            </div>
            <div 
className="square-card shaking-card"
onClick={openAddVisit} 
style={{ borderTop: "4px solid #8f1532", opacity: (!todayAttendance?.startMarked || !todayAttendance?.actionPlanSent || todayAttendance?.endMarked || todayAttendance?.status === "leave") ? .52 : 1 }}
>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>{(!todayAttendance?.startMarked || !todayAttendance?.actionPlanSent || todayAttendance?.endMarked || todayAttendance?.status === "leave") ? "🔒" : "➕"}</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Add Visit</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>{todayAttendance?.status === "leave" ? "Closed for Leave" : todayAttendance?.endMarked ? "Closed after End Time" : !todayAttendance?.startMarked ? "Mark Attendance first" : !todayAttendance?.actionPlanSent ? "Send Action Plan first" : "Submit new school report"}</p>
            </div>
            <div 
className="square-card shaking-card"
onClick={() => { setMarketerview("today-visits"); fetchMarketerReports(user.email); setSelectedAdminMarketerBox(null); }} 
style={{ borderTop: "4px solid #b6405b", animationDelay: "0.3s" }}
>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>☀️️</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Today's Visits</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Check today's reports</p>
            </div>
            <div 
className="square-card shaking-card"
onClick={openVisitHistory} 
style={{ borderTop: "4px solid #9d3451", animationDelay: "0.4s" }}
>
              <div style={{ fontSize: "32px", marginBottom: "10px", color: "#ffffff" }}>📅</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Visit History</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Filter visit history</p>
            </div>
            <div 
className="square-card shaking-card"
onClick={() => { setMarketerview("add-sample"); setSampleSchoolName(""); setSamplePrincipalName(""); setSamplePhone(""); setSampleDetailsText(""); setSampleSuccessMsg(""); }} 
style={{ borderTop: "4px solid #77102a", animationDelay: "0.1s" }}
>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>📦</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Add sample</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Add sample details</p>
            </div>
            <div 
className="square-card shaking-card"
onClick={() => { setMarketerview("sample-history"); fetchMarketerSamples(user.email); setSampleHistoryFromDate(""); setSampleHistoryToDate(""); setSampleHistorySearch(""); }} 
style={{ borderTop: "4px solid #9a2844", animationDelay: "0.2s" }}
>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>📋</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Sample History</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>View your samples history</p>
            </div>
            <div
className="square-card shaking-card"
onClick={openExpenseReport}
style={{ borderTop: "4px solid #8f1532", animationDelay: "0.45s" }}
>
              <div style={{ width:"48px", height:"48px", marginBottom:"10px", borderRadius:"14px", display:"grid", placeItems:"center", background:"linear-gradient(145deg,#fff4f6,#f8e3e8)", border:"1px solid rgba(122,15,43,.18)", boxShadow:"0 8px 18px rgba(122,15,43,.12)", fontSize:"25px" }}>🧾</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Expense Report</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>View your KMs & daily expenses</p>
            </div>
            <div
className="square-card shaking-card"
onClick={() => { setMarketerview("catalogues"); setCatalogueSearch(""); fetchCatalogues(); }}
style={{ borderTop: "4px solid #7a0f2b", animationDelay: "0.48s" }}
>
              <div style={{ width:"48px", height:"48px", marginBottom:"10px", borderRadius:"14px", display:"grid", placeItems:"center", background:"linear-gradient(145deg,#fff4f6,#f8e3e8)", border:"1px solid rgba(122,15,43,.18)", boxShadow:"0 8px 18px rgba(122,15,43,.12)", fontSize:"25px" }}>📚</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Catalogues</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>View & download PDF catalogues</p>
            </div>
            <div 
className="square-card shaking-card"
onClick={() => setMarketerview("support")} 
style={{ borderTop: "4px solid #86132f", animationDelay: "0.5s" }}
>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>🎧</div>
              <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Support</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Contact admin & help</p>
            </div>
          </div>);
}
