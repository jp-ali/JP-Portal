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
  componentDidCatch(error, info) { console.error("Portal failed to load:", error, info); }
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
  const [syncState, setSyncState] = useState({ pending: 0, busy: false, message: "" });
  const syncing = useRef(null);
  const skipSessionRestore = useRef(false);

  const refreshPending = async () => {
    const email = String(session.user?.email || "").toLowerCase();
    const drafts = await listOfflineVisits();
    const pending = drafts.filter((item) => String(item.ownerEmail || "").toLowerCase() === email).length;
    setSyncState((current) => ({ ...current, pending }));
    return pending;
  };
  useEffect(() => {
    refreshPending().catch(() => {});
    const changed = () => { refreshPending().catch(() => {}); };
    window.addEventListener("offline-visits-changed", changed);
    return () => window.removeEventListener("offline-visits-changed", changed);
  }, [session.user?.email]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    if (session.user?.role !== "marketer") return;
    const profile = { email: session.user.email, name: session.user.name || "", marketerId: session.user.marketerId || "", assignedCityIds: session.user.assignedCityIds || [], assignedAreaIds: session.user.assignedAreaIds || [] };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* Private browsing may block storage. */ }
    setOfflineProfile(profile);
  }, [session.user]);

  const syncDrafts = async (manual = false) => {
    if (!online || session.user?.role !== "marketer") return { synced: 0, error: "Connect to the internet and sign in as the same marketer to sync." };
    if (syncing.current) return syncing.current;
    syncing.current = (async () => {
      setSyncState((current) => ({ ...current, busy: true, message: "" }));
      try {
        const drafts = await listOfflineVisits();
        if (!drafts.some((item) => String(item.ownerEmail || "").toLowerCase() === String(session.user.email || "").toLowerCase())) {
          if (manual) setSyncState((current) => ({ ...current, message: drafts.length ? `Pending visits belong to ${drafts[0].ownerEmail}. Sign in with that email to sync.` : "No offline visits pending for this account." }));
          return { synced: 0 };
        }
        const { syncOfflineVisits } = await import("./services/offlineVisitSync.js");
        const result = await syncOfflineVisits(session.user);
        setSyncState((current) => ({ ...current, message: result.synced ? `${result.synced} visit(s) synced.` : "", syncedAt: result.synced ? Date.now() : current.syncedAt }));
        return result;
      }
      catch (failure) {
        console.warn("Offline visits remain on this device until sync succeeds:", failure);
        setSyncState((current) => ({ ...current, message: failure.message || "Sync failed." }));
        return { synced: 0, error: failure.message };
      }
      finally { syncing.current = null; setSyncState((current) => ({ ...current, busy: false })); refreshPending().catch(() => {}); }
    })();
    return syncing.current;
  };
  useEffect(() => { syncDrafts(); }, [online, session.user]);

  useEffect(() => {
    let active = true;
    if (skipSessionRestore.current) return;
    if (!online) { setSession((current) => current.loading ? { loading: false, user: null } : current); return; }
    const slowSession = window.setTimeout(() => {
      if (active) setSession((current) => current.loading ? { loading: false, user: null } : current);
    }, 3500);
    getSession()
      .then((user) => { window.clearTimeout(slowSession); if (active && !skipSessionRestore.current) setSession((current) => current.user ? current : { loading: false, user }); })
      .catch(() => { window.clearTimeout(slowSession); if (active && !skipSessionRestore.current) setSession((current) => current.user ? current : { loading: false, user: null }); });
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
      skipSessionRestore.current = false;
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
    if (session.user?.role === "marketer") {
      try {
        const { removeNewsSubscription } = await import("./services/newsPush.js");
        await Promise.race([removeNewsSubscription(), new Promise((resolve) => setTimeout(resolve, 1500))]);
      } catch (failure) { console.warn("News notification cleanup failed:", failure); }
    }
    try { await logout(); } catch (failure) { console.error("Logout failed", failure); }
    setSession({ loading: false, user: null });
    setPassword("");
    setOfflineMode(false);
    setOfflineProfile(null);
    try { localStorage.removeItem(PROFILE_KEY); } catch { /* Ignore blocked storage. */ }
  };

  const backFromOffline = () => {
    skipSessionRestore.current = true;
    setOfflineMode(false);
    setSession({ loading: false, user: null });
    if (online && session.user) logout().catch((failure) => console.warn("Offline exit sign out failed:", failure));
  };
  const offlineActive = (!online && session.user?.role === "marketer") || offlineMode;
  useEffect(() => {
    if (!offlineActive) return;
    if (!window.history.state?.jpOfflineVisitGuard) window.history.pushState({ ...window.history.state, jpOfflineVisitGuard: true }, "", window.location.href);
    const onBrowserBack = () => {
      window.history.pushState({ ...window.history.state, jpOfflineVisitGuard: true }, "", window.location.href);
      backFromOffline();
    };
    window.addEventListener("popstate", onBrowserBack);
    return () => window.removeEventListener("popstate", onBrowserBack);
  }, [offlineActive, online, session.user]);

  if (offlineActive) {
    return <OfflineVisitPortal user={session.user?.role === "marketer" ? session.user : null} cachedProfile={offlineProfile} online={online} onSignIn={() => setOfflineMode(false)} onResume={() => setOfflineMode(false)} onSync={syncDrafts} onBackToLogin={backFromOffline} />;
  }
  if (session.loading) return <PortalLoading />;
  if (session.user) {
    const identity = session.user.marketerId || session.user.email || session.user.role;
    return <PortalLoadErrorBoundary><Suspense fallback={<PortalLoading />}>
      <PortalApp key={session.user.role + ':' + identity} initialUser={session.user} onLogout={handleLogout} onSync={syncDrafts} syncState={syncState} online={online} />
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
