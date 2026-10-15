import React, { lazy, Suspense, useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import { getSession, login, logout } from "./services/authApi.js";
import { globalStyle, containerStyle, cardStyle, inputStyle, btnPrimary, footerStyle, renderBackgroundStationary, renderResponsiveStyles } from "./ui/portalPresentation.jsx";
import PortalLoading from "./ui/PortalLoading.jsx";

const loadPortalApp = () => import("./PortalApp.jsx");
const PortalApp = lazy(loadPortalApp);

export default function App() {
  const [session, setSession] = useState({ loading: true, user: null });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSession()
      .then((user) => { if (active) setSession({ loading: false, user }); })
      .catch(() => { if (active) setSession({ loading: false, user: null }); });
    return () => { active = false; };
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const user = await login(identifier, password);
      setPassword("");
      setSession({ loading: false, user });
    } catch (failure) {
      setError(failure.message || "Login failed");
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
    return <Suspense fallback={<PortalLoading />}>
      <PortalApp key={session.user.role + ':' + identity} initialUser={session.user} onLogout={handleLogout} />
    </Suspense>;
  }

  return <LoginPage context={{
    btnPrimary, cardStyle, containerStyle, error, footerStyle, globalStyle,
    handleLogin, identifier, inputStyle, password, preloadPortal: loadPortalApp,
    renderBackgroundStationary, renderResponsiveStyles,
    setIdentifier, setPassword, setShowPassword, showPassword
  }} />;
}
