import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function AdminOldMarketersPanel() {
  const { cardStyle, deletedMarketersList, handlePermanentDeleteMarketer, handleRestoreMarketer, setAdminView } = usePortalContext();
  return (<div>
              <button onClick={() => setAdminView("home")} style={{ marginBottom: "14px", padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back to Menu</button>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "12px" }}>🗄️ Old / Deleted Marketers</h3>
                <p style={{ color: "#78686d", fontSize: "13px", marginBottom: "14px" }}>Here you can restore deleted marketers or delete them permanently.</p>
                {deletedMarketersList.length === 0 ? (
<p style={{ color: "#78686d", fontSize: "14px" }}>Old marketers list is empty.</p>
) : (
deletedMarketersList.map((m) => (
<div key={m.id} style={{ border: "1px solid rgba(123,16,43,.14)", padding: "14px", marginBottom: "10px", borderRadius: "12px", background: "rgba(255,255,255,0.92)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: "2px 0", color: "#3b2329", fontWeight: "bold" }}>{m.name}</p>
                        <p style={{ margin: "2px 0", color: "#5c484e", fontSize: "12px" }}>{m.email}</p>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => handleRestoreMarketer(m)} style={{ padding: "8px 12px", background: "#86132f", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}>Restore</button>
                        <button onClick={() => handlePermanentDeleteMarketer(m)} style={{ padding: "8px 12px", background: "#7a0f2b", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                      </div>
                    </div>
))
)}
              </div>
            </div>);
}
