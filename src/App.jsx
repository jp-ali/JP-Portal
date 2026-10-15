import React, { lazy, Suspense, useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import { getSession, login, logout } from "./services/authApi.js";
import { globalStyle, containerStyle, cardStyle, inputStyle, btnPrimary, footerStyle, renderBackgroundStationary, renderResponsiveStyles } from "./ui/portalPresentation.jsx";
import PortalLoading from "./ui/PortalLoading.jsx";

const loadPortalApp = () => import("./PortalApp.jsx");
const preloadPortal = () => Promise.all([
  loadPortalApp(),
  import("./pages/AdminPortal.jsx"),
  import("./pages/MarketerPortal.jsx")
]);
const loadPortalForRole = async (role) => {
  let timeout;
  try {
    await Promise.race([
      Promise.all([
        loadPortalApp(),
        role === "admin" ? import("./pages/AdminPortal.jsx") : import("./pages/MarketerPortal.jsx")
      ]),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Portal load timed out")), 30000);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
};
const PortalApp = lazy(loadPortalApp);

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
    try {
      const user = await login(identifier, password);
      try {
        await loadPortalForRole(user.role);
      } catch {
        throw new Error("Login succeeded, but portal files could not load. Refresh the page and try again.");
      }
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
    return <Suspense fallback={<PortalLoading />}>
      <PortalApp key={session.user.role + ':' + identity} initialUser={session.user} onLogout={handleLogout} />
    </Suspense>;
  }

  return <LoginPage context={{
    btnPrimary, cardStyle, containerStyle, error, footerStyle, globalStyle,
    handleLogin, identifier, inputStyle, loginPending, password, preloadPortal,
    renderBackgroundStationary, renderResponsiveStyles,
    setIdentifier, setPassword, setShowPassword, showPassword
  }} />;
}
