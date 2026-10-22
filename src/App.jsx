import React, { Component, lazy, Suspense, useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import { getSession, login, logout } from "./services/authApi.js";
import { globalStyle, containerStyle, cardStyle, inputStyle, btnPrimary, footerStyle, renderBackgroundStationary, renderResponsiveStyles } from "./ui/portalPresentation.jsx";
import PortalLoading from "./ui/PortalLoading.jsx";

const loadPortalApp = () => import("./PortalApp.jsx");
const preloadPortal = (allPages = false) => allPages ? Promise.all([
  loadPortalApp(),
  import("./pages/AdminPortal.jsx"),
  import("./pages/MarketerPortal.jsx")
]) : loadPortalApp();
const PortalApp = lazy(loadPortalApp);

class PortalLoadErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" style={{ padding: "32px", textAlign: "center" }}>Portal could not load. <button type="button" onClick={() => window.location.reload()}>Refresh</button></div>;
    return this.props.children;
  }
}

export default function App() {
  const [session, setSession] = useState({ loading: true, user: null });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => {
    let active = true;
    getSession()
      .then((user) => { if (active) setSession({ loading: false, user }); })
      .catch(() => { if (active) setSession({ loading: false, user: null }); });
    return () => { active = false; };
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loginPending) return;
    setError("");
    setLoginPending(true);
    preloadPortal().catch(() => {});
    try {
      const user = await login(identifier, password);
      setPassword("");
      setSession({ loading: false, user });
    } catch (failure) {
      setError(failure.message || "Login failed");
    } finally {
      setLoginPending(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } catch (failure) { console.error("Logout failed", failure); }
    setSession({ loading: false, user: null });
    setPassword("");
  };

  if (session.loading) return <PortalLoading />;
  if (session.user) {
    const identity = session.user.marketerId || session.user.email || session.user.role;
    return <PortalLoadErrorBoundary><Suspense fallback={<PortalLoading />}>
      <PortalApp key={session.user.role + ':' + identity} initialUser={session.user} onLogout={handleLogout} />
    </Suspense></PortalLoadErrorBoundary>;
  }

  return <LoginPage context={{
    btnPrimary, cardStyle, containerStyle, error, footerStyle, globalStyle,
    handleLogin, identifier, inputStyle, loginPending, password, preloadPortal,
    renderBackgroundStationary, renderResponsiveStyles,
    setIdentifier, setPassword, setShowPassword, showPassword
  }} />;
}
