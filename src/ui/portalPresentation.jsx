import React from "react";
import responsiveCss from "../styles/responsive.css?raw";
import backgroundCss from "../styles/background.css?raw";

export const globalStyle = {
fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
background: "linear-gradient(135deg, #f8f5f2 0%, #fffdfb 55%, #f2eeee 100%)",
minHeight: "100vh",
padding: "clamp(8px, 2vw, 16px)",
boxSizing: "border-box",
display: "flex",
flexDirection: "column",
justifyContent: "space-between",
color: "#3b2329",
position: "relative",
overflowX: "hidden"
};
export const containerStyle = {
maxWidth: "1100px",
width: "100%",
margin: "0 auto",
zIndex: 2,
position: "relative"
};
export const cardStyle = {
background: "rgba(255,255,255,0.97)",
backdropFilter: "blur(8px)",
padding: "clamp(14px, 2.2vw, 20px)",
borderRadius: "clamp(12px, 1.8vw, 16px)",
boxShadow: "0 10px 28px rgba(72, 35, 44, 0.12)",
marginBottom: "16px",
border: "1px solid rgba(122,15,43,.18)",
transition: "all 0.3s ease"
};
export const inputStyle = {
padding: "14px 16px",
fontSize: "15px",
width: "100%",
boxSizing: "border-box",
borderRadius: "12px",
border: "1px solid rgba(123,16,43,.24)",
outline: "none",
backgroundColor: "#fffdfd",
color: "#3b2329",
transition: "all 0.2s ease"
};
export const btnPrimary = {
padding: "14px",
background: "linear-gradient(135deg, #740d28 0%, #981b3c 100%)",
color: "#ffffff",
border: "none",
fontSize: "16px",
fontWeight: "600",
borderRadius: "12px",
cursor: "pointer",
boxShadow: "0 6px 18px rgba(116,13,40,.22)",
width: "100%",
transition: "transform 0.2s ease, box-shadow 0.2s ease"
};
export const footerStyle = {
textAlign: "center",
padding: "16px 0 8px 0",
color: "#78686d",
fontSize: "13px",
fontWeight: "500",
letterSpacing: "0.5px",
zIndex: 2,
position: "relative"
};
export const renderRedSkeleton = () => (
<div className="jp-skeleton-layer" aria-hidden="true">
      <div className="jp-skeleton-grid">
        {Array.from({ length: 6 }).map((_, idx) => (
<div className="jp-skeleton-card" key={`sk-${idx}`}>
            <div className="jp-skeleton-circle" />
            <div className="jp-skeleton-line w1" />
            <div className="jp-skeleton-line w2" />
          </div>
))}
      </div>
    </div>
);
export const renderBrandingStrip = (onMobileMenuOpen = null, mobileMenuOpen = false) => (
<div className="app-branding-strip" style={{ 
background: "linear-gradient(135deg, #650b20 0%, #86172f 50%, #1e293b 100%)", 
padding: "22px 24px", 
borderRadius: "16px", 
marginBottom: "16px", 
boxShadow: "0 8px 22px rgba(89,45,56,.10)", 
border: "1px solid rgba(127,16,43,.20)",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
position: "relative"
}}>
      {onMobileMenuOpen && (
<button
type="button"
className={`mobile-brand-menu-toggle ${mobileMenuOpen ? "sidebar-is-open" : ""}`}
onClick={onMobileMenuOpen}
aria-label="Open menu"
title="Open Menu"
>☰</button>
)}
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ 
fontFamily: "'Jameel Noori Nastaleeq', 'Amiri', serif", 
fontSize: "26px", 
color: "#ffffff", 
marginBottom: "6px", 
textShadow: "0 2px 6px rgba(0,0,0,0.4)" 
}}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
        <h1 style={{ 
margin: 0, 
fontSize: "26px", 
fontWeight: "900", 
letterSpacing: "2px", 
color: "#ffffff",
textTransform: "uppercase",
fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
textShadow: "0 2px 8px rgba(0,0,0,.28)"
}}>
          Javed Publishers
        </h1>
      </div>
    </div>
);
export const renderMarketerPersonIcon = (size = 28, grouped = false) => (
<span className="jp-marketer-person-icon" style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true">
      <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
        {grouped ? (
<>
            <circle cx="18" cy="17" r="7" fill="currentColor" opacity="0.96"/>
            <circle cx="32" cy="18" r="6" fill="currentColor" opacity="0.72"/>
            <path d="M6 39c0-8 5.5-13 12-13s12 5 12 13H6Z" fill="currentColor"/>
            <path d="M26 39c0-6.6 4-10.5 9-10.5 4.2 0 7.6 3.1 8 8.6V39H26Z" fill="currentColor" opacity="0.72"/>
          </>
) : (
<>
            <circle cx="24" cy="16" r="9" fill="currentColor"/>
            <path d="M8 41c0-9.4 6.8-15 16-15s16 5.6 16 15H8Z" fill="currentColor"/>
          </>
)}
      </svg>
    </span>
);
export const renderLogoutArrowIcon = (size = 18) => (
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 5H6.8C5.25 5 4 6.25 4 7.8v8.4C4 17.75 5.25 19 6.8 19H10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
      <path d="M13 8l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12h8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
);
export const renderResponsiveStyles = () => (
<style>{responsiveCss}</style>
);
export const renderBackgroundStationary = () => (
<>
      <link href="https://fonts.googleapis.com/css2?family=Bubblegum+Sans&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&display=swap" rel="stylesheet" />
      <style>{backgroundCss}</style>
      <div className="floating-word fw1">maxford</div><div className="floating-word fw2">vintage</div>
      <div className="floating-word fw3">canon</div><div className="floating-word fw4">Marshall</div>
      <div className="floating-word fw5">stemford</div><div className="floating-word fw6">maxford</div>
      <div className="floating-word fw7">vintage</div><div className="floating-word fw8">canon</div>
      <div className="floating-word fw9">Marshall</div><div className="floating-word fw10">stemford</div>
      <div className="bg-stationary" style={{position:"absolute",left:"3px",top:"24%",fontSize:"30px",opacity:.32,animation:"wordFloatA 4.5s ease-in-out infinite",pointerEvents:"none"}}>📚</div>
      <div className="bg-stationary" style={{position:"absolute",right:"2px",top:"46%",fontSize:"28px",opacity:.32,animation:"wordFloatB 4.2s ease-in-out infinite",pointerEvents:"none"}}>✏️</div>
      <div className="bg-stationary" style={{position:"absolute",left:"3px",top:"64%",fontSize:"28px",opacity:.32,animation:"wordFloatB 5s ease-in-out infinite",pointerEvents:"none"}}>📖</div>
      <div className="bg-stationary" style={{position:"absolute",right:"2px",top:"73%",fontSize:"28px",opacity:.32,animation:"wordFloatA 4.7s ease-in-out infinite",pointerEvents:"none"}}>📐</div>
      <div className="bg-color-book" style={{position:"absolute",left:"7px",top:"42%",fontSize:"23px",opacity:.72,animation:"wordFloatA 4.8s ease-in-out infinite",pointerEvents:"none"}}>📕</div>
      <div className="bg-color-book" style={{position:"absolute",right:"6px",top:"58%",fontSize:"23px",opacity:.72,animation:"wordFloatB 5.1s ease-in-out infinite",pointerEvents:"none"}}>📗</div>
      <div className="bg-color-book" style={{position:"absolute",left:"7px",top:"79%",fontSize:"23px",opacity:.72,animation:"wordFloatB 4.6s ease-in-out infinite",pointerEvents:"none"}}>📘</div>
      <div className="bg-color-book" style={{position:"absolute",right:"7px",top:"87%",fontSize:"23px",opacity:.72,animation:"wordFloatA 5.2s ease-in-out infinite",pointerEvents:"none"}}>📙</div>
    </>
);
