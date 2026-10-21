import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import MediaOverview from "../../ui/MediaOverview.jsx";

export default function AdminMediaPanel() {
  const { activeMedia, bulkDeleteMedia, cardStyle, db, deleteDoc, deletedMedia, doc, fetchDeletedMedia, formatActionPlanDate, getMarketerName, marketersList, mediaMarketer, mediaView, permanentlyDeleteAllMedia, permanentlyDeleteMedia, renderExpandedReportChrome, renderMarketerPersonIcon, renderReportExpandButton, reportViewClass, restoreMedia, restoreSelectedMedia, selectedDeletedMediaIds, selectedMediaIds, setAdminView, setFullScreenImage, setFullScreenMediaRecord, setMediaMarketer, setMediaView, setSelectedDeletedMediaIds, setSelectedMediaIds, softDeleteMedia } = usePortalContext();
  const mediaPeople = [...new Set([...marketersList.map((marketer) => marketer.email).filter(Boolean), ...activeMedia.map((item) => item.marketerEmail).filter(Boolean)])].map((email) => {
    const marketer = marketersList.find((item) => item.email === email);
    return { key: email, name: marketer?.name || email, email, area: marketer?.cityName || marketer?.areaName || "", items: activeMedia.filter((item) => item.marketerEmail === email) };
  });
  return (<div className={reportViewClass("media")}>
              {renderExpandedReportChrome("media")}
              <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => { setAdminView("home"); setMediaMarketer(null); }} style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back</button>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => setMediaView("active")} style={{ padding: "8px 12px", background: mediaView === "active" ? "#8c1733" : "#5e4b50", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>🖼️ Active Media</button>
                  <button onClick={() => { setMediaView("deleted"); fetchDeletedMedia(); setMediaMarketer(null); setSelectedDeletedMediaIds([]); }} style={{ padding: "8px 12px", background: mediaView === "deleted" ? "#77102a" : "#5e4b50", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>♻️ Recently Deleted ({deletedMedia.length})</button>
                  {mediaView === "active" && <button onClick={() => bulkDeleteMedia(activeMedia)} style={{ padding: "8px 12px", background: "#7a0f2b", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>🗑️ Delete All Media</button>}
                  {mediaView === "deleted" && <button onClick={permanentlyDeleteAllMedia} style={{ padding: "8px 12px", background: "#7a0f2b", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>🗑️ Empty Recently Deleted</button>}
                  {renderReportExpandButton("media", "Expand media manager")}
                </div>
              </div>
              <div style={cardStyle}>
                {mediaView === "active" ? (
!mediaMarketer ? (
<>
                      <h3 className="media-panel-intro" style={{ marginTop: 0, color: "#8b1731", fontSize: "18px" }}>🖼️ Marketers' Visit Pictures</h3>
                      <p className="media-panel-intro" style={{ color: "#78686d", fontSize: "13px" }}>Open a marketer to see all pictures uploaded in their visits.</p>
                      <MediaOverview people={mediaPeople} onOpen={(person) => { setMediaMarketer(person.key); setSelectedMediaIds([]); }} />
                      <div className="media-overview-legacy" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "12px" }}>
                        {[...new Set([...marketersList.map(m => m.email), ...activeMedia.map(r => r.marketerEmail).filter(Boolean)])].map(email => {
const m = marketersList.find(x => x.email === email);
const count = activeMedia.filter(r => r.marketerEmail === email).length;
return <div key={email} onClick={() => { setMediaMarketer(email); setSelectedMediaIds([]); }} style={{ padding: "18px", borderRadius: "14px", background: "linear-gradient(135deg,rgba(236,72,153,.18),rgba(255,255,255,.98))", border: "1px solid rgba(236,72,153,.35)", cursor: "pointer" }}>
                            <div>{renderMarketerPersonIcon(31)}</div><h4 style={{ margin: "8px 0 4px", color: "#3b2329" }}>{m?.name || email}</h4><p style={{ margin: 0, color: "#8b1731", fontSize: "12px" }}>{count} picture(s)</p>
                          </div>;
})}
                      </div>
                    </>
) : (
<>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px", flexWrap: "wrap" }}>
                        <button onClick={() => { setMediaMarketer(null); setSelectedMediaIds([]); }} style={{ padding: "7px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>← All Marketers</button>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button onClick={() => { const ids=activeMedia.filter(r=>r.marketerEmail===mediaMarketer).map(r=>r.id); setSelectedMediaIds(selectedMediaIds.length===ids.length ? [] : ids); }} style={{ padding: "7px 11px", background: "#a42243", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>{activeMedia.filter(r=>r.marketerEmail===mediaMarketer).length > 0 && selectedMediaIds.length === activeMedia.filter(r=>r.marketerEmail===mediaMarketer).length ? "☑ Clear All" : "☑ Select All"}</button>
                          <button onClick={() => bulkDeleteMedia(activeMedia.filter(r=>r.marketerEmail===mediaMarketer && selectedMediaIds.includes(r.id)))} style={{ padding: "7px 11px", background: "#7a0f2b", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>🗑️ Delete Selected</button>
                        </div>
                      </div>
                      <h3 style={{ color: "#8b1731", marginTop: 0 }}>📸 {marketersList.find(m=>m.email===mediaMarketer)?.name || mediaMarketer}</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "14px" }}>
                        {activeMedia.filter(r=>r.marketerEmail===mediaMarketer).map(r => <div key={r.id} style={{ background:"rgba(255,255,255,.97)", border:"1px solid rgba(236,72,153,.25)", borderRadius:"12px", padding:"9px" }}>
                          <img src={r.image} alt="Visit media" onClick={()=>{setFullScreenImage(r.image);setFullScreenMediaRecord({type:"active",record:r});}} style={{ width:"100%", height:"150px", objectFit:"cover", borderRadius:"8px", cursor:"pointer" }} />
                          <div style={{ display:"flex", justifyContent:"space-between", gap:"5px", marginTop:"7px" }}><label style={{fontSize:"11px",color:"#5c484e"}}><input type="checkbox" checked={selectedMediaIds.includes(r.id)} onChange={e=>setSelectedMediaIds(e.target.checked?[...selectedMediaIds,r.id]:selectedMediaIds.filter(x=>x!==r.id))}/> Select</label><button onClick={()=>softDeleteMedia(r)} style={{background:"#7a0f2b",color:"white",border:"none",borderRadius:"6px",padding:"5px 8px",cursor:"pointer",fontSize:"11px"}}>🗑️ Delete</button></div>
                          <p style={{fontSize:"11px",color:"#78686d",margin:"6px 0 0"}}>{r.schoolName || "Visit"}</p>
                        </div>)}
                      </div>
                    </>
)
) : (
<>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                      <h3 style={{ marginTop: 0, color: "#9a2844", fontSize: "18px" }}>♻️ Recently Deleted Pictures</h3>
                      <div style={{ display:"flex", gap:"7px", flexWrap:"wrap", marginBottom:"10px" }}>
                        <button onClick={()=>setSelectedDeletedMediaIds(selectedDeletedMediaIds.length===deletedMedia.length ? [] : deletedMedia.map(x=>x.id))} style={{padding:"6px 10px",background:"#a42243",color:"white",border:"none",borderRadius:"7px",fontSize:"11px",fontWeight:"700",cursor:"pointer"}}>{deletedMedia.length>0 && selectedDeletedMediaIds.length===deletedMedia.length ? "☑ Clear All" : "☑ Select All"}</button>
                        <button onClick={restoreSelectedMedia} disabled={!selectedDeletedMediaIds.length} style={{padding:"6px 10px",background:selectedDeletedMediaIds.length?"#86132f":"#d7c7cb",color:"white",border:"none",borderRadius:"7px",fontSize:"11px",fontWeight:"700",cursor:selectedDeletedMediaIds.length?"pointer":"not-allowed",opacity:selectedDeletedMediaIds.length?1:.7}}>♻️ Restore Selected</button>
                        <button onClick={async()=>{if(!selectedDeletedMediaIds.length)return;if(!window.confirm(`Permanently delete ${selectedDeletedMediaIds.length} picture(s)?`))return;for(const id of selectedDeletedMediaIds)await deleteDoc(doc(db,"deleted_media",id));setSelectedDeletedMediaIds([]);await fetchDeletedMedia();}} style={{padding:"6px 10px",background:"#7a0f2b",color:"white",border:"none",borderRadius:"7px",fontSize:"11px",fontWeight:"700",cursor:"pointer"}}>🗑️ Delete Selected</button>
                      </div>
                    </div>
                    <div style={{ border: "2px solid rgba(245,158,11,.35)", borderRadius: "16px", padding: "16px", background: "linear-gradient(135deg,rgba(120,53,15,.16),rgba(255,255,255,.97))", boxShadow: "0 10px 30px rgba(0,0,0,.16)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "14px" }}>
                      {deletedMedia.map(item => <div key={item.id} style={{background:"rgba(255,255,255,.97)",border:"1px solid rgba(245,158,11,.3)",borderRadius:"12px",padding:"9px"}}>
                        <img src={item.image} alt="Deleted media" onClick={()=>{setFullScreenImage(item.image);setFullScreenMediaRecord({type:"deleted",record:item});}} style={{width:"100%",height:"150px",objectFit:"cover",borderRadius:"8px",cursor:"pointer",opacity:.9}}/>
                        <label style={{fontSize:"10px",color:"#5c484e"}}><input type="checkbox" checked={selectedDeletedMediaIds.includes(item.id)} onChange={e=>setSelectedDeletedMediaIds(e.target.checked?[...selectedDeletedMediaIds,item.id]:selectedDeletedMediaIds.filter(x=>x!==item.id))}/> Select</label>
                        <p style={{fontSize:"11px",color:"#5c484e",margin:"6px 0"}}>{getMarketerName(item.marketerEmail, item.marketerName || "N/A")}<br/>{item.mediaType === "attendance" ? `${item.attendanceLabel || "Attendance"}${item.date ? ` • ${formatActionPlanDate(item.date)}` : ""}` : item.schoolName}</p>
                        <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}><a href={item.image} download="restored-picture.jpg" style={{padding:"5px 7px",background:"#a42243",color:"white",borderRadius:"6px",textDecoration:"none",fontSize:"10px"}}>📥 Download</a><button onClick={()=>restoreMedia(item)} style={{padding:"5px 7px",background:"#86132f",color:"white",border:"none",borderRadius:"6px",cursor:"pointer",fontSize:"10px"}}>♻️ Restore</button><button onClick={()=>permanentlyDeleteMedia(item)} style={{padding:"5px 7px",background:"#7a0f2b",color:"white",border:"none",borderRadius:"6px",cursor:"pointer",fontSize:"10px"}}>🗑️ Delete</button></div>
                      </div>)}
                    </div>
                    </div>
                    {!deletedMedia.length && <p style={{color:"#78686d"}}>Recently Deleted is empty.</p>}
                  </>
)}
              </div>
            </div>);
}
