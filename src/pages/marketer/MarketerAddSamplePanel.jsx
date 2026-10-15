import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function MarketerAddSamplePanel() {
  const { btnPrimary, cardStyle, handleSubmitSample, inputStyle, sampleDetailsText, sampleLoading, samplePhone, samplePrincipalName, sampleSchoolName, sampleSuccessMsg, setMarketerview, setSampleDetailsText, setSamplePhone, setSamplePrincipalName, setSampleSchoolName } = usePortalContext();
  return (<div>
            <button onClick={() => setMarketerview("home")} style={{ marginBottom: "14px", padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}>← Back to Menu</button>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, color: "#77102a", fontSize: "18px", marginBottom: "14px" }}>📦 Add Sample Details</h3>
              {sampleSuccessMsg && <p style={{ color: "#b75a70", fontWeight: "700", textAlign: "center", marginBottom: "14px" }}>{sampleSuccessMsg}</p>}
              <form onSubmit={handleSubmitSample} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>School Name</label>
                  <input type="text" placeholder="Enter school name" value={sampleSchoolName} onChange={(e) => setSampleSchoolName(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Principal Name</label>
                  <input type="text" placeholder="Enter principal name" value={samplePrincipalName} onChange={(e) => setSamplePrincipalName(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Phone Number</label>
                  <input type="tel" placeholder="Contact number" value={samplePhone} onChange={(e) => setSamplePhone(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Sample Details</label>
                  <textarea placeholder="Enter sample books or items details..." value={sampleDetailsText} onChange={(e) => setSampleDetailsText(e.target.value)} rows="3" required style={{ ...inputStyle, fontFamily: "inherit" }} />
                </div>
                <button type="submit" disabled={sampleLoading} style={{ ...btnPrimary, background: "linear-gradient(135deg, #77102a 0%, #86132f 100%)", boxShadow: "0 6px 20px rgba(143,21,50,.26)", marginTop: "4px" }}>
                  {sampleLoading ? "Submitting Sample..." : "Submit Sample Details"}
                </button>
              </form>
            </div>
          </div>);
}
