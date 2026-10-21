import { usePortalContext } from "../../context/PortalContext.jsx";
import React, { useState } from "react";

export default function AdminAddMarketerPanel() {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const generatePassword = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const random = new Uint32Array(16);
    crypto.getRandomValues(random);
    setMarketerPass(Array.from(random, (value) => alphabet[value % alphabet.length]).join(""));
    setShowPassword(true);
    setPasswordCopied(false);
  };
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(marketerPass);
      setPasswordCopied(true);
    } catch {
      alert("Copy is unavailable here. Show the password and copy it from the field before saving.");
    }
  };
  const { adminAreaAssignOpen, adminAreaSearch, adminCityAssignOpen, adminCitySearch, areaSyncMessage, areaSyncingCityId, areasList, assignedAreaIds, assignedCityIds, assignmentCityFocusId, btnPrimary, cardStyle, citiesList, editingId, editingReturnToMarketerDetails, fetchAreasForCity, handleAddArea, handleAddCity, handleSaveMarketer, inputStyle, marketerAssignedKms, marketerDesignation, marketerEmail, marketerName, marketerPass, marketerPhone, marketersList, newAreaName, newCityName, readCachedAreasForCity, renderMarketerPersonIcon, resetMarketerAssignmentForm, setAdminAreaAssignOpen, setAdminAreaSearch, setAdminCityAssignOpen, setAdminCitySearch, setAdminSchoolSearch, setAdminView, setAssignmentAreaFocusId, setAssignmentCityFocusId, setEditingId, setEditingReturnToMarketerDetails, setMarketerAssignedKms, setMarketerDesignation, setMarketerEmail, setMarketerName, setMarketerPass, setMarketerPhone, setMarketerWhatsappGroupLink, setMarketerWhatsappGroupName, setNewAreaName, setNewCityName, setSubordinateMarketerIds, setSubordinatePickerOpen, setSubordinateSearch, subordinateMarketerIds, subordinatePickerOpen, subordinateSearch, syncAreasForCityFromOpenStreetMap, toggleAreaAssignment, toggleCityAssignment } = usePortalContext();
  return (<div>
              <button onClick={() => setAdminView("home")} style={{ marginBottom: "14px", padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back to Menu</button>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "14px" }}>
                  {editingId ? "✏ Edit Marketer Details" : "➕ Create New Marketer"}
                </h3>
                <form onSubmit={handleSaveMarketer} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <input type="text" placeholder="Full Name" value={marketerName} onChange={(e) => setMarketerName(e.target.value)} required style={inputStyle} />
                  <input type="tel" placeholder="Phone Number" value={marketerPhone} onChange={(e) => setMarketerPhone(e.target.value)} required style={inputStyle} />
                  <div style={{ display:"flex", gap:"8px", alignItems:"stretch", flexWrap:"wrap" }}>
                    <input type="text" placeholder="Designation" value={marketerDesignation} onChange={(e) => setMarketerDesignation(e.target.value)} required style={{ ...inputStyle, flex:"1 1 230px" }} />
                    <button
type="button"
onClick={() => { setSubordinatePickerOpen((v) => !v); setSubordinateSearch(""); }}
style={{ flex:"0 0 auto", minWidth:"132px", padding:"10px 13px", background:"#ffffff", color:"#7a0f2b", border:"1px solid rgba(122,15,43,.28)", borderRadius:"10px", fontWeight:800, cursor:"pointer", boxShadow:"0 4px 12px rgba(122,15,43,.08)" }}
>
                      {subordinatePickerOpen ? "Close Team" : "+ Add Marketer"}
                    </button>
                  </div>
                  {subordinatePickerOpen && (
<div style={{ padding:"12px", border:"1px solid rgba(122,15,43,.18)", borderRadius:"12px", background:"#fff", boxShadow:"0 8px 22px rgba(122,15,43,.08)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", gap:"10px", alignItems:"center", marginBottom:"9px", flexWrap:"wrap" }}>
                        <div>
                          <div style={{ color:"#6f0b24", fontWeight:900, fontSize:"13px" }}>Marketers under this account</div>
                          <div style={{ color:"#78686d", fontSize:"10.5px", marginTop:"2px" }}>Select the marketers whose visit history this account can view.</div>
                        </div>
                        <span style={{ padding:"4px 8px", borderRadius:"999px", background:"#f8e9ed", color:"#7a0f2b", fontSize:"10px", fontWeight:800 }}>{subordinateMarketerIds.length} selected</span>
                      </div>
                      <input type="text" value={subordinateSearch} onChange={(e)=>setSubordinateSearch(e.target.value)} placeholder="Search marketer..." style={{ ...inputStyle, padding:"9px 11px", fontSize:"12px", marginBottom:"8px", background:"#fff" }} />
                      <div style={{ maxHeight:"190px", overflowY:"auto", border:"1px solid #eadde0", borderRadius:"9px", padding:"5px", background:"#fff" }}>
                        {marketersList.filter((m)=>m.id !== editingId && `${m.name || ""} ${m.email || ""}`.toLowerCase().includes(subordinateSearch.toLowerCase())).length === 0 ? (
<div style={{ padding:"10px", color:"#78686d", fontSize:"11px" }}>No marketers available.</div>
) : marketersList
.filter((m)=>m.id !== editingId && `${m.name || ""} ${m.email || ""}`.toLowerCase().includes(subordinateSearch.toLowerCase()))
.sort((a,b)=>String(a.name || a.email || "").localeCompare(String(b.name || b.email || "")))
.map((m)=>(
<label key={m.id} style={{ display:"flex", alignItems:"center", gap:"9px", padding:"8px", borderRadius:"8px", cursor:"pointer", background:subordinateMarketerIds.includes(m.id)?"#f9ecef":"#fff", border:subordinateMarketerIds.includes(m.id)?"1px solid rgba(122,15,43,.16)":"1px solid transparent" }}>
                              <input type="checkbox" checked={subordinateMarketerIds.includes(m.id)} onChange={()=>setSubordinateMarketerIds((prev)=>prev.includes(m.id)?prev.filter((id)=>id!==m.id):[...prev,m.id])} />
                              <span style={{ display:"inline-flex", color:"#8f1532" }}>{renderMarketerPersonIcon(16)}</span>
                              <span style={{ minWidth:0 }}>
                                <strong style={{ display:"block", color:"#3b2329", fontSize:"12px" }}>{m.name || "Unnamed"}</strong>
                                <span style={{ display:"block", color:"#78686d", fontSize:"10px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.email || "N/A"}</span>
                              </span>
                            </label>
))}
                      </div>
                    </div>
)}
                  <input type="number" min="0.1" step="0.1" placeholder="Assigned KMs per Litre (e.g. 12)" value={marketerAssignedKms} onChange={(e) => setMarketerAssignedKms(e.target.value)} required style={inputStyle} />
                  <input type="email" placeholder="Email ID" value={marketerEmail} onChange={(e) => setMarketerEmail(e.target.value)} required style={inputStyle} />
                  <div style={{ position:"relative" }}>
                    <input type={showPassword ? "text" : "password"} placeholder={editingId ? "New password (leave blank to keep current)" : "Password (at least 8 characters)"} value={marketerPass} onChange={(e) => { setMarketerPass(e.target.value); setPasswordCopied(false); }} required={!editingId} minLength={8} autoComplete="new-password" style={{ ...inputStyle, width:"100%", paddingRight:"68px" }} />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} style={{ position:"absolute", right:"9px", top:"50%", transform:"translateY(-50%)", border:0, color:"#7a0f2b", background:"transparent", fontSize:"12px", fontWeight:800, cursor:"pointer" }}>{showPassword ? "Hide" : "Show"}</button>
                  </div>
                  {editingId && <div style={{ marginTop:"-8px" }}>
                    <small style={{ display:"block", color:"#78686d", marginBottom:"8px" }}>Current password cannot be shown because it is securely hashed. Leave blank to keep it, or set a new one and share it with the marketer after saving.</small>
                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                      <button type="button" onClick={generatePassword} style={{ padding:"7px 10px", border:"1px solid #7a0f2b", borderRadius:"8px", background:"#fff7f9", color:"#7a0f2b", fontSize:"11px", fontWeight:800, cursor:"pointer" }}>Generate New Password</button>
                      {marketerPass && <button type="button" onClick={copyPassword} style={{ padding:"7px 10px", border:"1px solid #ddcbd0", borderRadius:"8px", background:"#fff", color:"#7a0f2b", fontSize:"11px", fontWeight:800, cursor:"pointer" }}>{passwordCopied ? "Copied" : "Copy Password"}</button>}
                    </div>
                  </div>}
                  <div className="city-area-assignment-box" style={{ background: "rgba(255,255,255,.96)", border: "1px solid rgba(16,185,129,.28)", borderRadius: "14px", padding: "14px" }}>
                    <h4 style={{ margin: "0 0 10px", color: "#8a253b", fontSize: "15px" }}>📍 City & Area Assignment</h4>
                    <p style={{ margin: "0 0 12px", color: "#78686d", fontSize: "12px" }}>Assign only the cities and areas this marketer is allowed to visit. Schools are selected or added by the marketer during Add Visit.</p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ color: "#78686d", fontSize: "11px" }}>
                        Fast city list: <strong style={{ color: "#49343a" }}>{citiesList.length}</strong> cities. Missing city can be added below.
                      </span>
                    </div>
                    <button
