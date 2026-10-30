import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import NumberOrCustomField from "../../ui/NumberOrCustomField.jsx";

export default function MarketerAddVisitPanel() {
  const nativeCameraInputRef = React.useRef(null);
  const { areasList, btnPrimary, cancelEditVisitSchool, capturePhoto, cardStyle, citiesList, editingVisitSchoolId, editingVisitSchoolName, fetchAreasForCity, fetchSchoolsForArea, handleAddVisitSchool, handleSubmitVisit, imageFile, inputStyle, isCameraActive, isOwnManualSchool, isUsableSchoolRecord, loading, newSchoolName, notes, phone, principalName, purpose, readCachedAreasForCity, removeOwnVisitSchool, retakePhoto, saveEditedVisitSchool, schoolsList, selectVisitArea, setEditingVisitSchoolId, setEditingVisitSchoolName, setFullScreenImage, setMarketerview, setNewSchoolName, setNotes, setPhone, setPrincipalName, setPurpose, setSchoolName, setVisitAddSchoolOpen, setVisitAreaId, setVisitAreaPickerOpen, setVisitAreaSearch, setVisitCityId, setVisitCityPickerOpen, setVisitCitySearch, setVisitSchoolIds, setVisitSchoolLoadError, setVisitSchoolManagerOpen, setVisitSchoolPickerOpen, setVisitSchoolSearch, setVisitSchoolsLoading, setVisitSession, startCamera, startEditVisitSchool, stopCamera, successMsg, syncAreasForCityFromOpenStreetMap, toggleVisitSchool, user, videoRef, visitAddSchoolOpen, visitAreaId, visitAreaPickerOpen, visitAreaSearch, visitCityId, visitCityPickerOpen, visitCitySearch, visitSchoolIds, visitSchoolLoadError, visitSchoolManagerOpen, visitSchoolPickerOpen, visitSchoolSearch, visitSchoolsLoading, visitSession, visitBranches, setVisitBranches, visitStrength, setVisitStrength } = usePortalContext();
  const { cameraBusy, cameraIssue, capturePhotoFromFile } = usePortalContext();
  return (<div>
            <button onClick={() => { stopCamera(); setMarketerview("home"); }} style={{ marginBottom: "14px", padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back to Menu</button>
            <div style={cardStyle}>
              {successMsg && <p style={{ color: "#b75a70", fontWeight: "700", textAlign: "center", marginBottom: "14px" }}>{successMsg}</p>}
              <form onSubmit={handleSubmitVisit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ background: "#ffffff", border: "1px solid rgba(122,15,43,.18)", borderRadius: "14px", padding: "14px", boxShadow:"0 8px 22px rgba(89,45,56,.08)" }}>
                  <h4 style={{ margin: "0 0 12px", color: "#7a0f2b", fontSize: "15px" }}>📍 Assigned Visit Location</h4>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#5c484e", marginBottom: "6px" }}>Step 1: Select City</label>
                  <button
type="button"
onClick={() => {
const willOpen = !visitCityPickerOpen;
setVisitCityPickerOpen(willOpen);
setVisitAreaPickerOpen(false);
setVisitSchoolPickerOpen(false);
setVisitAddSchoolOpen(false);
setVisitSchoolManagerOpen(false);
if (willOpen) setVisitCitySearch("");
}}
style={{
...inputStyle,
appearance: "auto",
background: "#fffdfa",
height: "49px",
minHeight: "49px",
paddingTop: 0,
paddingBottom: 0,
display: "flex",
alignItems: "center",
justifyContent: "space-between",
gap: "10px",
textAlign: "left",
cursor: "pointer"
}}
>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: visitCityId ? "#3b2329" : "#5c484e", fontWeight: visitCityId ? 700 : 500 }}>
                      {citiesList.find((c) => c.id === visitCityId)?.name || "Select city"}
                    </span>
                    <span style={{ color: "#78686d", fontSize: "13px", transform: visitCityPickerOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
                  </button>
                  {visitCityPickerOpen && (
<div className="visit-school-picker-panel">
                      <input
autoFocus
type="text"
placeholder="🔍 Search city..."
value={visitCitySearch}
onChange={(e) => setVisitCitySearch(e.target.value)}
style={{ ...inputStyle, padding: "10px 12px", fontSize: "13px", marginBottom: "8px", background: "#ffffff" }}
/>
                      <div className="visit-choice-list">
                        {citiesList.filter((c) => (user?.assignedCityIds || []).includes(c.id) && String(c.name || "").toLowerCase().includes(visitCitySearch.toLowerCase())).length === 0 ? (
<div style={{ color: "#9a2844", fontSize: "12px", padding: "10px" }}>No assigned cities found. Please contact Admin.</div>
) : citiesList
.filter((c) => (user?.assignedCityIds || []).includes(c.id) && String(c.name || "").toLowerCase().includes(visitCitySearch.toLowerCase()))
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
.map((c) => (
<button
key={c.id}
type="button"
onClick={() => {
setVisitCityId(c.id);
setVisitAreaId("");
setVisitSchoolIds([]);
setSchoolName("");
setPrincipalName("");
setPhone("");
setVisitSession("");
setVisitBranches("");
setVisitStrength("");
setVisitCityPickerOpen(false);
setVisitAreaPickerOpen(false);
setVisitAreaSearch("");
setVisitSchoolSearch("");
setNewSchoolName("");
setVisitSchoolPickerOpen(false);
setVisitAddSchoolOpen(false);
setVisitSchoolManagerOpen(false);
setEditingVisitSchoolId("");
setEditingVisitSchoolName("");
setVisitSchoolsLoading(false);
setVisitSchoolLoadError("");
readCachedAreasForCity(c.id);
fetchAreasForCity(c.id).then((rows) => {
if (rows.length === 0) syncAreasForCityFromOpenStreetMap(c, false);
}).catch(() => {});
}}
style={{
width: "100%",
display: "flex",
alignItems: "center",
justifyContent: "space-between",
padding: "10px 11px",
marginBottom: "3px",
borderRadius: "8px",
border: visitCityId === c.id ? "1px solid rgba(143,21,50,.26)" : "1px solid transparent",
background: visitCityId === c.id ? "rgba(143,21,50,.22)" : "transparent",
color: "#3b2329",
cursor: "pointer",
textAlign: "left",
fontSize: "13px",
fontWeight: visitCityId === c.id ? 700 : 500
}}
>
                              <span>{c.name}</span>
                              {visitCityId === c.id && <span style={{ color: "#b75a70" }}>✓</span>}
                            </button>
))}
                      </div>
                    </div>
)}
                  <div style={{ height: "1px", background: "rgba(123,16,43,.14)", margin: "14px 0" }} />
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#5c484e", marginBottom: "6px" }}>Step 2: Select Area</label>
                  <button
type="button"
disabled={!visitCityId}
onClick={() => {
if (!visitCityId) return;
const willOpen = !visitAreaPickerOpen;
setVisitAreaPickerOpen(willOpen);
setVisitCityPickerOpen(false);
setVisitSchoolPickerOpen(false);
setVisitAddSchoolOpen(false);
setVisitSchoolManagerOpen(false);
if (willOpen) setVisitAreaSearch("");
}}
style={{
...inputStyle,
appearance: "auto",
background: "#fffdfa",
height: "49px",
minHeight: "49px",
paddingTop: 0,
paddingBottom: 0,
display: "flex",
alignItems: "center",
justifyContent: "space-between",
gap: "10px",
textAlign: "left",
cursor: visitCityId ? "pointer" : "not-allowed",
opacity: visitCityId ? 1 : .58
}}
>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: visitAreaId ? "#3b2329" : "#5c484e", fontWeight: visitAreaId ? 700 : 500 }}>
                      {!visitCityId ? "Select city first" : (areasList.find((a) => a.id === visitAreaId)?.name || "Select area")}
                    </span>
                    <span style={{ color: "#78686d", fontSize: "13px", transform: visitAreaPickerOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
                  </button>
                  {visitCityId && visitAreaPickerOpen && (
<div className="visit-school-picker-panel">
                      <input
autoFocus
type="text"
placeholder="🔍 Search area..."
value={visitAreaSearch}
onChange={(e) => setVisitAreaSearch(e.target.value)}
style={{ ...inputStyle, padding: "10px 12px", fontSize: "13px", marginBottom: "8px", background: "#ffffff" }}
/>
                      <div className="visit-choice-list">
                        {areasList.filter((a) => a.cityId === visitCityId && (user?.assignedAreaIds || []).includes(a.id) && String(a.name || "").toLowerCase().includes(visitAreaSearch.toLowerCase())).length === 0 ? (
<div style={{ color: "#9a2844", fontSize: "12px", padding: "10px" }}>No assigned areas found for this city.</div>
) : areasList
.filter((a) => a.cityId === visitCityId && (user?.assignedAreaIds || []).includes(a.id) && String(a.name || "").toLowerCase().includes(visitAreaSearch.toLowerCase()))
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
.map((a) => (
<button
key={a.id}
type="button"
onClick={() => selectVisitArea(a)}
style={{
width: "100%",
display: "flex",
alignItems: "center",
justifyContent: "space-between",
padding: "10px 11px",
marginBottom: "3px",
borderRadius: "8px",
border: visitAreaId === a.id ? "1px solid rgba(143,21,50,.26)" : "1px solid transparent",
background: visitAreaId === a.id ? "rgba(143,21,50,.22)" : "transparent",
color: "#3b2329",
cursor: "pointer",
textAlign: "left",
fontSize: "13px",
fontWeight: visitAreaId === a.id ? 700 : 500
}}
>
                              <span>{a.name}</span>
                              {visitAreaId === a.id && <span style={{ color: "#b75a70" }}>✓</span>}
                            </button>
))}
                      </div>
                    </div>
)}
                  <div style={{ height: "1px", background: "rgba(123,16,43,.14)", margin: "14px 0" }} />
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#5c484e", marginBottom: "6px" }}>Step 3: Select School</label>
                  <button
type="button"
disabled={!visitAreaId}
onClick={() => {
if (!visitAreaId) return;
const willOpen = !visitSchoolPickerOpen;
setVisitSchoolPickerOpen(willOpen);
setVisitCityPickerOpen(false);
setVisitAreaPickerOpen(false);
setVisitAddSchoolOpen(false);
setVisitSchoolManagerOpen(false);
setEditingVisitSchoolId("");
setEditingVisitSchoolName("");
if (willOpen) {
setVisitSchoolSearch("");
const hasLoadedAreaSchools = schoolsList.some((sc) =>
sc.areaId === visitAreaId && sc.cityId === visitCityId && isUsableSchoolRecord(sc)
);
if (!hasLoadedAreaSchools && !visitSchoolsLoading) {
setVisitSchoolsLoading(true);
setVisitSchoolLoadError("");
fetchSchoolsForArea(visitAreaId, visitCityId)
.then((rows) => {
if (!rows.length) setVisitSchoolLoadError("No schools found in this area.");
})
.catch(() => setVisitSchoolLoadError("Schools could not be loaded. You can add a school below."))
.finally(() => setVisitSchoolsLoading(false));
}
}
}}
style={{
...inputStyle,
minHeight: "49px",
padding: "11px 13px",
display: "flex",
alignItems: "center",
justifyContent: "space-between",
gap: "10px",
textAlign: "left",
cursor: visitAreaId ? "pointer" : "not-allowed",
opacity: visitAreaId ? 1 : .58,
background: visitSchoolIds[0] ? "#fff1f4" : "#fffdfa",
borderColor: "rgba(143,21,50,.30)"
}}
>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: visitSchoolIds[0] ? "#7a0f2b" : "#5c484e", fontWeight: visitSchoolIds[0] ? 700 : 500 }}>
                      {!visitAreaId
? "Select area first"
: visitSchoolsLoading && !visitSchoolIds[0]
? "Loading schools..."
: (schoolsList.find((sc) => sc.id === visitSchoolIds[0])?.name || "Select school")}
                    </span>
                    <span style={{ color: "#b96e80", fontSize: "14px", transform: visitSchoolPickerOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
                  </button>
                  {visitAreaId && visitSchoolPickerOpen && (
<div className="visit-school-picker-panel">
                      <input
autoFocus
type="text"
placeholder="🔍 Search school..."
value={visitSchoolSearch}
onChange={(e) => setVisitSchoolSearch(e.target.value)}
style={{ ...inputStyle, padding: "10px 12px", fontSize: "13px", marginBottom: "8px", background: "#ffffff" }}
/>
                      <div className="visit-choice-list" style={{ maxHeight: "220px" }}>
                        {visitSchoolsLoading && schoolsList.filter((sc) => sc.areaId === visitAreaId && sc.cityId === visitCityId && isUsableSchoolRecord(sc)).length === 0 ? (
<div style={{ color: "#b75a70", fontSize: "12px", padding: "10px" }}>Loading schools...</div>
) : schoolsList
.filter((sc) => sc.areaId === visitAreaId && sc.cityId === visitCityId && isUsableSchoolRecord(sc) && String(sc.name || "").toLowerCase().includes(visitSchoolSearch.toLowerCase()))
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
.length === 0 ? (
<div style={{ color: "#78686d", fontSize: "12px", padding: "10px" }}>
                              {visitSchoolLoadError || (visitSchoolSearch ? "No matching school found." : "No schools found in this area. Use + Add School below.")}
                            </div>
) : schoolsList
.filter((sc) => sc.areaId === visitAreaId && sc.cityId === visitCityId && isUsableSchoolRecord(sc) && String(sc.name || "").toLowerCase().includes(visitSchoolSearch.toLowerCase()))
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
.map((sc) => (
<label key={sc.id} style={{ display: "flex", gap: "9px", alignItems: "center", padding: "9px", cursor: "pointer", borderRadius: "8px", background: visitSchoolIds[0] === sc.id ? "#fff1f4" : "transparent", border: visitSchoolIds[0] === sc.id ? "1px solid rgba(143,21,50,.25)" : "1px solid transparent" }}>
                                <input type="radio" name="visitSchool" checked={visitSchoolIds[0] === sc.id} onChange={() => toggleVisitSchool(sc.id)} />
                                <span style={{ color: "#3b2329", fontSize: "13px", fontWeight: visitSchoolIds[0] === sc.id ? 700 : 500 }}>{sc.name}</span>
                              </label>
))}
                      </div>
                    </div>
)}
                  {visitAreaId && (
<>
                      <div className="visit-school-actions">
                        <button
type="button"
onClick={() => {
setVisitAddSchoolOpen((prev) => !prev);
setVisitSchoolPickerOpen(false);
setVisitSchoolManagerOpen(false);
setEditingVisitSchoolId("");
setEditingVisitSchoolName("");
if (visitAddSchoolOpen) setNewSchoolName("");
}}
style={{ padding: "7px 11px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "#ffffff", border: "1px solid rgba(143,21,50,.22)", borderRadius: "8px", fontWeight: 800, fontSize: "11.5px", cursor: "pointer", boxShadow: "0 5px 14px rgba(30,64,175,.22)" }}
>
                          ＋ Add School
                        </button>
                        <button
type="button"
onClick={() => {
setVisitSchoolManagerOpen((prev) => !prev);
setVisitSchoolPickerOpen(false);
setVisitAddSchoolOpen(false);
setNewSchoolName("");
setEditingVisitSchoolId("");
setEditingVisitSchoolName("");
}}
style={{ padding: "7px 11px", background: "linear-gradient(135deg,#741027,#77102a)", color: "#ffffff", border: "1px solid rgba(143,21,50,.20)", borderRadius: "8px", fontWeight: 800, fontSize: "11.5px", cursor: "pointer", boxShadow: "0 5px 14px rgba(30,58,138,.22)" }}
>
                          ✏️ Edit School
                        </button>
                      </div>
                      {visitAddSchoolOpen && (
<div className="visit-school-add-panel">
                          <div style={{ color: "#7a0f2b", fontSize: "12px", fontWeight: 800, marginBottom: "8px" }}>Add a school in the selected area</div>
                          <div className="visit-school-add-row">
                            <input
autoFocus
type="text"
placeholder="Enter school name"
value={newSchoolName}
onChange={(e) => setNewSchoolName(e.target.value)}
onKeyDown={(e) => {
if (e.key === "Enter") {
e.preventDefault();
handleAddVisitSchool();
}
}}
style={{ ...inputStyle, padding: "10px 12px", fontSize: "13px" }}
/>
                            <button type="button" onClick={handleAddVisitSchool} style={{ padding: "10px 14px", background: "#059669", color: "white", border: 0, borderRadius: "9px", fontWeight: 800, cursor: "pointer" }}>Add</button>
                            <button type="button" onClick={() => { setVisitAddSchoolOpen(false); setNewSchoolName(""); }} style={{ padding: "10px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "1px solid rgba(123,16,43,.20)", borderRadius: "9px", fontWeight: 800, cursor: "pointer" }}>Cancel</button>
                          </div>
                        </div>
)}
                      {visitSchoolManagerOpen && (
<div style={{ marginTop: "10px", padding: "12px", borderRadius: "12px", border: "1px solid rgba(124,58,237,.35)", background: "rgba(30,41,59,.92)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                            <div>
                              <div style={{ color: "#e9d5ff", fontWeight: 800, fontSize: "13px" }}>Your Added Schools</div>
                              <div style={{ color: "#78686d", fontSize: "11px", marginTop: "2px" }}>Only schools added by you in this area can be renamed or removed.</div>
                            </div>
                            <button type="button" onClick={() => { setVisitSchoolManagerOpen(false); cancelEditVisitSchool(); }} style={{ background: "transparent", color: "#5c484e", border: "1px solid rgba(123,16,43,.20)", borderRadius: "7px", padding: "5px 8px", cursor: "pointer" }}>✕</button>
                          </div>
                          {schoolsList.filter(isOwnManualSchool).length === 0 ? (
<div style={{ color: "#78686d", fontSize: "12px", padding: "8px 2px" }}>You have not added any school in this area yet.</div>
) : (
<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {schoolsList.filter(isOwnManualSchool).sort((a,b) => String(a.name || "").localeCompare(String(b.name || ""))).map((sc) => (
<div key={sc.id} style={{ padding: "9px", borderRadius: "9px", background: "rgba(255,255,255,.96)", border: "1px solid rgba(255,255,255,.07)" }}>
                                  {editingVisitSchoolId === sc.id ? (
<div style={{ display: "flex", gap: "7px", flexWrap: "wrap", alignItems: "center" }}>
                                      <input type="text" value={editingVisitSchoolName} onChange={(e) => setEditingVisitSchoolName(e.target.value)} style={{ ...inputStyle, padding: "9px 10px", fontSize: "12px", flex: "1 1 180px" }} />
                                      <button type="button" onClick={() => saveEditedVisitSchool(sc)} style={{ padding: "8px 10px", background: "#16a34a", color: "white", border: 0, borderRadius: "7px", fontWeight: 700, cursor: "pointer" }}>Save</button>
                                      <button type="button" onClick={cancelEditVisitSchool} style={{ padding: "8px 10px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: 0, borderRadius: "7px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                                    </div>
) : (
<div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                                      <span style={{ color: "#3b2329", fontSize: "12px", fontWeight: 600 }}>{sc.name}</span>
                                      <div style={{ display: "flex", gap: "6px" }}>
                                        <button type="button" onClick={() => startEditVisitSchool(sc)} style={{ padding: "7px 9px", background: "#941a39", color: "white", border: 0, borderRadius: "7px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Edit spelling</button>
                                        <button type="button" onClick={() => removeOwnVisitSchool(sc)} style={{ padding: "7px 9px", background: "#7a0f2b", color: "white", border: 0, borderRadius: "7px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Remove</button>
                                      </div>
                                    </div>
)}
                                </div>
))}
                            </div>
)}
                        </div>
)}
                    </>
)}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Principal Name</label>
                  <input type="text" placeholder="Enter principal name" value={principalName} onChange={(e) => setPrincipalName(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Phone Number</label>
                  <input type="tel" placeholder="Contact number" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Purpose of Visit</label>
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value)} required style={{ ...inputStyle, appearance: "auto", background: "#fffdfa", height: "49px", minHeight: "49px", paddingTop: 0, paddingBottom: 0 }}>
                    <option value="" disabled>Select purpose</option>
                    <option value="FirstVisit">FirstVisit</option>
                    <option value="Sampling">Sampling</option>
                    <option value="FollowUp">FollowUp</option>
                    <option value="Sample Return">Sample Return</option>
                    <option value="Final Visit">Final Visit</option>
                    <option value="PR Packages">PR Packages</option>
                    <option value="After Sale Services">After Sale Services</option>
                    <option value="Training">Training</option>
                    <option value="Courtesy Visit">Courtesy Visit</option>
                    <option value="Books Delivery">Books Delivery</option>
                    <option value="Recovery">Recovery</option>
                    <option value="Complimentary Visit">Complimentary Visit</option>
                    <option value="Books Return">Books Return</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Session</label>
                  <select value={visitSession} onChange={(e) => setVisitSession(e.target.value)} required style={{ ...inputStyle, appearance: "auto", background: "#fffdfa", height: "49px", minHeight: "49px", paddingTop: 0, paddingBottom: 0 }}>
                    <option value="" disabled>Select session month</option>
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                  </select>
                </div>
                <NumberOrCustomField label="Branches" value={visitBranches} onChange={setVisitBranches} values={Array.from({ length: 10 }, (_, index) => String(index + 1))} inputStyle={inputStyle} resetKey={successMsg} required />
                <NumberOrCustomField label="Strength" value={visitStrength} onChange={setVisitStrength} values={Array.from({ length: 10 }, (_, index) => String((index + 1) * 100))} inputStyle={inputStyle} resetKey={successMsg} required />
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Visit Notes / Remarks</label>
                  <textarea placeholder="Write visit summary or remarks..." value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" style={{ ...inputStyle, fontFamily: "inherit" }} />
                </div>
                <div style={{ background: "rgba(255,255,255,0.96)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(143,21,50,.24)", textAlign: "center" }}>
                  <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", fontSize: "14px", color: "#3b2329" }}>📷 School Photo (Detailed Address, Date, Day & Time Stamped):</label>
                  {!isCameraActive && !imageFile && !cameraIssue && (
<button 
type="button"
onClick={startCamera}
style={{ 
padding: "12px 20px", 
background: "linear-gradient(135deg, #8f1532 0%, #941a39 100%)", 
color: "white", 
border: "none",
borderRadius: "10px", 
fontWeight: "600", 
cursor: "pointer",
boxShadow: "0 4px 12px rgba(143,21,50,.22)",
fontSize: "15px",
width: "100%"
}}
>
                      📸 Open Camera & Take Photo
                    </button>
)}
                  {isCameraActive && (
<div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
                      <video 
ref={videoRef} 
autoPlay 
playsInline 
muted
style={{ width: "100%", maxHeight: "280px", borderRadius: "10px", background: "#000", objectFit: "cover" }} 
/>
                      <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                        <button 
type="button" 
onClick={capturePhoto}
disabled={cameraBusy}
style={{ flex: 1, padding: "10px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: cameraBusy ? "wait" : "pointer", opacity: cameraBusy ? .6 : 1 }}
>
                          {cameraBusy ? "Opening camera..." : "🟢 Capture Snap"}
                        </button>
                        <button 
type="button" 
onClick={stopCamera}
style={{ flex: 1, padding: "10px", background: "#86132f", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
>
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
)}
                  {cameraIssue && !imageFile && (
                    <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                      <p role="status" style={{ margin: 0, color: "#86132f", fontSize: "13px" }}>{cameraIssue}</p>
                      <button type="button" onClick={startCamera} disabled={cameraBusy} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #86132f", background: "white", color: "#86132f", fontWeight: 700 }}>Retry preview</button>
                      <button type="button" onClick={() => nativeCameraInputRef.current?.click()} disabled={cameraBusy} style={{ padding: "10px", borderRadius: "8px", border: 0, background: "#15803d", color: "white", fontWeight: 700 }}>Use phone camera</button>
                      <input ref={nativeCameraInputRef} type="file" accept="image/*" capture="environment" onChange={capturePhotoFromFile} style={{ display: "none" }} aria-label="Take school photo with phone camera" />
                    </div>
                  )}
                  {imageFile && !isCameraActive && (
<div style={{ marginTop: "4px" }}>
                      <p style={{ color: "#b75a70", fontSize: "13px", fontWeight: "600", margin: "0 0 10px 0" }}>✅ Photo captured & stamped successfully!</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
                        <img 
src={imageFile} 
alt="Preview" 
onClick={() => setFullScreenImage(imageFile)}
style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "10px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.15)" }} 
/>
                        <button 
type="button"
onClick={retakePhoto}
style={{ padding: "10px 20px", background: "linear-gradient(135deg, #941a39 0%, #86132f 100%)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 12px rgba(143,21,50,.30)", width: "100%" }}
>
                          🔄 Retake Photo
                        </button>
                      </div>
                    </div>
)}
                </div>
                <button type="submit" disabled={loading} style={{ ...btnPrimary, background: "linear-gradient(135deg, #8f1532 0%, #941a39 100%)", boxShadow: "0 6px 20px rgba(143,21,50,.28)", marginTop: "4px" }}>
                  {loading ? "Submitting Report..." : "Submit Visit Report"}
                </button>
              </form>
            </div>
          </div>);
}
