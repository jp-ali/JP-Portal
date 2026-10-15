import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function AdminAttendanceMediaPanel() {
  const { attendanceMediaFromDate, attendanceMediaMarketer, attendanceMediaToDate, cardStyle, deleteSelectedAttendanceMedia, fetchAttendanceRecords, fetchDeletedMedia, formatActionPlanDate, getFilteredAttendanceMedia, inputStyle, renderExpandedReportChrome, renderMarketerPersonIcon, renderReportExpandButton, reportViewClass, selectedAttendanceMediaIds, setAdminView, setAttendanceMediaFromDate, setAttendanceMediaMarketer, setAttendanceMediaToDate, setFullScreenImage, setMediaView, setSelectedAttendanceMediaIds, softDeleteAttendanceMedia } = usePortalContext();
  return (<div className={reportViewClass("attendance-media")}>
              {renderExpandedReportChrome("attendance-media")}
              <div className="report-normal-toolbar" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"14px" }}>
                <button type="button" onClick={() => { setAdminView("attendance"); setAttendanceMediaMarketer(null); setSelectedAttendanceMediaIds([]); fetchAttendanceRecords(); }} style={{ padding:"8px 14px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"white", border:"none", borderRadius:"9px", fontWeight:700, cursor:"pointer", fontSize:"12px" }}>← Attendance</button>
                <div style={{ display:"flex", gap:"7px", flexWrap:"wrap" }}>
                  <button type="button" onClick={() => { setAdminView("media"); setMediaView("deleted"); fetchDeletedMedia(); }} style={{ padding:"8px 10px", background:"#a42243", color:"white", border:"none", borderRadius:"8px", fontWeight:700, cursor:"pointer", fontSize:"11px" }}>♻️ Recently Deleted</button>
                  {attendanceMediaMarketer && <button type="button" disabled={!selectedAttendanceMediaIds.length} onClick={deleteSelectedAttendanceMedia} style={{ padding:"8px 10px", background:selectedAttendanceMediaIds.length?"#ef4444":"#756369", color:"white", border:"none", borderRadius:"8px", fontWeight:700, cursor:selectedAttendanceMediaIds.length?"pointer":"not-allowed", fontSize:"11px", opacity:selectedAttendanceMediaIds.length?1:.65 }}>🗑 Delete Selected</button>}
                  {renderReportExpandButton("attendance-media", "Expand attendance media")}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{ marginBottom:"12px" }}>
                  <h3 style={{ margin:0, color:"#9a2844", fontSize:"18px" }}>🖼️ Attendance Media</h3>
                  <p style={{ margin:"5px 0 0", color:"#78686d", fontSize:"11px" }}>{attendanceMediaMarketer ? "Select and manage this marketer's attendance pictures." : "Select a marketer to view attendance pictures."}</p>
                </div>
                <div className="attendance-media-range" style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr) 40px", gap:"6px", alignItems:"end", marginBottom:"14px" }}>
                  <div><label style={{fontSize:"9.5px",color:"#78686d",display:"block",marginBottom:"3px"}}>From Date</label><input type="date" lang="en-GB" value={attendanceMediaFromDate} onChange={(e)=>{setAttendanceMediaFromDate(e.target.value);setSelectedAttendanceMediaIds([]);}} style={{...inputStyle,height:"38px",padding:"6px 7px",fontSize:"10.5px"}} /></div>
                  <div><label style={{fontSize:"9.5px",color:"#78686d",display:"block",marginBottom:"3px"}}>To Date</label><input type="date" lang="en-GB" value={attendanceMediaToDate} onChange={(e)=>{setAttendanceMediaToDate(e.target.value);setSelectedAttendanceMediaIds([]);}} style={{...inputStyle,height:"38px",padding:"6px 7px",fontSize:"10.5px"}} /></div>
                  <button className="white-refresh-btn" type="button" title="Refresh" onClick={()=>{setSelectedAttendanceMediaIds([]);fetchAttendanceRecords();}} style={{height:"38px",width:"40px",padding:0,border:"1px solid rgba(143,21,50,.28)",borderRadius:"9px",background:"#ffffff",color:"#7a0f2b",fontSize:"18px",fontWeight:800,cursor:"pointer"}}>↻</button>
                </div>
                {(() => {
const allRangeItems = getFilteredAttendanceMedia();
const personKeyOf = (item) => String(item.marketerId || item.marketerEmail || item.marketerName || "Unknown");
const peopleMap = new Map();
allRangeItems.forEach((item) => {
const key = personKeyOf(item);
if (!peopleMap.has(key)) peopleMap.set(key, { key, name:item.marketerName || item.marketerEmail || "Marketer", email:item.marketerEmail || "", area:item.areaName || "", items:[] });
peopleMap.get(key).items.push(item);
});
const people = [...peopleMap.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
if (!attendanceMediaMarketer) {
return people.length ? (
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"14px"}}>
                        {people.map((person) => (
<div key={person.key} onClick={()=>{setAttendanceMediaMarketer(person.key);setSelectedAttendanceMediaIds([]);}} style={{padding:"18px",borderRadius:"14px",background:"linear-gradient(135deg,rgba(236,72,153,.18),rgba(255,255,255,.98))",border:"1px solid rgba(236,72,153,.35)",cursor:"pointer",boxShadow:"0 8px 20px rgba(0,0,0,.14)"}}>
                            <div style={{marginBottom:"8px"}}>{renderMarketerPersonIcon(30)}</div>
                            <div style={{fontWeight:800,color:"#3b2329",fontSize:"13px",marginBottom:"4px"}}>{person.name}</div>
                            {person.area && <div style={{fontSize:"10px",color:"#5c484e",marginBottom:"7px"}}>{person.area}</div>}
                            <div style={{fontSize:"11px",color:"#c78595",fontWeight:700}}>{person.items.length} picture(s) →</div>
                          </div>
))}
                      </div>
) : <div style={{padding:"22px",textAlign:"center",color:"#78686d",border:"1px dashed rgba(236,72,153,.25)",borderRadius:"12px"}}>No attendance pictures found in this date range.</div>;
}
const selectedPerson = peopleMap.get(String(attendanceMediaMarketer));
const personItems = selectedPerson?.items || [];
const allSelected = personItems.length > 0 && personItems.every((item)=>selectedAttendanceMediaIds.includes(item.id));
const dates = new Map();
personItems.forEach((item)=>{
const d=item.date || "Unknown Date";
if(!dates.has(d)) dates.set(d,[]);
dates.get(d).push(item);
});
const orderedDates=[...dates.entries()].sort((a,b)=>String(b[0]).localeCompare(String(a[0])));
return (
<>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px",flexWrap:"wrap",marginBottom:"12px"}}>
                        <button type="button" onClick={()=>{setAttendanceMediaMarketer(null);setSelectedAttendanceMediaIds([]);}} style={{padding:"7px 12px",background:"linear-gradient(135deg,#6f0b24,#86132f)",color:"white",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:700,fontSize:"11px"}}>← All Marketers</button>
                        <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                          <span style={{fontSize:"11px",color:"#5c484e",fontWeight:700}}>{selectedPerson?.name || "Marketer"} • {personItems.length} picture(s)</span>
                          <button type="button" onClick={()=>setSelectedAttendanceMediaIds(allSelected?[]:personItems.map(i=>i.id))} style={{padding:"6px 9px",background:"#a42243",color:"white",border:"none",borderRadius:"7px",fontSize:"10px",fontWeight:700,cursor:"pointer"}}>{allSelected?"☑ Clear All":"☑ Select All"}</button>
                        </div>
                      </div>
                      {!orderedDates.length ? <div style={{padding:"20px",textAlign:"center",color:"#78686d",background:"rgba(255,255,255,.94)",borderRadius:"10px"}}>No pictures found for this marketer in the selected date range.</div> : orderedDates.map(([date, items]) => (
<div key={date} style={{marginBottom:"18px"}}>
                          <div style={{padding:"8px 10px",marginBottom:"9px",borderRadius:"8px",background:"rgba(236,72,153,.14)",border:"1px solid rgba(236,72,153,.30)",color:"#fbcfe8",fontWeight:800,fontSize:"12px"}}>📅 {date === "Unknown Date" ? date : formatActionPlanDate(date)}</div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:"10px"}}>
                            {items.map((item)=>(
<div key={item.id} style={{background:"rgba(255,255,255,.97)",border:selectedAttendanceMediaIds.includes(item.id)?"1px solid #f472b6":"1px solid rgba(236,72,153,.25)",borderRadius:"12px",padding:"9px"}}>
                                <img src={item.image} alt={item.label} onClick={()=>setFullScreenImage(item.image)} style={{width:"100%",height:"145px",objectFit:"cover",borderRadius:"8px",cursor:"pointer",display:"block"}} />
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"5px",marginTop:"7px"}}>
                                  <label style={{fontSize:"10px",color:"#5c484e",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"}}><input type="checkbox" checked={selectedAttendanceMediaIds.includes(item.id)} onChange={(e)=>setSelectedAttendanceMediaIds((prev)=>e.target.checked?[...prev,item.id]:prev.filter((id)=>id!==item.id))}/><span>{item.label}</span></label>
                                  {item.amount!==null && <span style={{fontSize:"9.5px",color:"#c78595",fontWeight:700}}>Rs. {item.amount}</span>}
                                </div>
                                <button type="button" onClick={()=>softDeleteAttendanceMedia(item)} style={{width:"100%",marginTop:"6px",padding:"5px 7px",background:"#ef4444",color:"white",border:"none",borderRadius:"6px",fontSize:"10px",fontWeight:700,cursor:"pointer"}}>🗑️ Delete</button>
                              </div>
))}
                          </div>
                        </div>
))}
                    </>
);
})()}
              </div>
            </div>);
}
