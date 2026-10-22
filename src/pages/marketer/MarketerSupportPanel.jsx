import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import MarketerCardPanel from "./MarketerCardPanel.jsx";

export default function MarketerSupportPanel() {
  const { cardStyle, setMarketerview, user } = usePortalContext();
  return (<div>
            <button onClick={() => setMarketerview("home")} style={{ marginBottom: "14px", padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back to Menu</button>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "18px", marginBottom: "6px" }}>🎧 Customer Support / Help Center</h3>
              <p style={{ color: "#78686d", fontSize: "13px", marginBottom: "20px" }}>You can contact for assistance using any of the options below:</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px" }}>
                <a href="tel:+923068482000" style={{ display: "flex", alignItems: "center", gap: "16px", background: "rgba(255,255,255,0.96)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(127,16,43,.24)", textDecoration: "none", color: "#3b2329" }}>
                  <div style={{ fontSize: "28px", background: "#8c1733", padding: "10px 14px", borderRadius: "10px" }}>📞</div>
                  <div><h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>Direct Call</h4><p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Call admin directly on SIM</p></div>
                </a>
                <a 
href={`sms:+923068482000?body=${encodeURIComponent(`Assalam u Alaikum! ${user?.name || "Marketer"} here`)}`} 
style={{ display: "flex", alignItems: "center", gap: "16px", background: "rgba(255,255,255,0.96)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(127,16,43,.24)", textDecoration: "none", color: "#3b2329" }}
>
                  <div style={{ fontSize: "28px", background: "#8c1733", padding: "10px 14px", borderRadius: "10px" }}>💬</div>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>Send SMS Message</h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Open inbox with automated greeting text</p>
                  </div>
                </a>
                <a 
href="https://wa.me/923068482000" target="_blank" rel="noopener noreferrer"
style={{ display: "flex", alignItems: "center", gap: "16px", background: "rgba(255,255,255,0.96)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(16, 185, 129, 0.3)", textDecoration: "none", color: "#3b2329" }}
>
                  <div style={{ fontSize: "28px", background: "#86132f", padding: "10px 14px", borderRadius: "10px" }}>📲</div>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>WhatsApp Call</h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Start a WhatsApp voice call with admin</p>
                  </div>
                </a>
                <a 
href={`https://wa.me/923068482000?text=${encodeURIComponent(`Assalam u Alaikum! ${user?.name || "Marketer"} here`)}`} 
target="_blank" 
rel="noopener noreferrer" 
style={{ display: "flex", alignItems: "center", gap: "16px", background: "rgba(255,255,255,0.96)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(34, 197, 94, 0.3)", textDecoration: "none", color: "#3b2329" }}
>
                  <div style={{ fontSize: "28px", background: "#941a39", padding: "10px 14px", borderRadius: "10px" }}>💬</div>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>WhatsApp Message</h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "#78686d" }}>Chat on WhatsApp with automated greeting</p>
                  </div>
                </a>
              </div>
              <div style={{ marginTop: "20px" }}><MarketerCardPanel endpoint="/cards/admin-card" title="Admin Card" embedded /></div>
            </div>
          </div>);
}
