import { companyName, getCompany } from '../services/companyBranding.js';
import React, { useEffect } from "react";
import loginReferencePanel from "../assets/login-reference-panel.webp";
import loginCss from "../styles/login.css?raw";

function PersonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4.5 21c.3-4.5 3.2-7 7.5-7s7.2 2.5 7.5 7H4.5Z" fill="currentColor"/></svg>;
}

function EyeIcon({ visible }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7"/>{visible && <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>}</svg>;
}

export default function LoginPage({ context }) {
  const company = getCompany();
  const { error, handleLogin, identifier, loginPending, password, preloadPortal, renderBackgroundStationary, setIdentifier, setPassword, setShowPassword, showPassword, onWorkOffline, offlineAvailable, online } = context;
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => preloadPortal().catch(() => {}), { timeout: 3500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => preloadPortal().catch(() => {}), 2500);
    return () => window.clearTimeout(id);
  }, [preloadPortal]);

  return <div className="login-screen">
    <style>{loginCss}</style>
    <div className="login-mobile-decor" aria-hidden="true">{renderBackgroundStationary()}</div>
    <section className="login-art-panel" aria-label={companyName()}>
      {company.banner || company.id === "javed" ? <img className="login-reference-art" src={company.banner || loginReferencePanel} alt={`${companyName()} books and series`} loading="lazy" decoding="async" /> : <div className="company-login-placeholder"><h2>{companyName()}</h2><p>School Visit & Field Team Portal</p></div>}
    </section>
    <main className="login-form-panel">
      <div className="login-card">
        <div className="login-brand">{company.logo && <img src={company.logo} alt="" style={{ height: 44, maxWidth: 140, objectFit: "contain" }} />}<div className="login-bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div><h1>{companyName().toUpperCase()}</h1><p>School Visit Portal</p></div>
        <form onSubmit={handleLogin}>
          <div className="login-field"><label htmlFor="login-identifier">Email or Phone Number</label><div className="login-input-wrap"><input id="login-identifier" name="identifier" type="text" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" placeholder="admin@portal.com" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /><span className="login-input-icon"><PersonIcon /></span></div></div>
          <div className="login-field"><label htmlFor="login-password">Password</label><div className="login-input-wrap"><input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="login-eye" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}><EyeIcon visible={showPassword} /></button></div></div>
          <button className="login-submit" type="submit" disabled={loginPending}>{loginPending ? "Signing In..." : "Sign In"}</button>
          {error && <p className="login-error" role="alert">{error}</p>}
        </form>
        {offlineAvailable && <button className="login-offline" type="button" onClick={onWorkOffline}>Use offline</button>}
      </div>
      <p className="login-credit">Developed by Ali Ashfaq</p>
    </main>
  </div>;
}