className="city-area-toggle"
type="button"
onClick={() => setAdminCityAssignOpen((v) => !v)}
style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(143,21,50,.25)", background: "#741027", color: "#6d3e49", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: 800, marginBottom: "8px" }}
>
                      <span>1. Assign City</span>
                      <span style={{ fontSize: "11px", color: "#b75a70" }}>{assignedCityIds.length} selected {adminCityAssignOpen ? "▲" : "▼"}</span>
                    </button>
                    {adminCityAssignOpen && (
<div style={{ marginBottom: "12px", padding: "10px", border: "1px solid rgba(143,21,50,.15)", borderRadius: "10px", background: "rgba(255,255,255,.93)" }}>
                        <input type="text" placeholder="🔍 Search city..." value={adminCitySearch} onChange={(e) => setAdminCitySearch(e.target.value)} style={{ ...inputStyle, padding: "10px 12px", fontSize: "13px", marginBottom: "8px" }} />
                        <div style={{ maxHeight: "190px", overflowY: "auto", border: "1px solid rgba(123,16,43,.14)", borderRadius: "10px", padding: "6px", background: "rgba(247,242,243,.92)" }}>
                          {citiesList.filter(c => String(c.name || "").toLowerCase().includes(adminCitySearch.toLowerCase())).length === 0 ? (
<div style={{ color: "#78686d", fontSize: "12px", padding: "10px" }}>No cities found. Add the missing city below.</div>
) : citiesList
.filter(c => String(c.name || "").toLowerCase().includes(adminCitySearch.toLowerCase()))
.map(c => (
<label key={c.id} style={{ display: "flex", gap: "9px", alignItems: "center", padding: "8px", cursor: "pointer", borderRadius: "8px", background: assignedCityIds.includes(c.id) ? "rgba(143,21,50,.15)" : "transparent" }}>
                                <input type="checkbox" checked={assignedCityIds.includes(c.id)} onChange={() => toggleCityAssignment(c.id)} />
                                <span style={{ fontSize: "13px", color: "#3b2329" }}>{c.name}</span>
                              </label>
))}
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "9px", flexWrap: "wrap" }}>
                          <input type="text" placeholder="Add missing city" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} style={{ ...inputStyle, padding: "10px 12px", fontSize: "13px", flex: "1 1 190px" }} />
                          <button type="button" onClick={handleAddCity} style={{ padding: "10px 14px", background: "#86132f", color: "white", border: "none", borderRadius: "9px", fontWeight: 700, cursor: "pointer" }}>+ Add City</button>
                        </div>
                        {assignedCityIds.length > 0 && (
<div style={{ marginTop: "9px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {assignedCityIds.map(id => citiesList.find(c => c.id === id)).filter(Boolean).map(c => <span key={c.id} style={{ padding: "5px 8px", borderRadius: "999px", background: "rgba(143,21,50,.12)", color: "#8a253b", fontSize: "11px" }}>{c.name}</span>)}
                          </div>
)}
                      </div>
)}
                    <button
