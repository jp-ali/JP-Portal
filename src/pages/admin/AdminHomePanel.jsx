import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function AdminHomePanel() {
  const { fetchActionPlans, fetchAllReports, fetchAllSamples, fetchAttendanceRecords, fetchCatalogues, fetchDeletedMarketers, fetchDeletedMedia, fetchLocationCatalog, fetchMarketers, getTodayInputDate, openAdminExpenseReport, openVerificationCalls, renderMarketerPersonIcon, resetMarketerAssignmentForm, setAdminActionPlanFromDate, setAdminActionPlanSearch, setAdminActionPlanToDate, setAdminAttendanceFromDate, setAdminAttendanceSearch, setAdminAttendanceToDate, setAdminSampleFromDate, setAdminSampleMarketersFilter, setAdminSampleToDate, setAdminView, setAllVisitsFromDate, setAllVisitsToDate, setCatalogueSearch, setEditingId, setEditingReturnToMarketerDetails, setMarketerAssignedKms, setMarketerDesignation, setMarketerEmail, setMarketerName, setMarketerPass, setMarketerPhone, setMarketerWhatsappGroupLink, setMarketerWhatsappGroupName, setMediaMarketer, setMediaView, setSelectedAdminAllBoxKey, setSelectedAdminMarketerBox, setSelectedAdminSampleMarketerBox, setSelectedAdminSampleSchoolBox, setSelectedDeletedMediaIds, setSelectedMarketerDetailBox, setSelectedMarketersFilter, setSelectedMediaIds, setSubordinateMarketerIds, setSubordinatePickerOpen, setSubordinateSearch } = usePortalContext();
  return (<div className="square-grid" style={{ marginTop: "10px" }}>
              <div
className="square-card shaking-card"
onClick={() => { const today = getTodayInputDate(); setAdminAttendanceFromDate(today); setAdminAttendanceToDate(today); setAdminAttendanceSearch(""); setAdminView("attendance"); fetchAttendanceRecords(); }}
style={{ borderTop: "4px solid #a42243", animationDelay: "0s" }}
>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>🕘</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Attendance</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Daily readings, expenses & pictures</p>
              </div>
              <div
className="square-card shaking-card"
onClick={() => { const today = getTodayInputDate(); setAdminActionPlanFromDate(today); setAdminActionPlanToDate(today); setAdminActionPlanSearch(""); setAdminView("action-plans"); fetchActionPlans(); }}
style={{ borderTop: "4px solid #941a39", animationDelay: "0.1s" }}
>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>🗓️</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Action Plan</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>See marketers' daily action plans</p>
              </div>
              <div 
className="square-card shaking-card"
onClick={() => { setAdminView("today-visits"); fetchAllReports(); setSelectedAdminMarketerBox(null); }} 
style={{ borderTop: "4px solid #b6405b", animationDelay: "0.2s" }}
>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>☀️</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>View Today Visits</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Check today's marketer visits</p>
              </div>
              <div 
className="square-card shaking-card"
onClick={() => { setAdminView("visits"); fetchAllReports(); fetchMarketers(); setSelectedAdminAllBoxKey(null); setAllVisitsFromDate(""); setAllVisitsToDate(""); setSelectedMarketersFilter([]); }}
style={{ borderTop: "4px solid #8f1532", animationDelay: "0.4s" }}
>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>📊</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>All Visits and Reports</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Check all marketer visits</p>
              </div>
              <div 
className="square-card shaking-card"
onClick={() => { setAdminView("sample-details"); fetchAllSamples(); fetchMarketers(); setSelectedAdminSampleMarketerBox(null); setSelectedAdminSampleSchoolBox(null); setAdminSampleFromDate(""); setAdminSampleToDate(""); setAdminSampleMarketersFilter([]); }} 
style={{ borderTop: "4px solid #77102a" }}
>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>📦</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Sample Details</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Check marketers sample items</p>
              </div>
              <div
className="square-card shaking-card"
onClick={openAdminExpenseReport}
style={{ borderTop: "4px solid #7a0f2b", animationDelay: "0.55s" }}
>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>🧾</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Expense Report</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Marketer kilometres & expenses</p>
              </div>
              <div 
className="square-card shaking-card"
onClick={() => { setAdminView("marketers-detail"); fetchMarketers(); setSelectedMarketerDetailBox(null); }} 
style={{ borderTop: "4px solid #8c1733", animationDelay: "0.6s" }}
>
                <div style={{ marginBottom: "10px" }}>{renderMarketerPersonIcon(34, true)}</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Marketers Details</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>View active marketers</p>
              </div>
              <div 
className="square-card shaking-card"
onClick={() => { setEditingId(null); setEditingReturnToMarketerDetails(false); setMarketerName(""); setMarketerPhone(""); setMarketerEmail(""); setMarketerPass(""); setMarketerDesignation(""); setMarketerAssignedKms(""); setSubordinateMarketerIds([]); setSubordinatePickerOpen(false); setSubordinateSearch(""); setMarketerWhatsappGroupName(""); setMarketerWhatsappGroupLink(""); resetMarketerAssignmentForm(); setAdminView("add-marketer"); fetchLocationCatalog().catch(() => {}); }} 
style={{ borderTop: "4px solid #86132f", animationDelay: "0.8s" }}
>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>➕</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Add Marketer</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Create new account</p>
              </div>
              <div 
className="square-card shaking-card"
onClick={() => { setAdminView("delete-marketer"); fetchMarketers(); }} 
style={{ borderTop: "4px solid #ef4444", animationDelay: "1.0s" }}
>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>🗑️</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Delete Marketer</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Remove active marketer</p>
              </div>
              <div 
className="square-card shaking-card"
onClick={() => { setAdminView("old-marketers"); fetchDeletedMarketers(); }} 
style={{ borderTop: "4px solid #9d3451", animationDelay: "1.2s" }}
>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>🗄</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Old Marketers</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Restore deleted marketers</p>
              </div>
              <div className="square-card shaking-card" onClick={() => { setAdminView("catalogues"); setCatalogueSearch(""); fetchCatalogues(); }} style={{ borderTop: "4px solid #8f1532", animationDelay: "1.25s" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>📚</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Catalogues</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Upload & manage PDF catalogues</p>
              </div>
              <div className="square-card shaking-card" onClick={() => setAdminView("verification-reports")} style={{ borderTop: "4px solid #7a0f2b", animationDelay: "1.3s" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>☎️</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Verification Calls</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Verify school visits & call remarks</p>
              </div>
              <div className="square-card shaking-card" onClick={() => setAdminView("other-reports")} style={{ borderTop: "4px solid #8f1532", animationDelay: "1.35s" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>📋</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Other Reports</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Create and manage custom reports</p>
              </div>
              <div className="square-card shaking-card" onClick={() => { setAdminView("media"); fetchAllReports(); fetchDeletedMedia(); setMediaMarketer(null); setSelectedMediaIds([]); setSelectedDeletedMediaIds([]); setMediaView("active"); }} style={{ borderTop: "4px solid #8c1733", animationDelay: "1.4s" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>🖼️</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Media</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Manage all visit pictures</p>
              </div>
              <div className="square-card shaking-card" onClick={() => { setAdminView("media"); fetchAllReports(); fetchDeletedMedia(); setMediaMarketer(null); setSelectedMediaIds([]); setSelectedDeletedMediaIds([]); setMediaView("deleted"); }} style={{ borderTop: "4px solid #77102a", animationDelay: "1.6s" }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>♻️</div>
                <h3 style={{ margin: "0 0 4px 0", color: "#3b2329", fontSize: "16px" }}>Recently Deleted</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Restore or permanently remove media</p>
              </div>
            </div>);
}
