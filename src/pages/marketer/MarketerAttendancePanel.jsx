import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

const cameraButtonStyle = (photo, height = 49, fontSize = 20) => ({
  width: 48, height, boxSizing: "border-box", padding: 0, display: "grid", placeItems: "center",
  lineHeight: 1, border: "1px solid rgba(143,21,50,.28)", borderRadius: 11,
  background: photo ? "#6f0b24" : "#741027", color: "white", fontSize, cursor: "pointer"
});
const CameraIcon = () => <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h4l2-3h6l2 3h4v13H3V7Z" /><circle cx="12" cy="13" r="3.5" /></svg>;

export default function MarketerAttendancePanel() {
  const { attendanceCameraActive, attendanceCameraTarget, attendanceEndPhoto, attendanceEndReading, attendanceFoodExpense, attendanceFoodExpensePhoto, attendanceLeaveReason, attendanceNightStayExpense, attendanceNightStayExpensePhoto, attendanceOtherExpense, attendanceOtherExpensePhoto, attendanceStartPhoto, attendanceStartReading, attendanceSubmitting, attendanceTransportExpense, attendanceTransportExpensePhoto, attendanceType, attendanceVideoRef, btnPrimary, captureAttendancePhoto, cardStyle, formatActionPlanDate, formatTime12, getTodayInputDate, inputStyle, renderExpandedReportChrome, renderReportExpandButton, reportViewClass, setAttendanceEndReading, setAttendanceFoodExpense, setAttendanceLeaveReason, setAttendanceNightStayExpense, setAttendanceOtherExpense, setAttendanceStartReading, setAttendanceTransportExpense, setAttendanceType, setFullScreenImage, setMarketerview, startAttendanceCamera, stopAttendanceCamera, submitAttendanceEnd, submitAttendanceLeave, submitAttendanceStart, todayAttendance, user } = usePortalContext();
  return (<div className={reportViewClass("marketer-attendance")}>
            {renderExpandedReportChrome("marketer-attendance")}
            <div className="report-normal-toolbar" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", marginBottom:"14px" }}>
              <button onClick={() => { stopAttendanceCamera(); setMarketerview("home"); }} style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back to Menu</button>
              {renderReportExpandButton("marketer-attendance", "Expand attendance")}
            </div>
            <div style={cardStyle}>
              <div style={{ marginBottom:"14px" }}>
                <h3 style={{ margin:"0 0 5px", color:"#3b2329", fontSize:"18px" }}>🕘 Mark Attendance</h3>
                <p style={{ margin:0, color:"#78686d", fontSize:"11.5px" }}>{formatActionPlanDate(getTodayInputDate())} • {user?.name || "Marketer"}</p>
              </div>
              {todayAttendance && (
<div style={{ marginBottom:"14px", padding:"10px 12px", background:"rgba(143,21,50,.07)", border:"1px solid rgba(143,21,50,.18)", borderRadius:"11px", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:"8px" }}>
                  <div><div style={{fontSize:"9.5px",color:"#756369"}}>Start</div><div style={{fontSize:"11px",color:"#49343a",fontWeight:700}}>{todayAttendance.startTime ? formatTime12(todayAttendance.startTime) : "Not marked"}</div></div>
                  <div><div style={{fontSize:"9.5px",color:"#756369"}}>End</div><div style={{fontSize:"11px",color:"#49343a",fontWeight:700}}>{todayAttendance.endTime ? formatTime12(todayAttendance.endTime) : "Not marked"}</div></div>
                  <div><div style={{fontSize:"9.5px",color:"#756369"}}>Status</div><div style={{fontSize:"11px",color:"#b75a70",fontWeight:700}}>{String(todayAttendance.status || "started").toUpperCase()}</div></div>
                </div>
)}
              <label style={{ display:"block", color:"#5c484e", fontWeight:700, fontSize:"12px", marginBottom:"6px" }}>Select Attendance Type</label>
              <select value={attendanceType} onChange={(e)=>{ stopAttendanceCamera(); setAttendanceType(e.target.value); }} style={{ ...inputStyle, height:"49px", marginBottom:"14px" }}>
                <option value="">Select Attendance Type</option>
                <option value="start" disabled={Boolean(todayAttendance?.startMarked || todayAttendance?.status === "leave")}>Start Time</option>
                <option value="end" disabled={!todayAttendance?.startMarked || Boolean(todayAttendance?.endMarked)}>End Time</option>
                <option value="leave" disabled={Boolean(todayAttendance?.startMarked || todayAttendance?.endMarked)}>Leave</option>
              </select>
              {attendanceType === "leave" && (
<div style={{ display:"grid", gap:"10px" }}>
                  <label style={{ color:"#5c484e", fontSize:"12px", fontWeight:700 }}>Leave Reason</label>
                  <textarea value={attendanceLeaveReason} onChange={(e)=>setAttendanceLeaveReason(e.target.value)} placeholder="Type leave reason..." rows={4} style={{...inputStyle,resize:"vertical"}} />
                  <button type="button" disabled={attendanceSubmitting} onClick={submitAttendanceLeave} style={{...btnPrimary,background:"linear-gradient(135deg,#6f0b24,#941a39)"}}>{attendanceSubmitting?"Submitting...":"Submit Leave"}</button>
                </div>
)}
              {attendanceType === "start" && (
<div style={{ display:"grid", gap:"10px" }}>
                  <label style={{ color:"#5c484e", fontSize:"12px", fontWeight:700 }}>Day In / Start Reading</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 48px", gap:"8px" }}>
                    <input type="number" min="0" step="0.1" value={attendanceStartReading} onChange={(e)=>setAttendanceStartReading(e.target.value)} placeholder="Type start reading" style={{...inputStyle,height:"49px"}} />
                    <button type="button" title="Capture start picture" onClick={()=>startAttendanceCamera("start")} style={cameraButtonStyle(attendanceStartPhoto)}><CameraIcon /></button>
                  </div>
                  {attendanceStartPhoto && <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",flexWrap:"wrap"}}><span onClick={()=>setFullScreenImage(attendanceStartPhoto)} style={{color:"#8a253b",fontSize:"10.5px",cursor:"pointer"}}>✓ Start picture captured • tap to view</span><button type="button" onClick={()=>startAttendanceCamera("start")} style={{padding:"5px 8px",minHeight:"28px",background:"#ffffff",border:"1px solid #d8c8cd",borderRadius:"7px",color:"#7a0f2b",fontSize:"9.5px",fontWeight:700,cursor:"pointer"}}>↻ Retake</button></div>}
                  <button type="button" disabled={attendanceSubmitting} onClick={submitAttendanceStart} style={{...btnPrimary,background:"linear-gradient(135deg,#77102a,#941a39)",boxShadow:"0 6px 18px rgba(143,21,50,.20)"}}>{attendanceSubmitting?"Saving...":"Mark"}</button>
                </div>
)}
              {attendanceType === "end" && (
<div style={{ display:"grid", gap:"12px" }}>
                  <div>
                    <label style={{ display:"block", color:"#5c484e", fontSize:"12px", fontWeight:700, marginBottom:"6px" }}>Day Out / End Reading</label>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 48px", gap:"8px" }}>
                      <input type="number" min="0" step="0.1" value={attendanceEndReading} onChange={(e)=>setAttendanceEndReading(e.target.value)} placeholder="Type end reading" style={{...inputStyle,height:"49px"}} />
                      <button type="button" title="Capture end picture" onClick={()=>startAttendanceCamera("end")} style={cameraButtonStyle(attendanceEndPhoto)}><CameraIcon /></button>
                    </div>
                    {attendanceEndPhoto && <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",flexWrap:"wrap",marginTop:"5px"}}><span onClick={()=>setFullScreenImage(attendanceEndPhoto)} style={{color:"#8a253b",fontSize:"10.5px",cursor:"pointer"}}>✓ End picture captured • tap to view</span><button type="button" onClick={()=>startAttendanceCamera("end")} style={{padding:"5px 8px",minHeight:"28px",background:"#ffffff",border:"1px solid #d8c8cd",borderRadius:"7px",color:"#7a0f2b",fontSize:"9.5px",fontWeight:700,cursor:"pointer"}}>↻ Retake</button></div>}
                    {todayAttendance?.startReading !== undefined && attendanceEndReading && Number(attendanceEndReading) >= Number(todayAttendance.startReading) && <div style={{marginTop:"5px",color:"#b75a70",fontSize:"10.5px"}}>Calculated Total KMs: {(Number(attendanceEndReading)-Number(todayAttendance.startReading)).toFixed(1).replace(/\.0$/,"")}</div>}
                  </div>
                  <div style={{ display:"grid", gap:"9px" }}>
                    {[
["Other Expense", attendanceOtherExpense, setAttendanceOtherExpense, "other", attendanceOtherExpensePhoto],
["Transport Expense", attendanceTransportExpense, setAttendanceTransportExpense, "transport", attendanceTransportExpensePhoto],
["Food Expense", attendanceFoodExpense, setAttendanceFoodExpense, "food", attendanceFoodExpensePhoto],
["Night Stay Expense", attendanceNightStayExpense, setAttendanceNightStayExpense, "night", attendanceNightStayExpensePhoto]
].map(([label,value,setter,target,photo]) => (
<div key={target}>
                        <label style={{ display:"block", color:"#5c484e", fontSize:"11px", fontWeight:700, marginBottom:"5px" }}>{label}</label>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 48px", gap:"8px" }}>
                          <input type="number" min="0" step="1" value={value} onChange={(e)=>setter(e.target.value)} placeholder="0" style={{...inputStyle,height:"46px"}} />
                          <button type="button" title={`Capture ${label} picture`} onClick={()=>startAttendanceCamera(target)} style={cameraButtonStyle(photo, 46, 19)}><CameraIcon /></button>
                        </div>
                        {photo && <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"7px",marginTop:"4px"}}><span onClick={()=>setFullScreenImage(photo)} style={{color:"#8a253b",fontSize:"9.5px",cursor:"pointer"}}>✓ Picture attached</span><button type="button" onClick={()=>startAttendanceCamera(target)} style={{padding:"4px 7px",minHeight:"26px",background:"#ffffff",border:"1px solid #d8c8cd",borderRadius:"6px",color:"#7a0f2b",fontSize:"9px",fontWeight:700,cursor:"pointer"}}>↻ Retake</button></div>}
                      </div>
))}
                  </div>
                  <button type="button" disabled={attendanceSubmitting} onClick={submitAttendanceEnd} style={{...btnPrimary,background:"linear-gradient(135deg,#77102a,#941a39)",boxShadow:"0 6px 18px rgba(143,21,50,.20)"}}>{attendanceSubmitting?"Saving...":"Mark End Time"}</button>
                </div>
)}
              {attendanceCameraActive && (
<div style={{ marginTop:"14px", padding:"12px", borderRadius:"12px", border:"1px solid rgba(143,21,50,.22)", background:"rgba(2,6,23,.7)" }}>
                  <div style={{ color:"#8a253b", fontSize:"11px", fontWeight:700, marginBottom:"8px" }}>Camera • {attendanceCameraTarget === "start" ? "Start Time" : attendanceCameraTarget === "end" ? "End Time" : "Expense Proof"}</div>
                  <video ref={attendanceVideoRef} autoPlay playsInline muted style={{ width:"100%", maxHeight:"360px", objectFit:"cover", borderRadius:"10px", background:"#000" }} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginTop:"9px" }}>
                    <button type="button" onClick={captureAttendancePhoto} style={{padding:"10px",background:"#86132f",color:"white",border:"none",borderRadius:"9px",fontWeight:700,cursor:"pointer"}}>📸 Capture</button>
                    <button type="button" onClick={stopAttendanceCamera} style={{padding:"10px",background:"linear-gradient(135deg,#6f0b24,#86132f)",color:"white",border:"none",borderRadius:"9px",fontWeight:700,cursor:"pointer"}}>Cancel</button>
                  </div>
                </div>
)}
            </div>
          </div>);
}
