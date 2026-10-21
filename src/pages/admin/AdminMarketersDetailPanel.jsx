import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import { marketerCityNames } from "../../domain/marketerCities.js";
import MarketerPhotoControl from "../../ui/MarketerPhotoControl.jsx";

export default function AdminMarketersDetailPanel() {
  const { cardStyle, citiesList, downloadMarketersExcel, downloadMarketersPDF, handleEditMarketer, inputStyle, marketerSearch, marketersList, renderExpandedReportChrome, renderMarketerPersonIcon, renderReportExpandButton, reportViewClass, selectedMarketerDetailBox, setAdminView, setFullScreenImage, setMarketerSearch, setMarketersList, setSelectedMarketerDetailBox, setSubordinatePickerOpen } = usePortalContext();
  return (<div className={reportViewClass("marketers-detail")}>
              {renderExpandedReportChrome("marketers-detail")}
              <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                <button 
onClick={() => {
if (selectedMarketerDetailBox) {
setSelectedMarketerDetailBox(null);
} else {
setAdminView("home");
}
}} 
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
>
                  ← Back
                </button>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
onClick={() => {
const visible = selectedMarketerDetailBox
? marketersList.filter((m) => m.id === selectedMarketerDetailBox)
: marketersList.filter((m) => {
const q = marketerSearch.toLowerCase();
return (m.name && m.name.toLowerCase().includes(q)) || (m.email && m.email.toLowerCase().includes(q));
});
const selected = visible[0];
const safeName = String(selected?.name || "All_Marketers").replace(/[^a-z0-9_-]+/gi, "_");
downloadMarketersExcel(visible, selectedMarketerDetailBox ? `${safeName}_Marketer_Details.xlsx` : "All_Marketers_Details.xlsx", citiesList);
}}
style={{ padding: "6px 12px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                    📥 Excel
                  </button>
                  <button
onClick={() => {
const visible = selectedMarketerDetailBox
? marketersList.filter((m) => m.id === selectedMarketerDetailBox)
: marketersList.filter((m) => {
const q = marketerSearch.toLowerCase();
return (m.name && m.name.toLowerCase().includes(q)) || (m.email && m.email.toLowerCase().includes(q));
});
const selected = visible[0];
const safeName = String(selected?.name || "All_Marketers").replace(/[^a-z0-9_-]+/gi, "_");
downloadMarketersPDF(visible, selectedMarketerDetailBox ? `${safeName}_Marketer_Details` : "All_Marketers_Details", citiesList);
}}
style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                    📄 PDF
                  </button>
                  {renderReportExpandButton("marketers-detail", "Expand marketer details")}
                </div>
              </div>
              <div style={cardStyle}>
                {!selectedMarketerDetailBox ? (
<>
                    <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "12px" }}><span style={{display:"inline-flex",verticalAlign:"middle",marginRight:"7px"}}>{renderMarketerPersonIcon(20, true)}</span>Active Marketers Details</h3>
                    <input 
type="text" 
placeholder="🔍 Search marketer by name or email..." 
value={marketerSearch} 
onChange={(e) => setMarketerSearch(e.target.value)} 
style={{ ...inputStyle, marginBottom: "16px", fontSize: "14px", padding: "12px 14px" }}
/>
                    {marketersList
.filter(m => (m.name && m.name.toLowerCase().includes(marketerSearch.toLowerCase())) || (m.email && m.email.toLowerCase().includes(marketerSearch.toLowerCase())))
.length === 0 ? (
<p style={{ color: "#78686d", fontSize: "14px" }}>No marketers found.</p>
) : (
<div className="marketer-detail-grid">
                          {marketersList
.filter(m => (m.name && m.name.toLowerCase().includes(marketerSearch.toLowerCase())) || (m.email && m.email.toLowerCase().includes(marketerSearch.toLowerCase())))
.map((m) => (
<button type="button"
key={m.id} 
onClick={() => setSelectedMarketerDetailBox(m.id)}
className="marketer-detail-card"
>
                                <strong><span aria-hidden="true">{renderMarketerPersonIcon(15)}</span>{m.name || "Unnamed"}</strong>
                                <small>{m.email}</small>
                                <span className="marketer-detail-card-action">View Details →</span>
                              </button>
))}
                        </div>
)}
                  </>
) : (
(() => {
const m = marketersList.find(item => item.id === selectedMarketerDetailBox);
if (!m) return <p style={{ color: "#78686d" }}>Marketer details not found.</p>;
return <div className="marketer-profile">
  <div className="marketer-profile-main">
    <aside className="marketer-profile-side">
      <MarketerPhotoControl marketer={m} setMarketersList={setMarketersList} onExpand={setFullScreenImage} />
      <h2>{m.name || "Unnamed Marketer"}</h2><p>{m.designation || "Regional Manager"}</p><span className="marketer-profile-status">● Active</span>
    </aside>
    <div className="marketer-profile-content">
      <div className="marketer-profile-heading"><h3>👤 Personal Information</h3><button type="button" onClick={() => handleEditMarketer(m)}>✎ Edit Details</button></div>
      <div className="marketer-profile-fields">
        <div className="marketer-profile-field"><span>👤</span><div><small>Name</small><strong>{m.name || "N/A"}</strong></div></div>
        <div className="marketer-profile-field"><span>📞</span><div><small>Phone</small><strong>{m.phone || "N/A"}</strong></div></div>
        <div className="marketer-profile-field"><span>✉️</span><div><small>Email</small><strong>{m.email || "N/A"}</strong></div></div>
        <div className="marketer-profile-field"><span>📍</span><div><small>City</small><strong>{marketerCityNames(m, citiesList)}</strong></div></div>
        <div className="marketer-profile-field"><span>💼</span><div><small>Designation</small><strong>{m.designation || "Regional Manager"}</strong></div></div>
      </div>
      <div className="marketer-profile-metrics"><div><span>⛽</span><div><small>Assigned KMs / Litre</small><strong>{m.assignedKms ?? "—"}</strong></div></div><div><span>👥</span><div><small>Account Marketers</small><strong>{(m.subordinateMarketerIds || []).length}</strong></div></div></div>
    </div>
  </div>
  <section className="marketer-profile-team"><div className="marketer-profile-team-heading"><h3>👥 Marketers under this account</h3><button type="button" onClick={() => { handleEditMarketer(m); setSubordinatePickerOpen(true); }}>+ Add Marketer</button></div>
    {(m.subordinateMarketerIds || []).length ? <div className="marketer-profile-members">{m.subordinateMarketerIds.map((id) => marketersList.find((item) => item.id === id)).filter(Boolean).map((member) => <span key={member.id}>{renderMarketerPersonIcon(15)} {member.name || member.email}</span>)}</div> : <div className="marketer-profile-empty"><span aria-hidden="true">👥</span><strong>No marketers assigned under this account.</strong><small>You can add a marketer to manage attendance pictures.</small></div>}
  </section>
</div>;
})()
)}
              </div>
            </div>);
}
