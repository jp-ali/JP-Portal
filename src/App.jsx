import React, { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import OfflineVisitPortal from "./pages/OfflineVisitPortal.jsx";
import { listOfflineVisits } from "./services/offlineVisitStore.js";
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
const PROFILE_KEY = "jp-offline-marketer-profile";
function cachedMarketer() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }
  catch { return null; }
}

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
  const [online, setOnline] = useState(() => navigator.onLine);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineProfile, setOfflineProfile] = useState(cachedMarketer);
  const syncing = useRef(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    if (session.user?.role !== "marketer") return;
    const profile = { email: session.user.email, name: session.user.name || "", marketerId: session.user.marketerId || "" };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* Private browsing may block storage. */ }
    setOfflineProfile(profile);
  }, [session.user]);

  const syncDrafts = async () => {
    if (!online || session.user?.role !== "marketer") return { synced: 0 };
    if (syncing.current) return syncing.current;
    syncing.current = (async () => {
      try {
        const drafts = await listOfflineVisits();
        if (!drafts.some((item) => String(item.ownerEmail || "").toLowerCase() === String(session.user.email || "").toLowerCase())) return { synced: 0 };
        const { syncOfflineVisits } = await import("./services/offlineVisitSync.js");
        return await syncOfflineVisits(session.user);
      }
      catch (failure) { console.warn("Offline visits remain on this device until sync succeeds:", failure); return { synced: 0, error: failure.message }; }
      finally { syncing.current = null; }
    })();
    return syncing.current;
  };
  useEffect(() => { syncDrafts(); }, [online, session.user]);

  useEffect(() => {
    let active = true;
    if (!online) { setSession((current) => current.loading ? { loading: false, user: null } : current); return; }
    const slowSession = window.setTimeout(() => {
      if (active) setSession((current) => current.loading ? { loading: false, user: null } : current);
    }, 3500);
    getSession()
      .then((user) => { window.clearTimeout(slowSession); if (active) setSession((current) => current.user ? current : { loading: false, user }); })
      .catch(() => { window.clearTimeout(slowSession); if (active) setSession((current) => current.user ? current : { loading: false, user: null }); });
    return () => { active = false; window.clearTimeout(slowSession); };
  }, [online]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loginPending) return;
    setError("");
    setLoginPending(true);
    try {
      const user = await login(identifier, password);
      setPassword("");
      setSession({ loading: false, user });
      setOfflineMode(false);
      preloadPortal().catch(() => {});
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
    setOfflineMode(false);
    setOfflineProfile(null);
    try { localStorage.removeItem(PROFILE_KEY); } catch { /* Ignore blocked storage. */ }
  };

  if ((!online && session.user?.role !== "admin") || offlineMode) {
    return <OfflineVisitPortal user={session.user?.role === "marketer" ? session.user : null} cachedProfile={offlineProfile} online={online} onSignIn={() => setOfflineMode(false)} onResume={() => setOfflineMode(false)} onSync={syncDrafts} />;
  }
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
    setIdentifier, setPassword, setShowPassword, showPassword,
    onWorkOffline: () => setOfflineMode(true), online
  }} />;
}
