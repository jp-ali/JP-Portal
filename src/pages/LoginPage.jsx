import React, { useEffect } from "react";

export default function LoginPage({ context }) {
  const { btnPrimary, cardStyle, containerStyle, error, footerStyle, globalStyle, handleLogin, identifier, inputStyle, password, preloadPortal, renderBackgroundStationary, renderResponsiveStyles, setIdentifier, setPassword, setShowPassword, showPassword } = context;
  useEffect(() => { preloadPortal().catch(() => {}); }, [preloadPortal]);

return (
<div style={globalStyle}>
        {renderResponsiveStyles()}
        {renderBackgroundStationary()}
        <style>{`
          input:focus { border-color: #8c1733 !important; box-shadow: 0 0 0 3px rgba(127,16,43,.20); }
          button:hover { transform: translateY(-2px); }
          button:active { transform: translateY(0); }
        `}</style>
        <div style={{ ...containerStyle, maxWidth: "420px", margin: "auto" }}>
          <div style={{ ...cardStyle, background: "rgba(255,255,255,0.98)", border: "1px solid rgba(127,16,43,.24)" }}>
            <div style={{ textAlign: "center", marginBottom: "24px", background: "linear-gradient(135deg, #650b20 0%, #86172f 100%)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(99,102,241,0.3)" }}>
              <div style={{ fontFamily: "'Jameel Noori Nastaleeq', 'Amiri', serif", fontSize: "22px", color: "#ffffff", marginBottom: "4px" }}>
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
              <h2 style={{ 
margin: 0, 
fontSize: "22px", 
fontWeight: "900", 
letterSpacing: "1.5px",
color: "#ffffff",
textTransform: "uppercase"
}}>
                Javed Publishers
              </h2>
              <p style={{ color: "#ffffff", fontSize: "12px", margin: "4px 0 0 0", fontWeight: "600" }}>School Visit Portal</p>
            </div>
            <form onSubmit={handleLogin} onFocusCapture={() => { preloadPortal().catch(() => {}); }} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Email or Phone Number</label>
                <input 
type="text" 
placeholder="name@example.com or phone" 
value={identifier} 
onChange={(e) => setIdentifier(e.target.value)} 
required 
style={inputStyle}
/>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#5c484e", marginBottom: "6px" }}>Password</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input 
type={showPassword ? "text" : "password"} 
placeholder="••••••••" 
value={password} 
onChange={(e) => setPassword(e.target.value)} 
required 
style={{ ...inputStyle, paddingRight: "45px" }}
/>
                  <button 
type="button" 
onClick={() => setShowPassword(!showPassword)}
style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#78686d", padding: "4px" }}
>
                    {showPassword ? "👁️‍🗨" : "👁"}
                  </button>
                </div>
              </div>
              <button type="submit" style={{ ...btnPrimary, marginTop: "6px" }}>
                Sign In
              </button>
              {error && <p style={{ color: "#f43f5e", textAlign: "center", fontWeight: "600", fontSize: "14px", margin: "4px 0 0 0" }}>{error}</p>}
            </form>
          </div>
        </div>
        <div style={footerStyle}>Created by Ali Ashfaq</div>
      </div>
);

}
