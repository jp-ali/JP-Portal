import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function AdminDeleteMarketerPanel() {
  const { cardStyle, deleteSearch, handleDeleteMarketer, inputStyle, marketersList, setAdminView, setDeleteSearch } = usePortalContext();
  return (<div>
              <button onClick={() => setAdminView("home")} style={{ marginBottom: "14px", padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back to Menu</button>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "12px" }}>🗑 Delete Active Marketer</h3>
                <input 
type="text" 
placeholder="🔍 Search marketer to delete..." 
value={deleteSearch} 
onChange={(e) => setDeleteSearch(e.target.value)} 
style={{ ...inputStyle, marginBottom: "14px", fontSize: "14px", padding: "12px 14px" }}
/>
                {marketersList
.filter(m => (m.name && m.name.toLowerCase().includes(deleteSearch.toLowerCase())) || (m.email && m.email.toLowerCase().includes(deleteSearch.toLowerCase())))
.length === 0 ? (
<p style={{ color: "#78686d", fontSize: "14px" }}>No marketers found.</p>
) : (
marketersList
.filter(m => (m.name && m.name.toLowerCase().includes(deleteSearch.toLowerCase())) || (m.email && m.email.toLowerCase().includes(deleteSearch.toLowerCase())))
.map((m) => (
<div key={m.id} style={{ border: "1px solid rgba(123,16,43,.14)", padding: "14px", marginBottom: "10px", borderRadius: "12px", background: "rgba(255,255,255,0.92)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ margin: "2px 0", color: "#3b2329", fontWeight: "bold" }}>{m.name}</p>
                            <p style={{ margin: "2px 0", color: "#5c484e", fontSize: "12px" }}>{m.email}</p>
                          </div>
                          <button onClick={() => handleDeleteMarketer(m)} style={{ padding: "8px 14px", background: "#7a0f2b", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                        </div>
))
)}
              </div>
            </div>);
}
