import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function AdminMarketersDetailPanel() {
  const { cardStyle, downloadMarketersExcel, downloadMarketersPDF, handleEditMarketer, inputStyle, marketerSearch, marketersList, renderExpandedReportChrome, renderMarketerPersonIcon, renderReportExpandButton, reportViewClass, selectedMarketerDetailBox, setAdminView, setMarketerSearch, setSelectedMarketerDetailBox, setSubordinatePickerOpen } = usePortalContext();
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
downloadMarketersExcel(visible, selectedMarketerDetailBox ? `${safeName}_Marketer_Details.xlsx` : "All_Marketers_Details.xlsx");
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
downloadMarketersPDF(visible, selectedMarketerDetailBox ? `${safeName}_Marketer_Details` : "All_Marketers_Details");
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
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
                          {marketersList
.filter(m => (m.name && m.name.toLowerCase().includes(marketerSearch.toLowerCase())) || (m.email && m.email.toLowerCase().includes(marketerSearch.toLowerCase())))
.map((m) => (
<div 
key={m.id} 
onClick={() => setSelectedMarketerDetailBox(m.id)}
style={{ 
background: "rgba(255,255,255,0.96)", 
border: "1px solid rgba(99, 102, 241, 0.4)", 
borderRadius: "14px", 
padding: "18px", 
cursor: "pointer",
transition: "transform 0.2s, background 0.2s"
}}
>
                                <h4 style={{ margin: "0 0 6px 0", color: "#b76a7b", fontSize: "16px" }}><span style={{display:"inline-flex",verticalAlign:"middle",marginRight:"6px"}}>{renderMarketerPersonIcon(18)}</span>{m.name || "Unnamed"}</h4>
                                <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#78686d" }}>{m.email}</p>
                                <span style={{ fontSize: "13px", color: "#5c484e" }}>Click to view details →</span>
                              </div>
))}
                        </div>
)}
                  </>
) : (
(() => {
const m = marketersList.find(item => item.id === selectedMarketerDetailBox);
if (!m) return <p style={{ color: "#78686d" }}>Marketer details not found.</p>;
return (
<div>
                        <h3 style={{ marginTop: 0, color: "#b76a7b", fontSize: "18px", marginBottom: "14px" }}><span style={{display:"inline-flex",verticalAlign:"middle",marginRight:"7px"}}>{renderMarketerPersonIcon(20)}</span>Marketer Details: {m.name}</h3>
                        <div style={{ border: "1px solid rgba(123,16,43,.14)", padding: "18px", borderRadius: "12px", background: "rgba(255,255,255,0.94)" }}>
                          <p style={{ margin: "6px 0", color: "#3b2329" }}><strong>Name:</strong> {m.name}</p>
                          <p style={{ margin: "6px 0", color: "#5c484e" }}><strong>Phone:</strong> {m.phone || "N/A"}</p>
                          <p style={{ margin: "6px 0", color: "#5c484e" }}><strong>Email:</strong> {m.email || "N/A"}</p>
                          <div style={{ margin:"6px 0", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", flexWrap:"wrap" }}>
                            <p style={{ margin:0, color:"#5c484e" }}><strong>Designation:</strong> {m.designation || "Regional Manager"}</p>
                            <button type="button" onClick={async()=>{ await handleEditMarketer(m); setSubordinatePickerOpen(true); }} style={{ padding:"6px 9px", background:"#fff", color:"#7a0f2b", border:"1px solid #ddcbd0", borderRadius:"8px", fontSize:"10.5px", fontWeight:800, cursor:"pointer" }}>+ Add Marketer</button>
                          </div>
                          <div style={{ margin:"10px 0", padding:"10px 12px", border:"1px solid #eadde0", borderRadius:"10px", background:"#fffafa" }}>
                            <div style={{ color:"#6f0b24", fontSize:"11px", fontWeight:900, marginBottom:"6px" }}>Marketers under this account</div>
                            {(Array.isArray(m.subordinateMarketerIds) ? m.subordinateMarketerIds : []).length === 0 ? (
<div style={{ color:"#78686d", fontSize:"11px" }}>No marketer assigned under this account.</div>
) : (
<div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                                {(m.subordinateMarketerIds || []).map((id) => marketersList.find((x) => x.id === id)).filter(Boolean).map((member) => (
<span key={member.id} style={{ display:"inline-flex", alignItems:"center", gap:"5px", padding:"5px 8px", borderRadius:"999px", background:"#f8e9ed", border:"1px solid #ecd4da", color:"#7a0f2b", fontSize:"10.5px", fontWeight:800 }}>
                                    {renderMarketerPersonIcon(13)} {member.name || member.email}
                                  </span>
))}
                              </div>
)}
                          </div>
                          <p style={{ margin: "6px 0", color: "#5c484e" }}><strong>Assigned KMs / Litre:</strong> {m.assignedKms || "Not assigned"}</p>
                          <div style={{ marginTop: "18px" }}>
                            <button 
onClick={() => handleEditMarketer(m)} 
style={{ padding: "10px 18px", background: "#8f1532", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
>
                              ✏️ Edit Details
                            </button>
                          </div>
                        </div>
                      </div>
);
})()
)}
              </div>
            </div>);
}