className="city-area-toggle"
type="button"
disabled={assignedCityIds.length === 0}
onClick={() => assignedCityIds.length > 0 && setAdminAreaAssignOpen((v) => !v)}
style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(143,21,50,.25)", background: assignedCityIds.length ? "#741027" : "#1e293b", color: assignedCityIds.length ? "#6d3e49" : "#756369", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: assignedCityIds.length ? "pointer" : "not-allowed", fontWeight: 800 }}
>
                      <span>2. Assign Area</span>
                      <span style={{ fontSize: "11px", color: assignedCityIds.length ? "#b75a70" : "#756369" }}>{assignedAreaIds.length} selected {adminAreaAssignOpen ? "▲" : "▼"}</span>
                    </button>
                    {adminAreaAssignOpen && assignedCityIds.length > 0 && (
<div style={{ marginTop: "8px", padding: "10px", border: "1px solid rgba(143,21,50,.15)", borderRadius: "10px", background: "rgba(255,255,255,.93)" }}>
                        <select value={assignmentCityFocusId} onChange={(e) => { const cityId = e.target.value; setAssignmentCityFocusId(cityId); const firstArea = assignedAreaIds.find(id => areasList.find(a => a.id === id)?.cityId === cityId) || ""; setAssignmentAreaFocusId(firstArea); setAdminAreaSearch(""); setAdminSchoolSearch(""); if (cityId) { const city = citiesList.find(c => c.id === cityId); readCachedAreasForCity(cityId); fetchAreasForCity(cityId).then((rows) => { if (city && (!rows.length || Number(city.areaCatalogVersion || 0) < 8)) syncAreasForCityFromOpenStreetMap(city, false); }).catch(() => {}); } }} style={{ ...inputStyle, background: "#fffdfa", appearance: "auto", padding: "10px 12px", marginBottom: "8px" }}>
                          <option value="">Select city to manage its areas</option>
                          {assignedCityIds.map(id => citiesList.find(c => c.id === id)).filter(Boolean).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {assignmentCityFocusId ? (
<>
                            <input type="text" placeholder="🔍 Search area..." value={adminAreaSearch} onChange={(e) => setAdminAreaSearch(e.target.value)} style={{ ...inputStyle, padding: "10px 12px", fontSize: "13px", marginBottom: "8px" }} />
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <span style={{ color: "#78686d", fontSize: "11px" }}>A-Z areas saved for this city: <strong style={{ color: "#49343a" }}>{areasList.filter(a => a.cityId === assignmentCityFocusId).length}</strong></span>
                              <button className="white-refresh-btn" type="button" disabled={areaSyncingCityId === assignmentCityFocusId} onClick={() => { const city = citiesList.find(c => c.id === assignmentCityFocusId); if (city) syncAreasForCityFromOpenStreetMap(city, true); }} style={{ padding: "7px 10px", background: areaSyncingCityId === assignmentCityFocusId ? "#68575c" : "#86132f", color: "white", border: "none", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: areaSyncingCityId === assignmentCityFocusId ? "wait" : "pointer" }}>
                                {areaSyncingCityId === assignmentCityFocusId ? "Loading Areas..." : "↻ Refresh Areas"}
                              </button>
                            </div>
                            {areaSyncMessage && <div style={{ marginBottom: "8px", color: areaSyncMessage.includes("could not") ? "#fca5a5" : "#b75a70", fontSize: "11px", lineHeight: 1.5 }}>{areaSyncMessage}</div>}
                            <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid rgba(123,16,43,.14)", borderRadius: "10px", padding: "6px", background: "rgba(247,242,243,.92)" }}>
                              {areasList.filter(a => a.cityId === assignmentCityFocusId && String(a.name || "").toLowerCase().includes(adminAreaSearch.toLowerCase())).length === 0 ? (
<div style={{ color: "#78686d", fontSize: "12px", padding: "10px" }}>{areaSyncingCityId === assignmentCityFocusId ? "Loading areas..." : "No saved areas found for this city."}</div>
) : areasList.filter(a => a.cityId === assignmentCityFocusId && String(a.name || "").toLowerCase().includes(adminAreaSearch.toLowerCase())).map(a => (
<label key={a.id} style={{ display: "flex", gap: "9px", alignItems: "center", padding: "8px", cursor: "pointer", borderRadius: "8px", background: assignedAreaIds.includes(a.id) ? "rgba(143,21,50,.15)" : "transparent" }}>
                                  <input type="checkbox" checked={assignedAreaIds.includes(a.id)} onChange={() => toggleAreaAssignment(a.id)} />
                                  <span style={{ fontSize: "13px", color: "#3b2329" }}>{a.name}</span>
                                </label>
))}
                            </div>
                            <div style={{ display: "flex", gap: "8px", marginTop: "9px", flexWrap: "wrap" }}>
                              <input type="text" placeholder="Add missing area" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} style={{ ...inputStyle, padding: "10px 12px", fontSize: "13px", flex: "1 1 190px" }} />
                              <button type="button" onClick={handleAddArea} style={{ padding: "10px 14px", background: "#86132f", color: "white", border: "none", borderRadius: "9px", fontWeight: 700, cursor: "pointer" }}>+ Add Area</button>
                            </div>
                          </>
) : <div style={{ color: "#78686d", fontSize: "12px" }}>Choose one of the assigned cities to see its areas.</div>}
                      </div>
)}
                    <div style={{ marginTop: "12px", color: "#5c484e", fontSize: "11px", lineHeight: 1.6 }}>
                      Assigned: <strong>{assignedCityIds.length}</strong> city/cities · <strong>{assignedAreaIds.length}</strong> area(s)
                    </div>
                  </div>
                  <button type="submit" style={{ ...btnPrimary, background: editingId ? "#8f1532" : "#86132f", boxShadow: editingId ? "0 4px 12px rgba(143,21,50,.22)" : "0 4px 12px rgba(143,21,50,.25)" }}>
                    {editingId ? "Update Marketer" : "Create Account"}
                  </button>
                  {editingId && (
<button type="button" onClick={() => { const returnToDetails = editingReturnToMarketerDetails; setEditingId(null); setEditingReturnToMarketerDetails(false); setMarketerName(""); setMarketerPhone(""); setMarketerEmail(""); setMarketerPass(""); setMarketerDesignation(""); setMarketerAssignedKms(""); setSubordinateMarketerIds([]); setSubordinatePickerOpen(false); setSubordinateSearch(""); setMarketerWhatsappGroupName(""); setMarketerWhatsappGroupLink(""); resetMarketerAssignmentForm(); setAdminView(returnToDetails ? "marketers-detail" : "home"); }} style={{ padding: "10px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}>
                      Cancel
                    </button>
)}
                </form>
              </div>
            </div>);
}
