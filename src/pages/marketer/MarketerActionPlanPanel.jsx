import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function MarketerActionPlanPanel() {
  const { actionPlanAreaText, actionPlanDate, actionPlanPurpose, actionPlanSubmitting, actionPlanSuccess, actionPlanShareMessage, shareActionPlan, btnPrimary, buildActionPlanMessage, cardStyle, handleSendActionPlan, inputStyle, setActionPlanAreaText, setActionPlanDate, setActionPlanPurpose, setMarketerview, user } = usePortalContext();
  return (<div>
            <button onClick={() => setMarketerview("home")} style={{ marginBottom: "14px", padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back to Menu</button>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#8a253b", fontSize: "18px", marginBottom: "6px" }}>🗓️ Daily Action Plan</h3>
              <p style={{ color: "#78686d", fontSize: "12px", marginTop: 0, marginBottom: "16px" }}>Enter today's area and purpose, then send the prepared Action Plan to WhatsApp.</p>
              {actionPlanSuccess && <div style={{ marginBottom: "14px", padding: "10px 12px", borderRadius: "10px", background: "rgba(143,21,50,.10)", border: "1px solid rgba(143,21,50,.22)", color: "#8a253b", fontSize: "12px", lineHeight: 1.55 }}><span>{actionPlanSuccess}</span>{actionPlanShareMessage && <button type="button" onClick={() => shareActionPlan()} style={{ ...btnPrimary, display: "block", width: "100%", marginTop: "9px" }}>Share on WhatsApp</button>}</div>}
              <form onSubmit={handleSendActionPlan} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="action-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#5c484e", marginBottom: "6px" }}>Date</label>
                    <input type="date" lang="en-GB" value={actionPlanDate} onChange={(e) => setActionPlanDate(e.target.value)} required style={{ ...inputStyle, height: "49px" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#5c484e", marginBottom: "6px" }}>Marketer Name</label>
                    <input type="text" value={user?.name || ""} readOnly style={{ ...inputStyle, height: "49px", opacity: .9, cursor: "not-allowed" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#5c484e", marginBottom: "6px" }}>Area</label>
                  <input
type="text"
value={actionPlanAreaText}
onChange={(e) => setActionPlanAreaText(e.target.value)}
placeholder="Type area, e.g. Gulistan Colony"
required
style={{ ...inputStyle, height: "49px" }}
/>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#5c484e", marginBottom: "6px" }}>Purpose</label>
                  <input
type="text"
value={actionPlanPurpose}
onChange={(e) => setActionPlanPurpose(e.target.value)}
placeholder="Type purpose"
required
style={{ ...inputStyle, height: "49px" }}
/>
                </div>
                {actionPlanAreaText.trim() && actionPlanPurpose.trim() && (
<div style={{ padding: "14px", borderRadius: "12px", background: "rgba(2,6,23,.45)", border: "1px solid rgba(123,16,43,.14)" }}>
                    <div style={{ color: "#78686d", fontSize: "10.5px", marginBottom: "7px" }}>Message Preview</div>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#49343a", fontFamily: "inherit", fontSize: "12px", lineHeight: 1.6 }}>{buildActionPlanMessage({
date: actionPlanDate,
areaName: actionPlanAreaText.trim(),
purposeValue: actionPlanPurpose,
marketerNameValue: user?.name || user?.email || "Marketer",
designationValue: user?.designation || "Regional Manager"
})}</pre>
                  </div>
)}
                <button type="submit" disabled={actionPlanSubmitting || !actionPlanAreaText.trim() || !actionPlanPurpose.trim()} style={{ ...btnPrimary, background: actionPlanSubmitting ? "#68575c" : "linear-gradient(135deg, #6f0b24 0%, #86132f 100%)", cursor: actionPlanSubmitting ? "wait" : "pointer" }}>
                  {actionPlanSubmitting ? "Saving..." : "💬 Send to WhatsApp"}
                </button>
              </form>
            </div>
          </div>);
}
